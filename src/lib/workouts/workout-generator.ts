import type {
  FitnessGoal,
  PlannedExercise,
  PlannedWorkoutDay,
  TrainingExperience,
  WorkoutLocation,
  WorkoutScheduleData
} from '@/types/domain';

interface ExerciseCatalogEntry {
  id: string;
  name: string;
  pattern: 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'mobility';
  targetMuscles: string[];
  requiredEquipment: string; // 'bodyweight' | 'dumbbells' | 'barbell' | 'machines' | 'resistance_bands' | 'pullup_bar' | 'kettlebell'
  locations: WorkoutLocation[];
  minExperience: TrainingExperience;
  contraindications: string[]; // 'knee_pain' | 'lower_back' | 'shoulder' | 'wrist' | 'high_impact'
  defaultSets: Record<TrainingExperience, number>;
  defaultReps: Record<FitnessGoal, string>;
  durationSeconds?: number;
  restSeconds: number;
  instructions: string[];
  alternatives: string[];
}

const EXERCISE_CATALOG: ExerciseCatalogEntry[] = [
  // PUSH
  {
    id: 'ex-barbell-bench',
    name: 'Barbell Flat Bench Press',
    pattern: 'push',
    targetMuscles: ['Chest', 'Anterior Deltoids', 'Triceps'],
    requiredEquipment: 'barbell',
    locations: ['gym', 'hybrid'],
    minExperience: 'intermediate',
    contraindications: ['shoulder'],
    defaultSets: { beginner: 3, intermediate: 4, advanced: 4 },
    defaultReps: {
      fat_loss: '8–10',
      muscle_gain: '6–10',
      maintenance: '8–10',
      recomposition: '6–10',
      endurance: '12–15',
      general_fitness: '8–12'
    },
    restSeconds: 120,
    instructions: [
      'Retract shoulder blades firmly into the bench and plant both feet flat on the floor.',
      'Lower the bar under 2-second control to mid-sternum with elbows tucked ~45°.',
      'Press smoothly back to lockout while exhaling without bouncing off the chest.'
    ],
    alternatives: ['Dumbbell Floor or Incline Press', 'Push-Ups (Elevated or Standard)']
  },
  {
    id: 'ex-db-incline-press',
    name: 'Dumbbell Incline / Neutral-Grip Press',
    pattern: 'push',
    targetMuscles: ['Upper Chest', 'Shoulders', 'Triceps'],
    requiredEquipment: 'dumbbells',
    locations: ['gym', 'home', 'hybrid'],
    minExperience: 'beginner',
    contraindications: [],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 4 },
    defaultReps: {
      fat_loss: '10–12',
      muscle_gain: '8–12',
      maintenance: '8–12',
      recomposition: '8–12',
      endurance: '12–15',
      general_fitness: '10–12'
    },
    restSeconds: 90,
    instructions: [
      'Set bench to 30° incline (or lie flat on a mat for floor press if shoulder-sensitive).',
      'Use a 30–45° neutral-angled grip to keep shoulder joints comfortable.',
      'Lower with control and press dumbbells upward without clanging them together.'
    ],
    alternatives: ['Incline Hands-Elevated Push-Up', 'Resistance Band Chest Press']
  },
  {
    id: 'ex-pushup-progression',
    name: 'Controlled Push-Up (Incline or Floor)',
    pattern: 'push',
    targetMuscles: ['Chest', 'Triceps', 'Core Stabilizers'],
    requiredEquipment: 'bodyweight',
    locations: ['home', 'outdoor', 'gym', 'hybrid'],
    minExperience: 'beginner',
    contraindications: ['wrist'],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 4 },
    defaultReps: {
      fat_loss: '10–15',
      muscle_gain: '10–15',
      maintenance: '10–15',
      recomposition: '10–15',
      endurance: '15–20',
      general_fitness: '8–15'
    },
    restSeconds: 75,
    instructions: [
      'Brace abs and glutes so your body forms a straight plank from head to heels.',
      'Beginners elevate hands on a sturdy bench or counter to maintain clean form.',
      'Lower chest within a fist of the surface over 2 seconds, then press up smoothly.'
    ],
    alternatives: ['Dumbbell Neutral-Grip Floor Press', 'Band-Resisted Standing Chest Press']
  },
  {
    id: 'ex-band-chest-press',
    name: 'Standing Resistance-Band Chest Press',
    pattern: 'push',
    targetMuscles: ['Chest', 'Anterior Deltoids', 'Triceps'],
    requiredEquipment: 'bodyweight',
    locations: ['home', 'outdoor', 'gym', 'hybrid'],
    minExperience: 'beginner',
    contraindications: [],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 4 },
    defaultReps: {
      fat_loss: '12–15',
      muscle_gain: '10–15',
      maintenance: '12–15',
      recomposition: '12–15',
      endurance: '15–20',
      general_fitness: '12–15'
    },
    restSeconds: 60,
    instructions: [
      'Stand in a staggered stance with ribs stacked over pelvis.',
      'Press smoothly straight ahead without shrugging your traps; pause 1 second at full reach.'
    ],
    alternatives: ['Wall or Bench Incline Push-Up', 'Dumbbell Neutral-Grip Press']
  },
  {
    id: 'ex-db-shoulder-press',
    name: 'Seated or Standing Dumbbell Overhead Press',
    pattern: 'push',
    targetMuscles: ['Deltoids', 'Triceps', 'Upper Back Stabilizers'],
    requiredEquipment: 'dumbbells',
    locations: ['gym', 'home', 'hybrid'],
    minExperience: 'beginner',
    contraindications: ['shoulder', 'lower_back'],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 4 },
    defaultReps: {
      fat_loss: '10–12',
      muscle_gain: '8–12',
      maintenance: '8–12',
      recomposition: '8–12',
      endurance: '12–15',
      general_fitness: '10–12'
    },
    restSeconds: 90,
    instructions: [
      'Keep ribcage down and glutes lightly engaged so the lower back never hyperextends.',
      'Press dumbbells slightly in front of the plane of the shoulders (scapular plane) to full lockout.'
    ],
    alternatives: ['Lateral Raises', 'Pike Push-Ups']
  },

  // PULL
  {
    id: 'ex-one-arm-db-row',
    name: 'Supported Single-Arm Dumbbell Row',
    pattern: 'pull',
    targetMuscles: ['Latissimus Dorsi', 'Rhomboids', 'Rear Deltoids', 'Biceps'],
    requiredEquipment: 'dumbbells',
    locations: ['gym', 'home', 'hybrid'],
    minExperience: 'beginner',
    contraindications: [],
    defaultSets: { beginner: 3, intermediate: 4, advanced: 4 },
    defaultReps: {
      fat_loss: '10–12 / side',
      muscle_gain: '8–12 / side',
      maintenance: '10–12 / side',
      recomposition: '8–12 / side',
      endurance: '12–15 / side',
      general_fitness: '10–12 / side'
    },
    restSeconds: 75,
    instructions: [
      'Support non-working hand on a bench or sturdy chair to keep spine neutral and unloaded.',
      'Pull dumbbell toward your hip pocket rather than shrugging upward.',
      'Control the 2-second lowering phase for a full lat stretch.'
    ],
    alternatives: ['Seated Cable Row', 'Inverted Bodyweight Row']
  },
  {
    id: 'ex-pullup-or-latpulldown',
    name: 'Pull-Ups or Assisted Pull-Up / Lat Pulldown',
    pattern: 'pull',
    targetMuscles: ['Lats', 'Upper Back', 'Biceps'],
    requiredEquipment: 'pullup_bar',
    locations: ['gym', 'home', 'outdoor', 'hybrid'],
    minExperience: 'intermediate',
    contraindications: ['shoulder'],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 4 },
    defaultReps: {
      fat_loss: '6–10',
      muscle_gain: '6–10',
      maintenance: '6–10',
      recomposition: '6–10',
      endurance: '10–12',
      general_fitness: '6–10'
    },
    restSeconds: 105,
    instructions: [
      'Initiate each repetition by depressing shoulder blades down and away from ears.',
      'Drive elbows down toward ribs until chin clears the bar or bar meets upper chest.',
      'Lower smoothly without dropping into passive joint hang.'
    ],
    alternatives: ['Supported Dumbbell Row', 'Resistance Band Lat Pulldown']
  },
  {
    id: 'ex-prone-ytw-pull',
    name: 'Prone Y-T-W Scapular Retractions & Towel/Band Row',
    pattern: 'pull',
    targetMuscles: ['Mid/Lower Traps', 'Rhomboids', 'Rear Deltoids'],
    requiredEquipment: 'bodyweight',
    locations: ['home', 'outdoor', 'gym', 'hybrid'],
    minExperience: 'beginner',
    contraindications: [],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 4 },
    defaultReps: {
      fat_loss: '12–15',
      muscle_gain: '12–15',
      maintenance: '12–15',
      recomposition: '12–15',
      endurance: '15–20',
      general_fitness: '12–15'
    },
    restSeconds: 60,
    instructions: [
      'Hinge forward 45° or lie prone on a mat with neck neutral.',
      'Squeeze shoulder blades back and down for a crisp 2-second pause on each rep.'
    ],
    alternatives: ['Resistance Band Face Pull', 'Single-Arm Dumbbell Row']
  },

  // LEGS
  {
    id: 'ex-goblet-squat',
    name: 'Dumbbell / Kettlebell Goblet Squat',
    pattern: 'legs',
    targetMuscles: ['Quadriceps', 'Glutes', 'Adductors', 'Core'],
    requiredEquipment: 'dumbbells',
    locations: ['gym', 'home', 'hybrid'],
    minExperience: 'beginner',
    contraindications: ['knee_pain'],
    defaultSets: { beginner: 3, intermediate: 4, advanced: 4 },
    defaultReps: {
      fat_loss: '10–12',
      muscle_gain: '8–12',
      maintenance: '10–12',
      recomposition: '8–12',
      endurance: '15',
      general_fitness: '10–12'
    },
    restSeconds: 90,
    instructions: [
      'Hold weight close to chest, stand shoulder-width apart with toes turned out 15°.',
      'Sit hips down between heels while keeping torso upright and knees tracking over mid-foot.',
      'Drive through full foot to stand tall.'
    ],
    alternatives: ['Bodyweight Box Squat', 'Glute Bridge']
  },
  {
    id: 'ex-barbell-rdl',
    name: 'Romanian Deadlift (Barbell or Dumbbell)',
    pattern: 'legs',
    targetMuscles: ['Hamstrings', 'Glutes', 'Spinal Erectors'],
    requiredEquipment: 'barbell',
    locations: ['gym', 'hybrid'],
    minExperience: 'intermediate',
    contraindications: ['lower_back'],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 4 },
    defaultReps: {
      fat_loss: '8–10',
      muscle_gain: '8–10',
      maintenance: '8–10',
      recomposition: '8–10',
      endurance: '12',
      general_fitness: '8–10'
    },
    restSeconds: 120,
    instructions: [
      'Unlock knees ~15° and push hips straight back as if closing a car door with your glutes.',
      'Keep lats engaged so the bar stays lightly brushing thighs/shins; stop as soon as hips stop moving back.',
      'Drive hips forward to stand tall without leaning backward at the top.'
    ],
    alternatives: ['Supine Glute Bridge / Hip Thrust', 'Single-Leg Supported Hip Hinge']
  },
  {
    id: 'ex-glute-bridge',
    name: 'Tempo Glute Bridge / Hip Thrust',
    pattern: 'legs',
    targetMuscles: ['Glutes', 'Hamstrings', 'Posterior Chain'],
    requiredEquipment: 'bodyweight',
    locations: ['home', 'outdoor', 'gym', 'hybrid'],
    minExperience: 'beginner',
    contraindications: [],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 4 },
    defaultReps: {
      fat_loss: '12–15',
      muscle_gain: '12–15',
      maintenance: '12–15',
      recomposition: '12–15',
      endurance: '15–20',
      general_fitness: '12–15'
    },
    restSeconds: 60,
    instructions: [
      'Lie supine with knees bent ~90° and heels stacked under knees (joint-friendly for knees & lower back).',
      'Tuck pelvis slightly, drive through heels, and hold top glute contraction for 2 seconds.'
    ],
    alternatives: ['Single-Leg Glute Bridge', 'Romanian Deadlift']
  },
  {
    id: 'ex-bodyweight-squat',
    name: 'Controlled Tempo Bodyweight / Box Squat',
    pattern: 'legs',
    targetMuscles: ['Quadriceps', 'Glutes', 'Calves'],
    requiredEquipment: 'bodyweight',
    locations: ['home', 'outdoor', 'gym', 'hybrid'],
    minExperience: 'beginner',
    contraindications: ['knee_pain'],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 4 },
    defaultReps: {
      fat_loss: '12–15',
      muscle_gain: '12–18',
      maintenance: '12–15',
      recomposition: '12–15',
      endurance: '18–20',
      general_fitness: '12–15'
    },
    restSeconds: 60,
    instructions: [
      'Lower over 3 controlled seconds to comfortable, pain-free depth (use a chair/box target if helpful).',
      'Keep knees aligned with toes and chest proud; stand smoothly.'
    ],
    alternatives: ['Tempo Glute Bridge', 'Wall Sit Isometric Hold']
  },

  // CORE
  {
    id: 'ex-dead-bug',
    name: 'Dead Bug Core Stability Drill',
    pattern: 'core',
    targetMuscles: ['Deep Transverse Abdominis', 'Obliques'],
    requiredEquipment: 'bodyweight',
    locations: ['home', 'outdoor', 'gym', 'hybrid'],
    minExperience: 'beginner',
    contraindications: [],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 3 },
    defaultReps: {
      fat_loss: '8–10 / side',
      muscle_gain: '8–10 / side',
      maintenance: '8–10 / side',
      recomposition: '8–10 / side',
      endurance: '10–12 / side',
      general_fitness: '8–10 / side'
    },
    restSeconds: 45,
    instructions: [
      'Press lower back gently into the floor with knees in tabletop and arms vertical.',
      'Exhale slowly while extending opposite arm and leg without letting lower back arch.'
    ],
    alternatives: ['Forearm Plank', 'Pallof Anti-Rotation Press']
  },
  {
    id: 'ex-plank-hold',
    name: 'RKC Forearm Plank Hold',
    pattern: 'core',
    targetMuscles: ['Rectus Abdominis', 'Obliques', 'Glutes'],
    requiredEquipment: 'bodyweight',
    locations: ['home', 'outdoor', 'gym', 'hybrid'],
    minExperience: 'beginner',
    contraindications: ['shoulder'],
    defaultSets: { beginner: 3, intermediate: 3, advanced: 4 },
    defaultReps: {
      fat_loss: '30–45 sec',
      muscle_gain: '30–45 sec',
      maintenance: '30–45 sec',
      recomposition: '30–45 sec',
      endurance: '45–60 sec',
      general_fitness: '30–45 sec'
    },
    durationSeconds: 40,
    restSeconds: 45,
    instructions: [
      'Stack elbows directly beneath shoulders on forearms (zero wrist strain).',
      'Pull elbows slightly toward toes isometrically while bracing glutes and abs.'
    ],
    alternatives: ['Dead Bug Core Drill', 'Bird-Dog Reach']
  },

  // CARDIO & MOBILITY
  {
    id: 'ex-zone2-brisk-cardio',
    name: 'Low-Impact Zone 2 Brisk Incline Walk / Cycling',
    pattern: 'cardio',
    targetMuscles: ['Cardiorespiratory System', 'Calves', 'Glutes'],
    requiredEquipment: 'bodyweight',
    locations: ['home', 'outdoor', 'gym', 'hybrid'],
    minExperience: 'beginner',
    contraindications: [],
    defaultSets: { beginner: 1, intermediate: 1, advanced: 1 },
    defaultReps: {
      fat_loss: '20–25 min conversational pace',
      muscle_gain: '15 min brisk recovery pace',
      maintenance: '20 min steady pace',
      recomposition: '20 min brisk pace',
      endurance: '25–35 min aerobic Zone 2',
      general_fitness: '20 min brisk walk'
    },
    durationSeconds: 1200,
    restSeconds: 0,
    instructions: [
      'Maintain a steady pace where you can speak in full sentences (RPE 5–6 / 10).',
      'Keep posture tall and arms swinging naturally.'
    ],
    alternatives: ['Stationary Bike', 'Marching Step-Touch Intervals']
  },
  {
    id: 'ex-mobility-flow',
    name: 'Thoracic, Hip & Ankle Mobility Flow',
    pattern: 'mobility',
    targetMuscles: ['Thoracic Spine', 'Hip Flexors', 'Ankles', 'Shoulders'],
    requiredEquipment: 'bodyweight',
    locations: ['home', 'outdoor', 'gym', 'hybrid'],
    minExperience: 'beginner',
    contraindications: [],
    defaultSets: { beginner: 2, intermediate: 2, advanced: 3 },
    defaultReps: {
      fat_loss: '6 slow breaths / position',
      muscle_gain: '6 slow breaths / position',
      maintenance: '6 slow breaths / position',
      recomposition: '6 slow breaths / position',
      endurance: '6 slow breaths / position',
      general_fitness: '6 slow breaths / position'
    },
    durationSeconds: 300,
    restSeconds: 30,
    instructions: [
      'Cycle smoothly through Cat-Cow, World’s Greatest Lunge Thoracic Rotation (or kneeling hip flexor stretch), and ankle dorsiflexion rocks.',
      'Never force end-range pain; move strictly within comfortable joint control.'
    ],
    alternatives: ['Supine Hamstring & Glute Stretch', 'Cat-Cow + Child’s Pose Breathing']
  }
];

