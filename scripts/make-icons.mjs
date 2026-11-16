// PWAアイコン生成: node scripts/make-icons.mjs
// ドット絵（src/components/sprites.ts）から PNG と favicon.svg を public/ に出力する。
import fs from 'node:fs';
import zlib from 'node:zlib';
import { ADULT_CAT } from '../src/components/sprites.ts';

const BG = [0xc8, 0xd4, 0xa9];
const INK = [0x2f, 0x3a, 0x22];
const grid = ADULT_CAT.happy;
const GW = grid[0].length;
const GH = grid.length;

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function png(size, fill) {
  const s = (size * fill) / GW;
  const ox = (size - GW * s) / 2;
  const oy = (size - GH * s) / 2;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - ox) / s);
      const gy = Math.floor((y - oy) / s);
      const on = gx >= 0 && gx < GW && gy >= 0 && gy < GH && grid[gy][gx] === '#';
      const [r, g, b] = on ? INK : BG;
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/pwa-192x192.png', png(192, 0.7));
fs.writeFileSync('public/pwa-512x512.png', png(512, 0.7));
fs.writeFileSync('public/pwa-maskable-512x512.png', png(512, 0.55));
fs.writeFileSync('public/apple-touch-icon.png', png(180, 0.7));

let rects = '';
grid.forEach((row, y) =>
  [...row].forEach((c, x) => {
    if (c === '#') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }),
);
fs.writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${GW + 4} ${GW + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${GW + 4}" height="${GW + 4}" fill="#c8d4a9"/><g fill="#2f3a22" transform="translate(0 2)">${rects}</g></svg>`,
);
console.log('icons generated');
