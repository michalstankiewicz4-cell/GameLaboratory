// Wersje GameLaboratory — jedno miejsce (CLAUDE.md, „Wersjonowanie”): wersja programu (strona startowa, wspólne
// warstwy, narzędzia wspólne) i osobna wersja każdego laboratorium. Zmiany: CHANGELOG.md w katalogu głównym.
// x.y.z — y: nowa funkcja, z: poprawka, x: duży zwrot. Klasyczny skrypt (strony ze skryptami klasycznymi
// i z modułami, także pod CSP 'self'); wypełnia każdy znacznik data-lab-version="labs/….html" (i "app").
(function () {
  "use strict";
  const V = {
  app: "0.6.0",
  labs: {
    "labs/ship.html": "1.2.0",
    "labs/bodies.html": "1.1.0",
    "labs/systems.html": "1.1.0",
    "labs/scale.html": "1.1.0",
    "labs/skins.html": "1.0.0",
    "labs/surface.html": "1.1.0",
    "labs/buildings.html": "1.1.0",
    "labs/vehicles.html": "1.2.0",
    "labs/sound.html": "1.0.0",
    "labs/marine.html": "1.1.0",
    "labs/creator.html": "1.1.0",
    "labs/life.html": "1.1.0",
    "labs/structures.html": "1.0.0",
    "labs/water.html": "1.0.0",
    "labs/land.html": "1.0.0",
    "labs/plants.html": "1.1.0",
    "labs/look.html": "1.0.0",
    "labs/pixel.html": "1.0.0",
    "labs/zombies.html": "1.0.0",
    "tools/doctor.html": "1.0.1",
    "labs/transform.html": "1.0.0",
    "tools/kitcheck.html": "1.0.0",
    "tools/grainTexture.html": "1.0.0",
    "labs/filters.html": "0.1.0",
    "labs/warship.html": "1.0.0",
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
