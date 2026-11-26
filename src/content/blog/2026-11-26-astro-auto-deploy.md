---
title: "手書きHTMLのブログをAstroに移し、pushだけで公開されるようにした話"
description: "既存のHTML記事を書き換えずにAstroへ移行し、GitHub ActionsでGitHub Pagesに自動公開する仕組みを作りました。下書きを誤って公開しないための工夫もまとめます。"
date: 2026-11-26
tags: ["Astro", "GitHub Actions", "GitHub Pages", "ブログ運営", "Claude Code"]
draft: false
---

このブログは、これまで1記事ずつHTMLを手で書いていました。
今回、静的サイトジェネレーターの [Astro](https://astro.build/) に移し、記事をMarkdownで書いて `main` に push するだけで公開されるようにしました。
この記事は、その仕組みで公開する最初のMarkdown記事です。

作業はAIコーディングツールのClaude Codeと一緒に進めました。コードの大部分はClaude Codeが書き、私は方針を決めることと、各段階でローカルや本番の表示を確かめることを担当しています。

## 課題：記事を書く以外の作業が多い

HTMLで書いていた頃は、記事を1本足すたびに次の作業が必要でした。

- 記事のHTMLをテンプレートからコピーして、ヘッダーやフッターを合わせる
- トップページと記事一覧に、手でリンクを足す
- 表示が崩れていないか確かめてから push する

記事が2本のうちは回せますが、増えるほど「書く」以外の手間が増えます。
一方で、すでに公開している記事のURLや見た目は変えたくありませんでした。

そこで、次の3つを条件にしました。

1. 既存のHTML記事は書き換えず、URLも見た目も今のまま残す
2. 新しい記事からMarkdownで書き、一覧は自動で作る
3. どの段階で止めても、公開中のサイトが壊れない順番で進める

## 構成

<a href="/img/2026-11-26-astro-deploy.drawio.svg" target="_blank" rel="noopener"><img src="/img/2026-11-26-astro-deploy.drawio.svg" alt="記事を書いてcommitすると、pre-commit hookの確認を通ってからpushされ、GitHub ActionsがAstroをビルドしてGitHub Pagesに公開し、yonabechan.comに表示される流れ"></a>

記事を書いて commit すると、まず pre-commit hook が秘密情報や画像の位置情報を確かめます。
`main` に push すると、GitHub Actions が `npm ci` と `npm run build` を実行し、できあがった `dist/` を GitHub Pages に公開します。
配信は今までどおり GitHub Pages のままで、変えたのは「ビルドと公開のやり方」だけです。

## 実装のポイント

### 1. 既存のHTMLは public/ にそのまま置く

Astroでは、`public/` に置いたファイルはビルドで加工されず、そのまま出力にコピーされます。
既存のHTML記事・CSS・画像・独自ドメインの設定ファイル（CNAME）を、すべて `public/` に移しました。

これで既存の記事は1行も書き換えずに、今と同じURL（`/posts/xxx.html`）で配信され続けます。
新しいMarkdown記事も同じ形のURLになるよう、Astroの設定で出力の形式を合わせました。

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://yonabechan.com',
  // 既存の記事と同じ URL の形（/posts/xxx.html）で出力する
  build: { format: 'preserve' },
});
```

### 2. HTML記事とMarkdown記事を同じ一覧に並べる

一覧の自動生成で一番迷ったのが、HTML記事とMarkdown記事の共存です。
Markdown記事はAstroのコンテンツコレクションから取得できますが、HTML記事はAstroの管理の外にあります。

そこで、HTML記事のファイルからタイトルと日付だけを読み取り、Markdown記事と合わせて新しい順に並べるようにしました。
読み取れない記事があればビルドを失敗させて、一覧から黙って消えないようにしています。

```ts
// src/lib/posts.ts（抜粋）
const title = html.match(/<title>(.*?)\s*\|\s*yonabechan<\/title>/)?.[1];
const date = html.match(/class="article-date">(\d{4})\.(\d{2})\.(\d{2})</);
if (!title || !date) {
  throw new Error(`public/posts/${name} からタイトルか日付を読み取れません`);
}
```

### 3. 下書きを誤って公開しない：draft の指定を必須にする

pushすればそのまま公開される仕組みでは、「下書きのつもりの記事が公開される」事故が一番怖いところです。
そこで、記事の先頭（front matter）に書く `draft` を、省略できない項目にしました。

```ts
// src/content.config.ts（抜粋）
schema: z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).optional(),
  // 書き忘れて意図せず公開しないよう、省略はできない（省略するとビルドエラー）
  draft: z.boolean(),
}),
```

最初は `draft` を省略できる作りでしたが、省略した記事は「下書きではない」とみなされて公開されてしまいます。
必須にしておけば、書き忘れた時点でビルドが失敗し、公開される前に止まります。
`draft: true` の記事は本番には出ず、手元の `npm run dev` では「下書き」と表示して確認できます。

### 4. GitHub Actions は必要な権限だけ、外部のActionはSHAで固定する

公開のワークフローでは、与える権限を「リポジトリの読み取り」「Pagesへの公開」「そのための認証トークン」だけに絞りました。
また、外部のActionはタグ（`v5` など）ではなく、コミットのSHAで固定しています。
タグはあとから別のコミットに付け替えられるので、知らないうちに中身が変わるのを防ぐためです。

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

steps:
  # タグではなくコミットの SHA で固定する（タグの差し替え対策）
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

## 結果

- `main` に push すると、GitHub Actions のビルドと公開が約35〜40秒で終わり、サイトに反映されるようになりました
- 既存のHTML記事2本は、URLも見た目も変わっていません
- 記事を1本足すときの作業は、「Markdownを1ファイル書いて `draft: false` にし、push する」だけになりました

進め方は、50分の作業枠5つに分けました。

| 枠 | やったこと | push |
|---|---|---|
| 1 | Astroを導入し、既存のファイルを `public/` に移す | しない |
| 2 | 記事のレイアウトとMarkdown記事の仕組みを作る | しない |
| 3 | トップと記事一覧を自動生成する | しない |
| 4 | GitHub Actionsのワークフローを作り、Pagesの公開元を切り替える | ここで初めて push |
| 5 | READMEに構成図と記事の書き方を書き、Markdown記事を本番で公開する | する |

3枠目までは push しないので、途中で止めても公開中のサイトには影響しません。
公開に影響が出るのは、Pagesの公開元を「GitHub Actions」に切り替える4枠目からです。ここは、表示をその場で確かめられる時間に作業しました。

公開元をGitHub Actionsに切り替えると独自ドメインの設定が外れないか心配していましたが、外れずにそのまま使えました。
また、図をビルド時に描く仕組みも入れかけましたが、裏でブラウザを動かす必要があるとわかり、保守の手間を考えてやめました。

## 学び

- **「変えないもの」を先に決めると、移行は小さくできる。** 既存の記事を書き換えないと決めたことで、`public/` に置くだけで済みました
- **安全装置は「忘れても止まる」形にする。** `draft` を必須にするのも、pre-commit hook も、人の注意に頼らずに仕組みで止める考え方です
- **AIに書かせる部分が増えるほど、確かめる手順が大事になる。** Claude Codeは一覧の自動生成やワークフローをすぐに書いてくれますが、「push = 公開」の境目だけは、私がローカルと本番の表示を見て判断しました

次は、配信をGitHub PagesからAWS（S3 + CloudFront）に移し、インフラをコードで管理するところまで進める予定です。
