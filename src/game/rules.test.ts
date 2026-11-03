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
  DEFAULT_NEURAL_LOGS_SEED,
  appendNeuralLogEntry,
  computeZenModeHudState,
  DAILY_HABIT_EXERCISES,
  getDailyHabitClinicalTooltip,
  syncDailyHabitTrackerWithStreak,
  toggleDailyHabitExercise,
  createCognitivePulseConfig,
  stepCognitivePulseWave,
  clampSanctuaryBloomIntensityPct,
  computeSanctuaryBloomEffect,
  computeHudFlowPulseState,
  buildEnterpriseClinicalExportBundle,
  computeRunningFiveSessionHrvAverage,
  createInitialChimeHistoryForNBack,
  computeAdaptiveDifficultyScaling,
  computeLocalNBackSuccessRate,
  computeTreeFloweringState,
  computeSixMonthNeuroProjection,
  DEFAULT_WEEKLY_COGNITIVE_GOALS,
  sanitizeWeeklyCognitiveGoalsConfig,
  computeWeeklyCognitiveGoalsProgress,
  CLINICAL_CODEX_ENTER_DURATION_MS,
  CLINICAL_CODEX_EXIT_DURATION_MS,
  CLINICAL_CODEX_EASING_CURVE,
  computeCodexModalAnimationState,
  SANCTUARY_BLOOM_PRESETS,
  SANCTUARY_BLOOM_PRESET_LIST,
  getSanctuaryBloomPresetConfig,
  type ChimeSymbol,
} from './rules';

test('SANCTUARY_BLOOM_PRESETS defines Morning Glow, Midnight Forest, and Neural Zenith with distinct intensity defaults and bioluminescent palettes', () => {
  assert.equal(SANCTUARY_BLOOM_PRESET_LIST.length, 3);

  const morning = getSanctuaryBloomPresetConfig('morning_glow');
  assert.equal(morning.id, 'morning_glow');
  assert.equal(morning.label, 'Morning Glow');
  assert.equal(morning.defaultIntensityPct, 78);
  assert.equal(morning.primaryHex, '#F6E05E');

  const midnight = getSanctuaryBloomPresetConfig('midnight_forest');
  assert.equal(midnight.id, 'midnight_forest');
  assert.equal(midnight.label, 'Midnight Forest');
  assert.equal(midnight.defaultIntensityPct, 64);
  assert.equal(midnight.primaryHex, '#9F7AEA');

  const zenith = getSanctuaryBloomPresetConfig('neural_zenith');
  assert.equal(zenith.id, 'neural_zenith');
  assert.equal(zenith.label, 'Neural Zenith');
  assert.equal(zenith.defaultIntensityPct, 94);
  assert.equal(zenith.primaryHex, '#4FD1C5');

  // Fallback for unknown preset ID defaults to Neural Zenith
  const fallback = getSanctuaryBloomPresetConfig('invalid_preset');
  assert.equal(fallback.id, 'neural_zenith');

  // computeSanctuaryBloomEffect applies preset default intensity and color palette when triggered
  const morningEffect = computeSanctuaryBloomEffect({
    completedStagesCount: 4,
    presetId: 'morning_glow',
    elapsedSec: 2.0,
  });
  assert.equal(morningEffect.isTriggered, true);
  assert.equal(morningEffect.presetId, 'morning_glow');
  assert.equal(morningEffect.presetLabel, 'Morning Glow');
  assert.equal(morningEffect.userIntensityPct, 78);
  assert.equal(morningEffect.colorPalette.primaryHex, '#F6E05E');
  assert.ok(morningEffect.colorPalette.radialStop0Rgba.startsWith('rgba(246, 224, 94,'));

  const midnightEffect = computeSanctuaryBloomEffect({
    completedStagesCount: 4,
    presetId: 'midnight_forest',
    elapsedSec: 2.0,
  });
  assert.equal(midnightEffect.presetId, 'midnight_forest');
  assert.equal(midnightEffect.userIntensityPct, 64);
  assert.equal(midnightEffect.colorPalette.primaryHex, '#9F7AEA');
  assert.ok(midnightEffect.colorPalette.radialStop0Rgba.startsWith('rgba(159, 122, 234,'));

  const zenithEffect = computeSanctuaryBloomEffect({
    completedStagesCount: 4,
    presetId: 'neural_zenith',
    elapsedSec: 2.0,
  });
  assert.equal(zenithEffect.presetId, 'neural_zenith');
  assert.equal(zenithEffect.userIntensityPct, 94);
  assert.equal(zenithEffect.colorPalette.primaryHex, '#4FD1C5');
  assert.ok(zenithEffect.colorPalette.radialStop0Rgba.startsWith('rgba(79, 209, 197,'));
});

