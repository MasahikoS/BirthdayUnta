import { useEffect, useRef, useState } from 'react';
import { sounds, setHapticEnabled } from '../sound';
import { pickRandom, pickTapDialogue, fill } from '../data/dialogues';
import {
  MAX_LEVEL,
  advance,
  getAge,
  loadState,
  saveState,
  todayMMDD,
  createInitial,
  canEvolve,
  canWelcomeNextEgg,
  remainingCareForNextEgg,
  chooseEvolutionType,
  getAdultVariantInfo,
  type GameState,
  type GrowthStage,
  type AdultVariant,
  type ShellColor,
} from '../game/state';
import type { Pose } from '../components/sprites';

export type Screen = 'main' | 'meal' | 'game' | 'status' | 'evolving' | 'new_egg';
// 実機たまごっちと同じ上下4枠構成（上段4アイコン + 下段3アイコン＆ベル）
export const MAIN_ITEMS = ['meal', 'light', 'game', 'medicine', 'clean', 'status', 'stroke'] as const;
export type MainItem = (typeof MAIN_ITEMS)[number];

export type FoodId = 'onigiri' | 'sushi' | 'pudding' | 'cake';
export interface FoodOption {
  id: FoodId;
  name: string;
  desc: string;
  kind: 'meal' | 'snack';
  favorite: boolean;
}

export const FOOD_MENU: readonly FoodOption[] = [
  { id: 'onigiri', name: 'おにぎり', desc: 'おなか+1', kind: 'meal', favorite: false },
  { id: 'sushi', name: 'とくじょう寿司', desc: 'おなか+2', kind: 'meal', favorite: false },
  { id: 'pudding', name: 'プリン★', desc: '好物!ごきげん+2', kind: 'snack', favorite: true },
  { id: 'cake', name: 'ショートケーキ', desc: 'ごきげん+1', kind: 'snack', favorite: false },
];

export type Anim = 'eat' | 'eatFavorite' | 'clean' | 'cure' | 'stroke' | null;
export type IdleEvent = 'butterfly' | 'yawn' | null;

