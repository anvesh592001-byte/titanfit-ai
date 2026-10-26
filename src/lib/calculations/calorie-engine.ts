import type {
  ActivityLevel,
  CalorieCalculationInput,
  CalorieCalculationResult,
  FitnessGoal,
  SexForCalculation
} from '@/types/domain';
import { roundTo } from './units';

export const ACTIVITY_MULTIPLIERS: Record<
  ActivityLevel,
  { factor: number; label: string; description: string }
> = {
  sedentary: {
    factor: 1.2,
    label: 'Sedentary (1.20x)',
    description: 'Desk work or study with minimal planned exercise (< 4,000 steps/day).'
  },
  lightly_active: {
    factor: 1.375,
    label: 'Lightly Active (1.375x)',
    description: 'Light daily movement or 1–3 structured training sessions per week.'
  },
  moderately_active: {
    factor: 1.55,
    label: 'Moderately Active (1.55x)',
    description: '3–5 moderate workouts per week plus active daily walking.'
  },
  very_active: {
    factor: 1.725,
    label: 'Very Active (1.725x)',
    description: '6–7 demanding training sessions per week or physically active occupation.'
  },
  extra_active: {
    factor: 1.9,
    label: 'Extra Active (1.90x)',
    description: 'High-volume endurance/athletic training combined with physical labor.'
  }
};

export function calculateAgeYears(
  dateOfBirth: string,
  referenceDate: Date = new Date()
): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    throw new Error('dateOfBirth must be formatted as YYYY-MM-DD.');
  }
  const [yearStr, monthStr, dayStr] = dateOfBirth.split('-');
  const birthYear = Number(yearStr);
  const birthMonth = Number(monthStr);
  const birthDay = Number(dayStr);

  const dobCheck = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
  if (
    Number.isNaN(dobCheck.getTime()) ||
    dobCheck.getUTCFullYear() !== birthYear ||
    dobCheck.getUTCMonth() !== birthMonth - 1 ||
    dobCheck.getUTCDate() !== birthDay
  ) {
    throw new Error('Invalid calendar date for dateOfBirth.');
  }

  let age = referenceDate.getUTCFullYear() - birthYear;
  const monthDiff = referenceDate.getUTCMonth() + 1 - birthMonth;
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getUTCDate() < birthDay)) {
    age -= 1;
  }

  if (age < 10 || age > 110) {
    throw new Error('Age derived from dateOfBirth must be between 10 and 110 years.');
  }

  return age;
}

/**
 * Deterministic Calorie, BMR, TDEE, and Macronutrient Engine.
 * Uses Mifflin–St Jeor (1990) predictive resting energy expenditure equations,
 * transparent physical-activity multipliers, and strict safety floors.
 */
