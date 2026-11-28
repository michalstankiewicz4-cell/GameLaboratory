"""Model doctor, headless (Playwright + SwiftShader): opens tools/doctor.html, waits for every model to be examined
and prints the findings. It fails (exit 1) when
  - the test bench does not trigger every check (a check stopped working),
  - a model's fingerprint (triangles, draw calls, materials, size) or finding counts differ from
    tools/doctor.golden.json (a change you did not mean, or one you did: check it, then --update),
  - the page logs errors.
  py tools/doctor.py              # check against the golden file
  py tools/doctor.py --update     # accept the current state as the new golden file
  py tools/doctor.py --shots      # also screenshot each model with its first finding selected (tools/out/doctor-*.png)
  py tools/doctor.py rocks/        # only the models whose id starts with it (compared with their part of the golden
                                   # file; with --update only that part is rewritten)
  py tools/doctor.py --scene labs/mechanics.html   # an assembly: do the models of a page's scene enter each other
                                   # ("clash"); the page sets window.LabScene = { prepare?() (async), root(),
                                   # components() → [Object3D] (the separate models), clashOk?(a, b) }
"""
import json, os, sys, time, subprocess
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLDEN = os.path.join(ROOT, 'tools', 'doctor.golden.json')
OUT = os.path.join(ROOT, 'tools', 'out'); os.makedirs(OUT, exist_ok=True)
PORT = 8780
CHECKS = ['nan', 'inverted', 'facing', 'seethrough', 'arc', 'zfight', 'floating', 'dangling', 'waterline', 'poke', 'budget', 'pierce', 'clash', 'hidden', 'speck', 'sliver']

def scene(url):
    errs = []
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            pg = b.new_page(bypass_csp=True)
            pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e)))
            pg.goto(f'http://localhost:{PORT}/{url}')
            pg.wait_for_function('window.LabScene', timeout=600000)
            rep = pg.evaluate("""async () => {
              const S = window.LabScene; if (S.prepare) await S.prepare();
              const D = await import('/tools/doctor/modeldoctor.js');
              const comps = S.components(), r = D.examine(S.root(), { checks: ['clash'], components: comps, clashOk: S.clashOk });
              return { n: comps.length, ms: r.stats.ms, findings: r.findings.map((f) => ({ check: f.check, severity: f.severity, detail: f.detail, parts: f.parts })) };
            }""")
            b.close()
    finally:
        srv.kill()
    print(f'{url}: {rep["n"]} models in the scene, {rep["ms"]} ms')
    for f in rep['findings']:
        print(f'  {f["severity"][0].upper()} {f["check"]:<10} {f["detail"][:200]}')
        print(f'               {" ; ".join(f["parts"])[:200]}')
    if not rep['findings']: print('  clean: the models do not enter each other')
    for e in errs: print('PAGE:', e[:300])
    sys.exit(1 if errs else 0)

def main():
    if '--scene' in sys.argv: return scene(sys.argv[sys.argv.index('--scene') + 1])
    only = next((a for a in sys.argv[1:] if not a.startswith('-')), '')
    errs, fails = [], []
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            # the test harness polls with page scripts, which the page's strict CSP would refuse
            pg = b.new_page(viewport={'width': 1280, 'height': 720}, bypass_csp=True)
            pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e)))
            pg.on('console', lambda m: errs.append(m.type + ' ' + m.text) if m.type == 'error' else None)
            pg.goto(f'http://localhost:{PORT}/tools/doctor.html?all=1' + (f'&only={only}' if only else ''))
            pg.wait_for_function('window.doctorReport && window.doctorReport.done', timeout=900000)
            rep = pg.evaluate('window.doctorReport')
            if '--shots' in sys.argv:
                for mid in rep['models']:
                    pg.evaluate("(id)=>__doctor.show(id)", mid)
                    pg.evaluate("()=>{const b=document.querySelector('.find'); if(b) b.click()}")
                    time.sleep(2)
                    pg.screenshot(path=os.path.join(OUT, 'doctor-' + mid.replace('/', '-') + '.png'), timeout=600000)
            b.close()
    finally:
        srv.kill()

    now = {}
    for mid, r in rep['models'].items():
        if r.get('error'): fails.append(f'{mid}: build/examine failed: {r["error"][:300]}'); continue
        counts = {c: n for c, n in r['counts'].items() if n}
        now[mid] = {'fingerprint': r['fingerprint'], 'counts': counts}
        print(f'\n{mid}  ({r["label"]})  {r["stats"]["meshes"]} pieces, {r["fingerprint"]["triangles"]:,} triangles, {r["fingerprint"]["drawCalls"]} draw calls, {r["ms"]} ms')
        for f in r['findings']:
            print(f'  {f["severity"][0].upper()} {f["check"]:<9} {f["detail"][:150]}')
            print(f'              {" ; ".join(f["parts"])[:150]}' + (f'  [{" | ".join(f["src"])[:80]}]' if f['src'] else ''))
        if not r['findings']: print('  clean')
    if not now and not fails: print(f'no model id starts with "{only}": nothing was checked'); sys.exit(1)
    if 'test/bench'.startswith(only):
        bench = now.get('test/bench', {}).get('counts', {})
        missing = [c for c in CHECKS if not bench.get(c)]
        if missing: fails.append('test bench: these checks found nothing: ' + ', '.join(missing))
    if '--update' in sys.argv:
        if only and os.path.exists(GOLDEN):   # rewrite only the filtered part
            gold = {k: v for k, v in json.load(open(GOLDEN, encoding='utf-8')).items() if not k.startswith(only)}
            now = {**gold, **now}
        with open(GOLDEN, 'w', encoding='utf-8') as fh: json.dump(now, fh, indent=1, sort_keys=True)
        print('\ngolden file written:', GOLDEN)
    elif os.path.exists(GOLDEN):
        gold = json.load(open(GOLDEN, encoding='utf-8'))
        for mid in sorted({k for k in gold if k.startswith(only)} | set(now)):
            if gold.get(mid) != now.get(mid):
                fails.append(f'{mid}: differs from the golden file\n    golden: {json.dumps(gold.get(mid))}\n    now:    {json.dumps(now.get(mid))}')
    else:
        print('\n(no golden file yet: run with --update)')
    if errs: fails.append('page errors:\n  ' + '\n  '.join(errs[:20]))
    if fails: print('\nFAIL\n' + '\n'.join(fails)); sys.exit(1)
    print('\ndoctor OK')

if __name__ == '__main__': main()
