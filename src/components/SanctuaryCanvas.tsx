import React, { useEffect, useRef } from 'react';
import {
  clampDeltaTime,
  isNBackMatch,
  generateNextChimeSymbol,
  computeResonanceBreathState,
  evaluateCognitiveSummary,
  computeDifficultyRamp,
  getSanctuaryAestheticConfig,
  computeAdaptiveFlowState,
  createCognitivePulseConfig,
  stepCognitivePulseWave,
  SANCTUARY_STAGES,
  CHIME_SYMBOLS,
  type CognitivePulseType,
  type ChimeSymbol,
  type GameState,
  type GameOutcome,
  type ProtocolId,
  type HazardArchetype,
  type CognitiveSummary,
  type CognitiveMilestoneId,
  type AdaptiveFlowTier,
  type SanctuaryAtmosphereId,
} from '../game/rules';
import { soundEngine } from '../game/audio';

export interface HudSnapshot {
  calmVitality: number;
  maxVitality: number;
  nectar: number;
  nectarCostPerTree: number;
  treesGrafted: number;
  targetTrees: number;
  stageIndex: number;
  stageName: string;
  nBackLevel: number;
  chimeHistory: ChimeSymbol[];
  isNBackReadyToMatch: boolean;
  activeProtocol: ProtocolId;
  breathPhaseLabel: 'INHALE' | 'EXHALE';
  breathExpansion: number;
  isCoherentBreathing: boolean;
  ufovActiveChallenge: {
    active: boolean;
    centerSymbol: ChimeSymbol;
    peripheralSector: number; // 0..7 (N, NE, E, SE, S, SW, W, NW)
    timeRemaining: number;
    awaitingSelection: boolean;
  } | null;
  rejuvenationScore: number;
  statusBannerText: string;
  demoStepIndex: number;
  flowMultiplier: number;
  flowStreak: number;
  adaptiveUfovWindowMs: number;
  flowTier: AdaptiveFlowTier;
  cognitivePulseCount?: number;
  lastCognitivePulseType?: CognitivePulseType | null;
}

interface SanctuaryCanvasProps {
  gameState: GameState;
  stageIndex: number;
  activeProtocol: ProtocolId;
  onSelectProtocol: (p: ProtocolId) => void;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameEnd: (outcome: GameOutcome, summary: CognitiveSummary) => void;
  onTogglePause: () => void;
  resetSignal: number;
  ufovSectorChoiceSignal: { sector: number; seq: number } | null;
  triggerActionSignal: { action: 'pulse' | 'chime' | 'graft'; seq: number } | null;
  isOverlayModalOpen?: boolean;
  activeMilestoneId?: CognitiveMilestoneId;
  onTreeGrafted?: () => void;
  isDemoMode?: boolean;
  demoStepSignal?: { step: number; seq: number } | null;
  atmosphereId?: SanctuaryAtmosphereId;
  isZenMode?: boolean;
}

interface NeuralTree {
  id: number;
  x: number;
  y: number;
  grafted: boolean;
  graftAnim: number; // 0..1
  canopyPhase: number;
  connectedToId: number | null;
}

interface DewBloom {
  id: number;
  x: number;
  y: number;
  nectarAmount: number;
  respawnTimer: number;
  pulsePhase: number;
  isUfovShrine: boolean;
}

interface StressHazard {
  id: number;
  archetype: HazardArchetype;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  windupTimer: number; // > 0 when telegraphing attack
  isTelegraphing: boolean;
  targetX: number;
  targetY: number;
  hitFlashTimer: number;
  koTimer: number; // > 0 during 0.35s dissolve transition
  phaseOffset: number;
}

interface AmbientFirefly {
  baseX: number;
  baseY: number;
  orbitRadius: number;
  phase: number;
  speed: number;
  size: number;
}

// Pre-allocated Zero-GC Particle Ring Buffer
const MAX_PARTICLES = 320;
const MAX_AMBIENT_FIREFLIES = 80;
interface ParticlePool {
  active: Uint8Array;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  size: Float32Array;
  alpha: Float32Array;
  life: Float32Array;
  maxLife: Float32Array;
  colorIdx: Uint8Array; // 0: gold, 1: teal, 2: emerald, 3: lavender, 4: crimson, 5: white
  cursor: number;
}

const PARTICLE_COLORS = [
  '#F2B84B', // 0: Amber gold (UFOV / Nectar)
  '#4FD1C5', // 1: Bioluminescent cyan-teal (N-Back / Synapse)
  '#68D391', // 2: Vagal emerald (Coherence breath)
  '#B794F4', // 3: Hippocampal lavender (Dendrite graft)
  '#F56565', // 4: Cortisol coral-red (Hazard telegraph/hit)
  '#FFFDF9', // 5: Warm starlight white
];

