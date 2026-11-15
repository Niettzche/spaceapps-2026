# Presupuesto por nivel: datos para la decisión (propuesta, sin implementar)

> Dueño de la decisión: **Edmundo**. Este archivo solo prepara datos; no cambia código ni el presupuesto actual.
> **Todo lo de aquí es valor de juego (P)**: costos de `game/src/content/parts.json`, presupuestos y factores. No es evidencia científica.
> Números del **15 nov 2026**, commit `0d9f6c8` (la física no cambió en `a0f594a`), **física 2** (por defecto). **Hay que volver a
> correrlos después del rebalanceo de física en curso (`robot.js`, `suelo_v2.js`).**

## 0. Hoy

- Presupuesto único: `PRESUPUESTO_INICIAL = 1000` (`game/src/config/world.js`). No hay presupuesto por nivel: ni en
  `niveles_destacados.js` ni en `data/sites`. El Taller lee `partida.presupuesto ?? PRESUPUESTO_INICIAL`.
- Costo = suma de piezas; **cada eje cobra 2 ruedas** (`diseno.js`, multiplicador 2). Robot mínimo: chasis ligero 150 + 4 ruedas
  estándar 320 + motor eficiente 110 + batería chica 90 + soporte básico 60 = **730**. Malla en los dos ejes: 810; ancha: 890.
- Fuentes de la tabla: **NIV** = tabla de balance de `NIVELES_DESTACADOS.md`; **DEC** = `docs/DECISIONES.md` (15 nov);
  **SIM** = simulación nueva (script `matriz_f2.mjs`, 60 Hz sin tiempo real, acelerador a fondo, chasis ligero y soporte básico fijos;
  27 corridas). «x/y» = pasó x de y corridas. Matter es caótico: 1 corrida no es prueba de estabilidad.

## 1. Diseño más barato que pasa, por nivel

Piezas comunes salvo que se diga: chasis ligero, motor eficiente, batería chica, soporte básico, sin módulo. «del/tras» = ejes.

| Nivel | Destino | Diseño más barato que pasa | Costo | ¿Pasa? | Fuente | Más barato que falla |
|---|---|---|---|---|---|---|
| 1. g00266 Jabal Bayda | Marte | malla del + estándar tras | 770 | sí, E 42 % (1/1) | SIM | estándar (730): atascado 37 m (NIV) |
| | | malla en ambos ejes | 810 | sí, E 45 % | NIV | |
| 2. tenoumer | Marte | malla en ambos ejes | 810 | sí, carga 86 % | NIV | malla/estándar (770): atascado 40 m (SIM) |
| 3. mx0023 Cananea | Luna | malla en ambos ejes | 810 | sí, E 47 % | NIV | malla/estándar (770): atascado 31 m (SIM) |
| 4. pinacate | Luna | **chasis reforzado** + estándar | 840 | sí, resistencia 32/80 | NIV | ligero + estándar (730): chasis destruido 158 m (a fondo; despacio pasa) |
| 5. pingualuit | Marte | malla en ambos ejes | 810 | sí, E 47 % | NIV | malla/estándar (770): atascado 40 m (SIM) |
| 6. samalayuca (dorado Marte) | Marte | malla en ambos ejes | 810 | sí, E 47 % (2/2) | SIM | malla/estándar o estándar/malla (770): atascado 40–41 m (SIM) |
| | | ancha en ambos ejes (diseño del camino dorado) | 890 | sí, E 42–43 % | NIV + SIM 1/1 | estándar (730): atascado 12–13 m |
| 7. mx0261 Rincón de Parangueo | Luna | estándar + **batería mediana** | 770 | sí, E 34 % (NIV + SIM 1/1) | NIV + SIM | estándar (730): sin energía 538 m; malla (810): meta con E 0 % |
| g00263 Al Hutaymah (dorado Luna) | Luna | malla en ambos ejes | 810 | sí, E 42 % (2/2) | SIM | estándar (730): atascado 12 m; malla/estándar (770): atascado 41 m |
| | | ancha en ambos ejes (diseño del camino dorado) | 890 | **inestable: 1/3** (meta E 38 %; 2 veces atascado a 41 m) | SIM (DEC decía «pasa, E 38 %») | |
| Misión Jezero | Marte | estándar | 730 | **2/3** entrega E 28–29 %; 1 carga perdida a 114 m (a fondo) | SIM | — |
| | | malla en ambos ejes | 810 | sí, E 49–50 % (2/2) | SIM | |
| Misión polo sur lunar | Luna | estándar + **batería mediana** | 770 | sí, E 23 % (1/1) | SIM | estándar + chica (730): sin energía 239 m |
| | | malla en ambos ejes | 810 | sí, E 34 % (2/2) | SIM | ancha (890): entrega con E 9 % |