test('computeCodexModalAnimationState manages smooth fade-in and upward slide-up transitions within <=200ms budget and respects prefers-reduced-motion', () => {
  const closed = computeCodexModalAnimationState('closed');
  assert.equal(closed.shouldRender, false);
  assert.equal(closed.isInteractive, false);
  assert.equal(closed.backdropOpacity, 0);

  const entering = computeCodexModalAnimationState('entering');
  assert.equal(entering.shouldRender, true);
  assert.equal(entering.isInteractive, true);
  assert.equal(entering.panelTranslateYpx, 14);
  assert.equal(entering.panelScale, 0.985);
  assert.equal(entering.durationMs, CLINICAL_CODEX_ENTER_DURATION_MS);
  assert.ok(entering.durationMs <= 200);
  assert.equal(entering.easingCurve, CLINICAL_CODEX_EASING_CURVE);

  const entered = computeCodexModalAnimationState('entered');
  assert.equal(entered.shouldRender, true);
  assert.equal(entered.isInteractive, true);
  assert.equal(entered.panelTranslateYpx, 0);
  assert.equal(entered.panelScale, 1);
  assert.equal(entered.backdropOpacity, 1);

  const exiting = computeCodexModalAnimationState('exiting');
  assert.equal(exiting.shouldRender, true);
  assert.equal(exiting.isInteractive, false);
  assert.equal(exiting.backdropOpacity, 0);
  assert.equal(exiting.panelOpacity, 0);
  assert.equal(exiting.durationMs, CLINICAL_CODEX_EXIT_DURATION_MS);

  const reduced = computeCodexModalAnimationState('entering', true);
  assert.equal(reduced.panelTranslateYpx, 0);
  assert.equal(reduced.panelScale, 1);
  assert.equal(reduced.durationMs, 0);
});

test('computeWeeklyCognitiveGoalsProgress evaluates personal weekly N-Back accuracy and UFOV speed goals and progress bars', () => {
  const sanitized = sanitizeWeeklyCognitiveGoalsConfig({
    targetNBackAccuracyPct: 120,
    targetUfovSpeedMs: 180,
    weeklyPracticeBoostSessions: -3,
  });
  assert.equal(sanitized.targetNBackAccuracyPct, 98);
  assert.equal(sanitized.targetUfovSpeedMs, 260);
  assert.equal(sanitized.weeklyPracticeBoostSessions, 0);

  // Baseline evaluation with default goals (85% N-Back, 420ms UFOV)
  const baseline = computeWeeklyCognitiveGoalsProgress({
    goalsConfig: DEFAULT_WEEKLY_COGNITIVE_GOALS,
    totalTreesGrafted: 4,
    peakRejuvenationScore: 1420,
    averageHrvCoherence: 79,
    currentStreakDays: 1,
  });
  assert.equal(baseline.nBackGoal.targetAccuracyPct, 85);
  assert.equal(baseline.ufovGoal.targetSpeedMs, 420);
  assert.ok(baseline.nBackGoal.progressPct > 0 && baseline.nBackGoal.progressPct <= 100);
  assert.ok(baseline.ufovGoal.progressPct > 0 && baseline.ufovGoal.progressPct <= 100);

  // Lowering N-Back target to 75% and raising UFOV target window to 480ms marks both goals achieved (100% progress)
  const achieved = computeWeeklyCognitiveGoalsProgress({
    goalsConfig: {
      targetNBackAccuracyPct: 75,
      targetUfovSpeedMs: 480,
      weeklyPracticeBoostSessions: 0,
    },
    totalTreesGrafted: 4,
    peakRejuvenationScore: 1420,
    averageHrvCoherence: 79,
    currentStreakDays: 1,
  });
  assert.equal(achieved.nBackGoal.isGoalMet, true);
  assert.equal(achieved.nBackGoal.progressPct, 100);
  assert.equal(achieved.ufovGoal.isGoalMet, true);
  assert.equal(achieved.ufovGoal.progressPct, 100);
  assert.equal(achieved.goalsMetCount, 2);
  assert.equal(achieved.overallCompletionPct, 100);

  // Logging weekly practice boost drills improves both N-Back accuracy and UFOV speed toward stricter targets
  const boosted = computeWeeklyCognitiveGoalsProgress({
    goalsConfig: {
      targetNBackAccuracyPct: 85,
      targetUfovSpeedMs: 420,
      weeklyPracticeBoostSessions: 3,
    },
    totalTreesGrafted: 4,
    peakRejuvenationScore: 1420,
    averageHrvCoherence: 79,
    currentStreakDays: 1,
  });
  assert.ok(boosted.nBackGoal.currentAccuracyPct > baseline.nBackGoal.currentAccuracyPct);
  assert.ok(boosted.ufovGoal.currentSpeedMs < baseline.ufovGoal.currentSpeedMs);
  assert.equal(boosted.goalsMetCount, 2);
});

