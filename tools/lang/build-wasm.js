// Kompiluje tools/lang/matmul.wat do js/labs/lang/wasm.js (bajty modułu jako base64, żeby wątek wczytał je bez osobnego pliku).
// Wymaga pakietu wabt:  npm install wabt@1.0.36  (w dowolnym katalogu, potem NODE_PATH albo uruchomienie stamtąd).
const fs = require('fs'), path = require('path');
require('wabt')().then(w => {
  const src = fs.readFileSync(path.join(__dirname, 'matmul.wat'), 'utf8');
  const mod = w.parseWat('matmul.wat', src, { simd: true, bulk_memory: true });
  mod.validate();
  const { buffer } = mod.toBinary({});
  const b64 = Buffer.from(buffer).toString('base64');
  const out = `// Wygenerowane przez tools/lang/build-wasm.js z tools/lang/matmul.wat. Nie edytuj ręcznie.
// Mnożenie macierzy w WebAssembly z SIMD (f32x4). ${buffer.length} bajtów.
const WASM_MATMUL_B64 = '${b64}';
`;
  fs.writeFileSync(path.join(__dirname, '..', '..', 'js', 'labs', 'lang', 'wasm.js'), out);
  console.log('wasm.js:', buffer.length, 'bajtów');
});
