param([switch]$Apply)
$ErrorActionPreference='Stop'
$server='C:\Projects\fielddock-server'
$source=Split-Path $PSScriptRoot -Parent
$python='C:\Users\hp\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
if (-not $Apply) { throw 'Review this script, then use -Apply in an Administrator PowerShell.' }
$principal=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Windows Administrator elevation is required to restart live PocketBase.' }
if ((Resolve-Path -LiteralPath $server).Path -ne 'C:\Projects\fielddock-server') { throw 'Unexpected backend target' }
$live=@(Get-CimInstance Win32_Process -Filter "name='pocketbase.exe'" | Where-Object { $_.ExecutablePath -eq "$server\pocketbase.exe" -and $_.CommandLine -notmatch '8091|completion-security' })
if ($live.Count -ne 1) { throw 'Expected exactly one live PocketBase process' }
$command=$live[0].CommandLine
$argsText=$command -replace '^\s*(?:"[^"]+"|\S+)\s*',''
if ($argsText -notmatch '^serve\b') { throw 'Unexpected live startup command' }
$tasks=@(Get-ScheduledTask | Where-Object { ($_.Actions | ConvertTo-Json -Compress) -match 'fielddock-server|pocketbase\.exe' })
if ($tasks.Count -gt 1) { throw 'Multiple backend tasks need review before restart' }
$backupBase='C:\Users\hp\Documents\ChatGPT\Fielddock\completion-security'
$backup=Join-Path $backupBase ('live-backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup | Out-Null
$restart={
 if ($tasks.Count -eq 1) { Start-ScheduledTask -TaskName $tasks[0].TaskName -TaskPath $tasks[0].TaskPath }
 else { Start-Process -FilePath "$server\pocketbase.exe" -ArgumentList $argsText -WorkingDirectory $server -WindowStyle Hidden }
}
try {
 if ($tasks.Count -eq 1) { Stop-ScheduledTask -TaskName $tasks[0].TaskName -TaskPath $tasks[0].TaskPath }
 else { Stop-Process -Id $live[0].ProcessId }
 Wait-Process -Id $live[0].ProcessId -Timeout 20 -ErrorAction SilentlyContinue
 Copy-Item -LiteralPath "$server\pb_data" -Destination "$backup\pb_data" -Recurse
 Copy-Item -LiteralPath "$server\pb_hooks" -Destination "$backup\pb_hooks" -Recurse
 Copy-Item -LiteralPath "$server\pb_migrations" -Destination "$backup\pb_migrations" -Recurse
 & $python "$PSScriptRoot\verify-completion-migration.py" before "$backup\pb_data\data.db" "$backup\before.json"
 if ($LASTEXITCODE -ne 0) { throw 'Backup verification failed' }
 foreach ($name in @('completion-ownership.js','completion-ownership.pb.js')) {
  Copy-Item -LiteralPath "$source\backend\pb_hooks\$name" -Destination "$server\pb_hooks\$name"
 }
 $migration='1792886400_stage_completion_ownership.js'
 Copy-Item -LiteralPath "$source\backend\pb_migrations\$migration" -Destination "$server\pb_migrations\$migration"
 & "$server\pocketbase.exe" migrate up --dir "$server\pb_data" --hooksDir "$server\pb_hooks" --migrationsDir "$server\pb_migrations"
 if ($LASTEXITCODE -ne 0) { throw 'Migration failed; keep backup for recovery' }
 & $python "$PSScriptRoot\verify-completion-migration.py" after "$server\pb_data\data.db" "$backup\before.json"
 if ($LASTEXITCODE -ne 0) { throw 'History/schema verification failed; inspect backup before further changes' }
 & $restart
 $healthy=$false
 for ($attempt=0;$attempt -lt 30;$attempt++) {
  Start-Sleep -Milliseconds 500
  try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:8090/api/health';if ($r.code -eq 200) {$healthy=$true;break} } catch {}
 }
 if (-not $healthy) { throw 'Backend did not pass health check after restart' }
 @{backup=$backup;health='ok';migration=$migration;history='unchanged';records=21} | ConvertTo-Json | Set-Content -LiteralPath "$backupBase\live-deployment-result.json"
 Write-Output "SUCCESS: backup=$backup; migration verified; history unchanged; backend healthy."
} catch {
 $_ | Out-String | Set-Content -LiteralPath "$backupBase\live-deployment-error.txt"
 # Keep evidence and backup; avoid destructive automatic data restoration.
 try { if (-not (Get-NetTCPConnection -LocalPort 8090 -State Listen -ErrorAction SilentlyContinue)) { & $restart } } catch {}
 throw
}
