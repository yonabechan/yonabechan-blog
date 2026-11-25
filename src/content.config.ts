import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 新しい記事は src/content/blog/<YYYY-MM-DD-slug>.md に書く。
// ファイル名（拡張子なし）が URL になる：/posts/<YYYY-MM-DD-slug>.html
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    // true の記事はビルド（公開）に出さない。npm run dev では確認用に表示する
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
