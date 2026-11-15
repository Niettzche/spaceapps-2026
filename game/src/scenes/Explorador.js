import Phaser from 'phaser';
import { irA } from './ui.js';
import { SITIOS, DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { ORDEN_DESTINOS, DESTINO_POR_DEFECTO, UMBRAL_PROPUESTA } from './expediente/config.js';
import { consultarPunto, proponerSitio, API_URL } from './expediente/api.js';
import { validarCoordenadasHemisferio, aHemisferio, formatoCoordenada, formatoValor, formatoPorcentaje, puedeProponer, validarNombrePropuesta, SIN_DATO } from './expediente/logica.js';
import { MUNDOS, etiquetaVariable, etiquetaLimite } from './expediente/textos.js';
import { crearCapa, el, ESTILOS } from './expediente/capa.js';

// Dueño: frente expediente. Explorador libre (AGENTS.md §6.4, punto 3):
// coordenada → POST /score (similitud en vivo) → si supera el umbral, proponer el sitio (POST /submit).
// El formulario es HTML sobre el lienzo (accesible con teclado y lector de pantalla). Sin API, el juego sigue funcionando.
export default class Explorador extends Phaser.Scene {
  constructor() { super('Explorador'); }

  create() {
    this.consulta = null;
    this.capa = crearCapa('mc-explorador', ESTILOS);
    this.events.once('shutdown', () => this.cerrar());
    this.armarFormulario();
  }

  cerrar() {
    this.consulta?.abort();
    this.capa?.remove();
    this.capa = null;
  }

  volver() { irA(this, 'Menu'); }

  armarFormulario() {
    const ids = [...ORDEN_DESTINOS.filter((id) => DESTINOS[id]), ...Object.keys(DESTINOS).filter((id) => !ORDEN_DESTINOS.includes(id))];
    const inicial = DESTINOS[partida.destino] ? partida.destino : DESTINO_POR_DEFECTO;
    const conCoordenadas = SITIOS.filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');

    // Solo grados sin signo (el teclado decimal del teléfono basta) + hemisferio en una lista: no se depende del "−".
    this.lat = el('input', { id: 'mc-lat', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'ej. 31.84', required: true });
    this.lon = el('input', { id: 'mc-lon', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'ej. 113.39', required: true });
    this.latHem = el('select', { id: 'mc-lat-hem', 'aria-label': 'Hemisferio de la latitud' }, [
      el('option', { value: 'N', selected: true }, 'N (norte)'), el('option', { value: 'S' }, 'S (sur)')]);
    this.lonHem = el('select', { id: 'mc-lon-hem', 'aria-label': 'Hemisferio de la longitud' }, [
      el('option', { value: 'E' }, 'E (este)'), el('option', { value: 'O', selected: true }, 'O (oeste)')]);
    this.destino = el('select', { id: 'mc-destino' }, ids.map((id) => el('option', { value: id, selected: id === inicial },
      `${MUNDOS[DESTINOS[id].mundo] || DESTINOS[id].mundo} · ${DESTINOS[id].nombre}`)));
    const ejemplo = el('select', { id: 'mc-ejemplo', 'aria-label': 'Rellenar con un sitio del catálogo' }, [
      el('option', { value: '' }, conCoordenadas.length ? 'Rellenar con un sitio del catálogo…' : 'Catálogo sin coordenadas aún'),
      ...conCoordenadas.map((s) => el('option', { value: s.id }, s.nombre)),
    ]);
    ejemplo.disabled = !conCoordenadas.length;
    ejemplo.addEventListener('change', () => {
      const s = conCoordenadas.find((x) => x.id === ejemplo.value);
      if (!s) return;
      const h = aHemisferio(s.lat, s.lon);
      this.lat.value = String(h.lat); this.latHem.value = h.latHem;
      this.lon.value = String(h.lon); this.lonHem.value = h.lonHem;
    });
    this.botonConsultar = el('button', { type: 'submit', class: 'primario' }, 'Calcular similitud');
    this.error = el('p', { class: 'error', role: 'alert' });
    this.estado = el('p', { class: 'estado', 'aria-live': 'polite' });
    this.resultado = el('section', { 'aria-live': 'polite' });

    const form = el('form', { novalidate: true }, [
      el('div', { class: 'fila' }, [
        el('div', { class: 'par' }, [el('label', { for: 'mc-lat' }, ['Latitud (°)', this.lat]), this.latHem]),
        el('div', { class: 'par' }, [el('label', { for: 'mc-lon' }, ['Longitud (°)', this.lon]), this.lonHem]),
        el('label', { for: 'mc-destino' }, ['Comparar con', this.destino]),
      ]),
      el('div', { class: 'fila' }, [ejemplo, this.botonConsultar]),
      this.error,
    ]);
    form.addEventListener('submit', (ev) => { ev.preventDefault(); this.consultar(); });

    const volver = el('button', { type: 'button', class: 'secundario' }, '← Menú');
    volver.addEventListener('click', () => this.volver());
    this.capa.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') this.volver();
      else if (ev.key === 'Tab') this.mantenerFoco(ev);
    });

    this.capa.append(
      el('header', {}, [
        el('h1', {}, 'Explorador libre'),
        volver,
      ]),
      el('p', { class: 'ayuda' }, 'Escribe una coordenada de la Tierra en grados decimales, sin signo, y elige N/S y E/O. La API del modelo descarga sus variables '
        + '(NASA POWER, MODIS, relieve) y las compara con el destino. Si la similitud llega a '
        + `${Math.round(UMBRAL_PROPUESTA * 100)} %, puedes proponer el sitio.`),
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
      this.estado.textContent = `Consultando la API del modelo… ${s} s (NASA POWER puede tardar hasta un minuto)`;
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
      el('strong', {}, sinApi ? 'La API del modelo no responde.' : 'La API rechazó la consulta.'),
      el('p', {}, `${r.mensaje}${sinApi ? ` (${API_URL})` : ''}`),
      el('p', {}, sinApi
        ? 'El juego sigue funcionando con los datos guardados: vuelve al menú y juega con los sitios del catálogo.'
        : 'Revisa la coordenada y vuelve a intentarlo.'),
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
        el('td', {}, [formatoValor(t), el('small', {}, t.fuente || (t.valor == null ? 'no disponible para este punto' : ''))]),
        el('td', {}, [ds ? formatoValor(ds) : SIN_DATO, el('small', {}, ds?.fuente || '')]),
        el('td', { class: 'num' }, formatoPorcentaje(porDim[k])),
      ]);
    });
    const limites = (d?.no_reproducible_en_tierra || []).map(etiquetaLimite);
    const notas = [...(sim.limites_calculo || []), ...(d?.errores || []).map((e) => `Error al obtener datos: ${typeof e === 'string' ? e : JSON.stringify(e)}`)];
    const total = sim.total;

    this.ultimo = { datos: d, punto };
    this.resultado.replaceChildren(
      el('div', { class: 'total' }, [
        el('span', { class: 'grande' }, formatoPorcentaje(total)),
        el('span', {}, ` similitud total con ${destino ? destino.nombre : punto.destino} · confianza ${formatoPorcentaje(sim.confianza)}`
          + (sim.vetado ? ' · VETADO por vegetación' : '')),
      ]),
      el('p', { class: 'ayuda' }, `Punto ${formatoCoordenada(punto.lat, punto.lon)} · método: ${d?.metodo || SIN_DATO}. `
        + 'La forma de cráter solo existe para depresiones medidas por el detector; en un punto cualquiera falta y baja la confianza.'),
      el('table', {}, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Dimensión'), el('th', {}, 'Tierra (este punto)'), el('th', {}, 'Destino'), el('th', {}, 'Similitud')])),
        el('tbody', {}, filas.length ? filas : el('tr', {}, el('td', { colspan: 4 }, 'La API no devolvió dimensiones.'))),
      ]),
      el('p', {}, [el('strong', {}, 'Lo que la Tierra no puede probar: '), limites.length ? limites.join(' · ') : SIN_DATO]),
      ...notas.map((n) => el('p', { class: 'nota' }, n)),
      this.bloquePropuesta(d, punto),
    );
  }

  // "Proponer sitio" solo aparece si la API lo permite Y la similitud total alcanza el umbral (P: 0.6).
  bloquePropuesta(d, punto) {
    const total = d?.similitud?.total;
    if (!puedeProponer(d, UMBRAL_PROPUESTA)) {
      return el('p', { class: 'nota propuesta' }, `Para proponer el sitio la similitud total debe llegar a ${Math.round(UMBRAL_PROPUESTA * 100)} % `
        + `(este punto: ${formatoPorcentaje(total)}).`);
    }
    const nombre = el('input', { id: 'mc-nombre', type: 'text', maxlength: 80, autocomplete: 'off', placeholder: 'ej. Cráter sin nombre al sur de…' });
    const autor = el('input', { id: 'mc-autor', type: 'text', maxlength: 60, autocomplete: 'off', placeholder: 'opcional' });
    const enviar = el('button', { type: 'submit', class: 'primario' }, 'Proponer sitio');
    const error = el('p', { class: 'error', role: 'alert' });
    const salida = el('div', { 'aria-live': 'polite' });
    const form = el('form', { class: 'propuesta', novalidate: true }, [
      el('strong', {}, 'Proponer este sitio'),
      el('p', { class: 'ayuda' }, 'Se guarda como "propuesto por usuario", pendiente de revisión del equipo. '
        + 'No es un análogo confirmado. El alias es opcional y se guarda con la propuesta: no pongas datos personales.'),
      el('div', { class: 'fila' }, [
        el('label', { for: 'mc-nombre' }, ['Nombre del sitio', nombre]),
        el('label', { for: 'mc-autor' }, ['Tu alias', autor]),
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
      salida.replaceChildren(el('p', { class: 'estado' }, 'Enviando propuesta… la API vuelve a calcular la similitud (puede tardar un minuto).'));
      const r = await proponerSitio({ ...punto, nombre: v.nombre, autor: autor.value.trim() || null }, { senal: this.consulta?.signal });
      if (!this.capa) return;
      if (r.ok) {
        nombre.disabled = true; autor.disabled = true;
        salida.replaceChildren(el('div', { class: 'ok' }, [
          el('strong', {}, '¡Propuesta enviada!'),
          el('p', {}, `"${v.nombre}" quedó como ${r.datos?.estado || 'propuesto_usuario'} con similitud `
            + `${formatoPorcentaje(r.datos?.similitud?.total)}. Si el equipo la aprueba, se vuelve jugable.`),
        ]));
        return;
      }
      enviar.disabled = false;
      const sinApi = r.tipo === 'red' || r.tipo === 'espera';
      salida.replaceChildren(el('div', { class: 'aviso' }, [
        el('strong', {}, sinApi ? 'La API no responde: la propuesta no se guardó.' : 'La API no aceptó la propuesta.'),
        el('p', {}, r.mensaje),
      ]));
    });
    return form;
  }
}
