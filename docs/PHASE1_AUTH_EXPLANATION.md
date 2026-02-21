# Phase 1 実装の解説（Supabase・NextAuth 初心者向け）

## 1. なぜ Supabase と NextAuth の2つを使うか

- **Supabase**  
  - **ユーザー管理（メール/パスワード登録・ログイン・メール確認）** と **将来的なDB（学習履歴など）** を担当。  
  - パスワードのハッシュ保存・確認メール送信・セッション用トークン発行まで Supabase Auth がやってくれます。
- **NextAuth**  
  - **アプリ側の「ログイン状態」の統一** を担当。  
  - `useSession()` で「今誰がログインしているか」を簡単に取り出し、`signIn` / `signOut` でログイン・ログアウトのUXを整えます。  
  - Google など OAuth も NextAuth 経由で扱いやすくします。

つまり「認証の実体は Supabase、アプリから見たときの窓口は NextAuth」という役割分担です。

---

## 2. Supabase の役割と仕組み

### 2.1 何をするものか

- **Auth**: ユーザー登録・ログイン・メール確認・「今のユーザー」の識別（セッション）
- **DB（Phase 2 以降）**: 学習履歴などのテーブルを保存

Phase 1 で使っているのは **Supabase Auth** だけです。

### 2.2 クライアントの2種類（なぜ client と server があるか）

Next.js では「ブラウザで動くコード」と「サーバーで動くコード」が別なので、Cookie の扱いが違います。

| ファイル | 使う場面 | 役割 |
|----------|----------|------|
| `lib/supabase/client.ts` | ブラウザ（`'use client'` コンポーネント内） | `createBrowserClient`: ブラウザの Cookie を自動で読み書きする。メール確認リンク後の `setSession` はここを使う。 |
| `lib/supabase/server.ts` | サーバー（API Route や Server Component） | `createServerClient`: Next の `cookies()` で Cookie を読む/書く。`getUser()` で「このリクエストのユーザー」を取得。 |

- **ブラウザ**: ユーザーがメールのリンクを開いたとき、URL の `#access_token=...` を元に Supabase のセッションを「このブラウザ」に保存する必要がある → **client**。
- **サーバー**: 例として「この API はログイン済みユーザーだけ許可したい」といったときに、リクエストに付いた Cookie から「今のユーザー」を取る → **server**。

`@supabase/ssr` は「サーバー/クライアントで Cookie を正しく扱う」ためのヘルパーで、これが client/server の違いを吸収しています。

### 2.3 このアプリで Supabase がやっていること（箇所ごと）

- **新規登録**  
  `POST /api/auth/signup` 内で `supabase.auth.signUp({ email, password, options: { emailRedirectTo: '.../verify-email' } })` を実行。  
  → Supabase がユーザー作成・確認メール送信・リンクの行き先を `.../verify-email` に設定。
- **メール確認後**  
  確認リンクを開くと Supabase が `.../verify-email#access_token=...&refresh_token=...&type=signup` のようにリダイレクト。  
  → フロントの `verify-email` ページで **client** の `supabase.auth.setSession({ access_token, refresh_token })` を呼び、このブラウザに Supabase のセッション（Cookie）を保存。
- **ログイン（パスワード）**  
  `auth.ts` の Credentials の `authorize` 内で `supabase.auth.signInWithPassword({ email, password })` を実行。  
  → パスワードが正しければ Supabase がユーザー情報を返し、その情報を NextAuth に渡して「ログイン成功」にしている。

---

## 3. NextAuth の役割と仕組み

### 3.1 何をするものか

- プロバイダー（メール/パスワード・Google など）で「認証」し、
- その結果を **JWT でセッションとして保持** し、
- フロントでは `useSession()` / `signIn()` / `signOut()` で一括して扱う。

このアプリでは **セッション戦略は JWT**（`session: { strategy: 'jwt', maxAge: 30日 }`）。  
セッションの中身は暗号化された JWT で、Cookie 1 つ（`next-auth.session-token` または本番は `__Secure-next-auth.session-token`）に乗せています。

### 3.2 auth.ts の構成（1ファイルで何をしているか）

```ts
export const { handlers, auth } = NextAuth({
  providers,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  ...
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;   // ← authorize が返した user を JWT に載せる
        ...
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;  // ← フロントの session.user.id の元
        ...
      }
      return session;
    },
  },
});
```

- **providers**  
  - **Credentials**: メール/パスワードを Supabase の `signInWithPassword` で検証し、成功時に `{ id, email, name, image }` を返す。  
  - **Google**（環境変数があれば）: OAuth で Google ログイン。
- **callbacks**  
  - **jwt**: ログイン時に `authorize`（または OAuth）が返した `user` を `token` に詰め、その token が Cookie に保存される。  
  - **session**: フロントから `useSession()` で参照する `session` の形にし、`session.user.id` などを使えるようにしている。

`types/next-auth.d.ts` で `Session.user` に `id: string` を追加しているので、`session?.user?.id` が型安全的に使えます。

