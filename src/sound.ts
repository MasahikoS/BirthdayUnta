// Web Audio API Retro 8-bit Sound Generator + iOS/Android/PC Haptic & Tactile Feedback

let audioCtx: AudioContext | null = null;
let hapticCheckboxOn = true;

// ============================================================================
// 📱 iPhone (iOS 18+ Safari) & Android 両対応 Haptic Feedback（触覚振動）
// iOS 18+ Safari では <input type="checkbox" switch> を紐付けた <label> を
// ユーザー操作イベント内で .click() すると Taptic Engine が「コツッ」と振動します。
// ※ WebKit が RenderObject を破棄しないよう display:none や pointer-events:none は避け、
//    画面外に 1px で常駐させます。
// ============================================================================
let iosHapticLabel: HTMLLabelElement | null = null;

export function ensureIosHapticElement(): HTMLLabelElement | null {
  if (typeof document === 'undefined') return null;

  // App.tsx 側で事前マウントされた label があればそれを優先利用
  const existing = document.getElementById('unta-ios-haptic-label') as HTMLLabelElement | null;
  if (existing) {
    iosHapticLabel = existing;
    return existing;
  }

  if (iosHapticLabel && document.body.contains(iosHapticLabel)) {
    return iosHapticLabel;
  }
  try {
    const label = document.createElement('label');
    label.id = 'unta-ios-haptic-label';
    label.htmlFor = 'unta-ios-haptic-switch';
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText =
      'position:fixed;top:-100px;left:-100px;width:2px;height:2px;opacity:0.01;overflow:hidden;z-index:-1;';

    const input = document.createElement('input');
    input.id = 'unta-ios-haptic-switch';
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;

    label.appendChild(input);
    document.body.appendChild(label);
    iosHapticLabel = label;
    return label;
  } catch {
    return null;
  }
}

// モジュール読み込み時にも事前生成を試みる
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ensureIosHapticElement(), { once: true });
  } else {
    ensureIosHapticElement();
  }
}

export function setHapticEnabled(enabled: boolean): void {
  hapticCheckboxOn = enabled;
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * ボタン押下時などに呼び出す触覚フィードバック（コツッという振動）
 * @param enabled 振動ON/OFF（省略時はグローバル設定値に従う）
 * @param pattern Android用の振動ミリ秒（デフォルト18ms）
 */
export function triggerHaptic(enabled: boolean = hapticCheckboxOn, pattern: number | number[] = 18): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    // 1. Android 等 Vibration API 対応環境
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }

    // 2. iPhone (iOS 18+ Safari) Taptic Engine switch hack
    const label = ensureIosHapticElement();
    if (label) {
      label.click();
    }
  } catch {
    // ignore
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume: number = 0.15) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error('Audio play error', e);
  }
}

