/**
 * Pure game rules, cognitive neuroscience protocols, math helpers, and clinical research data
 * for Sylvan Synapse — Cozy Clinical Cognitive Sanctuary.
 */

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';
export type GameOutcome = 'victory' | 'defeat' | null;

export type ProtocolId = 'ufov_forage' | 'nback_chimes' | 'coherence_breath' | 'dendrite_graft';

export interface ClinicalCitation {
  id: ProtocolId;
  shortName: string;
  keyBinding: string;
  actionName: string;
  roleClue: string;
  brainRegion: string;
  mechanism: string;
  studyTitle: string;
  authors: string;
  journalYear: string;
  sampleNote: string;
  clinicalFinding: string;
  howInGameWorks: string;
  accentHex: string;
}

export const CLINICAL_PROTOCOLS: Record<ProtocolId, ClinicalCitation> = {
  ufov_forage: {
    id: 'ufov_forage',
    shortName: 'UFOV Dew Pulse',
    keyBinding: '1',
    actionName: 'UFOV Forage',
    roleClue: 'Divided Visual Attention · Space / Click',
    brainRegion: 'Dorsal Attention Network & Visual Cortex (V1–V4)',
    mechanism: 'Useful Field of View (UFOV) Speed-of-Processing & Divided Peripheral Attention',
    studyTitle: 'Ten-Year Effects of the ACTIVE Cognitive Training Trial on Everyday Cognitive Function and Dementia Incidence',
    authors: 'Ball, K., Edwards, J. D., Willis, S. L., Rebok, G. W., et al.',
    journalYear: 'JAMA (2002) & Alzheimer’s & Dementia: Translational Research & Clinical Interventions (2017)',
    sampleNote: 'Randomized controlled trial of N = 2,802 healthy older adults followed over 10 years',
    clinicalFinding:
      'Computerized Useful Field of View (UFOV) speed-of-processing training (identifying a central target while simultaneously localizing a brief peripheral target) reduced the risk of dementia diagnosis by 29% over 10 years and improved instrumental activities of daily living.',
    howInGameWorks:
      'When you pulse your lantern near a Sun-Dew Shrine or Dew-Bloom, briefly lock onto the central floral glyph while spotting the peripheral firefly direction to harvest double BDNF Nectar and clear surrounding Cortisol Spores.',
    accentHex: '#F2B84B',
  },
  nback_chimes: {
    id: 'nback_chimes',
    shortName: 'N-Back Echo Chime',
    keyBinding: '2',
    actionName: 'Echo Chime',
    roleClue: 'Working Memory Match · E / Two-Finger Tap',
    brainRegion: 'Dorsolateral Prefrontal Cortex (dlPFC) & Parietal Cortex',
    mechanism: 'Continuous Working Memory Updating & Executive Inhibition (N-Back)',
    studyTitle: 'Improving Fluid Intelligence with Training on Working Memory: A Meta-Analysis & Prefrontal Dopamine Plasticity',
    authors: 'Jaeggi, S. M., Buschkuehl, M., Jonides, J., & Perrig, W. J.; Au et al.',
    journalYear: 'Proceedings of the National Academy of Sciences (PNAS, 2008); Psychonomic Bulletin & Review (2015)',
    sampleNote: 'Controlled cognitive intervention studies & meta-analysis of 20+ N-Back trials',
    clinicalFinding:
      'Adaptive N-Back training strengthens frontoparietal neural network efficiency and striatal/prefrontal dopamine D1 receptor density, yielding measurable improvements in working memory capacity, attentional control, and fluid reasoning.',
    howInGameWorks:
      'Ancient Wind-Chime Totems emit a continuous sequence of botanical symbols and harmonic tones. Ring the Echo Chime (E or Two-Finger Trackpad Tap / Control-Click) when the current symbol matches the one from N steps ago (1-Back or 2-Back) to unleash a golden harmonic wave that restores neural trees.',
    accentHex: '#4FD1C5',
  },
  coherence_breath: {
    id: 'coherence_breath',
    shortName: 'Resonance Breath',
    keyBinding: '3',
    actionName: 'Vagal Breath',
    roleClue: '0.1 Hz HRV Shield · Hold ⇧ Shift / ⌥ Option',
    brainRegion: 'Vagus Nerve, Nucleus Tractus Solitarii & Prefrontal-Amygdala Circuit',
    mechanism: 'Heart Rate Variability (HRV) Resonance Frequency Breathing (6 Breaths/Min) & Attention Restoration',
    studyTitle: 'Heart Rate Variability Biofeedback: How and Why Does It Work? & The Cognitive Benefits of Interacting with Nature',
    authors: 'Lehrer, P. M., & Gevirtz, R.; Berman, M. G., Jonides, J., & Kaplan, S.',
    journalYear: 'Frontiers in Psychology (2014); Psychological Science (2008)',
    sampleNote: 'Clinical psychophysiology trials on baroreflex gain & nature-based soft fascination',
    clinicalFinding:
      'Paced breathing at ~0.1 Hz (5s inhale, 5s exhale) maximizes baroreflex resonance and vagal afferent signaling to the prefrontal cortex, down-regulating amygdala hyper-reactivity, lowering cortisol, and accelerating recovery from directed-attention fatigue.',
    howInGameWorks:
      'Hold ⇧ Shift or ⌥ Option (or synchronize with the rhythmic breathing guide around your Sprite) to enter Vagal Coherence. While coherent, your calm aura gently dissolves approaching Stress Wisps, heals Calm Vitality, and expands peripheral perception.',
    accentHex: '#68D391',
  },
  dendrite_graft: {
    id: 'dendrite_graft',
    shortName: 'BDNF Dendrite Graft',
    keyBinding: '4',
    actionName: 'Synapse Graft',
    roleClue: 'Spatial Hippocampal Link · Q / ⏎ Return',
    brainRegion: 'Hippocampal Dentate Gyrus & Entorhinal Grid Cells',
    mechanism: 'Enriched Spatial Exploration, Adult Neurogenesis & BDNF-Mediated Synaptogenesis',
    studyTitle: 'Exercise and Enriched Spatial Exploration Increase Hippocampal Volume and Serum BDNF in Humans',
    authors: 'Erickson, K. I., Voss, M. W., Prakash, R. S., et al.; Clemenson, G. D., & Stark, C. E.',
    journalYear: 'Proceedings of the National Academy of Sciences (PNAS, 2011); Journal of Neuroscience (2015)',
    sampleNote: 'Randomized 1-year human neuroimaging trial (N = 120) & spatial enrichment studies',
    clinicalFinding:
      'Navigating rich spatial environments and learning novel spatial landmarks stimulates Brain-Derived Neurotrophic Factor (BDNF) expression and promotes neurogenesis in the anterior hippocampus, reversing age-related volume loss by 1–2 years.',
    howInGameWorks:
      'Collect Nectar from blooming nodes and press Q or ⏎ Return (or Space near a Dormant Neural Tree) to graft a living bioluminescent mycelial bridge between sanctuary trees, permanently lighting the grove and increasing your Brain Rejuvenation Index.',
    accentHex: '#B794F4',
  },
};

export const MAC_CONTROL_HINT_LINE =
  'WASD / Arrows / Two-Finger Glide Move · Space / Click UFOV Forage · E / Ctrl-Click Echo Chime · Q / ⏎ Return Graft Tree · ⇧ Shift / ⌥ Option 0.1Hz Breath · ⎋ Esc Pause';

export interface StageConfig {
  stageIndex: number;
  name: string;
  subtitle: string;
  targetTreesGrafted: number;
  nBackLevel: 1 | 2;
  ufovFlashDurationSec: number;
  maxConcurrentHazards: number;
  hazardSpawnIntervalSec: number;
  nectarCostPerTree: number;
}

export const SANCTUARY_STAGES: StageConfig[] = [
  {
    stageIndex: 0,
    name: 'Stage I · The Mossy Dentate Grove',
    subtitle: '1-Back Harmonic Chimes · Gentle UFOV Dew · Soft Vagal Coherence',
    targetTreesGrafted: 4,
    nBackLevel: 1,
    ufovFlashDurationSec: 1.8,
    maxConcurrentHazards: 4,
    hazardSpawnIntervalSec: 5.5,
    nectarCostPerTree: 25,
  },
  {
    stageIndex: 1,
    name: 'Stage II · The Prefrontal Canopy',
    subtitle: '2-Back Working Memory · Rapid UFOV Peripheral Flash · Richer Mycelial Web',
    targetTreesGrafted: 5,
    nBackLevel: 2,
    ufovFlashDurationSec: 1.35,
    maxConcurrentHazards: 6,
    hazardSpawnIntervalSec: 4.2,
    nectarCostPerTree: 30,
  },
  {
    stageIndex: 2,
    name: 'Stage III · The Luminous Crown Sanctuary',
    subtitle: '2-Back Mastery · High-Speed UFOV · Full Neural Network Rejuvenation',
    targetTreesGrafted: 6,
    nBackLevel: 2,
    ufovFlashDurationSec: 1.0,
    maxConcurrentHazards: 8,
    hazardSpawnIntervalSec: 3.4,
    nectarCostPerTree: 35,
  },
  {
    stageIndex: 3,
    name: 'Stage IV · The Aurora Neuro-Bloom Apex',
    subtitle: '4-Stage Full Sanctuary Mastery · Bioluminescent Bloom & Harmonic Camera Orbit',
    targetTreesGrafted: 6,
    nBackLevel: 2,
    ufovFlashDurationSec: 0.9,
    maxConcurrentHazards: 8,
    hazardSpawnIntervalSec: 3.2,
    nectarCostPerTree: 35,
  },
];

export type ChimeSymbol = 'SUN' | 'LEAF' | 'DROP' | 'STAR';
export const CHIME_SYMBOLS: ChimeSymbol[] = ['SUN', 'LEAF', 'DROP', 'STAR'];

export type HazardArchetype = 'ruminator_drifter' | 'distractor_dart' | 'fog_emitter';

/**
 * Clamp frame delta time to prevent physics tunneling on tab switch or CPU spike.
 */
export function clampDeltaTime(rawDt: number): number {
  if (!Number.isFinite(rawDt) || rawDt < 0) return 0;
  return Math.min(rawDt, 0.05);
}

/**
 * Compute N-Back match truth for a sequence of symbols.
 * Returns true if the latest symbol at `sequence[sequence.length - 1]`
 * matches `sequence[sequence.length - 1 - n]`.
 */
export function isNBackMatch(sequence: readonly ChimeSymbol[], n: number): boolean {
  if (n <= 0 || sequence.length <= n) return false;
  const current = sequence[sequence.length - 1];
  const target = sequence[sequence.length - 1 - n];
  return current === target;
}

/**
 * Generate the next chime symbol with controlled probability (~40% chance of an N-back match)
 * so players get frequent, rewarding working-memory opportunities without waiting too long.
 */
export function generateNextChimeSymbol(
  sequence: readonly ChimeSymbol[],
  n: number,
  randomVal: number
): ChimeSymbol {
  if (sequence.length >= n && randomVal < 0.42) {
    return sequence[sequence.length - n];
  }
  const idx = Math.floor(Math.abs(randomVal * 9973)) % CHIME_SYMBOLS.length;
  return CHIME_SYMBOLS[idx];
}

/**
 * Compute 0.1 Hz Resonance Breathing phase (10-second full cycle: 5s inhale, 5s exhale).
 * Returns phase in [0, 1], breathRadiusFactor in [0, 1] (0 = fully exhaled, 1 = peak inhale),
 * and current label ('INHALE 5s' | 'EXHALE 5s').
 */
export function computeResonanceBreathState(elapsedTimeSec: number): {
  cycleProgress: number;
  expansion: number;
  phaseLabel: 'INHALE' | 'EXHALE';
  coherenceBonusMultiplier: number;
} {
  const cycleSec = 10.0; // 6 breaths per minute = 0.1 Hz clinical resonance frequency
  const t = ((elapsedTimeSec % cycleSec) + cycleSec) % cycleSec;
  const cycleProgress = t / cycleSec;
  // Smooth sinusoid from 0 to 1 (peaks at t = 5s)
  const expansion = 0.5 - 0.5 * Math.cos((t / cycleSec) * Math.PI * 2);
  const phaseLabel = t < 5.0 ? 'INHALE' : 'EXHALE';
  // Sweet spot near smooth cadence transition gives boosted coherence
  const coherenceBonusMultiplier = 1.0 + 0.5 * Math.sin((t / cycleSec) * Math.PI);
  return {
    cycleProgress,
    expansion,
    phaseLabel,
    coherenceBonusMultiplier,
  };
}

/**
 * Calculate Brain Rejuvenation Index (BRI) score and cognitive domain breakdown.
 */
export interface CognitiveMetricsInput {
  treesGrafted: number;
  targetTrees: number;
  ufovHits: number;
  ufovAttempts: number;
  nBackHits: number;
  nBackAttempts: number;
  coherenceSeconds: number;
  calmVitality: number;
  maxVitality: number;
}

export interface CognitiveSummary {
  rejuvenationScore: number;
  processingSpeedPct: number;
  workingMemoryPct: number;
  vagalCoherencePct: number;
  spatialPlasticityPct: number;
  isStageCleared: boolean;
}

