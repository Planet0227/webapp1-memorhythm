This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

**Memorhythm** — エビングハウスの忘却曲線に基づく復習タイミング提案アプリ（MVP + Phase 1 認証）

## Phase 1: 認証セットアップ

ログイン・新規登録を動かすには環境変数が必要です。

1. **環境変数**
   - `cp env.example .env.local`（Windows: `copy env.example .env.local`）
   - `.env.local` を編集し、以下を設定:
     - **必須**: `AUTH_SECRET`（例: `openssl rand -base64 32` で生成）
     - **必須**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`（[Supabase](https://supabase.com/dashboard) でプロジェクト作成 → Settings → API）
     - **任意**: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`（[Google Cloud Console](https://console.cloud.google.com/apis/credentials) で OAuth 2.0 クライアント作成。リダイレクト URI: `http://localhost:3000/api/auth/callback/google`）

2. **Supabase**
   - プロジェクトで **Authentication** → **Providers** で **Email** を有効化
   - メール確認をオフにすると、サインアップ後すぐログイン可能（開発時のみ推奨）

3. **開発サーバー**
   - `npm run dev` 後、[http://localhost:3000](http://localhost:3000) でログインモーダルからメール/Google 認証を試せます。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
