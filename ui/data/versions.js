// Wersje GameLaboratory — jedno miejsce (CLAUDE.md, „Wersjonowanie”): wersja programu (strona startowa, wspólne
// warstwy, narzędzia wspólne) i osobna wersja każdego laboratorium. Zmiany: CHANGELOG.md w katalogu głównym.
// x.y.z — y: nowa funkcja, z: poprawka, x: duży zwrot. Klasyczny skrypt (strony ze skryptami klasycznymi
// i z modułami, także pod CSP 'self'); wypełnia każdy znacznik data-lab-version="labs/….html" (i "app").
(function () {
  "use strict";
  const V = {
  app: "0.115.6",
  labs: {
    "labs/vehicles-space.html": "1.11.1",
    "labs/bodies.html": "1.5.3",
    "labs/systems.html": "1.5.2",
    "labs/scale.html": "1.1.9",
    "labs/surface.html": "1.4.0",
    "labs/buildings.html": "1.4.0",
    "labs/vehicles-land.html": "1.25.1",
    "labs/sound.html": "1.4.0",
    "labs/sound-effects.html": "1.3.0",
    "labs/sound-speech.html": "1.0.1",
    "labs/creator.html": "1.4.0",
    "labs/life.html": "1.5.1",
    "labs/human.html": "1.3.1",
    "labs/structures.html": "1.6.2",
    "labs/city.html": "1.3.8",
    "labs/streets.html": "1.0.3",
    "labs/mechanics.html": "1.0.6",
    "labs/water.html": "1.5.2",
    "labs/land.html": "1.10.2",
    "labs/plants.html": "1.8.2",
    "labs/rocks.html": "1.1.3",
    "labs/look.html": "1.8.3",
    "labs/pixel.html": "1.2.1",
    "labs/art.html": "1.3.0",
    "labs/gameui.html": "1.7.3",
    "labs/trees.html": "1.1.1",
    "labs/items.html": "1.2.4",
    "labs/materials.html": "1.1.4",
    "labs/blocks.html": "1.2.1",
    "labs/effects.html": "1.4.2",
    "labs/effects-land.html": "1.0.5",
    "labs/zombies.html": "1.2.1",
    "tools/doctor.html": "1.10.0",
    "labs/transform.html": "1.3.2",
    "tools/kitcheck.html": "1.0.8",
    "labs/filters.html": "0.6.2",
    "editor/index.html": "0.60.0",
    "editor/index.html?doctor": "0.33.1",
    "labs/vehicles-water.html": "1.6.2",
    "labs/morgue.html": "1.1.1",
    "labs/walkers.html": "0.23.8",
    "labs/lang.html": "0.24.3",
    "labs/img.html": "0.29.3",
    "labs/caves.html": "1.3.1",
    "labs/gear.html": "1.2.1",
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
