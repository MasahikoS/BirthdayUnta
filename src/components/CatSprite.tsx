import { useEffect, useState } from 'react';
import {
  getCatSprite,
  poseToExpression,
  BABY_LEGS_B,
  ADULT_LEGS_B,
  type Pose,
  type ExpressionId,
} from './sprites';
import type { GrowthStage, AdultVariant, CharacterId } from '../game/state';

export const CUSTOM_SPRITE_KEY_PREFIX = 'untaneko-custom-sprite-';

export function buildSpriteKey(charId: CharacterId, expr: ExpressionId = 'normal'): string {
  return expr === 'normal' ? charId : `${charId}_${expr}`;
}

export function getStoredCustomSprite(key: string): string | null {
  try {
    return localStorage.getItem(`${CUSTOM_SPRITE_KEY_PREFIX}${key}`);
  } catch {
    return null;
  }
}

export function setStoredCustomSprite(key: string, dataUrl: string | null): void {
  try {
    const fullKey = `${CUSTOM_SPRITE_KEY_PREFIX}${key}`;
    if (dataUrl) {
      localStorage.setItem(fullKey, dataUrl);
    } else {
      localStorage.removeItem(fullKey);
    }
    window.dispatchEvent(new CustomEvent('unta-sprite-updated', { detail: { key } }));
  } catch (e) {
    console.error('Failed to store custom sprite', e);
  }
}

interface PixelSpriteProps {
  rows: readonly string[];
  size?: number;
  className?: string;
  inkColor?: string;
}

/** 文字列グリッドをSVGの四角で描画するドット絵コンポーネント */
export function PixelSprite({ rows, size = 6, className, inkColor = 'currentColor' }: PixelSpriteProps) {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const cells: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c === '#') {
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={inkColor} />);
      } else if (c === 'e') {
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="var(--lcd)" />);
      }
    });
  });
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * size}
      height={h * size}
      shapeRendering="crispEdges"
      className={className}
    >
      {cells}
    </svg>
  );
}

interface CatSpriteProps {
  stage?: GrowthStage;
  adultType?: AdultVariant;
  pose: Pose;
  size?: number;
  still?: boolean;
}

/**
 * 表情のスマートフォールバック順序を返す
 * 例: 「大好き(love)」や「食事(eat)」が未登録でも「よろこび(happy)」があればそれを使い、
 * 「ぷんぷん(angry)」が未登録でも「しょんぼり(sad)」があればそれを使うため、
 * 最低1枚（ふつう）〜3枚（ふつう・よろこび・しょんぼり）だけで全シーン豊かに動きます！
 */
function getExpressionFallbackChain(expr: ExpressionId): ExpressionId[] {
  switch (expr) {
    case 'love':
    case 'eat':
      return [expr, 'happy', 'normal'];
    case 'angry':
      return ['angry', 'sad', 'normal'];
    case 'happy':
    case 'sad':
    case 'sleep':
      return [expr, 'normal'];
    case 'normal':
    default:
      return ['normal'];
  }
}

/**
 * うんたねこ表示コンポーネント（おとな3種進化分岐 ＆ スマート表情フォールバック対応）
 */
export function CatSprite({
  stage = 'adult',
  adultType = 'adult_a',
  pose,
  size,
  still = false,
}: CatSpriteProps) {
  const [frame, setFrame] = useState(0);
  const [revision, setRevision] = useState(0);
  const [failedPaths, setFailedPaths] = useState<Record<string, boolean>>({});

  const charId: CharacterId = stage === 'baby' ? 'baby' : adultType;
  const expr: ExpressionId = poseToExpression(pose);
  const chain = getExpressionFallbackChain(expr);

  useEffect(() => {
    const onUpdate = () => {
      setFailedPaths({});
      setRevision((r) => r + 1);
    };
    window.addEventListener('unta-sprite-updated', onUpdate);
    return () => window.removeEventListener('unta-sprite-updated', onUpdate);
  }, []);

  // 2コマアニメーション（ぴょこぴょこ揺れ）
  useEffect(() => {
    if (still) return;
    const intervalMs = stage === 'baby' ? 450 : 600;
    const id = window.setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), intervalMs);
    return () => window.clearInterval(id);
  }, [still, stage]);

  const actualSize = size ?? (stage === 'baby' ? 6.5 : 7);

  // 揺れスタイル（画像でもドット絵でも同じようにぴょこぴょこ動きます）
  const bounceStyle: React.CSSProperties =
    frame === 1 && !still && pose !== 'sleep'
      ? {
          transform: stage === 'baby' ? 'translateY(2px) scale(1.06, 0.94)' : 'translateY(3px) scale(1.04, 0.95)',
          transformOrigin: 'bottom center',
        }
      : { transform: 'translateY(0)', transformOrigin: 'bottom center' };

  const q = revision ? `?v=${revision}` : '';

  // 1. まず localStorage 内の登録画像をチェーン順（指定表情 ➔ 代替表情 ➔ 通常）に探す
  let activeImgSrc: string | null = null;
  for (const eId of chain) {
    const key = buildSpriteKey(charId, eId);
    const stored = getStoredCustomSprite(key);
    if (stored) {
      activeImgSrc = stored;
      break;
    }
    if (eId === 'normal' && charId === 'adult_a') {
      const legacy = getStoredCustomSprite('adult');
      if (legacy) {
        activeImgSrc = legacy;
        break;
      }
    }
  }

  // 2. localStorage に無ければ public/characters/*.png をチェーン順に探す
  if (!activeImgSrc) {
    for (const eId of chain) {
      const key = buildSpriteKey(charId, eId);
      const path = `./characters/${key}.png${q}`;
      if (!failedPaths[path]) {
        activeImgSrc = path;
        break;
      }
      if (eId === 'normal' && charId === 'adult_a') {
        const legacyPath = `./characters/adult.png${q}`;
        if (!failedPaths[legacyPath]) {
          activeImgSrc = legacyPath;
          break;
        }
      }
    }
  }

  if (activeImgSrc) {
    const scaleFactor = size ? size / (stage === 'baby' ? 6.5 : 7) : 1;
    const baseW = stage === 'baby' ? 76 : 90;
    const imgWidth = Math.round(baseW * scaleFactor);
    return (
      <div style={bounceStyle} className="transition-transform duration-100 flex items-center justify-center select-none">
        <img
          src={activeImgSrc}
          alt={stage === 'baby' ? 'べびうんたねこ' : 'うんたねこ'}
          style={{
            width: `${imgWidth}px`,
            height: `${imgWidth}px`,
            objectFit: 'contain',
            imageRendering: 'pixelated',
          }}
          onError={() => {
            if (activeImgSrc && !activeImgSrc.startsWith('data:')) {
              setFailedPaths((prev) => ({ ...prev, [activeImgSrc!]: true }));
            }
          }}
        />
      </div>
    );
  }

  // 画像が無い場合のドット絵フォールバック描画（べび期 or おとな3種類 × 全ポーズ）
  let rows = getCatSprite(stage, pose, adultType);
  if (frame === 1 && pose !== 'sleep') {
    const legs = stage === 'baby' ? BABY_LEGS_B : ADULT_LEGS_B;
    rows = rows.map((r, i) => (i === rows.length - 1 ? legs : r));
  }

  return (
    <div style={bounceStyle} className="transition-transform duration-100 flex items-center justify-center">
      <PixelSprite rows={rows} size={actualSize} />
    </div>
  );
}
