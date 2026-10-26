import { describe, expect, it } from 'vitest';
import {
  generatePersonalizedWorkoutPlan,
  replaceExerciseInSchedule
} from '@/lib/workouts/workout-generator';

describe('Personalized Workout Generator', () => {
  it('generates a home bodyweight beginner plan respecting knee_pain & wrist limitations', () => {
    const schedule = generatePersonalizedWorkoutPlan({
      goal: 'fat_loss',
      experience: 'beginner',
      daysPerWeek: 3,
      sessionDurationMinutes: 35,
      location: 'home',
      equipment: ['bodyweight'],
      limitations: ['knee_pain', 'wrist']
    });

    expect(schedule.days).toHaveLength(7);
    const trainingDays = schedule.days.filter((d) => !d.isRestDay);
    expect(trainingDays).toHaveLength(3);

    for (const day of trainingDays) {
      expect(day.warmup.length).toBeGreaterThan(0);
      expect(day.cooldown.length).toBeGreaterThan(0);
      for (const ex of day.exercises) {
        // Squat and wrist push-ups should be excluded due to knee_pain and wrist limitations
        expect(ex.name.toLowerCase()).not.toContain('goblet squat');
        expect(ex.name.toLowerCase()).not.toContain('controlled push-up');
      }
    }
  });

  it('preserves at least 1 recovery day even if user requests 7 days/week and supports exercise swaps', () => {
    const schedule = generatePersonalizedWorkoutPlan({
      goal: 'muscle_gain',
      experience: 'intermediate',
      daysPerWeek: 7,
      sessionDurationMinutes: 50,
      location: 'gym',
      equipment: ['barbell', 'dumbbells', 'pullup_bar']
    });

    const restDays = schedule.days.filter((d) => d.isRestDay);
    expect(restDays.length).toBeGreaterThanOrEqual(1);

    const day1 = schedule.days.find((d) => !d.isRestDay)!;
    const ex0 = day1.exercises[0]!;
    const swapped = replaceExerciseInSchedule(schedule, day1.dayNumber, ex0.id);
    const updatedEx0 = swapped.days.find((d) => d.dayNumber === day1.dayNumber)!.exercises[0]!;
    expect(updatedEx0.name).not.toBe(ex0.name);
  });
});
