import type { FrameTrapPreset, GgstButton } from '../types';

// ── Default GGST button binds ──
export const DEFAULT_GGST_BINDS: Record<string, { key: string; gamepad: number }> = {
  P:    { key: 'KeyJ', gamepad: 2  },
  K:    { key: 'KeyK', gamepad: 1  },
  S:    { key: 'KeyL', gamepad: 3  },
  H:    { key: 'KeyI', gamepad: 0  },
  D:    { key: 'KeyU', gamepad: 5  },
  Dash: { key: 'KeyN', gamepad: 9  },
  RC:   { key: 'Space', gamepad: 6  },
};

export const GGST_BUTTONS: GgstButton[] = ['P', 'K', 'S', 'H', 'D'];

// ── Presets (GGST engine-accurate) ──
// ==============================================
//  GGST Engine Reference (from Dustloop):
//  • Input buffer: 5f universal (v1.10+)
//  • Hitstop by attack level: Lv.0=11f Lv.1=12f Lv.2=13f Lv.3=14f Lv.4=15f
//  • Ground blockstun by level: Lv.0=9f  Lv.1=11f Lv.2=13f Lv.3=16f Lv.4=18f
//  • Gatling: 5P self-cancels (5P→5P), cancelable during active+recovery
//  • Special cancel: P/K normals only during active frames, not recovery
//  • onBlock = blockstun - recovery, so -1 means recovery ends 1f after blockstun
// ==============================================

export const frameTrapPresets: FrameTrapPreset[] = [
  {
    id: 'leo-5p-5p',
    character: 'leo',
    characterName: 'Leo Whitefang',
    scenario: '5P → 5P（放帧压制）',
    description:
      '5P被防后Gatling自取消出第二个5P。' +
      '放帧留1-5f缝隙打乱动。按两次P。',
    move1: {
      name: '5P', input: '5P', startup: 5, active: 5, recovery: 6,
      onBlock: -1, onHit: 2, level: 0, damage: 26,
      guard: 'All', cancel: 'Self',
    },
    move2: {
      name: '5P', input: '5P', startup: 5, active: 5, recovery: 6,
      onBlock: -1, onHit: 2, level: 0, damage: 26,
      guard: 'All', cancel: 'Self',
    },
    buttons: ['P'],
    triggerMode: 'single',
    attackLevel: 0,
    blockstunFrames: 9,
    hitstopFrames: 11,
    cancelWindowStart: 0,           // can cancel on first active frame
    cancelWindowEnd: 9,             // Gatling cancel throughout recovery
    inputBuffer: 5,
    targetGapMin: 1,
    targetGapMax: 5,
    totalFrames: 40,                // generous window for visual display
    source: 'https://www.dustloop.com/w/GGST/Leo_Whitefang/Frame_Data',
  },
  {
    id: 'sol-fs-5h',
    character: 'sol',
    characterName: 'Sol Badguy',
    scenario: 'f.S → 5H（frame trap）',
    description:
      'f.S被防+2，5H发生11f。放帧延迟使5H在对手硬直结束瞬间命中。' +
      '留2-6f缝隙抓插动。按S再按H。',
    move1: {
      name: 'f.S', input: 'f.S', startup: 10, active: 2, recovery: 13,
      onBlock: 2, onHit: 3, level: 3, damage: 36,
      guard: 'All', cancel: 'Special',
    },
    move2: {
      name: '5H', input: '5H', startup: 11, active: 4, recovery: 20,
      onBlock: -5, onHit: -3, level: 4, damage: 52,
      guard: 'All', cancel: 'Special',
    },
    buttons: ['S', 'H'],
    triggerMode: 'dual',
    attackLevel: 3,
    blockstunFrames: 16,
    hitstopFrames: 14,
    cancelWindowStart: 0,
    cancelWindowEnd: 15,           // f.S recovery is 13f, onBlock +2 means cancel window extends
    inputBuffer: 5,
    targetGapMin: 2,
    targetGapMax: 6,
    totalFrames: 45,
    source: 'https://www.dustloop.com/w/GGST/Sol_Badguy/Frame_Data',
  },
];

export function getPresetById(id: string): FrameTrapPreset | undefined {
  return frameTrapPresets.find(p => p.id === id);
}
