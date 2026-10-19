"""Model doctor, headless (Playwright + SwiftShader): opens labs/doctor.html, waits for every model to be examined
and prints the findings. It fails (exit 1) when
  - the test bench does not trigger every check (a check stopped working),
  - a model's fingerprint (triangles, draw calls, materials, size) or finding counts differ from
    tools/doctor.golden.json (a change you did not mean, or one you did: check it, then --update),
  - the page logs errors.
  py tools/doctor.py              # check against the golden file
  py tools/doctor.py --update     # accept the current state as the new golden file
  py tools/doctor.py --shots      # also screenshot each model with its first finding selected (tools/out/doctor-*.png)
"""
import json, os, sys, time, subprocess
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLDEN = os.path.join(ROOT, 'tools', 'doctor.golden.json')
OUT = os.path.join(ROOT, 'tools', 'out'); os.makedirs(OUT, exist_ok=True)
PORT = 8780
CHECKS = ['nan', 'inverted', 'facing', 'arc', 'zfight', 'floating', 'waterline', 'poke', 'budget', 'hidden', 'speck', 'sliver']

def main():
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
            pg.goto(f'http://localhost:{PORT}/labs/doctor.html')
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
    bench = now.get('test/bench', {}).get('counts', {})
    missing = [c for c in CHECKS if not bench.get(c)]
    if missing: fails.append('test bench: these checks found nothing: ' + ', '.join(missing))
    if '--update' in sys.argv:
        with open(GOLDEN, 'w', encoding='utf-8') as fh: json.dump(now, fh, indent=1, sort_keys=True)
        print('\ngolden file written:', GOLDEN)
    elif os.path.exists(GOLDEN):
        gold = json.load(open(GOLDEN, encoding='utf-8'))
        for mid in sorted(set(gold) | set(now)):
            if gold.get(mid) != now.get(mid):
                fails.append(f'{mid}: differs from the golden file\n    golden: {json.dumps(gold.get(mid))}\n    now:    {json.dumps(now.get(mid))}')
    else:
        print('\n(no golden file yet: run with --update)')
    if errs: fails.append('page errors:\n  ' + '\n  '.join(errs[:20]))
    if fails: print('\nFAIL\n' + '\n'.join(fails)); sys.exit(1)
    print('\ndoctor OK')

if __name__ == '__main__': main()
