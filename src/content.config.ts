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
    tags: z.array(z.string()).optional(),
    // true の記事はビルド（公開）に出さない。npm run dev では確認用に表示する。
    // 書き忘れて意図せず公開しないよう、省略はできない（省略するとビルドエラー）
    draft: z.boolean(),
  }),
});

export const collections = { blog };
