import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Wand2,
  Eraser,
  Paintbrush,
  RotateCcw,
  Download,
  Check,
  Trash2,
  Sparkles,
  Move,
  Crosshair,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CharacterId } from '../game/state';
import { EXPRESSION_SLOTS, type ExpressionId } from './sprites';
import { buildSpriteKey, getStoredCustomSprite, setStoredCustomSprite } from './CatSprite';

type ToolMode = 'wand' | 'colorkey' | 'eraser' | 'restore';
type ColorFilter = 'color' | 'lcd4' | 'mono';
type PixelGridSize = 0 | 64 | 48 | 32 | 24; // 0 = そのまま(128px)

const WORK_SIZE = 128; // 編集用キャンバスの内部解像度

const CHARACTER_OPTIONS: { id: CharacterId; label: string; sub: string }[] = [
  { id: 'baby', label: '👶 べびうんた', sub: '成長前の赤ちゃん' },
  { id: 'adult_a', label: '🐱 うんたねこ', sub: 'おとなA (通常)' },
  { id: 'adult_b', label: '🍙 ふくよかうんた', sub: 'おとなB (ふくよか)' },
  { id: 'adult_c', label: '🤨 ふと眉うんた', sub: 'おとなC (ふと眉)' },
];

const BASIC_EXPRESSIONS: ExpressionId[] = ['normal', 'happy', 'sad'];
const EXTRA_EXPRESSIONS: ExpressionId[] = ['love', 'eat', 'angry', 'sleep'];

