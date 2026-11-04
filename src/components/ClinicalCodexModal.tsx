import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  CLINICAL_PROTOCOLS,
  HRV_HISTORY_STORAGE_KEY,
  DEFAULT_HRV_HISTORY_SEED,
  computeHrvTrendSummary,
  computeVagalToneTrend30Days,
  computeCognitiveDomainProfile,
  NEURO_NUTRITION_SLEEP_TIPS,
  filterNeuroNutritionTips,
  computeNeuroSynergyBonus,
  DAILY_HABIT_EXERCISES,
  getDailyHabitClinicalTooltip,
  DEFAULT_NEURAL_LOGS_SEED,
  computeSixMonthNeuroProjection,
  WEEKLY_COGNITIVE_GOALS_STORAGE_KEY,
  DEFAULT_WEEKLY_COGNITIVE_GOALS,
  sanitizeWeeklyCognitiveGoalsConfig,
  computeWeeklyCognitiveGoalsProgress,
  CLINICAL_CODEX_EXIT_DURATION_MS,
  computeCodexModalAnimationState,
  DEFAULT_PRIOR_SIX_DAYS_HABIT_HISTORY,
  computeWeeklyHabitCompliance,
  DAILY_HABIT_DURATION_GOALS_STORAGE_KEY,
  DEFAULT_DAILY_HABIT_DURATION_GOALS,
  clampHabitDurationGoalMinutes,
  sanitizeDailyHabitDurationGoalsConfig,
  computeDailyHabitDurationProgress,
  type VagalToneDailyRecord,
  type DailyHabitDurationGoalsConfig,
  type PriorDayHabitRecord,
  type CodexModalTransitionPhase,
  type WeeklyCognitiveGoalsConfig,
  type NeuroProjectionMonthPoint,
  type DailyHabitExerciseId,
  type DailyHabitTrackerState,
  type NeuroLifestyleCategory,
  type NeuralLogEntry,
  type NeuralLogMoodTag,
  type HrvSessionRecord,
  type ProtocolId,
} from '../game/rules';
import { CognitiveInsightJournal } from './CognitiveInsightJournal';

interface ClinicalCodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProtocol?: ProtocolId;
  hrvHistory: HrvSessionRecord[];
  onRecordSimulatedSession?: () => void;
  totalTreesGrafted?: number;
  peakRejuvenationScore?: number;
  currentStreakDays?: number;
  completedHabitIds?: string[];
  onToggleHabitId?: (habitId: string) => void;
  dailyHabitTracker?: DailyHabitTrackerState;
  onToggleDailyHabitExercise?: (exerciseId: DailyHabitExerciseId) => void;
  neuralLogs?: NeuralLogEntry[];
  onAddNeuralLog?: (params: {
    moodTag: NeuralLogMoodTag;
    reflectionNote: string;
    outcome: 'victory' | 'defeat';
    rejuvenationScore: number;
    stageName: string;
  }) => void;
}

