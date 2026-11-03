import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDeltaTime,
  isNBackMatch,
  generateNextChimeSymbol,
  computeResonanceBreathState,
  evaluateCognitiveSummary,
  computeDifficultyRamp,
  SANCTUARY_STAGES,
  CLINICAL_PROTOCOLS,
  MAC_CONTROL_HINT_LINE,
  getCalendarDayDiff,
  evaluateStreakOnLoad,
  recordDailyPracticeSession,
  DEFAULT_HRV_HISTORY_SEED,
  appendHrvSessionRecord,
  computeHrvTrendSummary,
  COGNITIVE_MILESTONE_BADGES,
  evaluateCognitiveMilestones,
  getSanctuaryAestheticConfig,
  computeAdaptiveFlowState,
  computeCognitiveDomainProfile,
  SANCTUARY_ATMOSPHERES,
  getSanctuaryAtmosphereConfig,
  getNextSanctuaryAtmosphereId,
  NEURO_NUTRITION_SLEEP_TIPS,
  filterNeuroNutritionTips,
  computeNeuroSynergyBonus,
  type ChimeSymbol,
} from './rules';

test('Neuro-Nutrition & Sleep Hygiene tips filter accurately by category and compute biological readiness synergy bonuses', () => {
  assert.equal(NEURO_NUTRITION_SLEEP_TIPS.length, 4);
  assert.equal(filterNeuroNutritionTips('all').length, 4);
  assert.equal(filterNeuroNutritionTips('diet').length, 2);
  assert.equal(filterNeuroNutritionTips('sleep').length, 2);

  const zeroBonus = computeNeuroSynergyBonus([]);
  assert.equal(zeroBonus.completedCount, 0);
  assert.equal(zeroBonus.bonusNectarMultiplier, 1.0);
  assert.equal(zeroBonus.startingNectarBonus, 0);

  const twoBonus = computeNeuroSynergyBonus(['polyphenol_bdnf_diet', 'glymphatic_slow_wave_sleep']);
  assert.equal(twoBonus.completedCount, 2);
  assert.equal(twoBonus.readinessPct, 50);
  assert.equal(twoBonus.bonusNectarMultiplier, 1.1);
  assert.equal(twoBonus.startingNectarBonus, 8);

  const fullBonus = computeNeuroSynergyBonus(NEURO_NUTRITION_SLEEP_TIPS.map((t) => t.id));
  assert.equal(fullBonus.completedCount, 4);
  assert.equal(fullBonus.readinessPct, 100);
  assert.equal(fullBonus.bonusNectarMultiplier, 1.2);
  assert.equal(fullBonus.startingNectarBonus, 16);
});

test('Sanctuary Atmosphere selector provides distinct acoustic profiles for forest, rain, and meadow soundscapes', () => {
  assert.equal(SANCTUARY_ATMOSPHERES.length, 3);
  const ids = SANCTUARY_ATMOSPHERES.map((a) => a.id);
  assert.deepEqual(ids, ['forest', 'rain', 'meadow']);

  const forest = getSanctuaryAtmosphereConfig('forest');
  const rain = getSanctuaryAtmosphereConfig('rain');
  const meadow = getSanctuaryAtmosphereConfig('meadow');

  assert.notEqual(forest.droneRootHz, rain.droneRootHz);
  assert.notEqual(rain.droneRootHz, meadow.droneRootHz);
  assert.notEqual(forest.noiseCenterHz, rain.noiseCenterHz);
  assert.equal(rain.noiseFilterType, 'lowpass');
  assert.equal(forest.noiseFilterType, 'bandpass');

  assert.equal(getNextSanctuaryAtmosphereId('forest'), 'rain');
  assert.equal(getNextSanctuaryAtmosphereId('rain'), 'meadow');
  assert.equal(getNextSanctuaryAtmosphereId('meadow'), 'forest');
});

test('Enterprise DTx adaptive psychometric staircase and 4-domain cognitive profile compute accurate multipliers and domain scores', () => {
  const baselineFlow = computeAdaptiveFlowState({
    consecutiveCognitiveHits: 0,
    coherenceSeconds: 0,
    baseUfovFlashSec: 2.2,
  });
  assert.equal(baselineFlow.flowMultiplier, 1.0);
  assert.equal(baselineFlow.adaptiveUfovWindowMs, 2200);
  assert.equal(baselineFlow.flowTier, 'Baseline Calibration');

  const peakFlow = computeAdaptiveFlowState({
    consecutiveCognitiveHits: 5,
    coherenceSeconds: 12,
    baseUfovFlashSec: 2.2,
  });
  assert.equal(peakFlow.flowMultiplier, 2.5);
  assert.equal(peakFlow.adaptiveUfovWindowMs, 1500);
  assert.equal(peakFlow.flowTier, 'Peak Neuroplastic Flow');

  const domainProfile = computeCognitiveDomainProfile({
    totalTreesGrafted: 8,
    peakRejuvenationScore: 1850,
    averageHrvCoherence: 84,
    currentStreakDays: 3,
  });
  assert.equal(domainProfile.domains.length, 4);
  assert.ok(domainProfile.compositeReserveIndex >= 75 && domainProfile.compositeReserveIndex <= 95);
  assert.ok(domainProfile.estimatedPlasticityGainPct >= 15);
});

