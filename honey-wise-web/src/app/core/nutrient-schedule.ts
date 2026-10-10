/**
 * Suggests a staggered nutrient schedule from a recipe's yeast, honey amount,
 * batch size and nutrient. Pure functions and reference tables only, so the
 * numbers can be tested and tuned without touching the form.
 *
 * Doses follow the published nitrogen guidelines (Scott Labs / TOSNA). Clock
 * times for gravity-based additions have no published formula; they come from a
 * rule of thumb and are flagged `estimated`. Sources and caveats are written up
 * in Mead-Nutrient-Timing-Research.docx at the repo root.
 */

export type NitrogenClass = 'low' | 'medium' | 'high';

/** Target nitrogen (ppm) per degree Brix x 10, by how much nitrogen the strain needs. */
const NITROGEN_FACTOR: Record<NitrogenClass, number> = {
  low: 0.75,
  medium: 0.9,
  high: 1.25,
};

interface YeastProfile {
  /** Fragments that identify the strain in a free-text yeast name. */
  aliases: string[];
  nitrogenClass: NitrogenClass;
  /** Alcohol tolerance, % ABV. */
  abvTolerance: number;
  /** How vigorously the strain ferments; scales the estimated rate. */
  vigour: 'high' | 'moderate';
  /** Strains documented as quick to start. */
  shortLag?: boolean;
}

const YEASTS: YeastProfile[] = [
  { aliases: ['71b'], nitrogenClass: 'low', abvTolerance: 14, vigour: 'high' },
  { aliases: ['ec1118'], nitrogenClass: 'low', abvTolerance: 18, vigour: 'high', shortLag: true },
  {
    aliases: ['k1v1116', 'k1v', 'v1116'],
    nitrogenClass: 'low',
    abvTolerance: 18,
    vigour: 'moderate',
    shortLag: true,
  },
  { aliases: ['d47'], nitrogenClass: 'low', abvTolerance: 14, vigour: 'moderate' },
  { aliases: ['qa23'], nitrogenClass: 'low', abvTolerance: 16, vigour: 'high' },
  { aliases: ['dv10'], nitrogenClass: 'low', abvTolerance: 18, vigour: 'high' },
  { aliases: ['rc212'], nitrogenClass: 'medium', abvTolerance: 16, vigour: 'moderate' },
  { aliases: ['58w3'], nitrogenClass: 'medium', abvTolerance: 14, vigour: 'moderate' },
  { aliases: ['lalvinr2'], nitrogenClass: 'medium', abvTolerance: 16, vigour: 'high' },
  { aliases: ['d21'], nitrogenClass: 'medium', abvTolerance: 16, vigour: 'moderate' },
  { aliases: ['bm4x4'], nitrogenClass: 'high', abvTolerance: 16, vigour: 'moderate' },
  { aliases: ['cy3079'], nitrogenClass: 'high', abvTolerance: 15, vigour: 'moderate' },
  { aliases: ['premierblanc'], nitrogenClass: 'low', abvTolerance: 18, vigour: 'high' },
  {
    aliases: ['premiercuvee'],
    nitrogenClass: 'low',
    abvTolerance: 18,
    vigour: 'high',
    shortLag: true,
  },
  { aliases: ['cotedesblancs'], nitrogenClass: 'high', abvTolerance: 13, vigour: 'moderate' },
  { aliases: ['m05'], nitrogenClass: 'medium', abvTolerance: 18, vigour: 'moderate' },
  { aliases: ['1388'], nitrogenClass: 'medium', abvTolerance: 12, vigour: 'moderate' },
  { aliases: ['us05'], nitrogenClass: 'medium', abvTolerance: 10, vigour: 'moderate' },
];

/** Used when the yeast is not in the table: a middle-of-the-road strain. */
const UNKNOWN_YEAST: YeastProfile = {
  aliases: [],
  nitrogenClass: 'medium',
  abvTolerance: 14,
  vigour: 'moderate',
};

interface NutrientProfile {
  name: string;
  aliases: string[];
  /**
   * Nitrogen (ppm) one gram per litre is counted as. Fermaid O uses the TOSNA
   * convention (50 ppm per g/gal), which credits organic nitrogen at roughly
   * 4.7x its measured 40 ppm; the others are measured values.
   */
  effectivePpmPerGramLitre: number;
  /** Usual upper dose in g/L, where one is published. */
  maxGramsPerLitre?: number;
  /** How the dose is split: four equal additions ending at the 1/3 break, or thirds. */
  additions: 3 | 4;
}

