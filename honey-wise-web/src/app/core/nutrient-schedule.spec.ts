import { NutrientScheduleInput, gravityToBrix, suggestNutrientSchedule } from './nutrient-schedule';

/** 1 US gallon at a starting gravity of 1.100 (35 points per pound per gallon). */
const BASE: NutrientScheduleInput = {
  yeastName: 'Lalvin 71B',
  honeyWeight: 100 / 35,
  honeyUnit: 'lb',
  batchSize: 1,
  batchSizeUnit: 'gal',
  nutrientNames: ['Fermaid O'],
};

describe('suggestNutrientSchedule', () => {
  it('converts gravity to Brix', () => {
    expect(gravityToBrix(1.1)).toBeCloseTo(23.8, 1);
    expect(gravityToBrix(1.12)).toBeCloseTo(28.1, 1);
  });

  it('reproduces the TOSNA dose for a low-nitrogen strain with Fermaid O', () => {
    const result = suggestNutrientSchedule(BASE);
    if (result.status !== 'ok') {
      return fail(`expected ok, got ${result.status}`);
    }

    expect(result.yeastKnown).toBeTrue();
    expect(result.nitrogenClass).toBe('low');
    expect(result.originalGravity).toBeCloseTo(1.1, 3);
    expect(result.targetNitrogenPpm).toBeCloseTo(178, 0);
    expect(result.totalGrams).toBeCloseTo(3.57, 2);
    expect(result.thirdBreakGravity).toBeCloseTo(1.067, 3);

    expect(result.additions.map((a) => a.hoursAfterPitch)).toEqual([24, 48, 72, 96]);
    expect(result.additions.map((a) => a.waitMinutes)).toEqual([1440, 1440, 1440, 1440]);
    expect(result.additions.map((a) => a.estimated)).toEqual([false, false, false, true]);
    expect(result.additions[0].grams).toBeCloseTo(0.89, 2);
    expect(result.additions[3].triggerGravity).toBeCloseTo(1.067, 3);
  });

  it('gives the same answer in metric units', () => {
    const metric = suggestNutrientSchedule({
      ...BASE,
      honeyWeight: (100 / 35) * 0.45359237,
      honeyUnit: 'kg',
      batchSize: 3.78541,
      batchSizeUnit: 'L',
    });
    if (metric.status !== 'ok') {
      return fail(`expected ok, got ${metric.status}`);
    }
    expect(metric.originalGravity).toBeCloseTo(1.1, 3);
    expect(metric.totalGrams).toBeCloseTo(3.57, 2);
  });

  it('asks for more nitrogen for a high-demand strain', () => {
    const low = suggestNutrientSchedule(BASE);
    const high = suggestNutrientSchedule({ ...BASE, yeastName: 'Lalvin BM4x4' });
    if (low.status !== 'ok' || high.status !== 'ok') {
      return fail('expected both ok');
    }
    expect(high.nitrogenClass).toBe('high');
    expect(high.totalGrams / low.totalGrams).toBeCloseTo(1.25 / 0.75, 5);
  });

  it('treats an unlisted yeast as medium demand and says so', () => {
    const result = suggestNutrientSchedule({ ...BASE, yeastName: 'Wyeast Sweet Mead' });
    if (result.status !== 'ok') {
      return fail(`expected ok, got ${result.status}`);
    }
    expect(result.yeastKnown).toBeFalse();
    expect(result.nitrogenClass).toBe('medium');
  });

  it('splits DAP into thirds, in order, and warns above the maximum dose', () => {
    const result = suggestNutrientSchedule({ ...BASE, nutrientNames: ['DAP'] });
    if (result.status !== 'ok') {
      return fail(`expected ok, got ${result.status}`);
    }
    const hours = result.additions.map((a) => a.hoursAfterPitch);
    expect(hours.length).toBe(3);
    expect(hours[0]).toBe(24);
    expect(hours[1]).toBeGreaterThan(hours[0]);
    expect(hours[2]).toBeGreaterThan(hours[1]);
    // The 2/3 break (1.033) arrives just before 9% ABV at this gravity, so it sets the last trigger.
    expect(result.additions[1].triggerGravity).toBeCloseTo(1.067, 3);
    expect(result.additions[2].triggerGravity).toBeCloseTo(1.033, 3);
    expect(result.warnings).toEqual([]);

    const fermaidK = suggestNutrientSchedule({ ...BASE, nutrientNames: ['Fermaid K'] });
    if (fermaidK.status !== 'ok') {
      return fail(`expected ok, got ${fermaidK.status}`);
    }
    expect(fermaidK.warnings.some((w) => w.includes('usual maximum'))).toBeTrue();
  });

  it('skips nutrients it has no dose for and uses the first it recognises', () => {
    const result = suggestNutrientSchedule({ ...BASE, nutrientNames: ['Go-Ferm', 'Fermaid O'] });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.nutrient).toBe('Fermaid O');
    }
  });

  it('reports an unsupported nutrient', () => {
    const result = suggestNutrientSchedule({ ...BASE, nutrientNames: ['Raisins'] });
    expect(result.status).toBe('unsupported');
  });

  it('lists what is missing', () => {
    const result = suggestNutrientSchedule({
      yeastName: '',
      honeyWeight: null,
      honeyUnit: 'lb',
      batchSize: null,
      batchSizeUnit: 'gal',
      nutrientNames: [],
    });
    expect(result).toEqual({
      status: 'incomplete',
      missing: ['yeast type', 'honey weight', 'batch size', 'a nutrient ingredient'],
    });
  });
});
