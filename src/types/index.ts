export type FeedbackStatus = 'success' | 'early' | 'late' | 'motion_fail' | 'idle';
export type MotionType = 'none' | '236' | '214';
export type TrainingMode = 'rcc' | 'frame-trap';
export type TriggerMode = 'single' | 'dual';

// ── GGST Input System ──────────────────────────────
// Dustloop reference: https://www.dustloop.com/w/GGST/Controls
// 5 main attack buttons + Dash + Roman Cancel
export type GgstButton = 'P' | 'K' | 'S' | 'H' | 'D';
export type GgstMacro = 'Dash' | 'RC';
export type GgstAction = GgstButton | GgstMacro;

export interface GgstBind {
  key: string;       // KeyboardEvent.code
  gamepad: number;   // gamepad button index
}

// Default GGST button colors (matching in-game)
export const GGST_BUTTON_COLORS: Record<GgstButton, string> = {
  P: '#E02424', // red — Punch
  K: '#3B82F6', // blue — Kick
  S: '#F59E0B', // amber — Slash
  H: '#22C55E', // green — Heavy Slash
  D: '#A855F7', // purple — Dust
};

export const GGST_MACRO_COLORS: Record<GgstMacro, string> = {
  Dash: '#F97316', // orange
  RC:   '#EC4899', // pink
};

// ── RCC Mode types ──────────────────────────────────
export interface Stats {
  total: number;
  success: number;
  currentStreak: number;
  maxStreak: number;
  reactionTimes: number[];
}

export interface FeedbackState {
  status: FeedbackStatus;
  message: string;
  subMessage?: string;
  frames: number;
}

export interface InputHistoryEntry {
  id: number;
  direction: number;
  buttons: string[];
  timestamp: number;
  endTimestamp: number | null;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  direction: number;
  rc: boolean;
  attack: boolean;
}

// ── Theme types ─────────────────────────────────────
export interface ThemeColors {
  bg: string;
  bgCard: string;
  bgFeedback: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  success: string;
  successBg: string;
  failure: string;
  failureBg: string;
  early: string;
  earlyBg: string;
  late: string;
  lateBg: string;
  border: string;
  barBg: string;
  barSlider: string;
  barEarly: string;
  barSuccess: string;
  barLate: string;
  barBlockstun: string;
  barGrid: string;
}

export interface Theme {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}

// ── Frame Trap types ────────────────────────────────
export interface FrameTrapMove {
  name: string;
  input: string;
  startup: number;
  active: number;
  recovery: number;
  onBlock: number;
  onHit: number;
  level: number;
  damage: number;
  guard: string;
  cancel: string;
}

export interface FrameTrapPreset {
  id: string;
  character: string;
  characterName: string;
  scenario: string;
  description: string;
  move1: FrameTrapMove;
  move2: FrameTrapMove;
  buttons: GgstButton[];
  triggerMode: TriggerMode;
  blockstunFrames: number;
  delayWindowMin: number;
  delayWindowMax: number;
  totalFrames: number;
  source: string;
}

export interface FrameTrapSettings {
  delayMin: number;
  delayMax: number;
  totalFrames: number;
  triggerMode: TriggerMode;
}

// ── Visual Cue types ────────────────────────────────
export interface VisualCueSegment {
  label: string;
  startPct: number;
  endPct: number;
  color: string;
}

export interface VisualCueConfig {
  segments: VisualCueSegment[];
  labels: { position: number; label: string }[];
}