export const ClinicalCodexModal: React.FC<ClinicalCodexModalProps> = ({
  isOpen,
  onClose,
  hrvHistory,
  onRecordSimulatedSession,
  totalTreesGrafted = 4,
  peakRejuvenationScore = 1420,
  currentStreakDays = 1,
  completedHabitIds = ['polyphenol_bdnf_diet', 'glymphatic_slow_wave_sleep'],
  onToggleHabitId,
  dailyHabitTracker,
  onToggleDailyHabitExercise,
  neuralLogs = DEFAULT_NEURAL_LOGS_SEED,
  onAddNeuralLog,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const projectionSvgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredSession, setHoveredSession] = useState<HrvSessionRecord | null>(null);
  const [hoveredProjectionMonthIndex, setHoveredProjectionMonthIndex] =
    useState<number | null>(null);
  const [simulateOptimalHabits, setSimulateOptimalHabits] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [lifestyleCategory, setLifestyleCategory] = useState<NeuroLifestyleCategory>('all');
  const [hoveredHabitTooltipId, setHoveredHabitTooltipId] = useState<string | null>(null);
  const [pinnedHabitTooltipId, setPinnedHabitTooltipId] = useState<string | null>(null);
  const [localTrackerFallback, setLocalTrackerFallback] = useState<{
    nsdrCompleted: boolean;
    cognitiveReframingCompleted: boolean;
  }>({
    nsdrCompleted: false,
    cognitiveReframingCompleted: false,
  });

  // Enterprise Modal Entrance & Exit Transition State ('closed' -> 'entering' -> 'entered' -> 'exiting')
  const [transitionPhase, setTransitionPhase] = useState<CodexModalTransitionPhase>(() =>
    isOpen ? 'entered' : 'closed'
  );

  useEffect(() => {
    if (isOpen) {
      setTransitionPhase('entering');
      const rafId = window.requestAnimationFrame(() => {
        setTransitionPhase('entered');
      });
      return () => window.cancelAnimationFrame(rafId);
    }

    setTransitionPhase((prev) => (prev === 'closed' ? 'closed' : 'exiting'));
    const timerId = window.setTimeout(() => {
      setTransitionPhase('closed');
    }, CLINICAL_CODEX_EXIT_DURATION_MS);
    return () => window.clearTimeout(timerId);
  }, [isOpen]);

  const effectiveTransitionPhase: CodexModalTransitionPhase = isOpen
    ? transitionPhase === 'entered'
      ? 'entered'
      : 'entering'
    : transitionPhase;

  const modalAnimState = computeCodexModalAnimationState(effectiveTransitionPhase);
  const shouldRenderModal = modalAnimState.shouldRender;

  // Personal Weekly Cognitive Goals (N-Back Accuracy % & UFOV Speed ms) persisted in localStorage
  const [weeklyGoalsConfig, setWeeklyGoalsConfig] = useState<WeeklyCognitiveGoalsConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(WEEKLY_COGNITIVE_GOALS_STORAGE_KEY);
        if (stored) {
          return sanitizeWeeklyCognitiveGoalsConfig(
            JSON.parse(stored) as Partial<WeeklyCognitiveGoalsConfig>
          );
        }
      } catch {
        // Fallback to default goals if storage read fails
      }
    }
    return DEFAULT_WEEKLY_COGNITIVE_GOALS;
  });

  const updateWeeklyGoalsConfig = (
    updater: (prev: WeeklyCognitiveGoalsConfig) => Partial<WeeklyCognitiveGoalsConfig>
  ) => {
    setWeeklyGoalsConfig((prev) => {
      const next = sanitizeWeeklyCognitiveGoalsConfig({
        ...prev,
        ...updater(prev),
      });
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            WEEKLY_COGNITIVE_GOALS_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {
          // Ignore storage write errors
        }
      }
      return next;
    });
  };

  const activeNsdrCompleted = dailyHabitTracker
    ? dailyHabitTracker.nsdrCompleted
    : localTrackerFallback.nsdrCompleted;
  const activeReframingCompleted = dailyHabitTracker
    ? dailyHabitTracker.cognitiveReframingCompleted
    : localTrackerFallback.cognitiveReframingCompleted;
  const completedExerciseCount =
    (activeNsdrCompleted ? 1 : 0) + (activeReframingCompleted ? 1 : 0);
  const syncedStreakDisplay = Math.max(
    1,
    dailyHabitTracker?.syncedStreakDays ?? currentStreakDays
  );

  // Daily Duration Goals for NSDR (5-40m, default 20m) and Cognitive Reframing (3-20m, default 5m)
  const [habitDurationGoalsConfig, setHabitDurationGoalsConfig] =
    useState<DailyHabitDurationGoalsConfig>(() => {
      if (typeof window !== 'undefined') {
        try {
          const stored = window.localStorage.getItem(
            DAILY_HABIT_DURATION_GOALS_STORAGE_KEY
          );
          if (stored) {
            return sanitizeDailyHabitDurationGoalsConfig(
              JSON.parse(stored) as Partial<DailyHabitDurationGoalsConfig>
            );
          }
        } catch {
          // Ignore storage read errors
        }
      }
      return DEFAULT_DAILY_HABIT_DURATION_GOALS;
    });

  const persistHabitDurationGoals = (
    updater: (
      prev: DailyHabitDurationGoalsConfig
    ) => Partial<DailyHabitDurationGoalsConfig>
  ) => {
    setHabitDurationGoalsConfig((prev) => {
      const next = sanitizeDailyHabitDurationGoalsConfig({
        ...prev,
        ...updater(prev),
      });
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            DAILY_HABIT_DURATION_GOALS_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {
          // Ignore storage write errors
        }
      }
      return next;
    });
  };

  const habitDurationProgress = React.useMemo(
    () =>
      computeDailyHabitDurationProgress({
        nsdrCompleted: activeNsdrCompleted,
        cognitiveReframingCompleted: activeReframingCompleted,
        nsdrGoalMinutes: habitDurationGoalsConfig.nsdrGoalMinutes,
        cognitiveReframingGoalMinutes:
          habitDurationGoalsConfig.cognitiveReframingGoalMinutes,
        nsdrLoggedMinutes: habitDurationGoalsConfig.nsdrLoggedMinutes,
        cognitiveReframingLoggedMinutes:
          habitDurationGoalsConfig.cognitiveReframingLoggedMinutes,
      }),
    [
      activeNsdrCompleted,
      activeReframingCompleted,
      habitDurationGoalsConfig,
    ]
  );

  const rawToggleExercise = (exerciseId: DailyHabitExerciseId) => {
    if (onToggleDailyHabitExercise) {
      onToggleDailyHabitExercise(exerciseId);
    } else {
      setLocalTrackerFallback((prev) => ({
        ...prev,
        nsdrCompleted:
          exerciseId === 'nsdr_protocol' ? !prev.nsdrCompleted : prev.nsdrCompleted,
        cognitiveReframingCompleted:
          exerciseId === 'cognitive_reframing'
            ? !prev.cognitiveReframingCompleted
            : prev.cognitiveReframingCompleted,
      }));
    }
  };

  const handleExerciseToggleClick = (exerciseId: DailyHabitExerciseId) => {
    const isCurrentlyDone =
      exerciseId === 'nsdr_protocol'
        ? activeNsdrCompleted
        : activeReframingCompleted;
    const itemProg = habitDurationProgress.byExerciseId[exerciseId];
    const willComplete = !isCurrentlyDone || !itemProg.isGoalMet;

    persistHabitDurationGoals(() =>
      exerciseId === 'nsdr_protocol'
        ? { nsdrLoggedMinutes: willComplete ? itemProg.goalMinutes : 0 }
        : {
            cognitiveReframingLoggedMinutes: willComplete
              ? itemProg.goalMinutes
              : 0,
          }
    );

    if (willComplete !== isCurrentlyDone) {
      rawToggleExercise(exerciseId);
    }
  };

  const handleUpdateHabitDurationGoal = (
    exerciseId: DailyHabitExerciseId,
    nextGoalMinutesRaw: number
  ) => {
    const clampedGoal = clampHabitDurationGoalMinutes(
      exerciseId,
      nextGoalMinutesRaw
    );
    const currentItem = habitDurationProgress.byExerciseId[exerciseId];
    persistHabitDurationGoals((prev) =>
      exerciseId === 'nsdr_protocol'
        ? {
            nsdrGoalMinutes: clampedGoal,
            nsdrLoggedMinutes:
              prev.nsdrLoggedMinutes !== undefined
                ? prev.nsdrLoggedMinutes
                : currentItem.loggedMinutes,
          }
        : {
            cognitiveReframingGoalMinutes: clampedGoal,
            cognitiveReframingLoggedMinutes:
              prev.cognitiveReframingLoggedMinutes !== undefined
                ? prev.cognitiveReframingLoggedMinutes
                : currentItem.loggedMinutes,
          }
    );
  };

  const handleAdjustHabitLoggedMinutes = (
    exerciseId: DailyHabitExerciseId,
    deltaMinutes: number
  ) => {
    const currentItem = habitDurationProgress.byExerciseId[exerciseId];
    const nextLogged = Math.max(
      0,
      Math.min(
        currentItem.maxGoalMinutes,
        currentItem.loggedMinutes + deltaMinutes
      )
    );
    const isCurrentlyDone =
      exerciseId === 'nsdr_protocol'
        ? activeNsdrCompleted
        : activeReframingCompleted;

    persistHabitDurationGoals(() =>
      exerciseId === 'nsdr_protocol'
        ? { nsdrLoggedMinutes: nextLogged }
        : { cognitiveReframingLoggedMinutes: nextLogged }
    );

    const shouldBeCompleted = nextLogged >= currentItem.goalMinutes;
    if (shouldBeCompleted && !isCurrentlyDone) {
      rawToggleExercise(exerciseId);
    } else if (nextLogged === 0 && isCurrentlyDone) {
      rawToggleExercise(exerciseId);
    }
  };

  // 7-Day Weekly Habit Compliance state (prior 6 days seed + live Day 7 synced with today's NSDR & Cognitive Reframing)
  const [priorSixDaysHistory] = useState<readonly PriorDayHabitRecord[]>(
    DEFAULT_PRIOR_SIX_DAYS_HABIT_HISTORY
  );
  const weeklyCompliance = React.useMemo(
    () =>
      computeWeeklyHabitCompliance({
        todayNsdrCompleted: activeNsdrCompleted,
        todayCognitiveReframingCompleted: activeReframingCompleted,
        priorSixDays: priorSixDaysHistory,
      }),
    [activeNsdrCompleted, activeReframingCompleted, priorSixDaysHistory]
  );

  // Synchronize last 10 sessions from hrvHistory prop and HRV_HISTORY_STORAGE_KEY
  const resolvedHistory = React.useMemo(() => {
    if (hrvHistory && hrvHistory.length > 0) {
      return hrvHistory.slice(-10);
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(HRV_HISTORY_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as HrvSessionRecord[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(-10);
          }
        }
      } catch {
        // Ignore storage read errors
      }
    }
    return DEFAULT_HRV_HISTORY_SEED.slice(-10);
  }, [hrvHistory]);

  const sessions = resolvedHistory;
  const trendSummary = computeHrvTrendSummary(sessions);
  const [vagalWindowMode, setVagalWindowMode] = useState<'30d' | '14d'>('30d');
  const vagalToneTrend = React.useMemo(
    () => computeVagalToneTrend30Days({ hrvHistory: sessions }),
    [sessions]
  );
  const displayedVagalDays = React.useMemo(
    () =>
      vagalWindowMode === '14d'
        ? vagalToneTrend.days.slice(-14)
        : vagalToneTrend.days,
    [vagalToneTrend.days, vagalWindowMode]
  );
  const domainProfile = computeCognitiveDomainProfile({
    totalTreesGrafted,
    peakRejuvenationScore,
    averageHrvCoherence: trendSummary.averageCoherence,
    currentStreakDays,
  });
  const filteredLifestyleTips = filterNeuroNutritionTips(lifestyleCategory);
  const neuroSynergy = computeNeuroSynergyBonus(completedHabitIds);
  const goalsProgress = React.useMemo(
    () =>
      computeWeeklyCognitiveGoalsProgress({
        goalsConfig: weeklyGoalsConfig,
        totalTreesGrafted,
        peakRejuvenationScore,
        averageHrvCoherence: trendSummary.averageCoherence,
        currentStreakDays: syncedStreakDisplay,
      }),
    [
      weeklyGoalsConfig,
      totalTreesGrafted,
      peakRejuvenationScore,
      trendSummary.averageCoherence,
      syncedStreakDisplay,
    ]
  );
  const neuroProjection = React.useMemo(
    () =>
      computeSixMonthNeuroProjection({
        hrvHistory: sessions,
        totalTreesGrafted,
        peakRejuvenationScore,
        currentStreakDays: syncedStreakDisplay,
        completedHabitIds,
        nsdrCompleted: activeNsdrCompleted,
        cognitiveReframingCompleted: activeReframingCompleted,
        simulateOptimalHabits,
      }),
    [
      sessions,
      totalTreesGrafted,
      peakRejuvenationScore,
      syncedStreakDisplay,
      completedHabitIds,
      activeNsdrCompleted,
      activeReframingCompleted,
      simulateOptimalHabits,
    ]
  );

  useEffect(() => {
    if (!shouldRenderModal || !svgRef.current || sessions.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 760;
    const height = 250;
    const margin = { top: 24, right: 28, bottom: 38, left: 46 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Defs for gradient area under curve
    const defs = svg.append('defs');
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'hrvCoherenceAreaGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#68D391')
      .attr('stop-opacity', 0.42);

    areaGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#4FD1C5')
      .attr('stop-opacity', 0.02);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scalePoint<string>()
      .domain(sessions.map((d) => d.sessionLabel))
      .range([0, innerWidth])
      .padding(0.25);

    const yScale = d3
      .scaleLinear()
      .domain([40, 100])
      .nice()
      .range([innerHeight, 0]);

    // Horizontal clinical gridlines
    const yTicks = [40, 55, 70, 85, 100];
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#1E3A2F')
      .attr('stroke-dasharray', (d) => (d === 75 ? 'none' : '4,4'))
      .attr('stroke-width', 1);

    // Shaded Optimal Vagal Resonance Zone (75% - 100%)
    const thresholdY = yScale(75);
    g.append('rect')
      .attr('x', 0)
      .attr('y', yScale(100))
      .attr('width', innerWidth)
      .attr('height', Math.max(0, thresholdY - yScale(100)))
      .attr('fill', 'rgba(104, 211, 145, 0.06)');

    // Clinical Resonance Target Threshold Line (75% Vagal Coherence Zone)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', thresholdY)
      .attr('y2', thresholdY)
      .attr('stroke', '#F2B84B')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,4')
      .attr('opacity', 0.85);

    g.append('text')
      .attr('x', innerWidth - 4)
      .attr('y', thresholdY - 6)
      .attr('text-anchor', 'end')
      .attr('fill', '#F2B84B')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px')
      .text('0.1 Hz Clinical Vagal Target (75%)');

    // Y-Axis Labels
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(yTicks)
      .tickFormat((d) => `${d}%`)
      .tickSize(0);

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup
      .selectAll('text')
      .attr('fill', '#A3B8B0')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '11px')
      .attr('dx', '-6px');

    // X-Axis Labels (S1..S10)
    const xAxis = d3.axisBottom(xScale).tickSize(0);
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#233D32');
    xAxisGroup
      .selectAll('text')
      .attr('fill', '#D5E2DC')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '11px')
      .attr('dy', '16px');

    // D3 Area generator
    const areaGenerator = d3
      .area<HrvSessionRecord>()
      .x((d) => xScale(d.sessionLabel) ?? 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.coherenceScore))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(sessions)
      .attr('fill', 'url(#hrvCoherenceAreaGradient)')
      .attr('d', areaGenerator);

    // Baseline-to-Latest Vagal Coherence Growth Vector Line (S1 -> S10)
    if (sessions.length >= 2) {
      const firstSession = sessions[0];
      const lastSession = sessions[sessions.length - 1];
      const x1 = xScale(firstSession.sessionLabel) ?? 0;
      const y1 = yScale(firstSession.coherenceScore);
      const x2 = xScale(lastSession.sessionLabel) ?? innerWidth;
      const y2 = yScale(lastSession.coherenceScore);
      const delta = lastSession.coherenceScore - firstSession.coherenceScore;

      g.append('line')
        .attr('data-testid', 'hrv-d3-growth-trendline')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', '#4FD1C5')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.75);

      // In-Chart Vagal Coherence Growth Callout Badge (Bottom-Right Plot Area)
      const badgeGroup = g
        .append('g')
        .attr('data-testid', 'hrv-d3-growth-badge')
        .attr('transform', `translate(${Math.max(10, innerWidth - 304)}, ${innerHeight - 28})`);

      badgeGroup
        .append('rect')
        .attr('width', 292)
        .attr('height', 22)
        .attr('rx', 6)
        .attr('fill', '#10281F')
        .attr('stroke', '#68D391')
        .attr('stroke-width', 1);

      badgeGroup
        .append('text')
        .attr('x', 10)
        .attr('y', 14.5)
        .attr('fill', '#68D391')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .text(
          `▲ ${delta >= 0 ? `+${delta}%` : `${delta}%`} Vagal Coherence Growth (${firstSession.sessionLabel}: ${firstSession.coherenceScore}% → ${lastSession.sessionLabel}: ${lastSession.coherenceScore}%)`
        );
    }

    // D3 Line generator
    const lineGenerator = d3
      .line<HrvSessionRecord>()
      .x((d) => xScale(d.sessionLabel) ?? 0)
      .y((d) => yScale(d.coherenceScore))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(sessions)
      .attr('data-testid', 'hrv-d3-line-path')
      .attr('fill', 'none')
      .attr('stroke', '#68D391')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGenerator);

    // Data point nodes and direct value labels
    const nodeGroups = g
      .selectAll('.hrv-session-node')
      .data(sessions)
      .enter()
      .append('g')
      .attr('class', 'hrv-session-node')
      .attr(
        'transform',
        (d) => `translate(${xScale(d.sessionLabel) ?? 0},${yScale(d.coherenceScore)})`
      )
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setHoveredSession(d))
      .on('click', (_, d) => setHoveredSession(d));

    // Outer halo on nodes above 75% clinical target
    nodeGroups
      .append('circle')
      .attr('r', 9)
      .attr('fill', (d) =>
        d.coherenceScore >= 75 ? 'rgba(104, 211, 145, 0.22)' : 'rgba(79, 209, 197, 0.14)'
      );

    // Core node circle
    nodeGroups
      .append('circle')
      .attr('r', 5)
      .attr('fill', (d) => (d.coherenceScore >= 75 ? '#68D391' : '#4FD1C5'))
      .attr('stroke', '#091510')
      .attr('stroke-width', 2);

    // Direct score readout above each node
    nodeGroups
      .append('text')
      .attr('y', -11)
      .attr('text-anchor', 'middle')
      .attr('fill', '#F4EFE6')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text((d) => `${d.coherenceScore}%`);
  }, [shouldRenderModal, sessions]);

  // D3 'Neuro-Projection Graph' — 6-Month Cognitive Reserve Growth Forecast
  useEffect(() => {
    if (!shouldRenderModal || !projectionSvgRef.current || neuroProjection.points.length === 0) return;

    const svg = d3.select(projectionSvgRef.current);
    svg.selectAll('*').remove();

    const width = 760;
    const height = 260;
    const margin = { top: 28, right: 32, bottom: 40, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const defs = svg.append('defs');
    const projGrad = defs
      .append('linearGradient')
      .attr('id', 'neuroProjectionAreaGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    projGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#B794F4')
      .attr('stop-opacity', 0.44);

    projGrad
      .append('stop')
      .attr('offset', '55%')
      .attr('stop-color', '#4FD1C5')
      .attr('stop-opacity', 0.22);

    projGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#0B1914')
      .attr('stop-opacity', 0.02);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const points = neuroProjection.points;
    const xScale = d3
      .scalePoint<string>()
      .domain(points.map((p) => p.monthLabel))
      .range([0, innerWidth])
      .padding(0.22);

    const yScale = d3
      .scaleLinear()
      .domain([40, 100])
      .nice()
      .range([innerHeight, 0]);

    // Horizontal clinical reserve gridlines
    const yTicks = [40, 55, 70, 85, 100];
    g.selectAll('.proj-grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'proj-grid-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#1E3A2F')
      .attr('stroke-dasharray', (d) => (d === 85 ? 'none' : '4,4'))
      .attr('stroke-width', 1);

    // Shaded High Cognitive Reserve Fortification Zone (85 - 100)
    const highReserveY = yScale(85);
    g.append('rect')
      .attr('x', 0)
      .attr('y', yScale(100))
      .attr('width', innerWidth)
      .attr('height', Math.max(0, highReserveY - yScale(100)))
      .attr('fill', 'rgba(183, 148, 244, 0.07)');

    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', highReserveY)
      .attr('y2', highReserveY)
      .attr('stroke', '#B794F4')
      .attr('stroke-width', 1.25)
      .attr('stroke-dasharray', '5,4')
      .attr('opacity', 0.8);

    g.append('text')
      .attr('x', innerWidth - 4)
      .attr('y', highReserveY - 6)
      .attr('text-anchor', 'end')
      .attr('fill', '#B794F4')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px')
      .text('Fortified Neuroplastic Reserve Threshold (85/100)');

    // Y-Axis
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(yTicks)
      .tickFormat((d) => `${d}`)
      .tickSize(0);

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup
      .selectAll('text')
      .attr('fill', '#A3B8B0')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '11px')
      .attr('dx', '-6px');

    // X-Axis (Now, M1..M6)
    const xAxis = d3.axisBottom(xScale).tickSize(0);
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#233D32');
    xAxisGroup
      .selectAll('text')
      .attr('fill', '#D5E2DC')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '11px')
      .attr('dy', '16px');

    // Shaded Area under User's Projected Cognitive Reserve Curve
    const projAreaGenerator = d3
      .area<NeuroProjectionMonthPoint>()
      .x((d) => xScale(d.monthLabel) ?? 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.projectedReserveIndex))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(points)
      .attr('data-testid', 'neuro-projection-d3-area-path')
      .attr('fill', 'url(#neuroProjectionAreaGradient)')
      .attr('d', projAreaGenerator);

    // 1. Untrained Baseline Reference Line (dashed slate)
    const untrainedLine = d3
      .line<NeuroProjectionMonthPoint>()
      .x((d) => xScale(d.monthLabel) ?? 0)
      .y((d) => yScale(d.untrainedBaselineIndex))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(points)
      .attr('data-testid', 'neuro-projection-untrained-line')
      .attr('fill', 'none')
      .attr('stroke', '#526B61')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .attr('d', untrainedLine);

    // 2. 100% Optimal Habit Potential Ceiling Line (dashed gold)
    const optimalLine = d3
      .line<NeuroProjectionMonthPoint>()
      .x((d) => xScale(d.monthLabel) ?? 0)
      .y((d) => yScale(d.optimalHabitReserveIndex))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(points)
      .attr('data-testid', 'neuro-projection-optimal-line')
      .attr('fill', 'none')
      .attr('stroke', '#F2B84B')
      .attr('stroke-width', 1.75)
      .attr('stroke-dasharray', '6,4')
      .attr('opacity', 0.85)
      .attr('d', optimalLine);

    // 3. User's Projected 6-Month Cognitive Reserve Line
    const projectedLine = d3
      .line<NeuroProjectionMonthPoint>()
      .x((d) => xScale(d.monthLabel) ?? 0)
      .y((d) => yScale(d.projectedReserveIndex))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(points)
      .attr('data-testid', 'neuro-projection-d3-line-path')
      .attr('fill', 'none')
      .attr('stroke', '#4FD1C5')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('d', projectedLine);

    // In-Chart 6-Month Cognitive Reserve Projection Callout Badge (Bottom-Right Plot Area)
    const projBadge = g
      .append('g')
      .attr('data-testid', 'neuro-projection-d3-growth-badge')
      .attr('transform', `translate(${Math.max(10, innerWidth - 364)}, ${innerHeight - 28})`);

    projBadge
      .append('rect')
      .attr('width', 354)
      .attr('height', 22)
      .attr('rx', 6)
      .attr('fill', 'rgba(20, 27, 45, 0.92)')
      .attr('stroke', '#B794F4')
      .attr('stroke-width', 1);

    projBadge
      .append('text')
      .attr('x', 10)
      .attr('y', 14.5)
      .attr('fill', '#E9D8FD')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text(
        `▲ +${neuroProjection.netSixMonthReserveGain} pts 6-Mo Reserve (${neuroProjection.baselineReserveIndex} → ${neuroProjection.monthSixProjectedReserveIndex}/100) · +${neuroProjection.projectedHippocampalVolumeGainPct}% BDNF Vol`
      );

    // Interactive Monthly Projection Nodes (Now, M1..M6)
    const monthNodes = g
      .selectAll('.neuro-projection-node')
      .data(points)
      .enter()
      .append('g')
      .attr('class', 'neuro-projection-node')
      .attr('data-testid', (d) => `neuro-projection-node-${d.monthIndex}`)
      .attr('data-month-label', (d) => d.monthLabel)
      .attr('data-projected-reserve', (d) => String(d.projectedReserveIndex))
      .attr(
        'transform',
        (d) => `translate(${xScale(d.monthLabel) ?? 0},${yScale(d.projectedReserveIndex)})`
      )
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setHoveredProjectionMonthIndex(d.monthIndex))
      .on('click', (_, d) => setHoveredProjectionMonthIndex(d.monthIndex));

    monthNodes
      .append('circle')
      .attr('r', 9)
      .attr('fill', (d) =>
        d.projectedReserveIndex >= 85
          ? 'rgba(183, 148, 244, 0.26)'
          : 'rgba(79, 209, 197, 0.18)'
      );

    monthNodes
      .append('circle')
      .attr('r', 5)
      .attr('fill', (d) => (d.projectedReserveIndex >= 85 ? '#B794F4' : '#4FD1C5'))
      .attr('stroke', '#091510')
      .attr('stroke-width', 2);

    monthNodes
      .append('text')
      .attr('y', -11)
      .attr('text-anchor', 'middle')
      .attr('fill', '#F4EFE6')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text((d) => `${d.projectedReserveIndex}`);
  }, [shouldRenderModal, neuroProjection]);

  if (!shouldRenderModal) return null;

  const protocols = Object.values(CLINICAL_PROTOCOLS);
  const activeInspect = hoveredSession || sessions[sessions.length - 1] || null;
  const activeProjectionInspect =
    (hoveredProjectionMonthIndex !== null
      ? neuroProjection.points.find((p) => p.monthIndex === hoveredProjectionMonthIndex)
      : undefined) ||
    neuroProjection.points[neuroProjection.points.length - 1] ||
    null;

  const handleExportDtxTelemetry = () => {
    const payload = {
      application: 'Sylvan Synapse — Clinical Neuroplasticity Sanctuary (Mac Edition)',
      exportedAtIso: new Date().toISOString(),
      summaryMetrics: {
        compositeReserveIndex: domainProfile.compositeReserveIndex,
        estimatedPlasticityGainPct: domainProfile.estimatedPlasticityGainPct,
        totalTreesGrafted,
        peakRejuvenationScore,
        currentStreakDays,
        latestHrvCoherencePct: trendSummary.latestCoherence,
        tenSessionMeanHrvCoherencePct: trendSummary.averageCoherence,
        autonomicStatus: trendSummary.relaxationStatus,
        neuroLifestyleReadinessPct: neuroSynergy.readinessPct,
        neuroLifestyleSynergyMultiplier: neuroSynergy.bonusNectarMultiplier,
      },
      cognitiveDomains: domainProfile.domains,
      weeklyCognitiveGoals: goalsProgress,
      neuroNutritionAndSleepProtocols: NEURO_NUTRITION_SLEEP_TIPS.map((t) => ({
        id: t.id,
        category: t.category,
        title: t.title,
        completedToday: completedHabitIds.includes(t.id),
      })),
      neuralLogs,
      hrvSessionHistory: sessions,
    };

    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sylvan-synapse-dtx-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus('Telemetry JSON Exported');
      setTimeout(() => setExportStatus(''), 3000);
    } catch {
      setExportStatus('Ready');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinical-codex-title"
      data-testid="clinical-codex-backdrop"
      data-animation-phase={modalAnimState.phase}
      data-animation-easing={modalAnimState.easingCurve}
      data-animation-duration-ms={modalAnimState.durationMs}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#07120E]/90 ${modalAnimState.backdropClassName} ${
        modalAnimState.isInteractive ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div
        data-testid="clinical-codex-panel"
        data-animation-phase={modalAnimState.phase}
        data-translate-y-px={modalAnimState.panelTranslateYpx}
        data-scale={modalAnimState.panelScale}
        className={`w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#10231C] border border-[#2C4C3E] shadow-2xl p-6 md:p-8 text-[#F4EFE6] ${modalAnimState.panelClassName}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-[#233D32]">
          <div className="min-w-0">
            <p className="text-xs font-mono tracking-wider uppercase text-[#68D391]">
              Enterprise Digital Therapeutics (DTx) · Biofeedback &amp; Neuroplasticity Telemetry
            </p>
            <h2
              id="clinical-codex-title"
              className="mt-1 text-xl md:text-2xl font-display font-semibold text-[#F4EFE6]"
            >
              Clinical Research Codex &amp; Longitudinal Telemetry
            </h2>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              data-testid="export-dtx-telemetry-btn"
              onClick={handleExportDtxTelemetry}
              className="px-3.5 py-2 rounded-lg bg-[#152E24] hover:bg-[#1E3F32] text-xs font-mono font-semibold text-[#4FD1C5] border border-[#2C4C3E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {exportStatus || '⇩ Export DTx Telemetry [JSON]'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Clinical Evidence Codex"
              className="px-4 py-2 rounded-lg bg-[#1A352B] hover:bg-[#24473A] text-sm font-medium text-[#F4EFE6] border border-[#2C4C3E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Close Codex [Esc]
            </button>
          </div>
        </div>

        {/* 1. D3.js Physiological Relaxation & HRV Coherence Line Chart (Last 10 Practice Sessions from HRV_HISTORY_STORAGE_KEY) */}
        <section
          aria-labelledby="hrv-chart-heading"
          data-testid="clinical-codex-hrv-chart"
          className="mt-6 p-5 rounded-xl bg-[#0B1914] border border-[#233D32] space-y-4 codex-section-cascade"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#4FD1C5]">
                  0.1 Hz Resonance Biofeedback · Last {sessions.length} Practice Sessions
                </span>
                <span className="px-2 py-0.5 rounded bg-[#142D23] text-[#68D391] border border-[#2C4C3E] text-[10px] font-mono font-semibold tabular-nums">
                  ▲ {trendSummary.trendDelta >= 0 ? `+${trendSummary.trendDelta}%` : `${trendSummary.trendDelta}%`} Vagal Coherence Growth
                </span>
              </div>
              <h3
                id="hrv-chart-heading"
                className="text-lg font-display font-semibold text-[#F4EFE6] mt-0.5"
              >
                HRV Coherence Score Trajectory &amp; Vagal Growth (D3.js Visualization)
              </h3>
            </div>

            {onRecordSimulatedSession && (
              <button
                type="button"
                data-testid="log-hrv-session-btn"
                onClick={onRecordSimulatedSession}
                className="px-3.5 py-1.5 rounded-lg bg-[#152E24] hover:bg-[#1E3F32] text-xs font-mono font-semibold text-[#68D391] border border-[#2C4C3E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                + Log 0.1 Hz Breath Check-In
              </button>
            )}
          </div>

          {/* 4 Tabular-Nums Physiological Relaxation KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]">
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                LATEST COHERENCE
              </div>
              <div className="text-xl font-mono font-bold text-[#68D391] tabular-nums">
                {trendSummary.latestCoherence}%
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]">
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                10-SESSION MEAN
              </div>
              <div className="text-xl font-mono font-bold text-[#4FD1C5] tabular-nums">
                {trendSummary.averageCoherence}%
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]">
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                VAGAL COHERENCE GROWTH
              </div>
              <div className="text-xl font-mono font-bold text-[#F2B84B] tabular-nums">
                {trendSummary.trendDelta >= 0 ? `+${trendSummary.trendDelta}%` : `${trendSummary.trendDelta}%`}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]">
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                AUTONOMIC STATE
              </div>
              <div className="text-xs font-mono font-semibold text-[#F4EFE6] mt-1">
                {trendSummary.relaxationStatus}
              </div>
            </div>
          </div>

          {/* D3 Responsive SVG Line Chart */}
          <div className="w-full overflow-x-auto pt-1">
            <svg
              ref={svgRef}
              viewBox="0 0 760 250"
              role="img"
              aria-label="D3 Line Chart of HRV Coherence Scores over the last 10 practice sessions"
              className="w-full h-auto min-w-[540px] select-none"
            />
          </div>

          {/* Interactive Session Inspector Footer */}
          {activeInspect && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1E3A2F] text-xs font-mono text-[#A3B8B0] tabular-nums">
              <div>
                <span className="text-[#F4EFE6] font-semibold">
                  Session {activeInspect.sessionLabel}
                </span>
                <span aria-hidden="true"> · </span>
                <span>{activeInspect.stageName}</span>
                <span aria-hidden="true"> · </span>
                <span>Recorded {activeInspect.recordedAtIso}</span>
              </div>
              <div>
                <span className="text-[#68D391] font-semibold">
                  HRV Coherence Score: {activeInspect.coherenceScore}%
                </span>
                <span aria-hidden="true"> · </span>
                <span>{activeInspect.coherenceSeconds.toFixed(1)}s Paced 0.1 Hz Breath</span>
              </div>
            </div>
          )}
        </section>

        {/* 1A. RECHARTS 'VAGAL TONE TREND' — 30-DAY PARASYMPATHETIC NERVOUS SYSTEM & DAILY VAGAL COHERENCE */}
        <section
          aria-labelledby="vagal-tone-trend-heading"
          data-testid="codex-vagal-tone-trend-section"
          data-thirty-day-mean-pct={vagalToneTrend.thirtyDayMeanCoherencePct}
          data-seven-day-mean-pct={vagalToneTrend.sevenDayMeanCoherencePct}
          data-thirty-day-growth-delta-pct={vagalToneTrend.thirtyDayGrowthDeltaPct}
          data-resonant-days-count={vagalToneTrend.resonantDaysCount}
          data-latest-coherence-pct={vagalToneTrend.latestCoherencePct}
          data-displayed-days-count={displayedVagalDays.length}
          className="mt-6 p-5 rounded-xl bg-[#0B1914] border border-[#2C4C3E] space-y-4 codex-section-cascade"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#68D391]">
                  30-Day Longitudinal Parasympathetic Telemetry · Recharts Visualization
                </span>
                <span
                  data-testid="vagal-tone-tier-badge"
                  className="px-2 py-0.5 rounded bg-[#142D23] text-[#68D391] border border-[#68D391]/50 text-[10px] font-mono font-semibold tabular-nums"
                >
                  ✦ {vagalToneTrend.parasympatheticTierLabel} (
                  {vagalToneTrend.thirtyDayGrowthDeltaPct >= 0
                    ? `+${vagalToneTrend.thirtyDayGrowthDeltaPct}%`
                    : `${vagalToneTrend.thirtyDayGrowthDeltaPct}%`}{' '}
                  vs. Week 1)
                </span>
              </div>
              <h3
                id="vagal-tone-trend-heading"
                className="text-lg font-display font-semibold text-[#F4EFE6] mt-0.5"
              >
                Vagal Tone Trend — 30-Day Daily Vagal Coherence &amp; Parasympathetic Trajectory
              </h3>
              <p className="text-xs text-[#A3B8B0] mt-0.5">
                Plots daily Vagal Coherence scores from your HRV history across the last 30 days alongside your 7-day rolling parasympathetic average and the 75% clinical 0.1 Hz resonance threshold.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex rounded-lg bg-[#10231C] border border-[#233D32] p-0.5 font-mono text-xs">
                <button
                  type="button"
                  data-testid="vagal-trend-window-30d-btn"
                  aria-pressed={vagalWindowMode === '30d'}
                  onClick={() => setVagalWindowMode('30d')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    vagalWindowMode === '30d'
                      ? 'bg-[#1D4032] text-[#68D391] font-semibold'
                      : 'text-[#A3B8B0] hover:text-[#F4EFE6]'
                  }`}
                >
                  30-Day Window (30d)
                </button>
                <button
                  type="button"
                  data-testid="vagal-trend-window-14d-btn"
                  aria-pressed={vagalWindowMode === '14d'}
                  onClick={() => setVagalWindowMode('14d')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    vagalWindowMode === '14d'
                      ? 'bg-[#1D4032] text-[#4FD1C5] font-semibold'
                      : 'text-[#A3B8B0] hover:text-[#F4EFE6]'
                  }`}
                >
                  Last 14 Days (14d)
                </button>
              </div>

              {onRecordSimulatedSession && (
                <button
                  type="button"
                  data-testid="vagal-trend-log-checkin-btn"
                  onClick={onRecordSimulatedSession}
                  className="px-3 py-1.5 rounded-lg bg-[#152E24] hover:bg-[#1E3F32] text-xs font-mono font-semibold text-[#4FD1C5] border border-[#2C4C3E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + Log Daily Vagal Check-In
                </button>
              )}
            </div>
          </div>

          {/* 4 Tabular-Nums 30-Day Vagal Tone Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div
              data-testid="vagal-trend-kpi-30d-mean"
              className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]"
            >
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                30-DAY VAGAL MEAN
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span
                  data-testid="vagal-trend-30d-mean-value"
                  className="text-xl font-mono font-bold text-[#68D391] tabular-nums"
                >
                  {vagalToneTrend.thirtyDayMeanCoherencePct}%
                </span>
                <span className="text-[11px] font-mono text-[#A3B8B0] tabular-nums">
                  Peak {vagalToneTrend.peakCoherencePct}%
                </span>
              </div>
            </div>

            <div
              data-testid="vagal-trend-kpi-7d-rolling"
              className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]"
            >
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                7-DAY ROLLING TONE
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span
                  data-testid="vagal-trend-7d-mean-value"
                  className="text-xl font-mono font-bold text-[#4FD1C5] tabular-nums"
                >
                  {vagalToneTrend.sevenDayMeanCoherencePct}%
                </span>
                <span className="text-[11px] font-mono text-[#68D391] tabular-nums">
                  {vagalToneTrend.thirtyDayGrowthDeltaPct >= 0
                    ? `+${vagalToneTrend.thirtyDayGrowthDeltaPct}%`
                    : `${vagalToneTrend.thirtyDayGrowthDeltaPct}%`}{' '}
                  vs W1
                </span>
              </div>
            </div>

            <div
              data-testid="vagal-trend-kpi-resonant-days"
              className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]"
            >
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                RESONANT DAYS (≥75%)
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span
                  data-testid="vagal-trend-resonant-days-value"
                  className="text-xl font-mono font-bold text-[#F2B84B] tabular-nums"
                >
                  {vagalToneTrend.resonantDaysCount}/30d
                </span>
                <span className="text-[11px] font-mono text-[#D5E2DC] tabular-nums">
                  {vagalToneTrend.resonantDaysPct}% In-Zone
                </span>
              </div>
            </div>

            <div
              data-testid="vagal-trend-kpi-rmssd"
              className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]"
            >
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                EST. VAGAL RMSSD PROXY
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span
                  data-testid="vagal-trend-rmssd-value"
                  className="text-xl font-mono font-bold text-[#B794F4] tabular-nums"
                >
                  {vagalToneTrend.latestEstimatedRmssdMs}ms
                </span>
                <span className="text-[11px] font-mono text-[#A3B8B0] tabular-nums">
                  30d Avg {vagalToneTrend.meanEstimatedRmssdMs}ms
                </span>
              </div>
            </div>
          </div>

          {/* Recharts 30-Day Vagal Tone Trend ComposedChart Container */}
          <div
            data-testid="vagal-tone-trend-recharts-container"
            className="p-4 rounded-xl bg-[#091510] border border-[#1E3A2F] space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-[#68D391]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#68D391] inline-block" />
                  <span>Daily Vagal Coherence Score (%)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#4FD1C5]">
                  <span className="w-3.5 h-0.5 bg-[#4FD1C5] inline-block" />
                  <span>7-Day Rolling Parasympathetic Avg (%)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#F2B84B]">
                  <span className="w-3.5 h-0.5 border-t border-dashed border-[#F2B84B] inline-block" />
                  <span>0.1 Hz Clinical Vagal Target (75%)</span>
                </span>
              </div>
              <span className="text-[#A3B8B0] tabular-nums">
                Range: {displayedVagalDays[0]?.shortDateLabel} →{' '}
                {displayedVagalDays[displayedVagalDays.length - 1]?.shortDateLabel} (
                {displayedVagalDays.length} Days)
              </span>
            </div>

            <div className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart
                  data={displayedVagalDays}
                  margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="vagalTone30dAreaGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#68D391" stopOpacity={0.42} />
                      <stop offset="60%" stopColor="#4FD1C5" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#091510" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#1E3A2F"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortDateLabel"
                    interval={vagalWindowMode === '30d' ? 3 : 1}
                    stroke="#A3B8B0"
                    tick={{ fill: '#D5E2DC', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#1E3A2F' }}
                    axisLine={{ stroke: '#233D32' }}
                  />
                  <YAxis
                    domain={[40, 100]}
                    ticks={[40, 55, 70, 85, 100]}
                    tickFormatter={(val: number) => `${val}%`}
                    stroke="#68D391"
                    tick={{ fill: '#A3B8B0', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#233D32' }}
                    width={46}
                  />
                  <ReferenceLine
                    y={75}
                    stroke="#F2B84B"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => (
                      <text
                        x={(viewBox?.x ?? 46) + 8}
                        y={(viewBox?.y ?? 60) - 6}
                        fill="#F2B84B"
                        fontSize={10}
                        fontFamily="JetBrains Mono, monospace"
                        textAnchor="start"
                      >
                        75% Clinical Vagal Target
                      </text>
                    )}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) {
                        return null;
                      }
                      const dayRec = payload[0]?.payload as
                        | VagalToneDailyRecord
                        | undefined;
                      if (!dayRec) return null;
                      return (
                        <div
                          data-testid="vagal-tone-trend-tooltip"
                          className="p-3 rounded-xl bg-[#07120E]/95 border border-[#68D391]/60 shadow-xl font-mono text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-4 border-b border-[#1E3A2F] pb-1">
                            <span className="font-bold text-[#F4EFE6]">
                              Day {dayRec.dayIndex} · {dayRec.shortDateLabel} ({dayRec.dayOffsetLabel})
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded tabular-nums ${
                                dayRec.isResonantDay
                                  ? 'bg-[#143326] text-[#68D391]'
                                  : 'bg-[#10231C] text-[#4FD1C5]'
                              }`}
                            >
                              {dayRec.isResonantDay ? '✓ Resonant (≥75%)' : 'Calibrating'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[#68D391] tabular-nums">
                            <span>Daily Vagal Coherence:</span>
                            <span className="font-bold">{dayRec.vagalCoherenceScore}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[#4FD1C5] tabular-nums">
                            <span>7-Day Rolling Parasympathetic:</span>
                            <span className="font-semibold">{dayRec.rolling7DayAvgScore}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[#B794F4] tabular-nums">
                            <span>Est. Vagal RMSSD Proxy:</span>
                            <span className="font-semibold">{dayRec.estimatedRmssdMs} ms</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[#A3B8B0] pt-1 border-t border-[#1E3A2F] tabular-nums">
                            <span>0.1 Hz Paced Breath:</span>
                            <span>
                              {dayRec.coherenceSeconds.toFixed(1)}s ({dayRec.sessionCount} sess)
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vagalCoherenceScore"
                    name="Daily Vagal Coherence (%)"
                    stroke="#68D391"
                    strokeWidth={2.5}
                    fill="url(#vagalTone30dAreaGradient)"
                    isAnimationActive={false}
                    dot={{
                      r: 3,
                      fill: '#68D391',
                      stroke: '#091510',
                      strokeWidth: 1.2,
                    }}
                    activeDot={{
                      r: 5,
                      fill: '#68D391',
                      stroke: '#F4EFE6',
                      strokeWidth: 2,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rolling7DayAvgScore"
                    name="7-Day Rolling Parasympathetic Avg (%)"
                    stroke="#4FD1C5"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1E3A2F] text-[11px] font-mono text-[#A3B8B0]">
              <span data-testid="vagal-tone-clinical-summary">
                {vagalToneTrend.clinicalSummaryNote}
              </span>
              <span className="text-[#68D391] tabular-nums">
                Latest: {vagalToneTrend.latestCoherencePct}% ({vagalToneTrend.latestEstimatedRmssdMs}ms RMSSD)
              </span>
            </div>
          </div>
        </section>

        {/* 1B. D3.js 'Neuro-Projection Graph' — 6-Month Cognitive Reserve Growth Trajectory */}
        <section
          aria-labelledby="neuro-projection-heading"
          data-testid="clinical-codex-neuro-projection-chart"
          data-baseline-reserve={neuroProjection.baselineReserveIndex}
          data-month-six-reserve={neuroProjection.monthSixProjectedReserveIndex}
          data-net-reserve-gain={neuroProjection.netSixMonthReserveGain}
          data-habit-adherence-pct={neuroProjection.habitAdherencePct}
          className="mt-6 p-5 rounded-xl bg-[#0B1914] border border-[#2C4C3E] space-y-4 codex-section-cascade"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#B794F4]">
                  6-Month Longitudinal Forecast · Practice &amp; Habit Adherence Model
                </span>
                <span
                  data-testid="neuro-projection-tier-badge"
                  className="px-2 py-0.5 rounded bg-[#1A1633] text-[#E9D8FD] border border-[#B794F4]/50 text-[10px] font-mono font-semibold tabular-nums"
                >
                  ✦ {neuroProjection.trajectoryTierLabel} (+{neuroProjection.netSixMonthReserveGain} pts in 6 Mos)
                </span>
              </div>
              <h3
                id="neuro-projection-heading"
                className="text-lg font-display font-semibold text-[#F4EFE6] mt-0.5"
              >
                Neuro-Projection Graph: 6-Month Cognitive Reserve Growth (D3.js Visualization)
              </h3>
              <p className="text-xs text-[#A3B8B0] mt-0.5">
                Forecasts your 24-week Cognitive Reserve Index, anterior hippocampal BDNF volume gain, and UFOV speed protection based on your historical sessions and daily habit adherence.
              </p>
            </div>

            <button
              type="button"
              data-testid="toggle-optimal-projection-btn"
              aria-pressed={simulateOptimalHabits}
              onClick={() => setSimulateOptimalHabits((prev) => !prev)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                simulateOptimalHabits
                  ? 'bg-[#201A3A] text-[#F2B84B] border-[#F2B84B]'
                  : 'bg-[#152E24] hover:bg-[#1E3F32] text-[#4FD1C5] border-[#2C4C3E]'
              }`}
            >
              {simulateOptimalHabits
                ? '★ Showing 100% Habit Mastery Ceiling'
                : 'Preview 100% Habit Adherence'}
            </button>
          </div>

          {/* 4 Tabular-Nums 6-Month Cognitive Reserve Projection KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]">
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                BASELINE → 6-MO RESERVE
              </div>
              <div
                data-testid="neuro-projection-kpi-reserve"
                className="text-xl font-mono font-bold text-[#4FD1C5] tabular-nums"
              >
                {neuroProjection.baselineReserveIndex} → {neuroProjection.monthSixProjectedReserveIndex}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]">
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                HABIT ADHERENCE SCORE
              </div>
              <div
                data-testid="neuro-projection-kpi-adherence"
                className="text-xl font-mono font-bold text-[#F2B84B] tabular-nums"
              >
                {neuroProjection.habitAdherencePct}%
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]">
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                6-MO HIPPOCAMPAL BDNF
              </div>
              <div
                data-testid="neuro-projection-kpi-bdnf"
                className="text-xl font-mono font-bold text-[#B794F4] tabular-nums"
              >
                +{neuroProjection.projectedHippocampalVolumeGainPct}%
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#10231C] border border-[#1E3A2F]">
              <div className="text-[10px] font-mono uppercase text-[#A3B8B0]">
                UFOV SPEED PROTECTION
              </div>
              <div
                data-testid="neuro-projection-kpi-ufov"
                className="text-xl font-mono font-bold text-[#68D391] tabular-nums"
              >
                +{neuroProjection.projectedDementiaRiskReductionPct}%
              </div>
            </div>
          </div>

          {/* D3 Responsive SVG 6-Month Neuro-Projection Graph */}
          <div className="w-full overflow-x-auto pt-1">
            <svg
              ref={projectionSvgRef}
              data-testid="neuro-projection-d3-svg"
              viewBox="0 0 760 260"
              role="img"
              aria-label="D3 Neuro-Projection Graph visualizing projected 6-month cognitive reserve growth from Now through Month 6"
              className="w-full h-auto min-w-[540px] select-none"
            />
          </div>

          {/* Legend & Interactive Month Inspector Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1E3A2F] text-xs font-mono text-[#A3B8B0] tabular-nums">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-[#4FD1C5]">
                <span className="w-3 h-0.5 bg-[#4FD1C5] inline-block" />
                <span>Projected Reserve ({neuroProjection.habitAdherencePct}% Adherence)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#F2B84B]">
                <span className="w-3 h-0.5 bg-[#F2B84B] inline-block" />
                <span>100% Habit Ceiling ({neuroProjection.monthSixOptimalReserveIndex}/100)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#526B61]">
                <span className="w-3 h-0.5 bg-[#526B61] inline-block" />
                <span>Untrained Baseline</span>
              </span>
            </div>

            {activeProjectionInspect && (
              <div data-testid="neuro-projection-month-inspector" className="text-[#D5E2DC]">
                <strong className="text-[#F4EFE6]">
                  {activeProjectionInspect.fullMonthTitle}:
                </strong>{' '}
                <span className="text-[#4FD1C5] font-semibold">
                  {activeProjectionInspect.projectedReserveIndex}/100 Reserve
                </span>
                {' · '}
                <span className="text-[#B794F4]">
                  +{activeProjectionInspect.hippocampalBdnfGainPct}% BDNF Vol
                </span>
                {' · '}
                <span className="text-[#68D391]">
                  +{activeProjectionInspect.ufovSpeedProtectionPct}% UFOV Protection
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 2. 4-Domain Cognitive Reserve & Neuroplasticity Profile */}
        <section
          aria-label="4-Domain Cognitive Reserve Profile"
          data-testid="cognitive-domain-profile"
          className="mt-6 p-5 rounded-xl bg-[#0B1914] border border-[#233D32] space-y-4 codex-section-cascade"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#B794F4]">
                Multi-Domain Neuroplasticity Assessment
              </span>
              <h3 className="text-lg font-display font-semibold text-[#F4EFE6]">
                4-Domain Cognitive Reserve &amp; Synaptic Plasticity Matrix
              </h3>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <div className="text-right">
                <div className="text-[10px] text-[#A3B8B0] uppercase">COMPOSITE RESERVE INDEX</div>
                <div className="text-xl font-bold text-[#F2B84B] tabular-nums">
                  {domainProfile.compositeReserveIndex} / 100
                </div>
              </div>
              <div className="text-right pl-4 border-l border-[#1E3A2F]">
                <div className="text-[10px] text-[#A3B8B0] uppercase">EST. PLASTICITY GAIN</div>
                <div className="text-xl font-bold text-[#68D391] tabular-nums">
                  +{domainProfile.estimatedPlasticityGainPct}%
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {domainProfile.domains.map((dom) => (
              <div
                key={dom.id}
                className="p-3.5 rounded-lg bg-[#10231C] border border-[#1E3A2F] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[#F4EFE6]">{dom.label}</div>
                    <div className="text-[10px] font-mono text-[#A3B8B0]">
                      {dom.clinicalTargetLabel} · {dom.citationShort}
                    </div>
                  </div>
                  <span
                    className="text-base font-mono font-bold tabular-nums"
                    style={{ color: dom.accentHex }}
                  >
                    {dom.scorePct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#091510] overflow-hidden border border-[#1E3A2F]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${dom.scorePct}%`,
                      backgroundColor: dom.accentHex,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2B. PERSONAL WEEKLY COGNITIVE GOALS (N-Back Accuracy & UFOV Speed + Progress Bars) */}
        <section
          aria-labelledby="cognitive-goals-heading"
          data-testid="clinical-codex-cognitive-goals"
          data-goals-met-count={goalsProgress.goalsMetCount}
          data-overall-goal-completion-pct={goalsProgress.overallCompletionPct}
          data-nback-target-pct={goalsProgress.nBackGoal.targetAccuracyPct}
          data-nback-progress-pct={goalsProgress.nBackGoal.progressPct}
          data-ufov-target-ms={goalsProgress.ufovGoal.targetSpeedMs}
          data-ufov-progress-pct={goalsProgress.ufovGoal.progressPct}
          className="mt-6 p-5 rounded-xl bg-[#0B1914] border border-[#233D32] space-y-4 codex-section-cascade"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#A3B8B0]">
                <span className="uppercase tracking-wider text-[#4FD1C5]">
                  Personal Weekly Targets · Psychometric Calibration
                </span>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="cognitive-goals-summary-status"
                  className="text-[#F2B84B] font-semibold tabular-nums"
                >
                  {goalsProgress.weeklySummaryBadge}
                </span>
              </div>
              <h3
                id="cognitive-goals-heading"
                className="text-lg font-display font-semibold text-[#F4EFE6] mt-0.5"
              >
                Cognitive Goals: Weekly N-Back Accuracy &amp; UFOV Speed
              </h3>
              <p className="text-xs text-[#A3B8B0] mt-0.5">
                Set personal weekly targets for N-Back working memory accuracy and UFOV peripheral processing speed. Progress bars update automatically and persist across sessions.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="cognitive-goals-log-drill-btn"
                onClick={() =>
                  updateWeeklyGoalsConfig((prev) => ({
                    weeklyPracticeBoostSessions: Math.min(
                      14,
                      prev.weeklyPracticeBoostSessions + 1
                    ),
                  }))
                }
                className="px-3.5 py-2 rounded-lg bg-[#152E24] hover:bg-[#1E3F32] text-[#68D391] border border-[#2C4C3E] text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                +1 Weekly Drill ({goalsProgress.config.weeklyPracticeBoostSessions} Logged)
              </button>
              <button
                type="button"
                data-testid="cognitive-goals-reset-btn"
                onClick={() =>
                  updateWeeklyGoalsConfig(() => DEFAULT_WEEKLY_COGNITIVE_GOALS)
                }
                className="px-3 py-2 rounded-lg bg-[#10231C] hover:bg-[#173228] text-[#A3B8B0] hover:text-[#F4EFE6] border border-[#1E3A2F] text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Reset Targets
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
            {/* Goal Card 1: Weekly N-Back Working Memory Accuracy (%) */}
            <div
              data-testid="cognitive-goal-card-nback"
              className="p-4 rounded-xl bg-[#10231C] border border-[#1E3A2F] space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#F4EFE6]">
                    {goalsProgress.nBackGoal.title}
                  </div>
                  <div className="text-xs font-mono text-[#A3B8B0] mt-0.5 whitespace-nowrap">
                    Current:{' '}
                    <span
                      data-testid="nback-goal-current-value"
                      className="text-[#F4EFE6] font-semibold tabular-nums"
                    >
                      {goalsProgress.nBackGoal.currentAccuracyPct}%
                    </span>
                    {' · '}
                    Target:{' '}
                    <span
                      data-testid="nback-goal-target-value"
                      className="text-[#4FD1C5] font-semibold tabular-nums"
                    >
                      {goalsProgress.nBackGoal.targetAccuracyPct}%
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <div
                    data-testid="nback-goal-progress-label"
                    className="text-xl font-bold text-[#4FD1C5] tabular-nums"
                  >
                    {goalsProgress.nBackGoal.progressPct}%
                  </div>
                  <div
                    data-testid="nback-goal-status-label"
                    className={`text-[11px] font-semibold whitespace-nowrap ${
                      goalsProgress.nBackGoal.isGoalMet
                        ? 'text-[#68D391]'
                        : 'text-[#F2B84B]'
                    }`}
                  >
                    {goalsProgress.nBackGoal.statusLabel}
                  </div>
                </div>
              </div>

              {/* N-Back Accuracy Progress Bar */}
              <div className="space-y-1.5">
                <div
                  role="progressbar"
                  aria-label="Weekly N-Back accuracy goal progress"
                  aria-valuenow={goalsProgress.nBackGoal.progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  data-testid="cognitive-goal-nback-progress-bar"
                  className="w-full h-3 rounded-full bg-[#091510] overflow-hidden border border-[#1E3A2F]"
                >
                  <div
                    data-testid="cognitive-goal-nback-progress-fill"
                    className="h-full rounded-full transition-transform duration-150 origin-left"
                    style={{
                      width: `${goalsProgress.nBackGoal.progressPct}%`,
                      backgroundColor: goalsProgress.nBackGoal.isGoalMet
                        ? '#68D391'
                        : '#4FD1C5',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#A3B8B0] tabular-nums whitespace-nowrap">
                  <span data-testid="nback-goal-delta-text">
                    {goalsProgress.nBackGoal.deltaSummaryText}
                  </span>
                  <span>Range: 65–98%</span>
                </div>
              </div>

              {/* Interactive Weekly N-Back Target Slider & Quick Presets */}
              <div className="pt-2 border-t border-[#1E3A2F] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="nback-goal-target-slider"
                    className="text-xs font-mono text-[#D5E2DC]"
                  >
                    Adjust Weekly N-Back Target (%)
                  </label>
                  <span className="text-xs font-mono font-bold text-[#4FD1C5] tabular-nums">
                    {goalsProgress.nBackGoal.targetAccuracyPct}%
                  </span>
                </div>
                <input
                  id="nback-goal-target-slider"
                  data-testid="nback-goal-target-slider"
                  type="range"
                  min={65}
                  max={98}
                  step={1}
                  value={goalsProgress.nBackGoal.targetAccuracyPct}
                  onChange={(e) =>
                    updateWeeklyGoalsConfig(() => ({
                      targetNBackAccuracyPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#4FD1C5] cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { pct: 75, label: '75% Base' },
                    { pct: 85, label: '85% Goal' },
                    { pct: 92, label: '92% High' },
                    { pct: 96, label: '96% Apex' },
                  ].map((preset) => {
                    const isSelected =
                      goalsProgress.nBackGoal.targetAccuracyPct === preset.pct;
                    return (
                      <button
                        key={preset.pct}
                        type="button"
                        data-testid={`nback-preset-${preset.pct}`}
                        onClick={() =>
                          updateWeeklyGoalsConfig(() => ({
                            targetNBackAccuracyPct: preset.pct,
                          }))
                        }
                        className={`px-1.5 py-1 rounded-md text-[10px] font-mono font-semibold border transition-colors whitespace-nowrap shrink-0 text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#173A38] text-[#4FD1C5] border-[#4FD1C5]'
                            : 'bg-[#0B1914] text-[#A3B8B0] border-[#1E3A2F] hover:text-[#F4EFE6]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#A3B8B0] leading-relaxed">
                  {goalsProgress.nBackGoal.clinicalBenchmarkNote}
                </p>
              </div>
            </div>

            {/* Goal Card 2: Weekly UFOV Visual Processing Speed (ms) */}
            <div
              data-testid="cognitive-goal-card-ufov"
              className="p-4 rounded-xl bg-[#10231C] border border-[#1E3A2F] space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#F4EFE6]">
                    {goalsProgress.ufovGoal.title}
                  </div>
                  <div className="text-xs font-mono text-[#A3B8B0] mt-0.5 whitespace-nowrap">
                    Current:{' '}
                    <span
                      data-testid="ufov-goal-current-value"
                      className="text-[#F4EFE6] font-semibold tabular-nums"
                    >
                      {goalsProgress.ufovGoal.currentSpeedMs}ms
                    </span>
                    {' · '}
                    Target:{' '}
                    <span
                      data-testid="ufov-goal-target-value"
                      className="text-[#F2B84B] font-semibold tabular-nums"
                    >
                      ≤{goalsProgress.ufovGoal.targetSpeedMs}ms
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <div
                    data-testid="ufov-goal-progress-label"
                    className="text-xl font-bold text-[#F2B84B] tabular-nums"
                  >
                    {goalsProgress.ufovGoal.progressPct}%
                  </div>
                  <div
                    data-testid="ufov-goal-status-label"
                    className={`text-[11px] font-semibold whitespace-nowrap ${
                      goalsProgress.ufovGoal.isGoalMet
                        ? 'text-[#68D391]'
                        : 'text-[#F2B84B]'
                    }`}
                  >
                    {goalsProgress.ufovGoal.statusLabel}
                  </div>
                </div>
              </div>

              {/* UFOV Speed Progress Bar */}
              <div className="space-y-1.5">
                <div
                  role="progressbar"
                  aria-label="Weekly UFOV visual processing speed goal progress"
                  aria-valuenow={goalsProgress.ufovGoal.progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  data-testid="cognitive-goal-ufov-progress-bar"
                  className="w-full h-3 rounded-full bg-[#091510] overflow-hidden border border-[#1E3A2F]"
                >
                  <div
                    data-testid="cognitive-goal-ufov-progress-fill"
                    className="h-full rounded-full transition-transform duration-150 origin-left"
                    style={{
                      width: `${goalsProgress.ufovGoal.progressPct}%`,
                      backgroundColor: goalsProgress.ufovGoal.isGoalMet
                        ? '#68D391'
                        : '#F2B84B',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#A3B8B0] tabular-nums whitespace-nowrap">
                  <span data-testid="ufov-goal-delta-text">
                    {goalsProgress.ufovGoal.deltaSummaryText}
                  </span>
                  <span>Range: 260–620ms</span>
                </div>
              </div>

              {/* Interactive Weekly UFOV Speed Target Slider & Quick Presets */}
              <div className="pt-2 border-t border-[#1E3A2F] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="ufov-goal-target-slider"
                    className="text-xs font-mono text-[#D5E2DC]"
                  >
                    Adjust Weekly UFOV Speed Target (ms)
                  </label>
                  <span className="text-xs font-mono font-bold text-[#F2B84B] tabular-nums">
                    ≤{goalsProgress.ufovGoal.targetSpeedMs}ms
                  </span>
                </div>
                <input
                  id="ufov-goal-target-slider"
                  data-testid="ufov-goal-target-slider"
                  type="range"
                  min={260}
                  max={620}
                  step={10}
                  value={goalsProgress.ufovGoal.targetSpeedMs}
                  onChange={(e) =>
                    updateWeeklyGoalsConfig(() => ({
                      targetUfovSpeedMs: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#F2B84B] cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { ms: 520, label: '520ms Base' },
                    { ms: 420, label: '420ms Goal' },
                    { ms: 360, label: '360ms Fast' },
                    { ms: 300, label: '300ms Peak' },
                  ].map((preset) => {
                    const isSelected =
                      goalsProgress.ufovGoal.targetSpeedMs === preset.ms;
                    return (
                      <button
                        key={preset.ms}
                        type="button"
                        data-testid={`ufov-preset-${preset.ms}`}
                        onClick={() =>
                          updateWeeklyGoalsConfig(() => ({
                            targetUfovSpeedMs: preset.ms,
                          }))
                        }
                        className={`px-1.5 py-1 rounded-md text-[10px] font-mono font-semibold border transition-colors whitespace-nowrap shrink-0 text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#2C2412] text-[#F2B84B] border-[#F2B84B]'
                            : 'bg-[#0B1914] text-[#A3B8B0] border-[#1E3A2F] hover:text-[#F4EFE6]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#A3B8B0] leading-relaxed">
                  {goalsProgress.ufovGoal.clinicalBenchmarkNote}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* NEURO-NUTRITION & GLYMPHATIC SLEEP HYGIENE CLINICAL PROTOCOLS */}
        <section
          aria-labelledby="neuro-nutrition-heading"
          data-testid="neuro-nutrition-section"
          className="mt-6 p-5 rounded-xl bg-[#0B1914] border border-[#233D32] space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#68D391]">
                Biological Foundation · Diet, Polyphenols, Omega-3 DHA &amp; Glymphatic Sleep
              </span>
              <h3
                id="neuro-nutrition-heading"
                className="text-lg font-display font-semibold text-[#F4EFE6]"
              >
                Neuro-Nutrition Tip &amp; Sleep Hygiene Protocols for Synaptic Plasticity
              </h3>
              <p className="text-xs text-[#A3B8B0] mt-0.5">
                Actionable metabolic and circadian interventions that upregulate endogenous BDNF and clear neural metabolites. Check off habits practiced today for an in-sanctuary BDNF Nectar synergy boost.
              </p>
            </div>

            {/* Biological Readiness & In-Sanctuary Synergy Badge */}
            <div className="px-3.5 py-2 rounded-xl bg-[#10231C] border border-[#2C4C3E] text-right font-mono shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-[#A3B8B0]">
                BIOLOGICAL READINESS SYNERGY
              </div>
              <div className="flex items-baseline justify-end gap-2 mt-0.5">
                <span className="text-lg font-bold text-[#68D391] tabular-nums">
                  {neuroSynergy.bonusNectarMultiplier.toFixed(2)}x BDNF
                </span>
                <span className="text-xs text-[#F2B84B] tabular-nums">
                  ({neuroSynergy.completedCount}/{neuroSynergy.totalCount} Habits · +{neuroSynergy.startingNectarBonus} Start Nectar)
                </span>
              </div>
            </div>
          </div>

          {/* Filter Tabs: All Pillars / Neuro-Nutrition & Diet / Glymphatic Sleep Hygiene */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1E3A2F]">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: 'All Protocols (4)' },
                  { id: 'diet', label: 'Neuro-Nutrition & Diet (2)' },
                  { id: 'sleep', label: 'Glymphatic Sleep Hygiene (2)' },
                ] as const
              ).map((tab) => {
                const active = lifestyleCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-testid={`neuro-filter-${tab.id}`}
                    onClick={() => setLifestyleCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer border ${
                      active
                        ? 'bg-[#1D4032] text-[#F4EFE6] border-[#68D391]'
                        : 'bg-[#10231C] text-[#A3B8B0] border-[#1E3A2F] hover:text-[#F4EFE6]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-mono text-[#68D391]">
              {neuroSynergy.statusLabel}
            </span>
          </div>

          {/* Actionable Neuro-Nutrition & Sleep Hygiene Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredLifestyleTips.map((tip) => {
              const isCompleted = completedHabitIds.includes(tip.id);
              const tipTooltipText = `${tip.title} — Clinical Benefit: ${tip.mechanismSummary} (${tip.citation})`;
              return (
                <div
                  key={tip.id}
                  data-testid={`neuro-tip-card-${tip.id}`}
                  title={tipTooltipText}
                  className={`p-4 rounded-xl border transition-colors flex flex-col justify-between space-y-3 ${
                    isCompleted
                      ? 'bg-[#122A20] border-[#68D391]/70'
                      : 'bg-[#10231C] border-[#1E3A2F]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#091510]"
                        style={{ backgroundColor: tip.accentHex }}
                      >
                        {tip.categoryBadge}
                      </span>
                      {onToggleHabitId && (
                        <button
                          type="button"
                          data-testid={`neuro-habit-toggle-${tip.id}`}
                          title={tipTooltipText}
                          onClick={() => onToggleHabitId(tip.id)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer border ${
                            isCompleted
                              ? 'bg-[#68D391] text-[#091510] border-[#68D391]'
                              : 'bg-[#0B1914] text-[#A3B8B0] border-[#2C4C3E] hover:text-[#F4EFE6]'
                          }`}
                        >
                          {isCompleted ? '✓ Practiced Today (+5%)' : '+ Log Daily Habit'}
                        </button>
                      )}
                    </div>

                    <h4 className="text-sm font-display font-semibold text-[#F4EFE6]">
                      {tip.title}
                    </h4>

                    <div className="text-[11px] font-mono text-[#68D391]">
                      <span>{tip.biomarkerTarget}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="text-[#A3B8B0]">{tip.citation}</span>
                    </div>

                    <p className="text-xs text-[#D5E2DC] leading-relaxed">
                      <strong className="text-[#F4EFE6]">Biological Mechanism:</strong>{' '}
                      {tip.mechanismSummary}
                    </p>

                    <div className="p-2.5 rounded-lg bg-[#091510]/85 border border-[#1E3A2F] text-xs text-[#F2B84B] leading-relaxed">
                      <strong className="text-[#F4EFE6]">Actionable Daily Protocol:</strong>{' '}
                      {tip.actionableProtocol}
                    </div>
                  </div>

                  <div className="pt-1 border-t border-[#1E3A2F] flex items-center justify-between text-[10px] font-mono text-[#4FD1C5]">
                    <span>{tip.synergyLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* WEEKLY HABIT COMPLIANCE CHART (RECHARTS 7-DAY NSDR & COGNITIVE REFRAMING TREND) */}
          <div
            data-testid="weekly-habit-compliance-section"
            className="mt-4 pt-4 border-t border-[#233D32] space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#4FD1C5]">
                  7-Day Restorative Adherence Analytics · Recharts Telemetry
                </span>
                <h4 className="text-base font-display font-semibold text-[#F4EFE6]">
                  Weekly Habit Compliance — NSDR &amp; Cognitive Reframing (Last 7 Days)
                </h4>
                <p className="text-xs text-[#A3B8B0] mt-0.5">
                  Tracks daily completion of 20m Non-Sleep Deep Rest (NSDR) and 5m Daily Cognitive Reframing across the past 7 days alongside your rolling compliance trajectory.
                </p>
              </div>

              <div
                data-testid="weekly-compliance-trend-badge"
                className="px-3.5 py-2 rounded-xl bg-[#10231C] border border-[#2C4C3E] font-mono text-right shrink-0"
              >
                <div className="text-[10px] uppercase tracking-wider text-[#A3B8B0]">
                  7-DAY COMPLIANCE TRAJECTORY
                </div>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  <span
                    data-testid="weekly-overall-compliance-pct"
                    className="text-sm font-bold text-[#68D391] tabular-nums"
                  >
                    {weeklyCompliance.overallWeeklyCompliancePct}% Weekly Compliance
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#163428] text-[#F2B84B] text-[11px] font-semibold border border-[#F2B84B]/40 tabular-nums">
                    {weeklyCompliance.totalCombinedSessions}/{weeklyCompliance.maxPossibleSessions} Sessions
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Summary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div
                data-testid="weekly-kpi-nsdr"
                className="p-3 rounded-xl bg-[#10231C] border border-[#1E3A2F] space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  <span>20m NSDR Sessions</span>
                  <span className="w-2 h-2 rounded-full bg-[#4FD1C5]" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    data-testid="weekly-nsdr-compliance-pct"
                    className="text-lg font-mono font-bold text-[#4FD1C5] tabular-nums"
                  >
                    {weeklyCompliance.nsdrWeeklyCompliancePct}%
                  </span>
                  <span className="text-[11px] font-mono text-[#D5E2DC] tabular-nums">
                    {weeklyCompliance.totalNsdrSessions}/7d · {weeklyCompliance.totalNsdrSessions * 20}m
                  </span>
                </div>
              </div>

              <div
                data-testid="weekly-kpi-reframing"
                className="p-3 rounded-xl bg-[#10231C] border border-[#1E3A2F] space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  <span>5m Reframing</span>
                  <span className="w-2 h-2 rounded-full bg-[#B794F4]" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    data-testid="weekly-reframing-compliance-pct"
                    className="text-lg font-mono font-bold text-[#B794F4] tabular-nums"
                  >
                    {weeklyCompliance.cognitiveReframingWeeklyCompliancePct}%
                  </span>
                  <span className="text-[11px] font-mono text-[#D5E2DC] tabular-nums">
                    {weeklyCompliance.totalCognitiveReframingSessions}/7d · {weeklyCompliance.totalCognitiveReframingSessions * 5}m
                  </span>
                </div>
              </div>

              <div
                data-testid="weekly-kpi-synergy"
                className="p-3 rounded-xl bg-[#10231C] border border-[#1E3A2F] space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  <span>Dual-Habit Synergy</span>
                  <span className="w-2 h-2 rounded-full bg-[#68D391]" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    data-testid="weekly-dual-synergy-days"
                    className="text-lg font-mono font-bold text-[#68D391] tabular-nums"
                  >
                    {weeklyCompliance.dualSynergyDaysCount}/7 Days
                  </span>
                  <span className="text-[11px] font-mono text-[#D5E2DC] tabular-nums">
                    Both Logged
                  </span>
                </div>
              </div>

              <div
                data-testid="weekly-kpi-minutes"
                className="p-3 rounded-xl bg-[#10231C] border border-[#1E3A2F] space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  <span>Restorative Volume</span>
                  <span className="w-2 h-2 rounded-full bg-[#F2B84B]" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    data-testid="weekly-total-minutes"
                    className="text-lg font-mono font-bold text-[#F2B84B] tabular-nums"
                  >
                    {weeklyCompliance.totalRestorativeMinutes}m
                  </span>
                  <span className="text-[11px] font-mono text-[#D5E2DC] tabular-nums">
                    7-Day Total
                  </span>
                </div>
              </div>
            </div>

            {/* Recharts 7-Day ComposedChart Container */}
            <div
              data-testid="weekly-habit-compliance-chart"
              className="p-4 rounded-xl bg-[#091510] border border-[#1E3A2F] space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
                  <span className="inline-flex items-center gap-1.5 text-[#4FD1C5]">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#4FD1C5] inline-block" />
                    20m NSDR Session (0–1/day)
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[#B794F4]">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#B794F4] inline-block" />
                    5m Cognitive Reframing (0–1/day)
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[#F2B84B]">
                    <span className="w-3 h-0.5 bg-[#F2B84B] inline-block" />
                    Rolling 3-Day Compliance Trend (%)
                  </span>
                </div>

                {/* Quick Today Sync Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                    Today (Day 7):
                  </span>
                  <button
                    type="button"
                    data-testid="weekly-chart-toggle-today-nsdr"
                    onClick={() => handleExerciseToggleClick('nsdr_protocol')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer border ${
                      activeNsdrCompleted
                        ? 'bg-[#173A38] text-[#4FD1C5] border-[#4FD1C5]'
                        : 'bg-[#10231C] text-[#A3B8B0] border-[#233D32] hover:text-[#F4EFE6]'
                    }`}
                  >
                    {activeNsdrCompleted ? '✓ NSDR Logged' : '+ Log Today NSDR'}
                  </button>
                  <button
                    type="button"
                    data-testid="weekly-chart-toggle-today-reframing"
                    onClick={() => handleExerciseToggleClick('cognitive_reframing')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer border ${
                      activeReframingCompleted
                        ? 'bg-[#261E3A] text-[#B794F4] border-[#B794F4]'
                        : 'bg-[#10231C] text-[#A3B8B0] border-[#233D32] hover:text-[#F4EFE6]'
                    }`}
                  >
                    {activeReframingCompleted ? '✓ Reframing Logged' : '+ Log Today Reframing'}
                  </button>
                </div>
              </div>

              <div className="w-full h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={weeklyCompliance.days}
                    margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke="#1E3A2F"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="shortDayLabel"
                      stroke="#A3B8B0"
                      tick={{ fill: '#D5E2DC', fontSize: 11, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#1E3A2F' }}
                      axisLine={{ stroke: '#233D32' }}
                    />
                    <YAxis
                      yAxisId="sessions"
                      domain={[0, 1.25]}
                      ticks={[0, 1]}
                      tickFormatter={(val: number) => `${val} sess`}
                      stroke="#4FD1C5"
                      tick={{ fill: '#A3B8B0', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={false}
                      axisLine={{ stroke: '#233D32' }}
                      width={52}
                    />
                    <YAxis
                      yAxisId="pct"
                      orientation="right"
                      domain={[0, 100]}
                      ticks={[0, 50, 100]}
                      tickFormatter={(val: number) => `${val}%`}
                      stroke="#F2B84B"
                      tick={{ fill: '#F2B84B', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={false}
                      axisLine={{ stroke: '#233D32' }}
                      width={44}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) {
                          return null;
                        }
                        const dayPoint = payload[0]?.payload as
                          | (typeof weeklyCompliance.days)[number]
                          | undefined;
                        if (!dayPoint) return null;
                        return (
                          <div
                            data-testid="weekly-compliance-chart-tooltip"
                            className="p-3 rounded-xl bg-[#07120E]/95 border border-[#4FD1C5]/60 shadow-xl font-mono text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-4 border-b border-[#1E3A2F] pb-1">
                              <span className="font-bold text-[#F4EFE6]">
                                {dayPoint.shortDayLabel} ({dayPoint.dateOffsetLabel})
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10231C] text-[#68D391] tabular-nums">
                                {dayPoint.dailyCompliancePct}% Daily
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-[#4FD1C5] tabular-nums">
                              <span>20m NSDR Protocol:</span>
                              <span className="font-semibold">
                                {dayPoint.nsdrSessions === 1
                                  ? '✓ 1 Session (20m)'
                                  : '0 Sessions (0m)'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-[#B794F4] tabular-nums">
                              <span>5m Cognitive Reframing:</span>
                              <span className="font-semibold">
                                {dayPoint.cognitiveReframingSessions === 1
                                  ? '✓ 1 Session (5m)'
                                  : '0 Sessions (0m)'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-[#F2B84B] pt-1 border-t border-[#1E3A2F] tabular-nums">
                              <span>3-Day Rolling Trend:</span>
                              <span className="font-bold">
                                {dayPoint.rollingComplianceTrendPct}%
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      yAxisId="sessions"
                      dataKey="nsdrSessions"
                      name="20m NSDR Session"
                      fill="#4FD1C5"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                      isAnimationActive={false}
                    />
                    <Bar
                      yAxisId="sessions"
                      dataKey="cognitiveReframingSessions"
                      name="5m Cognitive Reframing"
                      fill="#B794F4"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="rollingComplianceTrendPct"
                      name="Rolling Compliance Trend (%)"
                      stroke="#F2B84B"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        fill: '#F2B84B',
                        stroke: '#091510',
                        strokeWidth: 1.5,
                      }}
                      activeDot={{
                        r: 6,
                        fill: '#68D391',
                        stroke: '#091510',
                        strokeWidth: 2,
                      }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 7-Day Daily Status Matrix Strip & Clinical Interpretation */}
              <div className="pt-2 border-t border-[#1E3A2F] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <span
                  data-testid="weekly-compliance-clinical-note"
                  className="text-[#D5E2DC]"
                >
                  {weeklyCompliance.clinicalInterpretation}
                </span>
                <span className="text-[#F2B84B] tabular-nums shrink-0">
                  {weeklyCompliance.trendHeadline}
                </span>
              </div>
            </div>
          </div>

          {/* DAILY RESTORATIVE HABIT TRACKER: NON-SLEEP DEEP REST (NSDR) & DAILY COGNITIVE REFRAMING (SYNCED WITH DAILY STREAK) */}
          <div
            data-testid="daily-habit-tracker-panel"
            className="mt-4 pt-4 border-t border-[#233D32] space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#F2B84B]">
                  Daily Mind-Body Habit Tracker · Synced with Daily Practice Streak
                </span>
                <h4 className="text-base font-display font-semibold text-[#F4EFE6]">
                  Non-Sleep Deep Rest (NSDR) &amp; Daily Cognitive Reframing Log
                </h4>
                <p className="text-xs text-[#A3B8B0]">
                  Completing either daily mind-body exercise automatically logs and synchronizes with your consecutive Daily Streak state.
                </p>
              </div>

              <div
                data-testid="habit-tracker-streak-sync"
                className="px-3.5 py-2 rounded-xl bg-[#10231C] border border-[#F2B84B]/50 font-mono text-right shrink-0"
              >
                <div className="text-[10px] uppercase tracking-wider text-[#F2B84B]">
                  DAILY STREAK SYNCHRONIZATION
                </div>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  <span className="text-sm font-bold text-[#F4EFE6] tabular-nums">
                    {syncedStreakDisplay}-Day Active Streak
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#18382B] text-[#68D391] text-[11px] font-semibold border border-[#68D391]/40 tabular-nums">
                    {completedExerciseCount}/2 Logged Today
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {DAILY_HABIT_EXERCISES.map((exercise) => {
                const isExerciseDone =
                  exercise.id === 'nsdr_protocol'
                    ? activeNsdrCompleted
                    : activeReframingCompleted;
                const itemProgress =
                  habitDurationProgress.byExerciseId[exercise.id];
                const tooltipData = getDailyHabitClinicalTooltip(exercise.id);
                const isTooltipOpen =
                  hoveredHabitTooltipId === exercise.id ||
                  pinnedHabitTooltipId === exercise.id;
                const tooltipDomId = `habit-clinical-tooltip-${exercise.id}`;

                return (
                  <div
                    key={exercise.id}
                    data-testid={`habit-exercise-card-${exercise.id}`}
                    title={tooltipData.formattedTooltipText}
                    onMouseEnter={() => setHoveredHabitTooltipId(exercise.id)}
                    onMouseLeave={() =>
                      setHoveredHabitTooltipId((prev) =>
                        prev === exercise.id ? null : prev
                      )
                    }
                    className={`relative p-4 rounded-xl border transition-colors flex flex-col justify-between space-y-3 ${
                      itemProgress.isGoalMet || isExerciseDone
                        ? 'bg-[#132E23] border-[#68D391]'
                        : 'bg-[#10231C] border-[#1E3A2F]'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#091510]"
                            style={{ backgroundColor: exercise.accentHex }}
                          >
                            {exercise.protocolBadge}
                          </span>
                          <span className="text-[10px] font-mono text-[#A3B8B0]">
                            Goal: {itemProgress.goalMinutes} Min/Day
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            data-testid={`habit-tooltip-trigger-${exercise.id}`}
                            aria-describedby={tooltipDomId}
                            aria-expanded={isTooltipOpen}
                            title={tooltipData.formattedTooltipText}
                            onFocus={() => setHoveredHabitTooltipId(exercise.id)}
                            onBlur={() =>
                              setHoveredHabitTooltipId((prev) =>
                                prev === exercise.id ? null : prev
                              )
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              setPinnedHabitTooltipId((prev) =>
                                prev === exercise.id ? null : exercise.id
                              );
                            }}
                            className={`px-2 py-1 rounded-md border text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                              isTooltipOpen
                                ? 'bg-[#17382C] text-[#68D391] border-[#68D391]'
                                : 'bg-[#0B1914] hover:bg-[#163025] text-[#4FD1C5] border-[#2C4C3E]'
                            }`}
                          >
                            ⓘ Clinical Benefit
                          </button>

                          <button
                            type="button"
                            data-testid={`habit-exercise-toggle-${exercise.id}`}
                            aria-pressed={itemProgress.isGoalMet}
                            aria-describedby={tooltipDomId}
                            title={tooltipData.formattedTooltipText}
                            onClick={() => handleExerciseToggleClick(exercise.id)}
                            className={`px-3 py-1 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer border ${
                              itemProgress.isGoalMet
                                ? 'bg-[#68D391] text-[#091510] border-[#68D391]'
                                : 'bg-[#0B1914] text-[#F2B84B] border-[#F2B84B]/50 hover:bg-[#163025] hover:text-[#F4EFE6]'
                            }`}
                          >
                            {itemProgress.isGoalMet
                              ? '✓ Completed & Synced with Streak'
                              : `+ Log ${exercise.shortLabel}`}
                          </button>
                        </div>
                      </div>

                      {/* VISUAL PROGRESS BAR & DAILY DURATION GOAL SETTER BENEATH HABIT LOG BUTTON */}
                      <div
                        data-testid={`habit-duration-goal-panel-${exercise.id}`}
                        className="p-3 rounded-xl bg-[#091510]/90 border border-[#1E3A2F] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                          <span
                            data-testid={`habit-duration-status-${exercise.id}`}
                            className="font-semibold text-[#F4EFE6] tabular-nums"
                          >
                            {itemProgress.statusLabel}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              data-testid={`habit-duration-sub-${exercise.id}`}
                              onClick={() =>
                                handleAdjustHabitLoggedMinutes(
                                  exercise.id,
                                  -itemProgress.incrementMinutes
                                )
                              }
                              className="px-1.5 py-0.5 rounded bg-[#10231C] hover:bg-[#18352A] text-[#A3B8B0] hover:text-[#F4EFE6] border border-[#233D32] text-[10px] font-mono font-semibold cursor-pointer tabular-nums"
                              title={`Subtract ${itemProgress.incrementMinutes} minutes logged`}
                            >
                              -{itemProgress.incrementMinutes}m
                            </button>
                            <button
                              type="button"
                              data-testid={`habit-duration-add-${exercise.id}`}
                              onClick={() =>
                                handleAdjustHabitLoggedMinutes(
                                  exercise.id,
                                  itemProgress.incrementMinutes
                                )
                              }
                              className="px-1.5 py-0.5 rounded bg-[#143025] hover:bg-[#1D4434] text-[#68D391] border border-[#2C5E48] text-[10px] font-mono font-semibold cursor-pointer tabular-nums"
                              title={`Log +${itemProgress.incrementMinutes} minutes toward daily duration goal`}
                            >
                              +{itemProgress.incrementMinutes}m
                            </button>
                          </div>
                        </div>

                        {/* Visual Progress Bar Beneath Habit Log Button */}
                        <div
                          role="progressbar"
                          aria-label={`${exercise.shortLabel} daily duration goal progress`}
                          aria-valuenow={itemProgress.progressPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          data-testid={`habit-duration-progress-bar-${exercise.id}`}
                          className="w-full h-2.5 rounded-full bg-[#060E0B] overflow-hidden border border-[#233D32]"
                        >
                          <div
                            data-testid={`habit-duration-progress-fill-${exercise.id}`}
                            className="h-full rounded-full transition-all duration-200"
                            style={{
                              width: `${itemProgress.progressPct}%`,
                              backgroundColor: itemProgress.isGoalMet
                                ? '#68D391'
                                : exercise.accentHex,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#A3B8B0] tabular-nums">
                          <span data-testid={`habit-duration-delta-${exercise.id}`}>
                            {itemProgress.deltaSummaryText}
                          </span>
                          <span
                            data-testid={`habit-duration-pct-badge-${exercise.id}`}
                            className="font-bold"
                            style={{
                              color: itemProgress.isGoalMet
                                ? '#68D391'
                                : exercise.accentHex,
                            }}
                          >
                            {itemProgress.progressPct}%
                          </span>
                        </div>

                        {/* Interactive Daily Duration Goal Setter (Slider + Quick Presets) */}
                        <div className="pt-1.5 border-t border-[#162C23] space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <label
                              htmlFor={`habit-duration-goal-slider-${exercise.id}`}
                              className="text-[10.5px] font-mono text-[#D5E2DC]"
                            >
                              Set Daily Duration Goal (min)
                            </label>
                            <span
                              data-testid={`habit-duration-goal-value-${exercise.id}`}
                              className="text-[11px] font-mono font-bold tabular-nums"
                              style={{ color: exercise.accentHex }}
                            >
                              {itemProgress.goalMinutes} min/day
                            </span>
                          </div>
                          <input
                            id={`habit-duration-goal-slider-${exercise.id}`}
                            data-testid={`habit-duration-goal-slider-${exercise.id}`}
                            type="range"
                            min={itemProgress.minGoalMinutes}
                            max={itemProgress.maxGoalMinutes}
                            step={itemProgress.stepMinutes}
                            value={itemProgress.goalMinutes}
                            onChange={(e) =>
                              handleUpdateHabitDurationGoal(
                                exercise.id,
                                Number(e.target.value)
                              )
                            }
                            className="w-full cursor-pointer"
                            style={{ accentColor: exercise.accentHex }}
                          />
                          <div className="grid grid-cols-4 gap-1.5">
                            {itemProgress.goalPresetsMinutes.map((presetMin) => {
                              const isPresetSelected =
                                itemProgress.goalMinutes === presetMin;
                              return (
                                <button
                                  key={presetMin}
                                  type="button"
                                  data-testid={`habit-goal-preset-${exercise.id}-${presetMin}`}
                                  onClick={() =>
                                    handleUpdateHabitDurationGoal(
                                      exercise.id,
                                      presetMin
                                    )
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors cursor-pointer text-center tabular-nums ${
                                    isPresetSelected
                                      ? 'bg-[#17382C] text-[#F4EFE6] border-[#68D391]'
                                      : 'bg-[#0D1E18] text-[#A3B8B0] border-[#1E3A2F] hover:text-[#F4EFE6]'
                                  }`}
                                >
                                  {presetMin}m Goal
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Descriptive Neuroscientific Literature Tooltip Popover */}
                      <div
                        id={tooltipDomId}
                        role="tooltip"
                        data-testid={`habit-tooltip-popover-${exercise.id}`}
                        className={`p-3 rounded-xl bg-[#07120E] border border-[#4FD1C5]/60 shadow-xl space-y-1.5 transition-all ${
                          isTooltipOpen ? 'block' : 'hidden'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#4FD1C5]">
                            {tooltipData.headline}
                          </span>
                          <span className="text-[9px] font-mono text-[#68D391] px-1.5 py-0.5 rounded bg-[#10281F] border border-[#2C4C3E]">
                            Neuroscience Evidence
                          </span>
                        </div>
                        <p className="text-xs text-[#F4EFE6] leading-relaxed">
                          {tooltipData.clinicalBenefit}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tooltipData.keyMetrics.map((metric) => (
                            <span
                              key={metric}
                              className="px-2 py-0.5 rounded bg-[#10231C] border border-[#233D32] text-[10px] font-mono text-[#F2B84B]"
                            >
                              {metric}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] font-mono text-[#A3B8B0] pt-1 border-t border-[#183328]">
                          <strong className="text-[#68D391]">Peer-Reviewed Citations:</strong>{' '}
                          {tooltipData.neuroLiterature}
                        </div>
                      </div>

                      <h5 className="text-sm font-display font-semibold text-[#F4EFE6]">
                        {exercise.title}
                      </h5>

                      <div className="text-[11px] font-mono text-[#68D391]">
                        <span>{exercise.biomarkerTarget}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-[#A3B8B0]">{exercise.citation}</span>
                      </div>

                      <p className="text-xs text-[#D5E2DC] leading-relaxed">
                        <strong className="text-[#F4EFE6]">Clinical Mechanism:</strong>{' '}
                        {exercise.mechanismSummary}
                      </p>

                      <div className="p-2.5 rounded-lg bg-[#091510]/85 border border-[#1E3A2F] text-xs text-[#F2B84B] leading-relaxed">
                        <strong className="text-[#F4EFE6]">Daily Exercise Protocol:</strong>{' '}
                        {exercise.exercisePrompt}
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-[#1E3A2F] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#4FD1C5]">{exercise.synergyBonusLabel}</span>
                      <span
                        className={
                          isExerciseDone ? 'text-[#68D391] font-semibold' : 'text-[#A3B8B0]'
                        }
                      >
                        {isExerciseDone
                          ? `Streak Synced (${syncedStreakDisplay}d)`
                          : 'Awaiting Today’s Check-In'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* COGNITIVE INSIGHT JOURNAL — NEURAL LOGS ARCHIVE LINKED TO DAILY STREAK */}
        {onAddNeuralLog && (
          <div className="mt-6">
            <CognitiveInsightJournal
              neuralLogs={neuralLogs}
              streakDayCount={currentStreakDays}
              stageName="Sanctuary Practice Reflection"
              outcome="victory"
              rejuvenationScore={peakRejuvenationScore}
              onAddNeuralLog={onAddNeuralLog}
            />
          </div>
        )}

        {/* Peer-Reviewed Clinical Protocols List */}
        <div className="mt-6 space-y-5">
          {protocols.map((item, idx) => (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-[#0B1914] border border-[#233D32] space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-display font-semibold text-[#F4EFE6]">
                  0{idx + 1}. {item.shortName} — {item.mechanism}
                </h3>
                <span className="text-xs font-mono text-[#A3B8B0]">
                  Target Region: {item.brainRegion}
                </span>
              </div>

              <div className="text-xs text-[#68D391] font-mono">
                <span>{item.authors}</span>
                <span aria-hidden="true"> · </span>
                <span>{item.journalYear}</span>
                <span aria-hidden="true"> · </span>
                <span>{item.sampleNote}</span>
              </div>

              <p className="text-sm text-[#D5E2DC] leading-relaxed">
                <strong className="text-[#F4EFE6]">Clinical Finding:</strong> {item.clinicalFinding}
              </p>

              <p className="text-sm text-[#F2B84B] leading-relaxed">
                <strong className="text-[#F4EFE6]">In-Sanctuary Translation:</strong> {item.howInGameWorks}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[#233D32] flex items-center justify-between gap-4">
          <p className="text-xs text-[#A3B8B0]">
            Designed for low-cortisol cognitive restoration: zero punitive timers, 10 Hz Alpha binaural entrainment, and evidence-backed neuroplasticity routines.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-[#F2B84B] hover:bg-[#F6AD55] text-[#091510] font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Return to Sanctuary
          </button>
        </div>
      </div>
    </div>
  );
};
