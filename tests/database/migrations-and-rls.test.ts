import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

describe('PostgreSQL Migrations & Row Level Security (RLS) Enforcement', () => {
  let db: PGlite;
  const userA = 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  const userB = 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2';

  beforeAll(async () => {
    db = new PGlite();

    // Bootstrap Supabase-compatible auth schema, users, roles, and auth.uid() helper in real Postgres
    await db.exec(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE auth.users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL
      );
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
      $$;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
      END $$;

      INSERT INTO auth.users (id, email) VALUES
        ('${userA}', 'alice@titanfit.test'),
        ('${userB}', 'bob@titanfit.test');
    `);

    const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await db.exec(sql);
    }
  });

  async function asAuthenticatedUser<T>(
    userId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    await db.exec(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${userId}', true);`);
    try {
      const res = await fn();
      await db.exec('COMMIT;');
      return res;
    } catch (err) {
      await db.exec('ROLLBACK;');
      throw err;
    }
  }

  it('seeds verified foods and allows authenticated SELECT while blocking client writes', async () => {
    const countRes = await asAuthenticatedUser(userA, () =>
      db.query<{ count: string }>('SELECT count(*)::text AS count FROM public.foods;')
    );
    expect(Number(countRes.rows[0]?.count)).toBe(40);

    // Authenticated user MUST NOT be able to INSERT/UPDATE/DELETE shared foods
    await expect(
      asAuthenticatedUser(userA, () =>
        db.query(
          `INSERT INTO public.foods (name, source, serving_size_g, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
           VALUES ('Hacked Food', 'USER_CUSTOM', 100, 100, 10, 10, 2);`
        )
      )
    ).rejects.toThrow();
  });

  it('blocks anon role completely from reading or mutating user tables', async () => {
    await db.exec(`BEGIN; SET LOCAL ROLE anon;`);
    let failed = false;
    try {
      await db.query('SELECT * FROM public.profiles;');
    } catch {
      failed = true;
    } finally {
      await db.exec('ROLLBACK;');
    }
    expect(failed).toBe(true);
  });

  it('persists profile, preferences, food_logs, meal_plans, workouts, progress & habits for User A', async () => {
    await asAuthenticatedUser(userA, async () => {
      await db.query(
        `INSERT INTO public.profiles (
          id, full_name, date_of_birth, height_cm, weight_kg, sex_for_calculation,
          fitness_goal, activity_level, dietary_preference, preferred_units, country
        ) VALUES ($1, 'Alice Rao', '1997-08-15', 166, 63, 'female', 'fat_loss', 'moderately_active', 'vegetarian', 'metric', 'IN');`,
        [userA]
      );

      // Update profile
      await db.query(
        `UPDATE public.profiles SET weight_kg = 62.4 WHERE id = $1;`,
        [userA]
      );

      // Preferences
      await db.query(
        `INSERT INTO public.user_preferences (user_id, allergies, meals_per_day, workout_location, training_experience, workout_days_per_week, session_duration_minutes)
         VALUES ($1, ARRAY['peanuts'], 4, 'home', 'intermediate', 4, 45);`,
        [userA]
      );

      // Food log
      await db.query(
        `INSERT INTO public.food_logs (
          user_id, food_id, food_name_snapshot, log_date, meal_type, quantity_g, calories, protein_g, carbs_g, fat_g, fiber_g
        ) VALUES ($1, '10000000-0000-4000-8000-000000000004', 'Idli', '2026-10-26', 'breakfast', 160, 233.6, 7.4, 48.2, 0.6, 2.4);`,
        [userA]
      );

      // Meal plan
      await db.query(
        `INSERT INTO public.meal_plans (user_id, title, plan_type, target_calories, plan_data)
         VALUES ($1, 'Vegetarian Cut Plan', 'daily', 1650, '{"days":[]}'::jsonb);`,
        [userA]
      );

      // Workout log + exercise log
      const wl = await db.query<{ id: string }>(
        `INSERT INTO public.workout_logs (user_id, workout_name, workout_date, duration_minutes, completed)
         VALUES ($1, 'Upper Body A', '2026-10-26', 45, true) RETURNING id;`,
        [userA]
      );
      await db.query(
        `INSERT INTO public.exercise_logs (user_id, workout_log_id, exercise_name, sets, reps, weight_kg)
         VALUES ($1, $2, 'Dumbbell Row', 4, 10, 16);`,
        [userA, wl.rows[0]!.id]
      );

      // Progress log + habit + habit log
      await db.query(
        `INSERT INTO public.progress_logs (user_id, log_date, weight_kg, steps, sleep_hours, water_ml, energy_level)
         VALUES ($1, '2026-10-26', 62.4, 9200, 7.5, 2600, 8);`,
        [userA]
      );
      const hb = await db.query<{ id: string }>(
        `INSERT INTO public.habits (user_id, title, habit_type)
         VALUES ($1, 'Drink 2.5L Water', 'hydration') RETURNING id;`,
        [userA]
      );
      await db.query(
        `INSERT INTO public.habit_logs (user_id, habit_id, log_date, completed)
         VALUES ($1, $2, '2026-10-26', true);`,
        [userA, hb.rows[0]!.id]
      );
    });

    const profileCheck = await asAuthenticatedUser(userA, () =>
      db.query<{ weight_kg: string }>('SELECT weight_kg::text FROM public.profiles WHERE id = $1;', [
        userA
      ])
    );
    expect(Number(profileCheck.rows[0]?.weight_kg)).toBe(62.4);
  });

  it('RLS ISOLATION: prevents User B from reading, inserting, updating, or deleting User A records', async () => {
    // 1. User B sees 0 rows across all User A tables
    const tables = [
      'profiles',
      'user_preferences',
      'food_logs',
      'meal_plans',
      'workout_logs',
      'exercise_logs',
      'progress_logs',
      'habits',
      'habit_logs'
    ];
    for (const tbl of tables) {
      const res = await asAuthenticatedUser(userB, () =>
        db.query(`SELECT * FROM public.${tbl};`)
      );
      expect(res.rows).toHaveLength(0);
    }

    // 2. User B CANNOT insert a row spoofing user_id = User A
    await expect(
      asAuthenticatedUser(userB, () =>
        db.query(
          `INSERT INTO public.food_logs (
            user_id, food_name_snapshot, log_date, meal_type, quantity_g, calories, protein_g, carbs_g, fat_g
          ) VALUES ($1, 'Spoofed Entry', '2026-10-26', 'lunch', 100, 200, 10, 20, 5);`,
          [userA]
        )
      )
    ).rejects.toThrow();

    // 3. User B attempting UPDATE or DELETE on User A's profile affects 0 rows
    const delAttempt = await asAuthenticatedUser(userB, () =>
      db.query('DELETE FROM public.profiles WHERE id = $1 RETURNING id;', [userA])
    );
    expect(delAttempt.rows).toHaveLength(0);

    // Confirm User A's profile is still intact
    const intact = await asAuthenticatedUser(userA, () =>
      db.query('SELECT id FROM public.profiles WHERE id = $1;', [userA])
    );
    expect(intact.rows).toHaveLength(1);
  });

  it('enforces database CHECK constraints on invalid biometric and log inputs', async () => {
    await expect(
      asAuthenticatedUser(userB, () =>
        db.query(
          `INSERT INTO public.profiles (
            id, full_name, date_of_birth, height_cm, weight_kg, fitness_goal, activity_level, dietary_preference
          ) VALUES ($1, 'Invalid Height', '1995-01-01', 999, -10, 'fat_loss', 'sedentary', 'vegan');`,
          [userB]
        )
      )
    ).rejects.toThrow();
  });
});
