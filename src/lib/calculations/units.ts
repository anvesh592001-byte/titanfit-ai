export function assertFinitePositive(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
}

export function roundTo(value: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function kgToLbs(kg: number): number {
  assertFinitePositive(kg, 'Weight (kg)');
  return roundTo(kg * 2.2046226218, 1);
}

export function lbsToKg(lbs: number): number {
  assertFinitePositive(lbs, 'Weight (lbs)');
  return roundTo(lbs / 2.2046226218, 2);
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  assertFinitePositive(cm, 'Height (cm)');
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  if (
    typeof feet !== 'number' ||
    typeof inches !== 'number' ||
    !Number.isFinite(feet) ||
    !Number.isFinite(inches) ||
    feet < 2 ||
    feet > 8 ||
    inches < 0 ||
    inches >= 12
  ) {
    throw new Error('Height must have feet between 2–8 and inches between 0–11.99.');
  }
  const totalInches = feet * 12 + inches;
  return roundTo(totalInches * 2.54, 1);
}

export function cmToInches(cm: number): number {
  assertFinitePositive(cm, 'Length (cm)');
  return roundTo(cm / 2.54, 1);
}

export function inchesToCm(inches: number): number {
  assertFinitePositive(inches, 'Length (inches)');
  return roundTo(inches * 2.54, 1);
}

export function mlToFlOz(ml: number): number {
  if (typeof ml !== 'number' || !Number.isFinite(ml) || ml < 0) {
    throw new Error('Volume (ml) must be a non-negative finite number.');
  }
  return roundTo(ml / 29.5735, 1);
}

export function flOzToMl(flOz: number): number {
  if (typeof flOz !== 'number' || !Number.isFinite(flOz) || flOz < 0) {
    throw new Error('Volume (fl oz) must be a non-negative finite number.');
  }
  return Math.round(flOz * 29.5735);
}
