import { z } from 'zod';
import type {
  CalorieCalculationResult,
  FoodItem,
  ProfileRow,
  UserPreferencesRow
} from '@/types/domain';
import { VERIFIED_FOODS } from '@/lib/nutrition/verified-foods';

export interface LlmRuntimeConfig {
  isConfigured: boolean;
  model: string;
  baseUrl: string;
}

export function getLlmRuntimeConfig(): LlmRuntimeConfig {
  const apiKey = (process.env.LLM_API_KEY ?? '').trim();
  const model = (process.env.LLM_MODEL ?? 'gpt-4o-mini').trim() || 'gpt-4o-mini';
  const baseUrl = (
    process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1'
  )
    .trim()
    .replace(/\/+$/, '');

  return {
    isConfigured: apiKey.length >= 8,
    model,
    baseUrl
  };
}

export function matchFoodsForPrompt(
  queryText: string,
  catalog: FoodItem[] = VERIFIED_FOODS
): FoodItem[] {
  const lowered = queryText.toLowerCase();
  const tokens = lowered
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

  if (tokens.length === 0) return [];

  const scored = catalog
    .map((food) => {
      const nameLower = food.name.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (nameLower.includes(token)) score += 2;
        if (food.category.toLowerCase().includes(token)) score += 1;
      }
      return { food, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.food);

  return scored;
}

export interface AuthorizedCoachContext {
  profile: Pick<
    ProfileRow,
    | 'fitness_goal'
    | 'activity_level'
    | 'dietary_preference'
    | 'preferred_units'
    | 'country'
    | 'food_budget'
  > | null;
  preferences: Pick<
    UserPreferencesRow,
    | 'allergies'
    | 'excluded_foods'
    | 'meals_per_day'
    | 'workout_location'
    | 'equipment'
    | 'training_experience'
    | 'workout_days_per_week'
    | 'session_duration_minutes'
  > | null;
  deterministicTargets: CalorieCalculationResult | null;
  recentSummary: {
    loggedFoodDaysLast7: number;
    avgDailyCaloriesLast7: number | null;
    avgDailyProteinGLast7: number | null;
    workoutsCompletedLast14: number;
    latestWeightKg: number | null;
    avgSleepHoursLast7: number | null;
    avgStepsLast7: number | null;
  };
  matchedVerifiedFoods: FoodItem[];
}

const openAiCompatibleResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().min(1)
        })
      })
    )
    .min(1)
});