Lo que pide el **recorrido completo** (prueba + misión con el mismo robot): Marte dorado = ancha 890 (o malla 810); Luna dorada =
malla 810 (la ancha llega a la misión lunar con 9 % y es inestable en g00263). Sin simular: chasis distinto del ligero salvo Pinacate,
soporte con correas, módulos, motor equilibrado/potente y ejes mixtos en Pinacate, mx0261 y misiones.

## 2. Algoritmo propuesto (P)

`presupuesto(nivel) = min(TECHO, max(PISO, redondear_a_50(costo_minimo × factor)))`, con `factor` entre 1.2 y 1.3.

- `costo_minimo` = el diseño más barato que pasó **todas** sus corridas (tabla 1). En misiones no se compra nada: ver §3.
- **Piso 900:** el diseño del camino dorado (ancha, 890) y la recomendación «cambia a ruedas anchas» deben caber en cualquier nivel
  donde el feedback la pueda dar; con menos de 890 el botón «Aplicar y al taller» llevaría a un diseño que excede.
- **Techo 1,100:** el diseño más caro con sentido en la tabla es Pinacate ancha + reforzado (1,000); 1,100 deja lugar a un módulo
  (calentador 40, radiador 90, auto-rescate 100). Más alto haría irrelevante el presupuesto en todos los niveles.
- Redondeo al 50 más cercano (924 → 900, 1,053 → 1,050).

| Nivel | Costo mínimo | × 1.2 | Presupuesto (1.2) | × 1.3 | Presupuesto (1.3) |
|---|---|---|---|---|---|
| g00266 Jabal Bayda | 770 | 924 | 900 | 1,001 | 1,000 |
| tenoumer | 810 | 972 | 950 | 1,053 | 1,050 |
| mx0023 Cananea | 810 | 972 | 950 | 1,053 | 1,050 |
| pinacate | 840 | 1,008 | 1,000 | 1,092 | 1,100 |
| pingualuit | 810 | 972 | 950 | 1,053 | 1,050 |
| samalayuca (dorado Marte) | 810 | 972 | 950 | 1,053 | 1,050 |
| mx0261 Rincón de Parangueo | 770 | 924 | 900 | 1,001 | 1,000 |
| g00263 Al Hutaymah (dorado Luna) | 810 | 972 | 950 | 1,053 | 1,050 |
| Misión Jezero (referencia) | 730* | 876 | 900 (piso) | 949 | 950 |
| Misión polo sur lunar (referencia) | 770 | 924 | 900 | 1,001 | 1,000 |
| Otros sitios de `data/sites` (sin datos) | — | — | 1,000 (= hoy) | — | 1,000 (= hoy) |

\* 730 pasa 2 de 3 (pierde la carga a fondo); con el robusto (810) quedaría 950 / 1,050.
Lectura: con **1.2** todos los niveles quedan entre 900 y 1,000 (igual o más apretado que hoy); con **1.3** quedan entre 1,000 y
1,100 (igual o más holgado). 1.2 hace que el presupuesto obligue a elegir; 1.3 casi no cambia la experiencia actual.