export function evaluateCognitiveSummary(input: CognitiveMetricsInput): CognitiveSummary {
  const spatialPlasticityPct =
    input.targetTrees > 0
      ? Math.min(100, Math.round((input.treesGrafted / input.targetTrees) * 100))
      : 100;

  const processingSpeedPct =
    input.ufovAttempts > 0
      ? Math.min(100, Math.round((input.ufovHits / input.ufovAttempts) * 100))
      : 85;

  const workingMemoryPct =
    input.nBackAttempts > 0
      ? Math.min(100, Math.round((input.nBackHits / input.nBackAttempts) * 100))
      : 85;

  const vagalCoherencePct = Math.min(
    100,
    Math.round(Math.min(1, input.coherenceSeconds / 15) * 60 + (input.calmVitality / Math.max(1, input.maxVitality)) * 40)
  );

  const rejuvenationScore = Math.round(
    input.treesGrafted * 250 +
      input.ufovHits * 120 +
      input.nBackHits * 180 +
      Math.round(input.coherenceSeconds * 15) +
      input.calmVitality * 40
  );

  const isStageCleared = input.treesGrafted >= input.targetTrees && input.calmVitality > 0;

  return {
    rejuvenationScore,
    processingSpeedPct,
    workingMemoryPct,
    vagalCoherencePct,
    spatialPlasticityPct,
    isStageCleared,
  };
}

/**
 * Compute difficulty parameters smoothly based on elapsed stage time and progress.
 */
export function computeDifficultyRamp(
  stage: StageConfig,
  elapsedSec: number,
  treesGrafted: number
): {
  activeMaxHazards: number;
  spawnIntervalSec: number;
  hazardSpeedMultiplier: number;
  archetypeWeights: Record<HazardArchetype, number>;
} {
  // Keep opening 12 seconds extra gentle and approachable
  if (elapsedSec < 12) {
    return {
      activeMaxHazards: Math.min(2, stage.maxConcurrentHazards),
      spawnIntervalSec: stage.hazardSpawnIntervalSec * 1.35,
      hazardSpeedMultiplier: 0.78,
      archetypeWeights: {
        ruminator_drifter: 0.7,
        distractor_dart: 0.2,
        fog_emitter: 0.1,
      },
    };
  }

  const timeFactor = Math.min(1, (elapsedSec - 12) / 90);
  const progressFactor = stage.targetTreesGrafted > 0 ? treesGrafted / stage.targetTreesGrafted : 0;
  const combinedFactor = Math.min(1, timeFactor * 0.6 + progressFactor * 0.4);

  const activeMaxHazards = Math.round(
    2 + combinedFactor * (stage.maxConcurrentHazards - 2)
  );
  const spawnIntervalSec = Math.max(
    2.2,
    stage.hazardSpawnIntervalSec * (1 - combinedFactor * 0.32)
  );
  const hazardSpeedMultiplier = 0.85 + combinedFactor * 0.35;

  return {
    activeMaxHazards,
    spawnIntervalSec,
    hazardSpeedMultiplier,
    archetypeWeights: {
      ruminator_drifter: Math.max(0.35, 0.65 - combinedFactor * 0.25),
      distractor_dart: 0.2 + combinedFactor * 0.18,
      fog_emitter: 0.15 + combinedFactor * 0.12,
    },
  };
}

/**
 * Daily Practice Streak Tracking & Consecutive Day Evaluation
 */
export interface DailyStreakState {
  currentStreak: number;
  longestStreak: number;
  lastPracticedDate: string | null; // YYYY-MM-DD in local time
  totalDaysPracticed: number;
  nsdrCompletedToday?: boolean;
  cognitiveReframingCompletedToday?: boolean;
  habitTrackerDateIso?: string | null;
}

export const STREAK_STORAGE_KEY = 'sylvan_synapse_daily_streak_v1';

/**
 * Format a Date object into local YYYY-MM-DD string.
 */
export function formatLocalDateIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate integer calendar day difference (targetDateIso - baseDateIso) using UTC midnight parsing.
 */
export function getCalendarDayDiff(baseDateIso: string, targetDateIso: string): number {
  const [y1, m1, d1] = baseDateIso.split('-').map(Number);
  const [y2, m2, d2] = targetDateIso.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return Number.NaN;
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Evaluate the stored streak against today's date (without recording a new practice session yet).
 * If the user missed 1 or more full days (dayDiff > 1), currentStreak resets to 0 until they practice today.
 */
export function evaluateStreakOnLoad(
  saved: DailyStreakState | null | undefined,
  todayIso: string
): DailyStreakState {
  if (!saved || !saved.lastPracticedDate) {
    return {
      currentStreak: 0,
      longestStreak: saved?.longestStreak ?? 0,
      lastPracticedDate: null,
      totalDaysPracticed: saved?.totalDaysPracticed ?? 0,
    };
  }

  const diff = getCalendarDayDiff(saved.lastPracticedDate, todayIso);
  if (diff === 0 || diff === 1) {
    return {
      currentStreak: Math.max(1, saved.currentStreak),
      longestStreak: Math.max(saved.longestStreak, saved.currentStreak),
      lastPracticedDate: saved.lastPracticedDate,
      totalDaysPracticed: Math.max(1, saved.totalDaysPracticed),
    };
  }

  // More than 1 calendar day elapsed (streak broken) or invalid date
  return {
    currentStreak: 0,
    longestStreak: Math.max(0, saved.longestStreak),
    lastPracticedDate: saved.lastPracticedDate,
    totalDaysPracticed: Math.max(0, saved.totalDaysPracticed),
  };
}

/**
 * Record a daily practice session on `todayIso` (YYYY-MM-DD).
 * - Same day (diff === 0): idempotent, preserves currentStreak.
 * - Consecutive next day (diff === 1): increments currentStreak and totalDaysPracticed by 1.
 * - First session or after a gap (diff > 1): sets currentStreak to 1 and increments totalDaysPracticed by 1.
 */
export function recordDailyPracticeSession(
  saved: DailyStreakState | null | undefined,
  todayIso: string
): DailyStreakState {
  if (!saved || !saved.lastPracticedDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, saved?.longestStreak ?? 0),
      lastPracticedDate: todayIso,
      totalDaysPracticed: (saved?.totalDaysPracticed ?? 0) + 1,
    };
  }

  const diff = getCalendarDayDiff(saved.lastPracticedDate, todayIso);

  if (diff === 0) {
    const activeStreak = Math.max(1, saved.currentStreak);
    return {
      currentStreak: activeStreak,
      longestStreak: Math.max(saved.longestStreak, activeStreak),
      lastPracticedDate: todayIso,
      totalDaysPracticed: Math.max(1, saved.totalDaysPracticed),
    };
  }

  if (diff === 1) {
    const nextStreak = Math.max(1, saved.currentStreak) + 1;
    return {
      currentStreak: nextStreak,
      longestStreak: Math.max(saved.longestStreak, nextStreak),
      lastPracticedDate: todayIso,
      totalDaysPracticed: Math.max(1, saved.totalDaysPracticed) + 1,
    };
  }

  // Gap > 1 day or clock moved backwards: start fresh 1-day streak
  return {
    currentStreak: 1,
    longestStreak: Math.max(saved.longestStreak, 1),
    lastPracticedDate: todayIso,
    totalDaysPracticed: Math.max(0, saved.totalDaysPracticed) + 1,
  };
}

/**
 * HRV Coherence Session History (Last 10 Practice Sessions) & Physiological Relaxation Trend
 */
export interface HrvSessionRecord {
  sessionIndex: number; // 1..10
  sessionLabel: string; // e.g., "S1".."S10"
  coherenceScore: number; // 0..100 (%)
  coherenceSeconds: number;
  recordedAtIso: string; // YYYY-MM-DD
  stageName: string;
}

export const HRV_HISTORY_STORAGE_KEY = 'sylvan_synapse_hrv_history_v1';

export const DEFAULT_HRV_HISTORY_SEED: HrvSessionRecord[] = [
  { sessionIndex: 1, sessionLabel: 'S1', coherenceScore: 62, coherenceSeconds: 8.2, recordedAtIso: '2026-10-24', stageName: 'Stage I · The Mossy Dentate Grove' },
  { sessionIndex: 2, sessionLabel: 'S2', coherenceScore: 66, coherenceSeconds: 9.1, recordedAtIso: '2026-10-25', stageName: 'Stage I · The Mossy Dentate Grove' },
  { sessionIndex: 3, sessionLabel: 'S3', coherenceScore: 64, coherenceSeconds: 8.7, recordedAtIso: '2026-10-26', stageName: 'Stage I · The Mossy Dentate Grove' },
  { sessionIndex: 4, sessionLabel: 'S4', coherenceScore: 71, coherenceSeconds: 10.5, recordedAtIso: '2026-10-27', stageName: 'Stage I · The Mossy Dentate Grove' },
  { sessionIndex: 5, sessionLabel: 'S5', coherenceScore: 75, coherenceSeconds: 11.4, recordedAtIso: '2026-10-28', stageName: 'Stage I · The Mossy Dentate Grove' },
  { sessionIndex: 6, sessionLabel: 'S6', coherenceScore: 73, coherenceSeconds: 11.0, recordedAtIso: '2026-10-29', stageName: 'Stage II · The Prefrontal Canopy' },
  { sessionIndex: 7, sessionLabel: 'S7', coherenceScore: 79, coherenceSeconds: 12.8, recordedAtIso: '2026-10-30', stageName: 'Stage II · The Prefrontal Canopy' },
  { sessionIndex: 8, sessionLabel: 'S8', coherenceScore: 84, coherenceSeconds: 14.1, recordedAtIso: '2026-10-31', stageName: 'Stage II · The Prefrontal Canopy' },
  { sessionIndex: 9, sessionLabel: 'S9', coherenceScore: 88, coherenceSeconds: 15.2, recordedAtIso: '2026-11-01', stageName: 'Stage II · The Prefrontal Canopy' },
  { sessionIndex: 10, sessionLabel: 'S10', coherenceScore: 92, coherenceSeconds: 16.5, recordedAtIso: '2026-11-02', stageName: 'Stage III · The Luminous Crown Sanctuary' },
];

/**
 * Append a new HRV coherence practice session to the history, keeping at most the last 10 sessions
 * and re-indexing them 1..N ("S1".."S10").
 */
export function appendHrvSessionRecord(
  existing: readonly HrvSessionRecord[],
  newEntry: {
    coherenceScore: number;
    coherenceSeconds: number;
    recordedAtIso: string;
    stageName: string;
  }
): HrvSessionRecord[] {
  const clampedScore = Math.max(0, Math.min(100, Math.round(newEntry.coherenceScore)));
  const combined = [
    ...existing,
    {
      sessionIndex: existing.length + 1,
      sessionLabel: `S${existing.length + 1}`,
      coherenceScore: clampedScore,
      coherenceSeconds: Number(Math.max(0, newEntry.coherenceSeconds).toFixed(1)),
      recordedAtIso: newEntry.recordedAtIso,
      stageName: newEntry.stageName,
    },
  ].slice(-10);

  return combined.map((item, idx) => ({
    ...item,
    sessionIndex: idx + 1,
    sessionLabel: `S${idx + 1}`,
  }));
}

/**
 * Compute physiological relaxation trend summary from up to 10 HRV coherence sessions.
 */
export function computeHrvTrendSummary(history: readonly HrvSessionRecord[]): {
  averageCoherence: number;
  peakCoherence: number;
  latestCoherence: number;
  trendDelta: number; // Latest minus First session score
  relaxationStatus: 'Optimal Vagal Resonance' | 'Building Vagal Tone' | 'Baseline Calibration';
} {
  if (!history || history.length === 0) {
    return {
      averageCoherence: 0,
      peakCoherence: 0,
      latestCoherence: 0,
      trendDelta: 0,
      relaxationStatus: 'Baseline Calibration',
    };
  }

  const scores = history.map((h) => h.coherenceScore);
  const sum = scores.reduce((acc, val) => acc + val, 0);
  const averageCoherence = Math.round(sum / scores.length);
  const peakCoherence = Math.max(...scores);
  const latestCoherence = scores[scores.length - 1];
  const firstCoherence = scores[0];
  const trendDelta = latestCoherence - firstCoherence;

  const relaxationStatus =
    averageCoherence >= 75
      ? 'Optimal Vagal Resonance'
      : averageCoherence >= 60
      ? 'Building Vagal Tone'
      : 'Baseline Calibration';

  return {
    averageCoherence,
    peakCoherence,
    latestCoherence,
    trendDelta,
    relaxationStatus,
  };
}

/**
 * Cognitive Milestone Badge System & Sanctuary Aesthetic Upgrades
 * Grants visual flora palette & firefly density upgrades based on total 'Neural Trees Grafted'
 * and historical 'Rejuvenation Score' peaks.
 */
export type CognitiveMilestoneId =
  | 'sapling_awakening'
  | 'cyan_lotus_bloom'
  | 'amethyst_mycelium'
  | 'solar_crown_resonance';

export interface SanctuaryAestheticUpgrade {
  id: CognitiveMilestoneId;
  themeName: string;
  canopyPrimaryHex: string;
  canopyHighlightHex: string;
  canopyGlowRgba: string;
  myceliumBridgeHex: string;
  bloomPetalHex: string;
  fireflyCount: number;
  fireflyColorHex: string;
}

export interface CognitiveMilestoneBadge {
  id: CognitiveMilestoneId;
  title: string;
  subtitle: string;
  requiredTotalTreesGrafted: number;
  requiredPeakRejuvenationScore: number;
  aestheticDescription: string;
  upgrade: SanctuaryAestheticUpgrade;
}

export const COGNITIVE_MILESTONE_STORAGE_KEY = 'sylvan_synapse_cognitive_milestones_v1';

export interface LifetimeCognitiveProgress {
  totalTreesGrafted: number;
  peakRejuvenationScore: number;
  selectedMilestoneId: CognitiveMilestoneId;
}

