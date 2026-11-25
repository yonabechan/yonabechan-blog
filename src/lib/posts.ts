import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCollection } from 'astro:content';

export interface PostSummary {
  title: string;
  date: Date;
  href: string;
  draft: boolean;
}

// 「2026.11.23」形式（日本時間）
export function formatDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}.${get('month')}.${get('day')}`;
}

// 既存の HTML 記事（public/posts/*.html）から、タイトルと日付を読み取る。
// これらの記事は書き換えないので、ここで読むだけにしている。
function getHtmlPosts(): PostSummary[] {
  const dir = join(process.cwd(), 'public', 'posts');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.html') && name !== 'index.html')
    .map((name) => {
      const html = readFileSync(join(dir, name), 'utf-8');
      const title = html.match(/<title>(.*?)\s*\|\s*yonabechan<\/title>/)?.[1];
      const date = html.match(/class="article-date">(\d{4})\.(\d{2})\.(\d{2})</);
      if (!title || !date) {
        throw new Error(`public/posts/${name} からタイトルか日付を読み取れません`);
      }
      return {
        title,
        date: new Date(`${date[1]}-${date[2]}-${date[3]}`),
        href: `/posts/${name}`,
        draft: false,
      };
    });
}

// Markdown 記事。draft: true は本番ビルドに出さない（npm run dev では表示する）
export async function getMarkdownPosts() {
  return getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
}

// HTML 記事と Markdown 記事を合わせて、新しい順に並べる
export async function getAllPosts(): Promise<PostSummary[]> {
  const markdown = (await getMarkdownPosts()).map((post) => ({
    title: post.data.title,
    date: post.data.date,
    href: `/posts/${post.id}.html`,
    draft: post.data.draft,
  }));
  return [...getHtmlPosts(), ...markdown].sort(
    (a, b) => b.date.getTime() - a.date.getTime() || b.href.localeCompare(a.href),
  );
}
