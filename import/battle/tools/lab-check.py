"""Headless check of the model labs (Playwright + SwiftShader).

Loads labs.html and labs/ship.html, waits for the ship to build, toggles parts, trains the mounts,
rebuilds at another detail level and screenshots a few camera presets to tools/out/lab-*.png;
then the water lab, the transformer, the look lab (weathers, look presets, split compare, cameras) and the land
lab (seamless wrap, exact land share, 100 % land, mountain barrier).
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
            pg.set_default_navigation_timeout(300000)        # leaving a busy lab page can take a while headless
            pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e) + ' @ ' + pg.url + ' ' + (e.stack or '')[:400]))
            pg.on('console', lambda m: errs.append(m.type + ' ' + m.text) if m.type == 'error' else None)
            pg.goto(f'http://localhost:{PORT}/labs.html')
            assert pg.locator('a.tile[href="labs/ship.html"]').count() == 1, 'ship tile missing'
            assert pg.locator('a.tile[href="labs/ship.html?ship=orzel"]').count() == 1, 'orzel tile missing'
            assert pg.locator('a.tile[href="labs/look.html"]').count() >= 1, 'look tile missing'
            assert pg.locator('a.tile[href="labs/land.html"]').count() == 1, 'land tile missing'
            assert pg.locator('a.tile[href="labs/structures.html"]').count() == 1, 'structures tile missing'
            assert pg.locator('a.tile[href="labs/plants.html"]').count() == 1, 'plants tile missing'
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
            # signal lamp: the shutters open and close while it keys SOS
            pg.click('#signal'); seen = set()
            for _ in range(12): time.sleep(0.4); seen.add(round(pg.evaluate('__lab.signal.open')))
            pg.click('#signal')
            assert seen == {0, 1}, f'signal shutters {seen}'
            bad = pg.evaluate("()=>{let n=0;__lab.model.group.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position.array;for(let i=0;i<a.length;i+=97)if(!isFinite(a[i]))n++;}});return n}")
            assert bad == 0, f'{bad} NaN vertices'
            for c in CAMS: snap(pg, c, os.path.join(OUT, 'lab-' + c.replace(' ', '_').replace('¾', '34').replace('&', 'and') + '.png'))
            if '--thumb' in sys.argv:
                pg.keyboard.press('h'); pg.evaluate("()=>{const c=document.getElementById('dimsChk');if(c.checked)c.click()}")
                tmp = os.path.join(OUT, 'lab-thumb.png'); snap(pg, 'Bow ¾', tmp)
                from PIL import Image
                Image.open(tmp).convert('RGB').crop((60, 90, 1100, 675)).resize((1200, 675), Image.LANCZOS).save(os.path.join(ROOT, 'assets', 'labs', 'ship.jpg'), quality=85)
                print('thumbnail written')
            # ORP Orzeł: builds with its own cameras, dives to periscope depth (40 mm into its well, periscopes up, ensign struck)
            pg.goto(f'http://localhost:{PORT}/labs/ship.html?ship=orzel')
            pg.wait_for_function("window.__lab && window.__lab.model && window.__lab.model.info.id === 'orzel'", timeout=180000)
            print('orzel', ' '.join(pg.inner_text('#stats').split()))
            assert pg.locator('#cams button').count() >= 8 and not pg.locator('#subPanel').is_hidden() and pg.locator('#signalPanel').is_hidden(), 'orzel panels'
            for c in pg.locator('#parts input').all(): c.click(); c.click()
            pg.evaluate("()=>{document.getElementById('fastDive').checked=true;__lab.setDive(2);__lab.dive.keel=__lab.dive.want}")   # headless frames are slow: jump the depth, let the pose run
            for _ in range(120):
                time.sleep(0.5)
                if pg.evaluate('Math.abs(__lab.dive.keel-12)<0.05 && __lab.dive.pose.search>0.99 && __lab.dive.pose.aa<0.01'): break
            st = pg.evaluate("({y:__lab.model.group.position.y, aa:__lab.model.group.getObjectByName('40 mm twin (retractable)').position.y, flag:__lab.model.group.getObjectByName('ensign').visible, txt:document.getElementById('diveStatus').textContent})")
            assert abs(st['y'] + (12 - 4.17)) < 0.1 and st['aa'] < -2 and not st['flag'] and 'above the sea' in st['txt'], f'orzel dive {st}'
            print('orzel dive', st['txt'])
            pg.evaluate("()=>{__lab.setDive(0);__lab.dive.keel=__lab.dive.want}")
            for _ in range(120):
                time.sleep(0.5)
                if pg.evaluate('Math.abs(__lab.dive.keel-4.17)<0.01 && __lab.dive.pose.aa>0.99'): break
            assert pg.evaluate("__lab.model.group.getObjectByName('40 mm twin (retractable)').position.y") == 0, 'orzel 40 mm not raised'
            if '--thumb' in sys.argv:
                pg.keyboard.press('h'); pg.evaluate("()=>{const c=document.getElementById('dimsChk');if(c.checked)c.click()}")
                tmp = os.path.join(OUT, 'lab-thumb-orzel.png'); snap(pg, 'Bow ¾', tmp)
                from PIL import Image
                Image.open(tmp).convert('RGB').crop((60, 90, 1100, 675)).resize((1200, 675), Image.LANCZOS).save(os.path.join(ROOT, 'assets', 'labs', 'orzel.jpg'), quality=85)
                print('orzel thumbnail written')
            # water lab: loads, variants, presets, split screen, every effect toggled
            pg.goto(f'http://localhost:{PORT}/labs/water.html')
            pg.wait_for_function('window.__water && window.__water.vars.A.waves.length > 0', timeout=180000)
            pg.click('#splitOn'); time.sleep(2)
            for k in ['planar', 'clear', 'motion', 'bowWave', 'wake', 'hullFoam', 'wet', 'spray']: pg.click('#' + k); pg.click('#' + k)
            pg.select_option('#seaPreset', 'gale'); pg.select_option('#lookPreset', 'storm'); pg.select_option('#grid', '96,90')
            pg.evaluate("()=>[...document.querySelectorAll('#cams button')].find(b=>b.textContent==='Bridge').click()"); time.sleep(3)
            pg.screenshot(path=os.path.join(OUT, 'lab-water-split.png'), timeout=600000)
            assert pg.evaluate('__water.vars.A.waves.length') >= 4, 'no waves'
            # water bodies: fjord, lake and river bring a shore that streams past (a river's current slows it)
            pg.click('#splitOn')
            for k in ['fjord', 'lake', 'river']:
                pg.evaluate("(k)=>{__water.edit='A';const s=document.getElementById('body');s.value=k;s.dispatchEvent(new Event('change'))}", k)
                for _ in range(240):                   # poll from Python: string predicates can trip the page's CSP
                    if pg.evaluate('!!(__water.vars.A.T && __water.vars.A.terrain && __water.vars.A.terrain.group.visible)'): break
                    time.sleep(0.5)
                else: raise AssertionError(f'{k}: no shore')
                g0 = pg.evaluate('__water.vars.A.ground')
                for _ in range(40):                    # headless frames are slow: wait for a few
                    time.sleep(0.5)
                    if pg.evaluate('__water.vars.A.ground') != g0: break
                else: raise AssertionError(f'{k}: the shore does not move ' + '; '.join(errs[:3]))
            assert pg.evaluate('__water.vars.A.u.uCurrent.value') > 1, 'river without a current'
            for k, expr in [('harbour', '__water.vars.A.u.uOil.value > 0.3'), ('ice', '__water.vars.A.u.uIce.value.x > 0.5')]:
                pg.evaluate("(k)=>{const s=document.getElementById('body');s.value=k;s.dispatchEvent(new Event('change'))}", k)
                assert pg.evaluate(expr), f'{k}: not set'
                assert not pg.evaluate('__water.vars.A.terrain && __water.vars.A.terrain.group.visible'), f'{k}: should have no shore'
            time.sleep(3); pg.screenshot(path=os.path.join(OUT, 'lab-water-ice.png'), timeout=600000)
            pg.screenshot(path=os.path.join(OUT, 'lab-water-river.png'), timeout=600000)
            pg.evaluate("()=>{const s=document.getElementById('body');s.value='ocean';s.dispatchEvent(new Event('change'))}")
            # foam with memory: whitecap coverage on Monahan & O'Muircheartaigh (within 35 %), the wake trail stays behind
            # the ship, a shell splash and a torpedo leave foam where they were (water frame)
            for sea in ['moderate', 'gale']:
                r = pg.evaluate("""async(sea)=>{const W=__water;const {SEAS}=await import('../js/env/waterkit.js');const {monahan,windFromHs}=await import('../js/env/foamkit.js');
                  Object.assign(W.V.A,SEAS[sea],{sea,foamMap:true,kn:18});W.edit='A';W.applyVariant('A');W.vars.A.foam.clear();W.simulate(40);
                  const v=W.vars.A,sh=v.u.uShift.value,s=v.foam.sample(60,sh+40,560,sh+540),w=v.foam.sample(-12,sh-260,12,sh-80);
                  return {sea,target:monahan(windFromHs(SEAS[sea].Hs)),cov:s[3],active:s[4],wake:w[2]}}""", sea)
                print('whitecaps', sea, f"{r['cov']*100:.2f} % (Monahan {r['target']*100:.2f} %, active {r['active']*100:.2f} %), wake {r['wake']:.2f}")
                assert 0.65 < r['cov'] / r['target'] < 1.35, f'whitecap coverage off for {sea}'
                assert r['wake'] > 0.1, 'no wake trail in the foam map'
            ev = pg.evaluate("""()=>{const W=__water,v=W.vars.A;v.events.length=0;const sh=v.u.uShift.value;
              v.events.push({kind:'shell',t0:W.t,x:120,z:sh+200,size:1,done:false});W.simulate(3);const a=v.foam.sample(115,sh+195,125,sh+205);
              v.events.push({kind:'torpedo',t0:W.t,x:-200,z:sh+300,vx:23,vz:0,life:12});W.simulate(10);const b=v.foam.sample(-150,sh+298.5,-50,sh+301.5);return [a[2],b[2]]}""")
            print('splash / torpedo foam', [round(x, 2) for x in ev])
            assert ev[0] > 0.3 and ev[1] > 0.12, 'shell splash or torpedo track left no foam'
            pg.evaluate("()=>{const W=__water;Object.assign(W.V.A,{sea:'moderate'});document.getElementById('seaPreset').value='moderate';document.getElementById('seaPreset').dispatchEvent(new Event('change'))}")
            pg.evaluate("()=>{[...document.querySelectorAll('#cams button')].find(b=>b.textContent==='Wake').click();const o=__water.orbit;o.target.copy(o.want.target);o.dist=o.want.dist;o.yaw=o.want.yaw;o.pitch=o.want.pitch;o.want=null}")
            time.sleep(3); pg.screenshot(path=os.path.join(OUT, 'lab-water-foam.png'), timeout=600000)
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
            # look lab: ageing baked, every weather, every look preset, split compare, cameras
            pg.goto(f'http://localhost:{PORT}/labs/look.html')
            pg.wait_for_function('window.__look', timeout=300000)
            print('look', pg.inner_text('#bake'))
            for w in pg.evaluate("()=>[...document.querySelectorAll('#weather option')].map(o=>o.value)"):
                pg.select_option('#weather', w); time.sleep(0.5)
            for i in range(pg.locator('#presets button').count()): pg.locator('#presets button').nth(i).click(); time.sleep(0.5)
            pg.click('#splitOn'); time.sleep(1)
            for c in pg.locator('#cams button').all(): c.click(); time.sleep(1)
            for c in pg.locator('#times button').all(): c.click(); time.sleep(0.5)
            pg.click('#salvo'); pg.click('#strike'); pg.click('#signal'); time.sleep(2); pg.click('#signal')
            assert pg.evaluate('window.__lookSalvos') == 1, 'salvo did not fire'
            pg.keyboard.press('h'); time.sleep(3)
            pg.screenshot(path=os.path.join(OUT, 'lab-look.png'), timeout=600000)
            # land lab: water-body layouts; seamless wrap, exact land share, 100 % land, bounded map with a mountain barrier
            pg.goto(f'http://localhost:{PORT}/labs/land.html')
            pg.wait_for_function('window.__land && window.__land.T', timeout=300000)
            print('land', ' '.join(pg.inner_text('#genStats').split()))
            # water bodies mixed by region: every layout builds, its bodies are there, weights sum to 1 and change smoothly
            lay = lambda l, kw={}: pg.evaluate('([l,kw])=>{__land.S.water.layout=l;Object.assign(__land.S.water,kw);__land.generate();const T=__land.T,R=T.regions,N=T.res,NB=6;let jump=0,bad=0;for(let k=0;k<N*N;k+=3){let s=0;for(let c=0;c<NB;c++)s+=R.w[k*NB+c];if(Math.abs(s-1)>0.02)bad++;if(k%N<N-1)for(let c=0;c<NB;c++)jump=Math.max(jump,Math.abs(R.w[(k+1)*NB+c]-R.w[k*NB+c]));}return {share:R.share,labels:R.labels,jump,bad,ms:T.ms}}', [l, kw])
            want = {'estuary': ('river', 0.04), 'lake': ('lake', 0.2), 'fjord': ('fjord', 0.1), 'harbour': ('harbour', 0.03), 'iceEdge': ('ice', 0.3)}
            for l, (wb, mn) in want.items():
                r = lay(l)
                assert r['share'][wb] > mn and r['bad'] == 0 and r['jump'] < 0.12, f'layout {l}: {wb} {r["share"][wb]:.3f} bad {r["bad"]} jump {r["jump"]:.3f}'
                print('layout', l, f"{wb} {r['share'][wb] * 100:.0f} %", f"max step {r['jump']:.3f}", f"{r['ms']} ms")
            lay('estuary')
            fl = pg.evaluate("(()=>{const L=__land.T.regions.labels.find(x=>x[0]==='River');const r=__land.regionAt(L[1],L[2]);return [Math.hypot(r.flow[0],r.flow[1]), r.w.river, r.waves]})()")
            assert fl[0] > 0.5 and fl[1] > 0.9 and fl[2] < 0.3, f'river current {fl}'
            pg.evaluate("()=>{Object.assign(__land.S.map,{shape:'islands',land:0.55,seed:7});}")
            r = lay('mixed', {'rivers': 4, 'ice': 0.3})
            assert any(x[0].startswith('River') for x in r['labels']) and r['share']['lake'] > 0 and r['share']['ice'] > 0.05 and r['bad'] == 0, f'mixed {r["share"]} {r["labels"]}'
            print('layout mixed', {k: round(v, 3) for k, v in r['share'].items() if v > 0})
            # biomes: plains stay low and gently rolling, the desert gets plateaus, zones mix all three
            bio = lambda b: pg.evaluate("(b)=>{Object.assign(__land.S.map,{seed:1939,land:0.5,shape:'islands'});Object.assign(__land.S.water,{layout:'single',biome:b});__land.generate();const T=__land.T;let n=0,s=0,s2=0;for(let k=0;k<T.h.length;k+=5)if(T.h[k]>0){n++;s+=T.h[k];s2+=T.h[k]*T.h[k]}return {share:T.biomes.share,maxH:T.maxH,mean:s/n,sd:Math.sqrt(s2/n-(s/n)**2)}}", b)
            pl, de, zo = bio('plains'), bio('desert'), bio('zones')
            assert pl['maxH'] < 80 and pl['sd'] > 2 and pl['share']['plains'] > 0.99, f'plains {pl}'
            assert de['maxH'] > 150 and de['share']['desert'] > 0.99, f'desert {de}'
            assert all(zo['share'][b] > 0.05 for b in ['temperate', 'plains', 'desert']), f'zones {zo["share"]}'
            print('biomes', f"plains max {pl['maxH']:.0f} m sd {pl['sd']:.1f} m", f"desert max {de['maxH']:.0f} m", 'zones', {k: round(v, 2) for k, v in zo['share'].items()})
            pg.evaluate("()=>{Object.assign(__land.S.map,{seed:1939,land:0.35});Object.assign(__land.S.water,{layout:'single',body:'ocean',ice:0,biome:'temperate'})}")
            pg.evaluate("()=>__land.generate()")
            seam = pg.evaluate('''()=>{const T=__land.T,N=T.res,h=T.h;let s=0,i=0;for(let j=0;j<N;j++){s+=Math.abs(h[j*N+N-1]-h[j*N]);for(let x=0;x<N-1;x+=7)i+=Math.abs(h[j*N+x+1]-h[j*N+x])}return [s/N, i/(N*Math.ceil((N-1)/7))]}''')
            assert seam[0] < 3 * seam[1] + 0.5, f'wrap seam {seam}'
            gen = lambda kw: pg.evaluate('(kw)=>{Object.assign(__land.S.map,kw);__land.generate();return [__land.T.landShare, __land.ship.on]}', kw)
            share, on = gen({'land': 0.6}); assert abs(share - 0.6) < 0.01, f'land share {share}'
            share, on = gen({'land': 1.0}); assert share > 0.999 and not on, f'100 % land {share} ship {on}'
            gen({'land': 0.35, 'wrap': False, 'barrier': 'mountains'})
            edge = pg.evaluate('__land.sampleHeight(20, __land.T.size / 2)'); assert edge > 100, f'mountain barrier {edge}'
            assert abs(pg.evaluate('__land.wrapC(__land.T.size + 10)') - 10) < 1e-6
            gen({'wrap': True}); pg.keyboard.press('h'); time.sleep(4)
            pg.screenshot(path=os.path.join(OUT, 'lab-land.png'), timeout=600000)
            # plants lab: every species grows (foliage and wood), its impostor bakes; a landscape per biome places plants, splits them into full models and impostors, grows grass
            pg.goto(f'http://localhost:{PORT}/labs/plants.html')
            pg.wait_for_function('window.__plants && window.__plants.plant', timeout=300000)
            for sp in ['spruce', 'pine', 'birch', 'oak', 'palm', 'acacia', 'juniper', 'saltbush']:
                inf = pg.evaluate("(s)=>{const P=__plants; P.S.species=s; P.S.compare=true; P.buildSpecimen(); return P.specInfo}", sp)
                assert inf['tris'] > 50 and inf['H'] > 0.4, f'plant {sp} {inf}'
            print('plants', 'all eight species grow')
            for bio in ['temperate', 'plains', 'desert']:
                r = pg.evaluate("(bio)=>{const P=__plants; P.S.biome=bio; P.setMode('landscape'); P.buildLand(); P.forest.update(P.camera); const by={}; for (const p of P.forest.list) by[p.id]=(by[p.id]||0)+1; return {by, near:P.forest.counts.near, far:P.forest.counts.far, tufts:P.grass.userData.tufts}}", bio)
                assert sum(r['by'].values()) > 500 and r['near'] + r['far'] == sum(r['by'].values()) and r['tufts'] > 1000, f'landscape {bio} {r}'
                want = {'temperate': 'spruce', 'plains': 'oak', 'desert': 'palm'}[bio]
                assert r['by'].get(want, 0) > 20, f'landscape {bio} has no {want}: {r["by"]}'
                print('landscape', bio, r['by'], 'near', r['near'], 'impostors', r['far'])
            pg.evaluate("()=>__plants.setMode('specimen')")
            # structures lab: every quay and breakwater type builds (units placed, shore heights baked, ship moored)
            pg.goto(f'http://localhost:{PORT}/labs/structures.html')
            pg.wait_for_function('window.__structures && window.__structures.st', timeout=300000)
            pick = lambda k: pg.evaluate("(k)=>{const s=document.getElementById('structure');s.value=k;s.dispatchEvent(new Event('change'))}", k)
            kind = lambda v: pg.evaluate("(v)=>{const e=document.querySelector('#params select');e.value=v;e.dispatchEvent(new Event('change'))}", v)
            for s_id, kinds in [('quay', ['gravity', 'sheetpile', 'piled']), ('breakwater', ['tetrapod', 'rock', 'caisson'])]:
                pick(s_id)
                for k in kinds:
                    kind(k); time.sleep(1)
                    n = pg.evaluate('(()=>{let n=0;__structures.st.group.traverse(o=>{if(o.isInstancedMesh)n+=o.count});return n})()')
                    assert pg.evaluate('!!__structures.st.heightAt') and (s_id == 'quay' and k != 'piled' or n > 300), f'{s_id}/{k}: {n} units'
                print(s_id, kinds, 'ok')
            pick('quay'); kind('gravity')
            assert pg.evaluate("__structures.S.moor") is not False
            pick('super300')
            pg.evaluate('()=>{__structures.S.jspeed=1e5}')
            def settle(cond):
                for _ in range(120):
                    if pg.evaluate(cond): return True
                    time.sleep(0.5)
                return False
            pg.click('#afloat'); assert settle('__structures.jack.phase === "" && __structures.jack.air < 0 && __structures.jack.legs === 0'), 'rig did not float'
            pg.click('#jackup'); assert settle('__structures.jack.phase === "" && __structures.jack.legs === 1 && __structures.jack.air === __structures.S.air'), 'rig did not jack up'
            can = pg.evaluate('(()=>{const l=__structures.st.legs[0];return l.group.position.y - __structures.st.dim.spudH})()')
            assert abs(can + pg.evaluate('__structures.S.depth') + 2) < 0.01, f'spud can not on the seabed: {can}'
            pg.evaluate("()=>{const r=document.getElementById('canti');r.value=18;r.dispatchEvent(new Event('input'))}")
            assert abs(pg.evaluate('__structures.st.cantilever.position.z') + 18) < 1e-6, 'cantilever did not skid'
            for c in pg.locator('#cams button').all(): c.click(); time.sleep(0.5)
            pg.evaluate("()=>[...document.querySelectorAll('#cams button')].find(b=>b.textContent==='Overview').click()")
            pg.keyboard.press('h'); time.sleep(4)
            pg.screenshot(path=os.path.join(OUT, 'lab-structures.png'), timeout=600000)
            b.close()
    finally:
        srv.kill()
    if errs: print('\n'.join(errs[:20])); sys.exit(1)
    print('lab OK')

if __name__ == '__main__': main()
