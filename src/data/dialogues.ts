// =================================================================
// 🐱 うんたねこのセリフ設定ファイル
//
// 【セリフの追加方法】
// 各シチュエーションの [ ... ] の中に、カンマ区切りで新しいセリフを追加するだけ！
// 例: '新しいセリフにゃ！',
//
// ※ {name} と書くと、設定したパートナーのお名前に自動で置き換わります！
// 例: '{name}、だいすきにゃ♡' -> 'さくらちゃん、だいすきにゃ♡'
// =================================================================

import type { GrowthStage } from '../game/state';

export type TimeSlot = 'morning' | 'noon' | 'night' | 'midnight';

export interface DialogueVars {
  name: string;
}

export function getTimeSlot(date: Date = new Date()): TimeSlot {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'noon';
  if (h >= 17 && h < 22) return 'night';
  return 'midnight';
}

export const defaultDialogues = {
  // -------------------------------------------------------------
  // 1. 画面タップ時（おとなうんたねこ・時間帯別）
  // -------------------------------------------------------------
  tapMorning: [
    'おはおは！',
    'ハローうんたたモーニング！',
    'おはよごじゃます',
    'おはおはよん！！',
    'おはおはよ！！',
    'おは...よ...',
  ],
  tapNoon: [
    'こんちわ',
    '今日もいっぱい忙ちい？',
    'んぇ？もう昼・・・？',
    '何ちて遊ぶ！？何ちて遊ぶ！？',
  ],
  tapNight: [
    'おちゅかれさま',
    '今日もいい子にちて待ってたしゅごい！？しゅごい！？',
    'ねえ・・・今誰といるの・・・？',
    '今日は早く寝りゅぞ！',
  ],
  tapMidnight: [
    'まだ寝ないの？',
    '先に寝りゅよ',
    'おやちみ',
    'こんな時間まで起きてりゅなら一緒に遊んで！！',
  ],

  // -------------------------------------------------------------
  // 2. 画面タップ時（べびうんたねこ）
  // -------------------------------------------------------------
  babyTap: [
    'おは！',
    'ゔぁあああ',
    'あーぅ',
    '赤ちゃんってサイコー！！！',
  ],

  // -------------------------------------------------------------
  // 3. お世話アクション（通常食＆大好物プリン）
  // -------------------------------------------------------------
  meal: [
    'んまんま、おいちい',
    'あいがと',
    'うまいうまいうまい',
  ],
  favoriteMeal: [
    '今が人生のピークかもちれない',
    'ダイエットがんばりょ・・・明日から',
    'きょうもがんばっちゃ',
    'ぷりん味のぷりん',
  ],
  snack: [
    'だいちゅき',
    'あいがと！！！',
    'ちゅきだー！！',
    'いただきまーーす',
  ],
  clean: [
    'きれいになっちゃ',
    'きれいにちてくれて あいがと',
  ],
  sleep: [
    'おやちみ',
    'すぴーー',
    '先に寝りゅよ'
  ],
  wake: [
    'いまおきまちた',
    'おはよー！',
    'おはうんたたモーニング！！',
  ],

  // -------------------------------------------------------------
  // 4. びょうき・おくすり（ケア）・しつけ（なでる）
  // -------------------------------------------------------------
  sick: [
    '昼に起きてすべての計画が崩れる音',
    'うりゅり',
    '熱ありゅかも',
    'わーまてまて～',
    'へくちっへくちっ',
    'まだ休めます！！休ませて下さい',
  ],
  cure: [
    'いつもありがと',
    'だいちゅき！',
    '元気になりまちた',
  ],
  calling: [
    '誰も構ってくりぇない',
    'ゔーーーー',
    'さみちい',
    'ありぇ？今うんた以外にやさちくちてた？',
  ],
  strokeGood: [
    'いつもあいがと',
    '褒められに来まちた',
    'かにさんちょきちょきピース',
    'ちゅきちゅきいえーい',
  ],

  // -------------------------------------------------------------
  // 5. ミニゲーム（勝敗）
  // -------------------------------------------------------------
  gameWin: [
    'うんたの勝ち～ちょっと強すぎちゃったかもー',
    'もいっかいうんたとゲームちよー？',
  ],
  gameLose: [
    'また負けた、また負けた',
    '仲間が弱い！！頑張ったのに！！',
    'なんで勝たせてくりぇないの！！やめりゅよ！？もう',
  ],

  // -------------------------------------------------------------
  // 6. 状態・呼び出し・待機中の自律小ネタ
  // -------------------------------------------------------------
  hungry: [
    'やっぱち！！一人だけおいちいもの食べたんだ',
    'おねがい・・・',
    'ぐ～～きゅるる・・・',
    'おいちいもの探しに行かない？',
  ],
  dirty: [
    'きちゃない',
    'くちゃい',
    'やらないといけないコトがたくさんありゅのにやる気がでない'
  ],
  lonely: [
    'かまってかまってー',
    '褒められ待ちの列',
    '「ちゅき」なんて何回言ってもいいんだよ？',
    'ヒマだなー相手ちてくれりゅひともいないし・・・'
  ],
  idleButterfly: [
    'わーまてまて～',
  ],
  idleYawn: [
    'うんたのうんは運じゃなくてうんちのうんかも・・・',
    '良い夢みりぇちゃいそう',
    'ち・・・ちかれた',
  ],

  // -------------------------------------------------------------
  // 7. お誕生日
  // -------------------------------------------------------------
  birthdayTap: [
    'お誕生日おめでと！！',
    '生まれてきてくれてあいがと！！',
  ],
};

