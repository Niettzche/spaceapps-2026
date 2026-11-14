# 12 · Imágenes de TODAS las detecciones en zonas áridas (NDVI p90 < 0.35): la lista que de verdad importa
arid_items = []
for r in c[c.ndvi_p90 < 0.35].sort_values("prof_m", ascending=False).itertuples():
    arid_items.append({"grupo": "arida", "id": "A_" + r.cid, "cid": r.cid, "nombre": r.nombre, "tipo": r.tipo, "lat": round(r.lat, 4), "lon": round(r.lon, 4),
                       "c_lat": round(r.lat, 4), "c_lon": round(r.lon, 4), "diam_km": round(r.diam_km, 2), "prof_m": round(r.prof_m),
                       "prof_diam": round(r.prof_diam, 3), "circ": round(r.circ, 2), "borde_m": round(r.borde_m), "ndvi": round(r.ndvi_p90, 2),
                       "pct_lunar": round(r.pct_lunar_prof_diam), "km_mina": None if pd.isna(r.km_mina) else float(r.km_mina)})
t0 = time.time()
with ThreadPoolExecutor(6) as ex: arid_items = list(ex.map(hacer, arid_items))
d = json.load(open(f"{INF}/informe.json")); d["aridas"] = arid_items
d["ndvi_bandas"] = {str(k): int(v) for k, v in pd.cut(c.ndvi_p90, [0, .2, .35, .5, .7, 1]).value_counts().sort_index().items()}
json.dump(d, open(f"{INF}/informe.json", "w"), ensure_ascii=False)
z = shutil.make_archive("/content/informe", "zip", INF)
print(f"{len(arid_items)} detecciones áridas con imagen. {time.time()-t0:.0f} s. Zip {os.path.getsize(z)/1e6:.1f} MB")
