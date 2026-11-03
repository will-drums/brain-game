import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  CLINICAL_PROTOCOLS,
  computeHrvTrendSummary,
  type HrvSessionRecord,
  type ProtocolId,
} from '../game/rules';

interface ClinicalCodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProtocol?: ProtocolId;
  hrvHistory: HrvSessionRecord[];
  onRecordSimulatedSession?: () => void;
}

export const ClinicalCodexModal: React.FC<ClinicalCodexModalProps> = ({
  isOpen,
  onClose,
  hrvHistory,
  onRecordSimulatedSession,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredSession, setHoveredSession] = useState<HrvSessionRecord | null>(null);

  const sessions = hrvHistory.slice(-10);
  const trendSummary = computeHrvTrendSummary(sessions);

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

    // Clinical Resonance Target Threshold Line (75% Vagal Coherence Zone)
    const thresholdY = yScale(75);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinical-codex-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#07120E]/90 pointer-events-auto"
    >
      <div className="w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#10231C] border border-[#2C4C3E] shadow-2xl p-6 md:p-8 text-[#F4EFE6]">
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-[#233D32]">
          <div>
            <p className="text-xs font-mono tracking-wider uppercase text-[#68D391]">
              Peer-Reviewed Neuroscience &amp; Biofeedback Telemetry
            </p>
            <h2
              id="clinical-codex-title"
              className="mt-1 text-2xl md:text-3xl font-display font-semibold text-[#F4EFE6]"
            >
              Clinical Research Codex &amp; HRV Coherence Trends
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Clinical Evidence Codex"
            className="px-4 py-2 rounded-lg bg-[#1A352B] hover:bg-[#24473A] text-sm font-medium text-[#F4EFE6] border border-[#2C4C3E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Close Codex [Esc]
          </button>
        </div>

        {/* D3.js Physiological Relaxation & HRV Coherence Line Chart (Last 10 Practice Sessions) */}
        <section
          aria-labelledby="hrv-chart-heading"
          data-testid="clinical-codex-hrv-chart"
          className="mt-6 p-5 rounded-xl bg-[#0B1914] border border-[#233D32] space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#4FD1C5]">
                0.1 Hz Resonance Biofeedback · Last {sessions.length} Practice Sessions
              </span>
              <h3
                id="hrv-chart-heading"
                className="text-lg font-display font-semibold text-[#F4EFE6]"
              >
                HRV Vagal Coherence &amp; Physiological Relaxation Trajectory
              </h3>
            </div>

            {onRecordSimulatedSession && (
              <button
                type="button"
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
                RELAXATION TREND
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
                  HRV Coherence: {activeInspect.coherenceScore}%
                </span>
                <span aria-hidden="true"> · </span>
                <span>{activeInspect.coherenceSeconds.toFixed(1)}s Paced 0.1 Hz Breath</span>
              </div>
            </div>
          )}
        </section>

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
            Designed for low-cortisol cognitive restoration: zero punitive timers, soft fascination acoustics, and evidence-backed neuroplasticity routines.
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