const NUTRIENTS: NutrientProfile[] = [
  { name: 'Fermaid O', aliases: ['fermaido'], effectivePpmPerGramLitre: 189.3, additions: 4 },
  {
    name: 'Fermaid AT',
    aliases: ['fermaidat'],
    effectivePpmPerGramLitre: 120,
    maxGramsPerLitre: 0.4,
    additions: 4,
  },
  {
    name: 'Fermaid K',
    aliases: ['fermaidk'],
    effectivePpmPerGramLitre: 100,
    maxGramsPerLitre: 0.5,
    additions: 3,
  },
  {
    name: 'DAP',
    aliases: ['dap', 'diammoniumphosphate'],
    effectivePpmPerGramLitre: 210,
    maxGramsPerLitre: 0.96,
    additions: 3,
  },
];

const POUNDS_PER: Record<string, number> = { lb: 1, kg: 2.20462, g: 0.00220462, oz: 0.0625 };
const GALLONS_PER: Record<string, number> = { gal: 1, L: 0.264172 };
const LITRES_PER_GALLON = 3.78541;

/** Gravity points one pound of honey adds to one US gallon of must. */
const HONEY_POINTS_PER_POUND_GALLON = 35;

/** ABV = (OG - FG) x this. */
const ABV_PER_GRAVITY = 131.25;

/** Gravity drop at which the must reaches about 9% ABV, the usual cutoff for DAP. */
const INORGANIC_CUTOFF_DROP = 9 / ABV_PER_GRAVITY;

export interface NutrientScheduleInput {
  yeastName: string;
  honeyWeight: number | null;
  honeyUnit: string;
  batchSize: number | null;
  batchSizeUnit: string;
  /** Names of every nutrient ingredient in the recipe; the first recognised one is used. */
  nutrientNames: string[];
}

export interface NutrientAddition {
  /** 1-based position in the schedule. */
  index: number;
  grams: number;
  /** Hours after pitching the yeast. */
  hoursAfterPitch: number;
  /** Wait since the previous addition (or since pitching, for the first), in minutes. */
  waitMinutes: number;
  /** Gravity that triggers this addition early, when it is tied to a sugar break. */
  triggerGravity?: number;
  /** True when the clock time is a rule-of-thumb estimate, not a published figure. */
  estimated: boolean;
}

export type NutrientSuggestion =
  | { status: 'incomplete'; missing: string[] }
  | { status: 'unsupported'; reason: string }
  | {
      status: 'ok';
      yeastKnown: boolean;
      nitrogenClass: NitrogenClass;
      nutrient: string;
      originalGravity: number;
      brix: number;
      /** Target yeast-assimilable nitrogen, ppm. */
      targetNitrogenPpm: number;
      totalGrams: number;
      thirdBreakGravity: number;
      additions: NutrientAddition[];
      warnings: string[];
    };