export const COGNITIVE_MILESTONE_BADGES: CognitiveMilestoneBadge[] = [
  {
    id: 'sapling_awakening',
    title: 'I. Mossy Dentate Sapling',
    subtitle: 'Baseline Sanctuary Flora · 18 Ambient Fireflies',
    requiredTotalTreesGrafted: 0,
    requiredPeakRejuvenationScore: 0,
    aestheticDescription: 'Emerald forest canopy with warm golden fireflies and soft jade mycelial bridges.',
    upgrade: {
      id: 'sapling_awakening',
      themeName: 'Emerald Dentate Flora',
      canopyPrimaryHex: '#276749',
      canopyHighlightHex: '#9AE6B4',
      canopyGlowRgba: 'rgba(104, 211, 145, 0.42)',
      myceliumBridgeHex: '#68D391',
      bloomPetalHex: '#F6E05E',
      fireflyCount: 18,
      fireflyColorHex: '#F6E05E',
    },
  },
  {
    id: 'cyan_lotus_bloom',
    title: 'II. Azure Prefrontal Lotus',
    subtitle: '4+ Total Trees Grafted OR 1,400+ Peak Score · 36 Bioluminescent Fireflies',
    requiredTotalTreesGrafted: 4,
    requiredPeakRejuvenationScore: 1400,
    aestheticDescription: 'Unlocks bioluminescent cyan-teal lotus flora, aqua synaptic bridges, and 2x firefly density.',
    upgrade: {
      id: 'cyan_lotus_bloom',
      themeName: 'Azure Prefrontal Flora',
      canopyPrimaryHex: '#1D5B63',
      canopyHighlightHex: '#81E6D9',
      canopyGlowRgba: 'rgba(79, 209, 197, 0.48)',
      myceliumBridgeHex: '#4FD1C5',
      bloomPetalHex: '#76E4F7',
      fireflyCount: 36,
      fireflyColorHex: '#81E6D9',
    },
  },
  {
    id: 'amethyst_mycelium',
    title: 'III. Amethyst Hippocampal Canopy',
    subtitle: '10+ Total Trees Grafted OR 2,000+ Peak Score · 56 Starlight Fireflies',
    requiredTotalTreesGrafted: 10,
    requiredPeakRejuvenationScore: 2000,
    aestheticDescription: 'Unlocks royal lavender-rose BDNF blossoms, violet neural bridges, and dense starlight firefly swarms.',
    upgrade: {
      id: 'amethyst_mycelium',
      themeName: 'Amethyst BDNF Flora',
      canopyPrimaryHex: '#44337A',
      canopyHighlightHex: '#D6BCFA',
      canopyGlowRgba: 'rgba(183, 148, 244, 0.48)',
      myceliumBridgeHex: '#B794F4',
      bloomPetalHex: '#FBB6CE',
      fireflyCount: 56,
      fireflyColorHex: '#E9D8FD',
    },
  },
  {
    id: 'solar_crown_resonance',
    title: 'IV. Solar Crown Neuro-Sanctuary',
    subtitle: '18+ Total Trees Grafted OR 2,600+ Peak Score · 80 Golden Aurora Fireflies',
    requiredTotalTreesGrafted: 18,
    requiredPeakRejuvenationScore: 2600,
    aestheticDescription: 'Unlocks radiant amber-gold crown foliage, harmonic aurora bridges, and maximum 80-firefly sanctuary illumination.',
    upgrade: {
      id: 'solar_crown_resonance',
      themeName: 'Solar Crown Aurora Flora',
      canopyPrimaryHex: '#744210',
      canopyHighlightHex: '#FBD38D',
      canopyGlowRgba: 'rgba(242, 184, 75, 0.52)',
      myceliumBridgeHex: '#F2B84B',
      bloomPetalHex: '#FAF089',
      fireflyCount: 80,
      fireflyColorHex: '#FEFCBF',
    },
  },
];

/**
 * Determine which Cognitive Milestone badges are unlocked given lifetime total trees grafted
 * and historical peak rejuvenation score.
 */
export function evaluateCognitiveMilestones(progress: {
  totalTreesGrafted: number;
  peakRejuvenationScore: number;
}): {
  unlockedBadges: CognitiveMilestoneBadge[];
  highestUnlockedBadge: CognitiveMilestoneBadge;
  nextLockedBadge: CognitiveMilestoneBadge | null;
} {
  const unlockedBadges = COGNITIVE_MILESTONE_BADGES.filter(
    (b) =>
      progress.totalTreesGrafted >= b.requiredTotalTreesGrafted &&
      progress.peakRejuvenationScore >= b.requiredPeakRejuvenationScore
  );

  // Also unlock if either threshold is met for Tier II+ so players feel rewarded by either deep single-run mastery or cumulative tree grafting
  const flexibleUnlocked = COGNITIVE_MILESTONE_BADGES.filter(
    (b) =>
      b.id === 'sapling_awakening' ||
      progress.totalTreesGrafted >= b.requiredTotalTreesGrafted ||
      progress.peakRejuvenationScore >= b.requiredPeakRejuvenationScore
  );

  const finalUnlocked = flexibleUnlocked.length > 0 ? flexibleUnlocked : unlockedBadges;
  const highestUnlockedBadge = finalUnlocked[finalUnlocked.length - 1] || COGNITIVE_MILESTONE_BADGES[0];
  const nextLockedBadge =
    COGNITIVE_MILESTONE_BADGES.find((b) => !finalUnlocked.some((u) => u.id === b.id)) || null;

  return {
    unlockedBadges: finalUnlocked,
    highestUnlockedBadge,
    nextLockedBadge,
  };
}

export function getSanctuaryAestheticConfig(
  milestoneId?: CognitiveMilestoneId
): SanctuaryAestheticUpgrade {
  const found = COGNITIVE_MILESTONE_BADGES.find((b) => b.id === milestoneId);
  return (found || COGNITIVE_MILESTONE_BADGES[0]).upgrade;
}

/**
 * 2026 Enterprise Digital Therapeutics (DTx) Adaptive Psychometric Staircase & Flow Engine
 * Dynamically calibrates UFOV stimulus window (ms), Nectar Flow Multiplier (1.0x..2.5x),
 * and Autonomic-Prefrontal Flow Tier based on consecutive cognitive streak and vagal coherence.
 */
export type AdaptiveFlowTier =
  | 'Baseline Calibration'
  | 'Parasympathetic Lock'
  | 'Prefrontal Resonance'
  | 'Peak Neuroplastic Flow';

export interface AdaptiveFlowState {
  flowStreak: number;
  flowMultiplier: number; // 1.0 .. 2.5
  adaptiveUfovWindowMs: number; // 900ms .. 2400ms
  flowTier: AdaptiveFlowTier;
}

export function computeAdaptiveFlowState(params: {
  consecutiveCognitiveHits: number;
  coherenceSeconds: number;
  baseUfovFlashSec: number;
}): AdaptiveFlowState {
  const streak = Math.max(0, Math.floor(params.consecutiveCognitiveHits));
  const cohBonus = params.coherenceSeconds >= 10 ? 0.25 : params.coherenceSeconds >= 4 ? 0.1 : 0;
  const rawMultiplier = 1.0 + Math.min(1.25, streak * 0.25) + cohBonus;
  const flowMultiplier = Math.round(Math.min(2.5, rawMultiplier) * 100) / 100;

  // Psychometric staircase: as player chains UFOV & N-Back hits, flash window tightens toward clinical high-speed threshold (min 900ms)
  const baseMs = Math.round(Math.max(1.0, params.baseUfovFlashSec) * 1000);
  const reductionMs = Math.min(900, streak * 140);
  const adaptiveUfovWindowMs = Math.max(900, baseMs - reductionMs);

  let flowTier: AdaptiveFlowTier = 'Baseline Calibration';
  if (flowMultiplier >= 2.0) {
    flowTier = 'Peak Neuroplastic Flow';
  } else if (flowMultiplier >= 1.5) {
    flowTier = 'Prefrontal Resonance';
  } else if (flowMultiplier >= 1.2) {
    flowTier = 'Parasympathetic Lock';
  }

  return {
    flowStreak: streak,
    flowMultiplier,
    adaptiveUfovWindowMs,
    flowTier,
  };
}

/**
 * 4-Domain Longitudinal Cognitive Reserve Profile for Clinical Codex Telemetry
 */
export interface CognitiveDomainMetric {
  id: 'ufov_speed' | 'nback_memory' | 'vagal_hrv' | 'hippocampal_bdnf';
  label: string;
  clinicalTargetLabel: string;
  scorePct: number; // 0..100
  accentHex: string;
  citationShort: string;
}

export interface CognitiveDomainProfile {
  domains: CognitiveDomainMetric[];
  compositeReserveIndex: number; // 0..100
  estimatedPlasticityGainPct: number; // +5% .. +38%
}

export function computeCognitiveDomainProfile(params: {
  totalTreesGrafted: number;
  peakRejuvenationScore: number;
  averageHrvCoherence: number;
  currentStreakDays: number;
}): CognitiveDomainProfile {
  const ufovScore = Math.min(
    99,
    Math.max(64, Math.round(58 + (params.peakRejuvenationScore / 2800) * 41))
  );
  const nBackScore = Math.min(
    99,
    Math.max(62, Math.round(55 + (params.peakRejuvenationScore / 2600) * 38 + params.currentStreakDays * 1.5))
  );
  const vagalScore = Math.min(
    99,
    Math.max(55, Math.round(params.averageHrvCoherence || 78))
  );
  const bdnfScore = Math.min(
    100,
    Math.max(60, Math.round(56 + Math.min(20, params.totalTreesGrafted) * 2.2))
  );

  const compositeReserveIndex = Math.round(
    (ufovScore + nBackScore + vagalScore + bdnfScore) / 4
  );

  const estimatedPlasticityGainPct = Math.min(
    38,
    Math.max(8, Math.round((compositeReserveIndex - 50) * 0.68))
  );

  return {
    domains: [
      {
        id: 'ufov_speed',
        label: 'Divided Visual Attention (UFOV)',
        clinicalTargetLabel: 'Superior Parietal & Visual Cortex',
        scorePct: ufovScore,
        accentHex: '#F2B84B',
        citationShort: 'ACTIVE Trial · Ball et al. (JAMA)',
      },
      {
        id: 'nback_memory',
        label: 'Prefrontal Working Memory (N-Back)',
        clinicalTargetLabel: 'Dorsolateral Prefrontal Cortex',
        scorePct: nBackScore,
        accentHex: '#4FD1C5',
        citationShort: 'Jaeggi et al. (PNAS)',
      },
      {
        id: 'vagal_hrv',
        label: '0.1 Hz Vagal Autonomic Coherence',
        clinicalTargetLabel: 'Vagus Nerve & Prefrontal-Amygdala Loop',
        scorePct: vagalScore,
        accentHex: '#68D391',
        citationShort: 'Lehrer & Gevirtz (Front. Psychol.)',
      },
      {
        id: 'hippocampal_bdnf',
        label: 'Hippocampal BDNF Synaptogenesis',
        clinicalTargetLabel: 'Dentate Gyrus & Spatial Memory Network',
        scorePct: bdnfScore,
        accentHex: '#B794F4',
        citationShort: 'Erickson et al. (PNAS)',
      },
    ],
    compositeReserveIndex,
    estimatedPlasticityGainPct,
  };
}

/**
 * Sanctuary Atmosphere Soundscape Profiles (Forest, Rain, Meadow)
 * Grounded in Attention Restoration Theory (Berman et al., 2008) & Acoustic Soft Fascination.
 */
export type SanctuaryAtmosphereId = 'forest' | 'rain' | 'meadow';

export interface SanctuaryAtmosphereConfig {
  id: SanctuaryAtmosphereId;
  label: string;
  shortLabel: string;
  subtitle: string;
  clinicalNote: string;
  droneRootHz: number;
  droneFifthHz: number;
  noiseFilterType: 'bandpass' | 'lowpass';
  noiseCenterHz: number;
  noiseQ: number;
  noiseGain: number;
  lfoRateHz: number;
  lfoDepthHz: number;
  previewNotesHz: number[];
  accentHex: string;
}

export const SANCTUARY_ATMOSPHERES: SanctuaryAtmosphereConfig[] = [
  {
    id: 'forest',
    label: 'Forest Canopy',
    shortLabel: 'Forest',
    subtitle: 'Deep cedar breeze, resonant C-major woodland drone & rustling leaves',
    clinicalNote: 'Woodland pink-noise spectrum lowers sympathetic arousal (Berman et al., 2008)',
    droneRootHz: 130.81, // C3
    droneFifthHz: 196.0, // G3
    noiseFilterType: 'bandpass',
    noiseCenterHz: 420,
    noiseQ: 1.35,
    noiseGain: 0.022,
    lfoRateHz: 0.12,
    lfoDepthHz: 140,
    previewNotesHz: [261.63, 329.63, 392.0, 523.25],
    accentHex: '#68D391',
  },
  {
    id: 'rain',
    label: 'Gentle Rain',
    shortLabel: 'Rain',
    subtitle: 'Soothing rainfall patter on moss, warm D-dorian pad & crystalline droplets',
    clinicalNote: 'Steady acoustic rainfall masks environmental startle cues & stabilizes vagal tone',
    droneRootHz: 146.83, // D3
    droneFifthHz: 220.0, // A3
    noiseFilterType: 'lowpass',
    noiseCenterHz: 960,
    noiseQ: 0.7,
    noiseGain: 0.034,
    lfoRateHz: 0.22,
    lfoDepthHz: 210,
    previewNotesHz: [783.99, 659.25, 1046.5, 1318.51],
    accentHex: '#4FD1C5',
  },
  {
    id: 'meadow',
    label: 'Sunlit Meadow',
    shortLabel: 'Meadow',
    subtitle: 'Warm F-lydian golden breeze, tall-grass shimmer & distant harmonic chimes',
    clinicalNote: 'Open-meadow harmonic overtones promote prefrontal alpha relaxation',
    droneRootHz: 174.61, // F3
    droneFifthHz: 261.63, // C4
    noiseFilterType: 'bandpass',
    noiseCenterHz: 640,
    noiseQ: 1.1,
    noiseGain: 0.018,
    lfoRateHz: 0.09,
    lfoDepthHz: 180,
    previewNotesHz: [587.33, 739.99, 880.0, 1174.66],
    accentHex: '#F2B84B',
  },
];

