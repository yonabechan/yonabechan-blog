// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://yonabechan.com',
  // 既存の記事と同じ URL の形（/posts/xxx.html）で出力する
  build: { format: 'preserve' },
  // コードブロックは既存の CSS（.article-body pre）で表示する
  markdown: { syntaxHighlight: false },
});
