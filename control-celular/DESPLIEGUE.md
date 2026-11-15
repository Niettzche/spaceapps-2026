# Despliegue del mando de celular en la demo pública

Objetivo: en `https://v1.marsception.us/?mando` aparece la pastilla «Conectar celular / Connect phone»; al tocarla sale un QR.
Cualquiera lo escanea con el celular (por internet, sin estar en la misma red) y lo usa como control.

Es un extra. **Si el relay no está corriendo, el juego sigue igual**: `game/index.html` solo pide `/mando/puente.js` cuando la
URL trae `?mando`, y si falla (404/502) no hace nada. Sin `?mando` no se pide nada.

## Cómo funciona

```
juego (https://v1.marsception.us/?mando)
  └─ carga /mando/puente.js ─ wss://v1.marsception.us/mando/ws?rol=pantalla ─┐
                                                                            relay (node, 127.0.0.1:8787)
celular (escanea el QR → https://v1.marsception.us/mando/?s=123456)          │  una sala por pantalla
  └─ página del control ─ wss://v1.marsception.us/mando/ws?rol=pad&sala=… ──┘  (6 dígitos + token)
```

- Cada pestaña del juego recibe su propia sala. Si se recarga, recupera la misma (token en `sessionStorage`) y el celular
  sigue conectado. Si la pestaña se cierra, la sala muere a los 20 s y el celular pide un código nuevo.
- Límites: 200 salas, 4 celulares por sala, 10 salas nuevas por IP por minuto, 20 códigos equivocados por IP por minuto,
  mensajes de 512 bytes, 120 mensajes por segundo por celular y solo las teclas que usa el control. El WebSocket solo se
  acepta desde una página del mismo dominio (cabecera `Origin`).
- En modo público no existen `/info` ni `/pantalla` (no se exponen IP). `/mando/qr.svg` solo genera QR de la URL del control
  en el mismo dominio. No hay secretos, ni servicios de terceros, ni CDNs.

## Pasos para Mario (VPS)

1. Actualizar el repo en el VPS (`git pull` de `main` cuando se mergee `feat/mando-publico`) y **reconstruir el juego**
   (`node web/scripts/build-demo.mjs`, como siempre): el `game/index.html` nuevo es el que sabe cargar `/mando/puente.js`.
2. Instalar las dependencias del relay (solo `ws` y `qrcode`):
   ```bash
   cd /ruta/al/repo/control-celular && npm ci --omit=dev
   ```
3. Correr el relay como servicio. **systemd** (`/etc/systemd/system/marsception-mando.service`):
   ```ini
   [Unit]
   Description=MARSCEPTION mando de celular (relay WebSocket)
   After=network.target

   [Service]
   WorkingDirectory=/ruta/al/repo/control-celular
   Environment=MODO=publico
   Environment=BASE=/mando
   Environment=PUERTO=8787
   ExecStart=/usr/bin/node servidor.mjs
   Restart=always
   RestartSec=2
   User=www-data

   [Install]
   WantedBy=multi-user.target
   ```
   ```bash
   sudo systemctl daemon-reload && sudo systemctl enable --now marsception-mando
   journalctl -u marsception-mando -f     # ver salas y celulares que entran
   ```
   Alternativa con **pm2**:
   ```bash
   cd /ruta/al/repo/control-celular
   MODO=publico BASE=/mando PUERTO=8787 pm2 start servidor.mjs --name marsception-mando && pm2 save
   ```
   El relay escucha solo en `127.0.0.1` (lo cambia `HOST=0.0.0.0` si corre en Docker). Necesita Node 18 o más nuevo.
4. **nginx**: dentro del `server { … }` de `v1.marsception.us` (el de `listen 443`), junto a `location /api`:
   ```nginx
   # Mando de celular (control-celular/servidor.mjs). ^~ gana a las location con regex (p. ej. caché de *.js).
   location ^~ /mando/ {
       proxy_pass http://127.0.0.1:8787;          # sin barra final: el relay recibe /mando/… completo
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;                 # obligatorio: el relay compara Origin con Host
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_read_timeout 3600s;
       proxy_send_timeout 3600s;
       proxy_buffering off;
   }
   ```
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
   `/mando` (sin barra) lo redirige nginx o el relay a `/mando/`.
