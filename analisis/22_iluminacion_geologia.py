# 22 · Iluminación polar y geología de cada candidato
# (a) "¿Qué tanto quedaría en sombra si este cráter estuviera en el polo sur lunar?" Sol a 1.5° de elevación (como cerca de 89.5° S),
#     girando los 360° de azimut. Un píxel está en SOMBRA PERMANENTE si para todos los azimuts el terreno hacia el Sol lo tapa.
#     Mismo cálculo y misma resolución (80 m) en el candidato de la Tierra y en su gemelo lunar por perfil. Es un experimento:
#     ningún lugar de la Tierra tiene ese sol; mide si la FORMA del cráter guardaría sombra (donde la Luna conserva hielo).
# (b) Índice máfico (Ninomiya 2003) y de cuarzo con ASTER GED v3 (NASA/JPL, emisividad térmica, 100 m): roca basáltica frente a cuarzosa.
from scipy.ndimage import map_coordinates
ELEV_SOL, N_AZ, L_SOMBRA = 1.5, 36, 5000.0           # grados, azimuts, alcance de la búsqueda del horizonte (m)

def sombra_permanente(dem, res):
    """Devuelve máscara de píxeles sin sol en ningún azimut (Sol a ELEV_SOL)."""
    ny, nx = dem.shape; yy, xx = np.mgrid[0:ny, 0:nx].astype(float)
    tanE = np.tan(np.radians(ELEV_SOL)); pasos = np.arange(1, int(L_SOMBRA / res) + 1)
    siempre = np.ones_like(dem, bool)
    for az in np.linspace(0, 2 * np.pi, N_AZ, endpoint=False):
        dx, dy = np.sin(az), -np.cos(az)
        tapado = np.zeros_like(dem, bool)
        for k in pasos:
            zk = map_coordinates(dem, [yy + dy * k, xx + dx * k], order=1, mode="nearest")
            tapado |= (zk - dem) > k * res * tanE
        siempre &= tapado
        if not siempre.any(): break
    return siempre

def fracciones(dem, res, diam_km):
    ny, nx = dem.shape; R = diam_km * 1000 / 2 / res
    yy, xx = np.mgrid[0:ny, 0:nx]; rr = np.hypot(yy - (ny - 1) / 2, xx - (nx - 1) / 2) / R
    s = sombra_permanente(dem.astype(float), res)
    return dict(sombra_fondo=round(float(s[rr < 0.5].mean()), 3), sombra_crater=round(float(s[rr < 1.0].mean()), 3))

def ventana_ilum_tierra(cv):
    h = int(np.ceil((cv["d"] * 500 + L_SOMBRA) / R80))
    if cv["fuente"] == "mx":
        x, y = to_xy.transform(cv["lon"], cv["lat"]); crs = CRS
    else:
        x, y = cv["x"], cv["y"]; crs = f"EPSG:{cv['epsg']}"
    return ee_pixels(glo30, x - h * R80, y + h * R80, 2 * h, 2 * h, R80, crs=crs)["DEM"]

def ventana_ilum_luna(lat, lon, diam_km):
    t_pol = Transformer.from_crs(f"+proj=longlat +R={R_MOON} +no_defs", crs_moon, always_xy=True)
    x, y = t_pol.transform(lon, lat)
    col, row = int(round((x + half) / MAPSC)), int(round((half - y) / MAPSC))
    h = int(np.ceil((diam_km * 500 + L_SOMBRA) / MAPSC))
    if row - h < 0 or col - h < 0 or row + h > src.shape[0] or col + h > src.shape[1]: return None
    return src[row - h:row + h, col - h:col + h]

aster = ee.Image("NASA/ASTER_GED/AG100_003").select(["emissivity_band10", "emissivity_band11", "emissivity_band12", "emissivity_band13", "emissivity_band14"]).multiply(0.001)
e10, e11, e12, e13, e14 = [aster.select(f"emissivity_band{b}") for b in (10, 11, 12, 13, 14)]
indices = ee.Image.cat([e12.multiply(e14.pow(3)).divide(e13.pow(4)).rename("ind_mafico"),     # Ninomiya: mayor = más máfico (basalto)
                        e11.multiply(e11).divide(e10.multiply(e12)).rename("ind_cuarzo")])     # Ninomiya: mayor = más cuarzo (arena silícea)

def hacer_ilum(cv):
    out = {"id": cv["id"]}
    try:
        out.update({k + "_tierra": v for k, v in fracciones(ventana_ilum_tierra(cv), R80, cv["d"]).items()})
    except Exception as e: out["err_t"] = str(e)[:80]
    pv = next((p for p in perfiles_v if p["id"] == cv["id"]), None)
    gp = pv.get("gemelo_perfil") if pv else None
    if gp:
        a = ventana_ilum_luna(gp["lat"], gp["lon"], gp["d"])
        if a is not None: out.update({k + "_luna": v for k, v in fracciones(a, MAPSC, gp["d"]).items()})
    return out

t0 = time.time()
with ThreadPoolExecutor(8) as ex: ilum = list(ex.map(hacer_ilum, cand_v))
IL = pd.DataFrame(ilum)
# Geología: promedio de los índices dentro del cráter (radio R), en lotes
fc = ee.FeatureCollection([ee.Feature(ee.Geometry.Point([float(cv["lon"]), float(cv["lat"])]).buffer(max(cv["d"] * 500, 150)), {"id": cv["id"]}) for cv in cand_v])
geo = pd.DataFrame([f["properties"] for f in indices.reduceRegions(fc, ee.Reducer.mean(), 100).getInfo()["features"]])
IL = IL.merge(geo, on="id", how="left")
# Referencias de geología para leer el índice: El Pinacate (basalto) y Samalayuca (dunas de cuarzo)
refs = ee.FeatureCollection([ee.Feature(ee.Geometry.Point([-113.39111, 31.84444]).buffer(800), {"ref": "Pinacate, El Elegante (basalto)"}),
                             ee.Feature(ee.Geometry.Point([-106.395278, 31.263611]).buffer(800), {"ref": "Samalayuca (dunas)"})])
print(pd.DataFrame([f["properties"] for f in indices.reduceRegions(refs, ee.Reducer.mean(), 100).getInfo()["features"]]).round(3).to_string(index=False))
IL["fecha"] = "2026-11-14"
IL.round(4).to_csv("/content/iluminacion_geologia.csv", index=False)
print(f"\n{len(IL)} candidatos · {time.time()-t0:.0f} s")
print(IL[["sombra_fondo_tierra", "sombra_fondo_luna", "sombra_crater_tierra", "sombra_crater_luna", "ind_mafico", "ind_cuarzo"]].describe().round(3).to_string())
for nom, cid in (("El Elegante", "MX0008"), ("Sykes", "MX0010"), ("MacDougal", "MX0007"), ("Real de Ángeles", "MX0207"), ("Peñasquito", "MX0155")):
    print(nom, IL[IL.id == cid].drop(columns=["id", "fecha"]).round(3).to_dict("records"))
from google.colab import files
files.download("/content/iluminacion_geologia.csv")
