import { describe, expect, it } from 'vitest';
import {
  calculateAgeYears,
  calculateCalorieTargets
} from '@/lib/calculations/calorie-engine';
import {
  cmToFeetInches,
  feetInchesToCm,
  flOzToMl,
  kgToLbs,
  lbsToKg,
  mlToFlOz
} from '@/lib/calculations/units';

describe('Unit Conversions', () => {
  it('converts weight between kg and lbs accurately', () => {
    expect(kgToLbs(75)).toBe(165.3);
    expect(lbsToKg(165.3)).toBeCloseTo(74.98, 1);
  });

  it('converts height between cm and feet/inches accurately', () => {
    expect(cmToFeetInches(177.8)).toEqual({ feet: 5, inches: 10 });
    expect(feetInchesToCm(5, 10)).toBe(177.8);
  });

  it('converts hydration volumes between ml and fl oz', () => {
    expect(mlToFlOz(2500)).toBe(84.5);
    expect(flOzToMl(84.5)).toBe(2499);
  });

  it('rejects negative, zero, or NaN conversion inputs', () => {
    expect(() => kgToLbs(-5)).toThrow();
    expect(() => lbsToKg(0)).toThrow();
    expect(() => feetInchesToCm(5, 13)).toThrow();
    expect(() => mlToFlOz(Number.NaN)).toThrow();
  });
});

describe('Deterministic Calorie, BMR & TDEE Engine', () => {
  const refDate = new Date('2026-10-26T00:00:00Z');

  it('calculates exact Mifflin–St Jeor BMR and TDEE for adult male', () => {
    // Male, 30 yrs, 180 cm, 80 kg, moderately_active (1.55x)
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    // TDEE = 1780 * 1.55 = 2759
    const result = calculateCalorieTargets({
      dateOfBirth: '1996-05-10',
      heightCm: 180,
      weightKg: 80,
      sexForCalculation: 'male',
      activityLevel: 'moderately_active',
      fitnessGoal: 'maintenance',
      referenceDate: refDate
    });

    expect(result.ageYears).toBe(30);
    expect(result.isMinor).toBe(false);
    expect(result.bmr).toBe(1780);
    expect(result.tdee).toBe(2759);
    expect(result.targetCalories).toBe(2759);
    expect(result.macros.proteinG).toBeGreaterThanOrEqual(100);
    expect(result.macros.fiberG).toBeGreaterThanOrEqual(22);
  });

  it('calculates exact Mifflin–St Jeor BMR and safe fat-loss target for adult female', () => {
    // Female, 28 yrs, 162 cm, 62 kg, lightly_active (1.375x)
    // BMR = 620 + 1012.5 - 140 - 161 = 1331.5 -> 1332
    // TDEE = 1332 * 1.375 = 1831.5 -> 1832
    const result = calculateCalorieTargets({
      ageYears: 28,
      heightCm: 162,
      weightKg: 62,
      sexForCalculation: 'female',
      activityLevel: 'lightly_active',
      fitnessGoal: 'fat_loss',
      referenceDate: refDate
    });

    expect(result.bmr).toBe(1332);
    expect(result.tdee).toBe(1832);
    // 15% of 1832 = 275 -> 1557 kcal (above 1200 floor)
    expect(result.targetCalories).toBe(1557);
    expect(result.targetCalories).toBeGreaterThanOrEqual(1200);
  });

  it('uses midpoint constant (-78) when sex_for_calculation is unspecified', () => {
    const res = calculateCalorieTargets({
      ageYears: 25,
      heightCm: 170,
      weightKg: 70,
      sexForCalculation: 'unspecified',
      activityLevel: 'sedentary',
      fitnessGoal: 'maintenance',
      referenceDate: refDate
    });
    // 700 + 1062.5 - 125 - 78 = 1559.5 -> 1560
    expect(res.bmr).toBe(1560);
  });

  it('SAFETY: blocks adult weight-loss deficits for minors under 18', () => {
    const minorResult = calculateCalorieTargets({
      dateOfBirth: '2011-04-15', // 15 years old on 2026-10-26
      heightCm: 165,
      weightKg: 60,
      sexForCalculation: 'female',
      activityLevel: 'moderately_active',
      fitnessGoal: 'fat_loss',
      referenceDate: refDate
    });

    expect(minorResult.isMinor).toBe(true);
    expect(minorResult.inputsUsed.effectiveGoalApplied).toBe('general_fitness');
    expect(minorResult.targetCalories).toBeGreaterThanOrEqual(minorResult.tdee);
    expect(
      minorResult.safetyNotices.some((s) => s.includes('Under-18 Adolescent Safety Policy'))
    ).toBe(true);
  });

  it('SAFETY: enforces minimum calorie floor and prevents very-low-calorie diets', () => {
    const smallAdult = calculateCalorieTargets({
      ageYears: 62,
      heightCm: 148,
      weightKg: 44,
      sexForCalculation: 'female',
      activityLevel: 'sedentary',
      fitnessGoal: 'fat_loss',
      referenceDate: refDate
    });

    // TDEE is small (~1144), so target should never drop below TDEE when TDEE < 1200,
    // and for slightly higher TDEE (~1300) never drop below 1200.
    expect(smallAdult.targetCalories).toBeGreaterThanOrEqual(
      Math.min(smallAdult.tdee, 1200)
    );
  });

  it('rejects missing, invalid, or out-of-range biometric inputs', () => {
    expect(() => calculateAgeYears('2026-02-30', refDate)).toThrow();
    expect(() =>
      calculateCalorieTargets({
        ageYears: 25,
        heightCm: 40, // invalid
        weightKg: 70,
        sexForCalculation: 'male',
        activityLevel: 'sedentary',
        fitnessGoal: 'maintenance'
      })
    ).toThrow();
    expect(() =>
      calculateCalorieTargets({
        heightCm: 175,
        weightKg: 70,
        sexForCalculation: 'male',
        activityLevel: 'sedentary',
        fitnessGoal: 'maintenance'
      })
    ).toThrow();
  });
});
