# 配信先の決め（GitHub Pages）— Kids Build への回答

**決定（2026-09-14・ユーザー）**: 置き場は職場の NAS ではなく **GitHub Pages**。Tailscale・NAS・myprojectP の環境には一切依存しない。
**回答者**: Lodestar（myprojectP 側の照合役・一時的な補助として）。**秘密は含まない**（公開 URL と公開の仕組みだけ）。

## Build の8問への答え

| # | 問い | 答え |
|---|---|---|
| 1 | 機種と OS | 該当なし。GitHub Pages（静的 CDN）。サーバ側の設定は無い |
| 2 | 配信の仕組み | **GitHub Actions が `site/` を Pages に上げる**（下の workflow）。リポジトリの Settings → Pages → Source を **GitHub Actions** にする（ユーザーの操作・1回） |
| 3 | 置き場 | リポジトリの **`site/`** がそのまま配信される。★**URL は `https://teraoo852.github.io/myprojectKids/`（末尾に `/myprojectKids/` が付く）**——**リンク・CSS・JS・フォントのパスは全部「相対」で書く**（`/app.css` のような先頭 `/` は壊れる・`./app.css` か `app.css`） |
| 4 | 開くアドレス | 上の URL。**https が自動で付く**。iPad は家でも外でも同じ URL・**Tailscale は不要** |
| 5 | 更新の仕方 | `main` に push すると **約1分で反映**。commit は Kids Build、push もそのまま Build（書き手は1本のまま）。手で置く作業は無い |
| 6 | 外から見えるか | **公開**（URL を知っていれば誰でも開ける・認証は無い）。⇒ ★**個人情報（名前・写真・生年月日）を `site/` にも `docs/` にも入れない**。検索に載せたくなければ各 HTML の `<head>` に `<meta name="robots" content="noindex">` を1行 |
| 7 | Content-Type とキャッシュ | `.woff2` `.js` `.css` `.svg` は正しい型で返る。**キャッシュは10分**（`Cache-Control: max-age=600`）。すぐ反映させたいときは **ファイル名に版を付ける**（`app.v3.js`）か **HTML から `?v=20260914` を付けて読む**。PWA のサービスワーカーを置くなら、更新のたびにキャッシュ名の版を上げる |
| 8 | 制約 | 静的ファイルのみ（サーバのプログラム・DB は動かない）・**1サイト 1GB・月 100GB の転送・1時間に10回の配信**が目安。**`site/.nojekyll` を空で置く**（`_` で始まるフォルダが消されるのを防ぐ）・パスは大文字小文字を区別する・404 は `site/404.html` |

## workflow（`.github/workflows/pages.yml`——Build が置く）

```yaml
name: pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

## PWA（オフラインで動かす・置き場と独立に効く）

- `site/manifest.webmanifest`（名前・アイコン・`display: standalone`・`start_url: ./`・`scope: ./`）。
- `site/sw.js`: **キャッシュ名に版**（例 `kids-v3`）・install で `site/` の全ファイルを先読み・fetch はキャッシュ優先・activate で古い版を消す。**更新のたびに版を上げる**（上げ忘れると iPad が古いまま）。
- iPad の Safari で「ホーム画面に追加」——以後はネットが無くても開ける。

## リポジトリの公開に伴う決め（ユーザー）

- **GitHub の無料プランでは、Pages を使うリポジトリは公開（public）**。⇒ ★**`docs/draft/`（Cowork の草案）と `docs/local/` は `.gitignore` に入れて追跡しない**。追跡するのは CLAUDE.md・`docs/spec.md`・`docs/log.md`・`docs/review.md`・`site/`・workflow だけ。**どれにも名前・生年月日を書かない**。
- リポジトリを非公開のままにしたいなら、代わりは **Cloudflare Pages**（非公開リポジトリでも無料・出力フォルダ `site`）——口座が1つ増える。
