// Three.js r186 jako window.THREE — bez łatek wyglądu r128 (te są w three-global.js). Dla kitów pisanych
// pod globalne THREE (np. TrainKit) na stronach z grafiką z Battle. Importować jako pierwszy moduł strony.
import * as THREE from '../../vendor/three/three.module.js';
if (!window.THREE) window.THREE = THREE;
export default THREE;