export function CharacterStudio() {
  const [targetChar, setTargetChar] = useState<CharacterId>('baby');
  const [targetExpr, setTargetExpr] = useState<ExpressionId>('normal');
  const [showExtraExpr, setShowExtraExpr] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);

  // 背景透過・ブラシ編集マスク (WORK_SIZE x WORK_SIZE, 255=表示, 0=透明)
  const [alphaMask, setAlphaMask] = useState<Uint8Array | null>(null);
  const [history, setHistory] = useState<Uint8Array[]>([]);

  // ツール設定
  const [tool, setTool] = useState<ToolMode>('wand');
  const [tolerance, setTolerance] = useState<number>(38);
  const [brushSize, setBrushSize] = useState<number>(6);
  const [autoCornerBg, setAutoCornerBg] = useState<boolean>(true);

  // ★ サイズ揃え・位置調整（拡大縮小 ＆ X/Yオフセット ＆ 自動正規化）
  const [autoNormalize, setAutoNormalize] = useState<boolean>(true);
  const [scalePct, setScalePct] = useState<number>(100); // 50% ~ 180%
  const [offsetX, setOffsetX] = useState<number>(0); // -45 ~ +45
  const [offsetY, setOffsetY] = useState<number>(0); // -45 ~ +45
  const [showGuide, setShowGuide] = useState<boolean>(true); // 基準ガイド＆半透明比較表示

  // たまごっち変換設定
  const [pixelSize, setPixelSize] = useState<PixelGridSize>(48);
  const [colorFilter, setColorFilter] = useState<ColorFilter>('color');
  const [monoThreshold, setMonoThreshold] = useState<number>(155);

  // 出力結果DataURL & ステータスメッセージ
  const [outputDataUrl, setOutputDataUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [previewBounce, setPreviewBounce] = useState(false);

  const rawPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const editCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // 液晶プレビュー上でのドラッグ移動用
  const isDraggingPreviewRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number }>({
    x: 0,
    y: 0,
    ox: 0,
    oy: 0,
  });

  const activeKey = buildSpriteKey(targetChar, targetExpr);
  const currentExprInfo = EXPRESSION_SLOTS.find((e) => e.id === targetExpr) ?? EXPRESSION_SLOTS[0];

  // サイズ比較用の基準画像（現在のキャラの「normal」または「adult_a」の登録画像）
  const referenceGuideSrc =
    getStoredCustomSprite(buildSpriteKey(targetChar, 'normal')) ||
    getStoredCustomSprite('adult_a') ||
    (savedKeys.has(targetChar)
      ? `./characters/${targetChar}.png`
      : savedKeys.has('adult_a')
      ? './characters/adult_a.png'
      : null);

  // 保存済みキー一覧（localStorage + public/characters/*.png）を取得
  const refreshSavedKeys = async () => {
    const keys = new Set<string>();
    for (const c of CHARACTER_OPTIONS) {
      for (const e of EXPRESSION_SLOTS) {
        const k = buildSpriteKey(c.id, e.id);
        if (getStoredCustomSprite(k)) keys.add(k);
      }
    }
    try {
      const res = await fetch('/api/save-character');
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; keys?: string[] };
        data.keys?.forEach((k) => keys.add(k));
      }
    } catch {
      // ignore
    }
    setSavedKeys(keys);
  };

  useEffect(() => {
    refreshSavedKeys();
  }, []);

  // プレビューのぴょこぴょこアニメ
  useEffect(() => {
    const id = window.setInterval(() => setPreviewBounce((b) => !b), 520);
    return () => window.clearInterval(id);
  }, []);

  // 四隅から連続する背景色を自動Flood-Fill透過する関数
  const computeCornerFloodMask = (rgba: Uint8ClampedArray, tol: number): Uint8Array => {
    const mask = new Uint8Array(WORK_SIZE * WORK_SIZE);
    for (let i = 0; i < mask.length; i++) {
      mask[i] = rgba[i * 4 + 3] < 20 ? 0 : 255;
    }

    const visited = new Uint8Array(WORK_SIZE * WORK_SIZE);
    const seeds = [
      [0, 0],
      [WORK_SIZE - 1, 0],
      [0, WORK_SIZE - 1],
      [WORK_SIZE - 1, WORK_SIZE - 1],
    ];

    const colorDist = (idx1: number, r0: number, g0: number, b0: number) => {
      const dr = rgba[idx1 * 4] - r0;
      const dg = rgba[idx1 * 4 + 1] - g0;
      const db = rgba[idx1 * 4 + 2] - b0;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    const queue: number[] = [];
    for (const [sx, sy] of seeds) {
      const sIdx = sy * WORK_SIZE + sx;
      if (mask[sIdx] === 0 || visited[sIdx]) continue;
      const r0 = rgba[sIdx * 4];
      const g0 = rgba[sIdx * 4 + 1];
      const b0 = rgba[sIdx * 4 + 2];

      queue.push(sIdx);
      visited[sIdx] = 1;

      while (queue.length > 0) {
        const curr = queue.pop()!;
        mask[curr] = 0;
        const cx = curr % WORK_SIZE;
        const cy = (curr - cx) / WORK_SIZE;

        const neighbors = [
          cx > 0 ? curr - 1 : -1,
          cx < WORK_SIZE - 1 ? curr + 1 : -1,
          cy > 0 ? curr - WORK_SIZE : -1,
          cy < WORK_SIZE - 1 ? curr + WORK_SIZE : -1,
        ];

        for (const n of neighbors) {
          if (n >= 0 && !visited[n] && mask[n] > 0) {
            if (colorDist(n, r0, g0, b0) <= tol * 1.8) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }
      }
    }
    return mask;
  };

  // 画像読み込み時: WORK_SIZE x WORK_SIZE にアスペクト比維持で中央配置
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const off = document.createElement('canvas');
        off.width = WORK_SIZE;
        off.height = WORK_SIZE;
        const ctx = off.getContext('2d')!;
        ctx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);

        const scale = Math.min(WORK_SIZE / img.width, WORK_SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const dx = (WORK_SIZE - w) / 2;
        const dy = (WORK_SIZE - h) / 2;
        ctx.drawImage(img, dx, dy, w, h);

        const imgData = ctx.getImageData(0, 0, WORK_SIZE, WORK_SIZE);
        rawPixelsRef.current = new Uint8ClampedArray(imgData.data);
        setSourceImg(img);

        const initialMask = autoCornerBg
          ? computeCornerFloodMask(imgData.data, tolerance)
          : Uint8Array.from({ length: WORK_SIZE * WORK_SIZE }, (_, i) => (imgData.data[i * 4 + 3] < 20 ? 0 : 255));

        setAlphaMask(initialMask);
        setHistory([]);
        setScalePct(100);
        setOffsetX(0);
        setOffsetY(0);
        setStatusMsg('画像を読み込みました！自動で中央＆標準サイズに揃えています');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 自動四隅くり抜きトグルやしきい値変更時に再計算
  const reapplyAutoBg = (nextAuto: boolean, nextTol: number) => {
    const rgba = rawPixelsRef.current;
    if (!rgba) return;
    if (nextAuto) {
      setAlphaMask(computeCornerFloodMask(rgba, nextTol));
    } else {
      setAlphaMask(
        Uint8Array.from({ length: WORK_SIZE * WORK_SIZE }, (_, i) => (rgba[i * 4 + 3] < 20 ? 0 : 255))
      );
    }
    setHistory([]);
  };

  const pushHistory = (current: Uint8Array) => {
    setHistory((prev) => [...prev.slice(-12), new Uint8Array(current)]);
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setAlphaMask(last);
      return prev.slice(0, -1);
    });
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] | null => {
    const canvas = editCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * WORK_SIZE);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * WORK_SIZE);
    if (x < 0 || x >= WORK_SIZE || y < 0 || y >= WORK_SIZE) return null;
    return [x, y];
  };

  const applyBrushAt = (x: number, y: number, mask: Uint8Array, erase: boolean): Uint8Array => {
    const next = new Uint8Array(mask);
    const rgba = rawPixelsRef.current;
    const rSq = brushSize * brushSize;
    for (let dy = -brushSize; dy <= brushSize; dy++) {
      for (let dx = -brushSize; dx <= brushSize; dx++) {
        if (dx * dx + dy * dy <= rSq) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < WORK_SIZE && ny >= 0 && ny < WORK_SIZE) {
            const idx = ny * WORK_SIZE + nx;
            if (erase) {
              next[idx] = 0;
            } else if (rgba && rgba[idx * 4 + 3] >= 20) {
              next[idx] = 255;
            }
          }
        }
      }
    }
    return next;
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rgba = rawPixelsRef.current;
    if (!rgba || !alphaMask) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const [x, y] = coords;
    const startIdx = y * WORK_SIZE + x;

    pushHistory(alphaMask);

    if (tool === 'wand') {
      const r0 = rgba[startIdx * 4];
      const g0 = rgba[startIdx * 4 + 1];
      const b0 = rgba[startIdx * 4 + 2];
      const next = new Uint8Array(alphaMask);
      const visited = new Uint8Array(WORK_SIZE * WORK_SIZE);
      const queue = [startIdx];
      visited[startIdx] = 1;
      const maxDist = tolerance * 1.8;

      while (queue.length > 0) {
        const curr = queue.pop()!;
        next[curr] = 0;
        const cx = curr % WORK_SIZE;
        const cy = (curr - cx) / WORK_SIZE;
        const neighbors = [
          cx > 0 ? curr - 1 : -1,
          cx < WORK_SIZE - 1 ? curr + 1 : -1,
          cy > 0 ? curr - WORK_SIZE : -1,
          cy < WORK_SIZE - 1 ? curr + WORK_SIZE : -1,
        ];
        for (const n of neighbors) {
          if (n >= 0 && !visited[n]) {
            const dr = rgba[n * 4] - r0;
            const dg = rgba[n * 4 + 1] - g0;
            const db = rgba[n * 4 + 2] - b0;
            if (Math.sqrt(dr * dr + dg * dg + db * db) <= maxDist) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }
      }
      setAlphaMask(next);
    } else if (tool === 'colorkey') {
      const r0 = rgba[startIdx * 4];
      const g0 = rgba[startIdx * 4 + 1];
      const b0 = rgba[startIdx * 4 + 2];
      const next = new Uint8Array(alphaMask);
      const maxDist = tolerance * 1.8;
      for (let i = 0; i < next.length; i++) {
        const dr = rgba[i * 4] - r0;
        const dg = rgba[i * 4 + 1] - g0;
        const db = rgba[i * 4 + 2] - b0;
        if (Math.sqrt(dr * dr + dg * dg + db * db) <= maxDist) {
          next[i] = 0;
        }
      }
      setAlphaMask(next);
    } else {
      isDrawingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setAlphaMask((prev) => (prev ? applyBrushAt(x, y, prev, tool === 'eraser') : prev));
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || (tool !== 'eraser' && tool !== 'restore')) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const [x, y] = coords;
    setAlphaMask((prev) => (prev ? applyBrushAt(x, y, prev, tool === 'eraser') : prev));
  };

  const handleCanvasPointerUp = () => {
    isDrawingRef.current = false;
  };

  // 液晶プレビュー画面をドラッグして位置（offsetX / offsetY）を直感的に動かす
  const handlePreviewPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingPreviewRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPreviewRef.current) return;
    const dx = Math.round((e.clientX - dragStartRef.current.x) * 0.8);
    const dy = Math.round((e.clientY - dragStartRef.current.y) * 0.8);
    setOffsetX(Math.max(-48, Math.min(48, dragStartRef.current.ox + dx)));
    setOffsetY(Math.max(-48, Math.min(48, dragStartRef.current.oy + dy)));
  };

  const handlePreviewPointerUp = () => {
    isDraggingPreviewRef.current = false;
  };

  // 編集キャンバス描画 & サイズ正規化・位置調整・たまごっち風最終PNG生成
  useEffect(() => {
    const rgba = rawPixelsRef.current;
    const editCanvas = editCanvasRef.current;
    if (!rgba || !alphaMask || !editCanvas) return;

    const editCtx = editCanvas.getContext('2d')!;
    const maskedImgData = editCtx.createImageData(WORK_SIZE, WORK_SIZE);
    let minX = WORK_SIZE;
    let minY = WORK_SIZE;
    let maxX = 0;
    let maxY = 0;
    let hasVisible = false;

    // 孤立した1pxゴミを無視して本体バウンディングボックスを正確に測る
    for (let i = 0; i < alphaMask.length; i++) {
      const a = alphaMask[i] > 0 ? rgba[i * 4 + 3] : 0;
      maskedImgData.data[i * 4] = rgba[i * 4];
      maskedImgData.data[i * 4 + 1] = rgba[i * 4 + 1];
      maskedImgData.data[i * 4 + 2] = rgba[i * 4 + 2];
      maskedImgData.data[i * 4 + 3] = a;

      if (a > 25) {
        const x = i % WORK_SIZE;
        const y = (i - x) / WORK_SIZE;
        // 周囲4近傍に最低1つは不透明ピクセルがあるかチェック（1pxの消し残しゴミで縮小されるのを防ぐ）
        const hasNeighbor =
          (x > 0 && alphaMask[i - 1] > 0) ||
          (x < WORK_SIZE - 1 && alphaMask[i + 1] > 0) ||
          (y > 0 && alphaMask[i - WORK_SIZE] > 0) ||
          (y < WORK_SIZE - 1 && alphaMask[i + WORK_SIZE] > 0);
        if (hasNeighbor) {
          hasVisible = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    editCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
    editCtx.putImageData(maskedImgData, 0, 0);

    // 2. 128x128 正規化キャンバス上でサイズ揃え＆中央・足元配置＋ユーザー微調整（scalePct, offsetX, offsetY）
    const normCanvas = document.createElement('canvas');
    normCanvas.width = WORK_SIZE;
    normCanvas.height = WORK_SIZE;
    const normCtx = normCanvas.getContext('2d')!;
    normCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);

    const userScale = scalePct / 100;

    if (hasVisible && autoNormalize) {
      const bw = Math.max(1, maxX - minX + 1);
      const bh = Math.max(1, maxY - minY + 1);
      // 切り抜いたキャラの長辺が常に 108px (約84%) になるよう自動正規化し、さらに userScale を掛ける
      const baseFit = (WORK_SIZE * 0.84) / Math.max(bw, bh);
      const finalScale = baseFit * userScale;
      const dw = bw * finalScale;
      const dh = bh * finalScale;

      // 左右は中央揃え、上下は足元ライン（下から8px上）を基準に揃えることで、どの画像もピタッと地面に立つ！
      const dx = (WORK_SIZE - dw) / 2 + offsetX;
      const dy = WORK_SIZE - 8 - dh + offsetY;

      normCtx.drawImage(editCanvas, minX, minY, bw, bh, dx, dy, dw, dh);
    } else {
      const dw = WORK_SIZE * userScale;
      const dh = WORK_SIZE * userScale;
      const dx = (WORK_SIZE - dw) / 2 + offsetX;
      const dy = (WORK_SIZE - dh) / 2 + offsetY;
      normCtx.drawImage(editCanvas, 0, 0, WORK_SIZE, WORK_SIZE, dx, dy, dw, dh);
    }

    // 3. ドット粒度キャンバスへ縮小
    const targetRes = pixelSize === 0 ? WORK_SIZE : pixelSize;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetRes;
    outCanvas.height = targetRes;
    const outCtx = outCanvas.getContext('2d')!;
    outCtx.imageSmoothingEnabled = pixelSize === 0;
    outCtx.drawImage(normCanvas, 0, 0, WORK_SIZE, WORK_SIZE, 0, 0, targetRes, targetRes);

    // 4. カラーフィルタ
    if (colorFilter !== 'color') {
      const outData = outCtx.getImageData(0, 0, targetRes, targetRes);
      const d = outData.data;

      const lcdPalette: [number, number, number][] = [
        [47, 58, 34], // #2f3a22
        [82, 99, 60], // #52633c
        [136, 154, 104], // #889a68
        [185, 200, 152], // #b9c898
      ];

      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 80) {
          d[i + 3] = 0;
          continue;
        }
        d[i + 3] = 255;
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

        if (colorFilter === 'mono') {
          if (lum <= monoThreshold) {
            d[i] = 47;
            d[i + 1] = 58;
            d[i + 2] = 34;
          } else {
            d[i] = 216;
            d[i + 1] = 228;
            d[i + 2] = 185;
          }
        } else if (colorFilter === 'lcd4') {
          const level = lum < 68 ? 0 : lum < 135 ? 1 : lum < 200 ? 2 : 3;
          const [pr, pg, pb] = lcdPalette[level];
          d[i] = pr;
          d[i + 1] = pg;
          d[i + 2] = pb;
        }
      }
      outCtx.putImageData(outData, 0, 0);
    } else if (pixelSize > 0) {
      const outData = outCtx.getImageData(0, 0, targetRes, targetRes);
      const d = outData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i + 3] = d[i + 3] < 90 ? 0 : 255;
      }
      outCtx.putImageData(outData, 0, 0);
    }

    setOutputDataUrl(outCanvas.toDataURL('image/png'));
  }, [alphaMask, pixelSize, colorFilter, monoThreshold, autoNormalize, scalePct, offsetX, offsetY, sourceImg]);

  // 🚀 アプリ本体 (public/characters/*.png & localStorage) に保存＆即時反映
  const handleApplyAndSave = async () => {
    if (!outputDataUrl) return;
    setStoredCustomSprite(activeKey, outputDataUrl);

    try {
      const res = await fetch('/api/save-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: activeKey, dataUrl: outputDataUrl, action: 'save' }),
      });
      await refreshSavedKeys();
      if (res.ok) {
        setStatusMsg(`✅ 「${activeKey}.png」をプロジェクト本体へ永久保存＆即時反映しました！`);
        return;
      }
    } catch {
      await refreshSavedKeys();
    }
    setStatusMsg(`✅ 「${activeKey}」のキャラ画像をアプリに反映しました！`);
  };

  // 💾 PNGファイルとしてダウンロード
  const handleDownloadPng = () => {
    if (!outputDataUrl) return;
    const a = document.createElement('a');
    a.href = outputDataUrl;
    a.download = `${activeKey}.png`;
    a.click();
  };

  // 🗑️ 選択中スロットのカスタム画像を解除
  const handleResetSlot = async () => {
    if (!window.confirm(`「${activeKey}.png」の登録画像を削除して初期状態に戻しますか？`)) {
      return;
    }
    setStoredCustomSprite(activeKey, null);
    try {
      await fetch('/api/save-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: activeKey, action: 'delete' }),
      });
    } catch {
      // ignore
    }
    await refreshSavedKeys();
    setStatusMsg(`🔄 「${activeKey}」を初期状態に戻しました`);
  };

  return (
    <div className="space-y-2.5 text-xs">
      {/* 1. キャラクター選択（べび1種 ＋ おとな進化先3種） */}
      <div className="bg-pink-50 p-2.5 rounded-2xl border border-pink-200 space-y-2">
        <div className="font-bold text-pink-700 flex items-center justify-between text-[11px]">
          <span>① キャラを選択（計4キャラ）:</span>
          {savedKeys.has(activeKey) && (
            <button
              type="button"
              onClick={handleResetSlot}
              className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Trash2 size={10} />
              <span>この枠をリセット</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {CHARACTER_OPTIONS.map((c) => {
            const hasBase = savedKeys.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setTargetChar(c.id)}
                className={`relative py-1.5 px-1 rounded-xl font-bold border transition flex flex-col items-center cursor-pointer ${
                  targetChar === c.id
                    ? 'bg-pink-500 text-white border-pink-500 shadow'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-[10px] leading-tight">{c.label}</span>
                <span className={`text-[7.5px] ${targetChar === c.id ? 'text-pink-100' : 'text-gray-400'}`}>
                  {c.sub}
                </span>
                {hasBase && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[8px] flex items-center justify-center shadow">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 2. 表情スロット選択（基本の1〜3枚でOK！） */}
        <div className="pt-0.5">
          <div className="font-bold text-pink-700 text-[11px] mb-1">
            ② 表情を選択 <span className="font-normal text-[9.5px] text-gray-600">（最低「😊ふつう」の1枚だけでOK！）</span>:
          </div>

          {/* おすすめ基本3表情 */}
          <div className="grid grid-cols-3 gap-1">
            {BASIC_EXPRESSIONS.map((eId) => {
              const e = EXPRESSION_SLOTS.find((item) => item.id === eId)!;
              const k = buildSpriteKey(targetChar, e.id);
              const isSaved = savedKeys.has(k);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setTargetExpr(e.id)}
                  className={`relative py-1.5 px-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    targetExpr === e.id
                      ? 'bg-gray-800 text-white border-gray-800 shadow'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {e.label}
                  {isSaved && <span className="ml-0.5 text-emerald-400 font-black">●</span>}
                </button>
              );
            })}
          </div>

          {/* 任意で追加できるこだわり4表情（折りたたみ） */}
          <button
            type="button"
            onClick={() => setShowExtraExpr((v) => !v)}
            className="mt-1.5 text-[10px] text-pink-600 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
          >
            {showExtraExpr ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>
              {showExtraExpr
                ? 'こだわり表情（任意・4種）を閉じる'
                : '＋ こだわり表情も個別に登録する（任意：大好き・食事・怒り・寝顔）'}
            </span>
          </button>

          {showExtraExpr && (
            <div className="grid grid-cols-4 gap-1 mt-1">
              {EXTRA_EXPRESSIONS.map((eId) => {
                const e = EXPRESSION_SLOTS.find((item) => item.id === eId)!;
                const k = buildSpriteKey(targetChar, e.id);
                const isSaved = savedKeys.has(k);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setTargetExpr(e.id)}
                    className={`relative py-1 px-1 rounded-lg text-[9.5px] font-bold border transition truncate cursor-pointer ${
                      targetExpr === e.id
                        ? 'bg-gray-800 text-white border-gray-800 shadow'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {e.label}
                    {isSaved && <span className="ml-0.5 text-emerald-400 font-black">●</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="text-[9.5px] text-gray-500 mt-1 px-0.5 leading-snug">
            💡 <b>{currentExprInfo.label}</b>: {currentExprInfo.desc}
          </div>
        </div>
      </div>

      {/* 3. 画像ファイルを読み込む */}
      <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-2xl border-2 border-dashed border-pink-300 bg-pink-50/50 hover:bg-pink-100/50 text-pink-600 font-bold cursor-pointer transition">
        <Upload size={15} />
        <span>{sourceImg ? '別のイラスト・写真をえらぶ' : '③ イラスト・写真を選択して読み込む'}</span>
        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </label>

      {sourceImg && (
        <>
          {/* 4. くり抜き編集キャンバス ＆ 実機液晶プレビュー（ドラッグで位置移動可能！） */}
          <div className="grid grid-cols-2 gap-2">
            {/* 左: 背景くり抜きキャンバス */}
            <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
              <div className="text-[10px] font-bold text-gray-600 mb-1">
                ✂️ 背景くり抜き (タップ/なぞる)
              </div>
              <div
                className="relative w-32 h-32 border border-gray-300 rounded overflow-hidden touch-none"
                style={{
                  backgroundImage:
                    'conic-gradient(#e5e7eb 25%, #ffffff 25% 50%, #e5e7eb 50% 75%, #ffffff 75%)',
                  backgroundSize: '12px 12px',
                }}
              >
                <canvas
                  ref={editCanvasRef}
                  width={WORK_SIZE}
                  height={WORK_SIZE}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  className="w-full h-full cursor-crosshair"
                />
              </div>
              <div className="flex gap-1.5 mt-1.5 w-full">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="flex-1 py-1 bg-white border border-gray-300 rounded text-[10px] font-bold text-gray-600 disabled:opacity-40 flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  <RotateCcw size={10} />
                  <span>戻す</span>
                </button>
                <button
                  type="button"
                  onClick={() => reapplyAutoBg(autoCornerBg, tolerance)}
                  className="flex-1 py-1 bg-white border border-gray-300 rounded text-[10px] font-bold text-gray-600 flex items-center justify-center cursor-pointer"
                >
                  くり抜きリセット
                </button>
              </div>
            </div>

            {/* 右: たまごっち液晶プレビュー（ドラッグで位置移動 ＆ 基準ガイド重ね表示） */}
            <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
              <div className="text-[10px] font-bold text-gray-600 mb-1 flex items-center gap-1">
                <Move size={11} className="text-pink-500" />
                <span>📺 液晶プレビュー (ドラッグで移動)</span>
              </div>
              <div
                onPointerDown={handlePreviewPointerDown}
                onPointerMove={handlePreviewPointerMove}
                onPointerUp={handlePreviewPointerUp}
                onPointerCancel={handlePreviewPointerUp}
                className="relative w-32 h-32 border-2 border-[#3d4a2d] flex flex-col items-center justify-end pb-3 overflow-hidden cursor-move touch-none"
                style={{ backgroundColor: '#c8d4a9' }}
                title="ドラッグしてキャラクターの位置を微調整できます"
              >
                <div className="lcd-matrix-grid pointer-events-none absolute inset-0" />

                {/* 基準ガイド枠＆中心十字線 */}
                {showGuide && (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-[#2f3a22]/25" />
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-[#2f3a22]/25" />
                    <div
                      className="pointer-events-none absolute bottom-4 border border-dashed border-pink-600/45"
                      style={{
                        width: targetChar === 'baby' ? '68px' : '80px',
                        height: targetChar === 'baby' ? '68px' : '80px',
                      }}
                    />
                  </>
                )}

                {/* 👻 オニオンスキン（登録済みの基本キャラをうっすら後ろに重ねてサイズ・位置比較） */}
                {showGuide && referenceGuideSrc && (
                  <img
                    src={referenceGuideSrc}
                    alt="reference"
                    style={{
                      width: targetChar === 'baby' ? '68px' : '80px',
                      height: targetChar === 'baby' ? '68px' : '80px',
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                    }}
                    className="pointer-events-none absolute bottom-4 opacity-30 grayscale z-5"
                  />
                )}

                {outputDataUrl && (
                  <img
                    src={outputDataUrl}
                    alt="preview"
                    style={{
                      width: targetChar === 'baby' ? '68px' : '80px',
                      height: targetChar === 'baby' ? '68px' : '80px',
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                      transform: previewBounce ? 'translateY(2px) scale(1.05, 0.95)' : 'translateY(0)',
                      transformOrigin: 'bottom center',
                    }}
                    className="transition-transform duration-100 z-10 pointer-events-none"
                  />
                )}
                <div className="mt-1 h-1 w-14 bg-[#2f3a22]/25 z-10 pointer-events-none" />
              </div>

              <label className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGuide}
                  onChange={(e) => setShowGuide(e.target.checked)}
                  className="rounded text-pink-500"
                />
                <span>👻 基準枠＆前の画像をうっすら重ねる</span>
              </label>
            </div>
          </div>

          {/* 5. 📐 サイズ（拡大・縮小）＆ 中央・位置調整パネル */}
          <div className="bg-pink-50/70 p-2.5 rounded-2xl border border-pink-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-pink-700 text-[11px] flex items-center gap-1">
                <Crosshair size={12} />
                <span>④ サイズ揃え ＆ 中央・位置調整:</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setAutoNormalize(true);
                  setScalePct(100);
                  setOffsetX(0);
                  setOffsetY(0);
                }}
                className="px-2 py-0.5 bg-white border border-pink-300 rounded-lg text-[10px] font-bold text-pink-600 hover:bg-pink-100 cursor-pointer shadow-2xs"
              >
                🎯 自動で中央・標準サイズに揃える
              </button>
            </div>

            {/* 拡大・縮小スライダー */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-gray-700 font-bold w-20 whitespace-nowrap">大きさ: {scalePct}%</span>
              <input
                type="range"
                min={50}
                max={170}
                value={scalePct}
                onChange={(e) => setScalePct(Number(e.target.value))}
                className="flex-1 accent-pink-500"
              />
            </div>

            {/* 左右・上下スライダー */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center gap-1">
                <span className="text-gray-600 whitespace-nowrap">左右(X): {offsetX}</span>
                <input
                  type="range"
                  min={-48}
                  max={48}
                  value={offsetX}
                  onChange={(e) => setOffsetX(Number(e.target.value))}
                  className="flex-1 accent-pink-500"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600 whitespace-nowrap">上下(Y): {offsetY}</span>
                <input
                  type="range"
                  min={-48}
                  max={48}
                  value={offsetY}
                  onChange={(e) => setOffsetY(Number(e.target.value))}
                  className="flex-1 accent-pink-500"
                />
              </div>
            </div>
          </div>

          {/* 6. 背景くり抜きツール切り替え */}
          <div className="bg-gray-50 p-2 rounded-2xl border border-gray-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-700 text-[11px]">⑤ 背景くり抜きツール:</span>
              <label className="flex items-center gap-1 text-[10px] text-pink-600 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCornerBg}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setAutoCornerBg(next);
                    reapplyAutoBg(next, tolerance);
                  }}
                  className="rounded text-pink-500"
                />
                <span>四隅から背景自動くり抜き</span>
              </label>
            </div>

            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setTool('wand')}
                className={`py-1 px-1 rounded-lg text-[10px] font-bold border flex flex-col items-center gap-0.5 cursor-pointer ${
                  tool === 'wand' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <Wand2 size={12} />
                <span>タップ透過</span>
              </button>
              <button
                type="button"
                onClick={() => setTool('colorkey')}
                className={`py-1 px-1 rounded-lg text-[10px] font-bold border flex flex-col items-center gap-0.5 cursor-pointer ${
                  tool === 'colorkey'
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <Sparkles size={12} />
                <span>同色全消し</span>
              </button>
              <button
                type="button"
                onClick={() => setTool('eraser')}
                className={`py-1 px-1 rounded-lg text-[10px] font-bold border flex flex-col items-center gap-0.5 cursor-pointer ${
                  tool === 'eraser'
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <Eraser size={12} />
                <span>消しゴム</span>
              </button>
              <button
                type="button"
                onClick={() => setTool('restore')}
                className={`py-1 px-1 rounded-lg text-[10px] font-bold border flex flex-col items-center gap-0.5 cursor-pointer ${
                  tool === 'restore'
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <Paintbrush size={12} />
                <span>復元ブラシ</span>
              </button>
            </div>

            {tool === 'wand' || tool === 'colorkey' ? (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-gray-600 whitespace-nowrap">色しきい値: {tolerance}</span>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={tolerance}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTolerance(v);
                    if (autoCornerBg) reapplyAutoBg(true, v);
                  }}
                  className="flex-1 accent-pink-500"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-gray-600 whitespace-nowrap">ブラシ太さ: {brushSize}px</span>
                <input
                  type="range"
                  min={2}
                  max={18}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="flex-1 accent-pink-500"
                />
              </div>
            )}
          </div>

          {/* 7. たまごっち風ドット絵＆カラー変換フィルタ */}
          <div className="bg-gray-50 p-2 rounded-2xl border border-gray-200 space-y-1.5">
            <div className="font-bold text-gray-700 text-[11px]">⑥ たまごっち風変換スタイル:</div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-600 w-14">ドット感:</span>
              <div className="flex-1 grid grid-cols-5 gap-1">
                {(
                  [
                    { val: 0, label: 'そのまま' },
                    { val: 64, label: '細かい' },
                    { val: 48, label: '中ドット' },
                    { val: 32, label: '実機風' },
                    { val: 24, label: '粗ドット' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setPixelSize(opt.val)}
                    className={`py-1 rounded text-[9.5px] font-bold border cursor-pointer ${
                      pixelSize === opt.val
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-600 w-14">色モード:</span>
              <div className="flex-1 grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'color', label: '🎨 フルカラー' },
                    { id: 'lcd4', label: '📟 液晶4階調' },
                    { id: 'mono', label: '⬛ 実機白黒' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setColorFilter(opt.id)}
                    className={`py-1 rounded text-[9.5px] font-bold border cursor-pointer ${
                      colorFilter === opt.id
                        ? 'bg-[#2f3a22] text-[#c8d4a9] border-[#2f3a22]'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {colorFilter === 'mono' && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-gray-600 whitespace-nowrap">白黒の濃さ: {monoThreshold}</span>
                <input
                  type="range"
                  min={50}
                  max={235}
                  value={monoThreshold}
                  onChange={(e) => setMonoThreshold(Number(e.target.value))}
                  className="flex-1 accent-pink-500"
                />
              </div>
            )}
          </div>

          {/* 8. 保存＆適用ボタン */}
          <div className="space-y-1.5 pt-0.5">
            <button
              type="button"
              onClick={handleApplyAndSave}
              className="w-full py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
            >
              <Check size={15} />
              <span>🚀 「{activeKey}.png」として本体に永久保存＆即時反映</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="w-full py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold rounded-xl flex items-center justify-center gap-1 text-[11px] cursor-pointer"
            >
              <Download size={13} />
              <span>💾 {activeKey}.png をファイルとしてダウンロード</span>
            </button>
          </div>
        </>
      )}

      {statusMsg && (
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold text-center">
          {statusMsg}
        </div>
      )}
    </div>
  );
}
