import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { ORDEN_DESTINOS, DESTINO_POR_DEFECTO, UMBRAL_PROPUESTA } from './expediente/config.js';
import { consultarPunto, proponerSitio, apiDisponible, API_URL } from './expediente/api.js';
import { validarCoordenadasHemisferio, aHemisferio, formatoCoordenada, formatoValor, formatoPorcentaje, puedeProponer, validarNombrePropuesta, sinDato } from './expediente/logica.js';
import { MUNDOS, etiquetaVariable, etiquetaLimite } from './expediente/textos.js';
import { crearCapa, el, ESTILOS } from './expediente/capa.js';
import { prepararIngles, enIdioma } from './expediente/datos_en.js';
import { tr, trDato, idioma } from '../i18n.js';

// Dueño: frente expediente. Explorador libre (AGENTS.md §6.4, punto 3):
// coordenada → POST /score (similitud en vivo) → si supera el umbral, proponer el sitio (POST /submit).
// El formulario es HTML sobre el lienzo (accesible con teclado y lector de pantalla). Sin API, el juego sigue funcionando.
export default class Explorador extends Phaser.Scene {
  constructor() { super('Explorador'); }

  create() {
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
    return el('header', {}, [el('h1', {}, tr('Explorador libre', 'Free explorer')), volver]);
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
    if (r.ok) this.armarFormulario();
    else this.mostrarSinApi(r);
  }

  mostrarSinApi(r) {
    const ir = el('button', { type: 'button', class: 'primario' }, tr('Volver al menú', 'Back to menu'));
    ir.addEventListener('click', () => this.volver());
    this.capa.append(el('div', { class: 'aviso', role: 'alert' }, [
      el('strong', {}, tr('Consulta en vivo no disponible', 'Live lookup not available')),
      el('p', {}, tr('La consulta en vivo necesita la API del modelo, que no está publicada en esta demo. Mira los sitios ya calculados en el Expediente.',
        'The live lookup needs the model API, which is not published in this demo. See the sites already computed in the Site File.')),
      r.tipo === 'no_publicada' ? null : el('p', { class: 'nota' }, tr(`(${API_URL} no respondió a /health en 4 s)`, `(${API_URL} did not answer /health within 4 s)`)),
      ir,
    ]));
    ir.focus();
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
    this.botonConsultar = el('button', { type: 'submit', class: 'primario' }, tr('Calcular similitud', 'Compute similarity'));
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

    this.capa.append(
      el('p', { class: 'ayuda' }, tr('Escribe una coordenada de la Tierra en grados decimales, sin signo, y elige N/S y E/O. La API del modelo descarga sus variables '
        + '(NASA POWER, MODIS, relieve) y las compara con el destino. Si la similitud llega a '
        + `${Math.round(UMBRAL_PROPUESTA * 100)} %, puedes proponer el sitio.`,
      'Type an Earth coordinate in decimal degrees, without a sign, and pick N/S and E/W. The model API downloads its variables '
        + '(NASA POWER, MODIS, terrain) and compares them with the destination. If similarity reaches '
        + `${Math.round(UMBRAL_PROPUESTA * 100)} %, you can propose the site.`)),
      form, this.estado, this.resultado,
    );
    this.lat.focus();
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
    if (!v.ok) { this.error.textContent = v.error; return; }
    const destino = this.destino.value;
    this.consulta?.abort();
    this.consulta = new AbortController();
    this.resultado.replaceChildren();
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
    if (!r.ok) { this.mostrarFallo(r); return; }
    this.estado.textContent = '';
    this.mostrarResultado(r.datos, { ...v, destino });
  }

  mostrarFallo(r) {
    if (r.tipo === 'cancelado') { this.estado.textContent = ''; return; }
    const sinApi = r.tipo === 'red' || r.tipo === 'espera';
    this.estado.textContent = '';
    this.resultado.replaceChildren(el('div', { class: 'aviso' }, [
      el('strong', {}, sinApi ? tr('La API del modelo no responde.', 'The model API is not responding.')
        : tr('La API rechazó la consulta.', 'The API rejected the request.')),
      el('p', {}, `${r.mensaje}${sinApi ? ` (${API_URL})` : ''}`),
      el('p', {}, sinApi
        ? tr('El juego sigue funcionando con los datos guardados: vuelve al menú y juega con los sitios del catálogo.',
          'The game keeps working with the saved data: go back to the menu and play with the catalog sites.')
        : tr('Revisa la coordenada y vuelve a intentarlo.', 'Check the coordinate and try again.')),
    ]));
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
    this.resultado.replaceChildren(
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
      el('table', {}, [
        el('thead', {}, el('tr', {}, [el('th', {}, tr('Dimensión', 'Dimension')), el('th', {}, tr('Tierra (este punto)', 'Earth (this point)')),
          el('th', {}, tr('Destino', 'Destination')), el('th', {}, tr('Similitud', 'Similarity'))])),
        el('tbody', {}, filas.length ? filas : el('tr', {}, el('td', { colspan: 4 }, tr('La API no devolvió dimensiones.', 'The API returned no dimensions.')))),
      ]),
      el('p', {}, [el('strong', {}, tr('Lo que la Tierra no puede probar: ', 'What Earth cannot test: ')), limites.length ? limites.join(' · ') : sinDato()]),
      ...notas.map((n) => el('p', { class: 'nota' }, n)),
      this.bloquePropuesta(d, punto),
    );
  }

  // "Proponer sitio" solo aparece si la API lo permite Y la similitud total alcanza el umbral (P: 0.6).
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