export function getSanctuaryAtmosphereConfig(
  id?: SanctuaryAtmosphereId | string | null
): SanctuaryAtmosphereConfig {
  const found = SANCTUARY_ATMOSPHERES.find((a) => a.id === id);
  return found || SANCTUARY_ATMOSPHERES[0];
}

export function getNextSanctuaryAtmosphereId(
  current: SanctuaryAtmosphereId
): SanctuaryAtmosphereId {
  const idx = SANCTUARY_ATMOSPHERES.findIndex((a) => a.id === current);
  if (idx < 0) return 'forest';
  return SANCTUARY_ATMOSPHERES[(idx + 1) % SANCTUARY_ATMOSPHERES.length].id;
}

/**
 * Neuro-Nutrition & Glymphatic Sleep Hygiene Evidence-Based Protocols
 * Provides actionable diet and sleep hygiene interventions that upregulate BDNF,
 * synaptic membrane fluidity, and glymphatic slow-wave memory consolidation.
 */
export type NeuroLifestyleCategory = 'all' | 'diet' | 'sleep';

export interface NeuroNutritionTip {
  id: string;
  category: 'diet' | 'sleep';
  categoryBadge: string;
  title: string;
  biomarkerTarget: string;
  citation: string;
  mechanismSummary: string;
  actionableProtocol: string;
  synergyProtocolId: ProtocolId;
  synergyLabel: string;
  accentHex: string;
}

export const NEURO_NUTRITION_STORAGE_KEY = 'sylvan_synapse_neuro_habits_v1';

export const NEURO_NUTRITION_SLEEP_TIPS: NeuroNutritionTip[] = [
  {
    id: 'polyphenol_bdnf_diet',
    category: 'diet',
    categoryBadge: 'NEURO-NUTRITION · POLYPHENOLS',
    title: 'Dietary Anthocyanins & Flavonol Polyphenols (MIND Protocol)',
    biomarkerTarget: 'Hippocampal CREB-BDNF Signaling & Dentate Gyrus Perfusion',
    citation: 'Morris et al., Alzheimer’s & Dementia (2015); Brickman et al., PNAS (2014)',
    mechanismSummary:
      'Berry anthocyanins and cocoa/olive flavonols cross the blood-brain barrier, activating the ERK/CREB transcriptional pathway to upregulate endogenous BDNF and increase dentate gyrus capillary density.',
    actionableProtocol:
      'Consume 1 cup of wild blueberries or dark berries daily alongside polyphenol-rich extra-virgin olive oil and dark leafy greens 60–90 minutes prior to spatial memory training.',
    synergyProtocolId: 'dendrite_graft',
    synergyLabel: 'Synergizes with Protocol 04 · BDNF Dendrite Graft (+5% Nectar Yield)',
    accentHex: '#B794F4',
  },
  {
    id: 'omega3_dha_membrane',
    category: 'diet',
    categoryBadge: 'NEURO-NUTRITION · SYNAPTIC LIPIDS',
    title: 'Marine Omega-3 DHA & Choline Phospholipid Synthesis',
    biomarkerTarget: 'Dendritic Spine Lipid Raft Fluidity & Prefrontal Conduction',
    citation: 'Witte et al., Cerebral Cortex (2014); Yurko-Mauro et al., Alzheimer’s & Dementia (2010)',
    mechanismSummary:
      'Docosahexaenoic acid (DHA) comprises over 30% of grey-matter phospholipid membranes, accelerating AMPA/NMDA receptor trafficking and frontoparietal axonal myelination required for rapid working-memory updating.',
    actionableProtocol:
      'Target 1,000–2,000 mg/day of combined EPA/DHA (wild salmon, sardines, or microalgae oil) paired with dietary phosphatidylcholine (pasture-raised eggs or cruciferous greens).',
    synergyProtocolId: 'nback_chimes',
    synergyLabel: 'Synergizes with Protocol 02 · N-Back Echo Chimes (+5% Nectar Yield)',
    accentHex: '#4FD1C5',
  },
  {
    id: 'glymphatic_slow_wave_sleep',
    category: 'sleep',
    categoryBadge: 'SLEEP HYGIENE · GLYMPHATIC CLEARANCE',
    title: 'NREM Slow-Wave Glymphatic Washout & Core Thermal Drop',
    biomarkerTarget: 'Astrocytic Aquaporin-4 (AQP4) Clearance & Synaptic Homeostasis',
    citation: 'Xie et al. (Nedergaard Lab), Science (2013); Mander et al., Nat. Neurosci. (2013)',
    mechanismSummary:
      'During deep NREM slow-wave sleep, interstitial space expands by ~60%, allowing cerebrospinal fluid to flush metabolic beta-amyloid and tau while replaying hippocampal-prefrontal sharp-wave ripples.',
    actionableProtocol:
      'Maintain a cool 65°F (18.3°C) sleeping environment, favor lateral (side) sleeping posture for optimal glymphatic transport, and cease heavy meals 3 hours before sleep onset.',
    synergyProtocolId: 'ufov_forage',
    synergyLabel: 'Synergizes with Protocol 01 · UFOV Speed-of-Processing (+5% Nectar Yield)',
    accentHex: '#F2B84B',
  },
  {
    id: 'circadian_vagal_winddown',
    category: 'sleep',
    categoryBadge: 'SLEEP HYGIENE · CIRCADIAN & VAGAL',
    title: 'Morning Photonic Anchor & Pre-Sleep 0.1 Hz Vagal Down-Regulation',
    biomarkerTarget: 'Suprachiasmatic Nucleus (SCN) Entrainment & Stage N2 Sleep Spindles',
    citation: 'Diekelmann & Born, Nat. Rev. Neurosci. (2010); Lehrer & Gevirtz, Front. Psychol. (2014)',
    mechanismSummary:
      'Morning outdoor lux anchors cortisol awakening curves and nocturnal melatonin onset, while 5 minutes of pre-sleep 0.1 Hz resonance breathing elevates nocturnal vagal HRV and thalamocortical sleep spindle density.',
    actionableProtocol:
      'Get 10–15 minutes of direct outdoor daylight within 45 minutes of waking, dim overhead short-wavelength light 90 minutes before bed, and practice 5 minutes of 6-breaths/min (0.1 Hz) pacing.',
    synergyProtocolId: 'coherence_breath',
    synergyLabel: 'Synergizes with Protocol 03 · 0.1 Hz Resonance Breath (+5% Nectar Yield)',
    accentHex: '#68D391',
  },
];

export function filterNeuroNutritionTips(
  category: NeuroLifestyleCategory
): NeuroNutritionTip[] {
  if (category === 'all') return NEURO_NUTRITION_SLEEP_TIPS;
  return NEURO_NUTRITION_SLEEP_TIPS.filter((tip) => tip.category === category);
}

export function computeNeuroSynergyBonus(completedHabitIds: string[]): {
  completedCount: number;
  totalCount: number;
  readinessPct: number;
  bonusNectarMultiplier: number; // 1.00 .. 1.20
  startingNectarBonus: number; // 0 .. 16
  statusLabel: string;
} {
  const validSet = new Set(NEURO_NUTRITION_SLEEP_TIPS.map((t) => t.id));
  const uniqueCompleted = Array.from(new Set(completedHabitIds)).filter((id) =>
    validSet.has(id)
  );
  const completedCount = uniqueCompleted.length;
  const totalCount = NEURO_NUTRITION_SLEEP_TIPS.length;
  const readinessPct = Math.round((completedCount / totalCount) * 100);
  const bonusNectarMultiplier = Math.round((1 + completedCount * 0.05) * 100) / 100;
  const startingNectarBonus = completedCount * 4;

  let statusLabel = 'Baseline Biological Readiness';
  if (completedCount === 4) {
    statusLabel = 'Peak Metabolic & Glymphatic Readiness (+20% BDNF Yield)';
  } else if (completedCount >= 2) {
    statusLabel = `Active Neuro-Lifestyle Synergy (+${completedCount * 5}% BDNF Yield)`;
  } else if (completedCount === 1) {
    statusLabel = 'Developing Neuro-Lifestyle Habit (+5% BDNF Yield)';
  }

  return {
    completedCount,
    totalCount,
    readinessPct,
    bonusNectarMultiplier,
    startingNectarBonus,
    statusLabel,
  };
}

/**
 * Daily Neuro-Restorative Habit Tracker (Non-Sleep Deep Rest & Daily Cognitive Reframing)
 * Logs completion of NSDR and Daily Cognitive Reframing exercises and synchronizes directly
 * with the user's DailyStreakState.
 */
export type DailyHabitExerciseId = 'nsdr_protocol' | 'cognitive_reframing';

export interface DailyHabitExercise {
  id: DailyHabitExerciseId;
  title: string;
  shortLabel: string;
  protocolBadge: string;
  durationLabel: string;
  biomarkerTarget: string;
  citation: string;
  mechanismSummary: string;
  exercisePrompt: string;
  synergyBonusLabel: string;
  accentHex: string;
  tooltipHeadline: string;
  tooltipClinicalBenefit: string;
  tooltipNeuroLiterature: string;
  tooltipKeyMetrics: string[];
}

export const DAILY_HABIT_TRACKER_STORAGE_KEY = 'sylvan_synapse_daily_habit_tracker_v1';

export interface DailyHabitTrackerState {
  dateIso: string; // YYYY-MM-DD synced with daily streak
  nsdrCompleted: boolean;
  cognitiveReframingCompleted: boolean;
  syncedStreakDays: number;
  lastUpdatedIso: string | null;
}

export const DAILY_HABIT_EXERCISES: DailyHabitExercise[] = [
  {
    id: 'nsdr_protocol',
    title: 'Non-Sleep Deep Rest (NSDR)',
    shortLabel: 'Non-Sleep Deep Rest (NSDR)',
    protocolBadge: 'RESTORATIVE NEUROPLASTICITY · NSDR PROTOCOL',
    durationLabel: '10–20 Min Guided Rest',
    biomarkerTarget: '+65% Striatal Dopamine Recovery & Parasympathetic Theta Shift',
    citation: 'Kjaer et al., Cognitive Brain Research (2002); Yoga Nidra / NSDR Clinical Trials',
    mechanismSummary:
      'Guided supine body-scan and slow-exhale physiological sigh protocol that transitions thalamocortical networks into restorative alpha/theta waves, replenishing striatal dopamine reserves and accelerating hippocampal motor-spatial consolidation.',
    exercisePrompt:
      'Complete a 10–20 minute eyes-closed NSDR or Yoga Nidra body-scan session after intensive cognitive focus or mid-afternoon mental fatigue.',
    synergyBonusLabel: 'Syncs with Daily Streak · +10% Vagal & Striatal Recovery Readiness',
    accentHex: '#4FD1C5',
    tooltipHeadline:
      'Clinical Benefit · Striatal Dopamine Replenishment & Theta-State Synaptic Replay',
    tooltipClinicalBenefit:
      '11C-raclopride PET imaging demonstrates a +65% increase in endogenous striatal dopamine release during deep wakeful rest (NSDR / Yoga Nidra), accompanied by a shift from high-frequency beta to restorative theta/alpha (4–12 Hz) EEG rhythms that accelerates hippocampal-neocortical memory replay and lowers sympathetic cortisol.',
    tooltipNeuroLiterature:
      'Kjaer et al., Cognitive Brain Research (2002) [11C-raclopride PET]; Lou et al., Human Brain Mapping (1999); Boukhris et al., Appl. Psychophysiol. Biofeedback (2024)',
    tooltipKeyMetrics: [
      '+65% Striatal Dopamine Tone',
      '4–8 Hz Theta EEG Entrainment',
      'Hippocampal Replay Consolidation',
    ],
  },
  {
    id: 'cognitive_reframing',
    title: 'Daily Cognitive Reframing',
    shortLabel: 'Daily Cognitive Reframing',
    protocolBadge: 'TOP-DOWN PREFRONTAL REGULATION · CBT REAPPRAISAL',
    durationLabel: '5 Min Executive Exercise',
    biomarkerTarget: 'dlPFC-Amygdala Top-Down Attenuation & Cortisol Buffering',
    citation: 'Ochsner & Gross, Trends Cogn. Sci. (2005); Jamieson et al., J. Exp. Psychol. (2012)',
    mechanismSummary:
      'Structured cognitive reappraisal recruits dorsolateral and ventrolateral prefrontal cortex (dlPFC/vlPFC) executive pathways to down-regulate amygdala threat reactivity, converting acute stress arousal into adaptive neuroplastic eustress.',
    exercisePrompt:
      'Identify one automatic stress appraisal today and re-author it into an objective, growth-oriented prefrontal reframe.',
    synergyBonusLabel: 'Syncs with Daily Streak · +10% Prefrontal Executive Readiness',
    accentHex: '#B794F4',
    tooltipHeadline:
      'Clinical Benefit · Top-Down dlPFC/vlPFC Recruitment & Bilateral Amygdala Attenuation',
    tooltipClinicalBenefit:
      'Functional neuroimaging (fMRI) studies demonstrate that conscious cognitive reappraisal recruits dorsolateral, ventrolateral, and ventromedial prefrontal cortices (dlPFC/vlPFC/vmPFC) to exert top-down inhibitory modulation over bilateral amygdala threat reactivity, buffering HPA-axis cortisol spikes and preserving working-memory bandwidth.',
    tooltipNeuroLiterature:
      'Ochsner, Bunge, Gross & Gabrieli, J. Cogn. Neurosci. (2002); Buhle et al., Cerebral Cortex (2014) [Meta-analysis of 48 fMRI studies]; Jamieson et al., J. Exp. Psychol. (2012)',
    tooltipKeyMetrics: [
      'Bilateral Amygdala Down-Regulation',
      'dlPFC & vlPFC Executive Recruitment',
      'HPA-Axis Cortisol & Vagal Buffering',
    ],
  },
];

