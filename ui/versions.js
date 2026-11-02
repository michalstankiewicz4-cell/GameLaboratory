// Wersje GameLaboratory — jedno miejsce (CLAUDE.md, „Wersjonowanie”): wersja programu (strona startowa, wspólne
// warstwy, narzędzia wspólne) i osobna wersja każdego laboratorium. Zmiany: CHANGELOG.md w katalogu głównym.
// x.y.z — y: nowa funkcja, z: poprawka, x: duży zwrot. Klasyczny skrypt (strony ze skryptami klasycznymi
// i z modułami, także pod CSP 'self'); wypełnia każdy znacznik data-lab-version="labs/….html" (i "app").
(function () {
  "use strict";
  const V = {
  app: "0.18.2",
  labs: {
    "labs/ship.html": "1.5.1",
    "labs/bodies.html": "1.2.7",
    "labs/systems.html": "1.2.7",
    "labs/scale.html": "1.1.8",
    "labs/skins.html": "1.0.4",
    "labs/surface.html": "1.2.7",
    "labs/buildings.html": "1.2.7",
    "labs/vehicles.html": "1.5.0",
    "labs/sound.html": "1.1.5",
    "labs/creator.html": "1.2.6",
    "labs/life.html": "1.3.6",
    "labs/human.html": "1.0.7",
    "labs/structures.html": "1.1.4",
    "labs/water.html": "1.1.5",
    "labs/land.html": "1.1.5",
    "labs/plants.html": "1.1.4",
    "labs/look.html": "1.1.5",
    "labs/pixel.html": "1.1.4",
    "labs/zombies.html": "1.1.4",
    "tools/doctor.html": "1.1.8",
    "labs/transform.html": "1.1.5",
    "tools/kitcheck.html": "1.0.6",
    "tools/grainTexture.html": "1.0.4",
    "labs/filters.html": "0.2.4",
    "labs/warship.html": "1.2.1",
    "labs/morgue.html": "1.0.4",
    "labs/walkers.html": "0.23.5",
    "labs/lang.html": "0.24.1",
    "labs/img.html": "0.28.1",
    "labs/caves.html": "1.0.3",
    "labs/gear.html": "1.0.2",
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
