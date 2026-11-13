// Laboratorium UI gry · przykładowe definicje UI (format 'gamelab-ui', js/gameui/gameui.js) i stan gry do nich.
// Przykłady pokazują każdą część: ekrany menu, HUD, okna gry; rozmowa — przycisk w laboratorium (ui.say).

export const SAMPLES = {
  command: {
    label: 'Space command (Space skin)',
    def: {
      format: 'gamelab-ui', version: 1, name: 'Space command', skin: 'space', start: 'main', pause: 'pause',
      screens: {
        main: { title: 'SWARM COMMAND', text: 'Humanity is gone. The robots keep the station running.', items: [
          { label: 'New game', do: 'resume' }, { label: 'Continue', do: 'event:continue' }, { label: 'Options', do: 'screen:options' },
          { label: 'About', do: 'screen:about', sub: true }] },
        pause: { title: 'Paused', items: [{ label: 'Resume', do: 'resume' }, { label: 'Options', do: 'screen:options' }, { label: 'Main menu', do: 'screen:main' }, { label: 'Quit', do: 'quit', sub: true }] },
        options: { title: 'Options', items: [
          { type: 'slider', label: 'Music', bind: 'settings.music', min: 0, max: 1, step: 0.05 },
          { type: 'slider', label: 'Sound', bind: 'settings.sound', min: 0, max: 1, step: 0.05 },
          { type: 'choice', label: 'Graphics', bind: 'settings.gfx', options: ['Light', 'High'] },
          { type: 'toggle', label: 'Show the minimap', bind: 'settings.minimap' },
          { label: 'Back', do: 'back', sub: true }] },
        about: { title: 'About', text: 'A sample made in the GameLaboratory UI lab.', items: [{ label: 'Back', do: 'back' }] },
      },
      hud: [
        { id: 'credits', type: 'value', at: 't', label: 'Credits', bind: 'credits', color: 'accent' },
        { id: 'hull', type: 'bar', at: 'bl', label: 'Hull', bind: 'ship.hull', max: 'ship.hullMax', low: 0.3 },
        { id: 'energy', type: 'bar', at: 'bl', label: 'Energy', bind: 'ship.energy', max: 100, color: 'accent' },
        { id: 'speed', type: 'value', at: 'bl', label: 'Speed', bind: 'ship.speed', unit: 'm/s', digits: 1 },
        { id: 'events', type: 'log', at: 'tr', label: 'Event log' },
        { id: 'map', type: 'minimap', at: 'br', label: 'Sector', bind: 'radar', max: 1500 },
        { id: 'banner', type: 'banner', at: 'c' },
      ],
      windows: [
        { id: 'cargo', title: 'Cargo', key: 'I', at: 'l', body: [{ type: 'text', text: 'What the ship carries.' }, { type: 'list', bind: 'cargo' }] },
        { id: 'ship', title: 'Ship', key: 'C', at: 'r', body: [{ type: 'value', label: 'Hull', bind: 'ship.hull', unit: 'pts' }, { type: 'stats', bind: 'ship.stats' }] },
      ],
    },
  },
  naval: {
    label: 'Naval battle (Battle skin)',
    def: {
      format: 'gamelab-ui', version: 1, name: 'Naval battle', skin: 'battle', start: 'main', pause: 'pause',
      screens: {
        main: { title: 'STEEL SALVO', text: 'Pick your ship and sail out.', items: [{ label: 'Sail out', do: 'resume' }, { label: 'Options', do: 'screen:options' }, { label: 'Quit', do: 'quit', sub: true }] },
        pause: { title: 'Paused', items: [{ label: 'Resume', do: 'resume' }, { label: 'Options', do: 'screen:options' }, { label: 'Leave the battle', do: 'screen:main' }] },
        options: { title: 'Options', items: [
          { type: 'choice', label: 'Graphics', bind: 'settings.gfx', options: ['Light', 'High'] },
          { type: 'slider', label: 'Sound', bind: 'settings.sound', min: 0, max: 1, step: 0.05 }, { label: 'Back', do: 'back', sub: true }] },
      },
      hud: [
        { id: 'wave', type: 'text', at: 't', bind: 'waveText' },
        { id: 'feed', type: 'log', at: 'tr', fade: 6 },
        { id: 'hull', type: 'bar', at: 'b', label: 'ORP Błyskawica', bind: 'ship.hull', max: 'ship.hullMax', low: 0.3 },
        { id: 'tele', type: 'steps', at: 'b', label: 'Telegraph', bind: 'ship.throttle', steps: ['FA', 'HA', 'SA', 'STOP', 'SL', 'HF', 'FF'] },
        { id: 'rudder', type: 'dial', at: 'b', label: 'Rudder', bind: 'ship.rudder' },
        { id: 'speed', type: 'value', at: 'br', label: 'Speed', bind: 'ship.speed', unit: 'kn', digits: 1 },
        { id: 'cross', type: 'crosshair', at: 'c', label: '4.2 km' },
        { id: 'map', type: 'minimap', at: 'bl', bind: 'radar', max: 4000 },
        { id: 'banner', type: 'banner', at: 'c' },
      ],
      windows: [{ id: 'log', title: 'Ship\'s log', key: 'L', at: 'c', body: [{ type: 'stats', bind: 'ship.stats' }] }],
    },
  },
  simple: {
    label: 'Simple game (engine skin)',
    def: {
      format: 'gamelab-ui', version: 1, name: 'Simple game', skin: 'engine', start: '', pause: 'pause',
      screens: { pause: { title: 'Paused', items: [{ label: 'Resume', do: 'resume' }, { label: 'Inventory', do: 'window:bag' }] } },
      hud: [
        { id: 'hp', type: 'bar', at: 'tl', label: 'Health', bind: 'ship.hull', max: 'ship.hullMax', low: 0.25 },
        { id: 'score', type: 'value', at: 'tr', label: 'Score', bind: 'credits' },
        { id: 'events', type: 'log', at: 'bl', fade: 8 },
      ],
      windows: [{ id: 'bag', title: 'Inventory', key: 'I', body: [{ type: 'list', bind: 'cargo' }] }],
    },
  },
};

// stan gry do przykładów (laboratorium zmienia go suwakami i symulacją)
export function sampleState() {
  return {
    credits: 1250, waveText: 'Wave 3 · 5 enemies left',
    ship: { hull: 820, hullMax: 1000, energy: 64, speed: 12.4, throttle: 4, rudder: 0, stats: { Mass: '20 t', Thrust: '400 kN', Crew: 'robots: 4' } },
    cargo: [{ name: 'Iron ore', n: 40 }, { name: 'Ice', n: 12 }, { name: 'Drone parts', n: 3 }],
    radar: [{ x: 0, y: 0, kind: 'me' }, { x: 400, y: -300, kind: 'enemy' }, { x: -600, y: 250, kind: 'ally' }, { x: 900, y: 700, kind: 'enemy' }],
    settings: { music: 0.6, sound: 0.8, gfx: 'High', minimap: true },
  };
}