export function getDailyHabitClinicalTooltip(
  exerciseId: DailyHabitExerciseId | string
): {
  id: DailyHabitExerciseId;
  title: string;
  headline: string;
  clinicalBenefit: string;
  neuroLiterature: string;
  keyMetrics: string[];
  formattedTooltipText: string;
} {
  const found =
    DAILY_HABIT_EXERCISES.find((ex) => ex.id === exerciseId) || DAILY_HABIT_EXERCISES[0];
  return {
    id: found.id,
    title: found.title,
    headline: found.tooltipHeadline,
    clinicalBenefit: found.tooltipClinicalBenefit,
    neuroLiterature: found.tooltipNeuroLiterature,
    keyMetrics: found.tooltipKeyMetrics,
    formattedTooltipText: `${found.tooltipHeadline} — ${found.tooltipClinicalBenefit} (Literature: ${found.tooltipNeuroLiterature})`,
  };
}

export function syncDailyHabitTrackerWithStreak(
  savedStreak: DailyStreakState | null | undefined,
  savedTracker: DailyHabitTrackerState | null | undefined,
  todayIso: string
): { streak: DailyStreakState; tracker: DailyHabitTrackerState } {
  const evaluatedStreak = evaluateStreakOnLoad(savedStreak, todayIso);
  const isSameDayTracker = Boolean(savedTracker && savedTracker.dateIso === todayIso);
  const isSameDayStreakHabits = Boolean(
    savedStreak && savedStreak.habitTrackerDateIso === todayIso
  );

  const nsdrCompleted = isSameDayTracker
    ? Boolean(savedTracker?.nsdrCompleted)
    : isSameDayStreakHabits
    ? Boolean(savedStreak?.nsdrCompletedToday)
    : false;

  const cognitiveReframingCompleted = isSameDayTracker
    ? Boolean(savedTracker?.cognitiveReframingCompleted)
    : isSameDayStreakHabits
    ? Boolean(savedStreak?.cognitiveReframingCompletedToday)
    : false;

  // If either exercise was already completed today, ensure today's streak session is recorded
  const syncedStreakBase =
    nsdrCompleted || cognitiveReframingCompleted
      ? recordDailyPracticeSession(evaluatedStreak, todayIso)
      : evaluatedStreak;

  const streak: DailyStreakState = {
    ...syncedStreakBase,
    nsdrCompletedToday: nsdrCompleted,
    cognitiveReframingCompletedToday: cognitiveReframingCompleted,
    habitTrackerDateIso: todayIso,
  };

  const tracker: DailyHabitTrackerState = {
    dateIso: todayIso,
    nsdrCompleted,
    cognitiveReframingCompleted,
    syncedStreakDays: streak.currentStreak,
    lastUpdatedIso: isSameDayTracker ? savedTracker?.lastUpdatedIso ?? todayIso : null,
  };

  return { streak, tracker };
}

export function toggleDailyHabitExercise(params: {
  streak: DailyStreakState | null | undefined;
  tracker: DailyHabitTrackerState | null | undefined;
  exerciseId: DailyHabitExerciseId;
  todayIso: string;
}): {
  streak: DailyStreakState;
  tracker: DailyHabitTrackerState;
  completedCount: number;
  allExercisesCompleted: boolean;
  streakSyncedLabel: string;
} {
  const { streak: baseStreak, tracker: baseTracker } = syncDailyHabitTrackerWithStreak(
    params.streak,
    params.tracker,
    params.todayIso
  );

  const nextNsdr =
    params.exerciseId === 'nsdr_protocol'
      ? !baseTracker.nsdrCompleted
      : baseTracker.nsdrCompleted;

  const nextReframing =
    params.exerciseId === 'cognitive_reframing'
      ? !baseTracker.cognitiveReframingCompleted
      : baseTracker.cognitiveReframingCompleted;

  // Completing either NSDR or Daily Cognitive Reframing logs a daily practice session on todayIso
  const practicedStreak =
    nextNsdr || nextReframing
      ? recordDailyPracticeSession(baseStreak, params.todayIso)
      : baseStreak;

  const updatedStreak: DailyStreakState = {
    ...practicedStreak,
    nsdrCompletedToday: nextNsdr,
    cognitiveReframingCompletedToday: nextReframing,
    habitTrackerDateIso: params.todayIso,
  };

  const updatedTracker: DailyHabitTrackerState = {
    dateIso: params.todayIso,
    nsdrCompleted: nextNsdr,
    cognitiveReframingCompleted: nextReframing,
    syncedStreakDays: updatedStreak.currentStreak,
    lastUpdatedIso: params.todayIso,
  };

  const completedCount = (nextNsdr ? 1 : 0) + (nextReframing ? 1 : 0);
  const allExercisesCompleted = nextNsdr && nextReframing;
  const streakDaysLabel = `${updatedStreak.currentStreak}-Day Streak`;
  const streakSyncedLabel =
    completedCount === 2
      ? `Synced with ${streakDaysLabel} · Both NSDR & Cognitive Reframing Completed Today`
      : completedCount === 1
      ? `Synced with ${streakDaysLabel} · 1/2 Mind-Body Exercises Logged Today`
      : `Synced with ${streakDaysLabel} · Log NSDR or Cognitive Reframing Today`;

  return {
    streak: updatedStreak,
    tracker: updatedTracker,
    completedCount,
    allExercisesCompleted,
    streakSyncedLabel,
  };
}

/**
 * Cognitive Insight Journal — Post-Session Reflective 'Neural Logs' Linked to Daily Streak
 * Grounded in Metacognitive Monitoring & Expressive Consolidation (Fleming & Dolan, Phil. Trans. R. Soc. B, 2012).
 */
export type NeuralLogMoodTag =
  | 'Focused Clarity'
  | 'Deep Vagal Calm'
  | 'Flow State'
  | 'Mental Fatigue Recovery';

export interface NeuralLogEntry {
  id: string;
  recordedAtIso: string; // YYYY-MM-DD
  streakDayCount: number; // Linked to user's daily practice streak
  stageName: string;
  outcome: 'victory' | 'defeat';
  rejuvenationScore: number;
  moodTag: NeuralLogMoodTag;
  reflectionNote: string;
}

export const NEURAL_LOGS_STORAGE_KEY = 'sylvan_synapse_neural_logs_v1';

export const NEURAL_LOG_MOOD_TAGS: NeuralLogMoodTag[] = [
  'Focused Clarity',
  'Deep Vagal Calm',
  'Flow State',
  'Mental Fatigue Recovery',
];

export const NEURAL_LOG_PROMPT_CHIPS: string[] = [
  'Peripheral UFOV firefly locks felt noticeably faster today.',
  '0.1 Hz resonance breathing dissolved tension and steadied my focus.',
  '1-Back / 2-Back Echo Chimes clicked into effortless prefrontal flow.',
  'Grafting hippocampal neural trees felt deeply restorative after work.',
];

export const DEFAULT_NEURAL_LOGS_SEED: NeuralLogEntry[] = [
  {
    id: 'nlog-seed-1',
    recordedAtIso: '2026-11-01',
    streakDayCount: 1,
    stageName: 'Stage I · The Mossy Dentate Grove',
    outcome: 'victory',
    rejuvenationScore: 1280,
    moodTag: 'Deep Vagal Calm',
    reflectionNote:
      'Paced 0.1 Hz breathing immediately calmed my afternoon mental fatigue and made UFOV peripheral spotting feel natural.',
  },
  {
    id: 'nlog-seed-2',
    recordedAtIso: '2026-11-02',
    streakDayCount: 2,
    stageName: 'Stage II · The Bioluminescent Prefrontal Canopy',
    outcome: 'victory',
    rejuvenationScore: 1420,
    moodTag: 'Flow State',
    reflectionNote:
      'Chained three 2-Back Echo Chime matches in a row while listening to the Gentle Rain soundscape.',
  },
];

export function appendNeuralLogEntry(
  existingLogs: NeuralLogEntry[],
  newEntry: {
    recordedAtIso: string;
    streakDayCount: number;
    stageName: string;
    outcome: 'victory' | 'defeat';
    rejuvenationScore: number;
    moodTag: NeuralLogMoodTag;
    reflectionNote: string;
    id?: string;
  },
  maxLogs = 20
): NeuralLogEntry[] {
  const trimmedNote = (newEntry.reflectionNote || '').trim().slice(0, 280);
  if (!trimmedNote) {
    return existingLogs;
  }

  const created: NeuralLogEntry = {
    id: newEntry.id || `nlog-${Date.now()}-${existingLogs.length + 1}`,
    recordedAtIso: newEntry.recordedAtIso,
    streakDayCount: Math.max(1, Math.round(newEntry.streakDayCount)),
    stageName: newEntry.stageName || SANCTUARY_STAGES[0].name,
    outcome: newEntry.outcome,
    rejuvenationScore: Math.max(0, Math.round(newEntry.rejuvenationScore)),
    moodTag: newEntry.moodTag || 'Focused Clarity',
    reflectionNote: trimmedNote,
  };

  return [created, ...existingLogs].slice(0, maxLogs);
}

/**
 * Zen Mode HUD Visibility & HRV Focus Configuration
 * Hides non-essential status telemetry (BDNF Nectar, Trees Grafted, Rejuvenation Score,
 * Synaptic Flow Multiplier, N-Back Chime Stream, Protocol Deck, Radar Minimap) to provide
 * an unobstructed, minimalist sanctuary view for focused 0.1 Hz HRV coherence breathing.
 */
export interface ZenModeHudState {
  isZenMode: boolean;
  showNectar: boolean;
  showTreesGrafted: boolean;
  showRejuvenation: boolean;
  showSynapticFlow: boolean;
  showNBackStream: boolean;
  showProtocolDeck: boolean;
  showRadarMinimap: boolean;
  showZenBreathingGuide: boolean;
  autoEngageVagalBreathing: boolean;
}

export function computeZenModeHudState(isZenMode: boolean): ZenModeHudState {
  const active = Boolean(isZenMode);
  return {
    isZenMode: active,
    showNectar: !active,
    showTreesGrafted: !active,
    showRejuvenation: !active,
    showSynapticFlow: !active,
    showNBackStream: !active,
    showProtocolDeck: !active,
    showRadarMinimap: !active,
    showZenBreathingGuide: active,
    autoEngageVagalBreathing: active,
  };
}

/**
 * Cognitive Pulse Bioluminescent Particle & Harmonic Wave Effect
 * Triggers whenever the user successfully matches an N-Back chime or completes a UFOV challenge,
 * radiating bioluminescent particles and dual-ring synaptic waves from the interaction point.
 */
export type CognitivePulseType = 'nback_match' | 'ufov_complete';

export interface CognitivePulseParticleSeed {
  angleRad: number;
  vx: number;
  vy: number;
  size: number;
  lifeSec: number;
  colorIdx: number; // 0: Amber gold, 1: Cyan-teal, 2: Vagal emerald, 5: Starlight white
  ringTier: 'inner_burst' | 'outer_corona';
}

export interface CognitivePulseWaveConfig {
  type: CognitivePulseType;
  originX: number;
  originY: number;
  primaryColorHex: string;
  secondaryColorHex: string;
  coreGlowRgba: string;
  maxRadius: number;
  durationSec: number;
  filamentCount: number;
  particles: CognitivePulseParticleSeed[];
}