test('Cognitive Milestone badge system unlocks aesthetic flora colors and higher firefly density as trees grafted and peak score grow', () => {
  assert.equal(COGNITIVE_MILESTONE_BADGES.length, 4);

  const baseEval = evaluateCognitiveMilestones({
    totalTreesGrafted: 0,
    peakRejuvenationScore: 200,
  });
  assert.equal(baseEval.unlockedBadges.length, 1);
  assert.equal(baseEval.highestUnlockedBadge.id, 'sapling_awakening');
  assert.equal(baseEval.highestUnlockedBadge.upgrade.fireflyCount, 18);

  const tier2Eval = evaluateCognitiveMilestones({
    totalTreesGrafted: 4,
    peakRejuvenationScore: 1420,
  });
  assert.equal(tier2Eval.highestUnlockedBadge.id, 'cyan_lotus_bloom');
  assert.equal(tier2Eval.highestUnlockedBadge.upgrade.fireflyCount, 36);

  const tier4Eval = evaluateCognitiveMilestones({
    totalTreesGrafted: 20,
    peakRejuvenationScore: 2800,
  });
  assert.equal(tier4Eval.unlockedBadges.length, 4);
  assert.equal(tier4Eval.highestUnlockedBadge.id, 'solar_crown_resonance');
  assert.equal(getSanctuaryAestheticConfig('solar_crown_resonance').fireflyCount, 80);
});

test('HRV coherence session history maintains rolling 10 sessions and computes physiological relaxation trend', () => {
  assert.equal(DEFAULT_HRV_HISTORY_SEED.length, 10);
  const initialSummary = computeHrvTrendSummary(DEFAULT_HRV_HISTORY_SEED);
  assert.equal(initialSummary.latestCoherence, 92);
  assert.equal(initialSummary.peakCoherence, 92);
  assert.equal(initialSummary.trendDelta, 30); // 92 - 62
  assert.equal(initialSummary.relaxationStatus, 'Optimal Vagal Resonance');

  const updated = appendHrvSessionRecord(DEFAULT_HRV_HISTORY_SEED, {
    coherenceScore: 96,
    coherenceSeconds: 18.4,
    recordedAtIso: '2026-11-03',
    stageName: 'Stage III · The Luminous Crown Sanctuary',
  });

  assert.equal(updated.length, 10);
  assert.equal(updated[0].sessionLabel, 'S1');
  assert.equal(updated[0].coherenceScore, 66); // Previous S2 shifted to S1
  assert.equal(updated[9].sessionLabel, 'S10');
  assert.equal(updated[9].coherenceScore, 96);
});

test('daily streak tracking increments on consecutive days, stays idempotent on same day, and resets after missed day', () => {
  assert.equal(getCalendarDayDiff('2026-11-01', '2026-11-02'), 1);
  assert.equal(getCalendarDayDiff('2026-10-31', '2026-11-02'), 2);

  // Day 1 practice
  const day1 = recordDailyPracticeSession(null, '2026-10-31');
  assert.equal(day1.currentStreak, 1);
  assert.equal(day1.longestStreak, 1);
  assert.equal(day1.totalDaysPracticed, 1);
  assert.equal(day1.lastPracticedDate, '2026-10-31');

  // Same-day practice is idempotent
  const day1Repeat = recordDailyPracticeSession(day1, '2026-10-31');
  assert.equal(day1Repeat.currentStreak, 1);
  assert.equal(day1Repeat.totalDaysPracticed, 1);

  // Consecutive next day (Day 2)
  const day2 = recordDailyPracticeSession(day1Repeat, '2026-11-01');
  assert.equal(day2.currentStreak, 2);
  assert.equal(day2.longestStreak, 2);
  assert.equal(day2.totalDaysPracticed, 2);

  // Consecutive next day (Day 3)
  const day3 = recordDailyPracticeSession(day2, '2026-11-02');
  assert.equal(day3.currentStreak, 3);
  assert.equal(day3.longestStreak, 3);
  assert.equal(day3.totalDaysPracticed, 3);

  // Evaluate on load the next day (still valid streak of 3 before practicing on Nov 3)
  const loadedNextDay = evaluateStreakOnLoad(day3, '2026-11-03');
  assert.equal(loadedNextDay.currentStreak, 3);

  // Evaluate on load after skipping Nov 3 (checked on Nov 4 -> currentStreak resets to 0, longestStreak stays 3)
  const loadedAfterSkip = evaluateStreakOnLoad(day3, '2026-11-04');
  assert.equal(loadedAfterSkip.currentStreak, 0);
  assert.equal(loadedAfterSkip.longestStreak, 3);

  // Practicing on Nov 4 starts a new 1-day streak while preserving longestStreak = 3 and totalDaysPracticed = 4
  const resumed = recordDailyPracticeSession(loadedAfterSkip, '2026-11-04');
  assert.equal(resumed.currentStreak, 1);
  assert.equal(resumed.longestStreak, 3);
  assert.equal(resumed.totalDaysPracticed, 4);
});

