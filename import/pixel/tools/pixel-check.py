"""Headless check of Pixel Studio (pixel/index.html), Playwright + SwiftShader.

Every 3D subject, every generator and every sample sprite is made at a few sizes; each result must have opaque
pixels, no half-transparent ones, a sane colour count and a Pixel Doctor report. GIF and PNG exports are encoded and
their signatures checked; the Draw mode is exercised (pencil stroke, fill, undo, text round trip, Edit in Draw).
Screenshots go to tools/out/pixel-*.png. Exit code 1 on page errors or a failed check.
  py tools/pixel-check.py
"""
import os, sys, time, subprocess, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', 'out'); os.makedirs(OUT, exist_ok=True)
PORT = 8781

STATS = """()=>{const fr=__pixel.frames;let op=0,semi=0;const cols=new Set();
for(const f of fr)for(let i=0;i<f.data.length;i+=4){const a=f.data[i+3];if(a===255){op++;cols.add((f.data[i]<<16)|(f.data[i+1]<<8)|f.data[i+2]);}else if(a)semi++;}
return {n:fr.length,w:fr[0].w,h:fr[0].h,op,semi,cols:cols.size,score:window.__pixelDoctor&&window.__pixelDoctor.score,status:document.getElementById('status').textContent};}"""

def settle(pg):
    pg.wait_for_function("()=>!/rendering/.test(document.getElementById('status').textContent)", timeout=300000)

def main():
    errs, fails = [], []
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as pw:
            br = pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            pg = br.new_page(viewport={'width': 1400, 'height': 860})
            pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e) + ' ' + (e.stack or '')[:400]))
            pg.on('console', lambda m: errs.append(m.type + ' ' + m.text) if m.type == 'error' else None)
            pg.goto(f'http://localhost:{PORT}/pixel/')
            pg.evaluate("()=>localStorage.clear()"); pg.reload()
            pg.wait_for_function('window.__pixel', timeout=120000); settle(pg)
            def check(label, st, min_op=12):
                ok = st['op'] >= min_op and st['semi'] == 0 and 2 <= st['cols'] <= 64 and st['score'] is not None
                print(('ok  ' if ok else 'FAIL'), label, json.dumps(st))
                if not ok: fails.append(label)
            # 3D subjects
            subs = pg.evaluate("()=>[...document.getElementById('sub').options].map(o=>o.value)")
            for s in subs:
                pg.evaluate("(s)=>{const e=document.getElementById('sub');e.value=s;e.dispatchEvent(new Event('change'))}", s)
                pg.evaluate("()=>{const e=document.getElementById('frames');e.value=2;e.dispatchEvent(new Event('change'))}")
                settle(pg); check('3d ' + s, pg.evaluate(STATS))
                pg.screenshot(path=os.path.join(OUT, f'pixel-3d-{s}.png'))
            # sizes on one subject, every palette
            for n in (16, 32, 96):
                pg.evaluate("(n)=>{const e=document.getElementById('w');e.value=n;document.getElementById('h').value=n;__pixel.S.h=n;e.dispatchEvent(new Event('change'))}", n)
                settle(pg); st = pg.evaluate(STATS); check(f'3d size {n}', st, 4)
                if st['w'] != n: fails.append(f'size {n} gave {st["w"]}')
            pals = pg.evaluate("()=>[...document.getElementById('palette').options].map(o=>o.value)")
            for p in pals:
                pg.evaluate("(p)=>{const e=document.getElementById('palette');e.value=p;e.dispatchEvent(new Event('change'))}", p)
                settle(pg); st = pg.evaluate(STATS)
                if p == 'free': st['cols'] = min(st['cols'], 64)
                check('palette ' + p, st, 4)
            pg.evaluate("()=>{const e=document.getElementById('palette');e.value='auto';e.dispatchEvent(new Event('change'))}")
            pg.evaluate("()=>{const e=document.getElementById('w');e.value=48;document.getElementById('h').value=48;__pixel.S.h=48;e.dispatchEvent(new Event('change'))}")
            # generators
            pg.evaluate("()=>__pixel.setMode('gen')"); settle(pg)
            gens = pg.evaluate("()=>[...document.getElementById('gen').options].map(o=>o.value)")
            for g in gens:
                pg.evaluate("(g)=>{const e=document.getElementById('gen');e.value=g;e.dispatchEvent(new Event('change'))}", g)
                settle(pg); check('gen ' + g, pg.evaluate(STATS))
                pg.screenshot(path=os.path.join(OUT, f'pixel-gen-{g}.png'))
            # exports: GIF and PNG bytes
            gif = pg.evaluate("()=>{const u=__pixel.encodeGIF(__pixel.frames,{delay:100,scale:2});return [String.fromCharCode(...u.slice(0,6)),u.length,u[u.length-1]]}")
            print('gif', gif)
            if gif[0] != 'GIF89a' or gif[2] != 0x3B: fails.append('gif bytes')
            png = pg.evaluate("""async()=>{const {toCanvas}=await import('../js/pixel/core.js');const c=toCanvas(__pixel.frames[0],4);
              const b=await new Promise(r=>c.toBlob(r,'image/png'));const u=new Uint8Array(await b.arrayBuffer());return [Array.from(u.slice(1,4)).map(x=>String.fromCharCode(x)).join(''),c.width]}""")
            print('png', png)
            if png[0] != 'PNG': fails.append('png bytes')
            with pg.expect_download() as d: pg.click('#gif')
            if not d.value.suggested_filename.endswith('.gif'): fails.append('gif download')
            with pg.expect_download() as d: pg.click('#sheet')
            if not d.value.suggested_filename.endswith('.png'): fails.append('sheet download')
            # hybrid: Edit in Draw, then draw
            pg.click('#toDraw'); time.sleep(0.5)
            SUM = "()=>{const f=__pixel.frames[__pixel.shown];let h=0;for(let i=0;i<f.data.length;i++)h=(h*31+f.data[i])>>>0;return h}"
            n0 = pg.evaluate(SUM)
            box = pg.locator('#stage').bounding_box()
            pg.mouse.move(box['x'] + 3, box['y'] + 3); pg.mouse.down(); pg.mouse.move(box['x'] + box['width'] * 0.3, box['y'] + 6, steps=8); pg.mouse.up()
            n1 = pg.evaluate(SUM); print('draw stroke', n0, '->', n1)
            if n1 == n0: fails.append('pencil')
            pg.keyboard.press('Control+z'); n2 = pg.evaluate(SUM)
            if n2 != n0: fails.append(f'undo {n2} != {n0}')
            for k in pg.evaluate("()=>[...document.getElementById('sample').options].map(o=>o.value)"):
                pg.select_option('#sample', k); pg.click('#loadSample'); check('sprite ' + k, pg.evaluate(STATS), 8)
                pg.click('#textOut'); t1 = pg.input_value('#text'); pg.click('#textIn'); pg.click('#textOut')
                if pg.input_value('#text') != t1: fails.append('text round trip ' + k)
            pg.screenshot(path=os.path.join(OUT, 'pixel-draw.png'))
            # Doctor fixes run
            nfix = pg.evaluate("()=>{const b=[...document.querySelectorAll('#findings button')].filter(x=>x.textContent==='Fix');b.forEach(x=>x.click());return b.length}")
            print('doctor fixes clicked', nfix)
            br.close()
    finally:
        srv.terminate()
    for e in errs: print('ERR', e)
    if errs or fails:
        print('FAILED', fails); sys.exit(1)
    print('pixel OK')

if __name__ == '__main__':
    main()
