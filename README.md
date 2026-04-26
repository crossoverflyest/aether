# news-desktop

全世界の主要ニュースを収集・表示するデスクトップアプリ

## 機能

- 世界各地の主要RSSフィードから自動収集
- 既読 / 未読 管理
- 日別 / 月別 / 年別 でまとめて展開可能なツリー表示
- カテゴリ・日付・既読状態でソート

## スタック

| レイヤー | 技術 |
|---------|------|
| デスクトップフレーム | Electron |
| UI | React + TypeScript |
| スタイル | Tailwind CSS |
| ローカルDB | SQLite (better-sqlite3) |
| ニュース収集 | RSS Parser + NewsAPI |
| パッケージング | electron-builder (.exe) |

## ディレクトリ構成

```
news-desktop/
├── src/
│   ├── main/           # Electronメインプロセス
│   ├── renderer/       # Reactフロントエンド
│   │   ├── components/ # UIコンポーネント
│   │   ├── pages/      # 画面
│   │   ├── hooks/      # カスタムフック
│   │   └── store/      # 状態管理
│   ├── db/             # SQLiteスキーマ・クエリ
│   ├── feeds/          # RSSフィード定義・収集ロジック
│   └── shared/
│       └── types/      # 共通型定義
├── assets/             # アイコン等
└── dist/               # ビルド出力
```

## セットアップ

```bash
npm install
npm run dev       # 開発起動
npm run build     # .exe ビルド
```
