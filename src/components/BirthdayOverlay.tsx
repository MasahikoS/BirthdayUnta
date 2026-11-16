import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PixelSprite, CatSprite } from './CatSprite';
import { CAKE } from './sprites';
import { birthdayLetterData, birthdayTitleText } from '../data/dialogues';
import { sounds } from '../sound';

interface Props {
  name: string;
  soundOn: boolean;
  fill: (t: string) => string;
  onClose: () => void;
}

const COLORS = ['#f472b6', '#fbbf24', '#60a5fa', '#34d399', '#a78bfa', '#fb7185'];

export function BirthdayOverlay({ name, soundOn, fill, onClose }: Props) {
  useEffect(() => {
    const shoot = () =>
      confetti({
        particleCount: 45,
        spread: 90,
        startVelocity: 35,
        origin: { x: Math.random(), y: Math.random() * 0.35 },
        colors: COLORS,
        zIndex: 1000,
      });

    // クラッカー両サイド発射
    confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.85 }, colors: COLORS, zIndex: 1000 });
    confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.85 }, colors: COLORS, zIndex: 1000 });

    const end = Date.now() + 5000;
    const id = window.setInterval(() => {
      if (Date.now() > end) window.clearInterval(id);
      else shoot();
    }, 350);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in">
      <div className="w-full max-w-[340px] rounded-3xl border-4 border-pink-300 bg-gradient-to-b from-pink-50 to-rose-50 p-5 text-center shadow-2xl">
        <div className="mx-auto mb-2 inline-block rounded-full bg-gradient-to-r from-pink-500 to-rose-400 px-4 py-1 text-xs font-black tracking-widest text-white shadow">
          ✨ HAPPY BIRTHDAY ✨
        </div>

        {/* ケーキと笑顔のうんたねこ */}
        <div
          className="mx-auto flex w-fit flex-col items-center rounded-2xl border-2 border-[#76855b] px-6 py-3 text-[#2f3a22] shadow-inner my-2"
          style={{ background: '#c8d4a9', ['--lcd' as string]: '#c8d4a9' }}
        >
          <CatSprite stage="adult" pose="happy" size={6.5} />
          <div className="-mt-1">
            <PixelSprite rows={CAKE} size={6} />
          </div>
        </div>

        <h2 className="mt-2 text-lg font-black leading-snug text-pink-600">
          {fill(birthdayTitleText) || `${name}、お誕生日おめでとう！`}
        </h2>

        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-gray-700 bg-white/80 p-3 rounded-xl border border-pink-200 shadow-inner font-sans">
          {birthdayLetterData.join('\n')}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => sounds.birthdayFanfare(soundOn)}
            className="flex-1 rounded-xl bg-white border border-pink-200 py-2.5 text-xs font-bold text-pink-600 shadow-sm active:scale-95 transition"
          >
            ♪ もういちど
          </button>
          <button
            onClick={onClose}
            className="flex-[2] rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 py-2.5 text-xs font-bold text-white shadow-md active:scale-95 transition"
          >
            💖 ありがとう！
          </button>
        </div>
      </div>
    </div>
  );
}
