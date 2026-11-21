import { useState } from 'react';
import { X, Sparkles, Palette, MessageSquare, ImagePlus } from 'lucide-react';
import { ADULT_VARIANTS, type GameState, type GrowthStage, type AdultVariant, type ShellColor } from '../game/state';
import {
  defaultDialogues,
  getCustomDialogues,
  saveCustomDialogues,
  type DialogueKey,
} from '../data/dialogues';
import { triggerHaptic } from '../sound';
import { CharacterStudio } from './CharacterStudio';

interface Props {
  state: GameState;
  onSave: (p: Partial<GameState>) => void;
  onPreview: () => void;
  onTriggerEvolution: () => void;
  onWelcomeNextEgg?: () => void;
  onTriggerIdleEvent: () => void;
  onReset: () => void;
  onClose: () => void;
}

const SHELL_OPTIONS: { id: ShellColor; name: string; bg: string; border: string }[] = [
  { id: 'pink', name: 'ピンク', bg: 'from-pink-200 to-pink-300', border: 'border-pink-300' },
  { id: 'mint', name: 'ミント', bg: 'from-emerald-200 to-teal-300', border: 'border-emerald-300' },
  { id: 'lavender', name: 'ラベンダー', bg: 'from-purple-200 to-violet-300', border: 'border-purple-300' },
  { id: 'yellow', name: 'イエロー', bg: 'from-amber-200 to-yellow-300', border: 'border-yellow-300' },
  { id: 'blue', name: 'スカイブルー', bg: 'from-sky-200 to-blue-300', border: 'border-sky-300' },
];

const DIALOGUE_CATEGORIES: { key: DialogueKey; label: string; desc: string }[] = [
  { key: 'tapMorning', label: 'あさタップ時', desc: '朝（5時〜11時）にタップしたとき' },
  { key: 'tapNoon', label: 'ひるタップ時', desc: '昼（11時〜17時）にタップしたとき' },
  { key: 'tapNight', label: 'よるタップ時', desc: '夜（17時〜22時）にタップしたとき' },
  { key: 'tapMidnight', label: 'しんやタップ時', desc: '深夜（22時〜5時）にタップしたとき' },
  { key: 'babyTap', label: 'べび期タップ時', desc: '赤ちゃん期にタップしたとき' },
  { key: 'meal', label: 'ごはん（おにぎり・お寿司）後', desc: '通常のごはんを食べたあと' },
  { key: 'favoriteMeal', label: '★大好物（プリン）後', desc: '大好物のプリンを食べたあと' },
  { key: 'snack', label: 'おやつ（ショートケーキ）後', desc: '通常のおやつを食べたあと' },
  { key: 'sick', label: 'びょうき時', desc: 'しょんぼり・びょうき中のセリフ' },
  { key: 'cure', label: 'おくすり回復時', desc: 'おくすりで元気になったとき' },
  { key: 'calling', label: 'かまって呼び出し時', desc: 'わがまま呼び出しベルが鳴ったとき' },
  { key: 'strokeGood', label: 'しつけ（なでる）成功時', desc: '呼び出し中になでてあげたとき' },
  { key: 'gameWin', label: 'ゲーム勝利時', desc: 'ミニゲームで勝ったとき' },
  { key: 'birthdayTap', label: '誕生日お祝い時', desc: 'お誕生日モード中のセリフ' },
];

const IS_DEV = import.meta.env.DEV;

