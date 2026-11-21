import React, { useState, useEffect, useRef } from 'react';
import { PixelSprite, CatSprite } from './CatSprite';
import { FISH_ITEM, TAIYAKI_ITEM, HEART_ITEM, BOX_CLOSED, BOX_OPEN, POOP, SUSHI_ITEM } from './sprites';
import { sounds } from '../sound';
import type { GrowthStage, AdultVariant } from '../game/state';

export type MiniGameType =
  | 'menu'
  | 'hoi'
  | 'catch'
  | 'box'
  | 'taiko'
  | 'scratch'
  | 'memory'
  | 'fishing'
  | 'whack';

interface MiniGamesProps {
  stage: GrowthStage;
  adultType?: AdultVariant;
  soundOn: boolean;
  onFinish: (won: boolean) => void;
  onCancel: () => void;
  registerController?: (controller: { pressA: () => void; pressB: () => void }) => void;
}

const MENU_ITEMS: { id: Exclude<MiniGameType, 'menu'>; title: string }[] = [
  { id: 'hoi', title: 'あっちむいてホイ' },
  { id: 'catch', title: 'おやつキャッチ' },
  { id: 'box', title: 'プレゼントハコあて' },
  { id: 'taiko', title: 'たいこのたつじん' },
  { id: 'scratch', title: 'あわあわシャンプー' },
  { id: 'memory', title: 'うんた神経衰弱' },
  { id: 'fishing', title: '大物マグロ一本釣り' },
  { id: 'whack', title: 'ひょっこりタッチ' },
];

const PAGE_SIZE = 4;

