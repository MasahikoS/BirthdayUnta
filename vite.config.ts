import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_CHAR_KEYS = new Set([
  'baby',
  'adult',
  'adult_a',
  'adult_b',
  'adult_c',
  ...[
    'baby',
    'adult_a',
    'adult_b',
    'adult_c',
  ].flatMap((c) => ['normal', 'happy', 'love', 'eat', 'sad', 'angry', 'sleep'].map((e) => `${c}_${e}`)),
]);

/**
 * 開発サーバー中にブラウザの「🎨キャラ画像メーカー」から
 * public/characters/*.png（べび期・おとな3種類・各表情差分）を直接プロジェクト内へ永久保存するプラグイン
 */
function characterSavePlugin(): Plugin {
  return {
    name: 'untaneko-character-save',
    configureServer(server) {
      server.middlewares.use('/api/save-character', (req, res) => {
        const targetDirs = [
          path.resolve(process.cwd(), 'public', 'characters'),
          'F:\\マイドライブ\\Antigravity\\Unta\\public\\characters',
        ];

        // GET: 現在 public/characters/ に保存されているファイル一覧を返す
        if (req.method === 'GET') {
          try {
            const dir = targetDirs[0];
            const files = fs.existsSync(dir)
              ? fs
                  .readdirSync(dir)
                  .filter((f) => f.endsWith('.png'))
                  .map((f) => f.replace(/\.png$/, ''))
              : [];
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, keys: files }));
          } catch {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, keys: [] }));
          }
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const { key, stage, dataUrl, action } = JSON.parse(body) as {
              key?: string;
              stage?: string;
              dataUrl?: string;
              action?: 'save' | 'delete';
            };
            const spriteKey = key || stage || '';
            if (!ALLOWED_CHAR_KEYS.has(spriteKey)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Invalid sprite key' }));
              return;
            }

            const fileName = `${spriteKey}.png`;

            if (action === 'delete') {
              for (const dir of targetDirs) {
                try {
                  const p = path.join(dir, fileName);
                  if (fs.existsSync(p)) fs.unlinkSync(p);
                } catch {
                  // ignore
                }
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, deleted: fileName }));
              return;
            }

            if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Invalid PNG dataUrl' }));
              return;
            }

            const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
            const buffer = Buffer.from(base64, 'base64');

            for (const dir of targetDirs) {
              try {
                if (fs.existsSync(path.dirname(dir))) {
                  fs.mkdirSync(dir, { recursive: true });
                  fs.writeFileSync(path.join(dir, fileName), buffer);
                }
              } catch {
                // ignore secondary sync errors
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, file: `public/characters/${fileName}` }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    characterSavePlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        // オフラインでも動くよう主要アセットをすべてプリキャッシュ
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
      manifest: {
        name: 'うんたねこ',
        short_name: 'うんたねこ',
        description: 'うんたねこと遊べるたまごっち風ミニゲーム',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#fbcfe8',
        background_color: '#fce7f3',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
