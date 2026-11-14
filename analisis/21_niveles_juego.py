# 21 · Niveles del juego: perfil de elevación real + superficie por tramo (arena / roca / compacto) con reglas declaradas
# Tierra: Copernicus GLO-30 a 30 m + arena del suelo (OpenLandMap, 250 m) + rugosidad del relieve. Luna: LOLA 80 m. Marte: HRSC+MOLA 200 m.
# La superficie NO es una medición directa: es una clasificación por reglas a partir de datos medidos (se declara la regla en cada tramo).
# Requiere las celdas 00–19 (usa to_xy, ee_pixels, src/half/MAPSC/crs_moon de la Luna, dem_marte, perfiles_v y c).
glo30 = ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").select("DEM").mosaic().setDefaultProjection(
    ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").first().projection()).toFloat()
try:
    arena_img = ee.Image("OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02").select("b0").rename("arena")
    arena_img.bandNames().getInfo(); ARENA_OK = True
except Exception as e:
    ARENA_OK = False; print("OpenLandMap no disponible:", str(e)[:100])

# Orden de la regla: primero arena (las dunas son irregulares a 30 m y si no se confundirían con roca), luego roca, luego compacto.
REGLA_T = "arena si arena del suelo ≥ 65 %; si no, roca si rugosidad local (desv. est. en 90 m) > 2 m o pendiente > 15°; si no, compacto"
REGLA_LM = "roca si pendiente > 20°; si no, arena (regolito o polvo suelto). Aproximación para el juego: no hay mapa de tipo de suelo a esta escala"

def tramos(tipos, paso, min_m=150):
    """Junta puntos consecutivos del mismo tipo; los tramos más cortos que min_m se absorben en el vecino anterior."""
    t = []
    for k, ti in enumerate(tipos):
        if t and t[-1]["tipo"] == ti: t[-1]["hasta_m"] = round((k + 1) * paso, 1)
        else: t.append({"desde_m": round(k * paso, 1), "hasta_m": round((k + 1) * paso, 1), "tipo": ti})
    out = []
    for tr in t:
        if out and (tr["hasta_m"] - tr["desde_m"] < min_m):
            out[-1]["hasta_m"] = tr["hasta_m"]
        elif out and out[-1]["tipo"] == tr["tipo"]:
            out[-1]["hasta_m"] = tr["hasta_m"]
        else: out.append(tr)
    fin = round((len(tipos) - 1) * paso, 1)          # el último tramo termina en el último punto del perfil
    for tr in out: tr["hasta_m"] = min(tr["hasta_m"], fin)
    return out

def nivel_tierra(nombre, lat, lon, largo_m, fuente_coord):
    paso = 30.0; n = int(largo_m / paso) + 1
    x, y = to_xy.transform(lon, lat)
    # franja de 3 filas (90 m) para medir rugosidad y pendiente a lo largo del corte, rumbo 90° (oeste → este)
    a = ee_pixels(glo30, x - largo_m / 2, y + paso * 1.5, n, 3, paso)
    z = a["DEM"] if "DEM" in a.dtype.names else a[a.dtype.names[0]]
    perfil = z[1].astype(float)
    rug = np.array([z[:, max(0, k - 1):k + 2].std() for k in range(n)])
    pend = np.degrees(np.arctan(np.abs(np.gradient(perfil, paso))))
    arena = np.full(n, np.nan)
    if ARENA_OK:
        b = ee_pixels(arena_img, x - largo_m / 2, y + paso * 0.5, n, 1, paso)
        arena = b["arena"][0].astype(float)
        arena[(arena <= 0) | (arena > 100)] = np.nan          # OpenLandMap: 0 y 255 = sin dato (revisado: no afecta a los 3 niveles de abajo)
    tipos = ["arena" if (not np.isnan(s) and s >= 65) else ("roca" if (r > 2 or p > 15) else "compacto") for r, p, s in zip(rug, pend, arena)]
    fuente_sup = "Copernicus DEM GLO-30 (rugosidad y pendiente)" + ("; OpenLandMap SOL_SAND-WFRACTION v02, 0 cm (arena del suelo, 250 m)" if ARENA_OK else "")
    tr = [dict(t, fuente=fuente_sup, regla=REGLA_T) for t in tramos(tipos, paso)]
    return dict(id=nombre, mundo="tierra", centro=[lat, lon], fuente_coord=fuente_coord, rumbo_deg=90, longitud_m=largo_m, paso_m=paso,
                perfil_elevacion_m=[round(v - perfil[0], 1) for v in perfil], referencia="altura relativa al primer punto (m)",
                fuente="Copernicus DEM GLO-30 (ESA, 2024_1), muestreo a 30 m", superficie_tramos=tr,
                resumen_superficie={k: round(tipos.count(k) / n * 100) for k in ("arena", "roca", "compacto")},
                arena_suelo_pct=None if np.isnan(arena).all() else round(float(np.nanmean(arena))))

