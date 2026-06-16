export type FeedbackStatus = 'success' | 'early' | 'late' | 'motion_fail' | 'idle';

export type MotionType = 'none' | '236' | '214';

export type TrainingMode = 'rcc' | 'frame-trap';

export type TriggerMode = 'single' | 'dual';

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

export interface KeyBinds {
  rcKey: string;
  attackKey: string;
  upKey: string;
  downKey: string;
  leftKey: string;
  rightKey: string;
  rcButton: number;
  attackButton: number;
  upButton: number;
  downButton: number;
  leftButton: number;
  rightButton: number;
}

export interface FrameTrapKeyBinds {
  attack1Key: string;
  attack2Key: string;
  upKey: string;
  downKey: string;
  leftKey: string;
  rightKey: string;
  attack1Button: number;
  attack2Button: number;
  upButton: number;
  downButton: number;
  leftButton: number;
  rightButton: number;
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
  barEarly: string;
  barSuccess: string;
  barLate: string;
}

export interface Theme {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}

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