const EXP_RANK: Record<TrainingExperience, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
};

export interface WorkoutGeneratorInput {
  goal: FitnessGoal;
  experience: TrainingExperience;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  location: WorkoutLocation;
  equipment: string[];
  limitations?: string[];
  recentCompletedWorkoutsLast14Days?: number;
}

export function generatePersonalizedWorkoutPlan(
  input: WorkoutGeneratorInput
): WorkoutScheduleData {
  const daysPerWeek = Math.min(6, Math.max(1, Math.round(input.daysPerWeek)));
  const duration = Math.min(150, Math.max(15, Math.round(input.sessionDurationMinutes)));
  const normalizedEquip = new Set(
    ['bodyweight', ...(input.equipment ?? []).map((e) => e.trim().toLowerCase())]
  );
  // Gym automatically includes standard gym equipment unless restricted
  if (input.location === 'gym' || input.location === 'hybrid') {
    normalizedEquip.add('dumbbells');
    normalizedEquip.add('barbell');
    normalizedEquip.add('pullup_bar');
  }

  const normalizedLimitations = (input.limitations ?? []).map((l) =>
    l.trim().toLowerCase().replace(/\s+/g, '_')
  );

  // Conservative progression modulation from recorded workout history
  const recentCount = input.recentCompletedWorkoutsLast14Days ?? 0;
  const volumeScale = recentCount === 0 && input.experience === 'beginner' ? -1 : 0;

  const isEligible = (entry: ExerciseCatalogEntry): boolean => {
    if (EXP_RANK[entry.minExperience] > EXP_RANK[input.experience]) return false;
    if (!entry.locations.includes(input.location)) return false;
    if (!normalizedEquip.has(entry.requiredEquipment)) return false;
    if (
      entry.contraindications.some((contra) =>
        normalizedLimitations.some((lim) => lim.includes(contra) || contra.includes(lim))
      )
    ) {
      return false;
    }
    return true;
  };

  const pickExercises = (
    patterns: ExerciseCatalogEntry['pattern'][],
    daySeed: number,
    maxCount: number
  ): PlannedExercise[] => {
    const selected: PlannedExercise[] = [];
    const usedIds = new Set<string>();

    for (let i = 0; i < patterns.length && selected.length < maxCount; i++) {
      const pattern = patterns[i]!;
      let pool = EXERCISE_CATALOG.filter(
        (e) => e.pattern === pattern && isEligible(e) && !usedIds.has(e.id)
      );
      if (pool.length === 0) {
        // Safe bodyweight/joint-friendly fallback
        pool = EXERCISE_CATALOG.filter(
          (e) =>
            e.pattern === pattern &&
            e.requiredEquipment === 'bodyweight' &&
            !usedIds.has(e.id) &&
            !e.contraindications.some((c) => normalizedLimitations.includes(c))
        );
      }
      if (pool.length === 0) continue;

      const entry = pool[(daySeed + i) % pool.length]!;
      usedIds.add(entry.id);

      const baseSets = entry.defaultSets[input.experience];
      const adjustedSets = Math.max(
        1,
        duration < 30 ? Math.min(2, baseSets) : baseSets + volumeScale
      );

      selected.push({
        id: `${entry.id}-d${daySeed + 1}-${i + 1}`,
        name: entry.name,
        targetMuscles: entry.targetMuscles,
        equipment: entry.requiredEquipment,
        sets: adjustedSets,
        reps: entry.defaultReps[input.goal],
        durationSeconds: entry.durationSeconds,
        restSeconds: entry.restSeconds,
        difficulty: entry.minExperience,
        instructions: entry.instructions,
        alternatives: entry.alternatives
      });
    }

    return selected;
  };

  // Determine optimal training split (always preserving at least 1 full rest/recovery day per 7 days!)
  let splitType = 'Full Body & Mobility Foundation';
  let activeTemplates: Array<{
    focus: string;
    patterns: ExerciseCatalogEntry['pattern'][];
  }> = [];

  if (daysPerWeek <= 3 || input.experience === 'beginner') {
    splitType =
      daysPerWeek === 1
        ? 'Single-Day Full-Body Essentials'
        : `${daysPerWeek}-Day Full-Body & Conditioning`;
    activeTemplates = [
      { focus: 'Full Body A (Squat, Push, Pull, Core)', patterns: ['legs', 'push', 'pull', 'core', 'mobility'] },
      { focus: 'Full Body B (Hinge, Push, Pull, Cardio)', patterns: ['legs', 'pull', 'push', 'core', 'cardio'] },
      { focus: 'Full Body C & Aerobic Conditioning', patterns: ['push', 'legs', 'pull', 'cardio', 'mobility'] }
    ];
  } else if (daysPerWeek === 4) {
    splitType = '4-Day Upper / Lower Balanced Split';
    activeTemplates = [
      { focus: 'Upper Body Strength & Posture', patterns: ['push', 'pull', 'push', 'pull', 'mobility'] },
      { focus: 'Lower Body & Core Stability', patterns: ['legs', 'legs', 'core', 'cardio'] },
      { focus: 'Upper Body Hypertrophy & Control', patterns: ['pull', 'push', 'pull', 'core'] },
      { focus: 'Lower Body Posterior Chain & Conditioning', patterns: ['legs', 'legs', 'cardio', 'mobility'] }
    ];
  } else {
    splitType = `${daysPerWeek}-Day Push / Pull / Legs + Conditioning`;
    activeTemplates = [
      { focus: 'Push (Chest, Shoulders & Triceps)', patterns: ['push', 'push', 'core', 'mobility'] },
      { focus: 'Pull (Back, Rear Delts & Biceps)', patterns: ['pull', 'pull', 'core'] },
      { focus: 'Legs & Core Foundation', patterns: ['legs', 'legs', 'core', 'mobility'] },
      { focus: 'Upper Body Volume & Posture', patterns: ['push', 'pull', 'push', 'pull'] },
      { focus: 'Lower Body & Zone 2 Conditioning', patterns: ['legs', 'core', 'cardio'] },
      { focus: 'Active Conditioning & Joint Mobility', patterns: ['cardio', 'mobility', 'core'] }
    ];
  }

  const maxExercisesPerSession =
    duration <= 25 ? 3 : duration <= 40 ? 4 : duration <= 60 ? 5 : 6;

  const weekDayNames = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  // Distribute training days evenly across the 7-day week with recovery buffers
  const trainingDayIndices = new Set<number>();
  if (daysPerWeek === 1) [0].forEach((i) => trainingDayIndices.add(i));
  else if (daysPerWeek === 2) [0, 3].forEach((i) => trainingDayIndices.add(i));
  else if (daysPerWeek === 3) [0, 2, 4].forEach((i) => trainingDayIndices.add(i));
  else if (daysPerWeek === 4) [0, 1, 3, 4].forEach((i) => trainingDayIndices.add(i));
  else if (daysPerWeek === 5) [0, 1, 2, 4, 5].forEach((i) => trainingDayIndices.add(i));
  else [0, 1, 2, 4, 5, 6].forEach((i) => trainingDayIndices.add(i)); // Sunday/Thursday recovery guarantee

  let activeIdx = 0;
  const days: PlannedWorkoutDay[] = weekDayNames.map((dayName, idx) => {
    const isTraining = trainingDayIndices.has(idx);
    if (!isTraining) {
      return {
        dayNumber: idx + 1,
        dayName,
        focus: 'Scheduled Recovery & Light Walking',
        isRestDay: true,
        estimatedDurationMinutes: 20,
        warmup: ['5 min gentle nasal-breathing stroll'],
        exercises: [],
        cooldown: [
          '15–20 min leisurely outdoor walk',
          '5 min gentle hip & thoracic breathing stretch',
          'Prioritize 7.5–9 hours sleep and consistent hydration'
        ],
        progressionNote:
          'Adaptation happens during recovery—resist turning rest days into high-fatigue sessions.'
      };
    }

    const tpl = activeTemplates[activeIdx % activeTemplates.length]!;
    const exercises = pickExercises(tpl.patterns, activeIdx, maxExercisesPerSession);
    activeIdx += 1;

    return {
      dayNumber: idx + 1,
      dayName,
      focus: tpl.focus,
      isRestDay: false,
      estimatedDurationMinutes: duration,
      warmup: [
        '3–4 min light pulse raiser (brisk walk, marching, or easy spin)',
        '8 controlled arm circles, 8 bodyweight hip hinges, and 6 thoracic rotations per side',
        '1 light warm-up set at ~50% effort on your first compound movement'
      ],
      exercises,
      cooldown: [
        '2 min slow nasal breathing down-regulation walk',
        '30–45 sec gentle stretch for primary muscles trained today (chest, lats, hip flexors, hamstrings)'
      ],
      progressionNote:
        recentCount >= 4
          ? 'Consistent training history detected: add 1 rep per set (within target range) or +1.25–2.5 kg only when all sets stay crisp at RPE 7–8 (2–3 reps in reserve).'
          : 'Focus on smooth tempo and leaving 2–3 clean reps in reserve (RPE 7–8) before increasing load next week.'
    };
  });

  return {
    splitType,
    location: input.location,
    daysPerWeek,
    sessionDurationMinutes: duration,
    limitationsApplied: normalizedLimitations,
    safetyGuidance: [
      'Never train through sharp,shooting, radiating, or joint-locking pain—stop immediately and substitute a pain-free range or consult a licensed physiotherapist/physician.',
      'Leave 2–3 repetitions in reserve (RPE 7–8) on working sets to build strength sustainably without excessive central fatigue.',
      input.daysPerWeek > 6
        ? 'You requested 7 days/week; 1 mandatory active-recovery day has been preserved to prevent overtraining.'
        : 'At least one dedicated recovery day is scheduled each week to support connective tissue and muscular repair.'
    ],
    days,
    generatedAtIso: new Date().toISOString()
  };
}

export function replaceExerciseInSchedule(
  schedule: WorkoutScheduleData,
  dayNumber: number,
  exerciseId: string
): WorkoutScheduleData {
  const nextDays = schedule.days.map((day) => {
    if (day.dayNumber !== dayNumber) return day;
    const nextExercises = day.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      const altName = ex.alternatives[0] ?? 'Bodyweight Tempo Variation';
      const rotatedAlts = [...ex.alternatives.slice(1), ex.name];
      return {
        ...ex,
        name: altName,
        alternatives: rotatedAlts
      };
    });
    return { ...day, exercises: nextExercises };
  });

  return { ...schedule, days: nextDays };
}