test('computeSixMonthNeuroProjection generates a 7-point (Now..M6) cognitive reserve growth trajectory scaled by historical practice sessions and habit adherence', () => {
  const lowAdherence = computeSixMonthNeuroProjection({
    hrvHistory: DEFAULT_HRV_HISTORY_SEED,
    totalTreesGrafted: 2,
    peakRejuvenationScore: 1100,
    currentStreakDays: 1,
    completedHabitIds: [],
    nsdrCompleted: false,
    cognitiveReframingCompleted: false,
  });

  const highAdherence = computeSixMonthNeuroProjection({
    hrvHistory: DEFAULT_HRV_HISTORY_SEED,
    totalTreesGrafted: 2,
    peakRejuvenationScore: 1100,
    currentStreakDays: 5,
    completedHabitIds: [
      'polyphenol_bdnf_diet',
      'omega3_phospholipid_membrane',
      'glymphatic_slow_wave_sleep',
      'circadian_cortisol_anchor',
    ],
    nsdrCompleted: true,
    cognitiveReframingCompleted: true,
  });

  assert.equal(lowAdherence.points.length, 7);
  assert.deepEqual(
    lowAdherence.points.map((p) => p.monthLabel),
    ['Now', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6']
  );
  // Monotonic growth from Now to M6
  for (let i = 1; i < lowAdherence.points.length; i++) {
    assert.ok(
      lowAdherence.points[i].projectedReserveIndex >=
        lowAdherence.points[i - 1].projectedReserveIndex
    );
  }
  // Higher habit adherence & streak produces higher 6-month cognitive reserve gain & hippocampal BDNF volume gain
  assert.ok(highAdherence.habitAdherencePct > lowAdherence.habitAdherencePct);
  assert.ok(highAdherence.netSixMonthReserveGain > lowAdherence.netSixMonthReserveGain);
  assert.ok(
    highAdherence.monthSixProjectedReserveIndex >
      lowAdherence.monthSixProjectedReserveIndex
  );
  assert.ok(
    highAdherence.projectedHippocampalVolumeGainPct >
      lowAdherence.projectedHippocampalVolumeGainPct
  );
  assert.equal(highAdherence.trajectoryTierLabel, 'Accelerated Synaptogenesis');
});

test('computeTreeFloweringState produces staggered particle-based flowering waves and incrementally grows bioluminescent tendrils based on local N-Back success rate', () => {
  // Baseline when 0 attempts: 0.75 (75%)
  assert.equal(computeLocalNBackSuccessRate(0, 0), 0.75);
  // Clamped floor at 0.25 (25%) when accuracy is very low
  assert.equal(computeLocalNBackSuccessRate(0, 5), 0.25);
  // Exact accuracy when 3/4 (75%) or 4/4 (100%)
  assert.equal(computeLocalNBackSuccessRate(3, 4), 0.75);
  assert.equal(computeLocalNBackSuccessRate(4, 4), 1.0);

  // Dormant tree does not flower or grow tendrils
  const dormant = computeTreeFloweringState({
    isGrafted: false,
    treeOrderIndex: 0,
    elapsedSinceGraftSec: 2.0,
    nBackHits: 3,
    nBackAttempts: 3,
  });
  assert.equal(dormant.isFlowering, false);
  assert.equal(dormant.tendrilCount, 0);
  assert.equal(dormant.tendrils.length, 0);

  // Staggered timing: Tree index 2 has staggerDelaySec = 0.52s
  const staggeredEarly = computeTreeFloweringState({
    isGrafted: true,
    treeOrderIndex: 2,
    elapsedSinceGraftSec: 0.35, // before 0.52s stagger delay completes
    nBackHits: 2,
    nBackAttempts: 2,
  });
  assert.equal(staggeredEarly.staggerDelaySec, 0.52);
  assert.equal(staggeredEarly.floweringProgress, 0);
  assert.equal(staggeredEarly.staggeredParticleBurstTarget, 1);

  // Incremental tendril growth based on local N-Back success rate:
  // Low N-Back success rate (1/4 = 25%) -> 6 tendrils
  const lowNBackTree = computeTreeFloweringState({
    isGrafted: true,
    treeOrderIndex: 0,
    elapsedSinceGraftSec: 2.2,
    nBackHits: 1,
    nBackAttempts: 4,
    isSanctuaryBloomActive: false,
    bloomIntensityPct: 100,
  });
  // High N-Back success rate (4/4 = 100%) -> 12 tendrils (or 14 with Sanctuary Bloom active)
  const highNBackTree = computeTreeFloweringState({
    isGrafted: true,
    treeOrderIndex: 0,
    elapsedSinceGraftSec: 2.2,
    nBackHits: 4,
    nBackAttempts: 4,
    isSanctuaryBloomActive: false,
    bloomIntensityPct: 100,
  });
  const bloomBoostedTree = computeTreeFloweringState({
    isGrafted: true,
    treeOrderIndex: 0,
    elapsedSinceGraftSec: 2.2,
    nBackHits: 4,
    nBackAttempts: 4,
    isSanctuaryBloomActive: true,
    bloomIntensityPct: 100,
  });

  assert.equal(lowNBackTree.localNBackSuccessPct, 25);
  assert.equal(lowNBackTree.tendrilCount, 6);
  assert.equal(highNBackTree.localNBackSuccessPct, 100);
  assert.equal(highNBackTree.tendrilCount, 12);
  assert.equal(bloomBoostedTree.tendrilCount, 14);
  assert.ok(highNBackTree.maxTendrilReachPx > lowNBackTree.maxTendrilReachPx);
  assert.ok(bloomBoostedTree.maxTendrilReachPx > highNBackTree.maxTendrilReachPx);
  assert.ok(highNBackTree.tendrilLuminanceAlpha > lowNBackTree.tendrilLuminanceAlpha);
  assert.equal(highNBackTree.staggeredParticleBurstTarget, 3);
  assert.ok(highNBackTree.tendrils.some((t) => t.hasSecondaryFork));
});

test('computeAdaptiveDifficultyScaling dynamically adjusts N-Back difficulty and UFOV window timing from the running 5-session HRV coherence average', () => {
  // Default 10-session seed last 5 scores: [73, 79, 84, 88, 92] -> avg = 83%
  const fiveAvg = computeRunningFiveSessionHrvAverage(DEFAULT_HRV_HISTORY_SEED);
  assert.equal(fiveAvg.sampleCount, 5);
  assert.deepEqual(fiveAvg.recentFiveScores, [73, 79, 84, 88, 92]);
  assert.equal(fiveAvg.runningFiveSessionAvg, 83);

  // Tier 1 (< 72%): Restorative Flow Support -> eases 2-Back to 1-Back and widens UFOV by +350ms
  const restorative = computeAdaptiveDifficultyScaling({
    runningFiveSessionHrvAvgOverride: 66,
    baseNBackLevel: 2,
    baseUfovFlashSec: 1.35,
    consecutiveCognitiveHits: 0,
  });
  assert.equal(restorative.tierId, 'restorative_support');
  assert.equal(restorative.effectiveNBackLevel, 1);
  assert.equal(restorative.nBackDelta, -1);
  assert.equal(restorative.hrvUfovAdjustmentMs, 350);
  assert.equal(restorative.effectiveUfovWindowMs, 1700);

  // Tier 2 (72% - 83%): Balanced Vagal Flow -> preserves stage baseline
  const balanced = computeAdaptiveDifficultyScaling({
    runningFiveSessionHrvAvgOverride: 78,
    baseNBackLevel: 1,
    baseUfovFlashSec: 1.8,
    consecutiveCognitiveHits: 0,
  });
  assert.equal(balanced.tierId, 'balanced_resonance');
  assert.equal(balanced.effectiveNBackLevel, 1);
  assert.equal(balanced.hrvUfovAdjustmentMs, 0);
  assert.equal(balanced.effectiveUfovWindowMs, 1800);

  // Tier 3 (82% - 91%): Elevated Prefrontal Flow -> promotes 1-Back to 2-Back and tightens UFOV by -220ms
  const elevated = computeAdaptiveDifficultyScaling({
    hrvHistory: DEFAULT_HRV_HISTORY_SEED, // 83% 5-session avg
    baseNBackLevel: 1,
    baseUfovFlashSec: 1.8,
    consecutiveCognitiveHits: 0,
  });
  assert.equal(elevated.tierId, 'elevated_flow');
  assert.equal(elevated.runningFiveSessionHrvAvg, 83);
  assert.equal(elevated.effectiveNBackLevel, 2);
  assert.equal(elevated.nBackDelta, 1);
  assert.equal(elevated.hrvUfovAdjustmentMs, -220);
  assert.equal(elevated.effectiveUfovWindowMs, 1580);

  // Tier 4 (>= 92%): Peak Autonomic Mastery -> unlocks 3-Back and tightens UFOV by -380ms
  const peak = computeAdaptiveDifficultyScaling({
    runningFiveSessionHrvAvgOverride: 95,
    baseNBackLevel: 2,
    baseUfovFlashSec: 1.35,
    consecutiveCognitiveHits: 1,
  });
  assert.equal(peak.tierId, 'peak_mastery');
  assert.equal(peak.effectiveNBackLevel, 3);
  assert.equal(peak.hrvUfovAdjustmentMs, -380);
  assert.equal(peak.effectiveUfovWindowMs, 1350 - 380 - 120);

  // Verify initial chime histories always start with a valid N-Back match
  assert.equal(isNBackMatch(createInitialChimeHistoryForNBack(1), 1), true);
  assert.equal(isNBackMatch(createInitialChimeHistoryForNBack(2), 2), true);
  assert.equal(isNBackMatch(createInitialChimeHistoryForNBack(3), 3), true);
});

test('computeHudFlowPulseState triggers expanding glow pulse when Flow Multiplier increases and maintains rhythmic concentration cadence', () => {
  const baseline = computeHudFlowPulseState({
    currentMultiplier: 1.0,
    previousMultiplier: 1.0,
  });
  assert.equal(baseline.isMultiplierIncreased, false);
  assert.equal(baseline.isPulsing, false);
  assert.equal(baseline.scaleFactor, 1.0);
  assert.equal(baseline.ringOpacity, 0);

  const surge = computeHudFlowPulseState({
    currentMultiplier: 1.5,
    previousMultiplier: 1.25,
    timeSinceIncreaseMs: 650,
    pulseDurationMs: 1400,
  });
  assert.equal(surge.isMultiplierIncreased, true);
  assert.equal(surge.isPulsing, true);
  assert.equal(surge.multiplierDelta, 0.25);
  assert.ok(surge.scaleFactor > 1.05);
  assert.ok(surge.glowOpacity > 0.7);
  assert.ok(surge.ringExpandScale > 1.2);
  assert.ok(surge.ringOpacity > 0.3);
  assert.equal(surge.accentHex, '#4FD1C5');
  assert.ok(surge.statusLabel.includes('FLOW PULSE +0.25x'));

  const sustained = computeHudFlowPulseState({
    currentMultiplier: 2.0,
    previousMultiplier: 2.0,
    timeSinceIncreaseMs: 2000,
    pulseDurationMs: 1400,
  });
  assert.equal(sustained.isPulsing, false);
  assert.ok(sustained.glowOpacity > 0.2);
  assert.ok(sustained.rhythmicCadenceSec < 2.0);
  assert.equal(sustained.accentHex, '#B794F4');
});

test('buildEnterpriseClinicalExportBundle compiles longitudinal DTx telemetry report', () => {
  const bundle = buildEnterpriseClinicalExportBundle({
    exportedAtIso: '2026-11-03',
    totalTreesGrafted: 12,
    peakRejuvenationScore: 1850,
    currentStreakDays: 4,
    hrvHistory: DEFAULT_HRV_HISTORY_SEED,
    dailyHabitTracker: {
      dateIso: '2026-11-03',
      nsdrCompleted: true,
      cognitiveReframingCompleted: true,
      syncedStreakDays: 4,
      lastUpdatedIso: '2026-11-03',
    },
    neuralLogs: DEFAULT_NEURAL_LOGS_SEED,
  });
  assert.equal(bundle.schemaVersion, '2026.4-Enterprise-DTx');
  assert.ok(bundle.compositeReserveIndex >= 70);
  assert.equal(bundle.nsdrCompletedToday, true);
  assert.equal(bundle.cognitiveReframingCompletedToday, true);
  assert.ok(bundle.summaryReportText.includes('SYLVAN SYNAPSE DTx · CLINICAL TELEMETRY REPORT'));
});

test('computeSanctuaryBloomEffect triggers full-canvas bioluminescence saturation and slow camera rotation when all 4 stages are completed and scales with user intensityPct', () => {
  assert.equal(SANCTUARY_STAGES.length, 4);
  assert.equal(clampSanctuaryBloomIntensityPct(65), 65);
  assert.equal(clampSanctuaryBloomIntensityPct(-20), 0);
  assert.equal(clampSanctuaryBloomIntensityPct(145), 100);
  assert.equal(clampSanctuaryBloomIntensityPct(Number.NaN, 80), 80);

  const partial = computeSanctuaryBloomEffect({
    completedStagesCount: 2,
    elapsedSec: 10,
  });
  assert.equal(partial.isTriggered, false);
  assert.equal(partial.cameraRotationRad, 0);
  assert.equal(partial.bioluminescenceSaturation, 0);
  assert.equal(partial.bloomIntensityAlpha, 0);

  const fullMastery = computeSanctuaryBloomEffect({
    completedStagesCount: 4,
    elapsedSec: 12.0,
    intensityPct: 100,
  });
  assert.equal(fullMastery.isTriggered, true);
  assert.equal(fullMastery.completedStagesCount, 4);
  assert.equal(fullMastery.totalStages, 4);
  assert.equal(fullMastery.userIntensityPct, 100);
  assert.equal(fullMastery.bioluminescenceSaturation, 1.0);
  assert.ok(fullMastery.cameraRotationRad > 0.9 && fullMastery.cameraRotationRad < 1.2);
  assert.ok(fullMastery.cameraRotationDeg > 50);
  assert.ok(fullMastery.bloomIntensityAlpha >= 0.34 && fullMastery.bloomIntensityAlpha <= 0.6);
  assert.equal(fullMastery.coronaRayAlpha, 0.22);
  assert.ok(fullMastery.statusBadgeText.includes('SANCTUARY BLOOM ACTIVE'));

  const halfIntensity = computeSanctuaryBloomEffect({
    completedStagesCount: 4,
    elapsedSec: 12.0,
    intensityPct: 50,
  });
  assert.equal(halfIntensity.userIntensityPct, 50);
  assert.equal(halfIntensity.bioluminescenceSaturation, 0.5);
  assert.equal(halfIntensity.coronaRayAlpha, 0.11);
  assert.ok(Math.abs(halfIntensity.bloomIntensityAlpha - fullMastery.bloomIntensityAlpha * 0.5) < 0.003);
  assert.ok(halfIntensity.statusBadgeText.includes('50% BIOLUM'));
});

test('getDailyHabitClinicalTooltip provides peer-reviewed neuroscientific tooltip explanations for NSDR and Cognitive Reframing', () => {
  const nsdrTip = getDailyHabitClinicalTooltip('nsdr_protocol');
  assert.equal(nsdrTip.id, 'nsdr_protocol');
  assert.ok(nsdrTip.clinicalBenefit.includes('+65%'));
  assert.ok(nsdrTip.clinicalBenefit.includes('striatal dopamine'));
  assert.ok(nsdrTip.neuroLiterature.includes('Kjaer et al.'));
  assert.equal(nsdrTip.keyMetrics.length, 3);

  const reframeTip = getDailyHabitClinicalTooltip('cognitive_reframing');
  assert.equal(reframeTip.id, 'cognitive_reframing');
  assert.ok(reframeTip.clinicalBenefit.includes('dlPFC/vlPFC'));
  assert.ok(reframeTip.clinicalBenefit.includes('amygdala'));
  assert.ok(reframeTip.neuroLiterature.includes('Ochsner'));
  assert.ok(reframeTip.neuroLiterature.includes('Buhle et al.'));
  assert.equal(reframeTip.keyMetrics.length, 3);
});

test('createCognitivePulseConfig and stepCognitivePulseWave radiate bioluminescent particles and harmonic rings for N-Back and UFOV completions', () => {
  const nbackPulse = createCognitivePulseConfig('nback_match', 10, -25, 1.15);
  assert.equal(nbackPulse.type, 'nback_match');
  assert.equal(nbackPulse.originX, 10);
  assert.equal(nbackPulse.originY, -25);
  assert.equal(nbackPulse.primaryColorHex, '#4FD1C5');
  assert.equal(nbackPulse.secondaryColorHex, '#68D391');
  assert.ok(nbackPulse.particles.length >= 36);
  assert.ok(nbackPulse.particles.some((p) => p.ringTier === 'outer_corona'));
  assert.ok(nbackPulse.particles.some((p) => p.ringTier === 'inner_burst'));

  const ufovPulse = createCognitivePulseConfig('ufov_complete', 145, 40, 1.0);
  assert.equal(ufovPulse.type, 'ufov_complete');
  assert.equal(ufovPulse.originX, 145);
  assert.equal(ufovPulse.originY, 40);
  assert.equal(ufovPulse.primaryColorHex, '#F2B84B');
  assert.equal(ufovPulse.secondaryColorHex, '#4FD1C5');
  assert.equal(ufovPulse.particles.length, 32);

  const midWave = stepCognitivePulseWave(0.4, ufovPulse.durationSec, ufovPulse.maxRadius);
  assert.equal(midWave.active, true);
  assert.ok(midWave.primaryRadius > 18 && midWave.primaryRadius < ufovPulse.maxRadius);
  assert.ok(midWave.alpha > 0 && midWave.alpha < 1);

  const finishedWave = stepCognitivePulseWave(1.5, ufovPulse.durationSec, ufovPulse.maxRadius);
  assert.equal(finishedWave.active, false);
  assert.equal(finishedWave.alpha, 0);
});

test('Daily Habit Tracker logs Non-Sleep Deep Rest (NSDR) and Daily Cognitive Reframing and syncs with daily streak state', () => {
  assert.equal(DAILY_HABIT_EXERCISES.length, 2);
  assert.equal(DAILY_HABIT_EXERCISES[0].id, 'nsdr_protocol');
  assert.equal(DAILY_HABIT_EXERCISES[1].id, 'cognitive_reframing');

  // Starting from yesterday's 2-day streak, syncing on a new day resets today's exercise checkboxes while preserving the streak
  const yesterdayStreak = {
    currentStreak: 2,
    longestStreak: 4,
    lastPracticedDate: '2026-11-02',
    totalDaysPracticed: 5,
    nsdrCompletedToday: true,
    cognitiveReframingCompletedToday: true,
    habitTrackerDateIso: '2026-11-02',
  };
  const syncedOnLoad = syncDailyHabitTrackerWithStreak(yesterdayStreak, null, '2026-11-03');
  assert.equal(syncedOnLoad.tracker.nsdrCompleted, false);
  assert.equal(syncedOnLoad.tracker.cognitiveReframingCompleted, false);
  assert.equal(syncedOnLoad.streak.currentStreak, 2);

  // Completing Non-Sleep Deep Rest (NSDR) on 2026-11-03 advances the consecutive daily streak to 3 days!
  const afterNsdr = toggleDailyHabitExercise({
    streak: syncedOnLoad.streak,
    tracker: syncedOnLoad.tracker,
    exerciseId: 'nsdr_protocol',
    todayIso: '2026-11-03',
  });
  assert.equal(afterNsdr.tracker.nsdrCompleted, true);
  assert.equal(afterNsdr.tracker.cognitiveReframingCompleted, false);
  assert.equal(afterNsdr.completedCount, 1);
  assert.equal(afterNsdr.streak.currentStreak, 3);
  assert.equal(afterNsdr.streak.lastPracticedDate, '2026-11-03');
  assert.equal(afterNsdr.streak.nsdrCompletedToday, true);
  assert.equal(afterNsdr.tracker.syncedStreakDays, 3);

  // Completing Daily Cognitive Reframing on the same day marks both complete (2/2) and keeps the 3-day streak idempotent
  const afterReframing = toggleDailyHabitExercise({
    streak: afterNsdr.streak,
    tracker: afterNsdr.tracker,
    exerciseId: 'cognitive_reframing',
    todayIso: '2026-11-03',
  });
  assert.equal(afterReframing.tracker.nsdrCompleted, true);
  assert.equal(afterReframing.tracker.cognitiveReframingCompleted, true);
  assert.equal(afterReframing.completedCount, 2);
  assert.equal(afterReframing.allExercisesCompleted, true);
  assert.equal(afterReframing.streak.currentStreak, 3);
  assert.equal(afterReframing.streak.cognitiveReframingCompletedToday, true);
  assert.ok(afterReframing.streakSyncedLabel.includes('3-Day Streak'));
});

test('computeZenModeHudState hides non-essential HUD telemetry (nectar, trees, flow) and enables HRV breathing guide in Zen Mode', () => {
  const normal = computeZenModeHudState(false);
  assert.equal(normal.isZenMode, false);
  assert.equal(normal.showNectar, true);
  assert.equal(normal.showTreesGrafted, true);
  assert.equal(normal.showRejuvenation, true);
  assert.equal(normal.showSynapticFlow, true);
  assert.equal(normal.showNBackStream, true);
  assert.equal(normal.showProtocolDeck, true);
  assert.equal(normal.showRadarMinimap, true);
  assert.equal(normal.showZenBreathingGuide, false);
  assert.equal(normal.autoEngageVagalBreathing, false);

  const zen = computeZenModeHudState(true);
  assert.equal(zen.isZenMode, true);
  assert.equal(zen.showNectar, false);
  assert.equal(zen.showTreesGrafted, false);
  assert.equal(zen.showRejuvenation, false);
  assert.equal(zen.showSynapticFlow, false);
  assert.equal(zen.showNBackStream, false);
  assert.equal(zen.showProtocolDeck, false);
  assert.equal(zen.showRadarMinimap, false);
  assert.equal(zen.showZenBreathingGuide, true);
  assert.equal(zen.autoEngageVagalBreathing, true);
});

test('Cognitive Insight Journal appends post-session Neural Logs linked to daily streak and ignores empty notes', () => {
  assert.equal(DEFAULT_NEURAL_LOGS_SEED.length, 2);

  // Empty note is ignored
  const unchanged = appendNeuralLogEntry(DEFAULT_NEURAL_LOGS_SEED, {
    recordedAtIso: '2026-11-03',
    streakDayCount: 3,
    stageName: 'Stage I · The Mossy Dentate Grove',
    outcome: 'victory',
    rejuvenationScore: 1580,
    moodTag: 'Flow State',
    reflectionNote: '   ',
  });
  assert.equal(unchanged.length, 2);

  // Valid note is prepended and linked to streakDayCount
  const updated = appendNeuralLogEntry(DEFAULT_NEURAL_LOGS_SEED, {
    id: 'test-log-3',
    recordedAtIso: '2026-11-03',
    streakDayCount: 3,
    stageName: 'Stage I · The Mossy Dentate Grove',
    outcome: 'victory',
    rejuvenationScore: 1580,
    moodTag: 'Focused Clarity',
    reflectionNote: 'UFOV peripheral locks felt crisp and effortless today.',
  });
  assert.equal(updated.length, 3);
  assert.equal(updated[0].id, 'test-log-3');
  assert.equal(updated[0].streakDayCount, 3);
  assert.equal(updated[0].moodTag, 'Focused Clarity');
  assert.equal(updated[0].reflectionNote, 'UFOV peripheral locks felt crisp and effortless today.');
});

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
