import React, { useState } from 'react';
import {
  NEURAL_LOG_MOOD_TAGS,
  NEURAL_LOG_PROMPT_CHIPS,
  type NeuralLogEntry,
  type NeuralLogMoodTag,
} from '../game/rules';

interface CognitiveInsightJournalProps {
  neuralLogs: NeuralLogEntry[];
  streakDayCount: number;
  stageName: string;
  outcome: 'victory' | 'defeat';
  rejuvenationScore: number;
  onAddNeuralLog: (params: {
    moodTag: NeuralLogMoodTag;
    reflectionNote: string;
    outcome: 'victory' | 'defeat';
    rejuvenationScore: number;
    stageName: string;
  }) => void;
  compact?: boolean;
}

export const CognitiveInsightJournal: React.FC<CognitiveInsightJournalProps> = ({
  neuralLogs,
  streakDayCount,
  stageName,
  outcome,
  rejuvenationScore,
  onAddNeuralLog,
  compact = false,
}) => {
  const [selectedMood, setSelectedMood] = useState<NeuralLogMoodTag>(
    outcome === 'victory' ? 'Flow State' : 'Mental Fatigue Recovery'
  );
  const [noteText, setNoteText] = useState<string>('');
  const [justSaved, setJustSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteText.trim();
    if (!trimmed) return;
    onAddNeuralLog({
      moodTag: selectedMood,
      reflectionNote: trimmed,
      outcome,
      rejuvenationScore,
      stageName,
    });
    setNoteText('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  const visibleLogs = compact ? neuralLogs.slice(0, 3) : neuralLogs.slice(0, 8);

  return (
    <section
      data-testid="cognitive-insight-journal"
      aria-label="Cognitive Insight Journal — Neural Logs"
      className="p-4 rounded-xl bg-[#0B1914] border border-[#233D32] text-left space-y-3"
    >
      {/* Header Row with Daily Streak Link Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#68D391] font-semibold">
              COGNITIVE INSIGHT JOURNAL · NEURAL LOGS
            </span>
            <span
              data-testid="neural-log-streak-badge"
              className="px-2 py-0.5 rounded bg-[#16382C] text-[#F2B84B] border border-[#2C4C3E] text-[10px] font-mono font-bold tabular-nums"
            >
              LINKED TO STREAK DAY {Math.max(1, streakDayCount)}
            </span>
          </div>
          <p className="text-[11px] text-[#A3B8B0] mt-0.5">
            Record a brief metacognitive reflection on your attention, vagal calm, or working-memory flow.
          </p>
        </div>
        <span className="text-[11px] font-mono text-[#4FD1C5] tabular-nums">
          {neuralLogs.length} {neuralLogs.length === 1 ? 'Neural Log' : 'Neural Logs'} Stored
        </span>
      </div>

      {/* Mood / Subjective State Selector Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {NEURAL_LOG_MOOD_TAGS.map((mood) => {
          const isSelected = selectedMood === mood;
          return (
            <button
              key={mood}
              type="button"
              data-testid={`neural-mood-${mood.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setSelectedMood(mood)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-colors cursor-pointer border ${
                isSelected
                  ? 'bg-[#1D4032] text-[#F4EFE6] border-[#68D391]'
                  : 'bg-[#10231C] text-[#A3B8B0] border-[#1E3A2F] hover:text-[#F4EFE6]'
              }`}
            >
              {mood}
            </button>
          );
        })}
      </div>

      {/* Quick 1-Click Reflective Prompt Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {NEURAL_LOG_PROMPT_CHIPS.slice(0, compact ? 2 : 4).map((chip, idx) => (
          <button
            key={idx}
            type="button"
            data-testid={`neural-prompt-chip-${idx}`}
            onClick={() => setNoteText(chip)}
            className="px-2 py-0.5 rounded bg-[#10231C] hover:bg-[#17352A] text-[10px] font-mono text-[#A3B8B0] hover:text-[#D5E2DC] border border-[#1E3A2F] transition-colors cursor-pointer truncate max-w-full"
            title="Click to populate reflection note"
          >
            + “{chip}”
          </button>
        ))}
      </div>

      {/* Note Input + Save Neural Log Button */}
      <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          data-testid="neural-log-input"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          maxLength={240}
          placeholder={`Reflect on Day ${Math.max(1, streakDayCount)} session (${stageName})...`}
          className="flex-1 px-3 py-2 rounded-lg bg-[#10231C] border border-[#2C4C3E] text-xs text-[#F4EFE6] placeholder-[#6E857C] focus:outline-none focus:border-[#68D391]"
        />
        <button
          type="submit"
          data-testid="save-neural-log-btn"
          disabled={!noteText.trim()}
          className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            justSaved
              ? 'bg-[#68D391] text-[#091510]'
              : noteText.trim()
              ? 'bg-[#4FD1C5] hover:bg-[#81E6D9] text-[#091510]'
              : 'bg-[#152E24] text-[#526B61] border border-[#233D32] cursor-not-allowed'
          }`}
        >
          {justSaved ? '✓ Neural Log Saved' : '+ Save Neural Log'}
        </button>
      </form>

      {/* Stored Neural Logs Archive Feed */}
      <div
        data-testid="neural-logs-list"
        className="space-y-2 max-h-40 overflow-y-auto pr-1 pt-1 border-t border-[#1E3A2F]"
      >
        {visibleLogs.map((log) => (
          <div
            key={log.id}
            data-testid="neural-log-item"
            className="p-2.5 rounded-lg bg-[#10231C] border border-[#1E3A2F] space-y-1"
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-[#17382B] text-[#68D391] font-bold tabular-nums">
                  Streak Day {log.streakDayCount}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#142921] text-[#4FD1C5]">
                  {log.moodTag}
                </span>
                <span className="text-[#A3B8B0] truncate max-w-[180px]">
                  {log.stageName}
                </span>
              </div>
              <div className="text-[#A3B8B0] tabular-nums">
                <span className="text-[#F2B84B] font-semibold">Score {log.rejuvenationScore}</span>
                <span aria-hidden="true"> · </span>
                <span>{log.recordedAtIso}</span>
              </div>
            </div>
            <p className="text-xs text-[#D5E2DC] leading-snug">
              “{log.reflectionNote}”
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
