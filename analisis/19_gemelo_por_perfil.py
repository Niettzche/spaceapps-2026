# 19 · Gemelo lunar POR PERFIL a 80 m: entre todos los cráteres del polo sur, el de corte radial más parecido
# (en la celda 18 el gemelo venía de diámetro y profundidad medidos a 200 m; aquí se elige con la forma completa a 80 m)
Lpolo = L[L.sitio == "Polo sur (85-90°S)"].reset_index(drop=True)
t0 = time.time()
perf_luna = [luna_80(g) for g in Lpolo.itertuples()]
okL = [i for i, p in enumerate(perf_luna) if p and all(v is not None for v in p)]
ML = np.array([perf_luna[i] for i in okL])                     # matriz cráteres lunares x anillos
print(f"perfiles lunares a 80 m: {len(okL)} de {len(Lpolo)} · {time.time()-t0:.0f} s")
ZON = {"fondo": (0, .3), "pared": (.3, .9), "borde": (.9, 1.2), "alrededor": (1.2, 2.01)}
rc = np.array([(a + b) / 2 for a, b in zip(RB[:-1], RB[1:])])
for pv in perfiles_v:
    t = pv.get("tierra")
    if not t or any(v is None for v in t): continue
    t = np.array(t); dif = np.abs(ML - t).mean(axis=1)
    k = int(np.argmin(dif)); g = Lpolo.iloc[okL[k]]
    pv["luna_perfil"] = [round(float(v), 4) for v in ML[k]]
    pv["gemelo_perfil"] = dict(lat=round(float(g.lat), 2), lon=round(float(g.lon), 2), d=round(float(g.diam_km), 2), p=round(float(g.prof_m)),
                               dif=round(float(dif[k]), 4), pct_cercania=round(float((dif <= dif[k]).mean() * 100), 1))
    pv["zonas_luna_perfil"] = {z: round(float(np.abs(ML[k] - t)[(rc >= a) & (rc < b)].mean()), 4) for z, (a, b) in ZON.items()}
    # imagen del nuevo gemelo, misma luz y escala
    pl = recorte(moon200, g.i, g.j)
    if pl is not None: png_relieve(pl, f"{VIS}/{pv['id']}_lunaP.png"); pv["img_lunaP"] = True
json.dump({"r": [round(float(x), 3) for x in rc], "res": {"tierra": 80, "luna": 80, "marte": 200}, "sitios": perfiles_v},
          open("/content/perfiles_vis.json", "w"), ensure_ascii=False)
with zipfile.ZipFile("/content/lunaP.zip", "w") as zf:
    for f in os.listdir(VIS):
        if f.endswith("_lunaP.png"): zf.write(f"{VIS}/{f}", f)
for nom, cid in (("El Elegante", "MX0008"), ("Sykes", "MX0010"), ("MacDougal", "MX0007"), ("Rincón de Parangueo", "MX0261"), ("Real de Ángeles", "MX0207")):
    pv = next(p for p in perfiles_v if p["id"] == cid)
    print(nom, "→ gemelo por perfil:", pv.get("gemelo_perfil"), pv.get("zonas_luna_perfil"))
zs = [p["zonas_luna_perfil"] for p in perfiles_v if "zonas_luna_perfil" in p]
print({z: sum(1 for x in zs if x[z] < 0.015) for z in ZON}, "de", len(zs), "cumplen < 0.015 por zona")
from google.colab import files
files.download("/content/perfiles_vis.json"); files.download("/content/lunaP.zip")
