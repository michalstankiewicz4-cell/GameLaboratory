"""Headless check of the model labs (Playwright + SwiftShader).

Loads labs.html and labs/ship.html, waits for the ship to build, toggles parts, trains the mounts,
rebuilds at another detail level and screenshots a few camera presets to tools/out/lab-*.png.
Exit code 1 on page errors or a missing model. Slow without a GPU (first build ~15 s).
  py tools/lab-check.py            # check + screenshots
  py tools/lab-check.py --thumb    # also rewrite assets/labs/ship.jpg (clean Bow 3/4 view)
"""
import os, sys, time, subprocess
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', 'out'); os.makedirs(OUT, exist_ok=True)
PORT = 8779
CAMS = ['Bow ¾', 'Bridge', 'Funnel & tubes', 'Quarterdeck']

def snap(pg, label, path):
    pg.evaluate("(l)=>[...document.querySelectorAll('#cams button')].find(b=>b.textContent===l).click()", label)
    pg.evaluate("()=>{const o=__lab.orbit;if(o.want){o.target.copy(o.want.target);o.dist=o.want.dist;o.yaw=o.want.yaw;o.pitch=o.want.pitch;o.want=null;}}")
    time.sleep(4); pg.screenshot(path=path, timeout=600000)

def main():
    errs = []
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            pg = b.new_page(viewport={'width': 1280, 'height': 720})
            pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e)))
            pg.on('console', lambda m: errs.append(m.type + ' ' + m.text) if m.type == 'error' else None)
            pg.goto(f'http://localhost:{PORT}/labs.html')
            assert pg.locator('a.tile[href="labs/ship.html"]').count() == 1, 'ship tile missing'
            pg.goto(f'http://localhost:{PORT}/labs/ship.html')
            pg.wait_for_function('window.__lab && window.__lab.model', timeout=180000)
            print('stats', ' '.join(pg.inner_text('#stats').split()))
            assert pg.locator('#specs tr').count() > 5 and pg.locator('#sources li').count() > 2, 'info panel empty'
            # parts off/on, armament, rebuild
            for c in pg.locator('#parts input').all(): c.click(); c.click()
            pg.evaluate("()=>{const t=document.getElementById('train');t.value=60;t.dispatchEvent(new Event('input'))}")
            pg.click('#action'); time.sleep(1); pg.click('#stow')
            pg.evaluate("()=>{const d=document.getElementById('detail');d.value=0.5;d.dispatchEvent(new Event('change'));d.dispatchEvent(new Event('input'))}")
            time.sleep(3)
            pg.evaluate("()=>{const d=document.getElementById('detail');d.value=1;d.dispatchEvent(new Event('change'));d.dispatchEvent(new Event('input'))}")
            time.sleep(3)
            bad = pg.evaluate("()=>{let n=0;__lab.model.group.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position.array;for(let i=0;i<a.length;i+=97)if(!isFinite(a[i]))n++;}});return n}")
            assert bad == 0, f'{bad} NaN vertices'
            for c in CAMS: snap(pg, c, os.path.join(OUT, 'lab-' + c.replace(' ', '_').replace('¾', '34').replace('&', 'and') + '.png'))
            if '--thumb' in sys.argv:
                pg.keyboard.press('h'); pg.evaluate("()=>{const c=document.getElementById('dimsChk');if(c.checked)c.click()}")
                tmp = os.path.join(OUT, 'lab-thumb.png'); snap(pg, 'Bow ¾', tmp)
                from PIL import Image
                Image.open(tmp).convert('RGB').crop((60, 90, 1100, 675)).resize((1200, 675), Image.LANCZOS).save(os.path.join(ROOT, 'assets', 'labs', 'ship.jpg'), quality=85)
                print('thumbnail written')
            # water lab: loads, variants, presets, split screen, every effect toggled
            pg.goto(f'http://localhost:{PORT}/labs/water.html')
            pg.wait_for_function('window.__water && window.__water.vars.A.waves.length > 0', timeout=180000)
            pg.click('#splitOn'); time.sleep(2)
            for k in ['planar', 'clear', 'motion', 'bowWave', 'wake', 'hullFoam', 'wet', 'spray']: pg.click('#' + k); pg.click('#' + k)
            pg.select_option('#seaPreset', 'gale'); pg.select_option('#lookPreset', 'storm'); pg.select_option('#grid', '96,90')
            pg.evaluate("()=>[...document.querySelectorAll('#cams button')].find(b=>b.textContent==='Bridge').click()"); time.sleep(3)
            pg.screenshot(path=os.path.join(OUT, 'lab-water-split.png'), timeout=600000)
            assert pg.evaluate('__water.vars.A.waves.length') >= 4, 'no waves'
            # transformer: levels, hitboxes, damage through a ray, fleet
            pg.goto(f'http://localhost:{PORT}/labs/transform.html')
            pg.wait_for_function('window.__tf && window.__tf.T.levels.length === 3', timeout=300000)
            lv = pg.evaluate('__tf.T.levels.map(l => [l.name, l.triangles, l.drawCalls])'); print('levels', lv)
            assert lv[0][2] > lv[1][2] > lv[2][2] and lv[0][1] > lv[1][1] > lv[2][1], 'levels must get cheaper'
            n = pg.evaluate('__tf.T.hitboxes.length'); assert n >= 300, f'only {n} hitboxes'
            got = pg.evaluate("async()=>{const THREE=await import('/vendor/three.module.js'); const r=__tf.T.raycast(new THREE.Ray(new THREE.Vector3(30,2,0), new THREE.Vector3(-1,0,0))); if(!r) return null; __tf.hit(r.box,0.5); return [r.box.kind, __tf.T.damage.level[r.box.id]]}")
            assert got and got[0] == 'hull' and got[1] > 0.4, f'ray hit {got}'
            pg.evaluate("()=>{const f=document.getElementById('fleet');f.value=6;f.dispatchEvent(new Event('input'))}"); time.sleep(3)
            pg.screenshot(path=os.path.join(OUT, 'lab-transform.png'), timeout=600000)
            b.close()
    finally:
        srv.kill()
    if errs: print('\n'.join(errs[:20])); sys.exit(1)
    print('lab OK')

if __name__ == '__main__': main()