export function createCognitivePulseConfig(
  type: CognitivePulseType,
  originX: number,
  originY: number,
  flowMultiplier = 1.0
): CognitivePulseWaveConfig {
  const clampedFlow = Math.min(1.35, Math.max(1.0, Number.isFinite(flowMultiplier) ? flowMultiplier : 1.0));
  const isNBack = type === 'nback_match';
  const baseParticleCount = isNBack ? 36 : 32;
  const totalParticles = Math.round(baseParticleCount * clampedFlow);

  const primaryColorHex = isNBack ? '#4FD1C5' : '#F2B84B';
  const secondaryColorHex = isNBack ? '#68D391' : '#4FD1C5';
  const coreGlowRgba = isNBack
    ? 'rgba(79, 209, 197, 0.52)'
    : 'rgba(242, 184, 75, 0.52)';
  const maxRadius = Math.round((isNBack ? 260 : 240) * clampedFlow);
  const durationSec = isNBack ? 1.15 : 1.08;
  const filamentCount = isNBack ? 12 : 8;

  const particles: CognitivePulseParticleSeed[] = [];
  for (let i = 0; i < totalParticles; i++) {
    const isOuter = i % 2 === 0;
    const baseAngle = (Math.PI * 2 * i) / totalParticles;
    const goldenJitter = ((i * 0.6180339887) % 1 - 0.5) * 0.18;
    const angleRad = baseAngle + goldenJitter;

    const speedBase = isOuter ? 165 + (i % 5) * 24 : 75 + (i % 4) * 18;
    const speed = speedBase * clampedFlow;

    // Color palette indices: N-Back alternates Cyan (1), Emerald (2), and White (5)
    // UFOV alternates Amber Gold (0), Starlight White (5), and Cyan (1)
    let colorIdx = 1;
    if (isNBack) {
      colorIdx = i % 4 === 0 ? 5 : i % 2 === 0 ? 1 : 2;
    } else {
      colorIdx = i % 4 === 0 ? 5 : i % 3 === 0 ? 1 : 0;
    }

    const size = isOuter ? 3.8 + (i % 3) * 1.3 : 2.6 + (i % 3) * 0.9;
    const lifeSec = isOuter ? 0.88 + (i % 3) * 0.12 : 0.65 + (i % 3) * 0.1;

    particles.push({
      angleRad,
      vx: Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      size,
      lifeSec,
      colorIdx,
      ringTier: isOuter ? 'outer_corona' : 'inner_burst',
    });
  }

  return {
    type,
    originX,
    originY,
    primaryColorHex,
    secondaryColorHex,
    coreGlowRgba,
    maxRadius,
    durationSec,
    filamentCount,
    particles,
  };
}

export function stepCognitivePulseWave(
  elapsedSec: number,
  durationSec: number,
  maxRadius: number
): {
  active: boolean;
  progress: number;
  primaryRadius: number;
  secondaryRadius: number;
  alpha: number;
  coreGlowAlpha: number;
} {
  if (durationSec <= 0 || elapsedSec >= durationSec || elapsedSec < 0) {
    return {
      active: false,
      progress: 1,
      primaryRadius: maxRadius,
      secondaryRadius: maxRadius * 0.78,
      alpha: 0,
      coreGlowAlpha: 0,
    };
  }

  const progress = Math.min(1, Math.max(0, elapsedSec / durationSec));
  // Smooth cubic ease-out expansion for bioluminescent shockwave
  const easeOut = 1 - Math.pow(1 - progress, 3);
  const secondaryProgress = Math.max(0, (progress - 0.12) / 0.88);
  const secondaryEaseOut = 1 - Math.pow(1 - secondaryProgress, 2.6);

  const primaryRadius = 18 + (maxRadius - 18) * easeOut;
  const secondaryRadius = 12 + (maxRadius * 0.82 - 12) * secondaryEaseOut;
  const alpha = Math.max(0, Math.pow(1 - progress, 1.45));
  const coreGlowAlpha = Math.max(0, Math.pow(1 - progress, 2.1) * 0.68);

  return {
    active: true,
    progress,
    primaryRadius,
    secondaryRadius,
    alpha,
    coreGlowAlpha,
  };
}

/**
 * 'Sanctuary Bloom' Post-Processing & Orbital Camera Rotation Effect
 * Triggers when the user completes all 4 stages (or activates the Sanctuary Bloom preview),
 * saturating the entire canvas with bioluminescence and slowly rotating the camera.
 */
export const SANCTUARY_BLOOM_STORAGE_KEY = 'sylvan_synapse_completed_stages_v1';
export const SANCTUARY_BLOOM_INTENSITY_STORAGE_KEY = 'sylvan_synapse_bloom_intensity_v1';
export const DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT = 100;

export function clampSanctuaryBloomIntensityPct(
  rawValue: unknown,
  fallbackPct: number = DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT
): number {
  const num = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  if (!Number.isFinite(num)) {
    return Math.max(0, Math.min(100, Math.round(fallbackPct)));
  }
  return Math.max(0, Math.min(100, Math.round(num)));
}

export interface SanctuaryBloomState {
  isTriggered: boolean;
  completedStagesCount: number;
  totalStages: number;
  userIntensityPct: number; // 0 .. 100
  cameraRotationRad: number;
  cameraRotationDeg: number;
  bioluminescenceSaturation: number; // 0 .. 1.0
  bloomIntensityAlpha: number; // 0 .. 0.65
  coronaRayAlpha: number; // 0 .. 0.22
  chromaticAuroraShift: number; // 0 .. 1.0
  statusBadgeText: string;
}

export function computeSanctuaryBloomEffect(params: {
  completedStagesCount: number;
  totalStages?: number;
  isBloomManuallyActive?: boolean;
  intensityPct?: number;
  elapsedSec: number;
}): SanctuaryBloomState {
  const totalStages = Math.max(1, params.totalStages ?? SANCTUARY_STAGES.length);
  const completedStagesCount = Math.max(
    0,
    Math.min(totalStages, Math.round(params.completedStagesCount || 0))
  );
  const userIntensityPct = clampSanctuaryBloomIntensityPct(
    params.intensityPct,
    DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT
  );
  const intensityScale = userIntensityPct / 100;
  const isTriggered =
    completedStagesCount >= totalStages || Boolean(params.isBloomManuallyActive);

  if (!isTriggered) {
    return {
      isTriggered: false,
      completedStagesCount,
      totalStages,
      userIntensityPct,
      cameraRotationRad: 0,
      cameraRotationDeg: 0,
      bioluminescenceSaturation: 0,
      bloomIntensityAlpha: 0,
      coronaRayAlpha: 0,
      chromaticAuroraShift: 0,
      statusBadgeText: `Sanctuary Stages Completed: ${completedStagesCount}/${totalStages}`,
    };
  }

  const safeElapsed = Math.max(0, Number.isFinite(params.elapsedSec) ? params.elapsedSec : 0);
  // Slow, meditative orbital camera rotation (~0.085 rad/sec = ~4.87 deg/sec)
  const cameraRotationRad = (safeElapsed * 0.085) % (Math.PI * 2);
  const cameraRotationDeg = Math.round(((cameraRotationRad * 180) / Math.PI) * 10) / 10;
  const bioluminescenceSaturation = Math.round(intensityScale * 1000) / 1000;
  const bloomIntensityAlpha =
    Math.round((0.46 + 0.12 * Math.sin(safeElapsed * 1.35)) * intensityScale * 1000) / 1000;
  const coronaRayAlpha = Math.round(0.22 * intensityScale * 1000) / 1000;
  const chromaticAuroraShift =
    Math.round((0.5 + 0.5 * Math.sin(safeElapsed * 0.65)) * 1000) / 1000;

  return {
    isTriggered: true,
    completedStagesCount: Math.max(completedStagesCount, totalStages),
    totalStages,
    userIntensityPct,
    cameraRotationRad,
    cameraRotationDeg,
    bioluminescenceSaturation,
    bloomIntensityAlpha,
    coronaRayAlpha,
    chromaticAuroraShift,
    statusBadgeText: `SANCTUARY BLOOM ACTIVE · ${userIntensityPct}% BIOLUM · ${totalStages}/${totalStages} STAGES`,
  };
}

/**
 * 'Cognitive Flow Pulse' HUD Rhythmic Visual Feedback Loop
 * Triggers an expanding, bioluminescent glow pulse when the user's Flow Multiplier increases,
 * and maintains a subtle rhythmic concentration cadence while Flow Multiplier > 1.0x.
 */
export interface HudFlowPulseState {
  isMultiplierIncreased: boolean;
  isPulsing: boolean;
  flowMultiplier: number;
  previousMultiplier: number;
  multiplierDelta: number;
  scaleFactor: number; // 1.0 .. 1.12
  glowOpacity: number; // 0.0 .. 0.92
  ringExpandScale: number; // 1.0 .. 1.45
  ringOpacity: number; // 0.0 .. 0.78
  accentHex: string;
  rhythmicCadenceSec: number; // 1.35s .. 2.6s
  statusLabel: string;
}

export function computeHudFlowPulseState(params: {
  currentMultiplier: number;
  previousMultiplier: number;
  timeSinceIncreaseMs?: number;
  pulseDurationMs?: number;
}): HudFlowPulseState {
  const currentMultiplier = Math.max(
    1.0,
    Math.min(2.5, Math.round((Number(params.currentMultiplier) || 1.0) * 100) / 100)
  );
  const previousMultiplier = Math.max(
    1.0,
    Math.min(2.5, Math.round((Number(params.previousMultiplier) || 1.0) * 100) / 100)
  );
  const multiplierDelta = Math.max(
    0,
    Math.round((currentMultiplier - previousMultiplier) * 100) / 100
  );
  const isMultiplierIncreased = currentMultiplier > previousMultiplier;

  const pulseDurationMs = Math.max(200, params.pulseDurationMs ?? 1400);
  const rawElapsed = params.timeSinceIncreaseMs;
  const hasActiveWindow =
    typeof rawElapsed === 'number' &&
    Number.isFinite(rawElapsed) &&
    rawElapsed >= 0 &&
    rawElapsed < pulseDurationMs;

  const isPulsing = isMultiplierIncreased || hasActiveWindow;
  const elapsedMs = hasActiveWindow
    ? rawElapsed!
    : isMultiplierIncreased
    ? pulseDurationMs * 0.35
    : pulseDurationMs;

  // Accent color shifts across neuroplastic flow tiers
  let accentHex = '#68D391';
  if (currentMultiplier >= 2.0) {
    accentHex = '#B794F4'; // Peak Neuroplastic Flow (Amethyst)
  } else if (currentMultiplier >= 1.5) {
    accentHex = '#4FD1C5'; // Prefrontal Resonance (Cyan)
  } else if (currentMultiplier >= 1.2) {
    accentHex = '#F2B84B'; // Parasympathetic Lock (Amber Gold)
  }

  // Rhythmic concentration cadence tightens smoothly as flow multiplier rises (2.5s -> 1.4s)
  const normalizedFlow = Math.min(1, Math.max(0, (currentMultiplier - 1.0) / 1.5));
  const rhythmicCadenceSec = Math.round((2.5 - normalizedFlow * 1.1) * 100) / 100;

  if (!isPulsing) {
    const sustainedGlow =
      currentMultiplier > 1.0
        ? Math.round((0.14 + normalizedFlow * 0.24) * 1000) / 1000
        : 0;
    return {
      isMultiplierIncreased: false,
      isPulsing: false,
      flowMultiplier: currentMultiplier,
      previousMultiplier,
      multiplierDelta: 0,
      scaleFactor: 1.0,
      glowOpacity: sustainedGlow,
      ringExpandScale: 1.0,
      ringOpacity: 0,
      accentHex,
      rhythmicCadenceSec,
      statusLabel:
        currentMultiplier > 1.0
          ? `Rhythmic Concentration Active · ${currentMultiplier.toFixed(2)}x`
          : 'Baseline Flow Calibration · 1.00x',
    };
  }

  const progress = Math.min(1, Math.max(0, elapsedMs / pulseDurationMs));
  const harmonicWave = Math.sin(progress * Math.PI);
  const easeOut = 1 - Math.pow(1 - progress, 2.4);

  const scaleFactor = Math.round((1.0 + 0.095 * harmonicWave) * 1000) / 1000;
  const glowOpacity = Math.round((0.28 + 0.62 * harmonicWave) * 1000) / 1000;
  const ringExpandScale = Math.round((1.0 + 0.42 * easeOut) * 1000) / 1000;
  const ringOpacity = Math.round(0.78 * (1 - progress) * 1000) / 1000;

  return {
    isMultiplierIncreased,
    isPulsing: true,
    flowMultiplier: currentMultiplier,
    previousMultiplier,
    multiplierDelta: multiplierDelta > 0 ? multiplierDelta : 0.25,
    scaleFactor,
    glowOpacity,
    ringExpandScale,
    ringOpacity,
    accentHex,
    rhythmicCadenceSec,
    statusLabel: `FLOW PULSE +${(multiplierDelta > 0 ? multiplierDelta : 0.25).toFixed(2)}x · ${currentMultiplier.toFixed(2)}x CONCENTRATION SURGE`,
  };
}

/**
 * Enterprise Digital Therapeutics (DTx) Longitudinal Telemetry Bundle Builder
 * Generates a structured clinical report for practitioner review or personal archiving.
 */
export interface EnterpriseClinicalExportBundle {
  schemaVersion: string;
  exportedAtIso: string;
  compositeReserveIndex: number;
  estimatedPlasticityGainPct: number;
  currentStreakDays: number;
  totalTreesGrafted: number;
  peakRejuvenationScore: number;
  meanHrvCoherencePct: number;
  nsdrCompletedToday: boolean;
  cognitiveReframingCompletedToday: boolean;
  neuralLogsCount: number;
  summaryReportText: string;
}