export function calculateCalorieTargets(
  input: CalorieCalculationInput
): CalorieCalculationResult {
  const referenceDate = input.referenceDate ?? new Date();

  if (
    typeof input.heightCm !== 'number' ||
    !Number.isFinite(input.heightCm) ||
    input.heightCm < 80 ||
    input.heightCm > 260
  ) {
    throw new Error('Height must be between 80 cm and 260 cm.');
  }

  if (
    typeof input.weightKg !== 'number' ||
    !Number.isFinite(input.weightKg) ||
    input.weightKg < 20 ||
    input.weightKg > 350
  ) {
    throw new Error('Weight must be between 20 kg and 350 kg.');
  }

  const activityMeta = ACTIVITY_MULTIPLIERS[input.activityLevel];
  if (!activityMeta) {
    throw new Error('Invalid activity level provided.');
  }

  let ageYears: number;
  if (input.dateOfBirth) {
    ageYears = calculateAgeYears(input.dateOfBirth, referenceDate);
  } else if (
    typeof input.ageYears === 'number' &&
    Number.isFinite(input.ageYears) &&
    input.ageYears >= 10 &&
    input.ageYears <= 110
  ) {
    ageYears = Math.floor(input.ageYears);
  } else {
    throw new Error('Valid age (10–110) or dateOfBirth is required.');
  }

  const sex: SexForCalculation = input.sexForCalculation ?? 'unspecified';
  if (!['male', 'female', 'unspecified'].includes(sex)) {
    throw new Error('sexForCalculation must be male, female, or unspecified.');
  }

  // Mifflin–St Jeor (1990) BMR
  const baseMetabolic = 10 * input.weightKg + 6.25 * input.heightCm - 5 * ageYears;
  let sexConstant = -78; // Midpoint between +5 (male) and -161 (female)
  let formulaConstantText = '- 78 (midpoint of +5 and -161)';
  if (sex === 'male') {
    sexConstant = 5;
    formulaConstantText = '+ 5';
  } else if (sex === 'female') {
    sexConstant = -161;
    formulaConstantText = '- 161';
  }

  const bmr = Math.round(baseMetabolic + sexConstant);
  const tdee = Math.round(bmr * activityMeta.factor);
  const maintenanceCalories = tdee;

  const isMinor = ageYears < 18;
  const safetyNotices: string[] = [];

  let effectiveGoal: FitnessGoal = input.fitnessGoal;
  let rawTargetCalories = tdee;

  if (isMinor) {
    // SAFETY REQUIREMENT: Never prescribe adult weight-loss deficits to users under 18.
    if (input.fitnessGoal === 'fat_loss' || input.fitnessGoal === 'recomposition') {
      effectiveGoal = 'general_fitness';
    }
    rawTargetCalories =
      effectiveGoal === 'muscle_gain' || effectiveGoal === 'endurance'
        ? Math.round(tdee + 200)
        : tdee;

    safetyNotices.push(
      'Under-18 Adolescent Safety Policy: Adult calorie-deficit weight-loss targets are disabled for individuals under 18 because growth, bone mineralization, and development require adequate energy and micronutrients. Guidance is set to balanced nourishment and active habits. Consult a pediatrician or registered dietitian for individualized clinical guidance.'
    );
  } else {
    switch (input.fitnessGoal) {
      case 'fat_loss': {
        // Moderate 15% deficit capped at 500 kcal/day — avoids extreme VLCDs
        const proposedDeficit = Math.min(500, Math.round(tdee * 0.15));
        rawTargetCalories = tdee - proposedDeficit;
        break;
      }
      case 'recomposition': {
        const proposedDeficit = Math.min(250, Math.round(tdee * 0.07));
        rawTargetCalories = tdee - proposedDeficit;
        break;
      }
      case 'muscle_gain': {
        const proposedSurplus = Math.min(350, Math.round(tdee * 0.1));
        rawTargetCalories = tdee + proposedSurplus;
        break;
      }
      case 'endurance': {
        const proposedSurplus = Math.min(400, Math.round(tdee * 0.12));
        rawTargetCalories = tdee + proposedSurplus;
        break;
      }
      case 'maintenance':
      case 'general_fitness':
      default:
        rawTargetCalories = tdee;
        break;
    }
  }

  // Enforce safe minimum energy floor (never prescribe Very Low-Calorie Diets < 1200/1500 kcal)
  const minimumSafeFloor =
    sex === 'male' ? 1500 : sex === 'female' ? 1200 : 1350;
  const bmrFloor = Math.round(bmr * 0.85);
  const absoluteFloor = isMinor ? tdee : Math.max(minimumSafeFloor, bmrFloor);

  let targetCalories = rawTargetCalories;
  if (targetCalories < absoluteFloor) {
    targetCalories = Math.min(tdee, absoluteFloor);
    safetyNotices.push(
      `Minimum Safe Intake Floor Applied: Target calories were raised to ${targetCalories} kcal/day to prevent an overly aggressive deficit or very-low-calorie diet.`
    );
  }

  // Always include medical / pregnancy / uncertainty educational guidance
  safetyNotices.push(
    'Medical & Life-Stage Notice: Do not use general predictive formulas during pregnancy, lactation, eating-disorder recovery, diabetes, renal disease, or cardiovascular conditions—seek individualized care from a qualified physician or registered dietitian.'
  );
  safetyNotices.push(
    'Activity Multiplier Guidance: Your selected activity multiplier already accounts for weekly exercise sessions. Avoid subtracting or adding workout smartwatch calories again to prevent double-counting.'
  );

  // Deterministic Macronutrient & Fiber Allocation
  let proteinPerKg = 1.6;
  if (isMinor) {
    proteinPerKg = 1.3;
  } else if (effectiveGoal === 'fat_loss' || effectiveGoal === 'recomposition') {
    proteinPerKg = 1.8;
  } else if (effectiveGoal === 'muscle_gain') {
    proteinPerKg = 1.8;
  } else if (effectiveGoal === 'endurance') {
    proteinPerKg = 1.5;
  } else {
    proteinPerKg = 1.4;
  }

  // Cap protein reasonably so very high body weights don't receive excessive protein prescriptions
  const maxReasonableProteinG = Math.round((targetCalories * 0.35) / 4);
  const proteinG = Math.min(
    maxReasonableProteinG,
    Math.max(45, Math.round(input.weightKg * proteinPerKg))
  );

  // Minimum healthy dietary fat (~27% of calories, floored at 0.7g/kg and at least 20% of kcal)
  const fatFromPct = (targetCalories * 0.27) / 9;
  const minFatG = Math.max((targetCalories * 0.2) / 9, input.weightKg * 0.65);
  const maxFatG = (targetCalories * 0.35) / 9;
  const fatG = Math.round(Math.min(maxFatG, Math.max(minFatG, fatFromPct)));

  const remainingCarbCalories = Math.max(0, targetCalories - proteinG * 4 - fatG * 9);
  const carbsG = Math.round(remainingCarbCalories / 4);

  // Institute of Medicine fiber guideline: 14g per 1,000 kcal (clamped 22–42g/day)
  const fiberG = Math.min(42, Math.max(22, Math.round((targetCalories / 1000) * 14)));

  const actualTotalMacroKcal = proteinG * 4 + carbsG * 4 + fatG * 9 || targetCalories;
  const proteinPct = roundTo(((proteinG * 4) / actualTotalMacroKcal) * 100, 0);
  const fatPct = roundTo(((fatG * 9) / actualTotalMacroKcal) * 100, 0);
  const carbsPct = Math.max(0, 100 - proteinPct - fatPct);

  const goalAdjustmentKcal = targetCalories - maintenanceCalories;
  const estimatedWeeklyEnergyDeltaKcal = goalAdjustmentKcal * 7;

  // Predictive equation uncertainty (~±10% individual metabolic variance)
  const uncertaintyRangeKcal = {
    low: Math.round(tdee * 0.9),
    high: Math.round(tdee * 1.1)
  };

  return {
    ageYears,
    isMinor,
    bmr,
    tdee,
    maintenanceCalories,
    targetCalories,
    activityMultiplier: activityMeta.factor,
    goalAdjustmentKcal,
    estimatedWeeklyEnergyDeltaKcal,
    uncertaintyRangeKcal,
    macros: {
      proteinG,
      carbsG,
      fatG,
      fiberG,
      proteinPct,
      carbsPct,
      fatPct
    },
    formulaName: 'Mifflin–St Jeor (1990) Predictive Equation',
    formulaExpression: `BMR = (10 × ${roundTo(input.weightKg, 1)} kg) + (6.25 × ${roundTo(input.heightCm, 1)} cm) - (5 × ${ageYears} yrs) ${formulaConstantText} = ${bmr} kcal/day; TDEE = ${bmr} × ${activityMeta.factor} = ${tdee} kcal/day`,
    inputsUsed: {
      ageYears,
      heightCm: roundTo(input.heightCm, 1),
      weightKg: roundTo(input.weightKg, 1),
      sexForCalculation: sex,
      activityLevel: input.activityLevel,
      fitnessGoal: input.fitnessGoal,
      effectiveGoalApplied: effectiveGoal
    },
    safetyNotices,
    uncertaintyExplanation:
      'Predictive equations estimate resting and daily expenditure within roughly ±10% for most individuals due to differences in lean body mass, non-exercise activity thermogenesis (NEAT), digestion, and metabolic adaptation. Use real-world 2–4 week body-weight trends rather than expecting a fixed weekly rate of change.',
    calculatedAtIso: referenceDate.toISOString()
  };
}
