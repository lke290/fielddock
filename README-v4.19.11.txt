FieldDock v4.19.11 — hamburger menu action fix

Based on v4.19.10.

Fixes:
- Restores Account, Light / Dark and Projects actions in the hamburger menu.
- Adds the missing global closeHeaderMenu() helper used by those actions.
- Removes duplicate menu-close event handlers so the hamburger has one controller.
- Keeps tap-outside-to-close behaviour.
- Bumps the service-worker shell cache and registration version to v4.19.11.

Regression test:
1. Hamburger > Account
2. Hamburger > Light / Dark
3. Hamburger > Projects
4. Tap outside the open hamburger
5. Reopen and repeat actions several times
