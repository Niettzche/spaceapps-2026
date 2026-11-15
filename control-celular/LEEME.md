# Control de celular · MARSCEPTION

Usa el celular como control del juego. El celular abre una página web (con un QR), en horizontal, y le habla a la compu por
WebSocket en la red local. No hay que instalar ninguna app ni tener internet: celular y compu solo tienen que estar en la **misma red**.

Es un extra (AGENTS.md §15, "Mando en el teléfono"). **El juego no depende de esto:** sin el relay, el juego funciona igual.

```
control-celular/
├── INICIAR.cmd        doble clic (Windows): instala y arranca todo
├── servidor.mjs       relay (puerto 8787): sirve el control, el QR y reenvía botones
├── puente.js          corre dentro del juego: convierte botones en teclas y muestra el panel del QR
├── publico/           página del celular: index.html, pad.js, pad.css, vidrio.js (liquid glass WebGL)
├── iniciar.mjs        arranca relay + juego (Vite en 5174)
└── prueba_*.mjs       pruebas automáticas (e2e, cruceta, visual)
```

En el juego, el único cambio es un `<script>` en `game/index.html`: si la página corre en local (`http:`), intenta cargar
`http://<host>:8787/puente.js`. En la demo pública (`https:`) no hace nada.

## Cómo correrlo

1. Doble clic en **`control-celular/INICIAR.cmd`** (o `cd control-celular && npm install && npm run todo`).
2. En la compu abre **http://localhost:5174/?mando** (el `?mando` activa el puente; se recuerda en ese navegador). Toca la pastilla «Conectar celular» para ver el QR y el código de sala de 4 dígitos.
3. Clic en **"Listo · jugar"** (también activa el sonido del juego).
4. En el celular: escanea el QR, gira el celular y toca "Toca para empezar".

Sin QR: abre la URL que muestra el panel y escribe el código de sala. El QR también está en http://localhost:8787/pantalla.

## Red: Wi-Fi o hotspot

- **Wi-Fi normal:** funciona si la red deja que los dispositivos se vean entre sí.
- **Wi-Fi de la universidad o del evento:** suelen bloquearlo (aislamiento de clientes). Si no conecta, usa un hotspot.
- **Hotspot del celular:** conecta la compu al hotspot; el QR se actualiza solo en unos segundos. No gasta datos (todo es local).
- **Hotspot de la compu (Windows):** también sirve.
- Firewall de Windows: la primera vez pregunta; acepta para que el celular pueda entrar.

## Dos versiones del control

Se elige sola por dispositivo. Para cambiarla: botón **⚙** de la barra → Estilo (se recuerda en el celular). Ahí también
están el modo (Auto / Conducir / Menús) y la pantalla completa. Van en un menú a propósito: antes eran botones sueltos en la
barra y un toque sin querer cambiaba el estilo o fijaba el modo. Forzar por URL: `?piel=glass` o `?piel=general`.
Si el modo se fija a mano, la barra lo indica con 🔒.

| | Glass (Apple) | Clásico (Android y todos) |
|---|---|---|
| Estilo | "liquid glass" con WebGL: refracción, aberración cromática, luz que sigue al dedo, rebote de gelatina | consola de juego: botones con relieve que se hunden, onda de luz desde el dedo, cruceta de una pieza, pedales con estrías, OK naranja Marte |
| Rendimiento | baja la resolución del shader si el celular va lento; sin WebGL usa vidrio de CSS. Si iOS quita el WebGL (al bloquear o cambiar de app), el vidrio se reconstruye solo al volver | solo CSS (sin blur ni WebGL) |
| Vibración | tic háptico en iOS 18+ | `vibrate` |
| Pantalla completa | "Compartir → Agregar a inicio" | automática al primer toque |

## Botones

El control cambia solo según la escena ("Auto"; también se puede fijar Conducir o Menús):

- **Conducir** (Prueba y Misión): Frenar ◀ / Acelerar ▶ (mitades grandes), Pausa, Datos (I), Sonido (M). En pausa: Seguir y Abandonar.
- **Menús**: cruceta, OK (Enter), Atrás (Esc) y atajos de la escena, cada uno con su tecla real:
  Taller (Pestaña, Quitar, Igualar ejes, Ayuda, Probar), Expediente (1–5, Datos, Condiciones), Resultados (1–3, Analogía), Menú (1–5, Idioma).

**Botón principal (verde, arriba de los atajos):** el celular muestra el botón que el juego marca con ⏎ en esa pantalla, con
el mismo texto («Nueva partida», «Gastar 1 ticket y probar», «Probar de nuevo (gratis)», «Siguiente» en un tutorial) y lo
activa directo. OK (Enter) activa el botón que tiene el foco, y al volver del Taller el foco queda en la lista de sitios: por
eso a veces OK no llevaba a probar. Si el juego lo tiene desactivado o está en un fundido, se ve apagado.

Son las teclas que el juego ya entiende. La **cruceta es una sola zona**, como un control físico: la dirección sale del ángulo
del dedo, así que las diagonales y el borde también cuentan. Deslizar el dedo cambia de flecha sin parpadear, y mantenerla la
repite (después de 0.5 s). Si el dedo sale del control, el celular se bloquea o se desconecta, todas las teclas se sueltan.

## Pruebas

Con relay y juego corriendo, y `npm i --no-save playwright-core` (usan Edge; otra ruta con `NAVEGADOR=...`):

- `npm run prueba`: juego real + celular emulado (iPhone; `PIEL=general` para Android) con toques reales: Menú → Expediente →
  Taller solo con OK, Probar, acelerar mueve el robot, pausa, y cerrar el celular con el acelerador presionado lo suelta.
- `npm run prueba:flechas`: cada toque de la cruceta llega al juego y mueve algo (centro, esquinas, diagonales, margen, toques
  de 0 ms, toques seguidos, dedo en movimiento, deslizar en círculo, soltar fuera del control) en el Taller y el Expediente.
- `npm run prueba:botones`: botón principal en Menú y Expediente (también con el foco del juego en la lista y al volver
  del Taller), la barra no cambia el estilo, el menú ⚙ sí, y el vidrio WebGL vuelve tras perder el contexto.
- Para no chocar con un relay en uso: `RELAY=http://localhost:8790 JUEGO=http://localhost:5180/` (las pruebas cargan el
  puente desde ese relay y nunca hablan con el 8787).
- Las pruebas dan por vistos los tutoriales del Taller y la Prueba (como la e2e del juego). Con el celular se pasan igual:
  en el Taller con OK o Atrás; en la Prueba, Acelerar avanza y Pausa los salta.
- `npm run prueba:visual`: capturas en 5 tamaños (640×360 a iPad) y las dos pieles; revisa que ningún botón se salga, se
  encime o sea demasiado chico.

**No probado:** varios celulares físicos distintos (se probó en un celular real en la misma red y con emulación), el tic
háptico de iOS y el modo "Agregar a inicio".

## Límites

- Celular y compu en la misma red; con aislamiento de clientes no conecta (usa el hotspot).
- Sin HTTPS: no hay giroscopio ni bloqueo de pantalla activa. Los botones bastan para todo el juego.
- El Explorador usa un campo de texto: con el celular se navega, pero las coordenadas se escriben en la compu.
- En el Menú y el Expediente, la primera flecha solo muestra el foco (igual que con teclado: así funciona el juego).
