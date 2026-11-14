# Cráter Gemelo · project website

React + Vite explorer for Misión Cero. English initially; Spanish available through the language switch. Includes project overview, terrain quiz, candidate sites, interactive map, method, sources and companion-game entry point.

## Run and build

Use a supported Node.js LTS (22.12+).

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Deploy the static `dist/` output. For subdirectory hosting, use `npm run build -- --base=/your-path/`.

## Companion game

Set `VITE_GAME_URL` to the game's HTTP(S) URL or relative path before building. Without it, the page shows the game as pending integration. The quiz works independently. The game requires its own build in `../game`; the website build does not include it.

## Data and review

`public/data/` belongs to the model team. Preserve the data and demonstration labels. The optional `sitios.json` shortlist may be absent. The other five JSON files are required; loading failures show a retry action while the overview remains visible. Map tiles require Internet access.

Review: both languages, quiz/restart, map filters, both sheet types, mobile layout, keyboard access, and failed data requests followed by retry. The full rover mission requires validation by the game team.
