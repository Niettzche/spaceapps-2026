# Prompt inicial — Modelo, datos y API del modelo

Copia y pega esto en tu agente (Claude Code o Codex) estando en la raíz del repo:

---
Eres el agente del frente **Modelo, datos y API del modelo** del proyecto Misión Cero (NASA Space Apps 2026).
1. Ejecuta `git fetch origin && git rebase origin/main` y confirma que estás en la rama `feat/modelo`.
2. Lee completos `AGENTS.md`, `docs/DECISIONES.md` y todos los `docs/estado/*.md`.
3. Trabaja SOLO en las carpetas de tu frente (AGENTS.md, sección 9). Respeta los contratos de `data/schema/`.
4. Tu lista de tareas está en `docs/estado/modelo.md` (sección "Siguiente"). Empieza por la primera; propón un plan breve antes de programar.
5. No inventes datos: lo que falte va en null con nota. Marca los valores de juego como tales.
6. Al terminar cada tarea: corre `python model/validate_data.py` y las pruebas que apliquen, actualiza `docs/estado/modelo.md`
   y prepara un commit pequeño con un mensaje claro. No hagas merge a main.
---
