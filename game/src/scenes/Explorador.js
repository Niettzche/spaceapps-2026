import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, TODOS_LOS_SITIOS, DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { PRESUPUESTO_INICIAL, TICKETS_POR_PARTIDA } from '../config/world.js';
import { ORDEN_DESTINOS, DESTINO_POR_DEFECTO, UMBRAL_PROPUESTA, RADIO_CATALOGO_KM, urlFicha } from './expediente/config.js';
import { consultarPunto, proponerSitio, apiDisponible, climaPower, API_URL } from './expediente/api.js';
import {
  validarCoordenadasHemisferio, aHemisferio, formatoCoordenada, formatoValor, formatoPorcentaje, puedeProponer, validarNombrePropuesta, sinDato,
  filasComparacion, limitesDe, esDemostracion, esMina, unidadVisible, formatoNumero, recortar } from './expediente/logica.js';
import { buscarEnCatalogo, formatoDistancia, similitudClima, DIMENSIONES_CLIMA } from './expediente/catalogo.js';
import { visitarSitio } from './expediente/guardado.js';
import { MUNDOS, ESTADOS, etiquetaVariable, etiquetaLimite } from './expediente/textos.js';
import { crearCapa, el, ESTILOS } from './expediente/capa.js';
import { prepararIngles, enIdioma } from './expediente/datos_en.js';
import { tr, trDato, idioma } from '../i18n.js';
import { tocarMusica } from '../audio/musica.js';

// Dueño: frente expediente. Explorador libre (AGENTS.md §6.4, punto 3):
// coordenada → POST /score (similitud en vivo) → si supera el umbral, proponer el sitio (POST /submit).
// SIN API (la demo pública; AGENTS.md §3 regla 7): la coordenada se busca en el catálogo precalculado (data/sites/,
// sitio más cercano a ≤ RADIO_CATALOGO_KM) y, si NASA POWER responde desde el navegador, se muestra el clima en vivo con
// una similitud PARCIAL (solo clima; sin forma no hay total ni se puede proponer).
// El formulario es HTML sobre el lienzo (accesible con teclado y lector de pantalla).
export default class Explorador extends Phaser.Scene {
  constructor() { super('Explorador'); }

