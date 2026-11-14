# Estado — Expediente, explorador y menú

> Lo actualiza SOLO este frente. Ramas: `feat/expediente` (ya en main) y `feat/expediente-ajustes`.

**Responsable:** Diego  ·  **Agente:** Claude Code  ·  **Rama:** feat/expediente-ajustes
**Última actualización:** 14 nov 2026

## Hecho
- [x] Pantalla de carga con progreso real (eventos del cargador de Phaser sobre el arte de `/assets`; si no hay arte, 100 %)

- [x] Menú: nueva partida → elección de destino (Marte primero, Luna), continuar, explorador, "¿De dónde salen los números?"
- [x] Expediente: lista de sitios del destino (por similitud; 8 por página) y comparación 1 a 1:
  Tierra a la izquierda, destino a la derecha, misma variable y unidad, fuente y fecha de cada lado; "sin dato" si falta;
  aviso si las unidades no coinciden; banda roja en sitios `ilustrativo` o `demo: true`. Probado también con los 56 sitios
  de `feat/modelo-fichas` (29 Marte, 27 Luna).
- [x] Pruebas de lógica: `cd game && node --test src/scenes/expediente/pruebas/`

- [x] Expediente: recuadro "Lo que la Tierra no puede probar" (une `no_reproducible_en_tierra` del destino y `limites` del sitio;
  gravedad con su valor y la nota de que solo se simula en la misión); las notas largas de `limites` salen como "Límite del cálculo"

- [x] Tickets: 3 por partida (`TICKETS_POR_PARTIDA`), se gastan al elegir un sitio nuevo, no se entra sin tickets, volver a probar
  un sitio ya pagado no cuesta; "Nueva partida" los restaura sin duplicar. "Probar" fija `partida.sitio` (objeto del sitio) → Taller.
- [x] Guardado en localStorage (`mision_cero.partida.v1`): se guarda al elegir destino y sitio, y al ocultar/cerrar la pestaña
  (así también se conservan `diseno` y `resultados` que escriben otras escenas). "Continuar" lo restaura en el mismo objeto
  `partida` y va al Taller si ya hay sitio, o al Expediente si no. Verificado: camino dorado Menú → Marte → Samalayuca → ticket
  (3→2) → Taller, y recarga → Continuar.

- [x] Botón "Ficha completa ↗" que abre web/ en otra pestaña con `?sitio=<id>` (y `&ficha=MX0007` para detecciones del detector).
  La URL sale de `VITE_WEB_URL` (archivo `game/.env.local`, no se sube); sin ella el botón aparece deshabilitado ("sin enlace").

- [x] Pantalla "¿De dónde salen los números?" en español e inglés (3 páginas: fuentes, cálculo, validación/límites/valores
  de juego). Todo el contenido sale de AGENTS.md; si cambian cifras o fuentes, actualizar `game/src/scenes/expediente/numeros.js`.

- [x] Explorador: formulario HTML sobre el lienzo (lat/lon validados en grados decimales, destino, relleno opcional con un sitio
  del catálogo que tenga coordenadas) → POST /score con contador de espera → similitud total, confianza y tabla por dimensión
  (Tierra / destino / similitud, con fuente), límites y errores de la API. Si la API no responde: aviso claro y el juego sigue.
  Probado con la API local (`uvicorn api.main:app`): ~60 s por punto, por eso la espera máxima es 90 s (`ESPERA_API_MS`).

- [x] Explorador: "Proponer sitio" (POST /submit) solo si la API permite y la similitud total ≥ 0.6 (`UMBRAL_PROPUESTA`, P);
  nombre obligatorio (3–80 caracteres), alias opcional con aviso de no poner datos personales; confirma `propuesto_usuario`
  o explica el fallo. Probado de punta a punta con la API local.

- [x] **Ajuste 1 (`feat/expediente-ajustes`):** la lista se ordena por similitud total de mayor a menor; los sitios
  `ilustrativo`, `demo: true` o sin similitud siempre van al final (ya no hay prioridad de "curado"). Pruebas: 10/10.
- [x] **Ajuste 2 (`feat/expediente-ajustes`):** Boot, Menú, Expediente y Explorador usan `irA()` de `ui.js` (fundido)
  en vez de `scene.start`. No se modificó `ui.js`.

## Prueba del camino completo (tarea 3, 14 nov, sobre `main` en `0f8f8b3`)
Recorrido con clics y teclas reales (`npm run dev`, Chrome sin ventana): Menú → Nueva partida → destino → Expediente →
ticket → Taller → Prueba → Resultados → Misión → Resultados → Menú → recarga → Continuar. Luna y Marte.