export function buildCoachSystemPrompt(ctx: AuthorizedCoachContext): string {
  const calcSection = ctx.deterministicTargets
    ? [
        `DETERMINISTIC CALCULATED TARGETS (Mifflin–St Jeor — NEVER alter or invent different numbers):`,
        `- Age group: ${ctx.deterministicTargets.isMinor ? 'Under 18 (Adolescent — NO weight-loss deficits permitted)' : `${ctx.deterministicTargets.ageYears} yrs (Adult)`}`,
        `- BMR: ${ctx.deterministicTargets.bmr} kcal/day`,
        `- TDEE / Maintenance: ${ctx.deterministicTargets.tdee} kcal/day (uncertainty range ${ctx.deterministicTargets.uncertaintyRangeKcal.low}–${ctx.deterministicTargets.uncertaintyRangeKcal.high} kcal)`,
        `- Daily Target Calories: ${ctx.deterministicTargets.targetCalories} kcal/day`,
        `- Daily Macro Targets: Protein ${ctx.deterministicTargets.macros.proteinG}g, Carbs ${ctx.deterministicTargets.macros.carbsG}g, Fat ${ctx.deterministicTargets.macros.fatG}g, Fiber ${ctx.deterministicTargets.macros.fiberG}g`
      ].join('\n')
    : 'DETERMINISTIC CALCULATED TARGETS: User has not completed profile onboarding yet. Encourage completing onboarding or using the Calorie Calculator for exact targets.';

  const prefSection = ctx.profile
    ? [
        `AUTHORIZED USER CONTEXT (minimized — no PII sent):`,
        `- Goal: ${ctx.profile.fitness_goal}, Activity: ${ctx.profile.activity_level}`,
        `- Diet: ${ctx.profile.dietary_preference}, Country/Region: ${ctx.profile.country}`,
        `- Hard Allergies: ${ctx.preferences?.allergies?.join(', ') || 'None recorded'}`,
        `- Excluded Foods: ${ctx.preferences?.excluded_foods?.join(', ') || 'None recorded'}`,
        `- Training: ${ctx.preferences?.training_experience ?? 'beginner'}, ${ctx.preferences?.workout_days_per_week ?? 3} days/wk at ${ctx.preferences?.workout_location ?? 'home/gym'} (${ctx.preferences?.session_duration_minutes ?? 45} min)`
      ].join('\n')
    : 'AUTHORIZED USER CONTEXT: Profile not yet saved.';

  const logSection = [
    `RECENT LOGGED SUMMARY (from authenticated Supabase records):`,
    `- Food logs in last 7 days: ${ctx.recentSummary.loggedFoodDaysLast7} days` +
      (ctx.recentSummary.avgDailyCaloriesLast7 !== null
        ? ` (avg ${ctx.recentSummary.avgDailyCaloriesLast7} kcal/day, ${ctx.recentSummary.avgDailyProteinGLast7 ?? 0}g protein/day)`
        : ''),
    `- Completed workouts in last 14 days: ${ctx.recentSummary.workoutsCompletedLast14}`,
    `- Avg sleep (last 7d): ${ctx.recentSummary.avgSleepHoursLast7 ?? 'Not logged'} hrs | Avg steps: ${ctx.recentSummary.avgStepsLast7 ?? 'Not logged'}`
  ].join('\n');

  const foodSection =
    ctx.matchedVerifiedFoods.length > 0
      ? [
          `VERIFIED DATABASE FOODS MATCHING QUERY (per 100g edible portion):`,
          ...ctx.matchedVerifiedFoods.map(
            (f) =>
              `- ${f.name} [${f.source}:${f.source_food_id}]: ${f.calories_per_100g} kcal, P ${f.protein_per_100g}g, C ${f.carbs_per_100g}g, F ${f.fat_per_100g}g, Fiber ${f.fiber_per_100g ?? 'N/A'}g (std serving ${f.serving_size_g}g)`
          )
        ].join('\n')
      : 'VERIFIED DATABASE FOODS MATCHING QUERY: None specifically matched in message; do not invent exact per-100g lab values for unverified items.';

  return [
    `You are TitanFit AI Coach — an evidence-based, supportive fitness and nutrition coach.`,
    `STRICT OPERATING RULES:`,
    `1. Clearly distinguish between (a) Calculated deterministic values from the user's profile, (b) Verified food database values provided below, and (c) General educational coaching suggestions.`,
    `2. NEVER invent calorie/macro totals or override the deterministic BMR/TDEE numbers above.`,
    `3. Respect hard allergies and dietary preferences strictly in every meal suggestion.`,
    `4. SAFETY BOUNDARIES: Never diagnose medical conditions, never prescribe medications, never recommend unregulated/unsafe fat-burners or performance-enhancing drugs, never advise training through joint/sharp pain, and never prescribe weight-loss deficits to minors under 18. Direct medical, pregnancy, injury, or clinical questions to a physician, physiotherapist, or registered dietitian.`,
    `5. Keep responses structured, concise, actionable, and free of body-shaming or guaranteed weight-loss promises.`,
    '',
    calcSection,
    '',
    prefSection,
    '',
    logSection,
    '',
    foodSection
  ].join('\n');
}

export async function generateCoachReply(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: AuthorizedCoachContext;
}): Promise<{
  reply: string;
  modelUsed: string;
  referencedFoods: Array<{
    name: string;
    source: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    servingSizeG: number;
    servingCalories: number;
  }>;
}> {
  const apiKey = (process.env.LLM_API_KEY ?? '').trim();
  const { isConfigured, model, baseUrl } = getLlmRuntimeConfig();

  if (!isConfigured) {
    const err = new Error(
      'AI Coach LLM provider is not configured. Set LLM_API_KEY and LLM_MODEL in your server environment (.env.local) to enable live AI chat.'
    );
    (err as Error & { code?: string }).code = 'LLM_NOT_CONFIGURED';
    throw err;
  }

  const systemPrompt = buildCoachSystemPrompt(params.context);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 900,
        messages: [
          { role: 'system', content: systemPrompt },
          ...params.history.slice(-8),
          { role: 'user', content: params.message }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `LLM provider returned HTTP ${response.status}. Verify LLM_API_KEY, LLM_MODEL, and provider quota.`
      );
    }

    const rawJson: unknown = await response.json();
    const parsed = openAiCompatibleResponseSchema.safeParse(rawJson);
    if (!parsed.success) {
      throw new Error('Received an unexpected response format from the configured LLM provider.');
    }

    return {
      reply: parsed.data.choices[0]!.message.content.trim(),
      modelUsed: model,
      referencedFoods: params.context.matchedVerifiedFoods.map((f) => ({
        name: f.name,
        source: `${f.source}${f.source_food_id ? ` (${f.source_food_id})` : ''}`,
        caloriesPer100g: f.calories_per_100g,
        proteinPer100g: f.protein_per_100g,
        servingSizeG: f.serving_size_g,
        servingCalories: Math.round(
          (f.calories_per_100g * f.serving_size_g) / 100
        )
      }))
    };
  } finally {
    clearTimeout(timeout);
  }
}
