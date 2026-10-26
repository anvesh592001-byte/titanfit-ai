import { z } from 'zod';

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date in YYYY-MM-DD format')
  .refine((val) => {
    const parsed = new Date(`${val}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime());
  }, 'Invalid calendar date');

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Full name is required')
      .max(120, 'Full name cannot exceed 120 characters'),
    email: z.string().trim().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    acceptDisclaimer: z.literal(true, {
      errorMap: () => ({
        message: 'You must acknowledge the privacy policy & health disclaimer'
      })
    })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(128)
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address')
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export const sexForCalculationSchema = z
  .enum(['male', 'female', 'unspecified'])
  .nullable();

export const fitnessGoalSchema = z.enum([
  'fat_loss',
  'muscle_gain',
  'maintenance',
  'recomposition',
  'endurance',
  'general_fitness'
]);

export const activityLevelSchema = z.enum([
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extra_active'
]);

export const dietaryPreferenceSchema = z.enum([
  'omnivore',
  'vegetarian',
  'vegan',
  'eggetarian',
  'pescatarian'
]);

export const preferredUnitsSchema = z.enum(['metric', 'imperial']);

export const workoutLocationSchema = z.enum(['gym', 'home', 'outdoor', 'hybrid']);

export const trainingExperienceSchema = z.enum([
  'beginner',
  'intermediate',
  'advanced'
]);

export const profileUpsertSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(120),
  date_of_birth: isoDateSchema.refine((dob) => {
    const d = new Date(`${dob}T00:00:00Z`);
    const now = new Date();
    return d <= now && d >= new Date('1905-01-01T00:00:00Z');
  }, 'Date of birth must be in the past and after 1905'),
  height_cm: z.number().min(80, 'Height must be at least 80 cm').max(260, 'Height cannot exceed 260 cm'),
  weight_kg: z.number().min(20, 'Weight must be at least 20 kg').max(350, 'Weight cannot exceed 350 kg'),
  sex_for_calculation: sexForCalculationSchema.optional().default('unspecified'),
  fitness_goal: fitnessGoalSchema,
  activity_level: activityLevelSchema,
  dietary_preference: dietaryPreferenceSchema,
  preferred_units: preferredUnitsSchema.default('metric'),
  country: z.string().trim().min(2).max(64).default('IN'),
  food_budget: z.number().min(0).max(1000000).nullable().optional().default(null)
});

export const userPreferencesUpsertSchema = z.object({
  allergies: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  excluded_foods: z.array(z.string().trim().min(1).max(60)).max(50).default([]),
  preferred_foods: z.array(z.string().trim().min(1).max(60)).max(50).default([]),
  meals_per_day: z.number().int().min(2).max(7).default(4),
  workout_location: workoutLocationSchema.default('gym'),
  equipment: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  training_experience: trainingExperienceSchema.default('beginner'),
  workout_days_per_week: z.number().int().min(1).max(7).default(4),
  session_duration_minutes: z.number().int().min(15).max(180).default(45),
  exercise_limitations: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([])
});

export const onboardingPayloadSchema = z.object({
  profile: profileUpsertSchema,
  preferences: userPreferencesUpsertSchema
});

export const calorieCalculatorSchema = z
  .object({
    dateOfBirth: isoDateSchema.optional(),
    ageYears: z.number().int().min(10).max(110).optional(),
    heightCm: z.number().min(80).max(260),
    weightKg: z.number().min(20).max(350),
    sexForCalculation: sexForCalculationSchema.default('unspecified'),
    activityLevel: activityLevelSchema,
    fitnessGoal: fitnessGoalSchema
  })
  .refine((data) => Boolean(data.dateOfBirth || data.ageYears !== undefined), {
    message: 'Either dateOfBirth or ageYears must be provided',
    path: ['ageYears']
  });

export const customFoodCreateSchema = z.object({
  name: z.string().trim().min(1, 'Food name is required').max(200),
  brand: z.string().trim().max(120).nullable().optional().default(null),
  category: z.string().trim().min(1).max(80).default('Custom Foods'),
  serving_size_g: z.number().positive('Serving size must be > 0g').max(2000),
  calories_per_100g: z.number().min(0).max(950),
  protein_per_100g: z.number().min(0).max(100),
  carbs_per_100g: z.number().min(0).max(100),
  fat_per_100g: z.number().min(0).max(100),
  fiber_per_100g: z.number().min(0).max(100).nullable().optional().default(null)
});

export const foodLogCreateSchema = z.object({
  food_id: z.string().uuid().nullable().optional().default(null),
  food_name_snapshot: z.string().trim().min(1).max(200),
  log_date: isoDateSchema,
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']),
  quantity_g: z.number().positive('Quantity must be greater than 0g').max(5000),
  calories_per_100g: z.number().min(0).max(950),
  protein_per_100g: z.number().min(0).max(100),
  carbs_per_100g: z.number().min(0).max(100),
  fat_per_100g: z.number().min(0).max(100),
  fiber_per_100g: z.number().min(0).max(100).nullable().optional().default(null)
});

export const foodLogUpdateSchema = z.object({
  id: z.string().uuid(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']).optional(),
  quantity_g: z.number().positive().max(5000)
});

export const mealPlanSaveSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  plan_date: isoDateSchema.nullable().optional().default(null),
  plan_type: z.enum(['daily', 'weekly']),
  target_calories: z.number().min(800).max(10000),
  plan_data: z.record(z.unknown())
});

export const workoutPlanSaveSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  goal: fitnessGoalSchema,
  difficulty: trainingExperienceSchema,
  schedule_data: z.record(z.unknown())
});

export const exerciseLogInputSchema = z.object({
  exercise_name: z.string().trim().min(1).max(160),
  sets: z.number().int().min(1).max(50).nullable().optional().default(null),
  reps: z.number().int().min(1).max(500).nullable().optional().default(null),
  weight_kg: z.number().min(0).max(1000).nullable().optional().default(null),
  duration_seconds: z.number().int().min(0).max(36000).nullable().optional().default(null)
});

export const workoutLogCreateSchema = z.object({
  workout_plan_id: z.string().uuid().nullable().optional().default(null),
  workout_name: z.string().trim().min(1).max(160),
  workout_date: isoDateSchema,
  duration_minutes: z.number().int().min(0).max(600),
  notes: z.string().trim().max(2000).nullable().optional().default(null),
  completed: z.boolean().default(true),
  exercises: z.array(exerciseLogInputSchema).max(40).default([])
});

export const progressLogUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  log_date: isoDateSchema,
  weight_kg: z.number().min(20).max(350).nullable().optional(),
  waist_cm: z.number().min(35).max(250).nullable().optional(),
  steps: z.number().int().min(0).max(150000).nullable().optional(),
  sleep_hours: z.number().min(0).max(24).nullable().optional(),
  water_ml: z.number().int().min(0).max(15000).nullable().optional(),
  energy_level: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional()
});

export const habitCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  habit_type: z
    .enum(['hydration', 'nutrition', 'movement', 'sleep', 'recovery', 'mindfulness', 'custom'])
    .default('custom')
});

export const habitToggleSchema = z.object({
  habit_id: z.string().uuid(),
  log_date: isoDateSchema,
  completed: z.boolean()
});

export const groceryListSaveSchema = z.object({
  id: z.string().uuid().optional(),
  meal_plan_id: z.string().uuid().nullable().optional().default(null),
  title: z.string().trim().min(1).max(160),
  items: z.array(
    z.object({
      id: z.string().min(1).max(100),
      foodId: z.string().nullable(),
      name: z.string().trim().min(1).max(200),
      category: z.string().trim().min(1).max(80),
      totalQuantityG: z.number().positive().max(100000),
      displayApproxNote: z.string().max(200),
      isQuantityVerified: z.boolean(),
      purchased: z.boolean(),
      estimatedPriceNote: z.string().max(200).nullable()
    })
  )
});

export const aiCoachRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Enter a question for your coach')
    .max(2000, 'Message cannot exceed 2,000 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(3000)
      })
    )
    .max(10)
    .optional()
    .default([])
});

export const accountDeleteSchema = z.object({
  confirmationText: z.literal('DELETE MY ACCOUNT', {
    errorMap: () => ({
      message: 'Please type DELETE MY ACCOUNT exactly to confirm permanent deletion.'
    })
  })
});
