# Playtest de Leo · camino dorado (Marte y Luna), ES y EN

> Código probado: `origin/feat/juego` (6730c0e), servido en local con `npm run dev`.
> Método: `game/e2e/camino_dorado.mjs` (ES) y una copia en inglés con las etiquetas en inglés (`camino_en.mjs`), con clic de ratón
> y teclas reales. Solo cuando un clic real no funciona se usa un respaldo (y se anota).
> **Estado: incompleto.** Las dos corridas válidas no llegaron al final y el equipo de la máquina estaba cargado (CPU ~35 %).
> Hay que repetirlas en un equipo limpio antes de dar por cerrado este informe.

## Corridas

| Corrida | Resultado | Motivo |
|---|---|---|
| 1 (ES), 22:08 | Se quedó colgada en la misión de Marte (x 48 m) | Procesos de corridas anteriores seguían activos; no se pudo terminar sin afectar otros procesos |
| 2 (ES), puerto 5206 | Falla en el Boot ("no pasó al Menú") y en el Menú de Marte (timeout de 20 s); la Luna llega al Taller | Carga alta de la máquina |
| 2 (EN) | Marte y Luna llegan hasta Expediente; con error de consola | Ver más abajo |

## Fallos observados (sin confirmar en un equipo limpio)

| # | Pantalla | Qué pasó | Captura | ¿Bug o máquina? |
|---|---|---|---|---|
| F1 | Taller, Luna (ES) | "Probar el robot" no responde al clic real; el script lo forzó | `playtest2-es/luna_05_taller_estandar_error.png` (**pantalla en negro**) | **Posible bug**: pantalla en negro en el Taller. Revisar |
| F2 | Expediente, Luna (ES) | "Gastar 1 ticket" no responde al clic real; el script lo forzó | (sin captura) | Posible bug; repetir |
| F3 | Expediente, Marte (EN) | 5 errores de consola y `ERR_CONNECTION_REFUSED` | `playtest2-en/marte_03_expediente.png` | Es la API del modelo, que no corre en local: esperado en modo sin API; comprobar que el Expediente no se rompe |
| F4 | Menú, Marte (ES) | Timeout de 20 s en la carga del Menú | `playtest2-es/marte_01_menu_error.png` | Máquina cargada; repetir |
| F5 | Boot (ES y EN) | Error 404 de un recurso | — | Ver qué recurso falta (es el mismo 404 de auditorías anteriores) |

## Lo que la lista pide revisar (aún sin datos)

- **Final de la misión:** no llegué a la misión en ninguna corrida válida.
- **Reversa al inicio** (el robot debe chocar con la pared y terminar en atasco): no probado.
- **Menú con un solo resaltado:** solo se confirmó la navegación del Menú sin errores; el resaltado no se vio en captura.
- **Energía al llegar a la entrega (~10 %):** no probado.
- **Ratón y teclado:** en ambas corridas el clic real y las teclas funcionaron salvo F1 y F2.

## Siguiente paso
1. Reiniciar el equipo (o cerrar Chromium y Node que quedaron de corridas anteriores) y repetir las dos corridas en ES y EN, una a la vez.
2. Revisar F1 (pantalla en negro en el Taller) a mano: si se repite, es un bug del juego.
3. Anotar aquí los resultados finales con sus capturas.
