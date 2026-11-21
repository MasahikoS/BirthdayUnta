import { useEffect, useRef, useState } from 'react';
import {
  Utensils,
  Gamepad2,
  Activity,
  Droplets,
  Lightbulb,
  Bell,
  Settings,
  Sparkles,
  Syringe,
  Hand,
} from 'lucide-react';
import { useGame, MAIN_ITEMS, FOOD_MENU, type MainItem, type FoodId } from './hooks/useGame';
import { CatSprite, PixelSprite } from './components/CatSprite';
import {
  POOP,
  HEART_ITEM,
  SKULL_MARK,
  BUTTERFLY_A,
  BUTTERFLY_B,
  ONIGIRI_ITEM,
  SUSHI_ITEM,
  PUDDING_ITEM,
  CAKE,
} from './components/sprites';
import { BirthdayOverlay } from './components/BirthdayOverlay';
import { SettingsModal } from './components/SettingsModal';
import { MiniGames } from './components/MiniGames';
import { MAX_LEVEL, ADULT_VARIANTS, getAdultVariantInfo, type ShellColor } from './game/state';

const ICONS: Record<MainItem, { Icon: typeof Utensils; label: string }> = {
  meal: { Icon: Utensils, label: 'ごはん' },
  light: { Icon: Lightbulb, label: 'でんき' },
  game: { Icon: Gamepad2, label: 'あそぶ' },
  medicine: { Icon: Syringe, label: 'おくすり' },
  clean: { Icon: Droplets, label: 'そうじ' },
  status: { Icon: Activity, label: 'メーター' },
  stroke: { Icon: Hand, label: 'しつけ' },
};

const FOOD_SPRITE: Record<FoodId, readonly string[]> = {
  onigiri: ONIGIRI_ITEM,
  sushi: SUSHI_ITEM,
  pudding: PUDDING_ITEM,
  cake: CAKE,
};

// 💎 クリアスケルトン（半透明プラスチック）たまご型シェルのスタイル定義
const SHELL_STYLES: Record<
  ShellColor,
  {
    bodyGrad: string;
    pcbTint: string;
    borderStroke: string;
    rimGlow: string;
    bezelBg: string;
    bezelLines: string;
    tabGrad: string;
  }
> = {
  pink: {
    bodyGrad:
      'radial-gradient(ellipse at 45% 22%, rgba(255, 228, 240, 0.72) 0%, rgba(244, 114, 182, 0.76) 52%, rgba(190, 24, 93, 0.86) 96%)',
    pcbTint: '#831843',
    borderStroke: 'rgba(157, 23, 77, 0.85)',
    rimGlow: 'rgba(255, 192, 225, 0.75)',
    bezelBg: 'rgba(131, 24, 67, 0.68)',
    bezelLines: 'rgba(80, 7, 36, 0.38)',
    tabGrad: 'linear-gradient(180deg, rgba(249,168,212,0.85) 0%, rgba(190,24,93,0.9) 100%)',
  },
  mint: {
    bodyGrad:
      'radial-gradient(ellipse at 45% 22%, rgba(204, 251, 241, 0.72) 0%, rgba(45, 212, 191, 0.76) 52%, rgba(15, 118, 110, 0.86) 96%)',
    pcbTint: '#115e59',
    borderStroke: 'rgba(19, 78, 74, 0.85)',
    rimGlow: 'rgba(153, 246, 228, 0.75)',
    bezelBg: 'rgba(19, 78, 74, 0.68)',
    bezelLines: 'rgba(4, 47, 46, 0.38)',
    tabGrad: 'linear-gradient(180deg, rgba(94,234,212,0.85) 0%, rgba(15,118,110,0.9) 100%)',
  },
  lavender: {
    bodyGrad:
      'radial-gradient(ellipse at 45% 22%, rgba(237, 233, 254, 0.72) 0%, rgba(167, 139, 250, 0.76) 52%, rgba(91, 33, 182, 0.86) 96%)',
    pcbTint: '#4c1d95',
    borderStroke: 'rgba(76, 29, 149, 0.85)',
    rimGlow: 'rgba(221, 214, 254, 0.75)',
    bezelBg: 'rgba(76, 29, 149, 0.68)',
    bezelLines: 'rgba(46, 16, 101, 0.38)',
    tabGrad: 'linear-gradient(180deg, rgba(196,181,253,0.85) 0%, rgba(91,33,182,0.9) 100%)',
  },
  yellow: {
    bodyGrad:
      'radial-gradient(ellipse at 45% 22%, rgba(254, 249, 195, 0.72) 0%, rgba(250, 204, 21, 0.76) 52%, rgba(180, 83, 9, 0.86) 96%)',
    pcbTint: '#78350f',
    borderStroke: 'rgba(146, 64, 14, 0.85)',
    rimGlow: 'rgba(254, 240, 138, 0.75)',
    bezelBg: 'rgba(120, 53, 15, 0.68)',
    bezelLines: 'rgba(69, 26, 3, 0.38)',
    tabGrad: 'linear-gradient(180deg, rgba(253,224,71,0.85) 0%, rgba(180,83,9,0.9) 100%)',
  },
  blue: {
    bodyGrad:
      'radial-gradient(ellipse at 45% 22%, rgba(224, 242, 254, 0.72) 0%, rgba(14, 165, 233, 0.78) 52%, rgba(3, 105, 161, 0.88) 96%)',
    pcbTint: '#064e3b',
    borderStroke: 'rgba(7, 89, 133, 0.88)',
    rimGlow: 'rgba(186, 230, 253, 0.78)',
    bezelBg: 'rgba(12, 74, 110, 0.72)',
    bezelLines: 'rgba(8, 47, 73, 0.42)',
    tabGrad: 'linear-gradient(180deg, rgba(56,189,248,0.85) 0%, rgba(3,105,161,0.92) 100%)',
  },
};

