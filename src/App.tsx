import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  CLINICAL_PROTOCOLS,
  SANCTUARY_STAGES,
  MAC_CONTROL_HINT_LINE,
  STREAK_STORAGE_KEY,
  HRV_HISTORY_STORAGE_KEY,
  DEFAULT_HRV_HISTORY_SEED,
  COGNITIVE_MILESTONE_STORAGE_KEY,
  COGNITIVE_MILESTONE_BADGES,
  evaluateCognitiveMilestones,
  getSanctuaryAestheticConfig,
  formatLocalDateIso,
  evaluateStreakOnLoad,
  recordDailyPracticeSession,
  appendHrvSessionRecord,
  SANCTUARY_ATMOSPHERES,
  getSanctuaryAtmosphereConfig,
  NEURO_NUTRITION_STORAGE_KEY,
  NEURAL_LOGS_STORAGE_KEY,
  DEFAULT_NEURAL_LOGS_SEED,
  appendNeuralLogEntry,
  computeZenModeHudState,
  DAILY_HABIT_TRACKER_STORAGE_KEY,
  SANCTUARY_BLOOM_STORAGE_KEY,
  SANCTUARY_BLOOM_INTENSITY_STORAGE_KEY,
  SANCTUARY_BLOOM_PRESET_STORAGE_KEY,
  DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT,
  DEFAULT_SANCTUARY_BLOOM_PRESET_ID,
  SANCTUARY_BLOOM_PRESET_LIST,
  getSanctuaryBloomPresetConfig,
  clampSanctuaryBloomIntensityPct,
  COGNITIVE_RHYTHM_SYNC_STORAGE_KEY,
  DEFAULT_COGNITIVE_RHYTHM_SYNC_CONFIG,
  COGNITIVE_RHYTHM_HEART_RATE_PRESETS,
  COGNITIVE_RHYTHM_BREATH_CADENCE_PRESETS,
  sanitizeCognitiveRhythmSyncConfig,
  computeCognitiveRhythmSyncState,
  computeHudFlowPulseState,
  computeAdaptiveDifficultyScaling,
  computeRunningFiveSessionHrvAverage,
  syncDailyHabitTrackerWithStreak,
  toggleDailyHabitExercise,
  GENTLE_NOTIFICATION_STORAGE_KEY,
  DEFAULT_GENTLE_NOTIFICATION_CONFIG,
  USUAL_PRACTICE_TIME_PRESETS,
  formatMinutesToTimeHm,
  sanitizeGentleNotificationConfig,
  evaluateGentleHabitNotification,
  computeCognitiveBloomImpactBreakdown,
  type GentleNotificationConfig,
  type SanctuaryBloomPresetId,
  type CognitiveRhythmSyncConfig,
  type CognitiveRhythmSyncSource,
  type DailyHabitExerciseId,
  type DailyHabitTrackerState,
  type NeuralLogEntry,
  type NeuralLogMoodTag,
  type SanctuaryAtmosphereId,
  type DailyStreakState,
  type HrvSessionRecord,
  type CognitiveMilestoneId,
  type LifetimeCognitiveProgress,
  type GameState,
  type GameOutcome,
  type ProtocolId,
  type CognitiveSummary,
  type ChimeSymbol,
} from './game/rules';
import { soundEngine } from './game/audio';
import { SanctuaryCanvas, type HudSnapshot } from './components/SanctuaryCanvas';
import { ClinicalCodexModal } from './components/ClinicalCodexModal';
import { CognitiveInsightJournal } from './components/CognitiveInsightJournal';