### 3.3 ルートハンドラ（`app/api/auth/[...nextauth]/route.ts`）

NextAuth v5 では、`/api/auth/*` へのリクエストをまとめて処理する「キャッチオール」が必要」です。

- `signIn('credentials', ...)` や `signIn('google', ...)` は内部で `POST /api/auth/callback/credentials` や `GET /api/auth/callback/google` などに飛ぶ。
- それらを `handlers` が受け、`auth.ts` の設定に従ってログイン処理と Cookie の設定を行う。

つまり「NextAuth のエントリポイント」がこの 1 ファイルです。

---

## 4. Phase 1 で追加・変更したファイルの役割（一覧）

| ファイル | 役割（一言） |
|----------|----------------|
| `auth.ts` | NextAuth の設定（Credentials + Google、JWT、callbacks） |
| `types/next-auth.d.ts` | `session.user.id` の型定義 |
| `lib/supabase/client.ts` | ブラウザ用 Supabase クライアント |
| `lib/supabase/server.ts` | サーバー用 Supabase クライアント（cookies 対応） |
| `lib/supabase/index.ts` | 上2つのエクスポート |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth の API 窓口 |
| `app/api/auth/signup/route.ts` | 新規登録（Supabase signUp、確認メール） |
| `app/api/auth/verify-email/route.ts` | メール確認後の「ユーザー検証」用（create-session の補助として用意されている） |
| `app/api/auth/create-session/route.ts` | メール確認後、Supabase セッションから **NextAuth の JWT と Cookie を1回だけ作る** 専用 API |
| `app/verify-email/page.tsx` | 確認メール送信後の案内＋リンククリック後の処理（setSession → create-session → トップへ） |
| `components/providers/SessionProvider.tsx` | `useSession()` を使うためにルートを NextAuth の SessionProvider でラップ |
| `app/layout.tsx` | 上記 SessionProvider で `children` を包む + `lang="ja"` |
| `components/auth/LoginModal.tsx` | 新規登録/ログイン切替・エラー/成功メッセージ・認証待ち案内 |
| `app/page.tsx` | `useSession`・`handleEmailAuth`（signup API + signIn）・`handleGoogleLogin`・リダイレクト |
| `components/header/Header.tsx` | ログイン状態に応じた表示（親から `isLoggedIn` 等を受け取る） |
| `env.example` | 必要な環境変数の説明 |

---

## 5. 新規登録フローの仕組み（ステップ単位）

1. **ユーザーがメール・パスワードを入力して「新規登録」**
   - `LoginModal` → `onEmailAuth(email, password, true)` → `app/page.tsx` の `handleEmailAuth`。

2. **`POST /api/auth/signup`**
   - `supabase.auth.signUp({ email, password, options: { emailRedirectTo: 'https://.../verify-email' } })` を実行。
   - Supabase がユーザー作成し、確認メールを送る。メール内のリンクの「戻り先」が `emailRedirectTo`。

3. **API の返却**
   - 成功時に `{ ok: true, requiresEmailConfirmation: true, email }` を返す（`email_confirmed_at === null` なら確認必須）。

4. **フロントの処理**
   - `requiresEmailConfirmation` が true なら `window.location.href = '/verify-email?email=...'` で **認証待ちページへリダイレクト**。

5. **`/verify-email?email=...`**
   - 「確認メールを送りました。リンクをクリックしてください」という案内を表示。まだここではログインしていない。

6. **ユーザーがメールの「確認」リンクをクリック**
   - Supabase が用意したリンクなので、クリックすると  
     `https://あなたのドメイン/verify-email#access_token=...&refresh_token=...&type=signup`  
     にリダイレクトされる（ハッシュでトークンが付く）。

7. **同じ `/verify-email` ページの `useEffect`**
   - `window.location.hash` に `access_token` があるかチェック。あれば `handleEmailVerification(hash)` を実行。

8. **ハッシュからトークン取得**
   - `hash.substring(1)` で `#` を取り、`URLSearchParams` で `access_token`, `refresh_token`, `type` を取得。
   - `type === 'signup'` かつ `access_token` があることを確認。

9. **Supabase のセッションをブラウザに保存**
   - **client** の `createClient()` で `supabase.auth.setSession({ access_token, refresh_token })` を実行。
   - Supabase がこのブラウザ用の Cookie を設定し、「このブラウザはこのユーザーでログイン済み」という状態になる。

10. **NextAuth のセッションを作りたい**
    - このアプリでは「ログイン状態」を `useSession()` で見ているので、NextAuth のセッションが必要。
    - しかし通常の `signIn('credentials', ...)` はパスワードが必要で、このフローではパスワードを送りたくない。
    - そのため **専用 API** `POST /api/auth/create-session` を用意している。

