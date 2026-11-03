import React, { useEffect, useState, useCallback } from 'react';
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
  const [highestReachedStage, setHighestReachedStage] = useState<number>(0);
  const [activeProtocol, setActiveProtocol] = useState<ProtocolId>('ufov_forage');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCodexOpen, setIsCodexOpen] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoStepSignal, setDemoStepSignal] = useState<{ step: number; seq: number } | null>(null);
  const [resetSignal, setResetSignal] = useState<number>(0);

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
  });

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
        className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-mono font-semibold ${
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
      />

      {/* 2. TITLE SCREEN OVERLAY (30%-40% negative space left column over live world camera pan) */}
      {gameState === 'title' && (
        <div
          className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:px-12 md:py-8 overflow-y-auto pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(7, 18, 14, 0.98) 0%, rgba(7, 18, 14, 0.95) 46%, rgba(7, 18, 14, 0.25) 76%, rgba(7, 18, 14, 0.1) 100%)',
          }}
        >
          {/* Top-Left Clinical Identity Lockup */}
          <div className="max-w-xl space-y-4 pointer-events-auto">
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

            {/* Stage Selector */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                Select Sanctuary Grove Stage
              </span>
              <div className="flex flex-wrap gap-2">
                {SANCTUARY_STAGES.map((st, idx) => {
                  const locked = idx > highestReachedStage && idx > 0;
                  const active = stageIndex === idx;
                  return (
                    <button
                      key={st.stageIndex}
                      type="button"
                      disabled={locked}
                      onClick={() => setStageIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#1E4435] text-[#F4EFE6] border border-[#68D391]'
                          : locked
                          ? 'bg-[#0D1D17] text-[#526B61] border border-[#192E25] opacity-60 cursor-not-allowed'
                          : 'bg-[#11261E] text-[#A3B8B0] border border-[#233D32] hover:text-[#F4EFE6]'
                      }`}
                    >
                      Stage {idx + 1}: {idx === 0 ? '1-Back Grove' : idx === 1 ? '2-Back Canopy' : '2-Back Crown'}
                    </button>
                  );
                })}
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
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-6">
          <div className="space-y-3">
            {/* Top Row: Top-Left Vitality/Nectar/Trees Cluster + Top-Right Utility & N-Back Totem */}
            <div className="flex items-start justify-between gap-4">
              {/* Top-Left Perimeter Cluster: Calm Vitality Pips, BDNF Nectar & Grafted Trees */}
              <div className="flex flex-wrap items-center gap-5 px-4 py-2.5 rounded-2xl bg-[#091510]/88 border border-[#233D32] shadow-xl pointer-events-auto">
              {/* Calm Vitality Pips (3 readable states: Full, Damaged, Hollow) */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  CALM VITALITY
                </div>
                <div className="flex items-center gap-1.5 mt-1" aria-label={`Calm Vitality: ${hud.calmVitality} of ${hud.maxVitality}`}>
                  {Array.from({ length: hud.maxVitality }).map((_, i) => {
                    const isFull = i < hud.calmVitality;
                    const isCracked = i === hud.calmVitality && hud.calmVitality < hud.maxVitality;
                    return (
                      <svg
                        key={i}
                        viewBox="0 0 24 24"
                        className="w-5 h-5"
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

              {/* BDNF Nectar Counter */}
              <div className="pl-4 border-l border-[#233D32]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  BDNF NECTAR
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-mono font-bold text-[#F2B84B] tabular-nums hud-text-stroke">
                    {Math.round(hud.nectar)}
                  </span>
                  <span className="text-xs font-mono text-[#A3B8B0] tabular-nums">
                    / {hud.nectarCostPerTree} per tree
                  </span>
                </div>
              </div>

              {/* Hippocampal Trees Grafted */}
              <div className="pl-4 border-l border-[#233D32]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  NEURAL TREES GRAFTED
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-mono font-bold text-[#B794F4] tabular-nums hud-text-stroke">
                    {hud.treesGrafted} / {hud.targetTrees}
                  </span>
                </div>
              </div>

              {/* Rejuvenation Index */}
              <div className="pl-4 border-l border-[#233D32] hidden sm:block">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                  REJUVENATION INDEX
                </div>
                <div className="text-2xl font-mono font-bold text-[#4FD1C5] tabular-nums hud-text-stroke">
                  {Math.round(hud.rejuvenationScore)}
                </div>
              </div>
            </div>

            {/* Top-Right Cluster: Live N-Back Working Memory Strip + Compact Utility Buttons */}
            <div className="flex items-center gap-3 pointer-events-auto">
              {/* Live N-Back Totem Sequence Indicator */}
              <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#091510]/88 border border-[#233D32] shadow-xl">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3B8B0]">
                    {hud.nBackLevel}-BACK CHIME STREAM
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {hud.chimeHistory.slice(-3).map((sym, idx, arr) => {
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    hud.isNBackReadyToMatch
                      ? 'bg-[#F2B84B] text-[#091510] shadow-md'
                      : 'bg-[#152E24] text-[#4FD1C5] border border-[#2C4C3E] hover:bg-[#1E3F32]'
                  }`}
                >
                  Ring Echo [E]
                </button>
              </div>

              {/* Compact Square SVG Utility Buttons: Codex, Mute [M], Restart [R], Pause [P] */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#091510]/88 border border-[#233D32]">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Open Clinical Evidence Codex"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setIsCodexOpen(true);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#68D391] border border-[#2C4C3E] cursor-pointer"
                  title="Clinical Evidence Codex"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isMuted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
                  onClick={handleToggleMute}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] cursor-pointer"
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
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] cursor-pointer"
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
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] cursor-pointer"
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
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#132A21] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] cursor-pointer"
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

          {/* Bottom Unified Perimeter Dock: 0.1 Hz Breath Guide + 4 Clinical Action Slots */}
          <div className="flex flex-col items-center gap-2">
            {hud.statusBannerText && (
              <div className="px-4 py-1.5 rounded-xl bg-[#091510]/90 border border-[#233D32] text-xs font-mono text-[#F4EFE6] shadow-md">
                {hud.statusBannerText}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#091510]/90 border border-[#233D32] shadow-2xl pointer-events-auto">
              {/* 4 Evidence-Based Cognitive Protocol Action Slots */}
              {(Object.keys(CLINICAL_PROTOCOLS) as ProtocolId[]).map((pid) => {
                const proto = CLINICAL_PROTOCOLS[pid];
                const isSelected = activeProtocol === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    tabIndex={-1}
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

      {/* 5. VICTORY / GAME OVER MODAL (Single Focused Status Card with Tabular-Nums Mastery Metrics) */}
      {gameState === 'gameover' && endSummary && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-modal-title"
          className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-[#07120E]/88 pointer-events-auto"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#10231C] border border-[#2C4C3E] p-7 shadow-2xl space-y-6">
            <div className="text-center space-y-1.5">
              <p className="text-xs font-mono uppercase tracking-wider text-[#68D391]">
                {gameOutcome === 'victory'
                  ? 'Hippocampal & Prefrontal Circuitry Illuminated'
                  : 'Directed Attention Fatigued — Take a Slow 0.1 Hz Breath'}
              </p>
              <h2
                id="gameover-modal-title"
                className="text-2xl md:text-3xl font-display font-semibold text-[#F4EFE6]"
              >
                {gameOutcome === 'victory'
                  ? 'Sanctuary Grove Rejuvenated!'
                  : 'Sensory Overwhelm — Rest & Restore'}
              </h2>
            </div>

            {/* 3 Primary Tabular-Nums Stat Tiles */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#0B1914] border border-[#233D32] text-center">
              <div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">REJUVENATION SCORE</div>
                <div className="text-2xl font-mono font-bold text-[#F2B84B] tabular-nums">
                  {endSummary.rejuvenationScore}
                </div>
                <div className="text-[10px] font-mono text-[#68D391] tabular-nums">
                  Peak: {lifetimeProgress.peakRejuvenationScore}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">UFOV &amp; N-BACK</div>
                <div className="text-2xl font-mono font-bold text-[#4FD1C5] tabular-nums">
                  {Math.round((endSummary.processingSpeedPct + endSummary.workingMemoryPct) / 2)}%
                </div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">Accuracy</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">TOTAL TREES GRAFTED</div>
                <div className="text-2xl font-mono font-bold text-[#B794F4] tabular-nums">
                  {lifetimeProgress.totalTreesGrafted}
                </div>
                <div className="text-[10px] font-mono text-[#A3B8B0]">
                  {milestoneEval.highestUnlockedBadge.title}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {gameOutcome === 'victory' && stageIndex < SANCTUARY_STAGES.length - 1 ? (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => startOrRestartGame(stageIndex + 1, false)}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-[#F2B84B] hover:bg-[#F6AD55] text-[#091510] font-semibold text-sm transition-colors cursor-pointer"
                >
                  Advance to Stage {stageIndex + 2}
                </button>
              ) : (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => startOrRestartGame(stageIndex, false)}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-[#F2B84B] hover:bg-[#F6AD55] text-[#091510] font-semibold text-sm transition-colors cursor-pointer"
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
                className="py-3.5 px-5 rounded-xl bg-[#152E24] hover:bg-[#1E3F32] text-[#F4EFE6] border border-[#2C4C3E] font-medium text-sm transition-colors cursor-pointer"
              >
                Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CLINICAL EVIDENCE CODEX MODAL */}
      <ClinicalCodexModal
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        selectedProtocol={activeProtocol}
        hrvHistory={hrvHistory}
        onRecordSimulatedSession={() => {
          commitDailyPractice();
          const lastScore = hrvHistory[hrvHistory.length - 1]?.coherenceScore ?? 85;
          const nextScore = Math.min(99, Math.max(78, lastScore + 2));
          recordHrvSessionToHistory(nextScore, 15.0);
          soundEngine.playHarmonicChord('ufov');
        }}
      />
    </main>
  );
}