const COMPASS_LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const DEMO_WALKTHROUGH_STEPS = [
  {
    stepIndex: 0,
    badge: 'STEP 1 OF 4 · UFOV VISUAL SPEED',
    title: 'Forage UFOV Shrines & Lock Peripheral Fireflies',
    controls: '[Space / Click] near UFOV Shrine → Click Compass Sector (N..NW)',
    description:
      'Glide to a golden UFOV Shrine and press [Space]. Keep your gaze on the central glyph while spotting which of the 8 peripheral sectors flashes a firefly, then click that compass direction for +25 BDNF Nectar.',
    accentHex: '#F2B84B',
  },
  {
    stepIndex: 1,
    badge: 'STEP 2 OF 4 · WORKING MEMORY N-BACK',
    title: 'Ring Harmonic Echo Chimes on N-Back Matches',
    controls: '[E / Two-Finger Click] when Current Totem Symbol matches N steps ago',
    description:
      'Watch the Heart-Tree Totem stream (SUN, LEAF, DROP, STAR). When the latest symbol matches the symbol 1 step ago (Stage 1) or 2 steps ago (Stages 2–3), press [E] to release a cyan resonance wave (+22 Nectar & +1 Vitality).',
    accentHex: '#4FD1C5',
  },
  {
    stepIndex: 2,
    badge: 'STEP 3 OF 4 · 0.1 Hz VAGAL COHERENCE',
    title: 'Synchronize 0.1 Hz Resonance Breathing Shield',
    controls: 'Hold [⇧ Shift / ⌥ Option] or select Protocol [3]',
    description:
      'Pace your breathing to the 10-second emerald guide ring (5s inhale, 5s exhale). Holding [⇧ Shift] or [⌥ Option] generates a vagal coherence aura that gently repels approaching Stress Wisps without losing Calm Vitality.',
    accentHex: '#68D391',
  },
  {
    stepIndex: 3,
    badge: 'STEP 4 OF 4 · HIPPOCAMPAL SYNAPTOGENESIS',
    title: 'Graft Dormant Neural Trees with BDNF Nectar',
    controls: '[Q / ⏎ Return] near Dormant Neural Tree (Costs 25–35 Nectar)',
    description:
      'Once you have collected enough BDNF Nectar, approach any grey Dormant Neural Tree and press [Q] or [⏎ Return] to grow a living bioluminescent mycelial bridge. Graft all target trees in the grove to complete the stage!',
    accentHex: '#B794F4',
  },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [stageIndex, setStageIndex] = useState<number>(0);
  const [highestReachedStage, setHighestReachedStage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(SANCTUARY_BLOOM_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.completedStagesCount === 'number') {
            return Math.min(SANCTUARY_STAGES.length - 1, Math.max(0, parsed.completedStagesCount));
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
    return 0;
  });
  const [completedStagesCount, setCompletedStagesCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('bloom') === '1') {
        return SANCTUARY_STAGES.length;
      }
      try {
        const raw = window.localStorage.getItem(SANCTUARY_BLOOM_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.completedStagesCount === 'number') {
            return Math.max(0, Math.min(SANCTUARY_STAGES.length, parsed.completedStagesCount));
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
    return 0;
  });
  const [isSanctuaryBloomActive, setIsSanctuaryBloomActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('bloom') === '1') {
        return true;
      }
      try {
        const raw = window.localStorage.getItem(SANCTUARY_BLOOM_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.completedStagesCount === 'number' && parsed.completedStagesCount >= SANCTUARY_STAGES.length) {
            return true;
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
    return false;
  });
  const [sanctuaryBloomPresetId, setSanctuaryBloomPresetId] = useState<SanctuaryBloomPresetId>(() => {
    if (typeof window !== 'undefined') {
      try {
        const rawPreset = window.localStorage.getItem(SANCTUARY_BLOOM_PRESET_STORAGE_KEY);
        if (
          rawPreset === 'morning_glow' ||
          rawPreset === 'midnight_forest' ||
          rawPreset === 'neural_zenith'
        ) {
          return rawPreset;
        }
        window.localStorage.setItem(
          SANCTUARY_BLOOM_PRESET_STORAGE_KEY,
          DEFAULT_SANCTUARY_BLOOM_PRESET_ID
        );
      } catch {
        // Ignore storage errors
      }
    }
    return DEFAULT_SANCTUARY_BLOOM_PRESET_ID;
  });
  const activeBloomPreset = getSanctuaryBloomPresetConfig(sanctuaryBloomPresetId);

  const [sanctuaryBloomIntensityPct, setSanctuaryBloomIntensityPct] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const rawDirect = window.localStorage.getItem(SANCTUARY_BLOOM_INTENSITY_STORAGE_KEY);
        if (rawDirect !== null && rawDirect !== '') {
          return clampSanctuaryBloomIntensityPct(Number(rawDirect), DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT);
        }
        const rawObj = window.localStorage.getItem(SANCTUARY_BLOOM_STORAGE_KEY);
        if (rawObj) {
          const parsed = JSON.parse(rawObj);
          if (typeof parsed?.bloomIntensityPct === 'number') {
            return clampSanctuaryBloomIntensityPct(parsed.bloomIntensityPct, DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT);
          }
        }
        window.localStorage.setItem(
          SANCTUARY_BLOOM_INTENSITY_STORAGE_KEY,
          String(DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT)
        );
      } catch {
        // Ignore storage errors
      }
    }
    return DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT;
  });
  const [rhythmSyncConfig, setRhythmSyncConfig] = useState<CognitiveRhythmSyncConfig>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const forceEnable = params.get('rhythm') === '1';
      try {
        const raw = window.localStorage.getItem(COGNITIVE_RHYTHM_SYNC_STORAGE_KEY);
        if (raw) {
          const parsed = sanitizeCognitiveRhythmSyncConfig(JSON.parse(raw));
          return forceEnable ? { ...parsed, enabled: true } : parsed;
        }
        const initial: CognitiveRhythmSyncConfig = {
          ...DEFAULT_COGNITIVE_RHYTHM_SYNC_CONFIG,
          enabled: forceEnable,
        };
        window.localStorage.setItem(COGNITIVE_RHYTHM_SYNC_STORAGE_KEY, JSON.stringify(initial));
        return initial;
      } catch {
        // Ignore storage errors
      }
    }
    return DEFAULT_COGNITIVE_RHYTHM_SYNC_CONFIG;
  });
  const [isRhythmCalibratorOpen, setIsRhythmCalibratorOpen] = useState<boolean>(false);
  const activeRhythmSync = computeCognitiveRhythmSyncState({
    config: rhythmSyncConfig,
    elapsedSec: 1.2,
    sampleCount: 36,
  });

  const [activeProtocol, setActiveProtocol] = useState<ProtocolId>('ufov_forage');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBinauralEnabled, setIsBinauralEnabled] = useState<boolean>(true);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const zenHud = computeZenModeHudState(isZenMode);
  const [atmosphereId, setAtmosphereId] = useState<SanctuaryAtmosphereId>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('sylvan_synapse_atmosphere_v1');
        if (saved === 'forest' || saved === 'rain' || saved === 'meadow') {
          soundEngine.setAtmosphere(saved, false);
          return saved;
        }
      } catch {
        // Ignore storage errors
      }
    }
    return 'forest';
  });
  const [isCodexOpen, setIsCodexOpen] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoStepSignal, setDemoStepSignal] = useState<{ step: number; seq: number } | null>(null);
  const [resetSignal, setResetSignal] = useState<number>(0);

  const activeAtmosphere = getSanctuaryAtmosphereConfig(atmosphereId);

  const handleSelectAtmosphere = useCallback((nextId: SanctuaryAtmosphereId) => {
    setAtmosphereId(nextId);
    soundEngine.setAtmosphere(nextId, true);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('sylvan_synapse_atmosphere_v1', nextId);
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const [completedHabitIds, setCompletedHabitIds] = useState<string[]>(() => {
    const defaultHabits = ['polyphenol_bdnf_diet', 'glymphatic_slow_wave_sleep'];
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(NEURO_NUTRITION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.filter((x): x is string => typeof x === 'string');
          }
        }
        window.localStorage.setItem(NEURO_NUTRITION_STORAGE_KEY, JSON.stringify(defaultHabits));
      } catch {
        // Ignore storage errors
      }
    }
    return defaultHabits;
  });

  const handleToggleNeuroHabit = useCallback((habitId: string) => {
    setCompletedHabitIds((prev) => {
      const exists = prev.includes(habitId);
      const updated = exists ? prev.filter((id) => id !== habitId) : [...prev, habitId];
      if (!exists) {
        soundEngine.playLightNote(587.33, 0.16);
      }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(NEURO_NUTRITION_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore storage errors
        }
      }
      return updated;
    });
  }, []);

  // Lifetime Cognitive Milestone Progression persisted in localStorage
  const [lifetimeProgress, setLifetimeProgress] = useState<LifetimeCognitiveProgress>(() => {
    const defaultSeed: LifetimeCognitiveProgress = {
      totalTreesGrafted: 4,
      peakRejuvenationScore: 1420,
      selectedMilestoneId: 'cyan_lotus_bloom',
    };
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(COGNITIVE_MILESTONE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<LifetimeCognitiveProgress>;
          if (
            typeof parsed.totalTreesGrafted === 'number' &&
            typeof parsed.peakRejuvenationScore === 'number'
          ) {
            return {
              totalTreesGrafted: Math.max(0, parsed.totalTreesGrafted),
              peakRejuvenationScore: Math.max(0, parsed.peakRejuvenationScore),
              selectedMilestoneId: parsed.selectedMilestoneId || 'cyan_lotus_bloom',
            };
          }
        }
        window.localStorage.setItem(COGNITIVE_MILESTONE_STORAGE_KEY, JSON.stringify(defaultSeed));
      } catch {
        // Ignore storage errors
      }
    }
    return defaultSeed;
  });

  const milestoneEval = evaluateCognitiveMilestones({
    totalTreesGrafted: lifetimeProgress.totalTreesGrafted,
    peakRejuvenationScore: lifetimeProgress.peakRejuvenationScore,
  });

  const activeAesthetic = getSanctuaryAestheticConfig(lifetimeProgress.selectedMilestoneId);

  const handleSelectMilestoneBadge = useCallback((badgeId: CognitiveMilestoneId) => {
    setLifetimeProgress((prev) => {
      const updated: LifetimeCognitiveProgress = {
        ...prev,
        selectedMilestoneId: badgeId,
      };
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(COGNITIVE_MILESTONE_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore storage errors
        }
      }
      return updated;
    });
  }, []);

  const handleTreeGraftedIncrement = useCallback(() => {
    setLifetimeProgress((prev) => {
      const nextTrees = prev.totalTreesGrafted + 1;
      const prevEval = evaluateCognitiveMilestones(prev);
      const nextEval = evaluateCognitiveMilestones({
        totalTreesGrafted: nextTrees,
        peakRejuvenationScore: prev.peakRejuvenationScore,
      });
      // Automatically equip newly unlocked milestone tier if player just crossed a threshold!
      const newlyUnlocked =
        nextEval.highestUnlockedBadge.id !== prevEval.highestUnlockedBadge.id
          ? nextEval.highestUnlockedBadge.id
          : prev.selectedMilestoneId;

      const updated: LifetimeCognitiveProgress = {
        ...prev,
        totalTreesGrafted: nextTrees,
        selectedMilestoneId: newlyUnlocked,
      };
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(COGNITIVE_MILESTONE_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore storage errors
        }
      }
      return updated;
    });
  }, []);

  // Daily Streak Counter persisted in localStorage
  const [dailyStreak, setDailyStreak] = useState<DailyStreakState>(() => {
    const todayIso = formatLocalDateIso();
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DailyStreakState;
          return evaluateStreakOnLoad(parsed, todayIso);
        }
      } catch {
        // Ignore storage errors
      }
      // If autostart=1 is active on initial load, record today's practice immediately
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        const initial = recordDailyPracticeSession(null, todayIso);
        try {
          window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(initial));
        } catch {
          // Ignore
        }
        return initial;
      }
    }
    // Default initial state: record today's first visit/practice or show active 1-day streak
    const initial = recordDailyPracticeSession(null, todayIso);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(initial));
      } catch {
        // Ignore
      }
    }
    return initial;
  });

  const commitDailyPractice = useCallback(() => {
    const todayIso = formatLocalDateIso();
    setDailyStreak((prev) => {
      const updated = recordDailyPracticeSession(prev, todayIso);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore storage errors
        }
      }
      return updated;
    });
  }, []);

  // Daily Mind-Body Habit Tracker (NSDR & Daily Cognitive Reframing) synced with DailyStreakState
  const [dailyHabitTracker, setDailyHabitTracker] = useState<DailyHabitTrackerState>(() => {
    const todayIso = formatLocalDateIso();
    if (typeof window !== 'undefined') {
      try {
        const rawTracker = window.localStorage.getItem(DAILY_HABIT_TRACKER_STORAGE_KEY);
        const parsedTracker = rawTracker
          ? (JSON.parse(rawTracker) as DailyHabitTrackerState)
          : null;
        const { streak, tracker } = syncDailyHabitTrackerWithStreak(
          dailyStreak,
          parsedTracker,
          todayIso
        );
        window.localStorage.setItem(DAILY_HABIT_TRACKER_STORAGE_KEY, JSON.stringify(tracker));
        window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streak));
        return tracker;
      } catch {
        // Ignore storage errors
      }
    }
    return syncDailyHabitTrackerWithStreak(dailyStreak, null, todayIso).tracker;
  });

  const handleToggleDailyHabitExercise = useCallback(
    (exerciseId: DailyHabitExerciseId) => {
      const todayIso = formatLocalDateIso();
      setDailyHabitTracker((prevTracker) => {
        const result = toggleDailyHabitExercise({
          streak: dailyStreak,
          tracker: prevTracker,
          exerciseId,
          todayIso,
        });
        setDailyStreak(result.streak);
        soundEngine.playLightNote(659.25, 0.16);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(
              DAILY_HABIT_TRACKER_STORAGE_KEY,
              JSON.stringify(result.tracker)
            );
            window.localStorage.setItem(
              STREAK_STORAGE_KEY,
              JSON.stringify(result.streak)
            );
          } catch {
            // Ignore storage errors
          }
        }
        return result.tracker;
      });
    },
    [dailyStreak]
  );

  // Browser-Based Gentle Notification (+30m Post-Practice NSDR & Cognitive Reframing Reminder)
  const [currentMinutesOfDay, setCurrentMinutesOfDay] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const [gentleNotificationConfig, setGentleNotificationConfig] =
    useState<GentleNotificationConfig>(() => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const defaultUsualHm =
        nowMinutes >= 15 * 60 + 30
          ? DEFAULT_GENTLE_NOTIFICATION_CONFIG.usualPracticeTimeHm
          : formatMinutesToTimeHm((nowMinutes - 35 + 1440) % 1440);

      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(GENTLE_NOTIFICATION_STORAGE_KEY);
          if (raw) {
            return sanitizeGentleNotificationConfig(JSON.parse(raw));
          }
        } catch {
          // Ignore storage errors
        }
      }
      const seeded = sanitizeGentleNotificationConfig({
        ...DEFAULT_GENTLE_NOTIFICATION_CONFIG,
        usualPracticeTimeHm: defaultUsualHm,
      });
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(GENTLE_NOTIFICATION_STORAGE_KEY, JSON.stringify(seeded));
        } catch {
          // Ignore storage errors
        }
      }
      return seeded;
    });

  const [forceGentleToastPreview, setForceGentleToastPreview] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = new Date();
      setCurrentMinutesOfDay(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const persistGentleNotificationConfig = useCallback((next: GentleNotificationConfig) => {
    const sanitized = sanitizeGentleNotificationConfig(next);
    setGentleNotificationConfig(sanitized);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(GENTLE_NOTIFICATION_STORAGE_KEY, JSON.stringify(sanitized));
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const handleUpdateUsualPracticeTimeHm = useCallback(
    (nextTimeHm: string) => {
      persistGentleNotificationConfig({
        ...gentleNotificationConfig,
        usualPracticeTimeHm: nextTimeHm,
        dismissedForDateIso: null,
        snoozedUntilMinutesOfDay: null,
      });
      soundEngine.playLightNote(587.33, 0.1);
    },
    [gentleNotificationConfig, persistGentleNotificationConfig]
  );

  const handleDismissGentleToastToday = useCallback(() => {
    const todayIso = formatLocalDateIso();
    setForceGentleToastPreview(false);
    persistGentleNotificationConfig({
      ...gentleNotificationConfig,
      dismissedForDateIso: todayIso,
    });
  }, [gentleNotificationConfig, persistGentleNotificationConfig]);

  const handleSnoozeGentleToast = useCallback(() => {
    setForceGentleToastPreview(false);
    persistGentleNotificationConfig({
      ...gentleNotificationConfig,
      snoozedUntilMinutesOfDay: (currentMinutesOfDay + 15) % 1440,
    });
    soundEngine.playLightNote(523.25, 0.1);
  }, [currentMinutesOfDay, gentleNotificationConfig, persistGentleNotificationConfig]);

  const handleToggleGentleReminderPreview = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) e.currentTarget.blur();
      setForceGentleToastPreview((prev) => !prev);
      if (gentleNotificationConfig.dismissedForDateIso) {
        persistGentleNotificationConfig({
          ...gentleNotificationConfig,
          dismissedForDateIso: null,
          snoozedUntilMinutesOfDay: null,
        });
      }
      soundEngine.playLightNote(659.25, 0.12);
    },
    [gentleNotificationConfig, persistGentleNotificationConfig]
  );

  const gentleNotificationEval = evaluateGentleHabitNotification({
    config: gentleNotificationConfig,
    tracker: dailyHabitTracker,
    todayIso: formatLocalDateIso(),
    currentMinutesOfDay,
    forcePreview: forceGentleToastPreview,
  });

  // HRV Coherence History (Last 10 Practice Sessions) persisted in localStorage
  const [hrvHistory, setHrvHistory] = useState<HrvSessionRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(HRV_HISTORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as HrvSessionRecord[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(-10);
          }
        }
      } catch {
        // Ignore storage errors
      }
      try {
        window.localStorage.setItem(
          HRV_HISTORY_STORAGE_KEY,
          JSON.stringify(DEFAULT_HRV_HISTORY_SEED)
        );
      } catch {
        // Ignore
      }
    }
    return DEFAULT_HRV_HISTORY_SEED;
  });

  const recordHrvSessionToHistory = useCallback(
    (coherenceScore: number, coherenceSeconds: number) => {
      const todayIso = formatLocalDateIso();
      const currentStageName =
        SANCTUARY_STAGES[stageIndex]?.name || SANCTUARY_STAGES[0].name;
      setHrvHistory((prev) => {
        const updated = appendHrvSessionRecord(prev, {
          coherenceScore,
          coherenceSeconds,
          recordedAtIso: todayIso,
          stageName: currentStageName,
        });
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(
              HRV_HISTORY_STORAGE_KEY,
              JSON.stringify(updated)
            );
          } catch {
            // Ignore storage errors
          }
        }
        return updated;
      });
    },
    [stageIndex]
  );

  // Cognitive Insight Journal — Post-Session Reflective 'Neural Logs' linked to Daily Streak
  const [neuralLogs, setNeuralLogs] = useState<NeuralLogEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(NEURAL_LOGS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as NeuralLogEntry[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
        window.localStorage.setItem(
          NEURAL_LOGS_STORAGE_KEY,
          JSON.stringify(DEFAULT_NEURAL_LOGS_SEED)
        );
      } catch {
        // Ignore storage errors
      }
    }
    return DEFAULT_NEURAL_LOGS_SEED;
  });

  const handleAddNeuralLog = useCallback(
    (params: {
      moodTag: NeuralLogMoodTag;
      reflectionNote: string;
      outcome: 'victory' | 'defeat';
      rejuvenationScore: number;
      stageName: string;
    }) => {
      commitDailyPractice();
      const todayIso = formatLocalDateIso();
      soundEngine.playHarmonicChord('nback');
      setNeuralLogs((prev) => {
        const updated = appendNeuralLogEntry(prev, {
          recordedAtIso: todayIso,
          streakDayCount: Math.max(1, dailyStreak.currentStreak),
          stageName: params.stageName,
          outcome: params.outcome,
          rejuvenationScore: params.rejuvenationScore,
          moodTag: params.moodTag,
          reflectionNote: params.reflectionNote,
        });
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(NEURAL_LOGS_STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // Ignore storage errors
          }
        }
        return updated;
      });
    },
    [commitDailyPractice, dailyStreak.currentStreak]
  );

  const [gameOutcome, setGameOutcome] = useState<GameOutcome>(null);
  const [endSummary, setEndSummary] = useState<CognitiveSummary | null>(null);

  const [ufovSectorChoiceSignal, setUfovSectorChoiceSignal] = useState<{
    sector: number;
    seq: number;
  } | null>(null);

  const [triggerActionSignal, setTriggerActionSignal] = useState<{
    action: 'pulse' | 'chime' | 'graft';
    seq: number;
  } | null>(null);

  const [hud, setHud] = useState<HudSnapshot>({
    calmVitality: 5,
    maxVitality: 5,
    nectar: 30,
    nectarCostPerTree: 25,
    treesGrafted: 0,
    targetTrees: 4,
    stageIndex: 0,
    stageName: SANCTUARY_STAGES[0].name,
    nBackLevel: 1,
    chimeHistory: ['LEAF', 'SUN', 'SUN'],
    isNBackReadyToMatch: true,
    activeProtocol: 'ufov_forage',
    breathPhaseLabel: 'INHALE',
    breathExpansion: 0.5,
    isCoherentBreathing: false,
    ufovActiveChallenge: null,
    rejuvenationScore: 200,
    statusBannerText:
      'Explore the Mossy Glade · Harvest Golden Dew [Space] · Match Echo Chimes [E] · Graft Neural Trees [Q]',
    demoStepIndex: 0,
    flowMultiplier: 1.0,
    flowStreak: 0,
    adaptiveUfovWindowMs: 2200,
    flowTier: 'Baseline Calibration',
  });

  // Cognitive Flow Pulse — HUD Rhythmic Visual Feedback Loop when Flow Multiplier increases
  const prevFlowMultiplierRef = useRef<number>(1.0);
  const [flowPulseAnim, setFlowPulseAnim] = useState<{
    active: boolean;
    prevMultiplier: number;
    currentMultiplier: number;
    elapsedMs: number;
  }>({
    active: false,
    prevMultiplier: 1.0,
    currentMultiplier: 1.0,
    elapsedMs: 1400,
  });

  useEffect(() => {
    const prev = prevFlowMultiplierRef.current;
    const curr = hud.flowMultiplier;
    if (curr > prev) {
      setFlowPulseAnim({
        active: true,
        prevMultiplier: prev,
        currentMultiplier: curr,
        elapsedMs: 420,
      });
    }
    prevFlowMultiplierRef.current = curr;
  }, [hud.flowMultiplier]);

  useEffect(() => {
    if (!flowPulseAnim.active) return;
    const intervalId = window.setInterval(() => {
      setFlowPulseAnim((prev) => {
        const nextElapsed = prev.elapsedMs + 70;
        if (nextElapsed >= 1400) {
          return {
            ...prev,
            active: false,
            elapsedMs: 1400,
          };
        }
        return {
          ...prev,
          elapsedMs: nextElapsed,
        };
      });
    }, 70);
    return () => window.clearInterval(intervalId);
  }, [flowPulseAnim.active]);

  const triggerManualFlowPulseSurge = useCallback(() => {
    const baseMult = Math.max(hud.flowMultiplier, flowPulseAnim.currentMultiplier);
    const nextMult = baseMult >= 2.5 ? 1.5 : Math.min(2.5, Math.round((baseMult + 0.25) * 100) / 100);
    const prevMult = Math.max(1.0, Math.round((nextMult - 0.25) * 100) / 100);
    prevFlowMultiplierRef.current = nextMult;
    setHud((prev) => ({
      ...prev,
      flowMultiplier: nextMult,
      flowStreak: prev.flowStreak + 1,
      adaptiveUfovWindowMs: Math.max(900, prev.adaptiveUfovWindowMs - 140),
    }));
    setFlowPulseAnim({
      active: true,
      prevMultiplier: prevMult,
      currentMultiplier: nextMult,
      elapsedMs: 420,
    });
    soundEngine.playHarmonicChord('nback');
  }, [hud.flowMultiplier, flowPulseAnim.currentMultiplier]);

  const flowPulseState = computeHudFlowPulseState({
    currentMultiplier: flowPulseAnim.active ? flowPulseAnim.currentMultiplier : hud.flowMultiplier,
    previousMultiplier: flowPulseAnim.active ? flowPulseAnim.prevMultiplier : hud.flowMultiplier,
    timeSinceIncreaseMs: flowPulseAnim.active ? flowPulseAnim.elapsedMs : undefined,
    pulseDurationMs: 1400,
  });

  // 5-Session HRV Coherence Adaptive Difficulty Scaling (Maintains Optimal Flow State)
  const [runningFiveSessionHrvAvgOverride, setRunningFiveSessionHrvAvgOverride] = useState<number | null>(null);
  const liveFiveSessionHrvAvg = computeRunningFiveSessionHrvAverage(hrvHistory).runningFiveSessionAvg;
  const activeStageDef = SANCTUARY_STAGES[hud.stageIndex] || SANCTUARY_STAGES[0];
  const activeAdaptiveScaling = computeAdaptiveDifficultyScaling({
    hrvHistory,
    runningFiveSessionHrvAvgOverride: runningFiveSessionHrvAvgOverride ?? undefined,
    baseNBackLevel: activeStageDef.nBackLevel,
    baseUfovFlashSec: activeStageDef.ufovFlashDurationSec,
    consecutiveCognitiveHits: hud.flowStreak,
  });

  const handleCycleAdaptiveHrvPreset = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    e.stopPropagation();
    const presets: Array<number | null> = [66, 78, 86, 95, null];
    setRunningFiveSessionHrvAvgOverride((prev) => {
      const idx = presets.indexOf(prev);
      return presets[(idx + 1) % presets.length];
    });
  }, []);

  // Mirror game state to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const startOrRestartGame = useCallback(
    (targetStageIdx?: number, demoMode = false) => {
      const nextStage = targetStageIdx !== undefined ? targetStageIdx : stageIndex;
      commitDailyPractice();
      setStageIndex(nextStage);
      setIsDemoMode(demoMode);
      setGameOutcome(null);
      setEndSummary(null);
      setIsCodexOpen(false);
      setGameState('playing');
      document.body.dataset.state = 'playing';
      setResetSignal((s) => s + 1);
      soundEngine.startAmbientSanctuary();
      soundEngine.resumeAmbient();

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const canvas = document.querySelector('canvas');
      if (canvas instanceof HTMLElement) {
        canvas.focus();
      }
    },
    [stageIndex, commitDailyPractice]
  );

  // Bind Enter & Space on Title screen to start immediately
  useEffect(() => {
    if (gameState !== 'title' || isCodexOpen) return;
    const onTitleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        startOrRestartGame(stageIndex, false);
      }
    };
    window.addEventListener('keydown', onTitleKey);
    return () => window.removeEventListener('keydown', onTitleKey);
  }, [gameState, isCodexOpen, startOrRestartGame, stageIndex]);

  const handleTogglePause = useCallback(() => {
    if (isCodexOpen) {
      setIsCodexOpen(false);
      return;
    }
    setGameState((prev) => {
      if (prev === 'playing') {
        soundEngine.pauseAmbient();
        return 'paused';
      }
      if (prev === 'paused') {
        soundEngine.resumeAmbient();
        return 'playing';
      }
      return prev;
    });
  }, [isCodexOpen]);

  const handleGameEnd = useCallback(
    (outcome: GameOutcome, summary: CognitiveSummary) => {
      commitDailyPractice();
      recordHrvSessionToHistory(
        summary.vagalCoherencePct,
        Math.max(8, Math.round((summary.vagalCoherencePct / 100) * 18 * 10) / 10)
      );
      setGameOutcome(outcome);
      setEndSummary(summary);
      setLifetimeProgress((prev) => {
        const nextPeak = Math.max(prev.peakRejuvenationScore, summary.rejuvenationScore);
        const prevEval = evaluateCognitiveMilestones(prev);
        const nextEval = evaluateCognitiveMilestones({
          totalTreesGrafted: prev.totalTreesGrafted,
          peakRejuvenationScore: nextPeak,
        });
        const newlyUnlocked =
          nextEval.highestUnlockedBadge.id !== prevEval.highestUnlockedBadge.id
            ? nextEval.highestUnlockedBadge.id
            : prev.selectedMilestoneId;
        const updated: LifetimeCognitiveProgress = {
          ...prev,
          peakRejuvenationScore: nextPeak,
          selectedMilestoneId: newlyUnlocked,
        };
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(COGNITIVE_MILESTONE_STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // Ignore storage errors
          }
        }
        return updated;
      });
      if (outcome === 'victory') {
        setHighestReachedStage((prev) => Math.min(SANCTUARY_STAGES.length - 1, Math.max(prev, stageIndex + 1)));
        setCompletedStagesCount((prev) => {
          const nextCount = Math.min(SANCTUARY_STAGES.length, Math.max(prev, stageIndex + 1));
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(
                SANCTUARY_BLOOM_STORAGE_KEY,
                JSON.stringify({ completedStagesCount: nextCount })
              );
            } catch {
              // Ignore storage errors
            }
          }
          if (nextCount >= SANCTUARY_STAGES.length) {
            setIsSanctuaryBloomActive(true);
          }
          return nextCount;
        });
      }
      setGameState('gameover');
      document.body.dataset.state = 'gameover';
    },
    [stageIndex, commitDailyPractice, recordHrvSessionToHistory]
  );

  const handleToggleMute = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleBinaural = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    const enabled = soundEngine.toggleBinauralEntrainment();
    setIsBinauralEnabled(enabled);
  };

  const handleToggleZenMode = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setIsZenMode((prev) => !prev);
  };

  const handleToggleSanctuaryBloom = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setIsSanctuaryBloomActive((prev) => {
      const next = !prev;
      if (next && completedStagesCount < SANCTUARY_STAGES.length) {
        setCompletedStagesCount(SANCTUARY_STAGES.length);
        setHighestReachedStage(SANCTUARY_STAGES.length - 1);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(
              SANCTUARY_BLOOM_STORAGE_KEY,
              JSON.stringify({
                completedStagesCount: SANCTUARY_STAGES.length,
                bloomIntensityPct: sanctuaryBloomIntensityPct,
              })
            );
          } catch {
            // Ignore storage errors
          }
        }
      }
      return next;
    });
  };

  const handleChangeBloomIntensity = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextPct = clampSanctuaryBloomIntensityPct(
      Number(e.target.value),
      DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT
    );
    setSanctuaryBloomIntensityPct(nextPct);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SANCTUARY_BLOOM_INTENSITY_STORAGE_KEY, String(nextPct));
        window.localStorage.setItem(
          SANCTUARY_BLOOM_STORAGE_KEY,
          JSON.stringify({
            completedStagesCount,
            bloomIntensityPct: nextPct,
            bloomPresetId: sanctuaryBloomPresetId,
          })
        );
      } catch {
        // Ignore storage errors
      }
    }
  };

  const handleSelectBloomPreset = (
    presetId: SanctuaryBloomPresetId,
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    e?.currentTarget.blur();
    const presetConfig = getSanctuaryBloomPresetConfig(presetId);
    const nextPct = clampSanctuaryBloomIntensityPct(
      presetConfig.defaultIntensityPct,
      DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT
    );
    setSanctuaryBloomPresetId(presetConfig.id);
    setSanctuaryBloomIntensityPct(nextPct);
    setIsSanctuaryBloomActive(true);
    if (completedStagesCount < SANCTUARY_STAGES.length) {
      setCompletedStagesCount(SANCTUARY_STAGES.length);
      setHighestReachedStage(SANCTUARY_STAGES.length - 1);
    }
    soundEngine.playLightNote(
      presetConfig.id === 'morning_glow'
        ? 587.33
        : presetConfig.id === 'midnight_forest'
        ? 440.0
        : 659.25,
      0.16
    );
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SANCTUARY_BLOOM_PRESET_STORAGE_KEY, presetConfig.id);
        window.localStorage.setItem(SANCTUARY_BLOOM_INTENSITY_STORAGE_KEY, String(nextPct));
        window.localStorage.setItem(
          SANCTUARY_BLOOM_STORAGE_KEY,
          JSON.stringify({
            completedStagesCount: SANCTUARY_STAGES.length,
            bloomIntensityPct: nextPct,
            bloomPresetId: presetConfig.id,
          })
        );
      } catch {
        // Ignore storage errors
      }
    }
  };

  const persistRhythmSyncConfig = useCallback((nextConfig: CognitiveRhythmSyncConfig) => {
    const sanitized = sanitizeCognitiveRhythmSyncConfig(nextConfig);
    setRhythmSyncConfig(sanitized);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(COGNITIVE_RHYTHM_SYNC_STORAGE_KEY, JSON.stringify(sanitized));
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const handleToggleRhythmSync = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    if (!rhythmSyncConfig.enabled) {
      persistRhythmSyncConfig({ ...rhythmSyncConfig, enabled: true });
      setIsRhythmCalibratorOpen(true);
      soundEngine.playLightNote(523.25, 0.16);
    } else if (!isRhythmCalibratorOpen) {
      setIsRhythmCalibratorOpen(true);
    } else {
      setIsRhythmCalibratorOpen(false);
    }
  };

  const handleToggleRhythmSyncActiveState = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    const nextEnabled = !rhythmSyncConfig.enabled;
    persistRhythmSyncConfig({ ...rhythmSyncConfig, enabled: nextEnabled });
    if (nextEnabled) {
      soundEngine.playLightNote(523.25, 0.16);
    }
  };

  const handleSelectRhythmSource = (
    source: CognitiveRhythmSyncSource,
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    e?.currentTarget.blur();
    persistRhythmSyncConfig({
      ...rhythmSyncConfig,
      enabled: true,
      syncSource: source,
    });
    soundEngine.playLightNote(source === 'heart_rate' ? 587.33 : 659.25, 0.14);
  };

  const handleChangeRestingHeartRateBpm = (nextBpm: number) => {
    persistRhythmSyncConfig({
      ...rhythmSyncConfig,
      enabled: true,
      syncSource: 'heart_rate',
      restingHeartRateBpm: nextBpm,
    });
  };

  const handleChangeBreathingCadenceBpm = (nextCadenceBpm: number) => {
    persistRhythmSyncConfig({
      ...rhythmSyncConfig,
      enabled: true,
      syncSource: 'breathing_cadence',
      breathingCadenceBpm: nextCadenceBpm,
    });
  };

  // Bind [Z] keyboard shortcut during active play to toggle Zen Mode, and [B] for Sanctuary Bloom
  useEffect(() => {
    if (gameState !== 'playing' || isCodexOpen) return;
    const onZenKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'KeyZ' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
      } else if (e.code === 'KeyB' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setIsSanctuaryBloomActive((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onZenKey);
    return () => window.removeEventListener('keydown', onZenKey);
  }, [gameState, isCodexOpen]);

  const handleToggleFullscreen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const renderSymbolBadge = (sym: ChimeSymbol, isHighlight: boolean) => {
    return (
      <span
        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
          isHighlight
            ? 'bg-[#F2B84B] text-[#091510]'
            : 'bg-[#152E24] text-[#D5E2DC] border border-[#2C4C3E]'
        }`}
      >
        {sym}
      </span>
    );
  };

  const currentDemoStep =
    DEMO_WALKTHROUGH_STEPS[hud.demoStepIndex % DEMO_WALKTHROUGH_STEPS.length] ||
    DEMO_WALKTHROUGH_STEPS[0];

  return (
    <main className="relative w-full h-full overflow-hidden select-none">
      {/* 1. Isolated 60fps Canvas2D Botanical World */}
      <SanctuaryCanvas
        gameState={gameState}
        stageIndex={stageIndex}
        activeProtocol={activeProtocol}
        onSelectProtocol={setActiveProtocol}
        onHudUpdate={setHud}
        onGameEnd={handleGameEnd}
        onTogglePause={handleTogglePause}
        resetSignal={resetSignal}
        ufovSectorChoiceSignal={ufovSectorChoiceSignal}
        triggerActionSignal={triggerActionSignal}
        isOverlayModalOpen={isCodexOpen}
        activeMilestoneId={lifetimeProgress.selectedMilestoneId}
        onTreeGrafted={handleTreeGraftedIncrement}
        isDemoMode={isDemoMode}
        demoStepSignal={demoStepSignal}
        atmosphereId={atmosphereId}
        isZenMode={isZenMode}
        completedStagesCount={completedStagesCount}
        isSanctuaryBloomActive={isSanctuaryBloomActive}
        sanctuaryBloomIntensityPct={sanctuaryBloomIntensityPct}
        sanctuaryBloomPresetId={sanctuaryBloomPresetId}
        rhythmSyncConfig={rhythmSyncConfig}
        hrvHistory={hrvHistory}
        runningFiveSessionHrvAvgOverride={runningFiveSessionHrvAvgOverride}
      />

      {/* 2. TITLE SCREEN OVERLAY (30%-40% negative space left column over live world camera pan) */}
      {gameState === 'title' && (
        <div
          className="fixed inset-0 z-20 flex flex-col justify-between p-5 md:px-10 md:py-6 overflow-y-auto pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(7, 18, 14, 0.98) 0%, rgba(7, 18, 14, 0.95) 46%, rgba(7, 18, 14, 0.25) 76%, rgba(7, 18, 14, 0.1) 100%)',
          }}
        >
          {/* Top-Left Clinical Identity Lockup */}
          <div className="max-w-xl space-y-3 pointer-events-auto">
            {/* Custom Inline SVG Title Lockup */}
            <div className="space-y-1.5">
              <svg
                viewBox="0 0 460 96"
                className="w-full max-w-[410px] h-auto overflow-visible"
                role="img"
                aria-label="Sylvan Synapse — Botanical Cognitive Sanctuary"
              >
                <defs>
                  <linearGradient id="leafGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F6E05E" />
                    <stop offset="100%" stopColor="#F2B84B" />
                  </linearGradient>
                  <linearGradient id="synapseTeal" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#68D391" />
                    <stop offset="100%" stopColor="#4FD1C5" />
                  </linearGradient>
                </defs>
                {/* Botanical Neural Crest Emblem */}
                <g transform="translate(8, 10)">
                  <circle cx="36" cy="36" r="32" fill="#102820" stroke="url(#synapseTeal)" strokeWidth="2.5" />
                  <path
                    d="M36 12 C48 22, 52 38, 36 58 C20 38, 24 22, 36 12 Z"
                    fill="none"
                    stroke="url(#leafGold)"
                    strokeWidth="2.5"
                  />
                  <circle cx="36" cy="26" r="4" fill="#F2B84B" />
                  <circle cx="24" cy="38" r="3.5" fill="#4FD1C5" />
                  <circle cx="48" cy="38" r="3.5" fill="#4FD1C5" />
                  <line x1="36" y1="26" x2="24" y2="38" stroke="#68D391" strokeWidth="2" />
                  <line x1="36" y1="26" x2="48" y2="38" stroke="#68D391" strokeWidth="2" />
                </g>
                {/* Title Lettering */}
                <text
                  x="92"
                  y="44"
                  fill="#F4EFE6"
                  fontFamily="Fraunces, Georgia, serif"
                  fontSize="40"
                  fontWeight="600"
                  letterSpacing="-0.02em"
                >
                  Sylvan Synapse
                </text>
                <text
                  x="94"
                  y="70"
                  fill="#68D391"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="12"
                  fontWeight="600"
                  letterSpacing="0.12em"
                >
                  CLINICAL NEUROPLASTICITY SANCTUARY · MAC EDITION
                </text>
              </svg>

              <p className="text-sm text-[#D5E2DC] leading-relaxed max-w-lg">
                Restore a bioluminescent forest sanctuary through four medical research protocols proven to expand working memory, visual processing speed, vagal heart-brain coherence, and hippocampal BDNF synaptogenesis.
              </p>
            </div>

            {/* Unboxed Clinical Evidence Strip */}
            <div className="text-[11px] font-mono text-[#A3B8B0] space-y-1 pt-1 border-t border-[#233D32]">
              <div>
                <span className="text-[#F2B84B]">ACTIVE Trial UFOV</span>
                <span aria-hidden="true"> · </span>
                <span>29% lower 10-yr dementia incidence (Ball et al., JAMA)</span>
              </div>
              <div>
                <span className="text-[#4FD1C5]">Dual N-Back Chimes</span>
                <span aria-hidden="true"> · </span>
                <span>Prefrontal working memory &amp; fluid intelligence (Jaeggi et al., PNAS)</span>
              </div>
              <div>
                <span className="text-[#68D391]">0.1 Hz HRV Coherence &amp; Hippocampal BDNF</span>
                <span aria-hidden="true"> · </span>
                <span>Vagal restoration &amp; spatial neurogenesis (Erickson et al., PNAS)</span>
              </div>
            </div>

            {/* Daily Practice Streak Counter & Neuroplasticity Habit Readout */}
            <div
              data-testid="title-daily-streak"
              aria-label={`Daily Practice Streak: ${dailyStreak.currentStreak} ${dailyStreak.currentStreak === 1 ? 'Day' : 'Days'}`}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 rounded-xl bg-[#10241C] border border-[#233D32]"
            >
              <div className="flex items-center gap-3">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d="M12 2C9.5 6 7 9.5 7 13.5a5 5 0 0 0 10 0C17 9.5 14.5 6 12 2z"
                    fill="#F2B84B"
                    stroke="#FFFBEB"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M12 9c-1.2 2-2 3.5-2 5a2 2 0 0 0 4 0c0-1.5-.8-3-2-5z"
                    fill="#091510"
                  />
                </svg>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                    DAILY PRACTICE STREAK
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-mono font-bold text-[#F2B84B] tabular-nums">
                      {dailyStreak.currentStreak} {dailyStreak.currentStreak === 1 ? 'Day' : 'Days'}
                    </span>
                    <span className="text-xs font-mono text-[#68D391]">
                      {dailyStreak.lastPracticedDate === formatLocalDateIso()
                        ? '· Practiced Today'
                        : '· Ready for Today’s Session'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-xs text-[#A3B8B0] tabular-nums">
                <div>Best Streak: {dailyStreak.longestStreak}d</div>
                <div>Total Sessions: {dailyStreak.totalDaysPracticed}d</div>
              </div>
            </div>

            {/* Cognitive Milestone Badge System & Sanctuary Aesthetic Upgrade Selector */}
            <div
              data-testid="cognitive-milestone-panel"
              className="p-3.5 rounded-xl bg-[#0D2018] border border-[#264538] space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#68D391] font-semibold">
                    COGNITIVE MILESTONE BADGES · SANCTUARY FLORA &amp; FIREFLY UPGRADES
                  </span>
                  <div className="text-xs text-[#D5E2DC]">
                    Active Theme: <span className="font-semibold text-[#F4EFE6]">{activeAesthetic.themeName}</span>{' '}
                    <span className="font-mono text-[#F2B84B] tabular-nums">({activeAesthetic.fireflyCount} Fireflies)</span>
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] text-[#A3B8B0] tabular-nums">
                  <div>
                    Trees Grafted: <span className="text-[#B794F4] font-semibold">{lifetimeProgress.totalTreesGrafted}</span>
                  </div>
                  <div>
                    Peak Score: <span className="text-[#4FD1C5] font-semibold">{lifetimeProgress.peakRejuvenationScore}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {COGNITIVE_MILESTONE_BADGES.map((badge) => {
                  const isUnlocked = milestoneEval.unlockedBadges.some((u) => u.id === badge.id);
                  const isSelected = lifetimeProgress.selectedMilestoneId === badge.id;
                  return (
                    <button
                      key={badge.id}
                      type="button"
                      data-testid={`milestone-badge-${badge.id}`}
                      onClick={() => handleSelectMilestoneBadge(badge.id)}
                      className={`p-2.5 rounded-lg text-left transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-[#17382B] border-[#68D391]'
                          : isUnlocked
                          ? 'bg-[#10261D] border-[#264538] hover:border-[#4FD1C5]'
                          : 'bg-[#0B1913] border-[#1A3026] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#F4EFE6] truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: badge.upgrade.myceliumBridgeHex }}
                          />
                          {badge.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                            isSelected
                              ? 'bg-[#68D391] text-[#091510] font-bold'
                              : isUnlocked
                              ? 'bg-[#1D4032] text-[#68D391]'
                              : 'bg-[#162921] text-[#A3B8B0]'
                          }`}
                        >
                          {isSelected ? 'ACTIVE' : isUnlocked ? 'UNLOCKED' : `${badge.requiredTotalTreesGrafted}T / ${badge.requiredPeakRejuvenationScore}P`}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-[#A3B8B0] mt-1 truncate">
                        {badge.upgrade.fireflyCount} Fireflies · {badge.upgrade.themeName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Selector & Sanctuary Atmosphere Soundscape Selector (Side-by-Side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Stage Selector */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  Select Sanctuary Grove Stage
                </span>
                <div className="flex items-center gap-1.5">
                  {SANCTUARY_STAGES.map((st, idx) => {
                    const locked = idx > highestReachedStage && idx > 0;
                    const active = stageIndex === idx;
                    return (
                      <button
                        key={st.stageIndex}
                        type="button"
                        disabled={locked}
                        onClick={() => setStageIndex(idx)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#1E4435] text-[#F4EFE6] border border-[#68D391]'
                            : locked
                            ? 'bg-[#0D1D17] text-[#526B61] border border-[#192E25] opacity-60 cursor-not-allowed'
                            : 'bg-[#11261E] text-[#A3B8B0] border border-[#233D32] hover:text-[#F4EFE6]'
                        }`}
                      >
                        S{idx + 1}: {idx === 0 ? '1-Back' : idx === 1 ? '2-Back' : idx === 2 ? 'Crown' : 'Apex'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sanctuary Atmosphere Soundscape Selector */}
              <div
                data-testid="title-atmosphere-selector"
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="block text-[11px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                    Sanctuary Atmosphere
                  </span>
                  <span
                    className="text-[10px] font-mono font-semibold truncate"
                    style={{ color: activeAtmosphere.accentHex }}
                  >
                    {activeAtmosphere.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {SANCTUARY_ATMOSPHERES.map((atm) => {
                    const isSelected = atmosphereId === atm.id;
                    return (
                      <button
                        key={atm.id}
                        type="button"
                        data-testid={`atmosphere-btn-${atm.id}`}
                        onClick={() => handleSelectAtmosphere(atm.id)}
                        title={`${atm.label}: ${atm.subtitle}`}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-[#1A3B2E] text-[#F4EFE6] border-[#68D391] font-semibold'
                            : 'bg-[#11261E] text-[#A3B8B0] border-[#233D32] hover:text-[#F4EFE6] hover:border-[#4FD1C5]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: atm.accentHex }}
                        />
                        <span>{atm.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Primary Start CTA, Interactive Demo & Clinical Codex Button (3 actions total) */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                data-start="true"
                onClick={() => startOrRestartGame(stageIndex, false)}
                className="px-6 py-3 rounded-xl bg-[#F2B84B] hover:bg-[#F6AD55] text-[#091510] font-semibold text-sm md:text-base shadow-lg transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Enter Sanctuary [⏎ Return / Space]
              </button>

              <button
                type="button"
                data-testid="watch-demo-button"
                onClick={() => startOrRestartGame(0, true)}
                className="px-4 py-3 rounded-xl bg-[#16382C] hover:bg-[#1E4B3B] text-[#68D391] border border-[#68D391]/60 font-mono font-semibold text-xs md:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                ▶ Interactive How-to-Play Demo
              </button>

              <button
                type="button"
                onClick={() => setIsCodexOpen(true)}
                className="px-4 py-3 rounded-xl bg-[#132A21] hover:bg-[#1C3B2F] text-[#F4EFE6] border border-[#2C4C3E] font-medium text-xs md:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Read Clinical Evidence
              </button>
            </div>
          </div>

          {/* Flat Single-Line Mac Control Hint in Bottom Safe Margin */}
          <div className="text-xs font-mono text-[#A3B8B0] tracking-wide pt-2">
            {MAC_CONTROL_HINT_LINE}
          </div>
        </div>
      )}

      {/* 3. PLAYING HUD (World-Matched, >= 85% Clear Playfield, No Backdrop-Filter) */}
      {gameState === 'playing' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:px-4 md:py-4">
          <div className="space-y-3">
            {/* Top Row: Top-Left Vitality/Nectar/Trees Cluster + Top-Right Utility & N-Back Totem */}
            <div className="flex flex-wrap 2xl:flex-nowrap items-start justify-between gap-2">
              {/* Top-Left Perimeter Cluster: Calm Vitality Pips, BDNF Nectar & Grafted Trees */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-[#091510]/88 border border-[#233D32] shadow-xl pointer-events-auto shrink-0">
              {/* Calm Vitality Pips (3 readable states: Full, Damaged, Hollow) */}
              <div className="whitespace-nowrap">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  VITALITY
                </div>
                <div className="flex items-center gap-0.5 mt-1" aria-label={`Calm Vitality: ${hud.calmVitality} of ${hud.maxVitality}`}>
                  {Array.from({ length: hud.maxVitality }).map((_, i) => {
                    const isFull = i < hud.calmVitality;
                    const isCracked = i === hud.calmVitality && hud.calmVitality < hud.maxVitality;
                    return (
                      <svg
                        key={i}
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 2C7.5 6 4 10.5 4 15a8 8 0 0 0 16 0c0-4.5-3.5-9-8-13z"
                          fill={isFull ? '#68D391' : isCracked ? '#276749' : '#0D1E18'}
                          stroke={isFull ? '#C6F6D5' : isCracked ? '#68D391' : '#2C4C3E'}
                          strokeWidth="2"
                        />
                        {isFull && (
                          <path
                            d="M12 6v12M12 11l3-2M12 14l-3-2"
                            stroke="#091510"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                    );
                  })}
                </div>
              </div>

              {/* BDNF Nectar Counter (Hidden in Zen Mode) */}
              {zenHud.showNectar && (
                <div data-testid="hud-nectar" className="pl-2 border-l border-[#233D32] whitespace-nowrap">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                    NECTAR
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-lg font-mono font-bold text-[#F2B84B] tabular-nums hud-text-stroke">
                      {Math.round(hud.nectar)}
                    </span>
                    <span className="text-[10px] font-mono text-[#A3B8B0] tabular-nums">
                      /{hud.nectarCostPerTree}
                    </span>
                  </div>
                </div>
              )}

              {/* Hippocampal Trees Grafted + Staggered Flowering Tendrils (Hidden in Zen Mode) */}
              {zenHud.showTreesGrafted && (
                <div
                  data-testid="hud-trees-grafted"
                  data-tree-tendril-count={hud.treeTendrilCount ?? 10}
                  data-local-nback-success-pct={hud.localNBackSuccessPct ?? 75}
                  data-flowering-trees-count={hud.floweringTreesCount ?? hud.treesGrafted}
                  className="pl-2 border-l border-[#233D32] whitespace-nowrap"
                  title={`Hippocampal Trees Grafted: ${hud.treesGrafted}/${hud.targetTrees} · Flowering Tendrils per Tree: ${hud.treeTendrilCount ?? 10} (${hud.localNBackSuccessPct ?? 75}% N-Back Success Rate)`}
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0] flex items-center gap-1">
                    <span>TREES</span>
                    {(hud.treesGrafted > 0 || isSanctuaryBloomActive || hud.sanctuaryBloomActive) && (
                      <span
                        data-testid="hud-tendril-count-pill"
                        className="px-1 py-0.2 rounded bg-[#1E1636] text-[#B794F4] text-[9px] border border-[#B794F4]/40 tabular-nums"
                      >
                        {hud.treeTendrilCount ?? 10}✦
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-mono font-bold text-[#B794F4] tabular-nums hud-text-stroke">
                      {hud.treesGrafted}/{hud.targetTrees}
                    </span>
                  </div>
                </div>
              )}

              {/* Rejuvenation Index (Hidden in Zen Mode) */}
              {zenHud.showRejuvenation && (
                <div
                  data-testid="hud-rejuvenation"
                  className="pl-2 border-l border-[#233D32] whitespace-nowrap hidden 2xl:block"
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                    REJUVENATION
                  </div>
                  <div className="text-lg font-mono font-bold text-[#4FD1C5] tabular-nums hud-text-stroke">
                    {Math.round(hud.rejuvenationScore)}
                  </div>
                </div>
              )}

              {/* Adaptive Psychometric Synaptic Flow Multiplier + 'Cognitive Flow Pulse' (Hidden in Zen Mode) */}
              {zenHud.showSynapticFlow && (
                <div
                  data-testid="hud-synaptic-flow"
                  data-flow-pulsing={flowPulseState.isPulsing ? 'true' : 'false'}
                  data-flow-multiplier={flowPulseState.flowMultiplier.toFixed(2)}
                  data-flow-scale={String(flowPulseState.scaleFactor)}
                  onClick={triggerManualFlowPulseSurge}
                  role="button"
                  tabIndex={-1}
                  className="relative pl-2 pr-1.5 py-0.5 border-l border-[#233D32] hidden lg:block whitespace-nowrap rounded-r-xl transition-transform duration-150 cursor-pointer"
                  style={{
                    transform: `scale(${flowPulseState.scaleFactor})`,
                    boxShadow:
                      flowPulseState.glowOpacity > 0
                        ? `0 0 18px rgba(104, 211, 145, ${flowPulseState.glowOpacity})`
                        : undefined,
                    backgroundColor: flowPulseState.isPulsing
                      ? 'rgba(20, 45, 35, 0.92)'
                      : undefined,
                  }}
                  title={`${flowPulseState.statusLabel} · Adaptive UFOV Window: ${hud.adaptiveUfovWindowMs}ms · Click to test Cognitive Flow Pulse`}
                >
                  {/* Expanding Rhythmic Concentration Pulse Ring */}
                  {flowPulseState.isPulsing && (
                    <span
                      data-testid="hud-cognitive-flow-pulse-ring"
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-xl border-2"
                      style={{
                        borderColor: flowPulseState.accentHex,
                        opacity: flowPulseState.ringOpacity,
                        transform: `scale(${flowPulseState.ringExpandScale})`,
                        transition: 'transform 120ms ease-out, opacity 120ms ease-out',
                      }}
                    />
                  )}
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0] flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: flowPulseState.accentHex,
                        boxShadow:
                          flowPulseState.glowOpacity > 0
                            ? `0 0 8px ${flowPulseState.accentHex}`
                            : undefined,
                      }}
                    />
                    <span>FLOW</span>
                    <span className="px-1 py-0.2 rounded bg-[#142D23] text-[#68D391] text-[9px] border border-[#2C4C3E] tabular-nums">
                      {hud.adaptiveUfovWindowMs}ms
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      data-testid="hud-flow-multiplier-value"
                      className="text-lg font-mono font-bold tabular-nums hud-text-stroke"
                      style={{ color: flowPulseState.accentHex }}
                    >
                      {flowPulseState.flowMultiplier.toFixed(2)}x
                    </span>
                    {flowPulseState.isPulsing && (
                      <span
                        data-testid="hud-cognitive-flow-pulse-badge"
                        className="px-1 py-0.5 rounded bg-[#1A4231] text-[#68D391] border border-[#68D391]/60 text-[9px] font-mono font-bold tabular-nums"
                      >
                        +{flowPulseState.multiplierDelta.toFixed(2)}x
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Sanctuary Bloom Post-Processing Status Pill (Triggered after completing all 4 stages or toggled via [B]) */}
              {(isSanctuaryBloomActive || hud.sanctuaryBloomActive) && (
                <div
                  data-testid="sanctuary-bloom-badge"
                  data-tree-tendril-count={hud.treeTendrilCount ?? 12}
                  data-local-nback-success-pct={hud.localNBackSuccessPct ?? 75}
                  className="pl-2 border-l border-[#233D32] whitespace-nowrap shrink-0"
                  title={`Sanctuary Bloom Active — ${hud.treeTendrilCount ?? 12} Flowering Tendrils (${hud.localNBackSuccessPct ?? 75}% N-Back Success Rate) · ${sanctuaryBloomIntensityPct}% Bioluminescence`}
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#B794F4] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4FD1C5] shrink-0" />
                    <span>BLOOM · {hud.treeTendrilCount ?? 12}✦</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-[#4FD1C5] tabular-nums hud-text-stroke mt-0.5">
                    {hud.localNBackSuccessPct ?? 75}% N-BACK
                  </div>
                </div>
              )}
            </div>

            {/* Top-Right Cluster: Live N-Back Working Memory Strip + Compact Utility Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto shrink-0">
              {/* Live N-Back Totem Sequence Indicator + 5-Session HRV Adaptive Difficulty Scaling (Hidden in Zen Mode) */}
              {zenHud.showNBackStream && (
                <div
                  data-testid="hud-nback-stream"
                  data-effective-nback-level={hud.nBackLevel}
                  data-effective-ufov-window-ms={hud.adaptiveUfovWindowMs}
                  data-running-five-hrv-avg={hud.runningFiveSessionHrvAvg ?? activeAdaptiveScaling.runningFiveSessionHrvAvg}
                  data-adaptive-tier-id={activeAdaptiveScaling.tierId}
                  data-rhythm-sync-enabled={rhythmSyncConfig.enabled ? 'true' : 'false'}
                  data-rhythm-chime-interval-sec={activeRhythmSync.effectiveChimeIntervalSec}
                  className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-[#091510]/88 border border-[#233D32] shadow-xl whitespace-nowrap"
                >
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0] flex items-center gap-1.5">
                      <span data-testid="hud-effective-nback-label">
                        {hud.nBackLevel}-BACK CHIME STREAM
                      </span>
                      <button
                        type="button"
                        tabIndex={-1}
                        data-testid="cycle-adaptive-hrv-tier-btn"
                        onClick={handleCycleAdaptiveHrvPreset}
                        title={`${activeAdaptiveScaling.tierLabel}: ${activeAdaptiveScaling.clinicalRationale} (5-Session Avg: ${activeAdaptiveScaling.runningFiveSessionHrvAvg}% · Click to test HRV Flow Scaling tiers)`}
                        className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold border transition-colors cursor-pointer bg-[#142D23] hover:bg-[#1D4032] border-[#2C4C3E]"
                        style={{ color: activeAdaptiveScaling.accentHex }}
                      >
                        5-Sess HRV {hud.runningFiveSessionHrvAvg ?? activeAdaptiveScaling.runningFiveSessionHrvAvg}% · {hud.adaptiveUfovWindowMs}ms
                        {runningFiveSessionHrvAvgOverride !== null ? ' [SIM]' : ''}
                      </button>
                      <button
                        type="button"
                        tabIndex={-1}
                        data-testid="toggle-rhythm-sync-btn"
                        aria-pressed={rhythmSyncConfig.enabled}
                        onClick={handleToggleRhythmSync}
                        title={activeRhythmSync.clinicalSummary}
                        className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                          rhythmSyncConfig.enabled
                            ? 'bg-[#122D26] border-[#4FD1C5] text-[#4FD1C5]'
                            : 'bg-[#142D23] hover:bg-[#1D4032] border-[#2C4C3E] text-[#A3B8B0] hover:text-[#F4EFE6]'
                        }`}
                        style={
                          rhythmSyncConfig.enabled
                            ? {
                                borderColor: activeRhythmSync.primaryColorHex,
                                color: activeRhythmSync.primaryColorHex,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: rhythmSyncConfig.enabled
                              ? activeRhythmSync.primaryColorHex
                              : '#526B61',
                          }}
                        />
                        <span data-testid="hud-rhythm-sync-badge-text">
                          {rhythmSyncConfig.enabled
                            ? activeRhythmSync.modeBadgeLabel
                            : `Rhythm Sync · ${activeRhythmSync.effectiveChimeIntervalSec.toFixed(2)}s`}
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {hud.chimeHistory.slice(-(hud.nBackLevel === 3 ? 4 : 3)).map((sym, idx, arr) => {
                        const isLatest = idx === arr.length - 1;
                        return (
                          <React.Fragment key={idx}>
                            {renderSymbolBadge(sym, isLatest && hud.isNBackReadyToMatch)}
                            {idx < arr.length - 1 && (
                              <span className="text-xs text-[#526B61]">→</span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setTriggerActionSignal({ action: 'chime', seq: Date.now() });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      hud.isNBackReadyToMatch
                        ? 'bg-[#F2B84B] text-[#091510] shadow-md'
                        : 'bg-[#152E24] text-[#4FD1C5] border border-[#2C4C3E] hover:bg-[#1E3F32]'
                    }`}
                  >
                    Ring Echo [E]
                  </button>
                </div>
              )}

              {/* Compact Square SVG Utility Buttons: Codex, Mute [M], Restart [R], Pause [P] */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#091510]/88 border border-[#233D32]">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Open Clinical Evidence Codex"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setIsCodexOpen(true);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#68D391] border border-[#2C4C3E] cursor-pointer"
                  title="Clinical Evidence Codex"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </button>

                {/* Sanctuary Atmosphere Switcher (Forest / Rain / Meadow) */}
                <div
                  data-testid="hud-atmosphere-selector"
                  className="hidden 2xl:flex items-center gap-1 p-0.5 rounded-lg bg-[#0D1F18] border border-[#233D32]"
                  title={`Sanctuary Atmosphere: ${activeAtmosphere.label} — ${activeAtmosphere.subtitle}`}
                >
                  {SANCTUARY_ATMOSPHERES.map((atm) => {
                    const isSelected = atmosphereId === atm.id;
                    return (
                      <button
                        key={atm.id}
                        type="button"
                        tabIndex={-1}
                        data-testid={`hud-atmosphere-${atm.id}`}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          handleSelectAtmosphere(atm.id);
                        }}
                        className={`px-2 h-7 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1D4032] text-[#F4EFE6] border border-[#68D391]/60'
                            : 'text-[#A3B8B0] hover:text-[#F4EFE6]'
                        }`}
                      >
                        {atm.shortLabel}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="toggle-zen-mode-btn"
                  aria-pressed={isZenMode}
                  aria-label="Toggle Zen Mode [Z] — Minimalist HRV Breathing View"
                  onClick={handleToggleZenMode}
                  className={`px-2 h-8 flex items-center gap-1 rounded-lg text-[10px] font-mono font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isZenMode
                      ? 'bg-[#1A4231] text-[#68D391] border-[#68D391] shadow-md'
                      : 'bg-[#132A21] text-[#A3B8B0] hover:text-[#F4EFE6] border-[#2C4C3E]'
                  }`}
                  title="Toggle Zen Mode [Z] — Hide non-essential telemetry (nectar, trees, flow) for focused 0.1 Hz HRV breathing"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isZenMode ? 'bg-[#68D391]' : 'bg-[#526B61]'
                    }`}
                  />
                  <span>{isZenMode ? 'Zen: ON' : 'Zen [Z]'}</span>
                </button>

                {/* Sanctuary Bloom Toggle + Bloom Preset Menu + Bioluminescence Intensity Slider Control */}
                <div
                  data-testid="hud-sanctuary-bloom-section"
                  data-active-bloom-preset={sanctuaryBloomPresetId}
                  data-bloom-primary-hex={activeBloomPreset.primaryHex}
                  className={`flex items-center gap-1.5 px-2 h-8 rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    isSanctuaryBloomActive
                      ? 'bg-[#171B2A] shadow-md'
                      : 'bg-[#132A21] border-[#2C4C3E]'
                  }`}
                  style={
                    isSanctuaryBloomActive
                      ? { borderColor: activeBloomPreset.primaryHex }
                      : undefined
                  }
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="toggle-sanctuary-bloom-btn"
                    aria-pressed={isSanctuaryBloomActive}
                    aria-label="Toggle 4-Stage Sanctuary Bloom Post-Processing & Orbital Camera [B]"
                    onClick={handleToggleSanctuaryBloom}
                    className={`flex items-center gap-1 text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                      isSanctuaryBloomActive
                        ? 'text-[#F4EFE6]'
                        : 'text-[#A3B8B0] hover:text-[#F4EFE6]'
                    }`}
                    style={
                      isSanctuaryBloomActive
                        ? { color: activeBloomPreset.primaryHex }
                        : undefined
                    }
                    title="Sanctuary Bloom [B] — 4-Stage Full-Canvas Bioluminescence Saturation & Slow Orbital Camera Rotation"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: isSanctuaryBloomActive
                          ? activeBloomPreset.primaryHex
                          : '#526B61',
                      }}
                    />
                    <span>{isSanctuaryBloomActive ? 'Bloom: ON' : 'Bloom [B]'}</span>
                  </button>

                  {/* Bloom Preset Menu: Morning Glow, Midnight Forest, Neural Zenith */}
                  <div
                    role="group"
                    aria-label="Sanctuary Bloom Presets"
                    data-testid="hud-sanctuary-bloom-preset-menu"
                    className="flex items-center gap-1 pl-1.5 border-l border-[#2C4C3E]"
                  >
                    {SANCTUARY_BLOOM_PRESET_LIST.map((preset) => {
                      const isSelected = sanctuaryBloomPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          tabIndex={-1}
                          data-testid={`bloom-preset-${preset.id}`}
                          data-preset-id={preset.id}
                          data-default-intensity={preset.defaultIntensityPct}
                          data-primary-hex={preset.primaryHex}
                          aria-pressed={isSelected}
                          onClick={(e) => handleSelectBloomPreset(preset.id, e)}
                          title={`${preset.label} (${preset.defaultIntensityPct}% Intensity) — ${preset.subtitle}`}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-[#0E1E18] text-[#F4EFE6] shadow-xs'
                              : 'bg-[#0B1712]/70 text-[#A3B8B0] border-transparent hover:text-[#F4EFE6] hover:bg-[#152B22]'
                          }`}
                          style={
                            isSelected
                              ? {
                                  borderColor: preset.primaryHex,
                                  color: preset.primaryHex,
                                }
                              : undefined
                          }
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: preset.primaryHex }}
                          />
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className="flex items-center gap-1 pl-1.5 border-l border-[#2C4C3E]"
                    title={`Sanctuary Bloom Bioluminescence Intensity: ${sanctuaryBloomIntensityPct}% (${activeBloomPreset.label} · Persisted in localStorage)`}
                  >
                    <label
                      htmlFor="sanctuary-bloom-intensity-slider"
                      className="sr-only"
                    >
                      Sanctuary Bloom Bioluminescence Intensity
                    </label>
                    <input
                      id="sanctuary-bloom-intensity-slider"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={sanctuaryBloomIntensityPct}
                      onChange={handleChangeBloomIntensity}
                      data-testid="sanctuary-bloom-intensity-slider"
                      aria-label="Sanctuary Bloom Bioluminescence Intensity"
                      className="w-12 h-1.5 bg-[#0B1914] rounded-lg cursor-pointer"
                      style={{ accentColor: activeBloomPreset.primaryHex }}
                    />
                    <span
                      data-testid="sanctuary-bloom-intensity-value"
                      className="text-[10px] font-mono font-semibold tabular-nums w-7 text-right"
                      style={{ color: activeBloomPreset.primaryHex }}
                    >
                      {sanctuaryBloomIntensityPct}%
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="toggle-binaural-btn"
                  aria-label="Toggle 10 Hz Alpha Binaural Entrainment"
                  onClick={handleToggleBinaural}
                  className={`px-2 h-8 flex items-center gap-1 rounded-lg text-[10px] font-mono font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isBinauralEnabled && !isMuted
                      ? 'bg-[#17362B] text-[#4FD1C5] border-[#4FD1C5]/60'
                      : 'bg-[#132A21] text-[#6E857C] border-[#2C4C3E]'
                  }`}
                  title="10 Hz Alpha Wave Binaural Acoustic Entrainment (200 Hz L / 210 Hz R)"
                >
                  <span>10Hz α</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-gentle-reminder-btn"
                  aria-label="Gentle Habit Notification (+30m Post-Practice NSDR & Reframing Reminder)"
                  onClick={handleToggleGentleReminderPreview}
                  className={`relative w-8 h-8 flex items-center justify-center rounded-lg border transition-colors shrink-0 cursor-pointer ${
                    gentleNotificationEval.shouldShowToast
                      ? 'bg-[#2B2112] text-[#F2B84B] border-[#F2B84B]'
                      : gentleNotificationEval.allHabitsLogged
                      ? 'bg-[#132A21] text-[#68D391] border-[#68D391]/50'
                      : 'bg-[#132A21] hover:bg-[#1E3F32] text-[#F4EFE6] border-[#2C4C3E]'
                  }`}
                  title={`${gentleNotificationEval.statusBadgeLabel} — Usual Practice ${gentleNotificationEval.usualPracticeTimeHm} → +30m Trigger @ ${gentleNotificationEval.triggerTimeHm}`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {!gentleNotificationEval.allHabitsLogged && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: gentleNotificationEval.shouldShowToast
                          ? '#F2B84B'
                          : '#4FD1C5',
                      }}
                    />
                  )}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isMuted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
                  onClick={handleToggleMute}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] cursor-pointer"
                  title="Toggle Mute [M]"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    {!isMuted ? (
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                    ) : (
                      <line x1="23" y1="9" x2="17" y2="15" />
                    )}
                  </svg>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Restart Stage [R]"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    startOrRestartGame(stageIndex);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] cursor-pointer"
                  title="Restart Stage"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Toggle macOS Fullscreen"
                  onClick={handleToggleFullscreen}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] cursor-pointer"
                  title="Toggle macOS Fullscreen"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Pause Sanctuary [P / ⎋ Esc]"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleTogglePause();
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] cursor-pointer"
                  title="Pause [⎋ Esc / P]"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

            {/* COGNITIVE RHYTHM SYNC CALIBRATION PANEL (Resting Heart Rate BPM / Breathing Cadence Entrainment) */}
            {isRhythmCalibratorOpen && !isZenMode && (
              <div className="flex justify-end pointer-events-none">
                <div
                  data-testid="hud-rhythm-sync-panel"
                  data-rhythm-enabled={rhythmSyncConfig.enabled ? 'true' : 'false'}
                  data-rhythm-source={rhythmSyncConfig.syncSource}
                  data-chime-interval-sec={activeRhythmSync.effectiveChimeIntervalSec}
                  className="w-full max-w-xl rounded-2xl bg-[#091510]/94 border border-[#2C4C3E] p-3 shadow-2xl pointer-events-auto space-y-2"
                  style={{
                    borderColor: rhythmSyncConfig.enabled
                      ? activeRhythmSync.primaryColorHex
                      : '#2C4C3E',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: rhythmSyncConfig.enabled
                            ? activeRhythmSync.primaryColorHex
                            : '#526B61',
                        }}
                      />
                      <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#F4EFE6]">
                        Rhythm Sync Calibration
                      </span>
                      <span
                        data-testid="rhythm-sync-chime-interval-value"
                        className="px-1.5 py-0.5 rounded bg-[#132A21] border border-[#2C4C3E] text-[9.5px] font-mono font-semibold tabular-nums"
                        style={{ color: activeRhythmSync.primaryColorHex }}
                      >
                        Chime Every {activeRhythmSync.effectiveChimeIntervalSec.toFixed(2)}s ({activeRhythmSync.chimeFrequencyHz.toFixed(2)} Hz)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        data-testid="rhythm-sync-enable-toggle"
                        aria-pressed={rhythmSyncConfig.enabled}
                        onClick={handleToggleRhythmSyncActiveState}
                        className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-semibold border transition-colors cursor-pointer ${
                          rhythmSyncConfig.enabled
                            ? 'bg-[#17362B] text-[#68D391] border-[#68D391]'
                            : 'bg-[#132A21] text-[#A3B8B0] border-[#2C4C3E] hover:text-[#F4EFE6]'
                        }`}
                      >
                        {rhythmSyncConfig.enabled ? 'Sync: ACTIVE' : 'Sync: OFF'}
                      </button>
                      <button
                        type="button"
                        data-testid="close-rhythm-sync-panel-btn"
                        aria-label="Close Cognitive Rhythm Sync Panel"
                        onClick={() => setIsRhythmCalibratorOpen(false)}
                        className="px-2 py-0.5 rounded text-[9.5px] font-mono text-[#A3B8B0] hover:text-[#F4EFE6] bg-[#132A21] border border-[#2C4C3E] cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>

                  {/* Calibration Source Tabs: Resting Heart Rate vs Breathing Cadence */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      data-testid="rhythm-source-heart_rate"
                      aria-pressed={rhythmSyncConfig.syncSource === 'heart_rate'}
                      onClick={(e) => handleSelectRhythmSource('heart_rate', e)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                        rhythmSyncConfig.syncSource === 'heart_rate'
                          ? 'bg-[#122D26] text-[#4FD1C5] border-[#4FD1C5]'
                          : 'bg-[#11231C] text-[#A3B8B0] border-[#233D32] hover:text-[#F4EFE6]'
                      }`}
                    >
                      <span>♥ Resting Heart Rate (BPM)</span>
                      <span className="tabular-nums font-bold">{rhythmSyncConfig.restingHeartRateBpm} BPM</span>
                    </button>

                    <button
                      type="button"
                      data-testid="rhythm-source-breathing_cadence"
                      aria-pressed={rhythmSyncConfig.syncSource === 'breathing_cadence'}
                      onClick={(e) => handleSelectRhythmSource('breathing_cadence', e)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                        rhythmSyncConfig.syncSource === 'breathing_cadence'
                          ? 'bg-[#143022] text-[#68D391] border-[#68D391]'
                          : 'bg-[#11231C] text-[#A3B8B0] border-[#233D32] hover:text-[#F4EFE6]'
                      }`}
                    >
                      <span>≈ Breathing Cadence (RSA)</span>
                      <span className="tabular-nums font-bold">{rhythmSyncConfig.breathingCadenceBpm.toFixed(1)}/min</span>
                    </button>
                  </div>

                  {/* Calibration Slider + Presets for Active Source */}
                  {rhythmSyncConfig.syncSource === 'heart_rate' ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="rhythm-sync-hr-slider"
                          className="text-[10px] font-mono text-[#A3B8B0] shrink-0"
                        >
                          Resting HR:
                        </label>
                        <input
                          id="rhythm-sync-hr-slider"
                          type="range"
                          min={45}
                          max={100}
                          step={1}
                          value={rhythmSyncConfig.restingHeartRateBpm}
                          onChange={(e) => handleChangeRestingHeartRateBpm(Number(e.target.value))}
                          data-testid="rhythm-sync-bpm-slider"
                          aria-label="Calibrate Resting Heart Rate BPM"
                          className="flex-1 h-1.5 bg-[#0D1E17] rounded-lg accent-[#4FD1C5] cursor-pointer"
                        />
                        <span
                          data-testid="rhythm-sync-active-bpm-readout"
                          className="text-[11px] font-mono font-bold text-[#4FD1C5] tabular-nums w-14 text-right"
                        >
                          {rhythmSyncConfig.restingHeartRateBpm} BPM
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {COGNITIVE_RHYTHM_HEART_RATE_PRESETS.map((bpm) => {
                          const isSelected = rhythmSyncConfig.restingHeartRateBpm === bpm;
                          return (
                            <button
                              key={bpm}
                              type="button"
                              data-testid={`rhythm-hr-preset-${bpm}`}
                              onClick={() => handleChangeRestingHeartRateBpm(bpm)}
                              className={`flex-1 py-0.5 rounded text-[9.5px] font-mono font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                                isSelected
                                  ? 'bg-[#16382E] text-[#4FD1C5] border-[#4FD1C5]'
                                  : 'bg-[#0E1E18] text-[#A3B8B0] border-[#233D32] hover:text-[#F4EFE6]'
                              }`}
                            >
                              {bpm} BPM
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="rhythm-sync-breath-slider"
                          className="text-[10px] font-mono text-[#A3B8B0] shrink-0"
                        >
                          Breathing:
                        </label>
                        <input
                          id="rhythm-sync-breath-slider"
                          type="range"
                          min={4.5}
                          max={12.0}
                          step={0.5}
                          value={rhythmSyncConfig.breathingCadenceBpm}
                          onChange={(e) => handleChangeBreathingCadenceBpm(Number(e.target.value))}
                          data-testid="rhythm-sync-bpm-slider"
                          aria-label="Calibrate Breathing Cadence Breaths Per Minute"
                          className="flex-1 h-1.5 bg-[#0D1E17] rounded-lg accent-[#68D391] cursor-pointer"
                        />
                        <span
                          data-testid="rhythm-sync-active-bpm-readout"
                          className="text-[11px] font-mono font-bold text-[#68D391] tabular-nums w-14 text-right"
                        >
                          {rhythmSyncConfig.breathingCadenceBpm.toFixed(1)}/m
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {COGNITIVE_RHYTHM_BREATH_CADENCE_PRESETS.map((cadence) => {
                          const isSelected = Math.abs(rhythmSyncConfig.breathingCadenceBpm - cadence) < 0.05;
                          return (
                            <button
                              key={cadence}
                              type="button"
                              data-testid={`rhythm-breath-preset-${cadence}`}
                              onClick={() => handleChangeBreathingCadenceBpm(cadence)}
                              className={`flex-1 py-0.5 rounded text-[9.5px] font-mono font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                                isSelected
                                  ? 'bg-[#163827] text-[#68D391] border-[#68D391]'
                                  : 'bg-[#0E1E18] text-[#A3B8B0] border-[#233D32] hover:text-[#F4EFE6]'
                              }`}
                            >
                              {cadence.toFixed(1)}/m
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Live Mini-Waveform Preview & Clinical Entrainment Note */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1E352B]">
                    <span className="text-[9.5px] font-mono text-[#A3B8B0] whitespace-nowrap">
                      {rhythmSyncConfig.syncSource === 'heart_rate'
                        ? `Baroreflex Entrainment: 1 chime / 4 beats (${rhythmSyncConfig.restingHeartRateBpm} BPM · ${activeRhythmSync.physiologicalFrequencyHz.toFixed(2)} Hz)`
                        : `Vagal RSA Entrainment: 1 chime / half-breath (${rhythmSyncConfig.breathingCadenceBpm.toFixed(1)}/min · ${activeRhythmSync.physiologicalFrequencyHz.toFixed(2)} Hz)`}
                    </span>
                    <svg
                      viewBox="0 0 120 24"
                      data-testid="rhythm-sync-mini-waveform"
                      className="w-28 h-5 shrink-0 overflow-visible"
                    >
                      <polyline
                        fill="none"
                        stroke={activeRhythmSync.primaryColorHex}
                        strokeWidth="1.8"
                        points={activeRhythmSync.waveformPoints
                          .map(
                            (pt) =>
                              `${(pt.normalizedX * 120).toFixed(1)},${(12 - pt.displacementY * 9).toFixed(1)}`
                          )
                          .join(' ')}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* INTERACTIVE HOW-TO-PLAY DEMO WALKTHROUGH OVERLAY (when isDemoMode === true) */}
            {isDemoMode && (
              <div
                data-testid="demo-walkthrough-banner"
                className="mx-auto max-w-3xl rounded-2xl bg-[#091510]/94 border-2 border-[#68D391] p-4 shadow-2xl pointer-events-auto space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#091510]"
                      style={{ backgroundColor: currentDemoStep.accentHex }}
                    >
                      INTERACTIVE HOW-TO-PLAY DEMO
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#68D391]">
                      {currentDemoStep.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="exit-demo-button"
                      onClick={() => {
                        setIsDemoMode(false);
                        setResetSignal((s) => s + 1);
                      }}
                      className="px-3 py-1 rounded-lg bg-[#F2B84B] hover:bg-[#F6AD55] text-[#091510] font-mono font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Take Control &amp; Play Yourself
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDemoMode(false);
                        soundEngine.pauseAmbient();
                        setGameState('title');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#152E24] hover:bg-[#1E3F32] text-[#D5E2DC] border border-[#2C4C3E] font-mono text-xs transition-colors cursor-pointer"
                    >
                      Title Screen
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base font-display font-semibold text-[#F4EFE6]">
                      {currentDemoStep.title}
                    </h2>
                    <span className="text-xs font-mono text-[#F2B84B]">
                      Controls: {currentDemoStep.controls}
                    </span>
                  </div>
                  <p className="text-xs text-[#D5E2DC] leading-relaxed">
                    {currentDemoStep.description}
                  </p>
                </div>

                {/* Step Selector Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1D352B]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {DEMO_WALKTHROUGH_STEPS.map((st) => {
                      const active = hud.demoStepIndex === st.stepIndex;
                      return (
                        <button
                          key={st.stepIndex}
                          type="button"
                          data-testid={`demo-step-btn-${st.stepIndex + 1}`}
                          onClick={() =>
                            setDemoStepSignal({ step: st.stepIndex, seq: Date.now() })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#1E4435] text-[#F4EFE6] border border-[#68D391] font-semibold'
                              : 'bg-[#10241C] text-[#A3B8B0] border border-[#233D32] hover:text-[#F4EFE6]'
                          }`}
                        >
                          Step {st.stepIndex + 1}:{' '}
                          {st.stepIndex === 0
                            ? 'UFOV Forage'
                            : st.stepIndex === 1
                            ? 'N-Back Chime'
                            : st.stepIndex === 2
                            ? '0.1 Hz Breath'
                            : 'BDNF Graft'}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] font-mono text-[#A3B8B0]">
                    Autopilot demonstrating live · Press WASD anytime to steer manually
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Active UFOV Divided-Attention Quick Sector Picker Bar (when Shrine triggered) */}
          {hud.ufovActiveChallenge && hud.ufovActiveChallenge.awaitingSelection && (
            <div className="self-center px-5 py-3 rounded-2xl bg-[#091510]/94 border-2 border-[#F2B84B] shadow-2xl pointer-events-auto flex flex-col items-center gap-2">
              <div className="text-xs font-mono text-[#F2B84B] font-semibold">
                UFOV DIVIDED ATTENTION: Central Glyph [{hud.ufovActiveChallenge.centerSymbol}] — Click Peripheral Firefly Direction!
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {COMPASS_LABELS.map((dir, sIdx) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() =>
                      setUfovSectorChoiceSignal({ sector: sIdx, seq: Date.now() })
                    }
                    className="px-2.5 py-1 rounded bg-[#152E24] hover:bg-[#F2B84B] hover:text-[#091510] text-xs font-mono font-semibold text-[#F4EFE6] border border-[#2C4C3E] transition-colors cursor-pointer"
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Unified Perimeter Dock: Zen Minimalist 0.1 Hz HRV Guide OR Full 4-Protocol Deck */}
          <div className="flex flex-col items-center gap-2">
            {zenHud.showZenBreathingGuide ? (
              <div
                data-testid="zen-mode-breathing-bar"
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-[#091510]/88 border border-[#68D391]/50 shadow-2xl pointer-events-auto max-w-xl w-full"
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#68D391] animate-pulse" />
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#68D391] font-semibold">
                      ZEN HRV COHERENCE MODE · 0.1 Hz (6 BREATHS / MIN)
                    </div>
                    <div className="text-xs text-[#D5E2DC]">
                      5s Inhale · 5s Exhale — Vagal Coherence Shield Active
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-36">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#68D391] font-bold">{hud.breathPhaseLabel}</span>
                      <span className="text-[#A3B8B0]">0.1 Hz</span>
                    </div>
                    <div className="w-full h-2.5 mt-1 rounded-full bg-[#122920] overflow-hidden border border-[#2C4C3E]">
                      <div
                        className="h-full bg-[#68D391] origin-left"
                        style={{ transform: `scaleX(${Math.max(0.08, hud.breathExpansion)})` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="exit-zen-mode-btn"
                    onClick={handleToggleZenMode}
                    className="px-3 py-1.5 rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#F4EFE6] text-xs font-mono font-semibold border border-[#2C4C3E] transition-colors cursor-pointer"
                  >
                    Exit Zen [Z]
                  </button>
                </div>
              </div>
            ) : (
              <>
                {hud.statusBannerText && (
                  <div className="px-4 py-1.5 rounded-xl bg-[#091510]/90 border border-[#233D32] text-xs font-mono text-[#F4EFE6] shadow-md">
                    {hud.statusBannerText}
                  </div>
                )}

                <div
                  data-testid="hud-protocol-deck"
                  className="flex flex-wrap items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#091510]/90 border border-[#233D32] shadow-2xl pointer-events-auto"
                >
                  {/* 4 Evidence-Based Cognitive Protocol Action Slots */}
                  {(Object.keys(CLINICAL_PROTOCOLS) as ProtocolId[]).map((pid) => {
                    const proto = CLINICAL_PROTOCOLS[pid];
                    const isSelected = activeProtocol === pid;
                    return (
                      <button
                        key={pid}
                        type="button"
                        tabIndex={-1}
                        data-testid={`protocol-btn-${pid}`}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          setActiveProtocol(pid);
                          if (pid === 'ufov_forage') {
                            setTriggerActionSignal({ action: 'pulse', seq: Date.now() });
                          } else if (pid === 'nback_chimes') {
                            setTriggerActionSignal({ action: 'chime', seq: Date.now() });
                          } else if (pid === 'dendrite_graft') {
                            setTriggerActionSignal({ action: 'graft', seq: Date.now() });
                          }
                        }}
                        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-left transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-[#18382B] border-2 border-[#68D391] text-[#F4EFE6]'
                            : 'bg-[#0F241C] border border-[#233D32] text-[#A3B8B0] hover:text-[#F4EFE6]'
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold text-[#091510]"
                          style={{ backgroundColor: proto.accentHex }}
                        >
                          {proto.keyBinding}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-[#F4EFE6]">
                            {proto.actionName}
                          </div>
                          <div className="text-[10px] font-mono text-[#A3B8B0]">
                            {proto.roleClue}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Live 0.1 Hz HRV Resonance Breath Cadence Meter */}
                  <div className="pl-3 border-l border-[#233D32] flex items-center gap-2.5">
                    <div className="w-24">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-[#68D391] font-semibold">{hud.breathPhaseLabel}</span>
                        <span className="text-[#A3B8B0]">0.1 Hz</span>
                      </div>
                      <div className="w-full h-2 mt-1 rounded-full bg-[#122920] overflow-hidden border border-[#233D32]">
                        <div
                          className="h-full bg-[#68D391] origin-left"
                          style={{ transform: `scaleX(${Math.max(0.08, hud.breathExpansion)})` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. PAUSED MODAL (Single Focused Card in World Palette) */}
      {gameState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
          className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-[#07120E]/85 pointer-events-auto"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#10231C] border border-[#2C4C3E] p-7 shadow-2xl space-y-6 text-center">
            <div className="space-y-1">
              <p className="text-xs font-mono uppercase tracking-wider text-[#68D391]">
                Sanctuary Rest State
              </p>
              <h2 id="pause-modal-title" className="text-2xl font-display font-semibold text-[#F4EFE6]">
                Cognitive Session Paused
              </h2>
              <p className="text-xs text-[#A3B8B0]">{hud.stageName}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#0B1914] border border-[#233D32]">
              <div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">TREES GRAFTED</div>
                <div className="text-xl font-mono font-bold text-[#B794F4] tabular-nums">
                  {hud.treesGrafted}/{hud.targetTrees}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">BDNF NECTAR</div>
                <div className="text-xl font-mono font-bold text-[#F2B84B] tabular-nums">
                  {Math.round(hud.nectar)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">REJUVENATION</div>
                <div className="text-xl font-mono font-bold text-[#4FD1C5] tabular-nums">
                  {Math.round(hud.rejuvenationScore)}
                </div>
              </div>
            </div>

            {/* Pause Modal Sanctuary Atmosphere Selector */}
            <div
              data-testid="pause-atmosphere-selector"
              className="p-3.5 rounded-xl bg-[#0B1914] border border-[#233D32] text-left space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  SANCTUARY ATMOSPHERE SOUNDSCAPE
                </span>
                <span
                  className="text-[10px] font-mono font-semibold"
                  style={{ color: activeAtmosphere.accentHex }}
                >
                  {activeAtmosphere.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SANCTUARY_ATMOSPHERES.map((atm) => {
                  const isSelected = atmosphereId === atm.id;
                  return (
                    <button
                      key={atm.id}
                      type="button"
                      onClick={() => handleSelectAtmosphere(atm.id)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-[#1A3B2E] text-[#F4EFE6] border-[#68D391]'
                          : 'bg-[#10231C] text-[#A3B8B0] border-[#233D32] hover:text-[#F4EFE6]'
                      }`}
                    >
                      {atm.shortLabel}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#A3B8B0]">{activeAtmosphere.subtitle}</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleTogglePause}
                className="w-full py-3 rounded-xl bg-[#F2B84B] hover:bg-[#F6AD55] text-[#091510] font-semibold text-sm transition-colors cursor-pointer"
              >
                Resume Sanctuary [Esc / P]
              </button>
              <button
                type="button"
                onClick={() => startOrRestartGame(stageIndex, false)}
                className="w-full py-2.5 rounded-xl bg-[#152E24] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] font-medium text-sm transition-colors cursor-pointer"
              >
                Restart Stage
              </button>
              <button
                type="button"
                onClick={() => startOrRestartGame(0, true)}
                className="w-full py-2.5 rounded-xl bg-[#152E24] hover:bg-[#1E3F32] text-[#68D391] border border-[#2C4C3E] font-medium text-sm transition-colors cursor-pointer"
              >
                Watch Interactive How-to-Play Demo
              </button>
              <button
                type="button"
                data-testid="pause-complete-session-btn"
                onClick={() => {
                  handleGameEnd('victory', {
                    rejuvenationScore: Math.max(850, Math.round(hud.rejuvenationScore)),
                    processingSpeedPct: 88,
                    workingMemoryPct: 90,
                    vagalCoherencePct: 86,
                    spatialPlasticityPct: Math.min(100, Math.round((hud.treesGrafted / Math.max(1, hud.targetTrees)) * 100) || 75),
                    treesGrafted: hud.treesGrafted,
                    targetTrees: hud.targetTrees,
                    isVictory: true,
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-[#152E24] hover:bg-[#1E3F32] text-[#B794F4] border border-[#2C4C3E] font-medium text-sm transition-colors cursor-pointer"
              >
                Complete Session &amp; Open Insight Journal
              </button>
              <button
                type="button"
                data-testid="pause-complete-all-stages-bloom-btn"
                onClick={() => {
                  setStageIndex(SANCTUARY_STAGES.length - 1);
                  setHighestReachedStage(SANCTUARY_STAGES.length - 1);
                  setCompletedStagesCount(SANCTUARY_STAGES.length);
                  setIsSanctuaryBloomActive(true);
                  if (typeof window !== 'undefined') {
                    try {
                      window.localStorage.setItem(
                        SANCTUARY_BLOOM_STORAGE_KEY,
                        JSON.stringify({ completedStagesCount: SANCTUARY_STAGES.length })
                      );
                    } catch {
                      // Ignore storage errors
                    }
                  }
                  soundEngine.resumeAmbient();
                  setGameState('playing');
                  document.body.dataset.state = 'playing';
                }}
                className="w-full py-2.5 rounded-xl bg-[#1E1936] hover:bg-[#2A224B] text-[#B794F4] border border-[#B794F4]/60 font-medium text-sm transition-colors cursor-pointer"
              >
                Complete All 4 Stages &amp; Trigger Sanctuary Bloom
              </button>
              <button
                type="button"
                onClick={() => setIsCodexOpen(true)}
                className="w-full py-2.5 rounded-xl bg-[#152E24] hover:bg-[#1E3F32] text-[#4FD1C5] border border-[#2C4C3E] font-medium text-sm transition-colors cursor-pointer"
              >
                Inspect Clinical Research Codex
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDemoMode(false);
                  soundEngine.pauseAmbient();
                  setGameState('title');
                }}
                className="w-full py-2.5 rounded-xl bg-transparent hover:bg-[#152E24] text-[#A3B8B0] font-medium text-xs transition-colors cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. VICTORY / GAME OVER MODAL (Single Focused Status Card with Tabular-Nums Mastery Metrics + Cognitive Bloom Impact Breakdown + Cognitive Insight Journal) */}
      {gameState === 'gameover' && endSummary && (() => {
        const bloomImpact = computeCognitiveBloomImpactBreakdown({
          summary: endSummary,
          treesGrafted: hud.treesGrafted,
          targetTrees: hud.targetTrees,
          nBackLevel: hud.nBackLevel,
          ufovWindowMs: hud.adaptiveUfovWindowMs,
          flowMultiplier: hud.flowMultiplier,
        });
        return (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-modal-title"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 md:p-5 bg-[#07120E]/88 pointer-events-auto"
        >
          <div className="w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-2xl bg-[#10231C] border border-[#2C4C3E] p-4 shadow-2xl space-y-2.5">
            <div className="text-center space-y-0.5">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#68D391]">
                {gameOutcome === 'victory'
                  ? 'Hippocampal & Prefrontal Circuitry Illuminated'
                  : 'Directed Attention Fatigued — Take a Slow 0.1 Hz Breath'}
              </p>
              <h2
                id="gameover-modal-title"
                className="text-xl md:text-2xl font-display font-semibold text-[#F4EFE6]"
              >
                {gameOutcome === 'victory'
                  ? 'Sanctuary Grove Rejuvenated!'
                  : 'Sensory Overwhelm — Rest & Restore'}
              </h2>
              {(completedStagesCount >= SANCTUARY_STAGES.length || isSanctuaryBloomActive) && (
                <div
                  data-testid="victory-sanctuary-bloom-banner"
                  className="mt-1 inline-flex items-center gap-2 px-3 py-0.5 rounded-lg bg-[#1E1936] border border-[#B794F4]/60 text-[11px] font-mono text-[#B794F4]"
                >
                  <span className="w-2 h-2 rounded-full bg-[#4FD1C5]" />
                  <span>
                    All 4 Sanctuary Stages Completed · Bioluminescence Saturation &amp; Orbital Camera Bloom Active
                  </span>
                </div>
              )}
            </div>

            {/* 3 Primary Tabular-Nums Stat Tiles */}
            <div className="grid grid-cols-3 gap-2.5 p-2.5 rounded-xl bg-[#0B1914] border border-[#233D32] text-center">
              <div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">REJUVENATION SCORE</div>
                <div className="text-xl font-mono font-bold text-[#F2B84B] tabular-nums">
                  {endSummary.rejuvenationScore}
                </div>
                <div className="text-[10px] font-mono text-[#68D391] tabular-nums">
                  Peak: {lifetimeProgress.peakRejuvenationScore}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">UFOV &amp; N-BACK</div>
                <div className="text-xl font-mono font-bold text-[#4FD1C5] tabular-nums">
                  {Math.round((endSummary.processingSpeedPct + endSummary.workingMemoryPct) / 2)}%
                </div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">Accuracy</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">TOTAL TREES GRAFTED</div>
                <div className="text-xl font-mono font-bold text-[#B794F4] tabular-nums">
                  {lifetimeProgress.totalTreesGrafted}
                </div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">
                  {milestoneEval.highestUnlockedBadge.title}
                </div>
              </div>
            </div>

            {/* COGNITIVE BLOOM IMPACT SUMMARY PANEL (N-Back Accuracy vs. UFOV Response Times & Mechanic Score Breakdown) */}
            <section
              data-testid="cognitive-bloom-impact-panel"
              data-total-score={bloomImpact.totalRejuvenationScore}
              data-primary-driver={bloomImpact.primaryDriverId}
              data-avg-ufov-ms={bloomImpact.avgUfovResponseMs}
              className="p-3 rounded-xl bg-[#0B1914] border border-[#2C4C3E] space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4FD1C5] shrink-0" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F4EFE6]">
                    Cognitive Bloom Impact · Rejuvenation Score Breakdown
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    data-testid="bloom-impact-synergy-tier"
                    className="px-2 py-0.5 rounded bg-[#142D23] border border-[#68D391]/50 text-[10px] font-mono font-semibold text-[#68D391]"
                  >
                    {bloomImpact.bloomSynergyTier}
                  </span>
                  <span
                    data-testid="bloom-impact-total-score"
                    className="px-2 py-0.5 rounded bg-[#1A2922] border border-[#F2B84B]/50 text-[10px] font-mono font-bold text-[#F2B84B] tabular-nums"
                  >
                    {bloomImpact.totalRejuvenationScore} BRI pts (100%)
                  </span>
                </div>
              </div>

              {/* Stacked Proportional Contribution Bar */}
              <div
                data-testid="bloom-impact-stacked-bar"
                className="w-full h-2.5 rounded-full bg-[#07120E] overflow-hidden flex border border-[#1E352B]"
                title="Proportional contribution of each cognitive mechanic to the final Rejuvenation Score"
              >
                {bloomImpact.contributors.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`bloom-impact-segment-${item.id}`}
                    style={{
                      width: `${item.contributionPct}%`,
                      backgroundColor: item.accentHex,
                    }}
                    className="h-full transition-all duration-300"
                    title={`${item.label}: +${item.scorePoints} pts (${item.contributionPct}%)`}
                  />
                ))}
              </div>

              {/* N-Back Accuracy vs. UFOV Response Time Direct Comparison Callout */}
              <div
                data-testid="bloom-impact-nback-vs-ufov-banner"
                className="px-3 py-1.5 rounded-lg bg-[#10241C] border border-[#233D32] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono"
              >
                <span className="text-[#D5E2DC]">
                  {bloomImpact.nBackVsUfovComparisonLabel}
                </span>
                <span className="text-[#4FD1C5] font-semibold shrink-0">
                  Lead Driver: {bloomImpact.primaryDriverLabel}
                </span>
              </div>

              {/* 4-Mechanic Contribution Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {bloomImpact.contributors.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`bloom-impact-card-${item.id}`}
                    data-score-points={item.scorePoints}
                    data-contribution-pct={item.contributionPct}
                    className="p-2.5 rounded-xl bg-[#0F221B] border border-[#1F3A2E] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.accentHex }}
                        />
                        <span className="text-[11px] font-semibold text-[#F4EFE6] truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums">
                        <span
                          data-testid={`bloom-impact-points-${item.id}`}
                          className="text-xs font-bold"
                          style={{ color: item.accentHex }}
                        >
                          +{item.scorePoints} pts
                        </span>
                        <span
                          data-testid={`bloom-impact-pct-${item.id}`}
                          className="px-1.5 py-0.5 rounded bg-[#091510] text-[10px] font-semibold text-[#A3B8B0]"
                        >
                          {item.contributionPct}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#A3B8B0]">
                      <span
                        data-testid={`bloom-impact-metric-${item.id}`}
                        className="text-[#D5E2DC] font-semibold"
                      >
                        {item.performanceMetricLabel}
                      </span>
                      <span>{item.protocolCitation}</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-[#091510] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.contributionPct}%`,
                          backgroundColor: item.accentHex,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Post-Session Cognitive Insight Journal (Linked to Daily Streak) */}
            <CognitiveInsightJournal
              neuralLogs={neuralLogs}
              streakDayCount={dailyStreak.currentStreak}
              stageName={hud.stageName}
              outcome={gameOutcome === 'victory' ? 'victory' : 'defeat'}
              rejuvenationScore={endSummary.rejuvenationScore}
              onAddNeuralLog={handleAddNeuralLog}
              compact
            />

            <div className="flex flex-col sm:flex-row gap-3">
              {gameOutcome === 'victory' && stageIndex < SANCTUARY_STAGES.length - 1 ? (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => startOrRestartGame(stageIndex + 1, false)}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#F2B84B] hover:bg-[#F6AD55] text-[#091510] font-semibold text-sm transition-colors cursor-pointer"
                >
                  Advance to Stage {stageIndex + 2}
                </button>
              ) : (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => startOrRestartGame(stageIndex, false)}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#F2B84B] hover:bg-[#F6AD55] text-[#091510] font-semibold text-sm transition-colors cursor-pointer"
                >
                  {gameOutcome === 'victory' ? 'Play Sanctuary Again' : 'Try Sanctuary Again'}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsDemoMode(false);
                  soundEngine.pauseAmbient();
                  setGameState('title');
                }}
                className="py-3 px-5 rounded-xl bg-[#152E24] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] font-medium text-sm transition-colors cursor-pointer"
              >
                Title Screen
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* 6. CLINICAL EVIDENCE CODEX MODAL */}
      <ClinicalCodexModal
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        selectedProtocol={activeProtocol}
        hrvHistory={hrvHistory}
        totalTreesGrafted={lifetimeProgress.totalTreesGrafted}
        peakRejuvenationScore={lifetimeProgress.peakRejuvenationScore}
        currentStreakDays={dailyStreak.currentStreak}
        completedHabitIds={completedHabitIds}
        onToggleHabitId={handleToggleNeuroHabit}
        dailyHabitTracker={dailyHabitTracker}
        onToggleDailyHabitExercise={handleToggleDailyHabitExercise}
        neuralLogs={neuralLogs}
        onAddNeuralLog={handleAddNeuralLog}
        onRecordSimulatedSession={() => {
          commitDailyPractice();
          const lastScore = hrvHistory[hrvHistory.length - 1]?.coherenceScore ?? 85;
          const nextScore = Math.min(99, Math.max(78, lastScore + 2));
          recordHrvSessionToHistory(nextScore, 15.0);
          soundEngine.playHarmonicChord('ufov');
        }}
      />

      {/* 7. GENTLE HABIT NOTIFICATION TOAST (+30 Minutes Post-Practice NSDR & Reframing Reminder) */}
      {gentleNotificationEval.shouldShowToast &&
        !isCodexOpen &&
        gameState !== 'gameover' &&
        gameState !== 'paused' && (
        <aside
          role="status"
          aria-live="polite"
          data-testid="gentle-habit-notification-toast"
          data-usual-practice-time={gentleNotificationEval.usualPracticeTimeHm}
          data-trigger-time={gentleNotificationEval.triggerTimeHm}
          data-missing-count={gentleNotificationEval.missingExercises.length}
          className="fixed bottom-36 right-4 z-40 w-[396px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[#091510]/95 border border-[#F2B84B]/70 p-3.5 shadow-2xl backdrop-blur-md pointer-events-auto transition-all duration-300"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#F2B84B] shrink-0" />
              <span
                data-testid="gentle-toast-headline"
                className="text-[10px] font-mono font-bold uppercase tracking-wide text-[#F2B84B] truncate"
              >
                {gentleNotificationEval.toastHeadline}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                data-testid="gentle-toast-snooze-btn"
                onClick={handleSnoozeGentleToast}
                className="px-2 py-0.5 rounded bg-[#132A21] hover:bg-[#1E3F32] text-[#A3B8B0] hover:text-[#F4EFE6] border border-[#2C4C3E] text-[9.5px] font-mono font-semibold transition-colors cursor-pointer"
                title="Snooze gentle reminder for 15 minutes"
              >
                Snooze 15m
              </button>
              <button
                type="button"
                data-testid="gentle-toast-dismiss-btn"
                aria-label="Dismiss Gentle Reminder for Today"
                onClick={handleDismissGentleToastToday}
                className="px-2 py-0.5 rounded bg-[#132A21] hover:bg-[#1E3F32] text-[#A3B8B0] hover:text-[#F4EFE6] border border-[#2C4C3E] text-[9.5px] font-mono font-semibold transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          <p
            data-testid="gentle-toast-message"
            className="mt-1.5 text-xs text-[#D5E2DC] leading-relaxed"
          >
            {gentleNotificationEval.toastMessage}
          </p>

          {/* Quick-Log Buttons for Unlogged NSDR & Cognitive Reframing Exercises */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="gentle-toast-log-nsdr-btn"
              onClick={() => handleToggleDailyHabitExercise('nsdr_protocol')}
              className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-left transition-colors cursor-pointer ${
                dailyHabitTracker.nsdrCompleted
                  ? 'bg-[#143325] border-[#68D391] text-[#68D391]'
                  : 'bg-[#10241C] hover:bg-[#173529] border-[#4FD1C5]/60 text-[#F4EFE6]'
              }`}
            >
              <div className="min-w-0">
                <div className="text-[10.5px] font-mono font-bold truncate">
                  {dailyHabitTracker.nsdrCompleted ? '✓ NSDR Logged' : 'Log 20m NSDR'}
                </div>
                <div className="text-[9px] font-mono text-[#A3B8B0] truncate">
                  Dopamine Reset
                </div>
              </div>
              <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#091510]/70 text-[#4FD1C5] shrink-0">
                {dailyHabitTracker.nsdrCompleted ? 'Done' : '+Log'}
              </span>
            </button>

            <button
              type="button"
              data-testid="gentle-toast-log-reframing-btn"
              onClick={() => handleToggleDailyHabitExercise('cognitive_reframing')}
              className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-left transition-colors cursor-pointer ${
                dailyHabitTracker.cognitiveReframingCompleted
                  ? 'bg-[#143325] border-[#68D391] text-[#68D391]'
                  : 'bg-[#10241C] hover:bg-[#173529] border-[#F2B84B]/60 text-[#F4EFE6]'
              }`}
            >
              <div className="min-w-0">
                <div className="text-[10.5px] font-mono font-bold truncate">
                  {dailyHabitTracker.cognitiveReframingCompleted
                    ? '✓ Reframing Logged'
                    : 'Log 5m Reframing'}
                </div>
                <div className="text-[9px] font-mono text-[#A3B8B0] truncate">
                  Prefrontal Reappraisal
                </div>
              </div>
              <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#091510]/70 text-[#F2B84B] shrink-0">
                {dailyHabitTracker.cognitiveReframingCompleted ? 'Done' : '+Log'}
              </span>
            </button>
          </div>

          {/* Usual Daily Practice Time Calibration (+30m Trigger Schedule) */}
          <div className="mt-2.5 pt-2 border-t border-[#1E352B] space-y-1.5">
            <div className="flex items-center justify-between text-[9.5px] font-mono text-[#A3B8B0]">
              <span>
                Usual Daily Practice: <strong className="text-[#F4EFE6]">{gentleNotificationEval.usualPracticeTimeHm}</strong>
              </span>
              <span>
                +30m Trigger: <strong className="text-[#F2B84B]">{gentleNotificationEval.triggerTimeHm}</strong>
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {USUAL_PRACTICE_TIME_PRESETS.map((presetHm) => {
                const isSelected = gentleNotificationEval.usualPracticeTimeHm === presetHm;
                return (
                  <button
                    key={presetHm}
                    type="button"
                    data-testid={`gentle-toast-time-preset-${presetHm}`}
                    onClick={() => handleUpdateUsualPracticeTimeHm(presetHm)}
                    className={`py-0.5 rounded text-[9.5px] font-mono font-semibold border text-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#2B2112] text-[#F2B84B] border-[#F2B84B]'
                        : 'bg-[#0E1E18] text-[#A3B8B0] border-[#233D32] hover:text-[#F4EFE6]'
                    }`}
                  >
                    {presetHm}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      )}
    </main>
  );
}
