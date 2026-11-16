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
    'おはようにゃ、{name}！',
    'あさだにゃ〜 ふぁ〜あ',
    'きょうもいちにち がんばろうにゃ',
    'あさごはん たべたかにゃ？',
  ],
  tapNoon: [
    'おひるだにゃ〜',
    '{name}、きょうもげんきかにゃ？',
    'ひなたぼっこ きもちいいにゃ',
    'すこし おひるねするかにゃ？',
  ],
  tapNight: [
    'こんばんは、{name}にゃ',
    'きょうもおつかれさまにゃ',
    'ゆうごはん なにたべたにゃ？',
    'ゆっくり おふろ入るにゃよ〜',
  ],
  tapMidnight: [
    'もうこんなじかんにゃ… ねむいにゃ',
    '{name}、そろそろねようにゃ',
    'ふぁ〜… よふかしさんにゃ',
    'あしたもいいひに なるといいね',
  ],

  // -------------------------------------------------------------
  // 2. 画面タップ時（べびうんたねこ）
  // -------------------------------------------------------------
  babyTap: [
    'みゃ〜！ {name}！',
    'ばぶぅ… なでて？',
    'くぅ〜ん… だっこ〜',
    'ぴょこ！ {name}すき！',
    'みゃっみゃっ♪',
  ],

  // -------------------------------------------------------------
  // 3. お世話アクション（通常食＆好物）
  // -------------------------------------------------------------
  meal: [
    'もぐもぐ… おいしいにゃ！',
    'おにぎり ありがとうにゃ♪',
    'ぱくぱく！ げんきでたにゃ',
  ],
  favoriteMeal: [
    'わぁ〜！！ だいすきなお寿司にゃ♡',
    'ほっぺがおちるにゃ〜！ {name}ありがとう♡',
    'とくじょうお寿司！ しあわせすぎるにゃ♪',
  ],
  snack: [
    'ぷるぷるプリン おいしいにゃ♪',
    'あまくておいしいにゃ〜',
    'おやつ うれしいにゃ！',
  ],
  favoriteSnack: [
    'きゃ〜！ だいすきなショートケーキにゃ♡',
    'いちごが甘くて さいこうにゃ！ {name}だいすき♡',
    'とくべつなケーキ！ うれしくてジャンプしちゃうにゃ♪',
  ],
  clean: [
    'ぴかぴかになったにゃ！',
    'すっきりにゃ〜',
    'きれいにしてくれて ありがとうにゃ♪',
  ],
  sleep: [
    'おやすみにゃ… zzz',
    'ふわぁ… おやすみ{name}にゃ',
  ],
  wake: [
    'おはようにゃ！',
    'ふぁ〜 よくねたにゃ！',
  ],

  // -------------------------------------------------------------
  // 4. びょうき・おくすり（ケア）・しつけ（なでる）
  // -------------------------------------------------------------
  sick: [
    'うぅ… おなかがいたいにゃ…',
    'しょんぼりにゃ… ケアしてほしいにゃ…',
    'ぐすん… なんだか元気がでないにゃ…',
  ],
  cure: [
    'おくすりで げんきになったにゃ！ ありがとう♡',
    'よしよししてくれて すっかり治ったにゃ♪',
    '{name}のおかげで ぴんぴんにゃ！',
  ],
  calling: [
    'ねぇねぇ {name}！ かまってほしいにゃ〜！',
    'なでなでして〜！ こっち向いてにゃ♪',
    'さみしくなっちゃったにゃ… よしよしして？',
  ],
  strokeGood: [
    'えへへ… かまってくれて ありがとうにゃ♡（おりこう度UP！）',
    'なでなで だいすきにゃ〜♪ いい子にするにゃ！',
    'ごろごろ… {name}の手、あったかいにゃ♡',
  ],
  strokeNormal: [
    'ごろごろ… なでなで きもちいいにゃ♪',
    'えへへ、くすぐったいにゃ〜',
    'もっと なでてほしいにゃ♡',
  ],

  // -------------------------------------------------------------
  // 5. ミニゲーム（勝敗）
  // -------------------------------------------------------------
  gameWin: [
    'やったにゃ！ {name}つよいにゃ！',
    'たのしかったにゃ〜♪',
    'さすが{name}にゃ！',
    '大しょうりだにゃー！',
  ],
  gameLose: [
    'むむ… ざんねんにゃ',
    'つぎはまけないにゃ！',
    'またあそぼうにゃ！',
  ],

  // -------------------------------------------------------------
  // 6. 状態・呼び出し・待機中の自律小ネタ
  // -------------------------------------------------------------
  hungry: [
    'おなかすいたにゃ…',
    'ごはんがほしいにゃ〜',
    'ぐぅ〜… おなかぺこぺこにゃ…',
  ],
  dirty: [
    'おへやがよごれてるにゃ…',
    'おそうじしてほしいにゃ',
  ],
  lonely: [
    '{name}… さみしいにゃ',
    'あそんでほしいにゃ〜',
    'なでなでしてほしいにゃ…',
  ],
  idleButterfly: [
    'あっ、ちょうちょだにゃ…！ ひらひら〜',
    'ちょうちょさん、どこいくにゃ？',
  ],
  idleYawn: [
    'ふぁ〜あ… ぽかぽかして ねむいにゃ…',
    'ふわぁ〜… おおきなあくびが出たにゃ',
  ],
  idleRoll: [
    'ころんっ♪ ごきげんにゃ〜',
    'ごろごろ〜ん♪',
  ],

  // -------------------------------------------------------------
  // 7. 進化＆お誕生日
  // -------------------------------------------------------------
  evolved: [
    'じゃじゃーん！ おとなになったにゃ！',
    '{name}がたくさんお世話してくれたから おおきくなれたにゃ！',
    'これからもずっと いっしょにいてにゃ♡',
  ],
  birthdayTap: [
    '{name}、お誕生日おめでとうにゃ！！🎉',
    'きょうは とくべつなひにゃ♪',
    'うまれてきてくれて ありがとうにゃ！',
    '{name}、せかいでいちばん だいすきにゃ♡',
  ],
};

export const birthdayLetterData = [
  'うまれてきてくれて ありがとう。',
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
