import type { FrameTrapPreset, GgstButton } from '../types';

// All frame data sourced from Dustloop Wiki (https://www.dustloop.com/w/GGST/)
// Last updated: June 2026 (Season 4 patch)

// Default keyboard bindings for GGST buttons (can be rebound by user)
export const DEFAULT_GGST_BINDS: Record<GgstButton, { key: string; gamepad: number }> = {
  P:  { key: 'KeyJ', gamepad: 2  },  // X / Square
  K:  { key: 'KeyK', gamepad: 1  },  // A / Cross
  S:  { key: 'KeyL', gamepad: 3  },  // Y / Triangle
  H:  { key: 'KeyI', gamepad: 0  },  // B / Circle
  D:  { key: 'KeyU', gamepad: 5  },  // R1 / RB
};

export const GGST_BUTTONS: GgstButton[] = ['P', 'K', 'S', 'H', 'D'];

export const frameTrapPresets: FrameTrapPreset[] = [
  {
    id: 'leo-5p-5p',
    character: 'leo',
    characterName: 'Leo Whitefang',
    scenario: '5P → 放帧 → 5P',
    description: '5P 被防 -1，可取消自身。放帧 1-4f 后出第二个 5P(5f发生) 抓乱动。留 1-5f 缝隙。按两次 P。',
    move1: {
      name: '5P',
      input: '5P',
      startup: 5,
      active: 5,
      recovery: 6,
      onBlock: -1,
      onHit: 2,
      level: 0,
      damage: 26,
      guard: 'All',
      cancel: 'Self',
    },
    move2: {
      name: '5P',
      input: '5P',
      startup: 5,
      active: 5,
      recovery: 6,
      onBlock: -1,
      onHit: 2,
      level: 0,
      damage: 26,
      guard: 'All',
      cancel: 'Self',
    },
    buttons: ['P'],
    triggerMode: 'single',
    blockstunFrames: 9,
    delayWindowMin: 1,
    delayWindowMax: 4,
    totalFrames: 25,
    source: 'https://www.dustloop.com/w/GGST/Leo_Whitefang/Frame_Data',
  },
  {
    id: 'sol-fs-5h',
    character: 'sol',
    characterName: 'Sol Badguy',
    scenario: 'f.S → 放帧 → 5H',
    description: 'f.S 被防 +2，5H 发生 11f。放帧延迟产生 frametrap，Counter Hit 后可大回报。按 S 再按 H。',
    move1: {
      name: 'f.S',
      input: 'f.S',
      startup: 10,
      active: 2,
      recovery: 13,
      onBlock: 2,
      onHit: 3,
      level: 3,
      damage: 36,
      guard: 'All',
      cancel: 'Special',
    },
    move2: {
      name: '5H',
      input: '5H',
      startup: 11,
      active: 4,
      recovery: 20,
      onBlock: -5,
      onHit: -3,
      level: 4,
      damage: 52,
      guard: 'All',
      cancel: 'Special',
    },
    buttons: ['S', 'H'],
    triggerMode: 'dual',
    blockstunFrames: 16,
    delayWindowMin: 5,
    delayWindowMax: 8,
    totalFrames: 35,
    source: 'https://www.dustloop.com/w/GGST/Sol_Badguy/Frame_Data',
  },
];

export function getPresetById(id: string): FrameTrapPreset | undefined {
  return frameTrapPresets.find(p => p.id === id);
}