export function useGame() {
  const [state, setState] = useState<GameState>(() => {
    const now = Date.now();
    return advance(loadState(now), now);
  });
  const stateRef = useRef(state);
  const [screen, setScreen] = useState<Screen>('main');
  const [cursor, setCursor] = useState(0);
  const [sub, setSub] = useState(0);
  const [anim, setAnim] = useState<Anim>(null);
  const [idleEvent, setIdleEvent] = useState<IdleEvent>(null);
  const [tmpPose, setTmpPose] = useState<Pose | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [birthdayMode, setBirthdayMode] = useState(false);
  const [evolveReveal, setEvolveReveal] = useState(false);
  const [eggHatched, setEggHatched] = useState(false);

  const miniGameControllerRef = useRef<{ pressA: () => void; pressB: () => void } | null>(null);

  const bubbleTimer = useRef<number | undefined>(undefined);
  const poseTimer = useRef<number | undefined>(undefined);
  const idleTimer = useRef<number | undefined>(undefined);
  const lastInteract = useRef(Date.now());
  const latest = useRef<{ checkBirthday: () => void; chatterAndIdle: () => void }>({
    checkBirthday: () => { },
    chatterAndIdle: () => { },
  });

  const vars = { name: state.partnerName || 'きみ' };
  const snd = state.soundOn;
  const busy = anim !== null || screen === 'evolving' || screen === 'new_egg';
  const isBirthdayToday = !!state.birthday && state.birthday === todayMMDD();
  const age = getAge(state, Date.now());
  const canNextEgg = canWelcomeNextEgg(state, age);
  const nextEggRemaining = remainingCareForNextEgg(state);

  // ---- 永続化 & ハプティクス設定反映 ----
  useEffect(() => {
    stateRef.current = state;
    setHapticEnabled(state.hapticOn ?? true);
    saveState(state);
  }, [state]);

  useEffect(() => {
    const update = () => setState((s) => advance(s, Date.now()));
    const flush = () => saveState(advance(stateRef.current, Date.now()));
    const onVisible = () => {
      if (document.visibilityState === 'hidden') flush();
      else {
        update();
        latest.current.checkBirthday();
      }
    };
    const tick = window.setInterval(update, 5000);
    const check = window.setInterval(() => {
      latest.current.checkBirthday();
      latest.current.chatterAndIdle();
    }, 14000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', flush);
    latest.current.checkBirthday();
    return () => {
      window.clearInterval(tick);
      window.clearInterval(check);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  // ---- ユーティリティ ----
  const touch = () => {
    lastInteract.current = Date.now();
    if (idleEvent) {
      setIdleEvent(null);
      window.clearTimeout(idleTimer.current);
    }
  };

  const say = (text: string, ms = 3500) => {
    if (!text) return;
    setBubble(text);
    window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setBubble(null), ms);
  };

  const flashPose = (pose: Pose, ms = 1200) => {
    setTmpPose(pose);
    window.clearTimeout(poseTimer.current);
    poseTimer.current = window.setTimeout(() => setTmpPose(null), ms);
  };

  const patch = (fn: (s: GameState) => Partial<GameState>) =>
    setState((s) => ({ ...s, ...fn(s) }));

  // ---- 進化演出（べび期 ➔ 完全ランダム1/3で3種類のおとな期のどれかに進化！） ----
  const triggerEvolution = (forcedType?: AdultVariant) => {
    const nextType = forcedType ?? chooseEvolutionType(stateRef.current);
    const info = getAdultVariantInfo(nextType);
    setEvolveReveal(false);
    setBubble(null);
    setScreen('evolving');
    sounds.evolveFanfare(stateRef.current.soundOn);

    // 前半1.4秒は「どの子に育つかな…？」のドキドキ演出、後半で姿をお披露目！
    setTimeout(() => {
      patch((s) => ({
        stage: 'adult',
        adultType: nextType,
        evolvedAtCare: s.careCount,
        unlockedAdults: Array.from(new Set([...(s.unlockedAdults ?? []), nextType])),
      }));
      setEvolveReveal(true);
    }, 1400);

    setTimeout(() => {
      setScreen('main');
      setEvolveReveal(false);
      flashPose('love', 2600);
      say(`★ ${info.name} にしんかしちゃあよ！`, 4500);
    }, 3200);
  };

  // ---- 🥚 新しいタマゴ（世代交代）演出 ----
  const welcomeNextEgg = () => {
    const s = stateRef.current;
    const nextGen = (s.generation ?? 1) + 1;
    setEggHatched(false);
    setBubble(null);
    setScreen('new_egg');
    sounds.evolveFanfare(s.soundOn);

    // 前半1.6秒は今のおとなうんたねこから「ありがとう」とタマゴが授けられ、後半で新しいべびうんた誕生！
    setTimeout(() => {
      const now = Date.now();
      patch((prev) => ({
        stage: 'baby',
        careCount: 0,
        evolvedAtCare: 0,
        startedAt: now,
        hunger: 3,
        happy: 3,
        poop: 0,
        sick: false,
        calling: false,
        sleeping: false,
        generation: nextGen,
        unlockedAdults:
          prev.stage === 'adult'
            ? Array.from(new Set([...(prev.unlockedAdults ?? []), prev.adultType]))
            : (prev.unlockedAdults ?? []),
      }));
      setEggHatched(true);
    }, 1600);

    setTimeout(() => {
      setScreen('main');
      setEggHatched(false);
      flashPose('happy', 2600);
      say(`★ ${nextGen}代目の べびうんた が生まれちゃ！`, 4500);
    }, 3400);
  };

  const checkAutoEvolution = (nextState: GameState) => {
    if (canEvolve(nextState, age)) {
      setTimeout(() => triggerEvolution(), 500);
      return;
    }
    const prevReady = canWelcomeNextEgg(stateRef.current, age);
    const nextReady = canWelcomeNextEgg(nextState, age);
    if (!prevReady && nextReady) {
      setTimeout(() => {
        sounds.favorite(stateRef.current.soundOn);
        say('★ メーター画面から「つぎのタマゴ」を迎えられりゅよ！', 4800);
      }, 1900);
    }
  };

  // ---- お誕生日 ----
  const openBirthday = (markShown: boolean) => {
    setBirthdayOpen(true);
    setBirthdayMode(true);
    setScreen('main');
    setBubble(null);
    patch((s) => ({
      sleeping: false,
      sick: false,
      happy: MAX_LEVEL,
      birthdayShownYear: markShown ? new Date().getFullYear() : s.birthdayShownYear,
    }));
    sounds.birthdayFanfare(stateRef.current.soundOn);
  };

  const closeBirthday = () => {
    setBirthdayOpen(false);
    say(pickRandom('birthdayTap', vars), 4000);
  };

  const checkBirthday = () => {
    const s = stateRef.current;
    if (!s.birthday || birthdayOpen) return;
    if (s.birthday === todayMMDD() && s.birthdayShownYear !== new Date().getFullYear()) {
      openBirthday(true);
    }
  };

  // ---- 待機中のランダム小ネタ演出 ＆ ひとりごと ----
  const triggerRandomIdleEvent = () => {
    const events: ('butterfly' | 'yawn')[] = ['butterfly', 'yawn'];
    const picked = events[Math.floor(Math.random() * events.length)];
    setIdleEvent(picked);

    if (picked === 'butterfly') {
      say(pickRandom('idleButterfly', vars), 3400);
      // ちょうちょを左➔右へ目で追う
      setTmpPose('lookL');
      setTimeout(() => setTmpPose('lookR'), 1600);
      idleTimer.current = window.setTimeout(() => {
        setTmpPose(null);
        setIdleEvent(null);
      }, 3400);
    } else {
      say(pickRandom('idleYawn', vars), 3000);
      setTmpPose('yawn');
      idleTimer.current = window.setTimeout(() => {
        setTmpPose(null);
        setIdleEvent(null);
      }, 2800);
    }
  };

  const chatterAndIdle = () => {
    const s = stateRef.current;
    if (screen !== 'main' || birthdayOpen || bubble || anim || idleEvent || s.sleeping) return;

    // 1. びょうき中・空腹・汚れ・呼び出しのひとりごと優先
    if (s.sick) {
      say(pickRandom('sick', vars), 3200);
      return;
    }
    if (s.calling) {
      say(pickRandom('calling', vars), 3200);
      return;
    }
    if (s.hunger <= 1) {
      say(pickRandom('hungry', vars), 3000);
      return;
    }
    if (s.poop > 0) {
      say(pickRandom('dirty', vars), 3000);
      return;
    }
    if (s.happy <= 1) {
      say(pickRandom('lonely', vars), 3000);
      return;
    }

    // 2. 元気な待機時はランダムで「わがまま呼び出し」または「自律小ネタ（ちょうちょ・あくび・寝返り）」
    const roll = Math.random();
    if (roll < 0.14 && !s.calling) {
      patch(() => ({ calling: true }));
      sounds.callAlert(s.soundOn);
      say(pickRandom('calling', vars), 3500);
    } else if (roll < 0.65) {
      triggerRandomIdleEvent();
    }
  };

  useEffect(() => {
    latest.current = { checkBirthday, chatterAndIdle };
  });

  // ---- アクション ----
  const feedOption = (opt: FoodOption) => {
    const s = stateRef.current;
    if (s.sick) {
      sounds.lose(snd);
      say(pickRandom('sick', vars));
      setScreen('main');
      return;
    }

    if (opt.kind === 'meal') {
      if (s.hunger >= MAX_LEVEL) {
        sounds.lose(snd);
        setScreen('main');
        say('もうたべりぇない...');
        return;
      }
      const addHunger = opt.id === 'sushi' || opt.favorite ? 2 : 1;
      const addHappy = opt.favorite ? 1 : 0;
      const addCare = opt.id === 'sushi' || opt.favorite ? 2 : 1;
      const nextCare = s.careCount + addCare;
      patch((p) => ({
        hunger: Math.min(MAX_LEVEL, p.hunger + addHunger),
        happy: Math.min(MAX_LEVEL, p.happy + addHappy),
        hungerAcc: 0,
        careCount: nextCare,
      }));
      say(pickRandom(opt.favorite ? 'favoriteMeal' : 'meal', vars));
      checkAutoEvolution({ ...s, careCount: nextCare });
    } else {
      if (s.hunger >= MAX_LEVEL && s.happy >= MAX_LEVEL) {
        sounds.lose(snd);
        setScreen('main');
        say('もうムリ...がんばりぇない...');
        return;
      }
      const addHappy = opt.favorite ? 2 : 1;
      const addCare = opt.favorite ? 2 : 1;
      const nextCare = s.careCount + addCare;
      patch((p) => ({
        happy: Math.min(MAX_LEVEL, p.happy + addHappy),
        happyAcc: 0,
        careCount: nextCare,
      }));
      say(pickRandom(opt.favorite ? 'favoriteMeal' : 'snack', vars));
      checkAutoEvolution({ ...s, careCount: nextCare });
    }

    if (opt.favorite) {
      sounds.favorite(snd);
      setAnim('eatFavorite');
      setTimeout(() => flashPose('love', 1800), 1800);
    } else {
      sounds.eat(snd);
      setAnim('eat');
      setTimeout(() => flashPose('happy', 1400), 1800);
    }
    setScreen('main');
    window.setTimeout(() => setAnim(null), 1800);
  };

  // 💉 おくすり（びょうきケア）
  const doMedicine = () => {
    const s = stateRef.current;
    if (!s.sick) {
      sounds.select(snd);
      flashPose('happy', 1000);
      say('今日調子が悪いだけだもん！！');
      return;
    }
    sounds.cure(snd);
    setAnim('cure');
    window.setTimeout(() => {
      const nextCare = stateRef.current.careCount + 2;
      patch((p) => ({
        sick: false,
        happy: Math.min(MAX_LEVEL, p.happy + 1),
        careCount: nextCare,
      }));
      setAnim(null);
      flashPose('happy', 1800);
      say(pickRandom('cure', vars));
      checkAutoEvolution({ ...stateRef.current, careCount: nextCare });
    }, 1500);
  };

  // 👋 しつけ・なでる（わがまま呼び出しケア）
  const doStroke = () => {
    const s = stateRef.current;
    if (s.sick) {
      say(pickRandom('sick', vars));
      return;
    }
    const wasCalling = s.calling;
    if (wasCalling) {
      sounds.favorite(snd);
    } else {
      sounds.happy(snd);
    }
    setAnim('stroke');
    window.setTimeout(() => {
      const addCare = wasCalling ? 3 : 1;
      const nextCare = stateRef.current.careCount + addCare;
      patch((p) => ({
        calling: false,
        discipline: wasCalling ? Math.min(MAX_LEVEL, (p.discipline ?? 1) + 1) : p.discipline,
        happy: Math.min(MAX_LEVEL, p.happy + (wasCalling ? 1 : 0)),
        careCount: nextCare,
      }));
      setAnim(null);
      flashPose(wasCalling ? 'love' : 'happy', 1800);
      say(pickRandom('strokeGood', vars));
      checkAutoEvolution({ ...stateRef.current, careCount: nextCare });
    }, 1300);
  };

  const doClean = () => {
    if (stateRef.current.poop === 0) {
      say('まだくちゃくない！');
      return;
    }
    sounds.clean(snd);
    setAnim('clean');
    window.setTimeout(() => {
      const nextCare = stateRef.current.careCount + 1;
      patch(() => ({ poop: 0, careCount: nextCare }));
      setAnim(null);
      flashPose('happy');
      say(pickRandom('clean', vars));
      checkAutoEvolution({ ...stateRef.current, careCount: nextCare });
    }, 1600);
  };

  const toggleLight = () => {
    const next = !stateRef.current.sleeping;
    patch(() => ({ sleeping: next, calling: false }));
    if (next) {
      sounds.sleep(snd);
      say(pickRandom('sleep', vars));
    } else {
      sounds.happy(snd);
      say(pickRandom('wake', vars));
    }
  };

  // ミニゲーム終了処理
  const handleGameFinish = (won: boolean) => {
    setScreen('main');
    const s = stateRef.current;
    const addCare = won ? 2 : 1;
    const nextCare = s.careCount + addCare;
    patch((p) => ({
      happy: Math.min(MAX_LEVEL, p.happy + (won ? 2 : 1)),
      happyAcc: 0,
      careCount: nextCare,
    }));

    if (won) {
      flashPose('wink', 2200);
      say(pickRandom('gameWin', vars));
    } else {
      flashPose('sad', 1800);
      say(pickRandom('gameLose', vars));
    }

    checkAutoEvolution({ ...s, careCount: nextCare });
  };

  const exec = (item: MainItem) => {
    const s = stateRef.current;
    if (s.sleeping && item !== 'light' && item !== 'status') {
      say('zzz…');
      return;
    }
    if (s.sick && item === 'game') {
      sounds.lose(snd);
      say(pickRandom('sick', vars));
      return;
    }
    switch (item) {
      case 'meal':
        setBubble(null);
        window.clearTimeout(bubbleTimer.current);
        setSub(0);
        setScreen('meal');
        break;
      case 'light':
        toggleLight();
        break;
      case 'game':
        setBubble(null);
        window.clearTimeout(bubbleTimer.current);
        setScreen('game');
        break;
      case 'medicine':
        doMedicine();
        break;
      case 'clean':
        doClean();
        break;
      case 'status':
        setBubble(null);
        window.clearTimeout(bubbleTimer.current);
        setScreen('status');
        break;
      case 'stroke':
        doStroke();
        break;
    }
  };

  // ---- 物理ボタン入力 ----
  const pressA = () => {
    touch();
    if (birthdayOpen || busy) return;
    if (screen === 'game' && miniGameControllerRef.current) {
      miniGameControllerRef.current.pressA();
      return;
    }
    sounds.select(snd);
    if (screen === 'main') setCursor((c) => (c + 1) % MAIN_ITEMS.length);
    else if (screen === 'meal') setSub((c) => (c + 1) % FOOD_MENU.length);
  };

  const pressB = () => {
    touch();
    if (birthdayOpen || busy) return;
    if (screen === 'game' && miniGameControllerRef.current) {
      miniGameControllerRef.current.pressB();
      return;
    }
    sounds.beep(snd);
    if (screen === 'main') exec(MAIN_ITEMS[cursor]);
    else if (screen === 'meal') feedOption(FOOD_MENU[sub] ?? FOOD_MENU[0]);
    else setScreen('main');
  };

  const pressC = () => {
    touch();
    if (birthdayOpen) {
      closeBirthday();
      return;
    }
    if (busy) return;
    sounds.beep(snd);
    if (screen !== 'main') {
      setScreen('main');
    }
  };

  const tapIcon = (i: number) => {
    touch();
    if (birthdayOpen || busy) return;
    sounds.beep(snd);
    setCursor(i);
    setScreen('main');
    exec(MAIN_ITEMS[i]);
  };

  const tapMealOption = (i: number) => {
    touch();
    if (busy) return;
    setSub(i);
    feedOption(FOOD_MENU[i] ?? FOOD_MENU[0]);
  };

  const tapCat = () => {
    touch();
    if (busy || birthdayOpen) return;
    const s = stateRef.current;
    if (s.sleeping) {
      sounds.beep(snd);
      say('zzz…', 2500);
      return;
    }
    if (s.sick) {
      sounds.lose(snd);
      say(pickRandom('sick', vars));
      return;
    }
    // わがまま呼び出し中に直接キャラをタップしても「なでる」と同じ効果！
    if (s.calling) {
      doStroke();
      return;
    }
    sounds.beep(snd);
    const tapPoses: Pose[] = ['happy', 'wink', 'love', 'surprised'];
    const pickedPose = tapPoses[Math.floor(Math.random() * tapPoses.length)];
    flashPose(birthdayMode || isBirthdayToday ? 'love' : pickedPose, 1200);
    if (birthdayMode || isBirthdayToday) say(pickRandom('birthdayTap', vars));
    else say(pickTapDialogue(s.stage, vars));
  };

  // ---- 設定 & デバッグ操作 ----
  const updateSettings = (p: Partial<GameState>) => setState((s) => ({ ...s, ...p }));
  const setStageDirect = (stage: GrowthStage) => patch(() => ({ stage }));
  const setShellColor = (shellColor: ShellColor) => patch(() => ({ shellColor }));

  const resetAll = () => {
    const now = Date.now();
    setState(createInitial(now));
    setBirthdayMode(false);
    setScreen('main');
    setBubble(null);
  };

  // ---- 表示用ポーズ（多彩な表情差分を状況に応じて出し分け） ----
  let pose: Pose = 'idle';
  if (state.sleeping) pose = 'sleep';
  else if (anim === 'eat' || anim === 'eatFavorite') pose = 'eat';
  else if (anim === 'cure' || anim === 'stroke') pose = 'love';
  else if (tmpPose) pose = tmpPose;
  else if (state.sick) pose = 'sad';
  else if (state.calling || state.poop >= 2) pose = 'angry';
  else if (birthdayMode) pose = 'love';
  else if (state.hunger <= 1 || state.happy <= 1) pose = 'sad';
  else if (state.happy >= MAX_LEVEL) pose = 'happy';

  const attention =
    !state.sleeping && (state.sick || state.calling || state.hunger <= 1 || state.happy <= 1 || state.poop > 0);

  return {
    state,
    screen,
    cursor,
    sub,
    anim,
    idleEvent,
    bubble,
    pose,
    busy,
    attention,
    age,
    birthdayOpen,
    evolveReveal,
    eggHatched,
    canNextEgg,
    nextEggRemaining,
    miniGameControllerRef,
    openBirthday,
    closeBirthday,
    triggerEvolution,
    welcomeNextEgg,
    triggerRandomIdleEvent,
    handleGameFinish,
    pressA,
    pressB,
    pressC,
    tapIcon,
    tapMealOption,
    tapCat,
    updateSettings,
    setStageDirect,
    setShellColor,
    resetAll,
    fill: (t: string) => fill(t, vars),
  };
}
