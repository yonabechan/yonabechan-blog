// @ts-check
import { existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';

// npm run dev のときだけ、"/" や "/posts/" を public/ の index.html で表示する。
// （本番の GitHub Pages は自動でそうなるが、開発サーバーは 404 になるため）
const publicDirIndex = {
  name: 'public-dir-index',
  hooks: {
    /** @param {{ server: import('vite').ViteDevServer }} options */
    'astro:server:setup': ({ server }) => {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (path.endsWith('/') && existsSync(`public${path}index.html`)) {
          req.url = `${path}index.html`;
        }
        next();
      });
    },
  },
};

export default defineConfig({
  site: 'https://yonabechan.com',
  // 既存の記事と同じ URL の形（/posts/xxx.html）で出力する
  build: { format: 'preserve' },
  // コードブロックは既存の CSS（.article-body pre）で表示する
  markdown: { syntaxHighlight: false },
  integrations: [publicDirIndex],
});
