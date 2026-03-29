# MLB Project

This project now runs as a static site on GitHub Pages.

## GitHub Pages Deployment

1. Push this repository to GitHub.
2. In GitHub, open Settings > Pages.
3. Under Build and deployment:
4. Set Source to Deploy from a branch.
5. Select Branch `main` and folder `/ (root)`.
6. Save.
7. After deployment finishes, open your Pages URL.

## Entry Points

- `index.html` - landing page
- `GameCards.html` - league-wide scoreboard
- `MyTeam.html` - favorite-team dashboard
- `Roster.html` - roster view
- `TVGuide.html` - TV schedule view

## What Changed From Apps Script

- `google.script.run` calls were replaced by browser-side fetch calls.
- Favorite team storage now uses `localStorage` (key: `MY_FAV_TEAM`).
- Shared browser data logic is in `clientApi.js`.
- Pages call public APIs directly:
	- MLB Stats API for games, standings, roster, lineups
	- ESPN API for TV guide data

## Notes

- AI/Gemini server-side generation was replaced with a local matchup insight summary so no secret API key is required in client code.