export function suggestNutrientSchedule(input: NutrientScheduleInput): NutrientSuggestion {
  const missing: string[] = [];
  if (!input.yeastName.trim()) {
    missing.push('yeast type');
  }
  if (!input.honeyWeight || input.honeyWeight <= 0) {
    missing.push('honey weight');
  }
  if (!input.batchSize || input.batchSize <= 0) {
    missing.push('batch size');
  }
  const nutrientNames = input.nutrientNames.filter((n) => n.trim());
  if (nutrientNames.length === 0) {
    missing.push('a nutrient ingredient');
  }
  if (missing.length > 0 || !input.honeyWeight || !input.batchSize) {
    return { status: 'incomplete', missing };
  }

  const nutrient = findNutrient(nutrientNames);
  if (!nutrient) {
    return {
      status: 'unsupported',
      reason:
        `No dose data for ${nutrientNames.join(', ')}. ` +
        'Suggestions cover Fermaid O, Fermaid K, Fermaid AT and DAP.',
    };
  }

  const knownYeast = findYeast(input.yeastName);
  const yeast = knownYeast ?? UNKNOWN_YEAST;

  const pounds = input.honeyWeight * (POUNDS_PER[input.honeyUnit] ?? 1);
  const gallons = input.batchSize * (GALLONS_PER[input.batchSizeUnit] ?? 1);
  const litres = gallons * LITRES_PER_GALLON;

  const originalGravity = 1 + (pounds * HONEY_POINTS_PER_POUND_GALLON) / (gallons * 1000);
  const brix = gravityToBrix(originalGravity);
  const targetNitrogenPpm = brix * 10 * NITROGEN_FACTOR[yeast.nitrogenClass];
  const totalGrams = (targetNitrogenPpm * litres) / nutrient.effectivePpmPerGramLitre;

  // The yeast stops at dryness or at its alcohol tolerance, whichever comes first.
  const finalGravity = Math.max(1, originalGravity - yeast.abvTolerance / ABV_PER_GRAVITY);
  const totalDrop = originalGravity - finalGravity;
  const thirdBreakGravity = originalGravity - totalDrop / 3;

  const hoursToDrop = (drop: number) =>
    lagHours(yeast, originalGravity) + (24 * drop * 1000) / pointsPerDay(yeast, originalGravity);
  const hoursToThirdBreak = hoursToDrop(totalDrop / 3);

  const warnings: string[] = [];
  const gramsPerLitre = totalGrams / litres;
  if (nutrient.maxGramsPerLitre && gramsPerLitre > nutrient.maxGramsPerLitre) {
    warnings.push(
      `${round(gramsPerLitre, 2)} g/L is above the usual maximum of ` +
        `${nutrient.maxGramsPerLitre} g/L for ${nutrient.name}. ` +
        'The rest of the nitrogen is normally made up with a second nutrient.',
    );
  }
  if (hoursToThirdBreak < 72) {
    warnings.push(
      'This looks like a fast ferment: the 1/3 sugar break may arrive before the clock ' +
        'additions finish. Follow gravity readings, not the clock.',
    );
  }
  if (originalGravity > 1.16) {
    warnings.push('Starting gravity is very high; check the honey weight and batch size.');
  }

  let schedule: { hours: number; triggerGravity?: number; estimated: boolean }[];
  if (nutrient.additions === 4) {
    schedule = [
      { hours: 24, estimated: false },
      { hours: 48, estimated: false },
      { hours: 72, estimated: false },
      {
        hours: clamp(Math.round(hoursToThirdBreak), 96, 168),
        triggerGravity: thirdBreakGravity,
        estimated: true,
      },
    ];
  } else {
    // Inorganic nitrogen is not taken up late on, so the last addition is no
    // later than the 2/3 break or about 9% ABV, whichever comes first.
    const lastDrop = Math.min((totalDrop * 2) / 3, INORGANIC_CUTOFF_DROP);
    const second = Math.max(48, Math.round(hoursToThirdBreak));
    const third = Math.max(second + 24, Math.round(hoursToDrop(lastDrop)));
    schedule = [
      { hours: 24, estimated: false },
      { hours: second, triggerGravity: thirdBreakGravity, estimated: true },
      { hours: third, triggerGravity: originalGravity - lastDrop, estimated: true },
    ];
  }

  const gramsEach = totalGrams / schedule.length;
  const additions = schedule.map((entry, i) => ({
    index: i + 1,
    grams: gramsEach,
    hoursAfterPitch: entry.hours,
    waitMinutes: (entry.hours - (i === 0 ? 0 : schedule[i - 1].hours)) * 60,
    triggerGravity: entry.triggerGravity,
    estimated: entry.estimated,
  }));

  return {
    status: 'ok',
    yeastKnown: knownYeast !== undefined,
    nitrogenClass: yeast.nitrogenClass,
    nutrient: nutrient.name,
    originalGravity,
    brix,
    targetNitrogenPpm,
    totalGrams,
    thirdBreakGravity,
    additions,
    warnings,
  };
}

/** Specific gravity to degrees Brix (standard cubic fit, good to about 40 Brix). */
export function gravityToBrix(gravity: number): number {
  return 182.4601 * gravity ** 3 - 775.6821 * gravity ** 2 + 1262.7794 * gravity - 669.5622;
}

// Rule of thumb, not a published relationship: how long before the yeast gets going.
function lagHours(yeast: YeastProfile, originalGravity: number): number {
  return (yeast.shortLag ? 8 : 12) + (originalGravity > 1.12 ? 8 : 0);
}

// Rule of thumb, not a published relationship: gravity points dropped per day
// during the first third, slower as the starting gravity (osmotic stress) rises.
function pointsPerDay(yeast: YeastProfile, originalGravity: number): number {
  const vigour = yeast.vigour === 'high' ? 1.2 : 1;
  let gravityFactor = 0.6;
  if (originalGravity <= 1.09) {
    gravityFactor = 1;
  } else if (originalGravity <= 1.11) {
    gravityFactor = 0.9;
  } else if (originalGravity <= 1.13) {
    gravityFactor = 0.75;
  }
  return 10 * vigour * gravityFactor;
}

function findYeast(name: string): YeastProfile | undefined {
  const key = normalise(name);
  return YEASTS.find((y) => y.aliases.some((alias) => key.includes(alias)));
}

function findNutrient(names: string[]): NutrientProfile | undefined {
  for (const name of names) {
    const key = normalise(name);
    const match = NUTRIENTS.find((n) => n.aliases.some((alias) => key.includes(alias)));
    if (match) {
      return match;
    }
  }
  return undefined;
}

/** Lower-cases and strips accents, spaces and punctuation: "Côte des Blancs" -> "cotedesblancs". */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