11. **`POST /api/auth/create-session`**
    - サーバー側で **server** の `createClient()` を呼ぶ → 先ほど `setSession` で保存した Cookie がリクエストに含まれるので、`supabase.auth.getUser()` で「今のユーザー」が取れる。
    - `user.email_confirmed_at` を確認し、メール確認済みなら OK。
    - NextAuth の JWT を `encode({ token: { id, email, name, picture }, secret, maxAge })` で作成。
    - その JWT を NextAuth と同じ名前の Cookie（`next-auth.session-token` 等）に `cookieStore.set(...)` で保存。
    - 返却は `{ ok: true, user }` で十分（Cookie が設定された時点で「NextAuth ログイン完了」）。

12. **フロント**
    - `create-session` が成功したら `window.location.href = '/'` でトップへ移動。
    - トップ読み込み時には NextAuth の Cookie が付いているので、`useSession()` が `status: 'authenticated'` を返し、**自動ログイン** のように見える。

まとめると、「Supabase がメール確認とセッション発行までやる → そのセッションを server で読んで、NextAuth 用の JWT を1回だけ発行する」のがメール確認後の自動ログインの仕組みです。

---

## 6. ログインフロー（既存ユーザー・メール/パスワード）の仕組み

1. ユーザーがメール・パスワードを入力して「ログイン」。
2. `handleEmailAuth(..., false)` の「ログイン」分岐に入り、`signIn('credentials', { email, password, redirect: false })` を実行。
3. NextAuth が内部で `POST /api/auth/callback/credentials` を呼ぶ。
4. `auth.ts` の Credentials の `authorize(credentials)` が実行され、その中で `supabase.auth.signInWithPassword({ email, password })` を呼ぶ。
5. Supabase がパスワードを検証。  
   - 失敗（未確認メール含む）なら `signInWithPassword` がエラー → `authorize` が `null` を返す → NextAuth がログイン失敗として `result.error` を返す。
   - 成功なら `authorize` が `{ id, email, name, image }` を返す。
6. NextAuth がその `user` を `jwt` コールバックに渡し、`token` に id 等を詰めて JWT を発行し、セッション用 Cookie を設定。
7. フロントでは `result?.error` がなければ「ログイン成功」とし、モーダルを閉じるか成功メッセージを表示。  
   - 以降、`useSession()` で `session.user` が取れる。

Google ログインの場合は、`signIn('google', { callbackUrl: '/' })` で NextAuth の Google プロバイダーに任せ、コールバック後に同じく JWT が発行され、Cookie が設定されます。

---

## 7. セッションの流れ（Cookie と JWT）の整理

- **Supabase のセッション**  
  - メール確認後、`setSession` でブラウザに保存される。  
  - 主に「メール確認直後〜create-session を呼ぶまで」と、サーバーで `getUser()` したいとき（create-session 内）で使う。
- **NextAuth のセッション**  
  - JWT 1 個が Cookie（`next-auth.session-token` など）に入っている。  
  - すべてのページで「ログインしているか・誰か」はこの Cookie を見る。  
  - `useSession()` は NextAuth がこの Cookie を読んで中身を decode し、`session` として返す。
- **有効期限**  
  - `auth.ts` で `maxAge: 30 * 24 * 60 * 60`（30日）なので、30日間ログインしっぱなしにできる（本番では必要に応じて短くする選択肢もある）。

---

## 8. 環境変数の意味

| 変数 | 用途 |
|------|------|
| `AUTH_SECRET` | NextAuth が JWT に署名するための秘密鍵。漏れると第三者が「なりすましセッション」を作れるので必須。 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトの URL（フロント・サーバー両方から参照するので `NEXT_PUBLIC_`）。 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の「匿名用」公開鍵。Auth と DB へのアクセス制御は Row Level Security 等で行う。 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth 用。未設定なら Google ボタンは無効（コード上で `...(googleId && googleSecret ? [Google(...)] : [])` になっている）。 |

Supabase ダッシュボードの Settings → API で URL と anon key を確認できます。Google は Cloud Console の認証情報で OAuth 2.0 クライアント ID を作り、リダイレクト URI に `http://localhost:3000/api/auth/callback/google` などを追加します。

---

## 9. まとめ（Phase 1 の頭の整理用）

- **Supabase**: ユーザー登録・メール確認・パスワード検証・「このブラウザの Supabase ユーザー」の管理。  
  - ブラウザでは `client`、API では `server` を使って、それぞれの場所で Cookie を正しく扱う。
- **NextAuth**: アプリ全体で「ログインしているユーザー」を JWT 1 枚の Cookie で管理し、`useSession` / `signIn` / `signOut` で扱いやすくする。
- **メール確認後の自動ログイン**: 確認リンク → `verify-email` で `setSession` → 同じブラウザで `create-session` を呼ぶと、サーバーが Supabase の Cookie からユーザーを取得し、NextAuth の JWT を 1 回だけ発行して Cookie に乗せる、という流れ。

Phase 2 では、この「誰がログインしているか」（`session.user.id`）をキーに、Supabase の **データベース** に学習履歴を保存・取得する実装になっていきます。
