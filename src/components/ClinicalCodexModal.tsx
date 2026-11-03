import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  CLINICAL_PROTOCOLS,
  HRV_HISTORY_STORAGE_KEY,
  DEFAULT_HRV_HISTORY_SEED,
  computeHrvTrendSummary,
  computeCognitiveDomainProfile,
  NEURO_NUTRITION_SLEEP_TIPS,
  filterNeuroNutritionTips,
  computeNeuroSynergyBonus,
  DAILY_HABIT_EXERCISES,
  getDailyHabitClinicalTooltip,
  DEFAULT_NEURAL_LOGS_SEED,
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
  const [hoveredSession, setHoveredSession] = useState<HrvSessionRecord | null>(null);
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

  const handleExerciseToggleClick = (exerciseId: DailyHabitExerciseId) => {
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
  const domainProfile = computeCognitiveDomainProfile({
    totalTreesGrafted,
    peakRejuvenationScore,
    averageHrvCoherence: trendSummary.averageCoherence,
    currentStreakDays,
  });
  const filteredLifestyleTips = filterNeuroNutritionTips(lifestyleCategory);
  const neuroSynergy = computeNeuroSynergyBonus(completedHabitIds);

  useEffect(() => {
    if (!isOpen || !svgRef.current || sessions.length === 0) return;

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

      // In-Chart Vagal Coherence Growth Callout Badge
      const badgeGroup = g
        .append('g')
        .attr('data-testid', 'hrv-d3-growth-badge')
        .attr('transform', 'translate(10, 4)');

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
  }, [isOpen, sessions]);

  if (!isOpen) return null;

  const protocols = Object.values(CLINICAL_PROTOCOLS);
  const activeInspect = hoveredSession || sessions[sessions.length - 1] || null;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#07120E]/90 pointer-events-auto"
    >
      <div className="w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#10231C] border border-[#2C4C3E] shadow-2xl p-6 md:p-8 text-[#F4EFE6]">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-[#233D32]">
          <div>
            <p className="text-xs font-mono tracking-wider uppercase text-[#68D391]">
              Enterprise Digital Therapeutics (DTx) · Biofeedback &amp; Neuroplasticity Telemetry
            </p>
            <h2
              id="clinical-codex-title"
              className="mt-1 text-2xl md:text-3xl font-display font-semibold text-[#F4EFE6]"
            >
              Clinical Research Codex &amp; Longitudinal Telemetry
            </h2>
          </div>
          <div className="flex items-center gap-2.5">
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
          className="mt-6 p-5 rounded-xl bg-[#0B1914] border border-[#233D32] space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
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

        {/* 2. 4-Domain Cognitive Reserve & Neuroplasticity Profile */}
        <section
          aria-label="4-Domain Cognitive Reserve Profile"
          data-testid="cognitive-domain-profile"
          className="mt-6 p-5 rounded-xl bg-[#0B1914] border border-[#233D32] space-y-4"
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
                      isExerciseDone
                        ? 'bg-[#132E23] border-[#68D391]'
                        : 'bg-[#10231C] border-[#1E3A2F]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#091510]"
                            style={{ backgroundColor: exercise.accentHex }}
                          >
                            {exercise.protocolBadge}
                          </span>
                          <span className="text-[10px] font-mono text-[#A3B8B0]">
                            {exercise.durationLabel}
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
                            aria-pressed={isExerciseDone}
                            aria-describedby={tooltipDomId}
                            title={tooltipData.formattedTooltipText}
                            onClick={() => handleExerciseToggleClick(exercise.id)}
                            className={`px-3 py-1 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer border ${
                              isExerciseDone
                                ? 'bg-[#68D391] text-[#091510] border-[#68D391]'
                                : 'bg-[#0B1914] text-[#F2B84B] border-[#F2B84B]/50 hover:bg-[#163025] hover:text-[#F4EFE6]'
                            }`}
                          >
                            {isExerciseDone
                              ? '✓ Completed & Synced with Streak'
                              : `+ Log ${exercise.shortLabel}`}
                          </button>
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
