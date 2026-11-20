// Common UK gas appliance makes and model ranges, for suggestions while typing.
// Not a complete list: anything typed that isn't here is remembered from your own
// records and suggested next time. Add the output after the range, e.g. "Greenstar 4000 30kW".

export const BOILERS: Record<string, string[]> = {
  'Worcester Bosch': [
    'Greenstar 8000 Life',
    'Greenstar 8000 Style',
    'Greenstar 4000',
    'Greenstar 2000',
    'Greenstar 1000',
    'Greenstar i',
    'Greenstar Si Compact',
    'Greenstar CDi Compact',
    'Greenstar CDi Classic',
    'Greenstar Highflow CDi',
    'Greenstar Ri',
    'Greenstar Heatslave II',
    'Greenstar Junior',
  ],
  Vaillant: [
    'ecoTEC plus',
    'ecoTEC pro',
    'ecoTEC exclusive',
    'ecoTEC sustain',
    'ecoFIT pure',
    'ecoFIT sustain',
    'ecoMAX',
    'Turbomax Plus',
    'Turbomax Pro',
    'Thermocompact',
  ],
  Baxi: [
    '800 Combi',
    '800 System',
    '800 Heat',
    '600 Combi',
    '600 System',
    '600 Heat',
    '400 Combi',
    '200 Combi',
    'Platinum Combi',
    'Duo-tec Combi',
    'EcoBlue Advance Combi',
    'EcoBlue Plus Combi',
    'EcoBlue System',
    'EcoBlue Heat',
    'Combi Instinct',
    'Neta-tec Plus',
    'Megaflo System',
    'Solo HE',
    'Bermuda back boiler',
  ],
  Ideal: [
    'Logic Max Combi',
    'Logic Max System',
    'Logic Max Heat',
    'Logic+ Combi',
    'Logic+ System',
    'Logic+ Heat',
    'Logic Combi ESP1',
    'Vogue Max Combi',
    'Vogue Max System',
    'Vogue Combi',
    'Instinct Combi',
    'Exclusive',
    'Independent Combi',
    'Isar HE',
    'Icos HE',
    'Imax',
    'Classic',
    'Mexico',
  ],
  Viessmann: ['Vitodens 050-W', 'Vitodens 100-W', 'Vitodens 111-W', 'Vitodens 200-W', 'Vitodens 222-F', 'Vitodens 300-W'],
  'Glow-worm': [
    'Energy Combi',
    'Energy System',
    'Energy Regular',
    'Ultimate3 Combi',
    'Easicom 3',
    'Betacom 4',
    'Compact',
    'Flexicom',
    'Ultracom',
    'Ultracom2',
    'Micron',
    'Swiftflow',
  ],
  Potterton: ['Promax Combi', 'Promax System', 'Promax Ultra', 'Titanium Combi', 'Assure Combi', 'Gold Combi', 'Performa', 'Suprima', 'Netaheat', 'Kingfisher'],
  Main: ['Eco Compact Combi', 'Eco Compact System', 'Eco Compact Heat', 'Combi HE', 'System HE', 'Heat Only HE'],
  Vokera: ['Vision Plus', 'Unica', 'Evolve', 'Compact', 'Easi-Heat Plus', 'Linea', 'Mynute', 'Excel'],
  Alpha: ['E-Tec', 'E-Tec Plus', 'InTec', 'InTec2', 'Evoke', 'CB', 'HE'],
  Intergas: ['Combi Compact HRE', 'Xclusive', 'Rapid', 'Eco RF'],
  Ariston: ['Clas One', 'Genus One', 'Alteas One', 'E-Combi Evo', 'Clas HE'],
  Ferroli: ['Modena', 'Optimax', 'Bluehelix', 'Maxima'],
  Remeha: ['Avanta', 'Tzerra Ace'],
  ATAG: ['iC Economiser Plus', 'iC', 'iS', 'iR', 'Q Series'],
  Halstead: ['ACE', 'Best', 'Eden'],
  Keston: ['Combi', 'System', 'Heat'],
  Biasi: ['Riva', 'Advance', 'Activ'],
  Heatline: ['Capriz', 'Vizo'],
  Sime: ['Format', 'Murelle'],
  Ravenheat: ['CSI', 'HE'],
};

export const FIRES: Record<string, string[]> = {
  Valor: ['Homeflame', 'Dream', 'Inspire', 'Blenheim'],
  Flavel: ['Emberglow', 'Caress', 'Misermatic', 'Kenilworth'],
  Gazco: ['Riva', 'Logic HE', 'Studio'],
  Baxi: ['Bermuda fire'],
  Kinder: [],
  'Crystal Fires': [],
  Burley: [],
  'Be Modern': [],
  Legend: [],
  Paragon: [],
  Verine: [],
};

export const COOKERS: Record<string, string[]> = Object.fromEntries(
  [
    'AEG',
    'Belling',
    'Beko',
    'Bosch',
    'Britannia',
    'Candy',
    'Cannon',
    'Electrolux',
    'Falcon',
    'Flavel',
    'Hisense',
    'Hotpoint',
    'Indesit',
    'Lamona',
    'Leisure',
    'Montpellier',
    'Neff',
    'New World',
    'Rangemaster',
    'Samsung',
    'Siemens',
    'Smeg',
    'Stoves',
    'Tricity Bendix',
    'Whirlpool',
    'Zanussi',
  ].map((m) => [m, [] as string[]]),
);

export const WATER_HEATERS: Record<string, string[]> = {
  Ascot: [],
  Morco: [],
  Rinnai: ['Infinity'],
  Vaillant: [],
  Main: [],
};

export const WARM_AIR: Record<string, string[]> = {
  'Johnson & Starley': [],
  Brivis: [],
  Powrmatic: [],
};

export type ApplianceKind = 'boiler' | 'fire' | 'cooker' | 'water' | 'warmAir' | 'other';

/** Which kind of appliance a typed type is, e.g. "Combi boiler" -> boiler. */
export function kindOf(type: string): ApplianceKind {
  const t = type.toLowerCase();
  if (/boiler/.test(t)) return 'boiler';
  if (/fire/.test(t)) return 'fire';
  if (/cooker|hob|oven|range/.test(t)) return 'cooker';
  if (/water heater|multipoint|instantaneous/.test(t)) return 'water';
  if (/warm air/.test(t)) return 'warmAir';
  return 'other';
}

/** The built-in makes and ranges that fit an appliance type. */
export function catalogueFor(type: string): Record<string, string[]> {
  switch (kindOf(type)) {
    case 'boiler':
      return BOILERS;
    case 'fire':
      return FIRES;
    case 'cooker':
      return COOKERS;
    case 'water':
      return WATER_HEATERS;
    case 'warmAir':
      return WARM_AIR;
    default:
      // Unknown type: offer everything.
      return { ...COOKERS, ...WATER_HEATERS, ...WARM_AIR, ...FIRES, ...BOILERS };
  }
}