test('MAC_CONTROL_HINT_LINE includes Mac Return, Option, Esc, and Two-Finger Glide controls', () => {
  assert.ok(MAC_CONTROL_HINT_LINE.includes('⏎ Return'));
  assert.ok(MAC_CONTROL_HINT_LINE.includes('⌥ Option'));
  assert.ok(MAC_CONTROL_HINT_LINE.includes('Two-Finger Glide'));
  assert.ok(CLINICAL_PROTOCOLS.dendrite_graft.roleClue.includes('⏎ Return'));
});

test('clampDeltaTime caps large delta times at 0.05s and handles negative/NaN', () => {
  assert.equal(clampDeltaTime(0.016), 0.016);
  assert.equal(clampDeltaTime(0.25), 0.05);
  assert.equal(clampDeltaTime(-1), 0);
  assert.equal(clampDeltaTime(Number.NaN), 0);
});

test('isNBackMatch accurately detects 1-Back and 2-Back working memory matches', () => {
  const seq1: ChimeSymbol[] = ['SUN', 'LEAF', 'LEAF'];
  assert.equal(isNBackMatch(seq1, 1), true);
  assert.equal(isNBackMatch(seq1, 2), false);

  const seq2: ChimeSymbol[] = ['STAR', 'DROP', 'STAR'];
  assert.equal(isNBackMatch(seq2, 2), true);
  assert.equal(isNBackMatch(seq2, 1), false);
});

test('generateNextChimeSymbol forces N-Back match when randomVal < 0.42', () => {
  const seq: ChimeSymbol[] = ['DROP', 'SUN'];
  const next = generateNextChimeSymbol(seq, 2, 0.2);
  assert.equal(next, 'DROP');
});

test('computeResonanceBreathState follows 10-second 0.1 Hz clinical HRV cycle', () => {
  const start = computeResonanceBreathState(0);
  assert.equal(start.phaseLabel, 'INHALE');
  assert.ok(Math.abs(start.expansion - 0) < 1e-6);

  const peak = computeResonanceBreathState(5.0);
  assert.equal(peak.phaseLabel, 'EXHALE');
  assert.ok(Math.abs(peak.expansion - 1) < 1e-6);

  const end = computeResonanceBreathState(10.0);
  assert.equal(end.phaseLabel, 'INHALE');
  assert.ok(Math.abs(end.expansion - 0) < 1e-6);
});

test('evaluateCognitiveSummary calculates rejuvenation score and victory state', () => {
  const summary = evaluateCognitiveSummary({
    treesGrafted: 4,
    targetTrees: 4,
    ufovHits: 5,
    ufovAttempts: 5,
    nBackHits: 3,
    nBackAttempts: 4,
    coherenceSeconds: 15,
    calmVitality: 5,
    maxVitality: 5,
  });

  assert.equal(summary.isStageCleared, true);
  assert.equal(summary.spatialPlasticityPct, 100);
  assert.equal(summary.processingSpeedPct, 100);
  assert.equal(summary.workingMemoryPct, 75);
  assert.equal(summary.vagalCoherencePct, 100);
  assert.ok(summary.rejuvenationScore > 2000);
});

test('computeDifficultyRamp keeps opening 12 seconds approachable then scales smoothly', () => {
  const stage = SANCTUARY_STAGES[0];
  const opening = computeDifficultyRamp(stage, 4, 0);
  const later = computeDifficultyRamp(stage, 80, 3);

  assert.ok(opening.activeMaxHazards <= later.activeMaxHazards);
  assert.ok(opening.spawnIntervalSec > later.spawnIntervalSec);
  assert.ok(opening.hazardSpeedMultiplier < later.hazardSpeedMultiplier);
});

test('CLINICAL_PROTOCOLS contains all 4 peer-reviewed medical citations', () => {
  assert.equal(Object.keys(CLINICAL_PROTOCOLS).length, 4);
  assert.ok(CLINICAL_PROTOCOLS.ufov_forage.studyTitle.includes('ACTIVE'));
  assert.ok(CLINICAL_PROTOCOLS.nback_chimes.studyTitle.includes('Working Memory'));
  assert.ok(CLINICAL_PROTOCOLS.coherence_breath.studyTitle.includes('Heart Rate Variability'));
  assert.ok(CLINICAL_PROTOCOLS.dendrite_graft.studyTitle.includes('Hippocampal'));
});