export function buildEnterpriseClinicalExportBundle(params: {
  exportedAtIso: string;
  totalTreesGrafted: number;
  peakRejuvenationScore: number;
  currentStreakDays: number;
  hrvHistory: HrvSessionRecord[];
  dailyHabitTracker?: DailyHabitTrackerState | null;
  neuralLogs: NeuralLogEntry[];
}): EnterpriseClinicalExportBundle {
  const hrvTrend = computeHrvTrendSummary(params.hrvHistory);
  const domainProfile = computeCognitiveDomainProfile({
    totalTreesGrafted: params.totalTreesGrafted,
    peakRejuvenationScore: params.peakRejuvenationScore,
    averageHrvCoherence: hrvTrend.averageCoherence,
    currentStreakDays: params.currentStreakDays,
  });

  const nsdrCompletedToday = Boolean(params.dailyHabitTracker?.nsdrCompleted);
  const cognitiveReframingCompletedToday = Boolean(
    params.dailyHabitTracker?.cognitiveReframingCompleted
  );

  const summaryReportText = [
    `SYLVAN SYNAPSE DTx · CLINICAL TELEMETRY REPORT (${params.exportedAtIso})`,
    `Composite Cognitive Reserve Index: ${domainProfile.compositeReserveIndex}/100 (+${domainProfile.estimatedPlasticityGainPct}% Est. Plasticity Gain)`,
    `Daily Practice Streak: ${params.currentStreakDays}d | Hippocampal Trees Grafted: ${params.totalTreesGrafted} | Peak Score: ${params.peakRejuvenationScore}`,
    `10-Session Vagal HRV Coherence Mean: ${hrvTrend.averageCoherence}% (Peak ${hrvTrend.peakCoherence}%, Trend ${hrvTrend.deltaFromFirst >= 0 ? '+' : ''}${hrvTrend.deltaFromFirst}%)`,
    `Daily Neuro-Habits Today: NSDR=${nsdrCompletedToday ? 'COMPLETED' : 'PENDING'}, Cognitive Reframing=${cognitiveReframingCompletedToday ? 'COMPLETED' : 'PENDING'}`,
    `Recorded Post-Session Neural Logs: ${params.neuralLogs.length}`,
  ].join('\n');

  return {
    schemaVersion: '2026.4-Enterprise-DTx',
    exportedAtIso: params.exportedAtIso,
    compositeReserveIndex: domainProfile.compositeReserveIndex,
    estimatedPlasticityGainPct: domainProfile.estimatedPlasticityGainPct,
    currentStreakDays: params.currentStreakDays,
    totalTreesGrafted: params.totalTreesGrafted,
    peakRejuvenationScore: params.peakRejuvenationScore,
    meanHrvCoherencePct: hrvTrend.averageCoherence,
    nsdrCompletedToday,
    cognitiveReframingCompletedToday,
    neuralLogsCount: params.neuralLogs.length,
    summaryReportText,
  };
}

/**
 * 'Adaptive Difficulty Scaling' System
 * Dynamically adjusts N-Back working memory difficulty (1-Back, 2-Back, 3-Back)
 * and UFOV peripheral window timing (ms) based on the user's running 5-session
 * average HRV coherence score to maintain the optimal autonomic-cognitive 'Flow' state.
 */
export type AdaptiveScalingTierId =
  | 'restorative_support'
  | 'balanced_resonance'
  | 'elevated_flow'
  | 'peak_mastery';

export interface RunningFiveSessionHrvSummary {
  runningFiveSessionAvg: number; // 0 .. 100
  sampleCount: number; // 0 .. 5
  recentFiveScores: number[];
}

export function computeRunningFiveSessionHrvAverage(
  history?: readonly HrvSessionRecord[] | null
): RunningFiveSessionHrvSummary {
  if (!history || history.length === 0) {
    return {
      runningFiveSessionAvg: 0,
      sampleCount: 0,
      recentFiveScores: [],
    };
  }
  const recentFive = history.slice(-5);
  const recentFiveScores = recentFive.map((s) =>
    Math.max(0, Math.min(100, Math.round(Number(s.coherenceScore) || 0)))
  );
  const sum = recentFiveScores.reduce((acc, v) => acc + v, 0);
  const runningFiveSessionAvg = Math.round(sum / recentFiveScores.length);

  return {
    runningFiveSessionAvg,
    sampleCount: recentFiveScores.length,
    recentFiveScores,
  };
}

export function createInitialChimeHistoryForNBack(nBackLevel: number): ChimeSymbol[] {
  const clamped = Math.max(1, Math.min(3, Math.round(nBackLevel || 1)));
  if (clamped === 1) {
    return ['LEAF', 'SUN', 'SUN'];
  }
  if (clamped === 2) {
    return ['SUN', 'LEAF', 'SUN'];
  }
  return ['SUN', 'LEAF', 'DROP', 'SUN'];
}

export interface AdaptiveDifficultyScalingState {
  tierId: AdaptiveScalingTierId;
  tierLabel: string;
  runningFiveSessionHrvAvg: number;
  recentFiveScores: number[];
  baseNBackLevel: 1 | 2;
  effectiveNBackLevel: 1 | 2 | 3;
  nBackDelta: number;
  baseUfovWindowMs: number;
  hrvUfovAdjustmentMs: number;
  streakUfovAdjustmentMs: number;
  effectiveUfovWindowMs: number;
  effectiveUfovFlashSec: number;
  flowStateSummary: string;
  clinicalRationale: string;
  accentHex: string;
}

export function computeAdaptiveDifficultyScaling(params: {
  hrvHistory?: readonly HrvSessionRecord[] | null;
  runningFiveSessionHrvAvgOverride?: number | null;
  baseNBackLevel: 1 | 2;
  baseUfovFlashSec: number;
  consecutiveCognitiveHits?: number;
}): AdaptiveDifficultyScalingState {
  const fiveSessionSummary = computeRunningFiveSessionHrvAverage(
    params.hrvHistory && params.hrvHistory.length > 0
      ? params.hrvHistory
      : DEFAULT_HRV_HISTORY_SEED
  );

  const hasOverride =
    typeof params.runningFiveSessionHrvAvgOverride === 'number' &&
    Number.isFinite(params.runningFiveSessionHrvAvgOverride);

  const runningFiveSessionHrvAvg = hasOverride
    ? Math.max(0, Math.min(100, Math.round(params.runningFiveSessionHrvAvgOverride!)))
    : fiveSessionSummary.runningFiveSessionAvg;

  const baseNBackLevel: 1 | 2 = params.baseNBackLevel === 2 ? 2 : 1;
  const baseUfovWindowMs = Math.round(Math.max(0.8, params.baseUfovFlashSec || 1.8) * 1000);
  const streak = Math.max(0, Math.floor(params.consecutiveCognitiveHits || 0));
  const streakUfovAdjustmentMs = -Math.min(700, streak * 120);

  let tierId: AdaptiveScalingTierId = 'balanced_resonance';
  let tierLabel = 'Balanced Vagal Flow';
  let effectiveNBackLevel: 1 | 2 | 3 = baseNBackLevel;
  let hrvUfovAdjustmentMs = 0;
  let flowStateSummary = `${baseNBackLevel}-Back Baseline · Balanced UFOV`;
  let clinicalRationale =
    '5-session HRV (72–83%) reflects balanced vagal tone; maintains stage baseline N-Back and standard UFOV timing.';
  let accentHex = '#4FD1C5';

  if (runningFiveSessionHrvAvg < 72) {
    tierId = 'restorative_support';
    tierLabel = 'Restorative Flow Support';
    effectiveNBackLevel = 1;
    hrvUfovAdjustmentMs = 350;
    flowStateSummary = '1-Back Support · +350ms UFOV Buffer';
    clinicalRationale =
      '5-session HRV (<72%) indicates autonomic fatigue; eases N-Back to 1-Back and widens UFOV window (+350ms) to restore parasympathetic flow.';
    accentHex = '#68D391';
  } else if (runningFiveSessionHrvAvg >= 92) {
    tierId = 'peak_mastery';
    tierLabel = 'Peak Autonomic Mastery';
    effectiveNBackLevel = 3;
    hrvUfovAdjustmentMs = -380;
    flowStateSummary = '3-Back Mastery · -380ms Apex UFOV';
    clinicalRationale =
      '5-session HRV (≥92%) indicates elite autonomic resonance; unlocks 3-Back working memory and high-speed UFOV (-380ms) to lock deep Flow.';
    accentHex = '#B794F4';
  } else if (runningFiveSessionHrvAvg >= 82) {
    tierId = 'elevated_flow';
    tierLabel = 'Elevated Prefrontal Flow';
    effectiveNBackLevel = Math.max(2, baseNBackLevel) as 1 | 2 | 3;
    hrvUfovAdjustmentMs = -220;
    flowStateSummary = `${effectiveNBackLevel}-Back Promoted · -220ms Rapid UFOV`;
    clinicalRationale =
      '5-session HRV (82–91%) demonstrates strong vagal-prefrontal coupling; promotes N-Back to 2-Back and tightens UFOV window (-220ms) to sustain Flow.';
    accentHex = '#F2B84B';
  }

  const rawUfovMs = baseUfovWindowMs + hrvUfovAdjustmentMs + streakUfovAdjustmentMs;
  const effectiveUfovWindowMs = Math.max(750, Math.min(2600, Math.round(rawUfovMs)));
  const effectiveUfovFlashSec = Math.round((effectiveUfovWindowMs / 1000) * 1000) / 1000;
  const nBackDelta = effectiveNBackLevel - baseNBackLevel;

  return {
    tierId,
    tierLabel,
    runningFiveSessionHrvAvg,
    recentFiveScores: fiveSessionSummary.recentFiveScores,
    baseNBackLevel,
    effectiveNBackLevel,
    nBackDelta,
    baseUfovWindowMs,
    hrvUfovAdjustmentMs,
    streakUfovAdjustmentMs,
    effectiveUfovWindowMs,
    effectiveUfovFlashSec,
    flowStateSummary,
    clinicalRationale,
    accentHex,
  };
}

/**
 * Sanctuary Bloom Enhancement: Staggered Particle-Based Tree 'Flowering' Animation
 * & N-Back Success-Rate Bioluminescent Tendril Growth Engine.
 *
 * Each grafted tree undergoes a staggered, multi-wave particle flowering sequence
 * and incrementally grows bioluminescent dendritic tendrils whose count, reach,
 * branching, and blossom luminance scale with the local N-Back working-memory success rate.
 */
export function computeLocalNBackSuccessRate(
  nBackHits: number,
  nBackAttempts: number,
  defaultBaselineRate = 0.75
): number {
  const safeAttempts = Math.max(0, Math.floor(Number(nBackAttempts) || 0));
  const safeHits = Math.max(0, Math.min(safeAttempts, Math.floor(Number(nBackHits) || 0)));
  if (safeAttempts === 0) {
    return Math.max(0.25, Math.min(1, Math.round(defaultBaselineRate * 100) / 100));
  }
  const rawRate = safeHits / safeAttempts;
  return Math.max(0.25, Math.min(1, Math.round(rawRate * 100) / 100));
}

export interface TreeFloweringTendrilSpec {
  index: number;
  baseAngleRad: number;
  reachPx: number;
  curvatureRad: number;
  hasSecondaryFork: boolean;
  blossomScale: number; // 0.0 .. 1.25
  tipColorHex: string;
}

export interface TreeFloweringState {
  isFlowering: boolean;
  treeOrderIndex: number;
  staggerDelaySec: number;
  effectiveFlowerAgeSec: number;
  floweringProgress: number; // 0.0 .. 1.0 (smooth ease-out after staggerDelaySec)
  localNBackSuccessRate: number; // 0.25 .. 1.0
  localNBackSuccessPct: number; // 25 .. 100
  tendrilCount: number; // 6 .. 14 tendrils based on N-Back success rate & Sanctuary Bloom
  maxTendrilReachPx: number; // 36 .. 92 px
  tendrilLuminanceAlpha: number; // 0.32 .. 0.96
  blossomPetalCount: number; // 5 or 6
  staggeredParticleBurstTarget: number; // 1 .. 3 particle burst waves triggered so far
  particleCountPerWave: number; // 10 .. 24 particles per staggered flowering wave
  tendrils: TreeFloweringTendrilSpec[];
}

const FLOWERING_TIP_PALETTE = ['#4FD1C5', '#F2B84B', '#B794F4', '#68D391', '#F6E05E', '#76E4F7'];