function Meter({ value }: { value: number }) {
  return (
    <span className="tracking-widest">
      {Array.from({ length: MAX_LEVEL }, (_, i) => (i < value ? '♥' : '♡')).join('')}
    </span>
  );
}

/** 2コマで羽ばたくドット絵ちょうちょ */
function FlyingButterfly() {
  const [wing, setWing] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setWing((w) => (w === 0 ? 1 : 0)), 220);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="butterfly-fly pointer-events-none absolute left-0 top-9 z-20">
      <PixelSprite rows={wing === 0 ? BUTTERFLY_A : BUTTERFLY_B} size={3} />
    </div>
  );
}

/**
 * 🔬 スケルトン筐体の奥にうっすら透けて見える内部基板（PCB）・ネジ受け支柱・配線レイヤー
 */
function TranslucentInternals({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 340 460"
      className="pointer-events-none absolute inset-0 w-full h-full opacity-35 mix-blend-multiply z-0"
    >
      <ellipse cx="170" cy="240" rx="124" ry="168" fill="#0d9488" fillOpacity="0.35" stroke={color} strokeWidth="2" />
      <circle cx="170" cy="92" r="32" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="6 3" />
      <circle cx="170" cy="92" r="20" fill={color} fillOpacity="0.25" />

      {[
        { cx: 68, cy: 135 },
        { cx: 272, cy: 135 },
        { cx: 68, cy: 335 },
        { cx: 272, cy: 335 },
      ].map((p, idx) => (
        <g key={idx}>
          <circle cx={p.cx} cy={p.cy} r="13" fill="rgba(255,255,255,0.22)" stroke={color} strokeWidth="2.5" />
          <circle cx={p.cx} cy={p.cy} r="5.5" fill={color} fillOpacity="0.55" />
        </g>
      ))}

      <g stroke={color} strokeWidth="2" fill="none" opacity="0.65">
        <path d="M 95 95 L 125 95 L 138 115" />
        <path d="M 245 95 L 215 95 L 202 115" />
        <circle cx="95" cy="95" r="3.5" fill={color} />
        <circle cx="245" cy="95" r="3.5" fill={color} />
        <rect x="112" y="72" width="16" height="10" rx="2" fill={color} fillOpacity="0.4" />
        <rect x="212" y="72" width="16" height="10" rx="2" fill={color} fillOpacity="0.4" />

        <path d="M 105 390 L 105 350 L 130 330" />
        <path d="M 170 402 L 170 345" />
        <path d="M 235 390 L 235 350 L 210 330" />
        <circle cx="105" cy="390" r="16" strokeWidth="2.5" />
        <circle cx="170" cy="402" r="16" strokeWidth="2.5" />
        <circle cx="235" cy="390" r="16" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

export default function App() {
  const g = useGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { state, screen } = g;

  const shell = SHELL_STYLES[state.shellColor || 'pink'];
  const adultInfo = getAdultVariantInfo(state.adultType);

  // A＋Cボタン同時押しで隠しコマンド: お誕生日サプライズ演出
  const downARef = useRef(false);
  const downCRef = useRef(false);
  const skipAClickRef = useRef(false);
  const skipCClickRef = useRef(false);

  const downA = () => {
    downARef.current = true;
    if (downCRef.current) {
      skipAClickRef.current = true;
      skipCClickRef.current = true;
      g.openBirthday(false);
    }
  };
  const upA = () => {
    downARef.current = false;
  };
  const clickA = () => {
    if (skipAClickRef.current) {
      skipAClickRef.current = false;
      return;
    }
    g.pressA();
  };

  const downC = () => {
    downCRef.current = true;
    if (downARef.current) {
      skipAClickRef.current = true;
      skipCClickRef.current = true;
      g.openBirthday(false);
    }
  };
  const upC = () => {
    downCRef.current = false;
  };
  const clickC = () => {
    if (skipCClickRef.current) {
      skipCClickRef.current = false;
      return;
    }
    g.pressC();
  };

  /**
   * 📺 実機たまごっち仕様の液晶セグメントアイコン
   * 非選択時はうっすら消灯（opacity-25の液晶セグメント跡）、選択された時だけ濃くくっきり点灯
   */
  const iconButton = (item: MainItem) => {
    const i = MAIN_ITEMS.indexOf(item);
    const { Icon, label } = ICONS[item];
    const selected = screen === 'main' && g.cursor === i;
    const alertHighlight = (item === 'medicine' && state.sick) || (item === 'stroke' && state.calling);

    return (
      <button
        key={item}
        onClick={() => g.tapIcon(i)}
        aria-label={label}
        className={`flex flex-col items-center px-1 py-0.5 leading-none transition-opacity cursor-pointer select-none ${
          selected
            ? 'opacity-100 bg-[#2f3a22] text-[var(--lcd)] shadow-[0_0_0_1px_#2f3a22]'
            : alertHighlight
            ? 'opacity-90 animate-pulse text-[#2f3a22]'
            : 'opacity-25 hover:opacity-50 text-[#2f3a22]'
        }`}
      >
        <Icon size={12} strokeWidth={2.6} />
        <span className="mt-0.5 text-[7px] font-bold tracking-tighter">{label}</span>
      </button>
    );
  };

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-3 p-3 select-none overflow-x-hidden font-sans"
      style={{
        backgroundColor: '#fdf4f8',
        backgroundImage: `
          linear-gradient(45deg, rgba(244, 114, 182, 0.07) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(56, 189, 248, 0.07) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(250, 204, 21, 0.07) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(167, 139, 250, 0.07) 75%)
        `,
        backgroundSize: '64px 64px',
      }}
    >
      {/* 📱 iOS 18+ Safari Taptic Engine 用 隠しスイッチ要素（初回タップから確実に振動させるため常駐） */}
      <label
        id="unta-ios-haptic-label"
        htmlFor="unta-ios-haptic-switch"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-100px',
          left: '-100px',
          width: '2px',
          height: '2px',
          opacity: 0.01,
          overflow: 'hidden',
          zIndex: -1,
        }}
      >
        <input
          id="unta-ios-haptic-switch"
          type="checkbox"
          tabIndex={-1}
          {...({ switch: '' } as Record<string, string>)}
        />
      </label>

      {/* 右上の歯車（設定＆着せ替え） */}
      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="せってい"
        className="fixed right-3 top-3 z-30 rounded-full bg-white/90 hover:bg-white p-2.5 text-pink-500 shadow-lg active:scale-90 transition backdrop-blur-xs cursor-pointer border border-pink-200"
      >
        <Settings size={18} />
      </button>

      {/* ======================================================== */}
      {/* 💎 クリアスケルトン（半透明）たまご型トイ本体 */}
      {/* ======================================================== */}
      <div className="relative flex items-center justify-center drop-shadow-[0_26px_32px_rgba(0,0,0,0.28)]">
        {/* 上部のクリアキーチェーンタブ */}
        <div
          className="absolute -top-5 left-1/2 -translate-x-1/2 w-11 h-11 rounded-full flex items-center justify-center z-0 backdrop-blur-[2px]"
          style={{
            background: shell.tabGrad,
            border: `2.5px solid ${shell.borderStroke}`,
            boxShadow: `inset 0 2px 4px rgba(255,255,255,0.75), 0 3px 6px rgba(0,0,0,0.2)`,
          }}
        >
          <div className="w-4 h-4 rounded-full bg-[#fdf4f8] shadow-[inset_0_2px_4px_rgba(0,0,0,0.45),0_0_0_2px_rgba(255,255,255,0.5)] border border-black/30 -translate-y-0.5" />
        </div>

        {/* アウタークリアシェル */}
        <div
          className="relative w-[min(365px,94vw)] aspect-[355/475] rounded-[50%_50%_48%_48%_/_58%_58%_42%_42%] p-2.5 transition-all duration-500 flex flex-col items-center justify-between z-10 overflow-hidden backdrop-blur-[3px]"
          style={{
            background: shell.bodyGrad,
            border: `3px solid ${shell.borderStroke}`,
            boxShadow: `
              inset 0 0 0 3px rgba(255, 255, 255, 0.38),
              inset 0 8px 18px rgba(255, 255, 255, 0.85),
              inset 0 -14px 24px rgba(0, 0, 0, 0.38),
              inset 8px 0 16px ${shell.rimGlow},
              inset -8px 0 16px ${shell.rimGlow}
            `,
          }}
        >
          <TranslucentInternals color={shell.pcbTint} />

          {/* クリアプラスチックの三日月グロス反射 */}
          <div
            className="pointer-events-none absolute top-3 left-7 w-[68%] h-16 rounded-[50%] -rotate-12 z-20"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.22) 55%, rgba(255,255,255,0) 100%)',
              filter: 'blur(0.5px)',
            }}
          />
          <div
            className="pointer-events-none absolute bottom-4 right-8 w-28 h-8 rounded-[50%] -rotate-25 z-20"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.45) 0%, transparent 75%)',
            }}
          />

          {/* 左右のクリアパーツ分割ライン */}
          <div className="pointer-events-none absolute top-[56%] left-0 w-[14%] h-[2px] bg-gradient-to-r from-white/80 to-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.4)] rotate-6 z-20" />
          <div className="pointer-events-none absolute top-[56%] right-0 w-[14%] h-[2px] bg-gradient-to-l from-white/80 to-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.4)] -rotate-6 z-20" />

          {/* 上部スペーサー（すっきりした本体デザイン） */}
          <div className="h-6 z-20" />

          {/* ======================================================== */}
          {/* 📺 クリアカット掘り込みベゼル × 四角いLCDドットマトリクス画面 */}
          {/* ======================================================== */}
          <div className="w-[76%] z-20 relative">
            <div
              className="p-2.5 border-2 border-white/50 shadow-[inset_0_5px_10px_rgba(0,0,0,0.65),inset_0_-3px_6px_rgba(255,255,255,0.5),0_4px_10px_rgba(0,0,0,0.3)] rounded-none relative backdrop-blur-[1px]"
              style={{
                backgroundColor: shell.bezelBg,
                backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 11px, ${shell.bezelLines} 11px, ${shell.bezelLines} 13px)`,
              }}
            >
              {/* 四角い液晶画面（LCD） */}
              <div
                className="lcd-font relative flex aspect-[1/1] flex-col overflow-hidden border-2 border-[#3d4a2d] text-[#2f3a22] rounded-none z-10 touch-none"
                style={{
                  ['--lcd' as string]: '#c8d4a9',
                  background: 'var(--lcd)',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45), 0 0 0 1.5px rgba(255,255,255,0.6)',
                }}
              >
                {/* 🔬 微細な1pxドットマトリクス液晶網目オーバーレイ */}
                <div className="lcd-matrix-grid pointer-events-none absolute inset-0 z-25" />

                {/* 透明アクリル風防の斜めグロス反射 */}
                <div
                  className="pointer-events-none absolute inset-0 z-30"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.10) 26%, transparent 44%, rgba(255,255,255,0.12) 100%)',
                  }}
                />

                {/* 液晶上段: 4アイコン（ごはん・でんき・あそぶ・おくすり） */}
                <div className="grid grid-cols-4 place-items-center border-b border-[#2f3a22]/25 px-1 py-0.5 bg-[#2f3a22]/5 relative z-10">
                  {iconButton('meal')}
                  {iconButton('light')}
                  {iconButton('game')}
                  {iconButton('medicine')}
                </div>

                {/* 液晶中央: メイン表示エリア */}
                <div className="relative flex-1 overflow-hidden z-10">
                  {/* メイン画面 */}
                  {screen === 'main' && (
                    <div
                      onClick={g.tapCat}
                      className="flex h-full cursor-pointer flex-col items-center justify-end pb-3 pt-6"
                    >
                      {/* 四角いセリフ吹き出し（メイン画面のときだけ表示し、メニュー画面とは重ならないように制御） */}
                      {g.bubble && (
                        <div className="absolute left-1/2 top-1 z-20 w-[94%] -translate-x-1/2 border-2 border-[#2f3a22] bg-[var(--lcd)] px-1.5 py-1 text-center text-[10px] font-bold leading-snug shadow rounded-none animate-bounce">
                          {g.bubble}
                        </div>
                      )}

                      {/* 🦋 待機小ネタ演出: ちょうちょ飛来 */}
                      {g.idleEvent === 'butterfly' && <FlyingButterfly />}

                      <div className="relative">
                        <CatSprite
                          stage={state.stage}
                          adultType={state.adultType}
                          pose={g.pose}
                          still={state.sleeping}
                        />

                        {/* 睡眠Zzzマーク */}
                        {state.sleeping && (
                          <span className="zzz absolute -right-6 -top-3 text-sm font-black">Z z</span>
                        )}

                        {/* 💀 びょうき（しょんぼり）時のドクロ/ぐるぐるマーク */}
                        {state.sick && !state.sleeping && (
                          <div className="absolute -right-6 -top-4 animate-bounce">
                            <PixelSprite rows={SKULL_MARK} size={3} />
                          </div>
                        )}

                        {/* 🔔 わがまま呼び出し中マーク */}
                        {state.calling && !state.sick && !state.sleeping && (
                          <div className="absolute -left-5 -top-3 text-xs font-black animate-bounce border border-[#2f3a22] px-1 bg-[var(--lcd)]">
                            !
                          </div>
                        )}

                        {/* 🥱 あくび小ネタ時のふわぁマーク */}
                        {g.idleEvent === 'yawn' && !state.sleeping && (
                          <span className="zzz absolute -right-6 -top-2 text-[10px] font-bold">ふわぁ</span>
                        )}

                        {/* 💖 好物を食べたとき・なでたときのハート演出 */}
                        {(g.anim === 'eatFavorite' || g.anim === 'stroke' || g.anim === 'cure') && (
                          <div className="float-heart pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 flex gap-1">
                            <PixelSprite rows={HEART_ITEM} size={3} />
                            <PixelSprite rows={HEART_ITEM} size={2.5} />
                          </div>
                        )}
                      </div>

                      <div className="mt-1 h-1 w-20 bg-[#2f3a22]/20" />

                      {/* うんち表示（最大3個） */}
                      <div className="absolute bottom-2 right-2 flex flex-col-reverse items-center gap-0.5">
                        {Array.from({ length: state.poop }, (_, i) => (
                          <PixelSprite key={i} rows={POOP} size={3.5} />
                        ))}
                      </div>

                      {/* そうじ水洗アニメ */}
                      {g.anim === 'clean' && (
                        <div className="wash pointer-events-none absolute inset-y-0 left-0 flex w-1/2 items-center justify-around bg-[#2f3a22]/15">
                          <Droplets size={22} /> <Droplets size={22} /> <Droplets size={22} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🍙 ごはん・おやつ選択画面（好物システム対応 4種） */}
                  {screen === 'meal' && (
                    <div className="flex h-full flex-col justify-between p-1.5 overflow-hidden">
                      <div className="text-[10px] font-bold border-b border-[#2f3a22]/30 pb-0.5 w-full text-center leading-tight">
                        なにをあげる？ [A:選択 B:決定]
                      </div>
                      <div className="flex flex-col gap-1 my-auto px-0.5">
                        {FOOD_MENU.map((opt, i) => (
                          <button
                            key={opt.id}
                            onClick={() => g.tapMealOption(i)}
                            className={`w-full border border-[#2f3a22] px-1.5 py-0.5 flex items-center justify-between text-[10px] leading-snug font-bold transition active:scale-95 rounded-none cursor-pointer ${
                              g.sub === i ? 'bg-[#2f3a22] text-[var(--lcd)]' : 'bg-transparent'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <span>{g.sub === i ? '▶' : '　'}</span>
                              <PixelSprite rows={FOOD_SPRITE[opt.id]} size={1.8} />
                              <span>{opt.name}</span>
                            </span>
                            <span className="text-[8.5px] opacity-85">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => g.pressC()}
                        className="text-[9px] leading-none text-[#2f3a22]/75 underline text-center cursor-pointer"
                      >
                        もどる [C]
                      </button>
                    </div>
                  )}

                  {/* ミニゲーム4種画面 */}
                  {screen === 'game' && (
                    <MiniGames
                      stage={state.stage}
                      adultType={state.adultType}
                      soundOn={state.soundOn}
                      onFinish={g.handleGameFinish}
                      onCancel={() => g.pressC()}
                      registerController={(ctl) => {
                        g.miniGameControllerRef.current = ctl;
                      }}
                    />
                  )}

                  {/* 📊 ステータス画面（しつけメーター・歴代コレクション・次世代タマゴ迎え入れ） */}
                  {screen === 'status' && (
                    <div className="flex h-full flex-col justify-between p-1.5 text-xs font-bold overflow-hidden">
                      <div className="flex items-center justify-between border-b border-[#2f3a22]/30 pb-0.5 text-[9.5px] leading-tight">
                        <span>★ {state.generation ?? 1}代目 メーター</span>
                        <span>
                          図鑑:{' '}
                          {ADULT_VARIANTS.map((v) => {
                            const unlocked =
                              (state.unlockedAdults ?? []).includes(v.id) ||
                              (state.stage === 'adult' && state.adultType === v.id);
                            return unlocked ? '●' : '○';
                          }).join('')}
                        </span>
                      </div>
                      <div className="space-y-0.5 px-0.5 my-auto text-[9.5px] leading-snug">
                        <div className="flex justify-between items-center">
                          <span>おなか</span>
                          <Meter value={state.hunger} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>ごきげん</span>
                          <Meter value={state.happy} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>しつけ</span>
                          <Meter value={state.discipline ?? 1} />
                        </div>
                        <div className="flex justify-between items-center pt-0.5 border-t border-[#2f3a22]/20">
                          <span>すがた ({g.age}日目)</span>
                          <span>{state.stage === 'baby' ? 'べびうんた' : adultInfo.name}</span>
                        </div>
                        {state.stage === 'baby' ? (
                          <div className="flex justify-between items-center">
                            <span>なかよし度</span>
                            <span>{state.careCount} / 10 ptで進化</span>
                          </div>
                        ) : g.canNextEgg ? (
                          <button
                            type="button"
                            onClick={() => g.welcomeNextEgg()}
                            className="w-full mt-0.5 py-0.5 px-1 bg-[#2f3a22] text-[var(--lcd)] text-[9.5px] font-black flex items-center justify-center gap-1 animate-pulse cursor-pointer active:scale-95"
                          >
                            <img
                              src="./characters/egg.png"
                              alt="たまご"
                              className="w-3.5 h-3.5 object-contain bg-[var(--lcd)] rounded-xs p-[1px]"
                            />
                            <span>新しいタマゴをむかえる ({(state.generation ?? 1) + 1}代目へ)</span>
                          </button>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1">
                              <img src="./characters/egg.png" alt="たまご" className="w-3.5 h-3.5 object-contain" />
                              <span>次のタマゴ解禁まで</span>
                            </span>
                            <span>あと {g.nextEggRemaining} pt</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => g.pressC()}
                        className="text-[8.5px] leading-none text-center text-[#2f3a22]/75 underline cursor-pointer"
                      >
                        もどる [C]
                      </button>
                    </div>
                  )}

                  {/* 進化演出画面（前半はどの子に育つか秘密 ➔ 後半でお披露目！） */}
                  {screen === 'evolving' && (
                    <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2 text-center">
                      {!g.evolveReveal ? (
                        <>
                          <Sparkles size={20} className="animate-spin text-[#2f3a22]" />
                          <div className="text-[11px] font-black animate-pulse">
                            ★ どの子に育つかな…！？ ★
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <CatSprite stage="baby" pose="surprised" size={5.5} />
                            <span className="text-lg font-black animate-bounce">➔ ？</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[11px] font-black animate-bounce">
                            ★ {adultInfo.name} に進化！！ ★
                          </div>
                          <div className="scale-105 my-0.5">
                            <CatSprite stage="adult" adultType={state.adultType} pose="love" size={6} />
                          </div>
                          <div className="text-[9px] font-bold opacity-85">{adultInfo.name}</div>
                        </>
                      )}
                    </div>
                  )}

                  {/* 新しいタマゴ（世代交代）誕生演出画面 */}
                  {screen === 'new_egg' && (
                    <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2 text-center">
                      {!g.eggHatched ? (
                        <>
                          <div className="text-[10px] font-black leading-tight">
                            ♥ いっぱいかわいがってくれて
                            <br />
                            ありがとうにゃ！！
                          </div>
                          <div className="flex items-end justify-center gap-3 my-1">
                            <div className="translate-y-1">
                              <CatSprite stage="adult" adultType={state.adultType} pose="love" size={5.2} still />
                            </div>
                            <span className="text-sm font-black pb-3">➔</span>
                            <img
                              src="./characters/egg.png"
                              alt="たまご"
                              className="w-12 h-12 object-contain"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10.5px] font-black animate-bounce">
                            ★ {state.generation ?? 2}代目の べびうんた 誕生！ ★
                          </div>
                          <div className="scale-105 my-0.5">
                            <CatSprite stage="baby" pose="happy" size={5.8} />
                          </div>
                          <div className="text-[8.5px] font-bold opacity-85">
                            つぎはどの子に育つかな？わくわく♪
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* でんきOFF（睡眠時の暗転レイヤー） */}
                  {state.sleeping && (
                    <div className="pointer-events-none absolute inset-0 z-20 bg-black/50 flex items-center justify-center text-white/60 text-xs font-mono">
                      Zzz...
                    </div>
                  )}
                </div>

                {/* 液晶下段: 4アイコン（そうじ・メーター・しつけ・よんでるベル） */}
                <div className="grid grid-cols-4 place-items-center border-t border-[#2f3a22]/25 px-1 py-0.5 bg-[#2f3a22]/5 relative z-10">
                  {iconButton('clean')}
                  {iconButton('status')}
                  {iconButton('stroke')}
                  <div
                    className={`flex flex-col items-center px-1 py-0.5 leading-none transition-opacity ${
                      g.attention ? 'opacity-100 animate-pulse text-[#2f3a22]' : 'opacity-20 text-[#2f3a22]'
                    }`}
                  >
                    <Bell size={12} strokeWidth={2.6} />
                    <span className="mt-0.5 text-[7px] font-bold tracking-tighter">よんでる</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 🔘 クリアソケット付き立体ドームボタン（A, B, C） */}
          {/* ======================================================== */}
          <div className="w-full flex items-center justify-center gap-5 pb-2.5 z-20">
            {/* Aボタン */}
            <div className="flex flex-col items-center -translate-y-2">
              <div className="w-12 h-12 rounded-full p-1 bg-black/30 border border-white/45 shadow-[inset_0_3px_5px_rgba(0,0,0,0.75),0_1px_2px_rgba(255,255,255,0.5)] flex items-center justify-center">
                <button
                  onClick={clickA}
                  onPointerDown={downA}
                  onPointerUp={upA}
                  onPointerLeave={upA}
                  onPointerCancel={upA}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-10 h-10 rounded-full shadow-[0_3px_0_#92400e,0_4px_6px_rgba(0,0,0,0.35)] transition-all active:translate-y-0.5 active:shadow-[0_1px_0_#92400e] flex items-center justify-center font-black text-amber-950 text-xs border border-yellow-100 cursor-pointer"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 38% 28%, #fef9c3 0%, #facc15 55%, #d97706 100%)',
                  }}
                >
                  A
                </button>
              </div>
              <span className="mt-0.5 text-[9px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                せんたく
              </span>
            </div>

            {/* Bボタン（中央: 卵の底に合わせて下へオフセット） */}
            <div className="flex flex-col items-center translate-y-1.5">
              <div className="w-13 h-13 rounded-full p-1 bg-black/30 border border-white/45 shadow-[inset_0_3px_5px_rgba(0,0,0,0.75),0_1px_2px_rgba(255,255,255,0.5)] flex items-center justify-center">
                <button
                  onClick={g.pressB}
                  className="w-11 h-11 rounded-full shadow-[0_3px_0_#92400e,0_4px_6px_rgba(0,0,0,0.35)] transition-all active:translate-y-0.5 active:shadow-[0_1px_0_#92400e] flex items-center justify-center font-black text-amber-950 text-sm border border-yellow-100 cursor-pointer"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 38% 28%, #fef9c3 0%, #facc15 55%, #d97706 100%)',
                  }}
                >
                  B
                </button>
              </div>
              <span className="mt-0.5 text-[9px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                けってい
              </span>
            </div>

            {/* Cボタン */}
            <div className="flex flex-col items-center -translate-y-2">
              <div className="w-12 h-12 rounded-full p-1 bg-black/30 border border-white/45 shadow-[inset_0_3px_5px_rgba(0,0,0,0.75),0_1px_2px_rgba(255,255,255,0.5)] flex items-center justify-center">
                <button
                  onClick={clickC}
                  onPointerDown={downC}
                  onPointerUp={upC}
                  onPointerLeave={upC}
                  onPointerCancel={upC}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-10 h-10 rounded-full shadow-[0_3px_0_#92400e,0_4px_6px_rgba(0,0,0,0.35)] transition-all active:translate-y-0.5 active:shadow-[0_1px_0_#92400e] flex items-center justify-center font-black text-amber-950 text-xs border border-yellow-100 cursor-pointer"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 38% 28%, #fef9c3 0%, #facc15 55%, #d97706 100%)',
                  }}
                >
                  C
                </button>
              </div>
              <span className="mt-0.5 text-[9px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                もどる
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* お誕生日サプライズオーバーレイ */}
      {g.birthdayOpen && (
        <BirthdayOverlay
          name={state.partnerName}
          soundOn={state.soundOn}
          fill={g.fill}
          onClose={g.closeBirthday}
        />
      )}

      {/* 設定・着せ替え・進化切り替えモーダル */}
      {settingsOpen && (
        <SettingsModal
          state={state}
          onSave={g.updateSettings}
          onPreview={() => g.openBirthday(false)}
          onTriggerEvolution={g.triggerEvolution}
          onWelcomeNextEgg={g.welcomeNextEgg}
          onTriggerIdleEvent={g.triggerRandomIdleEvent}
          onReset={g.resetAll}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
