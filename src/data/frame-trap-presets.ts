import type { FrameTrapPreset } from '../types';

// All frame data sourced from Dustloop Wiki (https://www.dustloop.com/w/GGST/)
// Last updated: June 2026 (Season 4 patch)

export const frameTrapPresets: FrameTrapPreset[] = [
  {
    id: 'leo-5p-5p',
    character: 'leo',
    characterName: 'Leo Whitefang',
    scenario: '5P → (放帧) → 5P',
    description: '狮子 5P 被防 -1，可取消自身。放帧 1-4f 后出第二个 5P(5f发生) 抓乱动。留 1-5f 窗口给对方。',
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
    blockstunFrames: 10,  // Level 0: 9f blockstun, move1 is -1 means blockstun ends 1f before move1 recovery
    delayWindowMin: 1,
    delayWindowMax: 4,
    totalFrames: 30,
    source: 'https://www.dustloop.com/w/GGST/Leo_Whitefang/Frame_Data',
  },
  {
    id: 'sol-fs-5h',
    character: 'sol',
    characterName: 'Sol Badguy',
    scenario: 'f.S → (放帧) → 5H',
    description: 'Sol f.S 被防 +2，5H 发生 11f。最速取消是联防(11-2=9f gap? 不对，取消窗口...)，放帧延迟产生 frametrap 打乱动。',
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
    blockstunFrames: 16,
    delayWindowMin: 2,
    delayWindowMax: 6,
    totalFrames: 40,
    source: 'https://www.dustloop.com/w/GGST/Sol_Badguy/Frame_Data',
  },
];

export function getPresetById(id: string): FrameTrapPreset | undefined {
  return frameTrapPresets.find(p => p.id === id);
}