| Verificación | Luna | Marte |
|---|---|---|
| Boot → Menú sin pantalla negra | ✅ | ✅ |
| Número de sitios en la tarjeta del destino | ✅ 1 (mx0207) | ✅ 3 |
| mx0207 presentado como mina, no como cráter | ❌ ver Siguiente | n/a |
| Fuente, unidad y fecha en cada fila; "sin dato" donde falta | ✅ | ✅ |
| Gravedad del destino en "Lo que la Tierra no puede probar" | ✅ 1.62 vs 9.81 | ✅ 3.71 vs 9.81 |
| Orden por similitud; `sitio_3` marcado como ilustrativo | ✅ | ✅ Samalayuca → Pinacate → `sitio_3` |
| Ticket 3 → 2, guardado; el mismo sitio no gasta otra vez | ✅ | ✅ |
| Volver al Expediente tras elegir sitio | ❌ ver Siguiente | ❌ |
| Continuar restaura la partida al recargar | ✅ | ✅ |
| Explorador ida y vuelta | ✅ | ✅ |
| Taller → Prueba → Misión → Resultados | ✅ funciona (ver Bloqueos) | ✅ funciona (ver Bloqueos) |
| Errores en consola | solo 404 de `/favicon.ico` | solo 404 de `/favicon.ico` |

## En curso
- (nada)

## Siguiente
- [ ] **mx0207 (mina) con etiquetas de cráter:** `expediente/textos.js:5` ("Forma del cráter") y `expediente/logica.js:84`
  ("Cráteres Luna+Marte"; fuente en `logica.js:12-14`). Para sitios operativos (minas) usar "Forma de la depresión" y aclarar
  que es excavación, no cráter de impacto. Lo pidió Edmundo.
- [ ] **No se puede volver al Expediente con un sitio ya elegido:** "Continuar" (`Menu.js`, `continuar()`) siempre va al Taller
  si hay sitio y Resultados no ofrece ir al Expediente; los tickets restantes solo se usan con "Nueva partida". Opción en mis
  escenas: un botón "Elegir otro sitio" en el Menú cuando hay partida guardada.
- [ ] Menor: Boot (`Boot.js:38`) y Menú (`Menu.js:48`) dicen "4 sitios" (solo jugables, no el catálogo del modelo).
- [ ] Cuando el arte esté listo: fondos y tipografía en Boot/Menú/Expediente (hoy texto monoespaciado provisional)
- [ ] Revisar el Expediente con los datos reales cuando `feat/modelo` llegue a `main`

## Cómo probar
- `cd game && npm run dev` → Menú → Nueva partida → Marte → Médanos de Samalayuca → Gastar 1 ticket y probar → Taller.
- Pruebas de lógica: `cd game && node --test src/scenes/expediente/pruebas/`
- Explorador con API: desde la raíz `ALLOWED_ORIGINS=http://localhost:5173 uvicorn api.main:app --port 8000`.
  Opcional: `game/.env.local` con `VITE_API_URL=...` y `VITE_WEB_URL=...`.

## Bloqueos / necesito de otro frente
- **Juego (Edmundo), visto en la tarea 3:** en Prueba y Misión el texto de la fuente del perfil se corta ("inicio y meta
  planos =", "desde el m"); en Misión "Carga" se encima con "intento 1" y "ZONA DE ENTREGA" (`fisica/recorrido.js:92`) con
  "[ Abandonar ]" (Luna) y casi no se lee en Marte. En Marte, manteniendo → el robot cruzó la zona (292 de 268 m) y salió por el
  borde derecho del terreno, sin pared.
- **Juego/Taller (balance, solo observación):** el diseño por defecto del Taller (ruedas estándar, batería chica, 730 cr)
  se queda sin energía: Luna misión 246.8 m sin llegar a la zona; Samalayuca prueba 152.7 m (39 patinadas). La recomendación
  coincide con el camino dorado ("ruedas anchas"). En la Luna la superficie de la misión sale como "arena".
- **Integración (Alan):** 404 de `/favicon.ico` (`game/index.html` no declara ícono). No afecta al juego.
- **Modelo/API (Mario):** en `main`, `/score` para (31.84, -113.39) devolvió total 0.60 con confianza 0.25 (solo precipitación;
  MODIS respondió 400) y `puede_proponer: true`. ¿Exigir una confianza mínima para proponer? Lo decide el frente modelo; el
  Explorador muestra la confianza junto al total. La API tarda ~60 s por punto.
- **API (CORS):** el servidor debe incluir el origen del juego en `ALLOWED_ORIGINS`.
- **Arte:** Boot precarga solo lo que haya en `/assets`. Si se necesitan hojas de sprites, crear `assets/manifest.json`
  (formato en `game/src/scenes/expediente/assets.js`); sin manifiesto, cada imagen se carga con clave = ruta sin extensión.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- **web/ (Alan):** leer `?ficha=<ID>` y `?sitio=<id>` al cargar para abrir la ficha o el sitio directamente (hoy el juego
  enlaza así; si no se implementa, el enlace abre la página en `#mapa`).
- **Despliegue:** definir `VITE_WEB_URL` (URL pública de web/) y `VITE_API_URL` (API del VPS) al construir el juego.
