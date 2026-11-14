"""Valida todos los JSON de data/ y game/src/content contra data/schema/. Lo usa la acción de GitHub."""
import json, sys, pathlib
from jsonschema import Draft202012Validator

ROOT = pathlib.Path(__file__).resolve().parents[1]
S = ROOT / "data" / "schema"
REGLAS = [("data/sites/*.json", "site.schema.json"), ("data/targets/*.json", "target.schema.json"),
          ("game/src/content/parts.json", "part.schema.json")]
errores = 0
for patron, esquema in REGLAS:
    v = Draft202012Validator(json.loads((S / esquema).read_text(encoding="utf-8")))
    for f in sorted(ROOT.glob(patron)):
        for e in v.iter_errors(json.loads(f.read_text(encoding="utf-8"))):
            errores += 1
            print(f"✗ {f.relative_to(ROOT)}: {'/'.join(map(str, e.path))} → {e.message}")
print("✓ Datos válidos" if errores == 0 else f"{errores} error(es)")
sys.exit(1 if errores else 0)