## 3. Qué cambiaría en el juego si Edmundo lo aprueba (no implementado)

Archivos y constantes (dueño entre paréntesis):
- `game/src/config/world.js` (integrador): `PRESUPUESTO_INICIAL` queda como respaldo para sitios sin valor; se agregarían
  `PRESUPUESTO_PISO`/`TECHO` si se calcula en código.
- `game/src/content/niveles_destacados.js` (juego): campo `presupuesto` por nivel (o `costo_minimo` y se calcula). Para los otros
  sitios, el campo iría en `data/sites` → cambio de `data/schema/site.schema.json` (integrador).
- Partida (`game/src/main.js` `estadoInicial`, integrador; `scenes/expediente/guardado.js` `nuevaPartida`/`visitarSitio`;
  `Menu.js` y `Explorador.js`, que pasan `PRESUPUESTO_INICIAL`): hoy el presupuesto es de la partida; habría que fijarlo al gastar
  el ticket de un sitio. Decidir si un sitio ya pagado conserva su presupuesto al volver.
- `game/src/scenes/Taller.js` (taller, línea ~261) y `Taller/accesible.js`: ya leen `this.presupuesto`; solo cambia de dónde sale.
- `game/src/scenes/Resultados.js` (línea ~81): `puntuar(resultado, PRESUPUESTO_INICIAL)` → presupuesto del sitio probado (la misión
  no compra: usa el del nivel donde se armó el robot). Comentario en `feedback/puntuacion.js`.
- Textos: `Menu.js` (línea ~330, «3 tickets · 1,000 créditos»), `expediente/como_jugar.js` y su prueba (`/1,000/`),
  comentario de `Taller/diseno.js` («730 de 1,000»), `Taller/piezas.test.mjs` (`PRESUPUESTO = 1000`; la prueba «ancha + calentador
  o radiador ≤ 1,000» fallaría con 900: 890 + 40 = 930).
- Docs: `AGENTS.md` §4 («1,000 créditos») y `docs/DECISIONES.md` (integrador); `docs/juego/ESPECIFICACION.md`,
  `TEXTOS_CORTOS.md`, `NIVELES_DESTACADOS.md`, `FISICA_V2.md` §5.1, `docs/media/TRAILER_GUION.md`, `docs/estado/taller.md` y `expediente.md`.

Riesgos:
- **Puntuación no comparable entre niveles:** «presupuesto ahorrado» = (presupuesto − costo) / presupuesto. Ancha 890 con 1,000 da
  11 puntos; con 950, 6; con 900, 1. El máximo de 1,000 puntos ya no es igual de alcanzable en todos los sitios.
- **Camino dorado (e2e `game/e2e/camino_dorado.mjs`):** el flujo estándar → ancha necesita ≥ 890 en Samalayuca y g00263 (el piso
  900 lo cubre, sin margen para un módulo). Revisar que la e2e no espere textos con «1,000».
- **Recomendaciones del feedback:** si una pieza recomendada no cabe, el Taller bloquea «Probar»; el feedback tendría que mirar el
  presupuesto del nivel.
- **Recalibración:** cualquier cambio de física o de precios mueve `costo_minimo`; la tabla 1 hay que volver a correrla.

## 4. Hallazgos que no son de presupuesto (avisar al frente juego)

- **g00263 con rueda ancha pasó solo 1 de 3** a fondo (2 veces atascado a 41 m), y la malla (810) 2 de 2. `DECISIONES.md` dice que la
  ancha pasa con E 38 %. Riesgo para el camino dorado lunar y su e2e (el piloto de la e2e puede no ir a fondo: verificar).
- La malla (810) pasa Samalayuca y g00263 más barata que la ancha (890): el camino dorado no usa el diseño más barato.
- Jezero con estándar a fondo perdió la carga 1 de 3 (ya señalado en `FISICA_V2.md` §5.1 para la ancha).
