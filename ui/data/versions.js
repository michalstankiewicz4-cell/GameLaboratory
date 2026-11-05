// Wersje GameLaboratory — jedno miejsce (CLAUDE.md, „Wersjonowanie”): wersja programu (strona startowa, wspólne
// warstwy, narzędzia wspólne) i osobna wersja każdego laboratorium. Zmiany: CHANGELOG.md w katalogu głównym.
// x.y.z — y: nowa funkcja, z: poprawka, x: duży zwrot. Klasyczny skrypt (strony ze skryptami klasycznymi
// i z modułami, także pod CSP 'self'); wypełnia każdy znacznik data-lab-version="labs/….html" (i "app").
(function () {
  "use strict";
  const V = {
  app: "0.34.0",
  labs: {
    "labs/vehicles-space.html": "1.6.2",
    "labs/bodies.html": "1.3.1",
    "labs/systems.html": "1.3.1",
    "labs/scale.html": "1.1.9",
    "labs/skins.html": "1.1.1",
    "labs/surface.html": "1.3.0",
    "labs/buildings.html": "1.3.0",
    "labs/vehicles-land.html": "1.10.0",
    "labs/sound.html": "1.2.0",
    "labs/creator.html": "1.3.0",
    "labs/life.html": "1.4.0",
    "labs/human.html": "1.2.0",
    "labs/structures.html": "1.2.0",
    "labs/water.html": "1.3.0",
    "labs/land.html": "1.2.0",
    "labs/plants.html": "1.2.0",
    "labs/look.html": "1.2.0",
    "labs/pixel.html": "1.2.0",
    "labs/zombies.html": "1.2.0",
    "tools/doctor.html": "1.2.5",
    "labs/transform.html": "1.2.0",
    "tools/kitcheck.html": "1.0.6",
    "labs/filters.html": "0.4.0",
    "editor/index.html": "0.6.0",
    "labs/vehicles-water.html": "1.3.2",
    "labs/morgue.html": "1.1.0",
    "labs/walkers.html": "0.23.5",
    "labs/lang.html": "0.24.1",
    "labs/img.html": "0.29.1",
    "labs/caves.html": "1.1.0",
    "labs/gear.html": "1.1.0",
  },
  };
  window.GameLabVersions = V;
  function fill() {
    document.querySelectorAll("[data-lab-version]").forEach((e) => {
      const k = e.dataset.labVersion, v = k === "app" ? V.app : V.labs[k];
      if (v) e.textContent = "v" + v;
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill); else fill();
})();
