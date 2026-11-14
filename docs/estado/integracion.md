# Estado — Integración, pitch y entrega

**Responsable:** Alan · **Agente:** Codex · **Rama:** feat/integracion-alan
**Última actualización:** 2026-11-14

## Hecho
- Portada bilingüe de la web: presentación, recorrido de uso y alcance de México frente a la expansión global pendiente.
- Inglés inicial; conserva el quiz, sitios, mapa y metodología existentes.
- Fuentes enlazadas, límites científicos y declaración de asistencia de IA.
- Sección de Misión Cero con URL configurable VITE_GAME_URL; sin URL muestra integración pendiente.
- Enlace para saltar al contenido, diseño adaptable y reintento de carga con estado accesible.
- README de web actualizado con compilación, despliegue estático y conexión del juego.
- npm ci: sin vulnerabilidades reportadas. npm run build y npm run lint completados.

## Siguiente
- Revisión visual en escritorio y móvil: el navegador no pudo conectar al preview local en esta sesión.
- Revisar quiz, mapa, fichas y reintento de datos en navegador.
- Integrar URL real del juego y verificar ambos caminos de la demo con sus responsables.
- Revisar cambios antes de abrir PR; sin merge a main.
- Metodología, tráiler, página oficial y entrega siguen pendientes.

## Bloqueos / necesito de otro frente
- Juego: URL desplegada para activar el acceso a Misión Cero.
- Python no está ejecutable en esta sesión; model/validate_data.py no se pudo ejecutar. No se modificaron datos ni esquemas.
- Lint mantiene dos advertencias previas de dependencias de efectos en MapView.jsx.
- Build avisa de un bundle grande debido al mapa; optimización pendiente.

## Cambios que propongo a contratos o AGENTS.md
- Ninguno. Se respetó la propiedad de web/public/data del frente modelo.