  create() {
    tocarMusica('menu');
    prepararIngles();
    this.consulta = null;
    this.capa = crearCapa('mc-explorador', ESTILOS);
    this.capa.setAttribute('lang', idioma());
    this.events.once('shutdown', () => this.cerrar());
    this.capa.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') this.volver();
      else if (ev.key === 'Tab') this.mantenerFoco(ev);
    });
    this.capa.append(this.encabezado());
    this.comprobarApi();
  }

  cerrar() {
    this.sondeo?.abort();
    this.consulta?.abort();
    this.capa?.remove();
    this.capa = null;
  }

  volver() { irA(this, 'Menu'); }

  encabezado() {
    const volver = el('button', { type: 'button', class: 'secundario' }, tr('← Menú', '← Menu'));
    volver.addEventListener('click', () => this.volver());
    this.header = el('header', {}, [el('h1', {}, tr('Explorador libre', 'Free explorer')), volver]);
    return this.header;
  }

  // En la demo pública la API del modelo no está publicada: se detecta enseguida (o en ≤ 4 s) en vez de dejar al
  // jugador esperando una consulta que nunca contesta.
  async comprobarApi() {
    const aviso = el('p', { class: 'estado', 'aria-live': 'polite' }, tr('Comprobando la API del modelo…', 'Checking the model API…'));
    const capa = this.capa;
    capa.append(aviso);
    this.sondeo = new AbortController();
    const r = await apiDisponible({ senal: this.sondeo.signal });
    if (this.capa !== capa || r.tipo === 'cancelado') return; // la escena se cerró (o se volvió a abrir) mientras esperaba
    aviso.remove();
    this.conApi = r.ok;
    if (!r.ok) { this.avisoModo = this.avisoSinApi(r); this.capa.append(this.avisoModo); }
    this.armarFormulario();
  }

  // Sin API no hay consulta en vivo del modelo, pero el Explorador sigue sirviendo con el catálogo precalculado.
  avisoSinApi(r) {
    const n = TODOS_LOS_SITIOS.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon)).length;
    return el('div', { class: 'modo', role: 'status' }, [
      el('strong', {}, tr('Modo sin API: catálogo precalculado', 'No-API mode: precomputed catalog')),
      el('p', {}, tr(`La API del modelo no está publicada en esta demo. Tu coordenada se busca entre los ${n} sitios ya calculados `
        + 'por el modelo (búsqueda en zonas áridas, no todo el planeta) y, si NASA POWER responde, se muestra su clima en vivo.',
      `The model API is not published in this demo. Your coordinate is looked up among the ${n} sites already computed `
        + 'by the model (a search of arid regions, not the whole planet) and, if NASA POWER answers, its live climate is shown.')),
      r.tipo === 'no_publicada' ? null
        : el('p', { class: 'nota' }, tr(`(${API_URL} no respondió a /health en 4 s)`, `(${API_URL} did not answer /health within 4 s)`)),
    ]);
  }

  armarFormulario() {
    const ids = [...ORDEN_DESTINOS.filter((id) => DESTINOS[id]), ...Object.keys(DESTINOS).filter((id) => !ORDEN_DESTINOS.includes(id))];
    const inicial = DESTINOS[partida.destino] ? partida.destino : DESTINO_POR_DEFECTO;
    const conCoordenadas = SITIOS.filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');

    // Solo grados sin signo (el teclado decimal del teléfono basta) + hemisferio en una lista: no se depende del "−".
    this.lat = el('input', { id: 'mc-lat', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: tr('ej. 31.84', 'e.g. 31.84'), required: true });
    this.lon = el('input', { id: 'mc-lon', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: tr('ej. 113.39', 'e.g. 113.39'), required: true });
    // El valor interno del oeste es siempre "O" (logica.js); en inglés solo cambia lo que se ve: "W (west)".
    this.latHem = el('select', { id: 'mc-lat-hem', 'aria-label': tr('Hemisferio de la latitud', 'Latitude hemisphere') }, [
      el('option', { value: 'N', selected: true }, tr('N (norte)', 'N (north)')), el('option', { value: 'S' }, tr('S (sur)', 'S (south)'))]);
    this.lonHem = el('select', { id: 'mc-lon-hem', 'aria-label': tr('Hemisferio de la longitud', 'Longitude hemisphere') }, [
      el('option', { value: 'E' }, tr('E (este)', 'E (east)')), el('option', { value: 'O', selected: true }, tr('O (oeste)', 'W (west)'))]);
    this.destino = el('select', { id: 'mc-destino' }, ids.map((id) => el('option', { value: id, selected: id === inicial },
      `${MUNDOS[DESTINOS[id].mundo] || DESTINOS[id].mundo} · ${trDato(DESTINOS[id], 'nombre')}`)));
    const ejemplo = el('select', { id: 'mc-ejemplo', 'aria-label': tr('Rellenar con un sitio del catálogo', 'Fill in with a catalog site') }, [
      el('option', { value: '' }, conCoordenadas.length ? tr('Rellenar con un sitio del catálogo…', 'Fill in with a catalog site…')
        : tr('Catálogo sin coordenadas aún', 'Catalog has no coordinates yet')),
      ...conCoordenadas.map((s) => el('option', { value: s.id }, trDato(s, 'nombre'))),
    ]);
    ejemplo.disabled = !conCoordenadas.length;
    ejemplo.addEventListener('change', () => {
      const s = conCoordenadas.find((x) => x.id === ejemplo.value);
      if (!s) return;
      const h = aHemisferio(s.lat, s.lon);
      this.lat.value = String(h.lat); this.latHem.value = h.latHem;
      this.lon.value = String(h.lon); this.lonHem.value = h.lonHem;
    });
    this.botonConsultar = el('button', { type: 'submit', class: 'primario' }, this.conApi
      ? tr('Calcular similitud', 'Compute similarity') : tr('Buscar en el catálogo', 'Search the catalog'));
    this.error = el('p', { class: 'error', role: 'alert' });
    this.estado = el('p', { class: 'estado', 'aria-live': 'polite' });
    this.resultado = el('section', { 'aria-live': 'polite' });

    const form = el('form', { novalidate: true }, [
      el('div', { class: 'fila' }, [
        el('div', { class: 'par' }, [el('label', { for: 'mc-lat' }, [tr('Latitud (°)', 'Latitude (°)'), this.lat]), this.latHem]),
        el('div', { class: 'par' }, [el('label', { for: 'mc-lon' }, [tr('Longitud (°)', 'Longitude (°)'), this.lon]), this.lonHem]),
        el('label', { for: 'mc-destino' }, [tr('Comparar con', 'Compare with'), this.destino]),
      ]),
      el('div', { class: 'fila' }, [ejemplo, this.botonConsultar]),
      this.error,
    ]);
    form.addEventListener('submit', (ev) => { ev.preventDefault(); this.consultar(); });

    const ayuda = this.conApi ? el('p', { class: 'ayuda' }, tr('Escribe una coordenada de la Tierra en grados decimales, sin signo, y elige N/S y E/O. La API del modelo descarga sus variables '
        + '(NASA POWER, MODIS, relieve) y las compara con el destino. Si la similitud llega a '
        + `${Math.round(UMBRAL_PROPUESTA * 100)} %, puedes proponer el sitio.`,
      'Type an Earth coordinate in decimal degrees, without a sign, and pick N/S and E/W. The model API downloads its variables '
        + '(NASA POWER, MODIS, terrain) and compares them with the destination. If similarity reaches '
        + `${Math.round(UMBRAL_PROPUESTA * 100)} %, you can propose the site.`))
      : el('p', { class: 'ayuda' }, tr('Escribe una coordenada de la Tierra en grados decimales, sin signo, y elige N/S y E/O. '
        + `Si hay un sitio del catálogo a ${RADIO_CATALOGO_KM} km o menos, verás su ficha; si no, los 3 más cercanos.`,
      'Type an Earth coordinate in decimal degrees, without a sign, and pick N/S and E/W. '
        + `If a catalog site is within ${RADIO_CATALOGO_KM} km, you will see its card; if not, the 3 nearest ones.`));
    // Tras consultar, el formulario se colapsa en una barra corta ("Cambiar coordenada" lo vuelve a abrir) para que la
    // ficha se vea sin desplazarse a 960 × 540 y en el teléfono.
    this.panelFormulario = el('div', { class: 'panel-formulario' }, [ayuda, form]);
    // La barra va en la misma línea del título (entre "Explorador libre" y "← Menú") para no gastar una línea entera.
    this.barraConsulta = el('div', { class: 'barra-consulta', hidden: true });
    this.header.insertBefore(this.barraConsulta, this.header.lastChild);
    this.capa.append(this.panelFormulario, this.estado, this.resultado);
    this.lat.focus();
  }

  /** Oculta el formulario y deja una barra con el punto consultado y un botón para volver a abrirlo. */
  colapsarFormulario(punto) {
    if (!this.panelFormulario) return;
    const destino = DESTINOS[punto.destino];
    const cambiar = el('button', { type: 'button', class: 'secundario' }, tr('Cambiar coordenada', 'Change coordinate'));
    cambiar.addEventListener('click', () => this.expandirFormulario());
    this.barraConsulta.replaceChildren(
      el('span', {}, [formatoCoordenada(punto.lat, punto.lon),
        destino ? ` · ${MUNDOS[destino.mundo] || destino.mundo}` : '',
        this.conApi ? '' : ` · ${tr('sin API', 'no API')}`]),
      cambiar,
    );
    this.panelFormulario.hidden = true;
    if (this.avisoModo) this.avisoModo.hidden = true;
    this.barraConsulta.hidden = false;
    this.capa.scrollTop = 0;
  }

  expandirFormulario() {
    this.panelFormulario.hidden = false;
    if (this.avisoModo) this.avisoModo.hidden = false;
    this.barraConsulta.hidden = true;
    this.lat.focus();
  }

  /** Tras mostrar un resultado, el foco va a su título (o a "Cambiar coordenada"): el botón de consultar quedó oculto. */
  enfocarResultado() {
    const destino = this.resultado.querySelector('h2, h3, strong') || this.barraConsulta.querySelector('button');
    if (destino && !destino.hasAttribute('tabindex') && !/^(BUTTON|A|INPUT|SELECT)$/.test(destino.tagName)) destino.setAttribute('tabindex', '-1');
    destino?.focus({ preventScroll: true });
    this.capa.scrollTop = 0;
  }

  // El Explorador es un diálogo modal: Tab y Shift+Tab dan la vuelta dentro de él en vez de salir a la página.
  mantenerFoco(ev) {
    const enfocables = [...this.capa.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((e) => !e.disabled && e.offsetParent !== null);
    if (!enfocables.length) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    const actual = document.activeElement;
    const fuera = !this.capa.contains(actual);
    if (ev.shiftKey && (actual === primero || fuera)) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && (actual === ultimo || fuera)) { ev.preventDefault(); primero.focus(); }
  }

  async consultar() {
    this.error.textContent = '';
    const v = validarCoordenadasHemisferio({ lat: this.lat.value, latHem: this.latHem.value, lon: this.lon.value, lonHem: this.lonHem.value });
    if (!v.ok) {
      // El resultado anterior ya no corresponde a lo que está escrito en el formulario: no se deja debajo del error.
      this.error.textContent = v.error;
      this.estado.textContent = '';
      this.resultado.replaceChildren();
      return;
    }
    const destino = this.destino.value;
    this.consulta?.abort();
    this.consulta = new AbortController();
    this.resultado.replaceChildren();
    if (!this.conApi) { this.consultarSinApi({ ...v, destino }, destino); return; }
    this.botonConsultar.disabled = true;
    const inicio = Date.now();
    const pintarEspera = () => {
      const s = Math.round((Date.now() - inicio) / 1000);
      this.estado.textContent = tr(`Consultando la API del modelo… ${s} s (NASA POWER puede tardar hasta un minuto)`,
        `Querying the model API… ${s} s (NASA POWER can take up to a minute)`);
    };
    pintarEspera();
    const reloj = setInterval(pintarEspera, 1000);
    const r = await consultarPunto({ lat: v.lat, lon: v.lon, destino }, { senal: this.consulta.signal });
    clearInterval(reloj);
    if (!this.capa) return; // la escena se cerró mientras esperaba
    this.botonConsultar.disabled = false;
    if (!r.ok) { this.mostrarFallo(r, { ...v, destino }); return; }
    this.estado.textContent = '';
    this.mostrarResultado(r.datos, { ...v, destino });
  }

  mostrarFallo(r, punto) {
    if (r.tipo === 'cancelado') { this.estado.textContent = ''; return; }
    const sinApi = r.tipo === 'red' || r.tipo === 'espera';
    this.estado.textContent = '';
    const aviso = el('div', { class: 'aviso' }, [
      el('strong', {}, sinApi ? tr('La API del modelo no responde.', 'The model API is not responding.')
        : tr('La API rechazó la consulta.', 'The API rejected the request.')),
      el('p', {}, `${r.mensaje}${sinApi ? ` (${API_URL})` : ''}`),
      el('p', {}, sinApi
        ? tr('El juego sigue funcionando con los datos guardados: vuelve al menú y juega con los sitios del catálogo.',
          'The game keeps working with the saved data: go back to the menu and play with the catalog sites.')
        : tr('Revisa la coordenada y vuelve a intentarlo.', 'Check the coordinate and try again.')),
    ]);
    // La API se cayó a media consulta: se responde con el catálogo precalculado en vez de dejar al jugador sin nada,
    // y las siguientes consultas ya no esperan a la API.
    if (sinApi && punto) {
      this.conApi = false;
      this.botonConsultar.textContent = tr('Buscar en el catálogo', 'Search the catalog');
      this.consultarSinApi(punto, punto.destino, { aviso });
    } else this.resultado.replaceChildren(aviso);
  }

  // ---------- Sin API: catálogo precalculado + clima de NASA POWER ----------

  consultarSinApi(punto, destinoId, { aviso = null } = {}) {
    this.estado.textContent = '';
    const cat = buscarEnCatalogo(TODOS_LOS_SITIOS, punto, { radioKm: RADIO_CATALOGO_KM });
    const etiqueta = el('p', { class: 'etiqueta' }, tr('Resultado precalculado del catálogo (sin consulta en vivo)', 'Precomputed catalog result (no live lookup)'));
    const nodos = [aviso, etiqueta];
    let clima = null;
    if (cat.encontrado) nodos.push(this.fichaCatalogo(cat.encontrado, destinoId));
    else {
      // Dos columnas: cercanos y propuesta a la izquierda, clima en vivo a la derecha.
      clima = el('section', { class: 'clima', 'aria-live': 'polite' });
      nodos.push(el('div', { class: 'dos-col mitades' }, [el('div', {}, [this.fueraDelCatalogo(cat, punto), this.propuestaSinApi()]), clima]));
    }
    this.resultado.replaceChildren(...nodos.filter(Boolean));
    this.colapsarFormulario(punto);
    this.enfocarResultado();
    if (clima) this.pedirClima(punto, destinoId, clima, this.consulta);
  }

  fichaCatalogo({ sitio: s, distanciaKm: km }, destinoElegido) {
    const gemelo = DESTINOS[s.destino_ref] || null;
    const nombreGemelo = gemelo ? `${MUNDOS[gemelo.mundo] || gemelo.mundo} · ${trDato(gemelo, 'nombre')}` : (s.destino_ref || sinDato());
    const est = (esMina(s) && ESTADOS.mina) || ESTADOS[s.estado] || { texto: s.estado, color: '#9aa4c7' };
    const sim = s.similitud || {};
    const { filas } = gemelo ? filasComparacion(s, gemelo) : { filas: [] };
    const { noReproducible, notas } = limitesDe(s, gemelo);
    const jugable = !!gemelo && SITIOS.includes(s);
    const elegido = DESTINOS[destinoElegido];

    const acciones = el('div', { class: 'fila' });
    if (jugable) {
      const abrir = el('button', { type: 'button', class: 'primario' }, tr('Abrir su Expediente', 'Open its Site File'));
      abrir.addEventListener('click', () => {
        visitarSitio(partida, s, { sitios: SITIOS, destinos: DESTINOS, presupuesto: PRESUPUESTO_INICIAL, tickets: TICKETS_POR_PARTIDA });
        irA(this, 'Expediente');
      });
      acciones.append(abrir);
    }
    const url = urlFicha(s);
    if (url) acciones.append(el('a', { class: 'boton', href: url, target: '_blank', rel: 'noopener' }, tr('Ficha completa ↗', 'Full fact sheet ↗')));

    const izquierda = [
      el('h2', { tabindex: '-1' }, trDato(s, 'nombre') || s.id),
      el('p', {}, [el('span', { style: `color: ${est.color}` }, est.texto),
        ` · ${tr(`a ${formatoDistancia(km)} de tu punto`, `${formatoDistancia(km)} from your point`)} · ${formatoCoordenada(s.lat, s.lon)}`
          + (s.novedoso === true ? tr(' · NOVEDOSO', ' · NOVEL') : '')]),
      esDemostracion(s) ? el('p', { class: 'error' }, tr('ILUSTRATIVO · datos de demostración: no son mediciones del sitio',
        'ILLUSTRATIVE · demo data: not measurements of the site')) : null,
      el('div', { class: 'total' }, [
        el('span', { class: 'grande' }, formatoPorcentaje(sim.total)),
        el('span', {}, tr(` similitud total con su gemelo: ${nombreGemelo} · confianza ${formatoPorcentaje(sim.confianza)}`,
          ` total similarity with its twin: ${nombreGemelo} · confidence ${formatoPorcentaje(sim.confianza)}`)),
      ]),
      // La acción va arriba, junto al puntaje: a 960×540 se ve sin desplazar.
      acciones.childElementCount ? acciones : null,
      elegido && gemelo && elegido.id !== gemelo.id
        ? el('p', { class: 'nota' }, tr(`El modelo calculó este sitio contra su gemelo (${trDato(gemelo, 'nombre')}), no contra ${trDato(elegido, 'nombre')}.`,
          `The model computed this site against its twin (${trDato(gemelo, 'nombre')}), not against ${trDato(elegido, 'nombre')}.`)) : null,
      el('p', {}, [el('strong', {}, tr('Lo que la Tierra no puede probar: ', 'What Earth cannot test: ')),
        noReproducible.length ? noReproducible.map((l) => l.etiqueta).join(' · ') : sinDato()]),
      ...notas.map((n) => el('p', { class: 'nota' }, `${tr('Límite del cálculo', 'Calculation limit')}: ${enIdioma(n)}`)),
      jugable ? null : el('p', { class: 'nota' }, tr('Este sitio aún no es jugable (no tiene recorrido de prueba): es parte del catálogo del modelo.',
        'This site is not playable yet (it has no test route): it is part of the model catalog.')),
    ];
    const derecha = [
      // 3 columnas para que quepa sin desplazarse: la similitud va debajo del nombre de la dimensión.
      el('table', { class: 'compacta' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, tr('Dimensión · similitud', 'Dimension · similarity')),
          el('th', {}, tr('Tierra (sitio)', 'Earth (site)')), el('th', {}, tr('Gemelo', 'Twin'))])),
        el('tbody', {}, filas.length ? filas.map((f) => el('tr', {}, [
          el('th', { scope: 'row' }, [f.etiqueta, el('small', { class: 'sim' },
            f.mismaUnidad ? formatoPorcentaje(f.similitud) : tr('⚠ unidades distintas', '⚠ different units'))]),
          // Fuente corta en la celda (el texto completo queda en el title y en el Expediente del sitio).
          el('td', {}, [formatoValor(f.tierra), el('small', { title: trDato(f.tierra, 'fuente') || '' }, recortar(trDato(f.tierra, 'fuente') || '', 30))]),
          el('td', {}, [f.destino?.texto && f.destino.valor == null ? f.destino.texto : formatoValor(f.destino),
            el('small', { title: trDato(f.destino, 'fuente') || '' }, recortar(trDato(f.destino, 'fuente') || '', 30))]),
        ])) : el('tr', {}, el('td', { colspan: 3 }, sinDato()))),
      ]),
    ];
    return el('article', { class: 'ficha dos-col' }, [el('div', {}, izquierda.filter(Boolean)), el('div', {}, derecha)]);
  }

  fueraDelCatalogo(cat, punto) {
    const lista = el('ul', { class: 'cercanos' }, cat.cercanos.map(({ sitio: s, distanciaKm: km }) => {
      const est = (esMina(s) && ESTADOS.mina) || ESTADOS[s.estado] || { texto: s.estado };
      // Nombre y distancia (el estado va en el title y en la ficha al abrirlo): cabe sin desplazarse.
      const b = el('button', { type: 'button', class: 'secundario', title: est.texto },
        `${recortar(trDato(s, 'nombre') || s.id, 40)} · ${formatoDistancia(km)}`);
      b.addEventListener('click', () => this.consultarSitio(s));
      return el('li', {}, b);
    }));
    return el('div', { class: 'fuera' }, [
      el('strong', {}, tr('Fuera del catálogo precalculado', 'Outside the precomputed catalog')),
      el('p', {}, tr(`Ningún sitio del catálogo está a ${RADIO_CATALOGO_KM} km o menos de ${formatoCoordenada(punto.lat, punto.lon)}. `
        + 'Sin la API, el modelo no puede medir la forma de cráter de un punto nuevo. Los 3 sitios más cercanos (elige uno para ver su ficha):',
      `No catalog site is within ${RADIO_CATALOGO_KM} km of ${formatoCoordenada(punto.lat, punto.lon)}. `
        + 'Without the API, the model cannot measure the crater shape of a new point. The 3 nearest sites (pick one to see its card):')),
      cat.cercanos.length ? lista : el('p', { class: 'nota' }, sinDato()),
    ]);
  }

  // Rellena el formulario con un sitio del catálogo y lo consulta (queda a 0 km: se ve su ficha).
  consultarSitio(s) {
    const h = aHemisferio(s.lat, s.lon);
    this.lat.value = String(h.lat); this.latHem.value = h.latHem;
    this.lon.value = String(h.lon); this.lonHem.value = h.lonHem;
    this.consultar();
    this.resultado.querySelector('h2')?.focus();
  }

  // Clima en vivo directo de NASA POWER (sin la API del modelo). Si falla, la sección se omite con una nota neutra.
  async pedirClima(punto, destinoId, caja, consulta) {
    caja.replaceChildren(el('p', { class: 'estado' }, tr('Consultando el clima de este punto en NASA POWER…', 'Querying this point\'s climate in NASA POWER…')));
    const r = await climaPower(punto, { senal: consulta?.signal });
    if (!this.capa || consulta !== this.consulta || !caja.isConnected) return; // otra consulta o la escena se cerró
    const destino = DESTINOS[destinoId];
    if (!r.ok || !destino) {
      caja.replaceChildren(el('p', { class: 'nota' }, tr('Clima en vivo no disponible ahora (NASA POWER no respondió): se omite.',
        'Live climate not available right now (NASA POWER did not answer): skipped.')));
      return;
    }
    const filas = similitudClima(r.clima, destino.variables);
    const recortes = filas.filter((f) => f.recorte).map((f) => {
      const u = unidadVisible(f.destino.unidad);
      return tr(`${etiquetaVariable(f.clave)}: el destino (${formatoNumero(f.recorte.destino)} ${u}) está fuera de lo que alcanza la Tierra; se compara contra ${formatoNumero(f.recorte.extremo)} ${u}.`,
        `${etiquetaVariable(f.clave)}: the destination (${formatoNumero(f.recorte.destino)} ${u}) is beyond what Earth reaches; compared against ${formatoNumero(f.recorte.extremo)} ${u}.`);
    });
    const escalas = Object.entries(DIMENSIONES_CLIMA)
      .map(([k, c]) => `${etiquetaVariable(k)} ${c.escala} ${unidadVisible(filas.find((f) => f.clave === k)?.tierra?.unidad || '')}`.trim()).join(', ');
    caja.replaceChildren(
      el('h3', {}, tr('Similitud parcial (solo clima, sin forma del cráter)', 'Partial similarity (climate only, no crater shape)')),
      el('p', { class: 'ayuda' }, tr(`Clima en vivo de este punto (NASA POWER, climatología anual) contra ${trDato(destino, 'nombre')}. `
        + `s = exp(−|Tierra − destino| / escala); escalas del modelo (P): ${escalas}.`,
      `Live climate of this point (NASA POWER, annual climatology) against ${trDato(destino, 'nombre')}. `
        + `s = exp(−|Earth − destination| / scale); model scales (P): ${escalas}.`)),
      // 3 columnas (como la ficha del catálogo): la similitud va debajo del nombre de la dimensión.
      el('table', { class: 'compacta' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, tr('Dimensión · similitud', 'Dimension · similarity')),
          el('th', {}, tr('Este punto', 'This point')), el('th', {}, tr('Destino', 'Destination'))])),
        el('tbody', {}, filas.map((f) => {
          const fuenteT = `${enIdioma(f.tierra?.fuente) || ''}${f.tierra?.fecha ? ` · ${f.tierra.fecha}` : ''}`;
          return el('tr', {}, [
            el('th', { scope: 'row' }, [etiquetaVariable(f.clave), el('small', { class: 'sim' }, formatoPorcentaje(f.similitud))]),
            el('td', {}, [formatoValor(f.tierra), el('small', { title: fuenteT }, recortar(fuenteT, 30))]),
            el('td', {}, [formatoValor(f.destino), el('small', { title: trDato(f.destino, 'fuente') || '' }, recortar(trDato(f.destino, 'fuente') || '', 30))]),
          ]);
        })),
      ]),
      ...recortes.map((t) => el('p', { class: 'nota' }, t)),
      el('p', { class: 'nota' }, tr('Sin la forma del cráter (la dimensión principal) no hay similitud total. Tampoco se revisan vegetación (MODIS) '
        + 'ni relieve: eso lo calcula la API del modelo. Un clima parecido, por sí solo, no hace análogo a un punto.',
      'Without crater shape (the main dimension) there is no total similarity. Vegetation (MODIS) and terrain are not checked either: '
        + 'the model API computes those. A similar climate alone does not make a point an analog.')),
    );
  }

  // Sin API no se puede guardar una propuesta: el botón se ve, deshabilitado, con la razón.
  propuestaSinApi() {
    const boton = el('button', { type: 'button', class: 'primario', disabled: true, 'aria-describedby': 'mc-propuesta-nota' }, tr('Proponer sitio', 'Propose site'));
    // Una sola fila (botón deshabilitado + motivo) para que quepa junto a los sitios cercanos sin desplazarse.
    return el('div', { class: 'propuesta compacta' }, [
      el('div', { class: 'fila' }, [boton,
        el('p', { id: 'mc-propuesta-nota', class: 'nota' }, tr('Necesita la API del modelo (similitud total con la forma del cráter), '
          + 'que no está publicada en esta demo.',
        'It needs the model API (total similarity with crater shape), which is not published in this demo.'))]),
    ]);
  }

  mostrarResultado(d, punto) {
    const destino = DESTINOS[punto.destino];
    const sim = d?.similitud || {};
    const vars = d?.variables || {};
    const porDim = sim.por_dimension || {};
    const filas = Object.keys(porDim).map((k) => {
      const t = vars[k] && typeof vars[k] === 'object' ? vars[k] : { valor: vars[k] ?? null };
      const ds = destino?.variables?.[k];
      return el('tr', {}, [
        el('th', { scope: 'row' }, etiquetaVariable(k)),
        el('td', {}, [formatoValor(t), el('small', {}, enIdioma(t.fuente) || (t.valor == null ? tr('no disponible para este punto', 'not available for this point') : ''))]),
        el('td', {}, [ds ? formatoValor(ds) : sinDato(), el('small', {}, trDato(ds, 'fuente') || '')]),
        el('td', { class: 'num' }, formatoPorcentaje(porDim[k])),
      ]);
    });
    const limites = (d?.no_reproducible_en_tierra || []).map(etiquetaLimite);
    const notas = [...(sim.limites_calculo || []).map(enIdioma),
      ...(d?.errores || []).map((e) => `${tr('Error al obtener datos', 'Error fetching data')}: ${typeof e === 'string' ? e : JSON.stringify(e)}`)];
    const total = sim.total;

    this.ultimo = { datos: d, punto };
    const izquierda = el('div', {}, [
      el('div', { class: 'total' }, [
        el('span', { class: 'grande' }, formatoPorcentaje(total)),
        el('span', {}, tr(` similitud total con ${destino ? trDato(destino, 'nombre') : punto.destino} · confianza ${formatoPorcentaje(sim.confianza)}`,
          ` total similarity with ${destino ? trDato(destino, 'nombre') : punto.destino} · confidence ${formatoPorcentaje(sim.confianza)}`)
          + (sim.vetado ? tr(' · VETADO por vegetación', ' · VETOED by vegetation') : '')),
      ]),
      el('p', { class: 'ayuda' }, tr(`Punto ${formatoCoordenada(punto.lat, punto.lon)} · método: ${d?.metodo || sinDato()}. `
        + 'La forma de cráter solo existe para depresiones medidas por el detector; en un punto cualquiera falta y baja la confianza.',
      `Point ${formatoCoordenada(punto.lat, punto.lon)} · method: ${d?.metodo || sinDato()}. `
        + 'Crater shape only exists for depressions measured by the detector; at an arbitrary point it is missing and confidence drops.')),
      el('p', {}, [el('strong', {}, tr('Lo que la Tierra no puede probar: ', 'What Earth cannot test: ')), limites.length ? limites.join(' · ') : sinDato()]),
      ...notas.map((n) => el('p', { class: 'nota' }, n)),
      this.bloquePropuesta(d, punto),
    ]);
    const derecha = el('div', {}, el('table', { class: 'compacta' }, [
      el('thead', {}, el('tr', {}, [el('th', {}, tr('Dimensión', 'Dimension')), el('th', {}, tr('Tierra (este punto)', 'Earth (this point)')),
        el('th', {}, tr('Destino', 'Destination')), el('th', {}, tr('Similitud', 'Similarity'))])),
      el('tbody', {}, filas.length ? filas : el('tr', {}, el('td', { colspan: 4 }, tr('La API no devolvió dimensiones.', 'The API returned no dimensions.')))),
    ]));
    this.resultado.replaceChildren(el('article', { class: 'dos-col' }, [izquierda, derecha]));
    this.colapsarFormulario(punto);
    this.enfocarResultado();
  }

  // "Proponer sitio" solo aparece si la API lo permite Y la similitud total alcanza el umbral (P: UMBRAL_PROPUESTA, en expediente/config.js).
  bloquePropuesta(d, punto) {
    const total = d?.similitud?.total;
    if (!puedeProponer(d, UMBRAL_PROPUESTA)) {
      return el('p', { class: 'nota propuesta' }, tr(`Para proponer el sitio la similitud total debe llegar a ${Math.round(UMBRAL_PROPUESTA * 100)} % `
        + `(este punto: ${formatoPorcentaje(total)}).`,
      `To propose the site, total similarity must reach ${Math.round(UMBRAL_PROPUESTA * 100)} % (this point: ${formatoPorcentaje(total)}).`));
    }
    const nombre = el('input', { id: 'mc-nombre', type: 'text', maxlength: 80, autocomplete: 'off', placeholder: tr('ej. Cráter sin nombre al sur de…', 'e.g. Unnamed crater south of…') });
    const autor = el('input', { id: 'mc-autor', type: 'text', maxlength: 60, autocomplete: 'off', placeholder: tr('opcional', 'optional') });
    const enviar = el('button', { type: 'submit', class: 'primario' }, tr('Proponer sitio', 'Propose site'));
    const error = el('p', { class: 'error', role: 'alert' });
    const salida = el('div', { 'aria-live': 'polite' });
    const form = el('form', { class: 'propuesta', novalidate: true }, [
      el('strong', {}, tr('Proponer este sitio', 'Propose this site')),
      el('p', { class: 'ayuda' }, tr('Se guarda como "propuesto por usuario", pendiente de revisión del equipo. '
        + 'No es un análogo confirmado. El alias es opcional y se guarda con la propuesta: no pongas datos personales.',
      'It is saved as "user proposed", pending review by the team. '
        + 'It is not a confirmed analog. The alias is optional and is saved with the proposal: do not enter personal data.')),
      el('div', { class: 'fila' }, [
        el('label', { for: 'mc-nombre' }, [tr('Nombre del sitio', 'Site name'), nombre]),
        el('label', { for: 'mc-autor' }, [tr('Tu alias', 'Your alias'), autor]),
        enviar,
      ]),
      error, salida,
    ]);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      error.textContent = '';
      const v = validarNombrePropuesta(nombre.value);
      if (!v.ok) { error.textContent = v.error; nombre.focus(); return; }
      enviar.disabled = true;
      salida.replaceChildren(el('p', { class: 'estado' }, tr('Enviando propuesta… la API vuelve a calcular la similitud (puede tardar un minuto).',
        'Sending proposal… the API recomputes the similarity (it can take a minute).')));
      const r = await proponerSitio({ ...punto, nombre: v.nombre, autor: autor.value.trim() || null }, { senal: this.consulta?.signal });
      if (!this.capa) return;
      if (r.ok) {
        nombre.disabled = true; autor.disabled = true;
        salida.replaceChildren(el('div', { class: 'ok' }, [
          el('strong', {}, tr('¡Propuesta enviada!', 'Proposal sent!')),
          el('p', {}, tr(`"${v.nombre}" quedó como ${r.datos?.estado || 'propuesto_usuario'} con similitud `
            + `${formatoPorcentaje(r.datos?.similitud?.total)}. Si el equipo la aprueba, se vuelve jugable.`,
          `"${v.nombre}" was saved as ${r.datos?.estado || 'propuesto_usuario'} with similarity `
            + `${formatoPorcentaje(r.datos?.similitud?.total)}. If the team approves it, it becomes playable.`)),
        ]));
        return;
      }
      enviar.disabled = false;
      const sinApi = r.tipo === 'red' || r.tipo === 'espera';
      salida.replaceChildren(el('div', { class: 'aviso' }, [
        el('strong', {}, sinApi ? tr('La API no responde: la propuesta no se guardó.', 'The API is not responding: the proposal was not saved.')
          : tr('La API no aceptó la propuesta.', 'The API did not accept the proposal.')),
        el('p', {}, r.mensaje),
      ]));
    });
    return form;
  }
}
