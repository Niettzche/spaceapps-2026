# MARSCEPTION submission slides

Exactly seven slides, in English, in the requested order:

1. Earth training and destination limits.
2. MARSCEPTION: analog explorer and rover experiments.
3. Separate checks: 9/11 documented Mexican craters, about 78% spatially grouped balanced accuracy, 296 arid candidates.
4. NASA MODIS, POWER, LRO/LOLA and MOLA, with ESA Copernicus and HRSC identified separately.
5. Four illustrated steps of the golden path.
6. Gravity, atmosphere and radiation/cold limits; physics v2 models Bekker–Wong sinkage and Mohr–Coulomb traction, with reference/simulant parameter limits in the notes.
7. Educational use, open scientific review and next-step pilots.

## Files

- `marsception_slides.pdf`: submission PDF, seven 16:9 pages, visually checked after PDF rendering.
- `marsception_slides.pptx`: editable text and images; sources in speaker notes. Uses Consolas for legible body text and original pixel art for the visual identity. It has not been reviewed in the PowerPoint application.
- `marsception_slides.mjs`: Artifact Tool source. Reads the repository's existing artwork and data images, enlarging pixel art with nearest-neighbor rendering.
- `marsception_slides_pdf.py`: ReportLab export fallback using the reviewed slide PNGs. This runtime lacks Artifact Tool's `#standard-fonts/Helvetica` PDF module. This fallback makes image-based PDF pages; the PPTX is the editable/searchable text source.

## Rebuild in Codex

Use the bundled Node, Python and `@oai/artifact-tool` paths returned by `load_workspace_dependencies`. Set `RUNTIME_NODE_MODULES`, `PRESENTATIONS_SKILL`, `RUNTIME_PYTHON` and `SLIDES_WORKSPACE`. Use a new workspace/output name for each revision: `SLIDES_FINAL_NAME` controls the final PPTX filename. Set `EXPORT_SLIDES_PDF=1` to include PDF export. The builder does not overwrite an existing final PPTX.

The local finalizer passed package, geometry, font and first-party import checks, then Windows rejected its final hard-link operation. The source handles only that specific `EPERM` publication error using an exclusive copy of the same candidate. It does not suppress validation failures. Temporary renders and validation records stay in `work/slides/`, outside the repository.

The PDF copy in `web/public/media/` is identical to the submission PDF. No website publication or Space Apps submission occurs in these scripts.

## Evidence and attribution

- Claims: `docs/GUION_PITCH.md`, `docs/METHODOLOGY_EN.md`, `model/VALIDATION.md`.
- Source portals and papers: the notes of each relevant slide retain URLs.
- Art: Mauricio's `docs/media/proyecto_space_apps.png`, `assets/pantallas/`, `assets/tutorial/` and planet strips in `assets/menu/`. Original code-generated, AI-assisted game art; illustration, not a measured place or completed playtest.
- Real DEM relief: the existing Earth, lunar and Martian renderings in `web/public/data/img/`.
- AI declaration: `docs/USO_IA.md`. Art-bearing slides show the AI assistance declaration; slide 2 retains the embedded watermark.
- pixelfx effects and fonts: MIT License, © 2026 Patch and Hugo Duprez. No NASA logo or endorsement is used.

The user deferred new English gameplay screenshots and published-link checks until the redesign is ready. No screenshots or completed-run claims were invented.
