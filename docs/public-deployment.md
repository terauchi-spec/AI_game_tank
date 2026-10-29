# 公開環境

GitHub正本: `terauchi-spec/AI_game_tank`

- 開発: `main` → 既存Worker `ai-game-tank`。設定・URL・自動デプロイは変更しない。
- 公開: `public` → 別Worker `kossori-tank`。公開版を更新したい時だけ `main` を取り込む。
- 公開Workerの設定ファイルは `wrangler.public.json`。スコアボードはWorker単位で分離し、開発用の保存データを変更しない。

## Cloudflareでの初回接続

Workers & PagesからGitHubの同じリポジトリを接続し、公開用Worker名を `kossori-tank`、本番ブランチを `public` に設定する。

デプロイコマンド:

```sh
npx wrangler deploy --config wrangler.public.json
```

ビルドは不要。ルートディレクトリはリポジトリ直下。既存Worker `ai-game-tank` のブランチ・ビルド設定は変更しない。

## 公開版の更新

動作確認した `main` の変更だけを `public` に取り込み、公開設定を保ってpushする。公開時にCloudflareのデプロイ成功と実際の公開URLを確認する。

公開URLはCloudflareが返す値を正本とし、まだ未作成のURLを発行済みとして案内しない。ブラウザ内のセーブデータはURLごとに独立する。
