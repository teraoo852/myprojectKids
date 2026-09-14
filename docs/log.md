# log.md — 記録（日付と1行）

- 2026-09-14 Kids Build: 草案（docs/draft/）を読み、docs/spec.md 初版を起こした（4画面・草案からの変更12点・未決4点）。次: 未決 §10 の答えをもらってから実装に入る。
- 2026-09-14 Kids Build: §10 の回答を反映（子ども別なし・iPad Air 2＝iPadOS 15 向けの制約を §8 に追加・フォント取得OK）。NAS は別システムへの質問文を §10 に用意。次: Kids Review の docs/review.md を待つ。
- 2026-09-14 Kids Build: 別セッションの commit で、子どもの名前と草案が公開リポジトリに push されていた。ユーザーの了承を得て非公開にし、手元の履歴を名前・草案なしに作り直した（docs/draft/ は .gitignore）。配信先は GitHub Pages に決定（docs/hosting.md）。次: ユーザーが GitHub のリポジトリを削除 → Build が作り直して push → 査読 R1〜R24 を spec に反映。
- 2026-09-14 Kids Build: 査読 R1〜R24 を全部 spec に反映（画面5 おとなの ひとへ を追加・ち の語を ちくわ に・GitHub Pages とオフライン（サービスワーカー）を §8 に）。次: GitHub のリポジトリを作り直して push → 実装に入る（最初は tests でなぞりの数値を測る）。
- 2026-09-14 Kids Build: CLAUDE.md §1・§2 を spec に合わせて埋め、「commit と push は Build だけ」「GitHub アカウントも別にする」を足した。次: 専用アカウントの名前と gh のログインを待ち、非公開で作り直して push する（commit のメールは noreply に）。
- 2026-09-14 Kids Build: 古いリポジトリの削除を確認。専用アカウント teraoo852 に非公開で作り直し、このリポジトリだけの設定（名前・noreply・資格情報）で push。gh の既定アカウントは元に戻した。次: 実装に入る（最初は tests でなぞりの数値を測る）。
- 2026-09-14 Kids Build: 履歴から gmail の前半と別システムのアカウント名を消し（hosting.md の URL を teraoo852 に・spec の注記を削る）、ユーザーの了承を得て force push。GitHub 側でも0件を確認。次: 実装に入る（最初は tests でなぞりの数値を測る）。
- 2026-09-14 Kids Build: site/ の初版を作った（画面1〜5・なぞり・読み上げ・記録・サービスワーカー）。tests/check.mjs はフォント以外 OK。ブラウザ（1024×748）で はみ出し無し・なぞりの判定・2本目の指・◎ を確認。なぞりの数値は代わりのフォントで仮に測り、太さ30では全字 70% 未満（最低 へ 54%）・40で全字 73% 以上。次: フォントを入れて測り直し、線の太さを決める。