export const MiniGames: React.FC<MiniGamesProps> = ({
  stage,
  adultType = 'adult_a',
  soundOn,
  onFinish,
  onCancel,
  registerController,
}) => {
  const [gameMode, setGameMode] = useState<MiniGameType>('menu');
  const [menuIndex, setMenuIndex] = useState(0);

  const totalPages = Math.ceil(MENU_ITEMS.length / PAGE_SIZE);
  const currentPage = Math.floor(menuIndex / PAGE_SIZE);
  const pageItems = MENU_ITEMS.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // =============================================================
  // ゲーム1: あっち向いてホイ (hoi)
  // =============================================================
  const [hoiRound, setHoiRound] = useState(1);
  const [hoiWins, setHoiWins] = useState(0);
  const [hoiPick, setHoiPick] = useState<'L' | 'R'>('L');
  const [hoiCatDir, setHoiCatDir] = useState<'L' | 'R' | null>(null);
  const [hoiPhase, setHoiPhase] = useState<'choose' | 'reveal' | 'result'>('choose');

  const playHoi = (userPick?: 'L' | 'R') => {
    if (hoiPhase !== 'choose') return;
    const finalPick = userPick ?? hoiPick;
    const dir: 'L' | 'R' = Math.random() < 0.5 ? 'L' : 'R';
    const isWin = dir === finalPick;
    const newWins = hoiWins + (isWin ? 1 : 0);

    if (isWin) sounds.happy(soundOn);
    else sounds.lose(soundOn);

    setHoiCatDir(dir);
    setHoiPhase('reveal');
    setHoiWins(newWins);

    setTimeout(() => {
      if (hoiRound >= 3) {
        setHoiPhase('result');
        const won = newWins >= 2;
        if (won) sounds.win(soundOn);
        else sounds.lose(soundOn);
        setTimeout(() => onFinish(won), 1500);
      } else {
        setHoiRound((r) => r + 1);
        setHoiCatDir(null);
        setHoiPhase('choose');
      }
    }, 1000);
  };

  // =============================================================
  // ゲーム2: おやつキャッチ (catch)
  // =============================================================
  const [catLane, setCatLane] = useState<0 | 1 | 2>(1);
  const [catchItems, setCatchItems] = useState<
    { id: number; lane: 0 | 1 | 2; y: number; type: 'fish' | 'taiyaki' | 'heart' }[]
  >([]);
  const [catchScore, setCatchScore] = useState(0);
  const [catchTimeLeft, setCatchTimeLeft] = useState(12);
  const [catchActive, setCatchActive] = useState(false);

  useEffect(() => {
    if (gameMode !== 'catch') return;
    setCatchActive(true);
    setCatchScore(0);
    setCatchTimeLeft(12);
    setCatchItems([]);

    let nextId = 0;
    const spawnTimer = setInterval(() => {
      const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      const types: ('fish' | 'taiyaki' | 'heart')[] = ['fish', 'taiyaki', 'heart'];
      const type = types[Math.floor(Math.random() * types.length)];
      setCatchItems((items) => [...items, { id: nextId++, lane, y: 0, type }]);
    }, 900);

    const fallTimer = setInterval(() => {
      setCatchItems((items) =>
        items.map((item) => ({ ...item, y: item.y + 12 })).filter((item) => item.y < 100)
      );
    }, 120);

    const clockTimer = setInterval(() => {
      setCatchTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(spawnTimer);
          clearInterval(fallTimer);
          clearInterval(clockTimer);
          setCatchActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(spawnTimer);
      clearInterval(fallTimer);
      clearInterval(clockTimer);
    };
  }, [gameMode]);

  useEffect(() => {
    if (!catchActive) return;
    catchItems.forEach((item) => {
      if (item.y >= 68 && item.y <= 88 && item.lane === catLane) {
        sounds.catchItem(soundOn);
        setCatchScore((s) => s + 1);
        setCatchItems((prev) => prev.filter((i) => i.id !== item.id));
      }
    });
  }, [catchItems, catLane, catchActive, soundOn]);

  useEffect(() => {
    if (gameMode === 'catch' && !catchActive && catchTimeLeft === 0) {
      const won = catchScore >= 4;
      if (won) sounds.win(soundOn);
      else sounds.lose(soundOn);
      const t = setTimeout(() => onFinish(won), 1500);
      return () => clearTimeout(t);
    }
  }, [catchActive, catchTimeLeft, catchScore, gameMode, onFinish, soundOn]);

  // =============================================================
  // ゲーム3: プレゼント箱当て (box)
  // =============================================================
  const [boxWinning, setBoxWinning] = useState<0 | 1 | 2>(1);
  const [boxSelected, setBoxSelected] = useState<0 | 1 | 2>(1);
  const [boxPhase, setBoxPhase] = useState<'intro' | 'shuffle' | 'pick' | 'reveal'>('intro');

  useEffect(() => {
    if (gameMode !== 'box') return;
    const target = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    setBoxWinning(target);
    setBoxSelected(1);
    setBoxPhase('intro');

    const t1 = setTimeout(() => {
      setBoxPhase('shuffle');
      sounds.select(soundOn);
      const t2 = setTimeout(() => {
        setBoxPhase('pick');
      }, 1100);
      return () => clearTimeout(t2);
    }, 1000);

    return () => clearTimeout(t1);
  }, [gameMode, soundOn]);

  const confirmBox = (picked?: 0 | 1 | 2) => {
    if (boxPhase !== 'pick') return;
    const finalBox = picked ?? boxSelected;
    setBoxSelected(finalBox);
    setBoxPhase('reveal');
    const isWin = finalBox === boxWinning;
    if (isWin) sounds.win(soundOn);
    else sounds.lose(soundOn);
    setTimeout(() => onFinish(isWin), 1500);
  };

  // =============================================================
  // ゲーム4: 太鼓の達人風リズムゲーム (taiko)
  // =============================================================
  interface TaikoNote {
    id: number;
    type: 'don' | 'ka';
    x: number;
    hit: boolean;
  }
  const [taikoNotes, setTaikoNotes] = useState<TaikoNote[]>([]);
  const [taikoScore, setTaikoScore] = useState(0);
  const [taikoCombo, setTaikoCombo] = useState(0);
  const [taikoJudge, setTaikoJudge] = useState<string | null>(null);
  const [taikoEnded, setTaikoEnded] = useState(false);

  useEffect(() => {
    if (gameMode !== 'taiko') return;
    setTaikoScore(0);
    setTaikoCombo(0);
    setTaikoJudge(null);
    setTaikoEnded(false);

    const chart: { delay: number; type: 'don' | 'ka' }[] = [
      { delay: 800, type: 'don' },
      { delay: 1600, type: 'don' },
      { delay: 2400, type: 'ka' },
      { delay: 3200, type: 'don' },
      { delay: 4000, type: 'don' },
      { delay: 4400, type: 'don' },
      { delay: 5200, type: 'ka' },
      { delay: 6000, type: 'ka' },
      { delay: 6800, type: 'don' },
      { delay: 7600, type: 'don' },
    ];

    let noteId = 0;
    const timers = chart.map((n) =>
      setTimeout(() => {
        setTaikoNotes((prev) => [...prev, { id: noteId++, type: n.type, x: 100, hit: false }]);
      }, n.delay)
    );

    const moveTimer = setInterval(() => {
      setTaikoNotes((prev) =>
        prev
          .map((n) => ({ ...n, x: n.x - 2.8 }))
          .filter((n) => {
            if (n.x < 5 && !n.hit) {
              setTaikoCombo(0);
              setTaikoJudge('MISS');
              return false;
            }
            return n.x >= 0;
          })
      );
    }, 40);

    const endTimer = setTimeout(() => {
      setTaikoEnded(true);
    }, 9500);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(moveTimer);
      clearTimeout(endTimer);
    };
  }, [gameMode]);

  const handleTaikoHit = (type: 'don' | 'ka') => {
    if (type === 'don') sounds.taikoDon(soundOn);
    else sounds.taikoKa(soundOn);

    setTaikoNotes((prev) => {
      const targetIndex = prev.findIndex((n) => !n.hit && n.x >= 8 && n.x <= 28);
      if (targetIndex !== -1) {
        const target = prev[targetIndex];
        const dist = Math.abs(target.x - 18);
        if (target.type === type) {
          if (dist <= 5) {
            setTaikoJudge('PERFECT!');
            setTaikoScore((s) => s + 2);
            setTaikoCombo((c) => c + 1);
          } else {
            setTaikoJudge('GOOD');
            setTaikoScore((s) => s + 1);
            setTaikoCombo((c) => c + 1);
          }
        } else {
          setTaikoJudge('MISS');
          setTaikoCombo(0);
        }
        return prev.map((n, i) => (i === targetIndex ? { ...n, hit: true } : n));
      }
      return prev;
    });
  };

  useEffect(() => {
    if (taikoEnded) {
      const won = taikoScore >= 8;
      if (won) sounds.win(soundOn);
      else sounds.lose(soundOn);
      const t = setTimeout(() => onFinish(won), 1500);
      return () => clearTimeout(t);
    }
  }, [taikoEnded, taikoScore, onFinish, soundOn]);

  // =============================================================
  // 🫧 ゲーム5: あわあわシャンプー (scratch)
  // スマホのスクロールを完全ブロックし、指でなぞった軌跡をなめらかに消去！
  // =============================================================
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scratchCleanPct, setScratchCleanPct] = useState(0);
  const [scratchDone, setScratchDone] = useState(false);
  const isScratchingRef = useRef(false);
  const lastScratchPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (gameMode !== 'scratch') return;
    setScratchCleanPct(0);
    setScratchDone(false);
    lastScratchPosRef.current = null;
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // モコモコ泡を全体に描画
    ctx.fillStyle = '#2f3a22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#c8d4a9';
    for (let i = 0; i < 42; i++) {
      const bx = (i * 29) % canvas.width;
      const by = (i * 19) % canvas.height;
      ctx.beginPath();
      ctx.arc(bx, by, 6 + (i % 5), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2f3a22';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // iOS Safari / Android Chrome でスワイプ時に画面スクロールが混じるのを防止する non-passive リスナー
    const preventScroll = (ev: TouchEvent) => {
      if (ev.cancelable) ev.preventDefault();
    };
    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, [gameMode]);

  const wipeBubbleAt = (x: number, y: number, connectFromLast = false) => {
    if (scratchDone) return;
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 38;

    ctx.beginPath();
    if (connectFromLast && lastScratchPosRef.current) {
      ctx.moveTo(lastScratchPosRef.current.x, lastScratchPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    lastScratchPosRef.current = { x, y };

    // 透明になった割合を計算
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    const total = data.length / 4;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 50) cleared++;
    }
    const pct = Math.min(100, Math.round((cleared / (total / 4)) * 100));
    setScratchCleanPct(pct);
    if (pct >= 80 && !scratchDone) {
      setScratchDone(true);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setScratchCleanPct(100);
      sounds.win(soundOn);
      setTimeout(() => onFinish(true), 1500);
    }
  };

  // =============================================================
  // 🃏 ゲーム8: うんた神経衰弱 (memory)
  // 8枚のカードをめくって4種類のうんたねこペアを揃える！
  // =============================================================
  type MemoryCardKind = 'baby' | 'adult_a' | 'adult_b' | 'adult_c';
  interface MemoryCard {
    id: number;
    kind: MemoryCardKind;
    flipped: boolean;
    matched: boolean;
  }
  const [memCards, setMemCards] = useState<MemoryCard[]>([]);
  const [memCursor, setMemCursor] = useState(0);
  const [memLock, setMemLock] = useState(false);

  useEffect(() => {
    if (gameMode !== 'memory') return;
    const kinds: MemoryCardKind[] = [
      'baby',
      'baby',
      'adult_a',
      'adult_a',
      'adult_b',
      'adult_b',
      'adult_c',
      'adult_c',
    ];
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    setMemCards(kinds.map((kind, id) => ({ id, kind, flipped: false, matched: false })));
    setMemCursor(0);
    setMemLock(false);
  }, [gameMode]);

  const flipMemCard = (idx: number) => {
    if (memLock) return;
    const target = memCards[idx];
    if (!target || target.flipped || target.matched) return;

    sounds.beep(soundOn);
    const next = memCards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    setMemCards(next);

    const openUnmatched = next.filter((c) => c.flipped && !c.matched);
    if (openUnmatched.length === 2) {
      setMemLock(true);
      const [c1, c2] = openUnmatched;
      if (c1.kind === c2.kind) {
        setTimeout(() => {
          sounds.catchItem(soundOn);
          setMemCards((prev) => {
            const updated = prev.map((c) =>
              c.id === c1.id || c.id === c2.id ? { ...c, matched: true } : c
            );
            if (updated.every((c) => c.matched)) {
              sounds.win(soundOn);
              setTimeout(() => onFinish(true), 1400);
            }
            return updated;
          });
          setMemLock(false);
        }, 450);
      } else {
        setTimeout(() => {
          sounds.lose(soundOn);
          setMemCards((prev) =>
            prev.map((c) => (c.id === c1.id || c.id === c2.id ? { ...c, flipped: false } : c))
          );
          setMemLock(false);
        }, 750);
      }
    }
  };

  // =============================================================
  // 🎣 ゲーム9: 大物マグロ一本釣り (fishing)
  // 長押しでリールを巻き、魚が暴れている時(💢)は指を離して糸切れを防ぐ！
  // =============================================================
  const [fishProgress, setFishProgress] = useState(20); // 0..100
  const [fishTension, setFishTension] = useState(0); // 0..100 (100で糸切れ)
  const [fishAngry, setFishAngry] = useState(false);
  const [fishReeling, setFishReeling] = useState(false);
  const [fishDone, setFishDone] = useState<'win' | 'lose' | null>(null);

  useEffect(() => {
    if (gameMode !== 'fishing') return;
    setFishProgress(20);
    setFishTension(0);
    setFishAngry(false);
    setFishReeling(false);
    setFishDone(null);

    const moodTimer = setInterval(() => {
      setFishAngry((prev) => !prev && Math.random() < 0.45);
    }, 1100);

    return () => clearInterval(moodTimer);
  }, [gameMode]);

  useEffect(() => {
    if (gameMode !== 'fishing' || fishDone) return;
    const tick = setInterval(() => {
      setFishProgress((p) => {
        const delta = fishReeling ? (fishAngry ? 1.2 : 3.2) : -0.5;
        const next = Math.max(0, Math.min(100, p + delta));
        if (next >= 100 && !fishDone) {
          setFishDone('win');
          sounds.win(soundOn);
          setTimeout(() => onFinish(true), 1500);
        }
        return next;
      });

      setFishTension((t) => {
        const delta = fishReeling && fishAngry ? 6.5 : fishReeling ? 0.8 : -4.5;
        const next = Math.max(0, Math.min(100, t + delta));
        if (next >= 100 && !fishDone) {
          setFishDone('lose');
          sounds.lose(soundOn);
          setTimeout(() => onFinish(false), 1500);
        }
        return next;
      });
    }, 80);
    return () => clearInterval(tick);
  }, [gameMode, fishReeling, fishAngry, fishDone, soundOn, onFinish]);

  // =============================================================
  // 🐾 ゲーム10: ひょっこりうんたタッチ (whack)
  // 9つの穴から顔を出すうんたねこをタップ！💩はタップしないように注意！
  // =============================================================
  const [whackSlots, setWhackSlots] = useState<('empty' | 'cat' | 'poop')[]>(Array(9).fill('empty'));
  const [whackScore, setWhackScore] = useState(0);
  const [whackTime, setWhackTime] = useState(12);
  const [whackDone, setWhackDone] = useState(false);

  useEffect(() => {
    if (gameMode !== 'whack') return;
    setWhackSlots(Array(9).fill('empty'));
    setWhackScore(0);
    setWhackTime(12);
    setWhackDone(false);

    const popTimer = setInterval(() => {
      const next: ('empty' | 'cat' | 'poop')[] = Array(9).fill('empty');
      const count = Math.random() < 0.5 ? 2 : 3;
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * 9);
        next[idx] = Math.random() < 0.25 ? 'poop' : 'cat';
      }
      setWhackSlots(next);
    }, 850);

    const clock = setInterval(() => {
      setWhackTime((t) => {
        if (t <= 1) {
          clearInterval(popTimer);
          clearInterval(clock);
          setWhackDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(popTimer);
      clearInterval(clock);
    };
  }, [gameMode]);

  useEffect(() => {
    if (gameMode === 'whack' && whackDone) {
      const won = whackScore >= 5;
      if (won) sounds.win(soundOn);
      else sounds.lose(soundOn);
      const t = setTimeout(() => onFinish(won), 1500);
      return () => clearTimeout(t);
    }
  }, [whackDone, whackScore, gameMode, onFinish, soundOn]);

  const tapWhackHole = (idx: number) => {
    if (whackDone) return;
    const item = whackSlots[idx];
    if (item === 'cat') {
      sounds.catchItem(soundOn);
      setWhackScore((s) => s + 1);
      setWhackSlots((prev) => prev.map((v, i) => (i === idx ? 'empty' : v)));
    } else if (item === 'poop') {
      sounds.lose(soundOn);
      setWhackScore((s) => Math.max(0, s - 1));
      setWhackSlots((prev) => prev.map((v, i) => (i === idx ? 'empty' : v)));
    }
  };

  // =============================================================
  // コントローラー登録 (外部物理ボタンA・B対応)
  // =============================================================
  useEffect(() => {
    if (!registerController) return;
    registerController({
      pressA: () => {
        if (gameMode === 'menu') {
          sounds.select(soundOn);
          setMenuIndex((prev) => (prev + 1) % MENU_ITEMS.length);
        } else if (gameMode === 'hoi' && hoiPhase === 'choose') {
          sounds.select(soundOn);
          setHoiPick((p) => (p === 'L' ? 'R' : 'L'));
        } else if (gameMode === 'catch') {
          setCatLane((lane) => (lane > 0 ? ((lane - 1) as 0 | 1 | 2) : 0));
        } else if (gameMode === 'box' && boxPhase === 'pick') {
          sounds.select(soundOn);
          setBoxSelected((s) => ((s + 1) % 3) as 0 | 1 | 2);
        } else if (gameMode === 'taiko') {
          handleTaikoHit('ka');
        } else if (gameMode === 'scratch') {
          wipeBubbleAt(20 + Math.random() * 120, 20 + Math.random() * 70);
        } else if (gameMode === 'memory') {
          sounds.select(soundOn);
          setMemCursor((c) => (c + 1) % 8);
        } else if (gameMode === 'fishing') {
          setFishReeling(false);
        } else if (gameMode === 'whack') {
          const catIdx = whackSlots.findIndex((s) => s === 'cat');
          if (catIdx >= 0) tapWhackHole(catIdx);
        }
      },
      pressB: () => {
        if (gameMode === 'menu') {
          sounds.beep(soundOn);
          setGameMode(MENU_ITEMS[menuIndex].id);
        } else if (gameMode === 'hoi') {
          playHoi();
        } else if (gameMode === 'catch') {
          setCatLane((lane) => (lane < 2 ? ((lane + 1) as 0 | 1 | 2) : 2));
        } else if (gameMode === 'box' && boxPhase === 'pick') {
          confirmBox();
        } else if (gameMode === 'taiko') {
          handleTaikoHit('don');
        } else if (gameMode === 'scratch') {
          wipeBubbleAt(20 + Math.random() * 120, 20 + Math.random() * 70);
        } else if (gameMode === 'memory') {
          flipMemCard(memCursor);
        } else if (gameMode === 'fishing') {
          sounds.beep(soundOn);
          setFishProgress((p) => Math.min(100, p + (fishAngry ? 2 : 10)));
        } else if (gameMode === 'whack') {
          const catIdx = whackSlots.findIndex((s) => s === 'cat');
          if (catIdx >= 0) tapWhackHole(catIdx);
        }
      },
    });
  });

  // =============================================================
  // レンダリング
  // =============================================================
  return (
    <div className="w-full h-full flex flex-col justify-between p-1.5 select-none text-[#2f3a22] font-mono overflow-hidden">
      {/* 0. ミニゲーム8種 選択メニュー（ページ切り替え対応で見切れゼロ） */}
      {gameMode === 'menu' && (
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#2f3a22]/30 pb-0.5 text-[9.5px] font-bold leading-tight">
            <button
              type="button"
              onClick={() => {
                sounds.select(soundOn);
                const prevPage = (currentPage - 1 + totalPages) % totalPages;
                setMenuIndex(prevPage * PAGE_SIZE);
              }}
              className="px-1 bg-[#2f3a22]/10 hover:bg-[#2f3a22]/20 cursor-pointer"
            >
              ◀
            </button>
            <span>★ なにであそぶ？ ({currentPage + 1}/{totalPages}) ★</span>
            <button
              type="button"
              onClick={() => {
                sounds.select(soundOn);
                const nextPage = (currentPage + 1) % totalPages;
                setMenuIndex(nextPage * PAGE_SIZE);
              }}
              className="px-1 bg-[#2f3a22]/10 hover:bg-[#2f3a22]/20 cursor-pointer"
            >
              ▶
            </button>
          </div>

          <div className="flex flex-col gap-1 my-auto px-0.5">
            {pageItems.map((item, i) => {
              const globalIdx = currentPage * PAGE_SIZE + i;
              const selected = menuIndex === globalIdx;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    sounds.beep(soundOn);
                    setMenuIndex(globalIdx);
                    setGameMode(item.id);
                  }}
                  className={`w-full py-0.5 px-1.5 text-left text-[10px] leading-snug font-bold border border-[#2f3a22] rounded-none transition cursor-pointer ${
                    selected ? 'bg-[#2f3a22] text-[var(--lcd)]' : 'hover:bg-[#2f3a22]/10'
                  }`}
                >
                  {selected ? '▶ ' : '　'}
                  {item.title}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[8.5px] leading-none">
            <span className="opacity-70">[A:次へ / B:決定]</span>
            <button onClick={onCancel} className="text-[#2f3a22]/80 underline font-bold cursor-pointer">
              もどる [C]
            </button>
          </div>
        </div>
      )}

      {/* 3. あわあわシャンプー */}
      {gameMode === 'scratch' && (
        <div className="flex h-full flex-col justify-between touch-none select-none">
          <div className="flex justify-between text-[9.5px] font-bold border-b border-[#2f3a22]/30 pb-0.5 leading-tight">
            <span>指でこすって泡を落とそう</span>
            <span>ピカピカ: {scratchCleanPct}%</span>
          </div>

          <div className="relative flex-1 my-0.5 border border-[#2f3a22] flex items-center justify-center overflow-hidden touch-none">
            {/* 奥にいるうんたねこ */}
            <div className="flex flex-col items-center pointer-events-none">
              <CatSprite
                stage={stage}
                adultType={adultType}
                pose={scratchDone ? 'love' : 'happy'}
                size={5.5}
              />
              {scratchDone && (
                <span className="text-[10px] font-black mt-0.5 animate-bounce">★ ピカピカにゃ〜♪ ★</span>
              )}
            </div>

            {/* 手前の泡レイヤーCanvas（スマホでのスクロール誤爆を完全ブロック） */}
            <canvas
              ref={scratchCanvasRef}
              width={160}
              height={110}
              onPointerDown={(e) => {
                e.preventDefault();
                isScratchingRef.current = true;
                lastScratchPosRef.current = null;
                e.currentTarget.setPointerCapture(e.pointerId);
                const r = e.currentTarget.getBoundingClientRect();
                wipeBubbleAt(
                  ((e.clientX - r.left) / r.width) * 160,
                  ((e.clientY - r.top) / r.height) * 110,
                  false
                );
              }}
              onPointerMove={(e) => {
                if (!isScratchingRef.current) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                wipeBubbleAt(
                  ((e.clientX - r.left) / r.width) * 160,
                  ((e.clientY - r.top) / r.height) * 110,
                  true
                );
              }}
              onPointerUp={() => {
                isScratchingRef.current = false;
                lastScratchPosRef.current = null;
              }}
              onPointerCancel={() => {
                isScratchingRef.current = false;
                lastScratchPosRef.current = null;
              }}
              className="absolute inset-0 w-full h-full cursor-grab touch-none"
              style={{ touchAction: 'none' }}
            />
          </div>

          <div className="text-[8.5px] text-center opacity-75 leading-none">
            画面を指でゴシゴシなぞってね！（80%でクリア）
          </div>
        </div>
      )}

      {/* 4. うんた神経衰弱 */}
      {gameMode === 'memory' && (
        <div className="flex h-full flex-col justify-between">
          <div className="text-center text-[9.5px] font-bold border-b border-[#2f3a22]/30 pb-0.5 leading-tight">
            ★ 同じうんたねこを揃えよう！ ★
          </div>

          <div className="grid grid-cols-4 gap-1 my-auto py-1">
            {memCards.map((card, idx) => (
              <button
                key={card.id}
                type="button"
                onClick={() => flipMemCard(idx)}
                className={`h-14 border-2 border-[#2f3a22] flex items-center justify-center transition cursor-pointer ${
                  card.flipped || card.matched
                    ? 'bg-[var(--lcd)]'
                    : memCursor === idx
                    ? 'bg-[#2f3a22] text-[var(--lcd)] scale-105'
                    : 'bg-[#2f3a22]/85 text-[var(--lcd)]'
                }`}
              >
                {card.flipped || card.matched ? (
                  <CatSprite
                    stage={card.kind === 'baby' ? 'baby' : 'adult'}
                    adultType={card.kind === 'baby' ? 'adult_a' : card.kind}
                    pose="happy"
                    size={2.6}
                    still
                  />
                ) : (
                  <span className="text-xs font-black">？</span>
                )}
              </button>
            ))}
          </div>

          <div className="text-[8.5px] text-center opacity-75 leading-none">
            カードをタップしてめくろう！
          </div>
        </div>
      )}

      {/* 5. 大物マグロ一本釣り */}
      {gameMode === 'fishing' && (
        <div className="flex h-full flex-col justify-between">
          <div className="flex justify-between text-[9.5px] font-bold border-b border-[#2f3a22]/30 pb-0.5 leading-tight">
            <span>マグロ一本釣り</span>
            <span>{fishAngry ? '！暴れ中! はなして!' : '★いまだ! 長押し!'}</span>
          </div>

          <div className="flex flex-col gap-1.5 my-auto px-1">
            <div className="flex items-center justify-around py-1">
              <CatSprite
                stage={stage}
                adultType={adultType}
                pose={fishAngry ? 'angry' : 'happy'}
                size={4}
              />
              <span className="text-xs font-black">〜〜〜♪〜〜〜</span>
              <div className={fishAngry ? 'animate-bounce scale-125' : ''}>
                <PixelSprite rows={SUSHI_ITEM} size={4.5} />
              </div>
            </div>

            {/* 釣り上げゲージ */}
            <div className="space-y-0.5 text-[8.5px] font-bold">
              <div className="flex justify-between">
                <span>釣り上げ度</span>
                <span>{Math.round(fishProgress)}%</span>
              </div>
              <div className="w-full h-2.5 border border-[#2f3a22] bg-transparent">
                <div className="h-full bg-[#2f3a22] transition-all" style={{ width: `${fishProgress}%` }} />
              </div>
            </div>

            {/* 糸のピンチ度 */}
            <div className="space-y-0.5 text-[8.5px] font-bold">
              <div className="flex justify-between">
                <span>糸の張り（100%で切れる！）</span>
                <span>{Math.round(fishTension)}%</span>
              </div>
              <div className="w-full h-2 border border-[#2f3a22] bg-transparent">
                <div className="h-full bg-red-700 transition-all" style={{ width: `${fishTension}%` }} />
              </div>
            </div>
          </div>

          <button
            type="button"
            onPointerDown={() => {
              sounds.beep(soundOn);
              setFishReeling(true);
            }}
            onPointerUp={() => setFishReeling(false)}
            onPointerLeave={() => setFishReeling(false)}
            onPointerCancel={() => setFishReeling(false)}
            className={`w-full py-1 border-2 border-[#2f3a22] text-[10px] font-black cursor-pointer select-none ${
              fishReeling ? 'bg-[#2f3a22] text-[var(--lcd)] scale-98' : 'bg-[var(--lcd)] text-[#2f3a22]'
            }`}
          >
            {fishReeling ? '▲ グイグイ巻き上げ中…！！' : '● ここを長押しでリールを巻く！'}
          </button>
        </div>
      )}

      {/* 6. ひょっこりうんたタッチ */}
      {gameMode === 'whack' && (
        <div className="flex h-full flex-col justify-between">
          <div className="flex justify-between text-[9.5px] font-bold border-b border-[#2f3a22]/30 pb-0.5 leading-tight">
            <span>うんたをタッチ！(ウンチ注意)</span>
            <span>
              {whackScore}/5点 ({whackTime}秒)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 my-auto py-0.5">
            {whackSlots.map((slot, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => tapWhackHole(idx)}
                className="h-9 border border-[#2f3a22] bg-[#2f3a22]/10 flex items-center justify-center cursor-pointer active:scale-95"
              >
                {slot === 'cat' && (
                  <CatSprite stage={stage} adultType={adultType} pose="happy" size={2.5} still />
                )}
                {slot === 'poop' && <PixelSprite rows={POOP} size={2.8} />}
                {slot === 'empty' && <span className="text-[8px] opacity-30">○</span>}
              </button>
            ))}
          </div>

          <div className="text-[8.5px] text-center opacity-75 leading-none">
            5回タッチでクリア！
          </div>
        </div>
      )}

      {/* 7. あっち向いてホイ */}
      {gameMode === 'hoi' && (
        <div className="flex h-full flex-col items-center justify-between">
          <div className="text-[10px] font-bold leading-tight">
            あっちむいてホイ ({Math.min(hoiRound, 3)}/3) 勝:{hoiWins}
          </div>
          <div className="flex flex-col items-center my-auto">
            <CatSprite
              stage={stage}
              adultType={adultType}
              pose={hoiCatDir ? (hoiCatDir === 'L' ? 'lookL' : 'lookR') : 'idle'}
              still={hoiPhase === 'reveal'}
              size={stage === 'baby' ? 5 : 5.2}
            />
            <div className="h-4 text-[10px] font-black mt-0.5">
              {hoiPhase === 'reveal' && (hoiCatDir === hoiPick ? 'あたり！' : 'はずれ…')}
              {hoiPhase === 'result' && (hoiWins >= 2 ? '★ かち！ ★' : '× まけ…')}
            </div>
          </div>
          {hoiPhase === 'choose' && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setHoiPick('L');
                  playHoi('L');
                }}
                className={`px-2.5 py-0.5 border border-[#2f3a22] text-[10px] font-bold rounded-none cursor-pointer ${
                  hoiPick === 'L' ? 'bg-[#2f3a22] text-[var(--lcd)]' : ''
                }`}
              >
                ◀ ひだり [A]
              </button>
              <button
                onClick={() => {
                  setHoiPick('R');
                  playHoi('R');
                }}
                className={`px-2.5 py-0.5 border border-[#2f3a22] text-[10px] font-bold rounded-none cursor-pointer ${
                  hoiPick === 'R' ? 'bg-[#2f3a22] text-[var(--lcd)]' : ''
                }`}
              >
                みぎ ▶ [B]
              </button>
            </div>
          )}
        </div>
      )}

      {/* 8. おやつキャッチ */}
      {gameMode === 'catch' && (
        <div className="relative flex h-full flex-col justify-between overflow-hidden">
          <div className="flex justify-between text-[9.5px] font-bold border-b border-[#2f3a22]/30 pb-0.5 leading-tight">
            <span>のこり: {catchTimeLeft}秒</span>
            <span>ゲット: {catchScore}こ</span>
          </div>

          <div className="relative flex-1">
            {catchItems.map((item) => (
              <div
                key={item.id}
                className="absolute transition-all duration-100"
                style={{
                  left: item.lane === 0 ? '16%' : item.lane === 1 ? '50%' : '84%',
                  top: `${item.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <PixelSprite
                  rows={item.type === 'fish' ? FISH_ITEM : item.type === 'taiyaki' ? TAIYAKI_ITEM : HEART_ITEM}
                  size={2.8}
                />
              </div>
            ))}

            <div
              className="absolute bottom-0.5 transition-all duration-150"
              style={{
                left: catLane === 0 ? '16%' : catLane === 1 ? '50%' : '84%',
                transform: 'translateX(-50%)',
              }}
            >
              <CatSprite stage={stage} adultType={adultType} pose="play" size={4.2} />
            </div>
          </div>

          <div className="flex justify-between px-1 pt-0.5 border-t border-[#2f3a22]/20 text-[9.5px]">
            <button
              onClick={() => setCatLane((l) => (l > 0 ? ((l - 1) as 0 | 1 | 2) : 0))}
              className="px-2 py-0.5 bg-[#2f3a22] text-[var(--lcd)] rounded-none font-bold active:scale-95 cursor-pointer"
            >
              ◀ ひだり [A]
            </button>
            <span className="self-center font-bold text-[9px]">4こでクリア!</span>
            <button
              onClick={() => setCatLane((l) => (l < 2 ? ((l + 1) as 0 | 1 | 2) : 2))}
              className="px-2 py-0.5 bg-[#2f3a22] text-[var(--lcd)] rounded-none font-bold active:scale-95 cursor-pointer"
            >
              みぎ ▶ [B]
            </button>
          </div>
        </div>
      )}

      {/* 9. プレゼント箱当て */}
      {gameMode === 'box' && (
        <div className="flex h-full flex-col justify-between">
          <div className="text-center text-[10px] font-bold border-b border-[#2f3a22]/30 pb-0.5 leading-tight">
            {boxPhase === 'intro' && '★ アタリをよくみててね！ ★'}
            {boxPhase === 'shuffle' && 'くるくる… シャッフル中！'}
            {boxPhase === 'pick' && 'どれにする？ [A:選択 / B:決定]'}
            {boxPhase === 'reveal' && (boxSelected === boxWinning ? '★ あたりーー！！ ★' : '× はずれ〜')}
          </div>

          <div className="flex justify-around items-end my-auto py-1">
            {[0, 1, 2].map((idx) => {
              const isSelected = boxSelected === idx;
              const isOpen = boxPhase === 'intro' || boxPhase === 'reveal';
              const isWinBox = boxWinning === idx;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (boxPhase === 'pick') {
                      sounds.select(soundOn);
                      confirmBox(idx as 0 | 1 | 2);
                    }
                  }}
                  className={`flex flex-col items-center p-1 rounded cursor-pointer transition transform ${
                    isSelected ? 'scale-105 bg-[#2f3a22]/15' : ''
                  }`}
                >
                  <div className="h-5 flex items-center justify-center mb-0.5">
                    {isOpen && isWinBox ? (
                      <PixelSprite rows={HEART_ITEM} size={3} />
                    ) : isOpen && !isWinBox ? (
                      <span className="text-[10px] font-bold">×</span>
                    ) : null}
                  </div>
                  <PixelSprite rows={isOpen ? BOX_OPEN : BOX_CLOSED} size={3} />
                  <span className="text-[9.5px] font-bold mt-0.5">ハコ {idx + 1}</span>
                </div>
              );
            })}
          </div>

          {boxPhase === 'pick' && (
            <button
              onClick={() => confirmBox()}
              className="w-full py-0.5 bg-[#2f3a22] text-[var(--lcd)] text-[10px] font-bold rounded-none shadow active:scale-95 cursor-pointer"
            >
              ハコ {boxSelected + 1} をあける！ [B]
            </button>
          )}
        </div>
      )}

      {/* 10. たいこの達人風リズムゲーム */}
      {gameMode === 'taiko' && (
        <div className="flex h-full flex-col justify-between">
          <div className="flex justify-between items-center text-[9.5px] font-bold border-b border-[#2f3a22]/30 pb-0.5 leading-tight">
            <span>たいこのたつじん</span>
            <span>
              スコア:{taikoScore} コンボ:{taikoCombo}
            </span>
          </div>

          <div className="relative w-full h-11 bg-[#2f3a22]/10 rounded-none border-2 border-[#2f3a22] flex items-center my-auto overflow-hidden">
            <div className="absolute left-[18%] -translate-x-1/2 w-7 h-7 rounded-none border-2 border-[#2f3a22] flex items-center justify-center font-bold text-[9px]">
              □
            </div>

            {taikoNotes.map((note) => (
              <div
                key={note.id}
                className={`absolute -translate-x-1/2 flex items-center justify-center font-black rounded-none border border-[#2f3a22] transition-opacity ${
                  note.hit ? 'opacity-0' : 'opacity-100'
                } ${
                  note.type === 'don'
                    ? 'w-6 h-6 bg-red-600 text-white text-[10px]'
                    : 'w-6 h-6 bg-blue-600 text-white text-[10px]'
                }`}
                style={{ left: `${note.x}%` }}
              >
                {note.type === 'don' ? 'ドン' : 'カッ'}
              </div>
            ))}

            {taikoJudge && (
              <div className="absolute right-2 top-0.5 text-[10px] font-black animate-ping text-[#2f3a22]">
                {taikoJudge}
              </div>
            )}
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => handleTaikoHit('don')}
              className="flex-1 py-1 bg-red-600 hover:bg-red-700 text-white rounded-none font-black text-[10.5px] shadow active:scale-95 flex flex-col items-center cursor-pointer leading-tight"
            >
              <span>■ ドン！</span>
              <span className="text-[7.5px] opacity-80">[Bボタン]</span>
            </button>
            <button
              onClick={() => handleTaikoHit('ka')}
              className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-none font-black text-[10.5px] shadow active:scale-95 flex flex-col items-center cursor-pointer leading-tight"
            >
              <span>□ カッ！</span>
              <span className="text-[7.5px] opacity-80">[Aボタン]</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