def nivel_luna(lat, lon, largo_m, fuente_coord):
    t_pol = Transformer.from_crs(f"+proj=longlat +R={R_MOON} +no_defs", crs_moon, always_xy=True)
    x, y = t_pol.transform(lon, lat)
    col0, row = (x + half) / MAPSC - 0.5, (half - y) / MAPSC - 0.5
    n = int(largo_m / MAPSC) + 1
    cols = col0 - (n - 1) / 2 + np.arange(n)
    from scipy.ndimage import map_coordinates
    perfil = map_coordinates(src, [np.full(n, row), cols], order=1)
    pend = np.degrees(np.arctan(np.abs(np.gradient(perfil, MAPSC))))
    tipos = ["roca" if p > 20 else "arena" for p in pend]
    tr = [dict(t, fuente="LOLA ldem_80s_80m (pendiente)", regla=REGLA_LM) for t in tramos(tipos, MAPSC, 160)]
    return dict(id="polo_sur_lunar", mundo="luna", centro=[lat, lon], fuente_coord=fuente_coord, rumbo_deg=None,
                nota_rumbo="eje x de la proyección estereográfica polar (en el polo no hay oeste-este útil)", longitud_m=largo_m, paso_m=MAPSC,
                perfil_elevacion_m=[round(float(v - perfil[0]), 1) for v in perfil], referencia="altura relativa al primer punto (m)",
                fuente="LOLA ldem_80s_80m (NASA LRO, PDS), 80 m", superficie_tramos=tr,
                resumen_superficie={k: round(tipos.count(k) / n * 100) for k in ("arena", "roca", "compacto")})

def nivel_marte(largo_m):
    a = dem_marte["Cráter Jezero"]; c0 = a.shape[1] // 2; r0 = a.shape[0] // 2; n = int(largo_m / BASE) + 1
    perfil = a[r0, c0 - n // 2:c0 - n // 2 + n].astype(float)
    pend = np.degrees(np.arctan(np.abs(np.gradient(perfil, BASE))))
    tipos = ["roca" if p > 20 else "arena" for p in pend]
    tr = [dict(t, fuente="HRSC+MOLA blend 200 m (pendiente)", regla=REGLA_LM) for t in tramos(tipos, BASE, 400)]
    la, lo = SITIOS_MARTE["Cráter Jezero"]
    return dict(id="jezero", mundo="marte", centro=[la, lo], fuente_coord="centro del recorte de la celda 03 (por verificar contra el nomenclátor IAU)",
                rumbo_deg=90, longitud_m=largo_m, paso_m=BASE, perfil_elevacion_m=[round(float(v - perfil[0]), 1) for v in perfil],
                referencia="altura relativa al primer punto (m)", fuente="HRSC+MOLA blend v2 (ESA/NASA, USGS), 200 m", superficie_tramos=tr,
                resumen_superficie={k: round(tipos.count(k) / n * 100) for k in ("arena", "roca", "compacto")})

gp_el = next(p for p in perfiles_v if p["id"] == "MX0008")["gemelo_perfil"]
mina = c[c.cid == "MX0207"].iloc[0]
NIV = [
    nivel_tierra("samalayuca", 31.263611, -106.395278, 3000, "Domínguez-Acosta et al. 2023, doi:10.18268/BSGM2023v75n3a240823 (centro del campo de dunas)"),
    nivel_tierra("pinacate", 31.84444, -113.39111, 4000, "Smithsonian GVP vn=341001, cráter El Elegante"),
    nivel_tierra("mx0207", float(mina.lat), float(mina.lon), 3000, "detección MX0207 del detector (tajo minero; nombre por verificar)"),
    nivel_luna(gp_el["lat"], gp_el["lon"], 4000, "gemelo lunar de El Elegante por perfil a 80 m (celda 19)"),
    nivel_marte(10000),
]
json.dump(NIV, open("/content/niveles.json", "w"), ensure_ascii=False, indent=1)
for v in NIV:
    p = v["perfil_elevacion_m"]
    print(f"{v['id']:>15}: {len(p)} puntos cada {v['paso_m']} m · relieve {max(p)-min(p):.0f} m · superficie {v['resumen_superficie']} · {len(v['superficie_tramos'])} tramos"
          + (f" · arena del suelo {v.get('arena_suelo_pct')} %" if v.get('arena_suelo_pct') is not None else ""))
from google.colab import files
files.download("/content/niveles.json")
