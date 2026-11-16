# うんたねこ（たまごっち風 PWA）

React 19 + TypeScript + Vite + Tailwind CSS。状態は `localStorage` のみ（サーバー不要）。

## 起動
```bash
npm install
npm run dev      # http://localhost:5173/
npm run build    # dist/ に PWA 一式を出力
```
`npm install` は Google ドライブ上だとエラーになることがあります。ローカルドライブ（例 `C:\Users\<you>\Unta`）で実行してください。

## 操作
- **A**: 選択を切り替え / **B**: 決定 / **C**: もどる（アイコンや画面の直接タップも可）
- **Bボタン長押し（約2.5秒）**: 隠しコマンド。お誕生日モード（紙吹雪 + 特別メッセージ）
- 右上の歯車: よびかた・お誕生日（毎年その日に自動でお祝い）・サウンド・リセット

## ファイル構成
- `src/data/dialogues.ts` … セリフ（時間帯別・アクション別・空腹/放置・お誕生日）
- `src/game/state.ts` … 状態と経過時間の計算（アプリを閉じている間の空腹・うんちも反映）
- `src/hooks/useGame.ts` … 操作・アクション・ミニゲーム
- `src/components/sprites.ts` / `CatSprite.tsx` … 仮のドット絵猫（差し替え用）
- `scripts/make-icons.mjs` … PWAアイコン生成（`node scripts/make-icons.mjs`）

## スマホに入れる
`dist/` を Vercel / Netlify / GitHub Pages などへ公開（HTTPS必須）し、iPhone は共有 → 「ホーム画面に追加」、Android は「アプリをインストール」。