5. **Cloudflare** (el dominio pasa por Cloudflare): los WebSockets ya vienen activados (Network → WebSockets: On). El juego y
   el celular mandan un latido cada 2–25 s, así que el límite de 100 s sin datos de Cloudflare no los corta. Si hay una regla
   de caché para `*.js`, que no aplique a `/mando/*` (el relay manda `Cache-Control: no-store`).

## Cómo probarlo

```bash
# En el VPS, directo al relay
curl -s http://127.0.0.1:8787/mando/salud                  # {"ok":true,"salas":0}
# Desde fuera, por nginx y Cloudflare
curl -sI https://v1.marsception.us/mando/puente.js | head -3 # 200, text/javascript
curl -sI https://v1.marsception.us/mando/ | head -3          # 200, text/html (página del control)
curl -s  https://v1.marsception.us/mando/salud
curl -s -o /dev/null -w '%{http_code}\n' https://v1.marsception.us/mando/info   # 404 (no existe en público)
# WebSocket (npx wscat): sin Origin del mismo dominio se rechaza; con él, la pantalla recibe su sala
npx wscat -c 'wss://v1.marsception.us/mando/ws?rol=pantalla' --origin https://v1.marsception.us
#   ← {"t":"sala","sala":"123456","token":"…"}  ← {"t":"pads","n":0}
# En otra terminal, el "celular" en esa sala, y manda → (en la primera terminal llega {"t":"k","k":"ArrowRight","d":1,…})
npx wscat -c 'wss://v1.marsception.us/mando/ws?rol=pad&sala=123456' --origin https://v1.marsception.us
#   > {"t":"k","k":"ArrowRight","d":1}
```

Prueba real: abre `https://v1.marsception.us/?mando` en la compu, toca «Conectar celular», escanea el QR con el celular
(con datos o con cualquier Wi-Fi), gira el celular, toca «Toca para empezar» y usa OK / flechas.
Para apagar el mando en ese navegador: `https://v1.marsception.us/?mando=0`.

## Mensaje para Mario (listo para pegar)

> Mario, para que el mando de celular funcione en la demo pública (es opcional; si no lo haces, el juego sigue igual):
> 1. `git pull` y reconstruye como siempre (`node web/scripts/build-demo.mjs`).
> 2. `cd control-celular && npm ci --omit=dev`
> 3. Arranca el relay: `MODO=publico BASE=/mando PUERTO=8787 pm2 start servidor.mjs --name marsception-mando && pm2 save`
>    (o la unidad systemd de `control-celular/DESPLIEGUE.md`).
> 4. En el `server` 443 de v1.marsception.us agrega y recarga nginx (`sudo nginx -t && sudo systemctl reload nginx`):
> ```nginx
> location ^~ /mando/ {
>     proxy_pass http://127.0.0.1:8787;
>     proxy_http_version 1.1;
>     proxy_set_header Upgrade $http_upgrade;
>     proxy_set_header Connection "upgrade";
>     proxy_set_header Host $host;
>     proxy_set_header X-Real-IP $remote_addr;
>     proxy_read_timeout 3600s;
>     proxy_buffering off;
> }
> ```
> 5. Comprueba: `curl -s https://v1.marsception.us/mando/salud` → `{"ok":true,…}`. Luego abre `https://v1.marsception.us/?mando`,
>    toca «Conectar celular» y escanea el QR.

## Limitaciones

- Se probó con un proxy local que imita a nginx (HTTPS + WebSocket) y dos navegadores Chromium (compu y celular emulado);
  no se probó todavía detrás de Cloudflare ni con celulares físicos por internet.
- Latencia: cada botón viaja celular → Cloudflare → VPS → Cloudflare → compu. Para conducir alcanza; es más lento que el
  modo local en la misma red.
- Las salas viven en memoria: si el relay se reinicia, la compu recibe una sala nueva y hay que volver a escanear.