export function computeTreeFloweringState(params: {
  isGrafted: boolean;
  treeOrderIndex: number;
  elapsedSinceGraftSec: number;
  nBackHits: number;
  nBackAttempts: number;
  localNBackSuccessRateOverride?: number | null;
  isSanctuaryBloomActive?: boolean;
  bloomIntensityPct?: number;
}): TreeFloweringState {
  const treeOrderIndex = Math.max(0, Math.floor(Number(params.treeOrderIndex) || 0));
  // Stagger each tree's flowering cascade by 0.26s per graft index so trees bloom in a rhythmic wave
  const staggerDelaySec = Math.round(treeOrderIndex * 0.26 * 100) / 100;

  const hasRateOverride =
    typeof params.localNBackSuccessRateOverride === 'number' &&
    Number.isFinite(params.localNBackSuccessRateOverride);
  const localNBackSuccessRate = hasRateOverride
    ? Math.max(0.25, Math.min(1, Math.round(params.localNBackSuccessRateOverride! * 100) / 100))
    : computeLocalNBackSuccessRate(params.nBackHits, params.nBackAttempts);
  const localNBackSuccessPct = Math.round(localNBackSuccessRate * 100);

  const userIntensityPct = clampSanctuaryBloomIntensityPct(
    params.bloomIntensityPct,
    DEFAULT_SANCTUARY_BLOOM_INTENSITY_PCT
  );
  const bloomScale = Math.max(0.35, userIntensityPct / 100);
  const bloomBonus = params.isSanctuaryBloomActive ? 1 : 0;

  if (!params.isGrafted) {
    return {
      isFlowering: false,
      treeOrderIndex,
      staggerDelaySec,
      effectiveFlowerAgeSec: 0,
      floweringProgress: 0,
      localNBackSuccessRate,
      localNBackSuccessPct,
      tendrilCount: 0,
      maxTendrilReachPx: 0,
      tendrilLuminanceAlpha: 0,
      blossomPetalCount: 5,
      staggeredParticleBurstTarget: 0,
      particleCountPerWave: 0,
      tendrils: [],
    };
  }

  const rawElapsed = Math.max(0, Number(params.elapsedSinceGraftSec) || 0);
  const effectiveFlowerAgeSec = Math.max(0, rawElapsed - staggerDelaySec);
  const rawLinearProgress = Math.min(1, effectiveFlowerAgeSec / 1.65);
  // Cubic ease-out for organic botanical unfurling
  const floweringProgress =
    Math.round((1 - Math.pow(1 - rawLinearProgress, 3)) * 1000) / 1000;

  // Tendril count scales directly with local N-Back success rate (4 base + up to 8 from N-Back accuracy + 2 when Sanctuary Bloom is active)
  const tendrilCount = Math.max(
    5,
    Math.min(
      14,
      Math.round(4 + localNBackSuccessRate * 8 + bloomBonus * 2)
    )
  );

  const baseReach = 34 + localNBackSuccessRate * 38 + bloomBonus * 14;
  const maxTendrilReachPx =
    Math.round(baseReach * (0.25 + 0.75 * floweringProgress) * (0.7 + 0.3 * bloomScale) * 10) / 10;

  const tendrilLuminanceAlpha =
    Math.round(
      Math.min(
        0.96,
        (0.32 + localNBackSuccessRate * 0.48 + bloomBonus * 0.14) *
          floweringProgress *
          bloomScale
      ) * 1000
    ) / 1000;

  // Staggered particle burst waves: Wave 1 on graft, Wave 2 after staggerDelaySec + 0.18s, Wave 3 at full blossom unfurl
  let staggeredParticleBurstTarget = 1;
  if (effectiveFlowerAgeSec >= 0.95) {
    staggeredParticleBurstTarget = 3;
  } else if (effectiveFlowerAgeSec >= 0.18) {
    staggeredParticleBurstTarget = 2;
  }

  const particleCountPerWave = Math.round(
    (10 + localNBackSuccessRate * 10 + bloomBonus * 4) * (0.6 + 0.4 * bloomScale)
  );

  const tendrils: TreeFloweringTendrilSpec[] = [];
  for (let i = 0; i < tendrilCount; i++) {
    // Stagger each individual tendril slightly around the crown
    const tendrilStagger = Math.max(0, Math.min(1, (floweringProgress * 1.25) - (i / tendrilCount) * 0.25));
    const baseAngleRad =
      (Math.PI * 2 * i) / tendrilCount + (treeOrderIndex % 2 === 0 ? 0.18 : -0.18);
    const lengthVariation = 0.84 + ((i * 7 + treeOrderIndex * 3) % 5) * 0.08;
    const reachPx = Math.round(maxTendrilReachPx * lengthVariation * tendrilStagger * 10) / 10;
    const curvatureRad = (i % 2 === 0 ? 1 : -1) * (0.28 + (i % 3) * 0.09);
    const hasSecondaryFork = localNBackSuccessRate >= 0.7 && i % 2 === 0;
    const blossomScale =
      Math.round(tendrilStagger * (0.75 + localNBackSuccessRate * 0.45) * 100) / 100;
    const tipColorHex =
      FLOWERING_TIP_PALETTE[(i + treeOrderIndex) % FLOWERING_TIP_PALETTE.length];

    tendrils.push({
      index: i,
      baseAngleRad,
      reachPx,
      curvatureRad,
      hasSecondaryFork,
      blossomScale,
      tipColorHex,
    });
  }

  return {
    isFlowering: floweringProgress > 0,
    treeOrderIndex,
    staggerDelaySec,
    effectiveFlowerAgeSec: Math.round(effectiveFlowerAgeSec * 100) / 100,
    floweringProgress,
    localNBackSuccessRate,
    localNBackSuccessPct,
    tendrilCount,
    maxTendrilReachPx,
    tendrilLuminanceAlpha,
    blossomPetalCount: localNBackSuccessRate >= 0.85 ? 6 : 5,
    staggeredParticleBurstTarget,
    particleCountPerWave,
    tendrils,
  };
}

/**
 * 6-Month 'Neuro-Projection Graph' Cognitive Reserve Forecasting Engine
 * Models the user's projected 6-month cognitive reserve trajectory (Now, M1..M6)
 * based on historical HRV practice sessions, hippocampal trees grafted, daily streak,
 * and daily habit adherence (Neuro-Nutrition/Sleep + NSDR + Cognitive Reframing).
 */
export interface NeuroProjectionMonthPoint {
  monthIndex: number; // 0 .. 6
  monthLabel: string; // 'Now', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'
  fullMonthTitle: string;
  projectedReserveIndex: number; // 40 .. 100 (user trajectory)
  optimalHabitReserveIndex: number; // 40 .. 100 (upper ceiling with 100% habit adherence)
  untrainedBaselineIndex: number; // 40 .. 100 (flat/slight decline without training)
  hippocampalBdnfGainPct: number; // 0.0 .. +2.8% (Erickson et al., PNAS benchmark)
  ufovSpeedProtectionPct: number; // 0 .. 29% (Ball et al., JAMA ACTIVE benchmark)
  clinicalMilestoneNote: string;
}

export interface SixMonthNeuroProjectionSummary {
  baselineReserveIndex: number;
  monthThreeProjectedReserveIndex: number;
  monthSixProjectedReserveIndex: number;
  monthSixOptimalReserveIndex: number;
  netSixMonthReserveGain: number;
  habitAdherencePct: number; // 0 .. 100
  practiceConsistencyScore: number; // 0 .. 100
  projectedHippocampalVolumeGainPct: number; // e.g. +2.1%
  projectedDementiaRiskReductionPct: number; // e.g. 26%
  trajectoryTierLabel:
    | 'Accelerated Synaptogenesis'
    | 'Steady Neuroplastic Growth'
    | 'Foundational Reserve Building';
  points: NeuroProjectionMonthPoint[];
}

const MONTH_MILESTONE_NOTES: readonly string[] = [
  'Baseline Cognitive Reserve calibrated from current 4-domain performance & vagal tone.',
  'Month 1 (+4 Wks): Early autonomic baroreflex stabilization & prefrontal N-Back encoding gains.',
  'Month 2 (+8 Wks): UFOV divided-attention visual speed expansion & dendritic spine budding.',
  'Month 3 (+12 Wks): Consolidating hippocampal BDNF synaptogenesis & glymphatic sleep clearance.',
  'Month 4 (+16 Wks): Sustained vagal-prefrontal coupling & resilient executive working memory.',
  'Month 5 (+20 Wks): Structural anterior hippocampal volume preservation (Erickson et al., PNAS).',
  'Month 6 (+24 Wks): Long-term cognitive reserve fortification & ACTIVE-benchmark processing speed.',
];

export function computeSixMonthNeuroProjection(params: {
  hrvHistory?: readonly HrvSessionRecord[] | null;
  totalTreesGrafted: number;
  peakRejuvenationScore: number;
  currentStreakDays: number;
  completedHabitIds?: readonly string[];
  nsdrCompleted?: boolean;
  cognitiveReframingCompleted?: boolean;
  simulateOptimalHabits?: boolean;
}): SixMonthNeuroProjectionSummary {
  const history =
    params.hrvHistory && params.hrvHistory.length > 0
      ? params.hrvHistory
      : DEFAULT_HRV_HISTORY_SEED;
  const hrvSummary = computeHrvTrendSummary(history);
  const safeTrees = Math.max(0, Math.floor(Number(params.totalTreesGrafted) || 0));
  const safePeakScore = Math.max(0, Math.floor(Number(params.peakRejuvenationScore) || 0));
  const safeStreak = Math.max(1, Math.floor(Number(params.currentStreakDays) || 1));

  const domainProfile = computeCognitiveDomainProfile({
    totalTreesGrafted: safeTrees,
    peakRejuvenationScore: safePeakScore,
    averageHrvCoherence: hrvSummary.averageCoherence,
    currentStreakDays: safeStreak,
  });

  const baselineReserveIndex = Math.max(42, Math.min(94, domainProfile.compositeReserveIndex));

  // Compute Habit Adherence (0..100%) from 4 Neuro-Nutrition/Sleep habits + 2 Daily Mind-Body exercises (NSDR & Reframing)
  const completedLifestyleCount = params.simulateOptimalHabits
    ? NEURO_NUTRITION_SLEEP_TIPS.length
    : Math.min(
        NEURO_NUTRITION_SLEEP_TIPS.length,
        Array.isArray(params.completedHabitIds) ? params.completedHabitIds.length : 0
      );
  const completedMindBodyCount = params.simulateOptimalHabits
    ? 2
    : (params.nsdrCompleted ? 1 : 0) + (params.cognitiveReframingCompleted ? 1 : 0);

  const totalHabitsCompleted = completedLifestyleCount + completedMindBodyCount; // 0 .. 6
  const totalHabitsPossible = NEURO_NUTRITION_SLEEP_TIPS.length + 2; // 6
  const rawHabitRatio = totalHabitsCompleted / totalHabitsPossible;
  const streakHabitBonus = Math.min(0.15, (safeStreak - 1) * 0.025);
  const habitAdherencePct = Math.max(
    15,
    Math.min(100, Math.round((rawHabitRatio * 0.85 + streakHabitBonus + 0.1) * 100))
  );

  // Compute Historical Practice Consistency Score (0..100%) from session count, HRV trend, and grafted trees
  const sessionDepthFactor = Math.min(1, history.length / 10);
  const coherenceFactor = Math.max(0.3, Math.min(1, hrvSummary.averageCoherence / 90));
  const treeMasteryFactor = Math.min(1, (safeTrees + 2) / 14);
  const streakFactor = Math.min(1, safeStreak / 7);
  const practiceConsistencyScore = Math.max(
    35,
    Math.min(
      100,
      Math.round(
        (sessionDepthFactor * 0.3 +
          coherenceFactor * 0.35 +
          treeMasteryFactor * 0.2 +
          streakFactor * 0.15) *
          100
      )
    )
  );

  // Total 6-month growth potential scales with practice consistency & habit adherence
  const remainingHeadroom = Math.max(6, 99 - baselineReserveIndex);
  const userGrowthRate =
    0.32 + (practiceConsistencyScore / 100) * 0.28 + (habitAdherencePct / 100) * 0.28;
  const optimalGrowthRate = 0.32 + Math.max(0.78, practiceConsistencyScore / 100) * 0.28 + 0.28;

  const targetTotalGain = Math.min(
    remainingHeadroom,
    Math.max(5, Math.round(remainingHeadroom * Math.min(0.92, userGrowthRate)))
  );
  const optimalTotalGain = Math.min(
    remainingHeadroom,
    Math.max(targetTotalGain, Math.round(remainingHeadroom * Math.min(0.96, optimalGrowthRate)))
  );

  const normDenom = 1 - Math.exp(-0.42 * 6);
  const points: NeuroProjectionMonthPoint[] = [];

  for (let m = 0; m <= 6; m++) {
    const curveFactor = m === 0 ? 0 : (1 - Math.exp(-0.42 * m)) / normDenom;
    const projectedReserveIndex = Math.min(
      99,
      Math.round(baselineReserveIndex + targetTotalGain * curveFactor)
    );
    const optimalHabitReserveIndex = Math.min(
      99,
      Math.round(baselineReserveIndex + optimalTotalGain * curveFactor)
    );
    const untrainedBaselineIndex = Math.max(
      40,
      Math.round(baselineReserveIndex - m * 0.5)
    );

    // Erickson et al. (PNAS, 2011): ~2.0% anterior hippocampal volume gain over longitudinal intervention
    const maxBdnfVolumeGain =
      1.1 + (practiceConsistencyScore / 100) * 0.8 + (habitAdherencePct / 100) * 0.7;
    const hippocampalBdnfGainPct =
      Math.round(maxBdnfVolumeGain * curveFactor * 100) / 100;

    // Ball et al. (JAMA, 2002 / 2017): up to 29% protective UFOV processing speed benefit
    const maxUfovProtection =
      14 + (practiceConsistencyScore / 100) * 8 + (habitAdherencePct / 100) * 7;
    const ufovSpeedProtectionPct = Math.min(
      29,
      Math.round(maxUfovProtection * curveFactor)
    );

    points.push({
      monthIndex: m,
      monthLabel: m === 0 ? 'Now' : `M${m}`,
      fullMonthTitle: m === 0 ? 'Baseline (Today)' : `Month ${m} (+${m * 4} Weeks)`,
      projectedReserveIndex,
      optimalHabitReserveIndex,
      untrainedBaselineIndex,
      hippocampalBdnfGainPct,
      ufovSpeedProtectionPct,
      clinicalMilestoneNote: MONTH_MILESTONE_NOTES[m] || MONTH_MILESTONE_NOTES[6],
    });
  }

  const monthThreePoint = points[3];
  const monthSixPoint = points[6];
  const netSixMonthReserveGain =
    monthSixPoint.projectedReserveIndex - baselineReserveIndex;

  const trajectoryTierLabel =
    habitAdherencePct >= 78 && practiceConsistencyScore >= 70
      ? 'Accelerated Synaptogenesis'
      : habitAdherencePct >= 50
      ? 'Steady Neuroplastic Growth'
      : 'Foundational Reserve Building';

  return {
    baselineReserveIndex,
    monthThreeProjectedReserveIndex: monthThreePoint.projectedReserveIndex,
    monthSixProjectedReserveIndex: monthSixPoint.projectedReserveIndex,
    monthSixOptimalReserveIndex: monthSixPoint.optimalHabitReserveIndex,
    netSixMonthReserveGain,
    habitAdherencePct,
    practiceConsistencyScore,
    projectedHippocampalVolumeGainPct: monthSixPoint.hippocampalBdnfGainPct,
    projectedDementiaRiskReductionPct: monthSixPoint.ufovSpeedProtectionPct,
    trajectoryTierLabel,
    points,
  };
}






