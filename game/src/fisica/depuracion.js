// Gancho solo para desarrollo (npm run dev): expone escenas y estado en window.__mc para pruebas automáticas.
// En el build de producción import.meta.env.DEV es false y esto no hace nada.
export function exponerParaPruebas(clave, valor) {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    window.__mc = window.__mc ?? {};
    window.__mc[clave] = valor;
  }
}
