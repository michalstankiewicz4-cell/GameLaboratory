// Streets Lab — English names for StreetKit's labels (the model's data is in Polish, like JunkKit's): surfaces,
// cross-sections, lamps, signs, bollards, railings, noise walls, parking, signal states. en(label) → English or the label.
const EN = {
  'Asfalt': 'Asphalt', 'Asfalt stary (łaty)': 'Old asphalt (patches)', 'Płyty 50 × 50 szare': 'Slabs 50 × 50 grey', 'Płyty 35 × 35': 'Slabs 35 × 35',
  'Płyty 30 × 30 grafitowe': 'Slabs 30 × 30 graphite', 'Płyty 50 × 50 stare (spękane)': 'Slabs 50 × 50 old (cracked)', 'Płyty 50 × 50 szachownica': 'Slabs 50 × 50 chequerboard',
  'Płyty 100 × 50 granitowe': 'Slabs 100 × 50 granite', 'Płyty z wypustkami (dla niewidomych)': 'Tactile paving (for the blind)', 'Trylinka (sześciokąty)': 'Hexagonal pavers',
  'Kostka brukowa': 'Setts', 'Kostka czerwona (rowery)': 'Red setts (cycles)', 'Kruszywo': 'Gravel', 'Krawężnik granitowy': 'Granite kerb', 'Trawnik': 'Lawn', 'Darń na skarpie': 'Turf on a slope', 'Beton': 'Concrete',
  'Ulica miejska': 'City street', 'Aleja (dwie jezdnie)': 'Avenue (two carriageways)', 'Droga wiejska': 'Country road', 'Ścieżka': 'Path', 'Droga dla rowerów i chodnik': 'Cycle path and pavement',
  'Pomost wiaduktu': 'Viaduct deck', 'Droga w tunelu': 'Road in a tunnel', 'Droga w tunelu z podporami': 'Road in a tunnel with columns',
  'Współczesna LED': 'Modern LED', 'Podwójna (aleja)': 'Double (avenue)', 'Parkowa stylizowana': 'Styled park lamp', 'Stara betonowa (sodowa)': 'Old concrete (sodium)',
  'Ustąp pierwszeństwa': 'Give way', 'Przejście dla pieszych (ostrzegawczy)': 'Pedestrian crossing (warning)', 'Dzieci': 'Children', 'Zakaz ruchu w obu kierunkach': 'No vehicles',
  'Zakaz wjazdu': 'No entry', 'Stop': 'Stop', 'Ograniczenie prędkości 50': 'Speed limit 50', 'Zakaz zatrzymywania się': 'No stopping', 'Ruch okrężny': 'Roundabout',
  'Droga dla rowerów': 'Cycle path', 'Droga z pierwszeństwem': 'Priority road', 'Przejście dla pieszych': 'Pedestrian crossing', 'Parking': 'Parking',
  'Stalowy blokujący': 'Steel blocking', 'Żeliwny grafitowy': 'Graphite cast iron', 'Żeliwne z łańcuchem': 'Cast iron with a chain', 'Betonowy walec': 'Concrete cylinder', 'Prowadzący U-1a': 'U-1a guide post',
  'Ochronna U-12a (czerwono-biała)': 'U-12a guard rail (red and white)', 'Miejska grafitowa': 'City graphite', 'Bariera energochłonna (stalowa)': 'Steel crash barrier',
  'Kasety pochłaniające': 'Absorbing cassettes', 'Przezroczysty (PMMA)': 'See-through (PMMA)', 'Kasety z przeszkleniem u góry': 'Cassettes glazed at the top',
  'Równoległe': 'Parallel', 'Skośne 60°': 'Angled 60°', 'Prostopadłe': 'Perpendicular',
  'Czerwone': 'Red', 'Czerwone z żółtym': 'Red and amber', 'Zielone': 'Green', 'Żółte': 'Amber', 'Żółte migające': 'Flashing amber', 'Wyłączone': 'Off',
};
export const en = (label) => EN[label] || label;