export const birthdayLetterData = [
  'お誕生日おめでとう！！！',
  'いつもいっしょにいてくれて',
  'たくさんの笑顔をありがとう。',
  '素敵な１年になりますように！',
];

export const birthdayTitleText = '{name}、お誕生日おめでとう！';

// カスタムセリフ用キー型
export type DialogueKey = keyof typeof defaultDialogues;

const CUSTOM_DIALOGUE_KEY = 'untaneko-custom-dialogues-v1';

export function getCustomDialogues(): Record<DialogueKey, string[]> {
  try {
    const raw = localStorage.getItem(CUSTOM_DIALOGUE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { ...defaultDialogues };
      for (const k of Object.keys(defaultDialogues) as DialogueKey[]) {
        if (Array.isArray(parsed[k]) && parsed[k].length > 0) {
          merged[k] = parsed[k];
        }
      }
      return merged;
    }
  } catch (e) {
    console.error('Failed to load custom dialogues', e);
  }
  return defaultDialogues;
}

export function saveCustomDialogues(custom: Partial<Record<DialogueKey, string[]>>) {
  try {
    localStorage.setItem(CUSTOM_DIALOGUE_KEY, JSON.stringify(custom));
  } catch (e) {
    console.error('Failed to save custom dialogues', e);
  }
}

export function pickRandom(key: DialogueKey, vars: DialogueVars): string {
  const allDialogues = getCustomDialogues();
  const list = allDialogues[key] || defaultDialogues[key] || [];
  if (list.length === 0) return '';
  const text = list[Math.floor(Math.random() * list.length)];
  return fill(text, vars);
}

export function pickTapDialogue(stage: GrowthStage, vars: DialogueVars): string {
  if (stage === 'baby') {
    return pickRandom('babyTap', vars);
  }
  const slot = getTimeSlot();
  if (slot === 'morning') return pickRandom('tapMorning', vars);
  if (slot === 'noon') return pickRandom('tapNoon', vars);
  if (slot === 'night') return pickRandom('tapNight', vars);
  return pickRandom('tapMidnight', vars);
}

export function fill(text: string, vars: DialogueVars): string {
  return text.replaceAll('{name}', vars.name);
}