export const SanctuaryCanvas: React.FC<SanctuaryCanvasProps> = ({
  gameState,
  stageIndex,
  activeProtocol,
  onSelectProtocol,
  onHudUpdate,
  onGameEnd,
  onTogglePause,
  resetSignal,
  ufovSectorChoiceSignal,
  triggerActionSignal,
  isOverlayModalOpen = false,
  activeMilestoneId = 'sapling_awakening',
  onTreeGrafted,
  isDemoMode = false,
  demoStepSignal = null,
  atmosphereId = 'forest',
  isZenMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store latest React props/callbacks in refs so 60Hz loop never tears down
  const stateRef = useRef({
    gameState,
    stageIndex,
    activeProtocol,
    onSelectProtocol,
    onHudUpdate,
    onGameEnd,
    onTogglePause,
    isOverlayModalOpen,
    activeMilestoneId,
    onTreeGrafted,
    isDemoMode,
    atmosphereId,
    isZenMode,
  });

  useEffect(() => {
    stateRef.current = {
      gameState,
      stageIndex,
      activeProtocol,
      onSelectProtocol,
      onHudUpdate,
      onGameEnd,
      onTogglePause,
      isOverlayModalOpen,
      activeMilestoneId,
      onTreeGrafted,
      isDemoMode,
      atmosphereId,
      isZenMode,
    };
  }, [
    gameState,
    stageIndex,
    activeProtocol,
    onSelectProtocol,
    onHudUpdate,
    onGameEnd,
    onTogglePause,
    isOverlayModalOpen,
    activeMilestoneId,
    onTreeGrafted,
    isDemoMode,
    atmosphereId,
    isZenMode,
  ]);

  // Ref for signals from HUD buttons
  const externalSignalsRef = useRef({
    lastResetSignal: resetSignal,
    lastUfovSeq: 0,
    pendingUfovSector: -1,
    lastActionSeq: 0,
    pendingAction: null as 'pulse' | 'chime' | 'graft' | null,
    lastDemoStepSeq: 0,
    pendingDemoStep: -1,
  });

  useEffect(() => {
    if (ufovSectorChoiceSignal && ufovSectorChoiceSignal.seq !== externalSignalsRef.current.lastUfovSeq) {
      externalSignalsRef.current.lastUfovSeq = ufovSectorChoiceSignal.seq;
      externalSignalsRef.current.pendingUfovSector = ufovSectorChoiceSignal.sector;
    }
  }, [ufovSectorChoiceSignal]);

  useEffect(() => {
    if (triggerActionSignal && triggerActionSignal.seq !== externalSignalsRef.current.lastActionSeq) {
      externalSignalsRef.current.lastActionSeq = triggerActionSignal.seq;
      externalSignalsRef.current.pendingAction = triggerActionSignal.action;
    }
  }, [triggerActionSignal]);

  useEffect(() => {
    if (demoStepSignal && demoStepSignal.seq !== externalSignalsRef.current.lastDemoStepSeq) {
      externalSignalsRef.current.lastDemoStepSeq = demoStepSignal.seq;
      externalSignalsRef.current.pendingDemoStep = demoStepSignal.step;
    }
  }, [demoStepSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport dimensions updated via ResizeObserver with Mac Retina (devicePixelRatio) scaling
    let viewWidth = container.clientWidth || 1440;
    let viewHeight = container.clientHeight || 900;
    let currentDpr = Math.min(window.devicePixelRatio || 1, 2);

    const syncCanvasHiDpi = (w: number, h: number) => {
      currentDpr = Math.min(window.devicePixelRatio || 1, 2);
      viewWidth = w;
      viewHeight = h;
      canvas.width = Math.round(w * currentDpr);
      canvas.height = Math.round(h * currentDpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    syncCanvasHiDpi(viewWidth, viewHeight);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          syncCanvasHiDpi(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    // Pre-allocate Zero-GC Particle Pool
    const particles: ParticlePool = {
      active: new Uint8Array(MAX_PARTICLES),
      x: new Float32Array(MAX_PARTICLES),
      y: new Float32Array(MAX_PARTICLES),
      vx: new Float32Array(MAX_PARTICLES),
      vy: new Float32Array(MAX_PARTICLES),
      size: new Float32Array(MAX_PARTICLES),
      alpha: new Float32Array(MAX_PARTICLES),
      life: new Float32Array(MAX_PARTICLES),
      maxLife: new Float32Array(MAX_PARTICLES),
      colorIdx: new Uint8Array(MAX_PARTICLES),
      cursor: 0,
    };

    const spawnParticles = (
      x: number,
      y: number,
      count: number,
      colorIdx: number,
      speedMin = 40,
      speedMax = 160,
      sizeMin = 2.5,
      sizeMax = 6,
      lifeSec = 0.65
    ) => {
      for (let i = 0; i < count; i++) {
        const idx = particles.cursor;
        particles.cursor = (particles.cursor + 1) % MAX_PARTICLES;
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        particles.active[idx] = 1;
        particles.x[idx] = x;
        particles.y[idx] = y;
        particles.vx[idx] = Math.cos(angle) * speed;
        particles.vy[idx] = Math.sin(angle) * speed;
        particles.size[idx] = sizeMin + Math.random() * (sizeMax - sizeMin);
        particles.alpha[idx] = 1;
        particles.life[idx] = 0;
        particles.maxLife[idx] = lifeSec * (0.75 + Math.random() * 0.5);
        particles.colorIdx[idx] = colorIdx;
      }
    };

    // Unified Input Hub (held states + edge-triggered justPressed + Mac trackpad glide)
    const keysHeld = new Set<string>();
    const keysJustPressed = new Set<string>();
    let mouseWorldX = 0;
    let mouseWorldY = 0;
    let mouseScreenX = viewWidth / 2;
    let mouseScreenY = viewHeight / 2;
    let mouseJustClicked = false;
    let rightMouseJustClicked = false;
    let trackpadGlideVx = 0;
    let trackpadGlideVy = 0;

    // World Space Dimensions (Sanctuary glade is 1800 x 1200)
    const WORLD_W = 1800;
    const WORLD_H = 1200;

    // Player & Simulation State
    let player = {
      x: 0,
      y: 80, // Spawn on open glowing mossy path facing central Heart-Tree
      vx: 0,
      vy: 0,
      radius: 20,
      scaleX: 1,
      scaleY: 1,
      gaitDistance: 0,
      facingAngle: -Math.PI / 2,
      calmVitality: 5,
      maxVitality: 5,
      invulnTimer: 0,
      hitFlashTimer: 0,
      nectar: 30, // Start with enough nectar so player can test grafting or foraging immediately
      pulseCooldown: 0,
      pulseWaveRadius: 0,
      pulseWaveAlpha: 0,
      chimeWaveRadius: 0,
      chimeWaveAlpha: 0,
      pulseBufferTimer: 0,
    };

    let camera = {
      x: 0,
      y: 80,
      trauma: 0,
      titleTourAngle: 0,
    };

    let hitstopTimer = 0;
    let defeatDelayTimer = 0;
    let stageElapsedSec = 0;
    let treesGrafted = 0;
    let ufovHits = 0;
    let ufovAttempts = 0;
    let nBackHits = 0;
    let nBackAttempts = 0;
    let consecutiveCognitiveHits = 0;
    let coherenceSeconds = 0;
    let statusBannerText = 'Explore the Mossy Glade · Harvest Golden Dew (Space) · Match Echo Chimes (E) · Graft Neural Trees (Q)';
    let statusBannerTimer = 6.0;

    // Zero-GC Floating World-Space Telemetry Callouts
    const MAX_CALLOUTS = 14;
    const callouts: Array<{
      active: boolean;
      x: number;
      y: number;
      vy: number;
      life: number;
      maxLife: number;
      text: string;
      colorHex: string;
    }> = Array.from({ length: MAX_CALLOUTS }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: -38,
      life: 0,
      maxLife: 1.25,
      text: '',
      colorHex: '#F2B84B',
    }));
    let calloutCursor = 0;

    const spawnFloatingCallout = (x: number, y: number, text: string, colorHex: string) => {
      const c = callouts[calloutCursor];
      calloutCursor = (calloutCursor + 1) % MAX_CALLOUTS;
      c.active = true;
      c.x = x;
      c.y = y - 24;
      c.vy = -38;
      c.life = 0;
      c.maxLife = 1.3;
      c.text = text;
      c.colorHex = colorHex;
    };

    // Zero-GC Cognitive Pulse Bioluminescent Wave & Particle Emitter Pool
    const MAX_COGNITIVE_PULSES = 6;
    const cognitivePulses: Array<{
      active: boolean;
      type: CognitivePulseType;
      originX: number;
      originY: number;
      elapsed: number;
      durationSec: number;
      maxRadius: number;
      primaryColorHex: string;
      secondaryColorHex: string;
      coreGlowRgba: string;
      filamentCount: number;
    }> = Array.from({ length: MAX_COGNITIVE_PULSES }, () => ({
      active: false,
      type: 'nback_match' as CognitivePulseType,
      originX: 0,
      originY: 0,
      elapsed: 0,
      durationSec: 1.1,
      maxRadius: 240,
      primaryColorHex: '#4FD1C5',
      secondaryColorHex: '#68D391',
      coreGlowRgba: 'rgba(79, 209, 197, 0.52)',
      filamentCount: 10,
    }));
    let cognitivePulseCursor = 0;
    let totalCognitivePulsesTriggered = 0;
    let lastCognitivePulseType: CognitivePulseType | null = null;

    const triggerCognitivePulse = (
      type: CognitivePulseType,
      originX: number,
      originY: number,
      flowMultiplier: number
    ) => {
      const config = createCognitivePulseConfig(type, originX, originY, flowMultiplier);

      // 1. Radiate bioluminescent particles from the exact interaction point via Zero-GC Particle Pool
      for (let i = 0; i < config.particles.length; i++) {
        const pSeed = config.particles[i];
        const idx = particles.cursor;
        particles.cursor = (particles.cursor + 1) % MAX_PARTICLES;
        particles.active[idx] = 1;
        particles.x[idx] = config.originX;
        particles.y[idx] = config.originY;
        particles.vx[idx] = pSeed.vx;
        particles.vy[idx] = pSeed.vy;
        particles.size[idx] = pSeed.size;
        particles.alpha[idx] = 1;
        particles.life[idx] = 0;
        particles.maxLife[idx] = pSeed.lifeSec;
        particles.colorIdx[idx] = pSeed.colorIdx;
      }

      // 2. Activate bioluminescent harmonic shockwave & synaptic filament ring at interaction point
      const slot = cognitivePulses[cognitivePulseCursor];
      cognitivePulseCursor = (cognitivePulseCursor + 1) % MAX_COGNITIVE_PULSES;
      slot.active = true;
      slot.type = config.type;
      slot.originX = config.originX;
      slot.originY = config.originY;
      slot.elapsed = 0;
      slot.durationSec = config.durationSec;
      slot.maxRadius = config.maxRadius;
      slot.primaryColorHex = config.primaryColorHex;
      slot.secondaryColorHex = config.secondaryColorHex;
      slot.coreGlowRgba = config.coreGlowRgba;
      slot.filamentCount = config.filamentCount;

      totalCognitivePulsesTriggered += 1;
      lastCognitivePulseType = type;
    };

    // N-Back Totem Sequence State
    let chimeHistory: ChimeSymbol[] = ['SUN', 'LEAF', 'SUN'];
    let chimeCycleTimer = 0;
    const CHIME_INTERVAL_SEC = 3.8;
    let chimeMatchClaimedThisBeat = false;

    // UFOV Divided Attention Challenge State
    let ufovChallenge = {
      active: false,
      centerSymbol: 'SUN' as ChimeSymbol,
      peripheralSector: 2, // 0..7
      flashTimer: 0,
      awaitingSelection: false,
      shrineX: 0,
      shrineY: 0,
    };

    let trees: NeuralTree[] = [];
    let blooms: DewBloom[] = [];
    let hazards: StressHazard[] = [];
    let ambientFireflies: AmbientFirefly[] = [];
    let nextHazardId = 1;
    let hazardSpawnTimer = 3.5;

    // Interactive How-to-Play Demo Autopilot State
    let demoStepIndex = 0; // 0: UFOV Forage, 1: N-Back Chime, 2: 0.1Hz Vagal Breath, 3: BDNF Dendrite Graft
    let demoStepElapsed = 0;
    let demoSubActionTriggered = false;
    let demoSecondSubActionTriggered = false;

    // Initialize 80 deterministic ambient fireflies distributed across the glade
    for (let f = 0; f < MAX_AMBIENT_FIREFLIES; f++) {
      const goldenAngle = f * 2.3999632;
      const r = 65 + Math.sqrt(f / MAX_AMBIENT_FIREFLIES) * 620;
      ambientFireflies.push({
        baseX: Math.cos(goldenAngle) * r,
        baseY: -30 + Math.sin(goldenAngle) * r * 0.78,
        orbitRadius: 16 + (f % 5) * 7,
        phase: f * 0.73,
        speed: 0.65 + (f % 7) * 0.14,
        size: 2.2 + (f % 4) * 0.65,
      });
    }

    const initSanctuaryWorld = (stageIdx: number) => {
      const stage = SANCTUARY_STAGES[stageIdx] || SANCTUARY_STAGES[0];
      player = {
        x: 0,
        y: 110,
        vx: 0,
        vy: 0,
        radius: 20,
        scaleX: 1,
        scaleY: 1,
        gaitDistance: 0,
        facingAngle: -Math.PI / 2,
        calmVitality: 5,
        maxVitality: 5,
        invulnTimer: 1.5,
        hitFlashTimer: 0,
        nectar: 30, // Enough to immediately graft 1 tree or forage more
        pulseCooldown: 0,
        pulseWaveRadius: 0,
        pulseWaveAlpha: 0,
        chimeWaveRadius: 0,
        chimeWaveAlpha: 0,
        pulseBufferTimer: 0,
      };

      hitstopTimer = 0;
      defeatDelayTimer = 0;
      stageElapsedSec = 0;
      treesGrafted = 0;
      ufovHits = 0;
      ufovAttempts = 0;
      nBackHits = 0;
      nBackAttempts = 0;
      consecutiveCognitiveHits = 0;
      coherenceSeconds = 0;
      for (const c of callouts) c.active = false;
      for (const cp of cognitivePulses) cp.active = false;
      totalCognitivePulsesTriggered = 0;
      lastCognitivePulseType = null;
      demoStepIndex = 0;
      demoStepElapsed = 0;
      demoSubActionTriggered = false;
      demoSecondSubActionTriggered = false;
      statusBannerText = `${stage.name} — Harvest Nectar [Space], Match ${stage.nBackLevel}-Back Chimes [E], or Graft Dormant Trees [Q]`;
      statusBannerTimer = 6.0;

      // Initialize sequence with an immediate 1-back/2-back match opportunity
      chimeHistory =
        stage.nBackLevel === 1
          ? ['LEAF', 'SUN', 'SUN']
          : ['STAR', 'DROP', 'STAR'];
      chimeCycleTimer = 0;
      chimeMatchClaimedThisBeat = false;

      ufovChallenge = {
        active: false,
        centerSymbol: 'SUN',
        peripheralSector: 1,
        flashTimer: 0,
        awaitingSelection: false,
        shrineX: 0,
        shrineY: 0,
      };

      // Place Dormant Neural Trees in a harmonious ring around the Central Heart-Tree (0, -40)
      const treePositions = [
        { x: -240, y: -120 },
        { x: 240, y: -120 },
        { x: -320, y: 160 },
        { x: 320, y: 160 },
        { x: 0, y: -310 },
        { x: 0, y: 310 },
      ];

      trees = treePositions.slice(0, stage.targetTreesGrafted).map((pos, idx) => ({
        id: idx + 1,
        x: pos.x,
        y: pos.y,
        grafted: false,
        graftAnim: 0,
        canopyPhase: idx * 1.1,
        connectedToId: 0, // Connects to central Heart-Tree (0, -40)
      }));

      // Place Dew-Blooms & UFOV Sun-Dew Shrines
      const bloomPositions = [
        { x: -130, y: 40, shrine: true },
        { x: 130, y: 40, shrine: true },
        { x: -180, y: -240, shrine: false },
        { x: 180, y: -240, shrine: false },
        { x: -420, y: -20, shrine: true },
        { x: 420, y: -20, shrine: true },
        { x: -160, y: 240, shrine: false },
        { x: 160, y: 240, shrine: false },
      ];

      blooms = bloomPositions.map((b, idx) => ({
        id: idx + 1,
        x: b.x,
        y: b.y,
        nectarAmount: b.shrine ? 20 : 12,
        respawnTimer: 0,
        pulsePhase: idx * 0.8,
        isUfovShrine: b.shrine,
      }));

      hazards = [];
      hazardSpawnTimer = 2.5;
    };

    initSanctuaryWorld(stateRef.current.stageIndex);

    // Helper: Screen to World coordinates
    const screenToWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      mouseScreenX = sx;
      mouseScreenY = sy;
      return {
        wx: camera.x + (sx - viewWidth / 2),
        wy: camera.y + (sy - viewHeight / 2),
      };
    };

    // Input Event Listeners on window (including macOS Cmd/Option/Control/Trackpad bindings)
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();

      // Prevent unintentional Cmd+R browser reload during active play if desired, or let R restart stage
      if (stateRef.current.gameState === 'title') {
        if (code === 'Enter' || code === 'Space') {
          e.preventDefault();
        }
        return;
      }

      if (code === 'Escape' || key === 'p') {
        e.preventDefault();
        stateRef.current.onTogglePause();
        return;
      }

      if (key === 'm' && !e.metaKey) {
        soundEngine.toggleMute();
        return;
      }

      // Protocol switching 1..4
      if (key === '1') stateRef.current.onSelectProtocol('ufov_forage');
      if (key === '2') stateRef.current.onSelectProtocol('nback_chimes');
      if (key === '3') stateRef.current.onSelectProtocol('coherence_breath');
      if (key === '4') stateRef.current.onSelectProtocol('dendrite_graft');

      if (!keysHeld.has(code)) {
        keysJustPressed.add(code);
      }
      keysHeld.add(code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const clearInputsOnBlur = () => {
      keysHeld.clear();
      keysJustPressed.clear();
      mouseJustClicked = false;
      rightMouseJustClicked = false;
      trackpadGlideVx = 0;
      trackpadGlideVy = 0;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInputsOnBlur();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const { wx, wy } = screenToWorld(e.clientX, e.clientY);
      mouseWorldX = wx;
      mouseWorldY = wy;
    };

    const handleMouseDown = (e: MouseEvent) => {
      const { wx, wy } = screenToWorld(e.clientX, e.clientY);
      mouseWorldX = wx;
      mouseWorldY = wy;
      // Support Mac Control-Click or Two-Finger Secondary Click for N-Back Echo Chime
      if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
        rightMouseJustClicked = true;
      } else if (e.button === 0) {
        mouseJustClicked = true;
      }
    };

    // Mac Magic Trackpad two-finger scroll/glide support to smoothly steer the Forest Sprite
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (stateRef.current.gameState !== 'playing') return;
      trackpadGlideVx = Math.max(-280, Math.min(280, trackpadGlideVx + e.deltaX * 3.2));
      trackpadGlideVy = Math.max(-280, Math.min(280, trackpadGlideVy + e.deltaY * 3.2));
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputsOnBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);

    // Core Player Actions
    const triggerLanternPulseAndForage = () => {
      if (player.pulseCooldown > 0) {
        player.pulseBufferTimer = 0.14; // Input buffer
        return;
      }
      player.pulseCooldown = 0.42;
      player.pulseWaveRadius = 18;
      player.pulseWaveAlpha = 1.0;
      player.scaleX = 1.24;
      player.scaleY = 0.78;
      soundEngine.playLightNote(587.33, 0.2);
      spawnParticles(player.x, player.y, 10, 0, 50, 150, 2.5, 5, 0.5);

      // 1. Check nearby Dew-Blooms / UFOV Shrines
      const stage = SANCTUARY_STAGES[stateRef.current.stageIndex] || SANCTUARY_STAGES[0];
      const flowState = computeAdaptiveFlowState({
        consecutiveCognitiveHits,
        coherenceSeconds,
        baseUfovFlashSec: stage.ufovFlashDurationSec,
      });

      for (const bloom of blooms) {
        if (bloom.respawnTimer > 0) continue;
        const dist = Math.hypot(bloom.x - player.x, bloom.y - player.y);
        if (dist <= 135) {
          bloom.respawnTimer = 8.5;
          const gained = Math.round(bloom.nectarAmount * flowState.flowMultiplier);
          player.nectar += gained;
          spawnParticles(bloom.x, bloom.y, 16, 0, 60, 190, 3, 6, 0.7);
          spawnFloatingCallout(bloom.x, bloom.y, `+${gained} BDNF NECTAR`, '#F2B84B');

          if (bloom.isUfovShrine && !ufovChallenge.active) {
            // Trigger ACTIVE-trial Useful Field of View (UFOV) peripheral flash with Adaptive Staircase window!
            const sec = Math.floor(Math.random() * 8);
            ufovChallenge = {
              active: true,
              centerSymbol: CHIME_SYMBOLS[Math.floor(Math.random() * CHIME_SYMBOLS.length)],
              peripheralSector: sec,
              flashTimer: flowState.adaptiveUfovWindowMs / 1000,
              awaitingSelection: true,
              shrineX: bloom.x,
              shrineY: bloom.y,
            };
            const secAngle = (sec * Math.PI) / 4 - Math.PI / 2;
            soundEngine.playLightNote(698.46, 0.25, Math.cos(secAngle) * 0.75);
            soundEngine.playHarmonicChord('ufov');
            statusBannerText = `UFOV Divided Attention (${flowState.adaptiveUfovWindowMs}ms Window)! Spot peripheral firefly & click compass sector`;
            statusBannerTimer = 4.5;
          } else {
            statusBannerText = `+${gained} BDNF Nectar harvested (${flowState.flowMultiplier}x Flow)!`;
            statusBannerTimer = 2.5;
          }
        }
      }

      // 2. Dispel nearby Stress Hazards with light knockback + hitstop
      let hitAnyHazard = false;
      for (const haz of hazards) {
        if (haz.koTimer > 0) continue;
        const dist = Math.hypot(haz.x - player.x, haz.y - player.y);
        if (dist <= 155) {
          haz.hp -= 1;
          haz.hitFlashTimer = 0.06;
          const angle = Math.atan2(haz.y - player.y, haz.x - player.x);
          haz.vx += Math.cos(angle) * 260;
          haz.vy += Math.sin(angle) * 260;
          haz.windupTimer = 0;
          haz.isTelegraphing = false;
          hitAnyHazard = true;

          if (haz.hp <= 0) {
            haz.koTimer = 0.35; // Smooth dissolve transition
            player.nectar += 8;
            spawnParticles(haz.x, haz.y, 18, 1, 70, 220, 3, 6.5, 0.75);
            spawnFloatingCallout(haz.x, haz.y, 'CORTISOL DISPELLED +8', '#4FD1C5');
          } else {
            spawnParticles(haz.x, haz.y, 8, 5, 40, 120, 2, 4.5, 0.45);
          }
        }
      }

      if (hitAnyHazard) {
        hitstopTimer = 0.045; // 45ms sim hitstop on heavy dispel
        camera.trauma = Math.min(1, camera.trauma + 0.32);
      }
    };

    const triggerNBackEchoChime = () => {
      const stage = SANCTUARY_STAGES[stateRef.current.stageIndex] || SANCTUARY_STAGES[0];
      const matched = isNBackMatch(chimeHistory, stage.nBackLevel);
      nBackAttempts += 1;

      player.chimeWaveRadius = 20;
      player.chimeWaveAlpha = 1.0;
      player.scaleX = 0.84;
      player.scaleY = 1.2;

      if (matched && !chimeMatchClaimedThisBeat) {
        chimeMatchClaimedThisBeat = true;
        nBackHits += 1;
        consecutiveCognitiveHits += 1;
        const flowState = computeAdaptiveFlowState({
          consecutiveCognitiveHits,
          coherenceSeconds,
          baseUfovFlashSec: stage.ufovFlashDurationSec,
        });
        const reward = Math.round(22 * flowState.flowMultiplier);
        player.nectar += reward;
        player.calmVitality = Math.min(player.maxVitality, player.calmVitality + 1);
        hitstopTimer = 0.05;
        camera.trauma = Math.min(1, camera.trauma + 0.25);
        soundEngine.playHarmonicChord('nback');
        // Trigger Cognitive Pulse bioluminescence from the player & Central Heart-Tree Chime Totem!
        triggerCognitivePulse('nback_match', player.x, player.y, flowState.flowMultiplier);
        triggerCognitivePulse('nback_match', 0, -40, flowState.flowMultiplier);
        spawnFloatingCallout(
          player.x,
          player.y,
          `★ ${stage.nBackLevel}-BACK COGNITIVE PULSE +${reward} (${flowState.flowMultiplier}x)`,
          '#4FD1C5'
        );
        statusBannerText = `Working Memory ${stage.nBackLevel}-Back Cognitive Pulse (${flowState.flowMultiplier}x Flow)! +${reward} BDNF Nectar & +1 Calm Vitality`;
        statusBannerTimer = 3.8;

        // Clear all hazards within 260px
        for (const haz of hazards) {
          if (haz.koTimer <= 0 && Math.hypot(haz.x - player.x, haz.y - player.y) <= 260) {
            haz.hp = 0;
            haz.koTimer = 0.35;
            spawnParticles(haz.x, haz.y, 14, 1, 60, 180, 3, 5, 0.6);
          }
        }
      } else {
        // Gentle feedback if rung when not matching
        consecutiveCognitiveHits = Math.max(0, consecutiveCognitiveHits - 1);
        soundEngine.playLightNote(392.0, 0.16);
        spawnParticles(player.x, player.y, 6, 1, 30, 90, 2, 4, 0.4);
        const targetSym = chimeHistory[chimeHistory.length - 1 - stage.nBackLevel] || 'SUN';
        const currSym = chimeHistory[chimeHistory.length - 1];
        statusBannerText = `Echo Chime: Current [${currSym}] vs ${stage.nBackLevel}-Back [${targetSym}] — Wait for a match!`;
        statusBannerTimer = 3.0;
      }
    };

    const triggerDendriteGraft = () => {
      const stage = SANCTUARY_STAGES[stateRef.current.stageIndex] || SANCTUARY_STAGES[0];
      // Find nearest ungrafted tree
      let nearestTree: NeuralTree | null = null;
      let nearestDist = Infinity;
      for (const tree of trees) {
        if (tree.grafted) continue;
        const d = Math.hypot(tree.x - player.x, tree.y - player.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestTree = tree;
        }
      }

      if (!nearestTree) return;

      if (nearestDist > 165) {
        statusBannerText = `Move closer to a Dormant Neural Tree to graft a BDNF Synapse Bridge!`;
        statusBannerTimer = 2.8;
        soundEngine.playLightNote(330, 0.15);
        return;
      }

      if (player.nectar < stage.nectarCostPerTree) {
        statusBannerText = `Need ${stage.nectarCostPerTree} BDNF Nectar to Graft (Have ${player.nectar}) — Forage Golden Blooms!`;
        statusBannerTimer = 3.0;
        soundEngine.playLightNote(293.66, 0.15);
        return;
      }

      // Perform BDNF Synaptogenesis Graft!
      player.nectar -= stage.nectarCostPerTree;
      nearestTree.grafted = true;
      nearestTree.graftAnim = 0.01;
      treesGrafted += 1;
      consecutiveCognitiveHits += 1;
      hitstopTimer = 0.065;
      camera.trauma = Math.min(1, camera.trauma + 0.4);
      player.scaleX = 0.82;
      player.scaleY = 1.24;
      soundEngine.playHarmonicChord('graft');
      spawnParticles(nearestTree.x, nearestTree.y, 28, 3, 90, 260, 3.5, 7.5, 0.95);
      spawnFloatingCallout(
        nearestTree.x,
        nearestTree.y,
        `✦ BDNF SYNAPSE GRAFTED (${treesGrafted}/${stage.targetTreesGrafted})`,
        '#B794F4'
      );
      statusBannerText = `Hippocampal Dendrite Grafted (${treesGrafted}/${stage.targetTreesGrafted})! Neural Pathway Illuminated`;
      statusBannerTimer = 4.0;

      // Notify parent so lifetime Cognitive Milestone progress increments immediately
      if (!stateRef.current.isDemoMode) {
        stateRef.current.onTreeGrafted?.();
      }

      // Dispel nearby hazards around newly grafted tree
      for (const haz of hazards) {
        if (haz.koTimer <= 0 && Math.hypot(haz.x - nearestTree.x, haz.y - nearestTree.y) <= 240) {
          haz.hp = 0;
          haz.koTimer = 0.35;
          spawnParticles(haz.x, haz.y, 12, 3, 50, 150, 2.5, 5, 0.6);
        }
      }

      // Check Victory Condition (unless in looping Demo walkthrough)
      if (treesGrafted >= stage.targetTreesGrafted && !stateRef.current.isDemoMode) {
        soundEngine.playHarmonicChord('victory');
        const summary = evaluateCognitiveSummary({
          treesGrafted,
          targetTrees: stage.targetTreesGrafted,
          ufovHits,
          ufovAttempts,
          nBackHits,
          nBackAttempts,
          coherenceSeconds,
          calmVitality: player.calmVitality,
          maxVitality: player.maxVitality,
        });
        stateRef.current.onGameEnd('victory', summary);
      }
    };

    const resolveUfovSectorSelection = (chosenSector: number) => {
      if (!ufovChallenge.active || !ufovChallenge.awaitingSelection) return;
      const stage = SANCTUARY_STAGES[stateRef.current.stageIndex] || SANCTUARY_STAGES[0];
      ufovAttempts += 1;
      const diff = Math.abs(chosenSector - ufovChallenge.peripheralSector);
      const isCorrect = diff === 0 || diff === 1 || diff === 7; // Exact or adjacent sector tolerance for cozy playability

      ufovChallenge.active = false;
      ufovChallenge.awaitingSelection = false;

      if (isCorrect) {
        ufovHits += 1;
        consecutiveCognitiveHits += 1;
        const flowState = computeAdaptiveFlowState({
          consecutiveCognitiveHits,
          coherenceSeconds,
          baseUfovFlashSec: stage.ufovFlashDurationSec,
        });
        const reward = Math.round(25 * flowState.flowMultiplier);
        player.nectar += reward;
        hitstopTimer = 0.05;
        soundEngine.playHarmonicChord('ufov');
        // Compute the exact peripheral sector interaction point and radiate a Cognitive Pulse!
        const secAngle = (ufovChallenge.peripheralSector * Math.PI) / 4 - Math.PI / 2;
        const sectorWorldX = player.x + Math.cos(secAngle) * 145;
        const sectorWorldY = player.y + Math.sin(secAngle) * 145;
        triggerCognitivePulse('ufov_complete', sectorWorldX, sectorWorldY, flowState.flowMultiplier);
        triggerCognitivePulse('ufov_complete', player.x, player.y, flowState.flowMultiplier);
        spawnFloatingCallout(
          sectorWorldX,
          sectorWorldY,
          `✦ UFOV COGNITIVE PULSE +${reward} (${flowState.flowMultiplier}x FLOW)`,
          '#F2B84B'
        );
        statusBannerText = `UFOV Peripheral Cognitive Pulse (${flowState.flowMultiplier}x Flow)! +${reward} Bonus BDNF Nectar`;
        statusBannerTimer = 4.0;
      } else {
        consecutiveCognitiveHits = Math.max(0, consecutiveCognitiveHits - 1);
        soundEngine.playLightNote(349.23, 0.2);
        statusBannerText = 'Peripheral Firefly missed — keep your gaze centered when pulsing shrines!';
        statusBannerTimer = 3.0;
      }
    };

    // Spawn distinct Stress Hazards (3 distinct behavior policies)
    const spawnStressHazard = (stage: typeof SANCTUARY_STAGES[0], elapsed: number) => {
      const ramp = computeDifficultyRamp(stage, elapsed, treesGrafted);
      const activeCount = hazards.filter((h) => h.koTimer <= 0).length;
      if (activeCount >= ramp.activeMaxHazards) return;

      // Spawn along sanctuary perimeter away from player
      const angle = Math.random() * Math.PI * 2;
      const dist = 520 + Math.random() * 140;
      const sx = Math.max(-WORLD_W / 2 + 80, Math.min(WORLD_W / 2 - 80, player.x + Math.cos(angle) * dist));
      const sy = Math.max(-WORLD_H / 2 + 80, Math.min(WORLD_H / 2 - 80, player.y + Math.sin(angle) * dist));

      const r = Math.random();
      let archetype: HazardArchetype = 'ruminator_drifter';
      if (r > ramp.archetypeWeights.ruminator_drifter + ramp.archetypeWeights.distractor_dart) {
        archetype = 'fog_emitter';
      } else if (r > ramp.archetypeWeights.ruminator_drifter) {
        archetype = 'distractor_dart';
      }

      hazards.push({
        id: nextHazardId++,
        archetype,
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        hp: archetype === 'fog_emitter' ? 2 : 1,
        maxHp: archetype === 'fog_emitter' ? 2 : 1,
        radius: archetype === 'fog_emitter' ? 24 : archetype === 'distractor_dart' ? 15 : 19,
        windupTimer: 0,
        isTelegraphing: false,
        targetX: player.x,
        targetY: player.y,
        hitFlashTimer: 0,
        koTimer: 0,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    };

    // Main 60Hz RequestAnimationFrame Loop
    let lastTime = performance.now();
    let hudSyncAccumulator = 0;
    let animFrameId = 0;
    let hasRenderedStaticModalBackdrop = false;

    const tick = (now: number) => {
      animFrameId = requestAnimationFrame(tick);

      // Handle reset signal from parent
      if (externalSignalsRef.current.lastResetSignal !== resetSignal) {
        externalSignalsRef.current.lastResetSignal = resetSignal;
        hasRenderedStaticModalBackdrop = false;
        initSanctuaryWorld(stateRef.current.stageIndex);
      }

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = clampDeltaTime(rawDt);

      const currentGameState = stateRef.current.gameState;
      const isModalCovering =
        stateRef.current.isOverlayModalOpen ||
        currentGameState === 'paused' ||
        currentGameState === 'gameover';

      if (isModalCovering) {
        if (hasRenderedStaticModalBackdrop) {
          return;
        }
        hasRenderedStaticModalBackdrop = true;
      } else {
        hasRenderedStaticModalBackdrop = false;
      }

      const stage = SANCTUARY_STAGES[stateRef.current.stageIndex] || SANCTUARY_STAGES[0];

      // Handle external HUD button signals
      if (externalSignalsRef.current.pendingUfovSector >= 0) {
        const sec = externalSignalsRef.current.pendingUfovSector;
        externalSignalsRef.current.pendingUfovSector = -1;
        resolveUfovSectorSelection(sec);
      }

      if (externalSignalsRef.current.pendingAction) {
        const act = externalSignalsRef.current.pendingAction;
        externalSignalsRef.current.pendingAction = null;
        if (currentGameState === 'playing') {
          if (act === 'pulse') triggerLanternPulseAndForage();
          if (act === 'chime') triggerNBackEchoChime();
          if (act === 'graft') triggerDendriteGraft();
        }
      }

      if (externalSignalsRef.current.pendingDemoStep >= 0) {
        demoStepIndex = externalSignalsRef.current.pendingDemoStep % 4;
        externalSignalsRef.current.pendingDemoStep = -1;
        demoStepElapsed = 0;
        demoSubActionTriggered = false;
        demoSecondSubActionTriggered = false;
      }

      // 1. TITLE SCREEN CAMERA PAN (Live World Camera Tour framed on right side of viewport)
      if (currentGameState === 'title') {
        camera.titleTourAngle += dt * 0.22;
        camera.x = -240 + Math.cos(camera.titleTourAngle) * 140;
        camera.y = Math.sin(camera.titleTourAngle * 0.7) * 110 - 20;
        stageElapsedSec += dt;
        // Ensure first 2 trees are shown in grafted bloom on Title Screen so Milestone Flora previews are vivid
        if (trees.length >= 2) {
          trees[0].grafted = true;
          trees[0].graftAnim = 1;
          trees[1].grafted = true;
          trees[1].graftAnim = 1;
        }
      }

      // 2. PLAYING SIMULATION
      if (currentGameState === 'playing') {
        // Real-dt visual timers (hitstop, camera shake, hit flashes)
        if (hitstopTimer > 0) {
          hitstopTimer = Math.max(0, hitstopTimer - dt);
        }
        if (camera.trauma > 0) {
          camera.trauma = Math.max(0, camera.trauma - dt * 1.8);
        }
        if (player.hitFlashTimer > 0) {
          player.hitFlashTimer = Math.max(0, player.hitFlashTimer - dt);
        }

        const simDt = hitstopTimer > 0 ? 0 : dt;
        stageElapsedSec += simDt;

        if (statusBannerTimer > 0) {
          statusBannerTimer = Math.max(0, statusBannerTimer - simDt);
        }

        // Defeat beat delay
        if (defeatDelayTimer > 0) {
          defeatDelayTimer -= dt;
          if (defeatDelayTimer <= 0) {
            const summary = evaluateCognitiveSummary({
              treesGrafted,
              targetTrees: stage.targetTreesGrafted,
              ufovHits,
              ufovAttempts,
              nBackHits,
              nBackAttempts,
              coherenceSeconds,
              calmVitality: 0,
              maxVitality: player.maxVitality,
            });
            stateRef.current.onGameEnd('defeat', summary);
          }
        }

        if (simDt > 0 && defeatDelayTimer <= 0) {
          // Player movement (WASD / Arrow keys or Interactive Demo Autopilot)
          let moveX = 0;
          let moveY = 0;
          if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) moveY -= 1;
          if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) moveY += 1;
          if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) moveX -= 1;
          if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) moveX += 1;

          // INTERACTIVE HOW-TO-PLAY DEMO AUTOPILOT (when isDemoMode === true and user isn't overriding WASD)
          let demoCoherentBreathOverride = false;
          if (stateRef.current.isDemoMode && moveX === 0 && moveY === 0) {
            demoStepElapsed += simDt;
            const STEP_DURATION = 5.6;

            if (demoStepIndex === 0) {
              // Step 1: UFOV Divided-Attention Forage at Shrine (130, 40)
              stateRef.current.onSelectProtocol('ufov_forage');
              const targetX = 130;
              const targetY = 40;
              const dx = targetX - player.x;
              const dy = targetY - player.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 24) {
                moveX = dx / dist;
                moveY = dy / dist;
              } else if (!demoSubActionTriggered && demoStepElapsed > 1.1) {
                demoSubActionTriggered = true;
                blooms[1].respawnTimer = 0;
                triggerLanternPulseAndForage();
              } else if (
                demoSubActionTriggered &&
                !demoSecondSubActionTriggered &&
                ufovChallenge.active &&
                demoStepElapsed > 2.6
              ) {
                demoSecondSubActionTriggered = true;
                resolveUfovSectorSelection(ufovChallenge.peripheralSector);
              }
            } else if (demoStepIndex === 1) {
              // Step 2: Dual N-Back Working Memory Chimes near Heart-Tree (0, 35)
              stateRef.current.onSelectProtocol('nback_chimes');
              const targetX = 0;
              const targetY = 35;
              const dx = targetX - player.x;
              const dy = targetY - player.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 24) {
                moveX = dx / dist;
                moveY = dy / dist;
              } else if (!demoSubActionTriggered && demoStepElapsed > 1.4) {
                demoSubActionTriggered = true;
                chimeHistory =
                  stage.nBackLevel === 1 ? ['DROP', 'SUN', 'SUN'] : ['SUN', 'LEAF', 'SUN'];
                chimeMatchClaimedThisBeat = false;
                triggerNBackEchoChime();
              }
            } else if (demoStepIndex === 2) {
              // Step 3: 0.1 Hz HRV Vagal Breath Coherence Shield
              stateRef.current.onSelectProtocol('coherence_breath');
              demoCoherentBreathOverride = true;
              const targetX = -40;
              const targetY = 20;
              const dx = targetX - player.x;
              const dy = targetY - player.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 24) {
                moveX = dx / dist;
                moveY = dy / dist;
              }
              if (!demoSubActionTriggered && demoStepElapsed > 0.6) {
                demoSubActionTriggered = true;
                statusBannerText = 'DEMO STEP 3: Holding [⇧ Shift / ⌥ Option] synchronizes 0.1 Hz Vagal Breath & gently repels Stress Wisps!';
                statusBannerTimer = 4.5;
                if (hazards.length === 0) {
                  hazards.push({
                    id: nextHazardId++,
                    archetype: 'ruminator_drifter',
                    x: player.x - 115,
                    y: player.y - 30,
                    vx: 30,
                    vy: 10,
                    hp: 1,
                    maxHp: 1,
                    radius: 19,
                    windupTimer: 0,
                    isTelegraphing: false,
                    targetX: player.x,
                    targetY: player.y,
                    hitFlashTimer: 0,
                    koTimer: 0,
                    phaseOffset: 0,
                  });
                }
              }
            } else if (demoStepIndex === 3) {
              // Step 4: Hippocampal BDNF Dendrite Graft at Dormant Neural Tree
              stateRef.current.onSelectProtocol('dendrite_graft');
              const targetTree = trees.find((t) => !t.grafted) || trees[0];
              if (trees.every((t) => t.grafted)) {
                trees.forEach((t) => {
                  t.grafted = false;
                  t.graftAnim = 0;
                });
                treesGrafted = 0;
              }
              const dx = targetTree.x - player.x;
              const dy = targetTree.y + 45 - player.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 28) {
                moveX = dx / dist;
                moveY = dy / dist;
              } else if (!demoSubActionTriggered && demoStepElapsed > 1.4) {
                demoSubActionTriggered = true;
                if (player.nectar < stage.nectarCostPerTree) {
                  player.nectar = stage.nectarCostPerTree + 15;
                }
                triggerDendriteGraft();
              }
            }

            if (demoStepElapsed >= STEP_DURATION) {
              demoStepElapsed = 0;
              demoStepIndex = (demoStepIndex + 1) % 4;
              demoSubActionTriggered = false;
              demoSecondSubActionTriggered = false;
            }
          }

          const isCoherentBreathing =
            Boolean(stateRef.current.isZenMode) ||
            demoCoherentBreathOverride ||
            keysHeld.has('ShiftLeft') ||
            keysHeld.has('ShiftRight') ||
            keysHeld.has('AltLeft') ||
            keysHeld.has('AltRight') ||
            stateRef.current.activeProtocol === 'coherence_breath';

          if (isCoherentBreathing) {
            coherenceSeconds += simDt;
            // Subtle calm aura particles and gentle vitality regeneration
            if (Math.random() < simDt * 6) {
              spawnParticles(
                player.x + (Math.random() - 0.5) * 90,
                player.y + (Math.random() - 0.5) * 90,
                1,
                2,
                15,
                45,
                2,
                4,
                0.7
              );
            }
            // Gently repel nearby Stress Hazards while breathing coherently
            for (const haz of hazards) {
              if (haz.koTimer > 0) continue;
              const d = Math.hypot(haz.x - player.x, haz.y - player.y);
              if (d < 135 && d > 1) {
                const pushAngle = Math.atan2(haz.y - player.y, haz.x - player.x);
                haz.x += Math.cos(pushAngle) * 110 * simDt;
                haz.y += Math.sin(pushAngle) * 110 * simDt;
                haz.windupTimer = 0;
                haz.isTelegraphing = false;
              }
            }
          }

          if (moveX !== 0 || moveY !== 0) {
            const len = Math.hypot(moveX, moveY);
            moveX /= len;
            moveY /= len;
            const moveSpeed = isCoherentBreathing ? 210 : 275;
            player.vx = moveX * moveSpeed;
            player.vy = moveY * moveSpeed;
            player.facingAngle = Math.atan2(moveY, moveX);
            trackpadGlideVx = 0;
            trackpadGlideVy = 0;
          } else if (Math.hypot(trackpadGlideVx, trackpadGlideVy) > 5) {
            // Smooth Mac Magic Trackpad two-finger glide
            player.vx = trackpadGlideVx;
            player.vy = trackpadGlideVy;
            player.facingAngle = Math.atan2(trackpadGlideVy, trackpadGlideVx);
            trackpadGlideVx *= Math.pow(0.02, simDt);
            trackpadGlideVy *= Math.pow(0.02, simDt);
          } else {
            player.vx *= Math.pow(0.001, simDt);
            player.vy *= Math.pow(0.001, simDt);
          }

          player.x = Math.max(-WORLD_W / 2 + 60, Math.min(WORLD_W / 2 - 60, player.x + player.vx * simDt));
          player.y = Math.max(-WORLD_H / 2 + 60, Math.min(WORLD_H / 2 - 60, player.y + player.vy * simDt));

          // Gait sync to distance traveled + squash-and-stretch recovery
          const stepDist = Math.hypot(player.vx * simDt, player.vy * simDt);
          player.gaitDistance += stepDist * 0.06;
          player.scaleX += (1 - player.scaleX) * Math.min(1, simDt * 14);
          player.scaleY += (1 - player.scaleY) * Math.min(1, simDt * 14);

          if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - simDt);
          if (player.pulseCooldown > 0) player.pulseCooldown = Math.max(0, player.pulseCooldown - simDt);
          if (player.pulseBufferTimer > 0) {
            player.pulseBufferTimer = Math.max(0, player.pulseBufferTimer - simDt);
            if (player.pulseCooldown <= 0) {
              player.pulseBufferTimer = 0;
              triggerLanternPulseAndForage();
            }
          }

          // Edge-triggered actions (including Mac Return key for Synapse Graft)
          const spaceJustPressed = keysJustPressed.has('Space');
          const eJustPressed = keysJustPressed.has('KeyE');
          const qJustPressed = keysJustPressed.has('KeyQ') || keysJustPressed.has('Enter');

          if (qJustPressed) {
            triggerDendriteGraft();
          } else if (eJustPressed || rightMouseJustClicked) {
            triggerNBackEchoChime();
          } else if (spaceJustPressed || mouseJustClicked) {
            // Check if player clicked on UFOV compass ring while awaiting selection
            if (ufovChallenge.active && ufovChallenge.awaitingSelection && mouseJustClicked) {
              const dx = mouseWorldX - player.x;
              const dy = mouseWorldY - player.y;
              const distFromPlayer = Math.hypot(dx, dy);
              if (distFromPlayer >= 45 && distFromPlayer <= 240) {
                const angle = Math.atan2(dy, dx); // -PI..PI, 0 is East
                // Map angle to 8 compass sectors (0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW)
                const deg = ((angle * 180) / Math.PI + 90 + 360) % 360;
                const chosenSector = Math.round(deg / 45) % 8;
                resolveUfovSectorSelection(chosenSector);
              } else {
                triggerLanternPulseAndForage();
              }
            } else {
              // If standing right next to a dormant tree with enough nectar, Space also grafts!
              const canGraftNearby = trees.some(
                (t) =>
                  !t.grafted &&
                  Math.hypot(t.x - player.x, t.y - player.y) <= 130 &&
                  player.nectar >= stage.nectarCostPerTree
              );
              if (canGraftNearby) {
                triggerDendriteGraft();
              } else {
                triggerLanternPulseAndForage();
              }
            }
          }

          // Smooth camera follow
          camera.x += (player.x - camera.x) * Math.min(1, simDt * 7.5);
          camera.y += (player.y - camera.y) * Math.min(1, simDt * 7.5);

          // Update Expanding Waves
          if (player.pulseWaveAlpha > 0) {
            player.pulseWaveRadius += 340 * simDt;
            player.pulseWaveAlpha = Math.max(0, player.pulseWaveAlpha - simDt * 2.2);
          }
          if (player.chimeWaveAlpha > 0) {
            player.chimeWaveRadius += 460 * simDt;
            player.chimeWaveAlpha = Math.max(0, player.chimeWaveAlpha - simDt * 1.6);
          }

          // Update N-Back Chime Totem Sequence
          chimeCycleTimer += simDt;
          if (chimeCycleTimer >= CHIME_INTERVAL_SEC) {
            chimeCycleTimer = 0;
            chimeMatchClaimedThisBeat = false;
            const nextSym = generateNextChimeSymbol(chimeHistory, stage.nBackLevel, Math.random());
            chimeHistory = [...chimeHistory.slice(-5), nextSym];
            soundEngine.playChimeSymbol(nextSym);
          }

          // Update UFOV Divided Attention Timer
          if (ufovChallenge.active) {
            if (ufovChallenge.flashTimer > 0) {
              ufovChallenge.flashTimer = Math.max(0, ufovChallenge.flashTimer - simDt);
            }
          }

          // Update Dew-Blooms
          for (const bloom of blooms) {
            bloom.pulsePhase += simDt * 2.5;
            if (bloom.respawnTimer > 0) {
              bloom.respawnTimer = Math.max(0, bloom.respawnTimer - simDt);
            }
          }

          // Update Neural Trees graft animation
          for (const tree of trees) {
            tree.canopyPhase += simDt * 1.4;
            if (tree.grafted && tree.graftAnim < 1) {
              tree.graftAnim = Math.min(1, tree.graftAnim + simDt * 1.8);
            }
          }

          // Spawn & Update Stress Hazards (with Crowd Token Pool limit of max 2 concurrent telegraphs)
          const ramp = computeDifficultyRamp(stage, stageElapsedSec, treesGrafted);
          hazardSpawnTimer -= simDt;
          if (hazardSpawnTimer <= 0 && !stateRef.current.isDemoMode) {
            hazardSpawnTimer = ramp.spawnIntervalSec;
            spawnStressHazard(stage, stageElapsedSec);
          }

          let activeTelegraphCount = hazards.filter((h) => h.isTelegraphing && h.koTimer <= 0).length;

          for (let i = hazards.length - 1; i >= 0; i--) {
            const haz = hazards[i];
            if (haz.hitFlashTimer > 0) haz.hitFlashTimer = Math.max(0, haz.hitFlashTimer - simDt);

            if (haz.koTimer > 0) {
              haz.koTimer -= simDt;
              if (haz.koTimer <= 0) {
                hazards.splice(i, 1);
              }
              continue;
            }

            const dx = player.x - haz.x;
            const dy = player.y - haz.y;
            const dist = Math.hypot(dx, dy) || 1;

            // 3 Distinct Archetype Movement & Telegraph Policies
            if (haz.archetype === 'ruminator_drifter') {
              // Policy 1: Slow looping sinusoidal orbiter that drifts inward
              const baseAngle = Math.atan2(dy, dx);
              const weaveAngle = baseAngle + Math.sin(stageElapsedSec * 2.2 + haz.phaseOffset) * 0.65;
              const speed = 78 * ramp.hazardSpeedMultiplier;
              haz.vx += (Math.cos(weaveAngle) * speed - haz.vx) * simDt * 4;
              haz.vy += (Math.sin(weaveAngle) * speed - haz.vy) * simDt * 4;
            } else if (haz.archetype === 'distractor_dart') {
              // Policy 2: Line-of-Sight Charger with 0.55s visible + audible windup telegraph
              if (haz.isTelegraphing) {
                haz.vx *= 0.85;
                haz.vy *= 0.85;
                haz.windupTimer -= simDt;
                if (haz.windupTimer <= 0) {
                  // Execute dash along telegraphed vector
                  haz.isTelegraphing = false;
                  const dashAngle = Math.atan2(haz.targetY - haz.y, haz.targetX - haz.x);
                  haz.vx = Math.cos(dashAngle) * 340 * ramp.hazardSpeedMultiplier;
                  haz.vy = Math.sin(dashAngle) * 340 * ramp.hazardSpeedMultiplier;
                }
              } else {
                // Orbit at medium range until telegraph token available
                if (dist < 220 && activeTelegraphCount < 2 && Math.random() < simDt * 1.2) {
                  haz.isTelegraphing = true;
                  haz.windupTimer = 0.55;
                  haz.targetX = player.x;
                  haz.targetY = player.y;
                  activeTelegraphCount += 1;
                  soundEngine.playSoftDissonance(true);
                } else {
                  const tangent = Math.atan2(dy, dx) + 0.85;
                  const speed = 105 * ramp.hazardSpeedMultiplier;
                  haz.vx += (Math.cos(tangent) * speed - haz.vx) * simDt * 3;
                  haz.vy += (Math.sin(tangent) * speed - haz.vy) * simDt * 3;
                }
              }
            } else if (haz.archetype === 'fog_emitter') {
              // Policy 3: Area-Denial Static/Kiting Pulser that keeps distance and telegraphs a fog ring
              const preferredDist = 160;
              const radialDir = dist > preferredDist ? 1 : -0.6;
              const speed = 58 * ramp.hazardSpeedMultiplier;
              haz.vx += ((dx / dist) * radialDir * speed - haz.vx) * simDt * 3;
              haz.vy += ((dy / dist) * radialDir * speed - haz.vy) * simDt * 3;

              if (!haz.isTelegraphing && dist < 190 && activeTelegraphCount < 2 && Math.random() < simDt * 0.9) {
                haz.isTelegraphing = true;
                haz.windupTimer = 0.65;
                haz.targetX = player.x;
                haz.targetY = player.y;
                activeTelegraphCount += 1;
                soundEngine.playSoftDissonance(true);
              } else if (haz.isTelegraphing) {
                haz.windupTimer -= simDt;
                if (haz.windupTimer <= 0) {
                  haz.isTelegraphing = false;
                }
              }
            }

            haz.x += haz.vx * simDt;
            haz.y += haz.vy * simDt;

            // Check collision with Player (invulnerable during Demo Mode)
            if (dist < player.radius + haz.radius && player.invulnTimer <= 0 && !stateRef.current.isDemoMode) {
              player.calmVitality = Math.max(0, player.calmVitality - 1);
              player.invulnTimer = 1.25;
              player.hitFlashTimer = 0.08;
              hitstopTimer = 0.055;
              camera.trauma = Math.min(1, camera.trauma + 0.55);
              soundEngine.playSoftDissonance(false);
              spawnParticles(player.x, player.y, 18, 4, 80, 210, 3, 6, 0.7);

              // Knock hazard back
              haz.vx = (-dx / dist) * 240;
              haz.vy = (-dy / dist) * 240;

              if (player.calmVitality <= 0 && defeatDelayTimer <= 0) {
                defeatDelayTimer = 0.55; // 0.55s final beat on overwhelm
              }
            }
          }
        }
      }

      // Update Pooled Particles (always ticks in real dt for crisp juice during hitstop)
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (particles.active[i] === 0) continue;
        particles.life[i] += dt;
        if (particles.life[i] >= particles.maxLife[i]) {
          particles.active[i] = 0;
          continue;
        }
        particles.x[i] += particles.vx[i] * dt;
        particles.y[i] += particles.vy[i] * dt;
        particles.vx[i] *= 0.95;
        particles.vy[i] *= 0.95;
        particles.alpha[i] = 1 - particles.life[i] / particles.maxLife[i];
      }

      // Clear frame-edge inputs
      keysJustPressed.clear();
      mouseJustClicked = false;
      rightMouseJustClicked = false;

      // ========================================================================
      // RENDER PASS (60 FPS Botanical Sanctuary Canvas2D with Mac Retina DPR)
      // ========================================================================
      const aesthetic = getSanctuaryAestheticConfig(stateRef.current.activeMilestoneId);

      ctx.save();
      ctx.scale(currentDpr, currentDpr);
      ctx.fillStyle = '#091510';
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      // Compute Camera Shake (trauma * trauma)
      const shakeMag = camera.trauma * camera.trauma * 14;
      const shakeX = (Math.random() * 2 - 1) * shakeMag;
      const shakeY = (Math.random() * 2 - 1) * shakeMag;

      ctx.translate(viewWidth / 2 - camera.x + shakeX, viewHeight / 2 - camera.y + shakeY);

      // 1. Sanctuary Mossy Glade Floor & Concentric Topographic Rings
      const bgGrad = ctx.createRadialGradient(0, -40, 60, 0, -40, 820);
      bgGrad.addColorStop(0, '#163529');
      bgGrad.addColorStop(0.55, '#0F261D');
      bgGrad.addColorStop(1, '#091510');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(0, -40, 820, 0, Math.PI * 2);
      ctx.fill();

      // Subtle Botanical Stone Paths connecting Central Heart-Tree to Dormant Trees
      for (const tree of trees) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, -40);
        const midX = tree.x * 0.5 + (tree.y > 0 ? 35 : -35);
        const midY = (tree.y - 40) * 0.5;
        ctx.quadraticCurveTo(midX, midY, tree.x, tree.y);

        if (tree.grafted) {
          // Living Bioluminescent BDNF Mycelial Bridge upgraded by Milestone Aesthetic!
          ctx.strokeStyle = aesthetic.canopyGlowRgba;
          ctx.lineWidth = 18;
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.strokeStyle = aesthetic.myceliumBridgeHex;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Travelling synaptic pulse along grafted bridge
          const pulseT = (stageElapsedSec * 0.65 + tree.id * 0.25) % 1;
          const invT = 1 - pulseT;
          const px = invT * invT * 0 + 2 * invT * pulseT * midX + pulseT * pulseT * tree.x;
          const py = invT * invT * -40 + 2 * invT * pulseT * midY + pulseT * pulseT * tree.y;
          ctx.fillStyle = aesthetic.fireflyColorHex;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Dormant mossy stepping path
          ctx.strokeStyle = 'rgba(244, 239, 230, 0.08)';
          ctx.lineWidth = 14;
          ctx.setLineDash([12, 10]);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Central Heart-Tree & N-Back Harmonic Wind-Chime Totem at (0, -40)
      ctx.save();
      const heartGlow = ctx.createRadialGradient(0, -40, 12, 0, -40, 130);
      heartGlow.addColorStop(0, aesthetic.canopyGlowRgba);
      heartGlow.addColorStop(1, 'rgba(79, 209, 197, 0)');
      ctx.fillStyle = heartGlow;
      ctx.beginPath();
      ctx.arc(0, -40, 130, 0, Math.PI * 2);
      ctx.fill();

      // Trunk & Root Mandala
      ctx.fillStyle = '#2C221E';
      ctx.strokeStyle = aesthetic.myceliumBridgeHex;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -40, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw current N-Back Totem Symbol above Heart-Tree
      const currentChime = chimeHistory[chimeHistory.length - 1] || 'SUN';
      const isCurrentlyMatching = isNBackMatch(chimeHistory, stage.nBackLevel);
      ctx.fillStyle = isCurrentlyMatching ? '#F2B84B' : '#4FD1C5';
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        isCurrentlyMatching ? `★ ${stage.nBackLevel}-BACK MATCH! [PRESS E]` : `TOTEM: ${currentChime}`,
        0,
        -92
      );

      // Draw iconic glyph inside Heart-Tree
      ctx.strokeStyle = isCurrentlyMatching ? '#F2B84B' : '#E6FFFA';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (currentChime === 'SUN') {
        ctx.arc(0, -40, 14, 0, Math.PI * 2);
      } else if (currentChime === 'LEAF') {
        ctx.ellipse(0, -40, 16, 9, -Math.PI / 4, 0, Math.PI * 2);
      } else if (currentChime === 'DROP') {
        ctx.moveTo(0, -56);
        ctx.quadraticCurveTo(15, -36, 0, -26);
        ctx.quadraticCurveTo(-15, -36, 0, -56);
      } else {
        // STAR
        for (let s = 0; s < 8; s++) {
          const r = s % 2 === 0 ? 16 : 7;
          const a = (s * Math.PI) / 4 - Math.PI / 2;
          if (s === 0) ctx.moveTo(Math.cos(a) * r, -40 + Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, -40 + Math.sin(a) * r);
        }
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();

      // 3. Render Neural Trees (Dormant vs Grafted Bioluminescent Canopy with Milestone Flora Colors)
      for (const tree of trees) {
        ctx.save();
        ctx.translate(tree.x, tree.y);
        const sway = Math.sin(tree.canopyPhase) * 3;

        if (tree.grafted) {
          const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 95);
          glow.addColorStop(0, aesthetic.canopyGlowRgba);
          glow.addColorStop(1, 'rgba(104, 211, 145, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, 95, 0, Math.PI * 2);
          ctx.fill();

          // Lush Restored Canopy with Milestone Aesthetic Palette
          ctx.fillStyle = aesthetic.canopyPrimaryHex;
          ctx.strokeStyle = aesthetic.myceliumBridgeHex;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(sway, 0, 32, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = aesthetic.canopyHighlightHex;
          ctx.beginPath();
          ctx.arc(sway - 6, -6, 12, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Dormant Neural Tree awaiting BDNF Graft
          const distToPlayer = Math.hypot(tree.x - player.x, tree.y - player.y);
          const canAfford = player.nectar >= stage.nectarCostPerTree;

          ctx.fillStyle = '#1E2824';
          ctx.strokeStyle = canAfford && distToPlayer < 165 ? '#B794F4' : '#4A5568';
          ctx.lineWidth = canAfford && distToPlayer < 165 ? 3 : 2;
          ctx.beginPath();
          ctx.arc(0, 0, 28, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (distToPlayer < 190) {
            ctx.fillStyle = canAfford ? '#E9D8FD' : '#CBD5E0';
            ctx.font = '600 12px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
              canAfford ? `[Q / SPACE] GRAFT (${stage.nectarCostPerTree})` : `NEED ${stage.nectarCostPerTree} NECTAR`,
              0,
              -38
            );
          }
        }
        ctx.restore();
      }

      // 4. Render Dew-Blooms & UFOV Sun-Dew Shrines
      for (const bloom of blooms) {
        if (bloom.respawnTimer > 0) {
          // Dormant regenerating bud
          ctx.save();
          ctx.translate(bloom.x, bloom.y);
          ctx.fillStyle = 'rgba(242, 184, 75, 0.18)';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          continue;
        }

        ctx.save();
        ctx.translate(bloom.x, bloom.y);
        const pulse = 1 + Math.sin(bloom.pulsePhase) * 0.12;
        const radius = bloom.isUfovShrine ? 18 * pulse : 12 * pulse;

        const bloomGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 2.6);
        bloomGlow.addColorStop(0, bloom.isUfovShrine ? 'rgba(242, 184, 75, 0.55)' : aesthetic.canopyGlowRgba);
        bloomGlow.addColorStop(1, 'rgba(242, 184, 75, 0)');
        ctx.fillStyle = bloomGlow;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = bloom.isUfovShrine ? '#F2B84B' : aesthetic.bloomPetalHex;
        ctx.strokeStyle = '#FFFBEB';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (bloom.isUfovShrine) {
          ctx.fillStyle = '#FEFCBF';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('UFOV SHRINE', 0, -24);
        }
        ctx.restore();
      }

      // 4B. Render Sanctuary Ambient Fireflies (Density & Color scaled by Cognitive Milestone Badge!)
      const activeFireflyLimit = Math.min(MAX_AMBIENT_FIREFLIES, aesthetic.fireflyCount);
      for (let f = 0; f < activeFireflyLimit; f++) {
        const ff = ambientFireflies[f];
        const t = stageElapsedSec * ff.speed + ff.phase;
        const fx = ff.baseX + Math.cos(t) * ff.orbitRadius;
        const fy = ff.baseY + Math.sin(t * 1.3) * ff.orbitRadius;
        const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.4));

        ctx.save();
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = aesthetic.fireflyColorHex;
        ctx.beginPath();
        ctx.arc(fx, fy, ff.size, 0, Math.PI * 2);
        ctx.fill();

        // Soft firefly halo
        ctx.globalAlpha = twinkle * 0.28;
        ctx.beginPath();
        ctx.arc(fx, fy, ff.size * 3.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Render Stress Hazards (with visible windup telegraphs & KO dissolve)
      for (const haz of hazards) {
        ctx.save();
        const alpha = haz.koTimer > 0 ? Math.max(0, haz.koTimer / 0.35) : 1;
        ctx.globalAlpha = alpha;

        // Draw visible windup telegraph sightline or ground ring BEFORE moving to haz center
        if (haz.isTelegraphing && haz.koTimer <= 0) {
          if (haz.archetype === 'distractor_dart') {
            ctx.strokeStyle = 'rgba(245, 101, 101, 0.75)';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(haz.x, haz.y);
            ctx.lineTo(haz.targetX, haz.targetY);
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (haz.archetype === 'fog_emitter') {
            ctx.strokeStyle = 'rgba(245, 101, 101, 0.65)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(haz.x, haz.y, 85, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.translate(haz.x, haz.y);
        if (haz.koTimer > 0) {
          const s = 1 + (1 - alpha) * 0.6;
          ctx.scale(s, s);
        }

        // Distinct silhouette & palette per archetype
        if (haz.hitFlashTimer > 0) {
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#FFFFFF';
        } else if (haz.archetype === 'ruminator_drifter') {
          ctx.fillStyle = '#4A2538';
          ctx.strokeStyle = '#D53F8C';
        } else if (haz.archetype === 'distractor_dart') {
          ctx.fillStyle = '#522222';
          ctx.strokeStyle = '#F56565';
        } else {
          ctx.fillStyle = '#3B2848';
          ctx.strokeStyle = '#9F7AEA';
        }

        ctx.lineWidth = 2;
        ctx.beginPath();
        if (haz.archetype === 'distractor_dart') {
          // Sharp diamond silhouette
          ctx.moveTo(0, -haz.radius);
          ctx.lineTo(haz.radius, 0);
          ctx.lineTo(0, haz.radius);
          ctx.lineTo(-haz.radius, 0);
          ctx.closePath();
        } else if (haz.archetype === 'fog_emitter') {
          // Hexagonal spore silhouette
          for (let h = 0; h < 6; h++) {
            const a = (h * Math.PI) / 3;
            if (h === 0) ctx.moveTo(Math.cos(a) * haz.radius, Math.sin(a) * haz.radius);
            else ctx.lineTo(Math.cos(a) * haz.radius, Math.sin(a) * haz.radius);
          }
          ctx.closePath();
        } else {
          // Cloudy drifter circle
          ctx.arc(0, 0, haz.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 6. Render Player (Bioluminescent Forest Sprite) & Resonance Breath Ring
      const breathState = computeResonanceBreathState(stageElapsedSec);
      const isCoherentBreathing =
        Boolean(stateRef.current.isZenMode) ||
        (stateRef.current.isDemoMode && demoStepIndex === 2) ||
        keysHeld.has('ShiftLeft') ||
        keysHeld.has('ShiftRight') ||
        stateRef.current.activeProtocol === 'coherence_breath';

      ctx.save();
      ctx.translate(player.x, player.y);

      // 0.1 Hz HRV Resonance Breathing Guide Ring around Player
      const breathRadius = 38 + breathState.expansion * 54;
      ctx.strokeStyle = isCoherentBreathing
        ? 'rgba(104, 211, 145, 0.75)'
        : 'rgba(104, 211, 145, 0.25)';
      ctx.lineWidth = isCoherentBreathing ? 3.5 : 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, breathRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Expanding Lantern Pulse & Echo Chime Waves
      if (player.pulseWaveAlpha > 0) {
        ctx.strokeStyle = `rgba(242, 184, 75, ${player.pulseWaveAlpha})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, player.pulseWaveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (player.chimeWaveAlpha > 0) {
        ctx.strokeStyle = `rgba(79, 209, 197, ${player.chimeWaveAlpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, player.chimeWaveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // UFOV Peripheral Divided-Attention Compass Ring when active!
      if (ufovChallenge.active) {
        const ringR = 145;
        for (let sec = 0; sec < 8; sec++) {
          const secAngle = (sec * Math.PI) / 4 - Math.PI / 2;
          const sx = Math.cos(secAngle) * ringR;
          const sy = Math.sin(secAngle) * ringR;

          const isTarget = sec === ufovChallenge.peripheralSector;
          const showFlash = ufovChallenge.flashTimer > 0 && isTarget;

          ctx.fillStyle = showFlash
            ? '#F2B84B'
            : 'rgba(244, 239, 230, 0.16)';
          ctx.strokeStyle = showFlash ? '#FFFBEB' : 'rgba(242, 184, 75, 0.55)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, showFlash ? 18 : 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Sprite Body with Gait Bob & Squash-and-Stretch
      const walkBobY = Math.sin(player.gaitDistance) * 3.5;
      ctx.translate(0, walkBobY);
      ctx.scale(player.scaleX, player.scaleY);

      const spriteGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
      spriteGlow.addColorStop(0, 'rgba(242, 184, 75, 0.65)');
      spriteGlow.addColorStop(1, 'rgba(242, 184, 75, 0)');
      ctx.fillStyle = spriteGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();

      // Cloak & Lantern Core
      ctx.fillStyle = player.hitFlashTimer > 0 ? '#FFFFFF' : '#F4EFE6';
      ctx.strokeStyle = '#F2B84B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Leaf Crown
      ctx.fillStyle = aesthetic.myceliumBridgeHex;
      ctx.beginPath();
      ctx.ellipse(0, -player.radius + 2, 10, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 6B. Update & Render 'Cognitive Pulse' Bioluminescent Shockwaves & Synaptic Filaments
      for (const cp of cognitivePulses) {
        if (!cp.active) continue;
        cp.elapsed += dt;
        const wave = stepCognitivePulseWave(cp.elapsed, cp.durationSec, cp.maxRadius);
        if (!wave.active) {
          cp.active = false;
          continue;
        }

        ctx.save();
        ctx.translate(cp.originX, cp.originY);

        // Bioluminescent radial aura bloom from interaction origin
        const bloomGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, wave.primaryRadius);
        bloomGrad.addColorStop(0, cp.coreGlowRgba);
        bloomGrad.addColorStop(0.55, cp.type === 'nback_match' ? 'rgba(104, 211, 145, 0.18)' : 'rgba(79, 209, 197, 0.18)');
        bloomGrad.addColorStop(1, 'rgba(9, 21, 16, 0)');
        ctx.globalAlpha = wave.coreGlowAlpha;
        ctx.fillStyle = bloomGrad;
        ctx.beginPath();
        ctx.arc(0, 0, wave.primaryRadius, 0, Math.PI * 2);
        ctx.fill();

        // Outer primary bioluminescent harmonic ring
        ctx.globalAlpha = wave.alpha;
        ctx.strokeStyle = cp.primaryColorHex;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, wave.primaryRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner trailing harmonic echo ring
        ctx.strokeStyle = cp.secondaryColorHex;
        ctx.lineWidth = 2.0;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, wave.secondaryRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Radiating synaptic bioluminescent filaments & glowing nodes along the wave front
        for (let f = 0; f < cp.filamentCount; f++) {
          const angle = (Math.PI * 2 * f) / cp.filamentCount + wave.progress * 0.45;
          const innerR = wave.secondaryRadius * 0.65;
          const outerR = wave.primaryRadius;
          const ix = Math.cos(angle) * innerR;
          const iy = Math.sin(angle) * innerR;
          const ox = Math.cos(angle) * outerR;
          const oy = Math.sin(angle) * outerR;

          ctx.strokeStyle = f % 2 === 0 ? cp.primaryColorHex : cp.secondaryColorHex;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(ix, iy);
          ctx.lineTo(ox, oy);
          ctx.stroke();

          ctx.fillStyle = '#FFFDF9';
          ctx.beginPath();
          ctx.arc(ox, oy, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // 7. Render Zero-GC Pooled Bioluminescent Particles (with soft radial halo)
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (particles.active[i] === 0) continue;
        const pColor = PARTICLE_COLORS[particles.colorIdx[i]] || '#FFFDF9';
        const px = particles.x[i];
        const py = particles.y[i];
        const pSize = particles.size[i];

        ctx.save();
        // Soft bioluminescent outer halo
        ctx.globalAlpha = particles.alpha[i] * 0.34;
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.arc(px, py, pSize * 2.1, 0, Math.PI * 2);
        ctx.fill();

        // Crisp luminous core
        ctx.globalAlpha = particles.alpha[i];
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 7B. Update & Render Floating World-Space Telemetry Callouts
      for (const c of callouts) {
        if (!c.active) continue;
        c.life += dt;
        if (c.life >= c.maxLife) {
          c.active = false;
          continue;
        }
        c.y += c.vy * dt;
        c.vy *= 0.96;
        const alpha = 1 - Math.pow(c.life / c.maxLife, 1.6);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#091510';
        ctx.lineWidth = 3.5;
        ctx.strokeText(c.text, c.x, c.y);
        ctx.fillStyle = c.colorHex;
        ctx.fillText(c.text, c.x, c.y);
        ctx.restore();
      }

      ctx.restore();

      // 7C-1. Render Sanctuary Atmosphere Weather Layer (Rain Streaks & Ripples / Meadow Sunbeams / Forest Shafts)
      const activeAtm = stateRef.current.atmosphereId || 'forest';
      if (activeAtm === 'rain') {
        ctx.save();
        ctx.strokeStyle = 'rgba(129, 230, 217, 0.22)';
        ctx.lineWidth = 1.25;
        const rainCount = 42;
        for (let r = 0; r < rainCount; r++) {
          const rx = ((r * 97 + stageElapsedSec * 140) % (viewWidth + 120)) - 60;
          const ry = ((r * 131 + stageElapsedSec * 520) % (viewHeight + 120)) - 60;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 12, ry + 26);
          ctx.stroke();
        }
        // Subtle raindrop floor ripples
        for (let rp = 0; rp < 6; rp++) {
          const cycle = (stageElapsedSec * 0.9 + rp * 0.62) % 1;
          const rpx = ((rp * 233 + 180) % (viewWidth - 200)) + 100;
          const rpy = ((rp * 179 + 140) % (viewHeight - 200)) + 100;
          ctx.strokeStyle = `rgba(79, 209, 197, ${(1 - cycle) * 0.24})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(rpx, rpy, 6 + cycle * 24, 3 + cycle * 11, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      } else if (activeAtm === 'meadow') {
        ctx.save();
        // Warm golden crepuscular sunbeams from top-right canopy
        const beamGrad = ctx.createLinearGradient(viewWidth * 0.75, 0, viewWidth * 0.25, viewHeight);
        beamGrad.addColorStop(0, 'rgba(242, 184, 75, 0.09)');
        beamGrad.addColorStop(0.6, 'rgba(242, 184, 75, 0.03)');
        beamGrad.addColorStop(1, 'rgba(242, 184, 75, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(0, 0, viewWidth, viewHeight);
        ctx.restore();
      }

      // 7C. Render Diegetic Sanctuary Radar Minimap (Bottom-Right Corner during Active Play, hidden in Zen Mode)
      if (currentGameState === 'playing' && !stateRef.current.isZenMode && viewWidth >= 760) {
        const mapW = 136;
        const mapH = 92;
        const mapX = viewWidth - mapW - 22;
        const mapY = viewHeight - mapH - 22;

        ctx.save();
        ctx.fillStyle = 'rgba(9, 21, 16, 0.88)';
        ctx.strokeStyle = '#233D32';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(mapX, mapY, mapW, mapH, 10);
        ctx.fill();
        ctx.stroke();

        // Minimap Header Label
        ctx.fillStyle = '#A3B8B0';
        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('SANCTUARY RADAR', mapX + 8, mapY + 13);

        const toMinimapX = (wx: number) => mapX + mapW / 2 + (wx / WORLD_W) * (mapW - 18);
        const toMinimapY = (wy: number) => mapY + mapH / 2 + 4 + (wy / WORLD_H) * (mapH - 24);

        // Central Heart-Tree Dot
        ctx.fillStyle = '#4FD1C5';
        ctx.beginPath();
        ctx.arc(toMinimapX(0), toMinimapY(-40), 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Neural Trees (Grafted vs Dormant)
        for (const tree of trees) {
          ctx.fillStyle = tree.grafted ? aesthetic.myceliumBridgeHex : '#64748B';
          ctx.beginPath();
          ctx.arc(toMinimapX(tree.x), toMinimapY(tree.y), tree.grafted ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Active UFOV Shrines
        for (const bloom of blooms) {
          if (bloom.respawnTimer > 0 || !bloom.isUfovShrine) continue;
          ctx.fillStyle = '#F2B84B';
          ctx.beginPath();
          ctx.arc(toMinimapX(bloom.x), toMinimapY(bloom.y), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Stress Hazards
        for (const haz of hazards) {
          if (haz.koTimer > 0) continue;
          ctx.fillStyle = '#F56565';
          ctx.beginPath();
          ctx.arc(toMinimapX(haz.x), toMinimapY(haz.y), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Player Sprite Marker
        ctx.fillStyle = '#FFFDF9';
        ctx.strokeStyle = '#F2B84B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(toMinimapX(player.x), toMinimapY(player.y), 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      // 8. Peripheral Low-Vitality Vignette (when Calm Vitality <= 2)
      if (currentGameState === 'playing' && player.calmVitality <= 2) {
        const vigGrad = ctx.createRadialGradient(
          viewWidth / 2,
          viewHeight / 2,
          viewHeight * 0.32,
          viewWidth / 2,
          viewHeight / 2,
          viewWidth * 0.65
        );
        vigGrad.addColorStop(0, 'rgba(245, 101, 101, 0)');
        vigGrad.addColorStop(1, 'rgba(245, 101, 101, 0.28)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }

      // 9. Throttled HUD Snapshot Sync (~10Hz) so React never re-renders at 60Hz
      hudSyncAccumulator += dt;
      if (hudSyncAccumulator >= 0.1) {
        hudSyncAccumulator = 0;
        const summary = evaluateCognitiveSummary({
          treesGrafted,
          targetTrees: stage.targetTreesGrafted,
          ufovHits,
          ufovAttempts,
          nBackHits,
          nBackAttempts,
          coherenceSeconds,
          calmVitality: player.calmVitality,
          maxVitality: player.maxVitality,
        });
        const flowState = computeAdaptiveFlowState({
          consecutiveCognitiveHits,
          coherenceSeconds,
          baseUfovFlashSec: stage.ufovFlashDurationSec,
        });

        stateRef.current.onHudUpdate({
          calmVitality: player.calmVitality,
          maxVitality: player.maxVitality,
          nectar: player.nectar,
          nectarCostPerTree: stage.nectarCostPerTree,
          treesGrafted,
          targetTrees: stage.targetTreesGrafted,
          stageIndex: stateRef.current.stageIndex,
          stageName: stage.name,
          nBackLevel: stage.nBackLevel,
          chimeHistory,
          isNBackReadyToMatch: isNBackMatch(chimeHistory, stage.nBackLevel) && !chimeMatchClaimedThisBeat,
          activeProtocol: stateRef.current.activeProtocol,
          breathPhaseLabel: breathState.phaseLabel,
          breathExpansion: breathState.expansion,
          isCoherentBreathing:
            Boolean(stateRef.current.isZenMode) ||
            (stateRef.current.isDemoMode && demoStepIndex === 2) ||
            keysHeld.has('ShiftLeft') ||
            keysHeld.has('ShiftRight') ||
            keysHeld.has('AltLeft') ||
            keysHeld.has('AltRight') ||
            stateRef.current.activeProtocol === 'coherence_breath',
          ufovActiveChallenge: ufovChallenge.active
            ? {
                active: ufovChallenge.active,
                centerSymbol: ufovChallenge.centerSymbol,
                peripheralSector: ufovChallenge.peripheralSector,
                timeRemaining: ufovChallenge.flashTimer,
                awaitingSelection: ufovChallenge.awaitingSelection,
              }
            : null,
          rejuvenationScore: summary.rejuvenationScore,
          statusBannerText: statusBannerTimer > 0 ? statusBannerText : '',
          demoStepIndex,
          flowMultiplier: flowState.flowMultiplier,
          flowStreak: flowState.flowStreak,
          adaptiveUfovWindowMs: flowState.adaptiveUfovWindowMs,
          flowTier: flowState.flowTier,
          cognitivePulseCount: totalCognitivePulsesTriggered,
          lastCognitivePulseType,
        });
      }
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputsOnBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [resetSignal]);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full overflow-hidden bg-[#091510]">
      <canvas
        ref={canvasRef}
        data-testid="sanctuary-canvas"
        tabIndex={0}
        aria-label="Sylvan Synapse Interactive Botanical Sanctuary Canvas"
        className="block w-full h-full outline-none cursor-crosshair"
      />
    </div>
  );
};
