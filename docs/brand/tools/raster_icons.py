"""Rendert Icons (PNG, ICO) aus den SVGs. Aufruf: python3 raster_icons.py <ordner mit den SVGs>
Benötigt: pip install pillow und ein Chromium (Pfad in CH anpassen).
"""
import subprocess, sys, os, struct, io
from PIL import Image
CH="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
def render(svg, size, out):
    html=f"<html><body style='margin:0;background:transparent'><img src='file://{os.path.realpath(svg)}' style='position:absolute;left:0;top:0;width:{size}px;height:{size}px'></body></html>"
    h="/tmp/_r.html"; open(h,"w").write(html)
    big=max(size,600)
    subprocess.run(["timeout","40",CH,"--headless","--no-sandbox","--disable-gpu","--hide-scrollbars","--default-background-color=00000000",f"--screenshot=/tmp/_r.png",f"--window-size={big},{big}",f"file://{h}"],capture_output=True)
    im=Image.open("/tmp/_r.png").convert("RGBA").crop((0,0,size,size)); im.save(out); return im
o=sys.argv[1]
render(f"{o}/app-icon.svg",512,f"{o}/icon-512.png")
render(f"{o}/app-icon.svg",192,f"{o}/icon-192.png")
render(f"{o}/icon-maskable.svg",512,f"{o}/icon-maskable-512.png")
render(f"{o}/apple-touch-icon.svg",180,f"{o}/apple-touch-icon.png")
ims=[render(f"{o}/favicon.svg",n,f"/tmp/_f{n}.png") for n in (16,32,48)]
# ICO mit PNG-Einträgen
data=[]; 
for im in ims:
    b=io.BytesIO(); im.save(b,"PNG"); data.append((im.size[0],b.getvalue()))
hdr=struct.pack("<HHH",0,1,len(data)); off=6+16*len(data); ent=b""; body=b""
for n,d in data:
    ent+=struct.pack("<BBBBHHII",n,n,0,0,1,32,len(d),off+len(body)); body+=d
open(f"{o}/favicon.ico","wb").write(hdr+ent+body)
print("raster ok")
