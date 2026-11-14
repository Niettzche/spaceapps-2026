# VPS deployment

Build both applications as one static directory. No API token or server API is required for the demo.

```sh
cd web && npm ci
cd ../game && npm ci
cd ../web && node scripts/build-demo.mjs
```

The upload artifact is `web/dist/`, including `game/`. Serve the website at `/` and the game at `/game/`. The script sets `VITE_GAME_URL=/game/` and builds the game with `--base=/game/`.

If the website must live at `/demo/`, set `DEMO_BASE=/demo/` when running the script. All application base URLs are adjusted together.

Upload into a new release directory on the VPS first. Keep the current release until both entry points have been verified, then switch the document root or existing deployment symlink. Do not replace another site's root without checking the active web-server configuration.

Required deployment inputs: SSH host or configured alias, user, port, domain, release directory and the existing web-server configuration. Authentication should use a local SSH key or an interactive login; never commit credentials.

Example Nginx location blocks inside the existing HTTPS server, with the deployment directory substituted for `/var/www/mission-zero/current`:

```nginx
root /var/www/mission-zero/current;
location / { try_files $uri $uri/ =404; }
location /game/ { try_files $uri $uri/ =404; }
```

Verify `/`, `/game/`, website JSON and images, both destinations, game reset and mobile controls. The game and web use no client-side path routing, so missing asset requests must return 404 rather than HTML. External map tiles still require Internet access.

Demo defaults: `VITE_WEB_URL=/`, `VITE_API_URL=/api`, `VITE_GAME_URL=/game/`. The script coordinates these with `DEMO_BASE` and accepts explicit `VITE_WEB_URL` / `VITE_API_URL` overrides. These are public URLs, never API tokens. Forward `/api/` to FastAPI while stripping the `/api` prefix; the static game still works if the API is unavailable.

Publication: **completar con el VPS**. No public deployment has been assumed; this document does not change server configuration.
