# Estado — Expediente, explorador y menú

> Lo actualiza SOLO este frente. Todo el trabajo del frente ya está en main: entrega (#12), ajustes, accesibilidad (#48)
> y Boot ligero (#50).

**Responsable:** Diego  ·  **Agente:** Claude Code  ·  **Rama:** feat/expediente-estado
**Última actualización:** 14 nov 2026

## Hecho

### Entrega principal (`feat/expediente`, ya en main, PR #12)
- [x] **Boot:** pantalla de carga con progreso real (eventos del cargador de Phaser sobre el arte de `/assets`; si no hay
  arte, 100 %). En main, el frente juego le agregó la portada de arte.
- [x] **Menú:** nueva partida → elección de destino (Marte primero, Luna), continuar, explorador, "¿De dónde salen los números?".
- [x] **Expediente:** lista de sitios del destino (8 por página) y comparación 1 a 1: Tierra a la izquierda, destino a la
  derecha, misma variable y unidad, fuente y fecha de cada lado; "sin dato" si falta; aviso si las unidades no coinciden;
  banda roja en sitios `ilustrativo` o `demo: true`.
- [x] **Lo que la Tierra no puede probar:** une `no_reproducible_en_tierra` del destino y `limites` del sitio; la gravedad
  lleva su valor y la nota de que solo se simula en la misión; las notas largas de `limites` salen como "Límite del cálculo".
- [x] **Tickets:** 3 por partida (`TICKETS_POR_PARTIDA`), se gastan al elegir un sitio nuevo, no se entra sin tickets, volver a
  probar un sitio ya pagado no cuesta; "Nueva partida" los restaura sin duplicar. "Probar" fija `partida.sitio` → Taller.
- [x] **Guardado** en localStorage (`mision_cero.partida.v1`): al elegir destino y sitio, y al ocultar o cerrar la pestaña.
  "Continuar" lo restaura en el mismo objeto `partida` y va al Taller si ya hay sitio, o al Expediente si no.
- [x] **Ficha completa ↗:** abre web/ con `?sitio=<id>` (y `&ficha=MX0007` para detecciones del detector). La URL sale de
  `VITE_WEB_URL`; sin ella el botón aparece deshabilitado ("sin enlace").
- [x] **"¿De dónde salen los números?"** en español e inglés (3 páginas). El contenido sale de AGENTS.md; si cambian cifras
  o fuentes, actualizar `game/src/scenes/expediente/numeros.js`.
- [x] **Explorador:** coordenada → `POST /score` con contador de espera → similitud total, confianza y tabla por dimensión;
  aviso claro si la API no responde (el juego sigue). "Proponer sitio" (`POST /submit`) solo si la API lo permite y la
  similitud total ≥ 0.6 (`UMBRAL_PROPUESTA`, P). Probado de punta a punta con la API local (~60 s por punto; espera máxima 90 s).

### Ajustes (`feat/expediente-ajustes`, ya en main por la integración `a84dd62`)
- [x] La lista se ordena por similitud total de mayor a menor; los sitios `ilustrativo`, `demo: true` o sin similitud
  siempre van al final.
- [x] Boot, Menú, Expediente y Explorador usan `irA()` de `ui.js` (fundido) en vez de `scene.start`. No se modificó `ui.js`.

### Accesibilidad (`feat/expediente-accesibilidad`, ya en main, PR #48)
En la integración de la ronda 3 (`e68d856`) el Menú y el Expediente quedaron además bilingües.
- [x] **Atajos numéricos como en Resultados:** botones con "1 · …" y teclas 1–9 (Menú 1–4; destino 1 Marte, 2 Luna,
  3 Volver; lista del Expediente 1–8). La opción sugerida va con ⏎ en verde; Enter ejecuta la enfocada o la sugerida.
  Flechas, Tab y Esc siguen igual. Se corrigió Shift+Tab (con Shift presionado Phaser reemitía el mismo evento 3 veces).
- [x] **Enter confirma el ticket:** al elegir un sitio (número, Enter o toque) el foco pasa a "Gastar 1 ticket y probar ⏎"
  y el siguiente Enter lo confirma. Sin tickets no se gasta nada.
- [x] **Foco dentro del Explorador:** Tab y Shift+Tab dan la vuelta dentro del diálogo; Esc vuelve al Menú.
- [x] **Explorador móvil:** grados sin signo + listas N/S y E/O (el teclado decimal de iOS no tiene "−"); se convierte a
  grados con signo antes de `POST /score`. Letra de 16 px en campos y listas (sin zoom automático de iOS),
  `box-sizing: border-box` y 44 px de alto en campos y botones.
- [x] **Zonas táctiles más grandes:** mínimo 64×44 px del juego sin cambiar el dibujo; en la lista del Expediente toda la
  fila es tocable. Medido en un teléfono emulado: en horizontal pasan de 12 a 32 px de alto; en vertical, de 7 a 18 px.
- [x] **mx0207 (mina de Real de Ángeles) como análogo operativo:** sobre lo que el integrador ya había dejado en main
  (`esMina`, "Forma del tajo minero", estado "ANÁLOGO OPERATIVO (MINA)"), la columna del destino dice
  "vs. cráteres Luna+Marte" y la nota aclara que es una excavación, no un cráter natural.
- [x] Pruebas de lógica: 14 en `logica.test.js`, incluidas 3 de hemisferios y 1 de mx0207 con los datos reales de
  `mx0207` y `g00281`.
- [x] **Probado en un teléfono real** (Diego): sin problemas.

### Boot ligero (`feat/expediente-boot-ligero`, ya en main, PR #50)
- [x] El Boot no precarga GIF, MP4, WebM ni archivos mayores a 300 KB (`LIMITE_PRECARGA_BYTES` y
  `EXTENSIONES_SIN_PRECARGA` en `config.js`). El tamaño se mide sin descargar (URL `data:` o `HEAD`); lo que se salta se
  registra en la consola (`[Boot] no se precarga …`) y en el resumen del Boot con su tamaño; la barra llega al 100 %.
- [x] Regla en `game/src/scenes/expediente/precarga.js` con 3 pruebas en `pruebas/precarga.test.js`.
- [x] Medido en el build de producción con el arte de entonces (93 PNG, el mayor de 22.4 KB): no se saltó nada; lo
  descargado hasta el Menú pasó de 542.0 KB a 543.0 KB.

### Explorador sin API (14 nov, sobre `feat/juego`)
Playtest: "el explorador libre no funciona" (la API no está publicada; antes solo salía un aviso y "Volver").
- [x] **Catálogo precalculado:** la coordenada se busca entre los sitios de `data/sites/` (`TODOS_LOS_SITIOS`, 58 con
  coordenadas) por distancia de gran círculo. A ≤ 25 km (`RADIO_CATALOGO_KM`, P) se ve su ficha: nombre, estado,
  distancia, similitud total y por dimensión, confianza, gemelo, lo que la Tierra no puede probar y notas del cálculo.
  Si es jugable, "Abrir su Expediente" (`visitarSitio` en `guardado.js`: el destino pasa a su gemelo, no gasta tickets;
  si el sitio en juego era de otro destino se suelta). Si no hay sitio cerca: "Fuera del catálogo precalculado" + los 3
  más cercanos con su distancia (botones). Todo con la etiqueta "Resultado precalculado del catálogo (sin consulta en vivo)".
- [x] **Clima en vivo de NASA POWER desde el navegador** (verificado: responde con `Access-Control-Allow-Origin: *`, sin
  llave, ~0.1 s; espera máx. 8 s). Solo fuera del catálogo: `T2M_RANGE` y `PRECTOTCORR` (misma consulta que
  `model/features.py`) → similitud PARCIAL por dimensión con la fórmula y escalas de `model/score.py` (20 K, 1 mm/día;
  recorte al máximo terrestre de 40 K). Sin forma no hay total. Si POWER falla, se omite con una nota neutra.
- [x] **Proponer sitio** sin API: botón deshabilitado con la razón ("necesita la API del servidor"). Con API, igual que antes.
  Si la API se cae a media consulta, se responde con el catálogo y las siguientes consultas ya no la esperan.
- [x] Letra del Explorador ≥ 15 px. Pruebas nuevas: `pruebas/catalogo.test.js` (9) y 1 en `tickets.test.js`.

Pruebas del frente: **41/41** (`cd game && node --test src/scenes/expediente/pruebas/`).

## Prueba del camino completo en Luna y Marte
Recorrido con clics y teclas reales (`npm run dev`, Chrome sin ventana): Menú → Nueva partida → destino → Expediente →
ticket → Taller → Prueba → Resultados → Misión → Resultados → Menú → recarga → Continuar.

**14 nov, sobre main en `0f8f8b3` (Luna y Marte):**

| Verificación | Luna | Marte |
|---|---|---|
| Boot → Menú sin pantalla negra | ✅ | ✅ |
| Número de sitios en la tarjeta del destino | ✅ 1 (mx0207) | ✅ 3 |
| mx0207 presentado como mina, no como cráter | ❌ entonces; ✅ corregido en accesibilidad | n/a |
| Fuente, unidad y fecha en cada fila; "sin dato" donde falta | ✅ | ✅ |
| Gravedad del destino en "Lo que la Tierra no puede probar" | ✅ 1.62 vs 9.81 | ✅ 3.71 vs 9.81 |
| Orden por similitud; `sitio_3` marcado como ilustrativo | ✅ | ✅ |
| Ticket 3 → 2, guardado; el mismo sitio no gasta otra vez | ✅ | ✅ |
| Volver al Expediente tras elegir sitio | ❌ ver Siguiente | ❌ |
| Continuar restaura la partida al recargar | ✅ | ✅ |
| Explorador ida y vuelta | ✅ | ✅ |
| Taller → Prueba → Misión → Resultados | ✅ navega | ✅ navega |

**Repetida en `feat/expediente-accesibilidad` (sobre main `95aab5a`):** Marte, recorrido completo hasta Continuar sin
errores en consola; hoy hay 2 sitios jugables por destino (Marte: Samalayuca y Pinacate; Luna: mx0207 y g00281) y `sitio_3`
ya no existe. En la Luna se revisó hasta el Taller y la presentación de mx0207 como mina.
El script mantiene la flecha derecha y no cambia piezas: la prueba en Samalayuca terminó "atascado" y la misión "sin
energía". El camino dorado completo (ruedas anchas → pasa → entrega) no se probó con este script.

## En curso
- **Pulido visual del Menú (feat/menu-ambiente, PR "AGREGADOS A MENU")**, hecho en un worktree limpio desde origin/main:
  - Fondo animado (`scenes/expediente/ambiente.js`, planificador puro en `ambiente_plan.js`): Vía Láctea con carriles de polvo y
    deriva lenta, estrellas, disco de Marte copiado con máscara y halo que respira, destellos sobre el disco (plata casi siempre;
    de vez en cuando lavanda, turquesa o ámbar), asteroides en tres capas de profundidad, un cometa con cola iónica y de polvo,
    planetas o el Sol detrás de Marte (nunca Marte), galaxias de fondo (Enana del Can Mayor, Enana de Sagitario, Gran Nube de
    Magallanes) y el agujero negro (≈10 s) tras volver de un nivel con resultado nuevo.
  - Interfaz: fuente sans de sistema (`FUENTE_TEXTO`, sin CDN), filtro lineal en los textos, textos del Menú de 14 px como
    mínimo, viñeta oscura detrás de la columna de botones (sin velo uniforme), gris secundario `#b8c1de` (≥ 4.5:1 sobre el fondo).
  - `limpiar()` (interfaz.js) conserva lo marcado con `setData('ambiente', true)`: el fondo sobrevive a los cambios de vista.
- **Interruptores:** `?ambiente=off` deja solo el arte y la viñeta; `?semilla=N` fija el azar del fondo;
  `window.__mc.ambiente.disparar('agujero' | 'planeta' | 'galaxia' | 'cometa' | 'asteroide')` fuerza un evento (QA y pitch).
- **Movimiento reducido** (`prefers-reduced-motion`): solo fondo estático y halo fijo; el agujero entra como un fundido corto.
- **Límites conocidos:** el agujero negro no curva las estrellas cercanas (opcional, no hecho). Con `?ambiente=off` no hay
  agujero, planetas, galaxias ni cometas. Verificado en captura de Chrome: Menú principal, agujero negro en crecimiento y
  "Cómo jugar" con el fondo. Planetas, galaxias y asteroides: revisados por código y pruebas, no en captura. Pruebas
  del frente con node --test: 53 en verde.
- **Para integración:** declarar en `docs/USO_IA.md` que el arte ambiental del Menú es procedural, hecho con código y apoyo de IA.
- **Coordinación pendiente con Diego:** `Menu.js` y `interfaz.js` son de este frente, pero el cambio de fuente y `limpiar()` afectan
  también a las demás escenas que usan `texto()`; conviene una revisión de Expediente, Explorador y Resultados.

## Siguiente
- [ ] **Gravedad de Marte 3.73 si el equipo la cambia** (hoy 3.71): actualizar los 2 textos de
  `game/src/scenes/expediente/numeros.js` (español e inglés) y el destino de prueba en `pruebas/logica.test.js`.
- [ ] **Volver al Expediente tras elegir sitio** (Expediente / Juego): "Continuar" (`Menu.js`, `continuar()`) va al Taller si
  hay sitio y Resultados no ofrece ir al Expediente; los tickets restantes solo se usan con "Nueva partida".

## Cómo probar
- `cd game && npm run dev` → Menú → `1` (Nueva partida) → `1` (Marte) → `1` (Samalayuca) → Enter → Taller.
- Pruebas de lógica: `cd game && node --test src/scenes/expediente/pruebas/`
- Explorador con API: desde la raíz `ALLOWED_ORIGINS=http://localhost:5173 uvicorn api.main:app --port 8000`.
  Opcional: `game/.env.local` con `VITE_API_URL=...` y `VITE_WEB_URL=...`.

## Bloqueos / necesito de otro frente
- **Zonas táctiles de `ui.js`** (Alan): `boton()` usa solo el área del texto; afecta a Resultados y a las escenas que lo usan.
- **Esc y flechas en Resultados y Taller** (Edmundo, Leo): Resultados solo usa números y Enter; en el Taller Esc no volvía.
- **Juego (Edmundo), visto el 14 nov sobre `0f8f8b3`, no reverificado:** texto de la fuente del perfil cortado en Prueba y
  Misión; en Marte, manteniendo → el robot cruzó la zona de entrega y salió por el borde derecho del terreno.
- **Modelo/API (Mario):** `/score` para (31.84, -113.39) devolvió total 0.60 con confianza 0.25 y `puede_proponer: true`.
  ¿Exigir una confianza mínima para proponer? Lo decide el frente modelo.
- **API (CORS):** el servidor debe incluir el origen del juego en `ALLOWED_ORIGINS`.
- **Arte (Mauricio):** desde #50 el Boot ya no precarga GIF, MP4 ni WebM, pero si se ponen en `/assets` Vite los copia al
  build (para poder listarlos y reportarlos). Conviene que los GIF y videos vivan en `docs/media/`.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- **web/ (Alan):** leer `?ficha=<ID>` y `?sitio=<id>` al cargar para abrir la ficha o el sitio directamente.
- **Despliegue:** definir `VITE_WEB_URL` (URL pública de web/) y `VITE_API_URL` (API del VPS) al construir el juego.