export const sounds = {
  // ボタン押下音（ピピッ）+ ハプティクス振動
  beep: (enabled: boolean = true) => {
    triggerHaptic();
    if (!enabled) return;
    playTone(987.77, 0.05, 'square', 0.1); // B5
  },

  // 選択音（ピロッ）+ ハプティクス振動
  select: (enabled: boolean = true) => {
    triggerHaptic();
    if (!enabled) return;
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.04); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  },

  // もぐもぐ食べる音（ピコ・ピコ）
  eat: (enabled: boolean = true) => {
    triggerHaptic();
    if (!enabled) return;
    const tones = [523.25, 659.25, 523.25, 783.99]; // C5, E5, C5, G5
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 0.08, 'triangle', 0.15);
      }, idx * 100);
    });
  },

  // ★ 好物を食べたときの特別キラキラ音
  favorite: (enabled: boolean = true) => {
    triggerHaptic(hapticCheckboxOn, [20, 40, 25]);
    if (!enabled) return;
    const tones = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 0.08, 'square', 0.13);
      }, idx * 65);
    });
  },

  // 喜ぶ音（ピロリロリン↑）
  happy: (enabled: boolean = true) => {
    if (!enabled) return;
    const tones = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 0.09, 'square', 0.12);
      }, idx * 75);
    });
  },

  // ★ おくすり・治療音（ピロリ〜ン♪）
  cure: (enabled: boolean = true) => {
    triggerHaptic(hapticCheckboxOn, [15, 30, 20]);
    if (!enabled) return;
    const tones = [440, 554.37, 659.25, 880, 1108.73];
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 0.1, 'triangle', 0.16);
      }, idx * 80);
    });
  },

  // ★ よびだしベル音（ピピピッ！）
  callAlert: (enabled: boolean = true) => {
    triggerHaptic(hapticCheckboxOn, [20, 50, 20]);
    if (!enabled) return;
    [0, 110, 220].forEach((delay) => {
      setTimeout(() => playTone(1174.66, 0.06, 'square', 0.11), delay);
    });
  },

  // そうじ / 水洗いの音
  clean: (enabled: boolean = true) => {
    triggerHaptic();
    if (!enabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
  },

  // おやすみ音
  sleep: (enabled: boolean = true) => {
    triggerHaptic();
    if (!enabled) return;
    const tones = [783.99, 659.25, 523.25, 392.0]; // G5, E5, C5, G4
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 0.15, 'triangle', 0.12);
      }, idx * 120);
    });
  },

  // ミニゲーム勝利ファンファーレ
  win: (enabled: boolean = true) => {
    triggerHaptic(hapticCheckboxOn, [20, 40, 30]);
    if (!enabled) return;
    const notes = [
      { f: 523.25, d: 0.1 },
      { f: 659.25, d: 0.1 },
      { f: 783.99, d: 0.1 },
      { f: 1046.5, d: 0.3 },
    ];
    let time = 0;
    notes.forEach((n) => {
      setTimeout(() => playTone(n.f, n.d, 'square', 0.15), time * 1000);
      time += n.d + 0.02;
    });
  },

  // ミニゲーム残念音
  lose: (enabled: boolean = true) => {
    triggerHaptic();
    if (!enabled) return;
    playTone(392.0, 0.15, 'sawtooth', 0.12);
    setTimeout(() => playTone(349.23, 0.25, 'sawtooth', 0.12), 160);
  },

  // ★ 太鼓の達人風: ドン（低音の太鼓）
  taikoDon: (enabled: boolean = true) => {
    triggerHaptic();
    if (!enabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // ignore
    }
  },

  // ★ 太鼓の達人風: カッ（縁・高音スネア）
  taikoKa: (enabled: boolean = true) => {
    triggerHaptic();
    if (!enabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      // ignore
    }
  },

  // ★ アイテムキャッチ音（ポロン♪）
  catchItem: (enabled: boolean = true) => {
    triggerHaptic();
    if (!enabled) return;
    playTone(880, 0.06, 'triangle', 0.18);
    setTimeout(() => playTone(1320, 0.08, 'triangle', 0.2), 60);
  },

  // ★ 進化ファンファーレ
  evolveFanfare: (enabled: boolean = true) => {
    triggerHaptic(hapticCheckboxOn, [25, 50, 25, 50, 40]);
    if (!enabled) return;
    const notes = [
      { f: 440, d: 0.08 },
      { f: 554.37, d: 0.08 },
      { f: 659.25, d: 0.08 },
      { f: 880, d: 0.16 },
      { f: 659.25, d: 0.08 },
      { f: 880, d: 0.4 },
    ];
    let time = 0;
    notes.forEach((n) => {
      setTimeout(() => playTone(n.f, n.d, 'square', 0.2), time * 1000);
      time += n.d + 0.03;
    });
  },

  // 8bit ハッピーバースデー メロディ
  birthdayFanfare: (enabled: boolean = true) => {
    triggerHaptic(hapticCheckboxOn, [30, 50, 30]);
    if (!enabled) return;
    const melody: [number, number][] = [
      [392.0, 0.2], [392.0, 0.2], [440.0, 0.4], [392.0, 0.4], [523.25, 0.4], [493.88, 0.8],
      [392.0, 0.2], [392.0, 0.2], [440.0, 0.4], [392.0, 0.4], [587.33, 0.4], [523.25, 0.8],
      [392.0, 0.2], [392.0, 0.2], [783.99, 0.4], [659.25, 0.4], [523.25, 0.4], [493.88, 0.4], [440.0, 0.6],
      [698.46, 0.2], [698.46, 0.2], [659.25, 0.4], [523.25, 0.4], [587.33, 0.4], [523.25, 0.8],
    ];

    let delay = 0;
    melody.forEach(([freq, dur]) => {
      setTimeout(() => {
        playTone(freq, dur * 0.9, 'square', 0.18);
      }, delay * 1000);
      delay += dur;
    });
  },
};