export function SettingsModal({
  state,
  onSave,
  onPreview,
  onTriggerEvolution,
  onWelcomeNextEgg,
  onTriggerIdleEvent,
  onReset,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<'general' | 'character' | 'dialogues'>('general');
  const [name, setName] = useState(state.partnerName);
  const [date, setDate] = useState(state.birthday ? `2003-${state.birthday}` : '');
  const [soundOn, setSoundOn] = useState(state.soundOn);
  const [hapticOn, setHapticOn] = useState(state.hapticOn ?? true);
  const [stage, setStage] = useState<GrowthStage>(state.stage);
  const [adultType, setAdultType] = useState<AdultVariant>(state.adultType || 'adult_a');
  const [shellColor, setShellColor] = useState<ShellColor>(state.shellColor || 'pink');

  const [dialogueData, setDialogueData] = useState<Record<DialogueKey, string>>(() => {
    const loaded = getCustomDialogues();
    const res = {} as Record<DialogueKey, string>;
    for (const cat of DIALOGUE_CATEGORIES) {
      res[cat.key] = (loaded[cat.key] || defaultDialogues[cat.key] || []).join('\n');
    }
    return res;
  });

  const [selectedCatKey, setSelectedCatKey] = useState<DialogueKey>('tapMorning');

  const save = () => {
    const birthday = date ? date.slice(5) : '';
    onSave({
      partnerName: name.trim() || 'きみ',
      birthday,
      soundOn,
      hapticOn,
      stage,
      adultType,
      shellColor,
      birthdayShownYear: birthday === state.birthday ? state.birthdayShownYear : 0,
    });

    const parsedDialogues: Partial<Record<DialogueKey, string[]>> = {};
    for (const cat of DIALOGUE_CATEGORIES) {
      const lines = (dialogueData[cat.key] || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length > 0) {
        parsedDialogues[cat.key] = lines;
      }
    }
    saveCustomDialogues(parsedDialogues);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in">
      <div className="w-full max-w-[360px] max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 text-sm text-gray-800 shadow-2xl border-2 border-pink-200 flex flex-col justify-between">
        <div>
          {/* ヘッダー */}
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-pink-600 flex items-center gap-1.5 text-base">
              <span>⚙️</span>
              <span>せってい＆カスタマイズ</span>
            </h3>
            <button onClick={onClose} aria-label="閉じる" className="p-1 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {/* タブ切り替え（ローカル開発時のみキャラ画像・セリフ編集タブを表示） */}
          {IS_DEV && (
            <div className="flex border-b border-gray-200 mb-3">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex-1 pb-2 text-[11px] font-bold transition border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'general'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>🛠️ 基本設定</span>
              </button>
              <button
                onClick={() => setActiveTab('character')}
                className={`flex-1 pb-2 text-[11px] font-bold transition border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'character'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <ImagePlus size={13} />
                <span>🎨 キャラ画像</span>
              </button>
              <button
                onClick={() => setActiveTab('dialogues')}
                className={`flex-1 pb-2 text-[11px] font-bold transition border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'dialogues'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <MessageSquare size={13} />
                <span>💬 セリフ編集</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* タブ2: 🎨 キャラ画像メーカー（ローカル開発時のみ） */}
          {/* ======================================================== */}
          {IS_DEV && activeTab === 'character' && <CharacterStudio />}

          {/* ======================================================== */}
          {/* タブ1: 基本設定 */}
          {/* ======================================================== */}
          {activeTab === 'general' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  よびかた（パートナーのお名前）
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: さくらちゃん"
                  className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">お誕生日（月-日）</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              {/* 🎨 筐体カラー着せ替え */}
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-gray-700">
                  <Palette size={14} className="text-pink-500" />
                  <span>本体カラーのきせかえ</span>
                </label>
                <div className="flex gap-2">
                  {SHELL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setShellColor(opt.id)}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-lg border-2 transition ${
                        shellColor === opt.id
                          ? 'border-gray-800 bg-gray-100 shadow-inner scale-105'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 mx-auto rounded-full bg-gradient-to-b ${opt.bg} ${opt.border} border shadow-xs mb-0.5`}
                      />
                      <span className="text-[9px] block text-gray-600">{opt.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 🐱 キャラクター進化＆イベントテスト（ローカル開発時のみ表示） */}
              {IS_DEV && (
                <div className="p-2.5 bg-pink-50 rounded-2xl border border-pink-200 space-y-2">
                <label className="flex items-center justify-between text-xs font-semibold text-pink-700">
                  <span className="flex items-center gap-1">
                    <Sparkles size={14} />
                    <span>成長段階（しんか）＆動作確認</span>
                  </span>
                  <span className="text-[10px] text-gray-500">お世話度: {state.careCount}pt</span>
                </label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => setStage('baby')}
                    className={`py-1.5 px-1 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${
                      stage === 'baby'
                        ? 'bg-pink-500 text-white border-pink-500 shadow'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    👶 べび期
                  </button>
                  {ADULT_VARIANTS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setStage('adult');
                        setAdultType(v.id);
                      }}
                      className={`py-1.5 px-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        stage === 'adult' && adultType === v.id
                          ? 'bg-pink-500 text-white border-pink-500 shadow'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {v.badge}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      save();
                      onTriggerEvolution();
                    }}
                    className="py-1 px-2 bg-white border border-pink-200 rounded-lg text-[10px] text-pink-600 font-bold hover:bg-pink-100/50 cursor-pointer"
                  >
                    ✨ ランダム進化テスト
                  </button>
                  {onWelcomeNextEgg && (
                    <button
                      type="button"
                      onClick={() => {
                        save();
                        onWelcomeNextEgg();
                      }}
                      className="py-1 px-2 bg-white border border-pink-200 rounded-lg text-[10px] text-pink-600 font-bold hover:bg-pink-100/50 cursor-pointer"
                    >
                      🥚 次のタマゴ誕生テスト
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      save();
                      onTriggerIdleEvent();
                    }}
                    className="py-1 px-2 bg-white border border-pink-200 rounded-lg text-[10px] text-pink-600 font-bold hover:bg-pink-100/50 cursor-pointer"
                  >
                    🦋 待機小ネタテスト
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSave({ calling: true });
                      onClose();
                    }}
                    className="py-1 px-2 bg-white border border-pink-200 rounded-lg text-[10px] text-pink-600 font-bold hover:bg-pink-100/50 cursor-pointer"
                  >
                    🔔 わがまま呼び出し
                  </button>
                </div>
                </div>
              )}

              {/* サウンド＆触覚振動（Haptic）スイッチ */}
              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundOn}
                    onChange={(e) => setSoundOn(e.target.checked)}
                    className="rounded text-pink-500 focus:ring-pink-300"
                  />
                  🔊 8bitサウンドをならす
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hapticOn}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setHapticOn(next);
                      if (next) triggerHaptic(true);
                    }}
                    className="rounded text-pink-500 focus:ring-pink-300"
                  />
                  📳 ボタン押下時の振動（Haptic・iPhone/Android対応）
                </label>
              </div>

              {/* 誕生日プレビュー（ローカル開発時のみ） */}
              {IS_DEV && (
                <button
                  onClick={() => {
                    save();
                    onPreview();
                  }}
                  className="w-full rounded-xl bg-pink-100 hover:bg-pink-200 py-2 text-xs font-bold text-pink-700 transition active:scale-95"
                >
                  🎉 お誕生日演出をプレビュー
                </button>
              )}

              {/* リセット */}
              <button
                onClick={() => {
                  if (window.confirm('育成データを初期化しますか？')) {
                    onReset();
                    onClose();
                  }
                }}
                className="w-full py-1 text-[11px] text-red-500 hover:underline"
              >
                データをリセット
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* タブ2: 💬 セリフ編集エディタ（ローカル開発時のみ） */}
          {/* ======================================================== */}
          {IS_DEV && activeTab === 'dialogues' && (
            <div className="space-y-3">
              <div className="text-[11px] text-gray-500 leading-snug bg-pink-50 p-2 rounded-xl border border-pink-100">
                💡 <b>1行につき1つのセリフ</b> を入力してください。その中からランダムで表示されます！
                <br />※ <code className="bg-white px-1 rounded text-pink-600 font-mono">{'{name}'}</code>{' '}
                と書くと相手の名前に変わります。
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700">
                  シチュエーションを選択:
                </label>
                <select
                  value={selectedCatKey}
                  onChange={(e) => setSelectedCatKey(e.target.value as DialogueKey)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold outline-none focus:ring-2 focus:ring-pink-300 bg-white"
                >
                  {DIALOGUE_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label} ({c.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 text-[11px]">
                  <span className="font-semibold text-gray-700">登録セリフ一覧（改行で追加）:</span>
                  <span className="text-gray-400">
                    {(dialogueData[selectedCatKey] || '').split('\n').filter((l) => l.trim().length > 0).length} 個
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={dialogueData[selectedCatKey] || ''}
                  onChange={(e) =>
                    setDialogueData((prev) => ({
                      ...prev,
                      [selectedCatKey]: e.target.value,
                    }))
                  }
                  placeholder="セリフを1行ずつ入力..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-pink-300 resize-none font-mono"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setDialogueData((prev) => ({
                    ...prev,
                    [selectedCatKey]: (defaultDialogues[selectedCatKey] || []).join('\n'),
                  }));
                }}
                className="text-[10px] text-gray-400 hover:text-pink-500 underline"
              >
                このシチュエーションを初期セリフに戻す
              </button>
            </div>
          )}
        </div>

        {/* 下部ボタン */}
        <div className="flex gap-2 border-t pt-3 mt-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 py-2 text-xs font-bold text-gray-700 transition"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            className="flex-1 rounded-xl bg-pink-500 hover:bg-pink-600 py-2 text-xs font-bold text-white shadow transition active:scale-95"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
