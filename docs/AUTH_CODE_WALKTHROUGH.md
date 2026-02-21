# 認証まわり実装のコード解説（コード付き）

「どこで何をしているか」「どのライブラリのどのメソッドか」「なぜそう書いているか」を、ファイルごとに整理した解説です。

---

## 目次

1. [全体の流れ（2パターン）](#1-全体の流れ2パターン)
2. [auth.ts — NextAuth の設定（「受付マニュアル」)](#2-authts--nextauth-の設定受付マニュアル)
3. [Supabase クライアント（サーバー用・ブラウザ用）](#3-supabase-クライアントサーバー用ブラウザ用)
4. [API: 新規登録 `/api/auth/signup`](#4-api-新規登録-apiauthsignup)
5. [API: セッション作成 `/api/auth/create-session`](#5-api-セッション作成-apiauthcreate-session)
6. [NextAuth の窓口 `[...nextauth]`](#6-nextauth-の窓口-nextauth)
7. [画面: ホーム page.tsx（ログイン・新規登録の入口）](#7-画面-ホーム-pagetsxログイン新規登録の入口)
8. [画面: メール確認後 verify-email/page.tsx](#8-画面-メール確認後-verify-emailpagetsx)
9. [型の拡張 types/next-auth.d.ts](#9-型の拡張-typesnext-authdts)
10. [使っているメソッド一覧（ライブラリ別）](#10-使っているメソッド一覧ライブラリ別)
11. [画面上に email / ユーザー名が表示されるまで](#11-画面上に-email--ユーザー名が表示されるまで)

---

## 1. 全体の流れ（2パターン）

### パターンA: メール・パスワードで新規登録 → メール確認あり

```
[ユーザー] モーダルで「新規登録」→ メール・パスワード入力 → 送信
    ↓
[page.tsx] handleEmailAuth(true) → fetch('/api/auth/signup', { email, password })
    ↓
[signup/route.ts] Supabase に「会員登録」依頼 → 確認メール送信
    ↓
[page.tsx] requiresEmailConfirmation なら /verify-email?email=... へリダイレクト
    ↓
[ユーザー] メールのリンクをクリック → Supabase の確認ページ経由で /verify-email#access_token=... に飛ぶ
    ↓
[verify-email/page.tsx] URL の # から access_token を取得
    ↓
[verify-email/page.tsx] supabase.auth.setSession({ access_token, refresh_token }) で「Supabase のログイン状態」をブラウザに持たせる
    ↓
[verify-email/page.tsx] fetch('/api/auth/create-session') で「NextAuth 用の鍵（Cookie）」を発行
    ↓
[create-session/route.ts] NextAuth の JWT を encode して Cookie にセット
    ↓
[verify-email/page.tsx] window.location.href = '/' でホームへ → ログイン状態で表示
```

### パターンB: 既存ユーザーがメール・パスワードでログイン（またはメール確認不要で新規登録直後）

```
[ユーザー] モーダルで「ログイン」→ メール・パスワード入力 → 送信
    ↓
[page.tsx] handleEmailAuth(false) → signIn('credentials', { email, password })
    ↓
[NextAuth] /api/auth/callback/credentials が呼ばれる（内部）
    ↓
[auth.ts] Credentials の authorize() が実行される
    ↓
[auth.ts] supabase.auth.signInWithPassword({ email, password }) で Supabase に「この人、会員か？」と照合
    ↓
[auth.ts] 成功したら { id, email, name, image } を返す → NextAuth が JWT を作り Cookie にセット
    ↓
[page.tsx] ログイン成功 → モーダルを閉じてホームのまま（すでにログイン済み）
```

---

## 2. auth.ts — NextAuth の設定（「受付マニュアル」）

**ファイル:** `auth.ts`  
**役割:** NextAuth の「誰でログインできるか」「ログイン成功後に何をセッションに載せるか」を決める設定ファイル。

### 2.1 Supabase 用クライアント（認証専用）

```ts
function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key);
}
```

- **ライブラリ:** `@supabase/supabase-js` の `createClient`
- **目的:** auth.ts は「サーバー側で Supabase に問い合わせるだけ」なので、Cookie を読まない通常の `createClient` で十分。`lib/supabase/server.ts` は Cookie を扱うので、ここでは別に作っている。
- **なぜここで作るか:** `authorize` は NextAuth が「ログイン試行」のときにだけ呼ぶので、そのときに Supabase に「このメール・パスワード、正しい？」と聞くため。

### 2.2 Credentials プロバイダー（メール・パスワードログイン）

```ts
Credentials({
  name: 'credentials',
  credentials: {
    email: { label: 'メールアドレス', type: 'email' },
    password: { label: 'パスワード', type: 'password' },
  },
  async authorize(credentials) {
    const email = credentials?.email as string | undefined;
    const password = credentials?.password as string | undefined;
    if (!email || !password) return null;
    const supabase = getSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) return null;
    const u = data.user;
    return {
      id: u.id,
      email: u.email ?? undefined,
      name: u.email?.split('@')[0] ?? u.user_metadata?.full_name ?? 'User',
      image: u.user_metadata?.avatar_url ?? undefined,
    } satisfies User;
  },
}),
```

- **ライブラリ:** NextAuth の `next-auth/providers/credentials`
- **メソッド:**
  - **Supabase:** `supabase.auth.signInWithPassword({ email, password })`  
    → 「会員名簿にこのメール・パスワードの人がいるか」を照合。成功すると `data.user` にユーザー情報が入る。
  - **authorize の戻り値:** NextAuth が「この人をログインさせた」とみなす「ユーザーオブジェクト」。`id` が必須で、`email` / `name` / `image` は画面表示用。
- **なぜこう書くか:** 認証の「本体」は Supabase に任せ、NextAuth には「誰がログインしたか」の情報だけ渡す。名前はメールの @ より前を使い、Supabase の `user_metadata` があればそれも使う。

### 2.3 Google プロバイダー（オプション）

```ts
...(googleId && googleSecret
  ? [
      Google({
        clientId: googleId,
        clientSecret: googleSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    ]
  : []),
```

- **ライブラリ:** NextAuth の `next-auth/providers/google`
- **役割:** 環境変数に Google の ID/Secret があれば「Google でログイン」を有効にする。
- **allowDangerousEmailAccountLinking:** 同じメールで「メール・パスワード」と「Google」のアカウントを同一人物として扱うオプション。意図して使っている場合は問題ないが、名前の通り取り扱いには注意。

### 2.4 NextAuth のメイン設定

```ts
export const { handlers, auth } = NextAuth({
  providers,                    // 上で定義した Credentials + Google
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },  // 30日間
  trustHost: true,
  pages: { signIn: '/' },        // ログインが必要なときのリダイレクト先
  callbacks: {
    async jwt({ token, user }) { ... },
    async session({ session, token }) { ... },
  },
});
```

- **ライブラリ:** `next-auth` の `NextAuth`
- **返り値:**
  - **handlers:** GET/POST をまとめたもの。`app/api/auth/[...nextauth]/route.ts` で `GET, POST` として export するために使う。
  - **auth:** サーバー側で「今のセッション」を取るときに使う（このプロジェクトでは主にクライアントの `useSession` を使っている）。
- **session.strategy: 'jwt':** セッションの中身を「サーバーに保存しない」で、署名付きの JWT を Cookie に載せる方式。Supabase と併用しやすく、スケールしやすい。
- **callbacks.jwt:** ログイン成功時、NextAuth が「ユーザー情報」を JWT に載せるときに呼ばれる。ここで `user` の `id` / `email` / `name` / `image` を `token` にコピーしている。
- **callbacks.session:** クライアントが「セッションをください」と言ったときに、JWT の内容を `session.user` に載せて返す。`session.user.id` を使えるようにしている（型は `types/next-auth.d.ts` で拡張）。

---

## 3. Supabase クライアント（サーバー用・ブラウザ用）

### 3.1 サーバー用 `lib/supabase/server.ts`

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // ...
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) { ... },
    },
  });
}
```

- **ライブラリ:** `@supabase/ssr` の `createServerClient`、Next.js の `next/headers` の `cookies`
- **役割:** API Route や Server Component で「今のリクエストに付いている Cookie を読んで、Supabase のセッションとして解釈する」ためのクライアント。メール確認後の `setSession` でブラウザに付いた Supabase の Cookie を、サーバー側でも読めるようにする。
- **なぜサーバー用を分けるか:** ブラウザは `createBrowserClient` で Cookie を自動で送るが、サーバーは Next の `cookies()` で明示的に Cookie を渡してやる必要があるため。

### 3.2 ブラウザ用 `lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // ...
  return createBrowserClient(url, key);
}
```

- **ライブラリ:** `@supabase/ssr` の `createBrowserClient`
- **役割:** ブラウザ（verify-email ページなど）で Supabase を呼ぶとき用。Cookie の送信・保存はブラウザが自動で行う。

---

## 4. API: 新規登録 `/api/auth/signup`

**ファイル:** `app/api/auth/signup/route.ts`  
**役割:** 「このメールとパスワードで会員登録して、必要なら確認メールを送る」という「受付窓口」。

### リクエストの受け取りとバリデーション

```ts
export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { ... };
  if (!email || !password) {
    return NextResponse.json({ error: '...' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '...' }, { status: 400 });
  }
```

- **なぜ API でやるか:** 会員登録は「本社（Supabase）の名簿を触る」操作なので、ブラウザから直接 Supabase を叩かず、自分のサーバー（API）を経由させる。入力チェックもここでまとめてできる。

### Supabase に登録依頼

```ts
const supabase = await createClient();  // lib/supabase/server
const baseUrl = process.env.NEXTAUTH_URL || ...;
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${baseUrl}/verify-email`,
  },
});
```

- **ライブラリ:** Supabase（`createClient` は `@/lib/supabase/server`）
- **メソッド:** `supabase.auth.signUp({ email, password, options })`
  - Supabase が「会員登録」と「確認メール送信」を行う。
  - `emailRedirectTo`: メール内の「確認」リンクをクリックしたあと、ユーザーをどこに戻すか。ここでは `/verify-email` に戻すように指定。
- **返り値:** `data.user` に登録されたユーザー、`data.user.email_confirmed_at` で「メール確認済みか」が分かる（Supabase の設定で確認を必須にしていると `null`）。

### 返却内容

```ts
const requiresEmailConfirmation = data.user.email_confirmed_at === null;
return NextResponse.json({
  ok: true,
  requiresEmailConfirmation,
  email: email,
});
```

- **なぜ requiresEmailConfirmation を返すか:** フロントで「メール確認が必要なら /verify-email に飛ばす」「不要ならその場で signIn する」と分岐するため（page.tsx の handleEmailAuth 参照）。

---

## 5. API: セッション作成 `/api/auth/create-session`

**ファイル:** `app/api/auth/create-session/route.ts`  
**役割:** メール確認後に「Supabase ではもうログイン済み」の状態を、「NextAuth のログイン状態（Cookie）」に変換する窓口。

### CSRF 対策

```ts
const CSRF_HEADER = 'x-csrf-protection';
const csrfHeader = request.headers.get(CSRF_HEADER);
if (csrfHeader !== '1') {
  return NextResponse.json({ error: '不正なリクエストです' }, { status: 403 });
}
```

- **理由:** この API は「ログイン状態を発行する」ので、攻撃者から勝手に呼ばれないようにする。ブラウザの fetch で `headers: { 'x-csrf-protection': '1' }` を付けて呼ぶことで、「自分の画面から意図して呼んだ」と判断する（簡易的な CSRF 対策）。

### Supabase の「今のユーザー」を確認

```ts
const supabase = await createClient();
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return NextResponse.json({ error: '認証セッションが無効です' }, { status: 401 });
}
if (!user.email_confirmed_at) {
  return NextResponse.json({ error: '...' }, { status: 400 });
}
```

- **メソッド:** Supabase の `supabase.auth.getUser()`
  - リクエストに付いている Supabase 用 Cookie から「今ログインしているユーザー」を取得。メール確認後の verify-email ページで `setSession` しているので、その Cookie が付いた状態でこの API が呼ばれる。
- **なぜ email_confirmed_at を見るか:** メール未確認のまま「NextAuth のログイン」だけ作らないようにするため。

### NextAuth の JWT を作って Cookie に載せる

```ts
import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';

const secret = process.env.AUTH_SECRET;
const cookieName = isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token';

const token = await encode({
  token: {
    id: user.id,
    email: user.email ?? undefined,
    name: user.email?.split('@')[0] ?? ...,
    picture: user.user_metadata?.avatar_url ?? undefined,
  },
  secret,
  salt: cookieName,
  maxAge: 30 * 24 * 60 * 60,
});

const cookieStore = await cookies();
cookieStore.set(cookieName, token, {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
});
```

- **ライブラリ:** `next-auth/jwt` の `encode`、`next/headers` の `cookies`
- **encode:** NextAuth が内部で使っているのと同じ形式の「署名付き JWT」を作る。中身は auth.ts の `jwt` コールバックで載せるのと同じユーザー情報。
- **cookieStore.set:** その JWT を「NextAuth が読む Cookie 名」で保存する。これにより、次回以降のリクエストから NextAuth が「この人はログイン済み」と判断する。
- **なぜ自作 API でここをやるか:** メール確認後のログインは「Supabase のリンク → /verify-email」という流れで、NextAuth の通常の「signIn」の流れを通らない。なので「Supabase のユーザー情報から NextAuth 用の JWT を 1 回だけ作って Cookie に置く」処理を、この API で明示的にやっている。

---

## 6. NextAuth の窓口 `[...nextauth]`

**ファイル:** `app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

- **役割:** `/api/auth/*` へのリクエスト（`signin`、`callback`、`signout`、`session` など）をすべて NextAuth に渡す。NextAuth が内部でルートに応じて「ログイン画面」「コールバック」「セッション取得」などを処理する。
- **なぜ GET と POST 両方 export するか:** NextAuth がログイン・コールバック・セッション取得などで GET/POST の両方を使うため。

---

## 7. 画面: ホーム page.tsx（ログイン・新規登録の入口）

**ファイル:** `app/page.tsx`

### セッションの取得

```ts
import { useSession, signIn, signOut } from 'next-auth/react';

const { data: session, status } = useSession();
const isLoggedIn = status === 'authenticated' && !!session?.user;
const userName = session?.user?.name ?? session?.user?.email?.split('@')[0];
```

- **ライブラリ:** `next-auth/react` の `useSession` / `signIn` / `signOut`
- **useSession():** 今の NextAuth のセッション（ログインしていれば `session.user` に id / email / name など）を返す。`SessionProvider` でラップされている必要がある（layout.tsx でラップ済み）。
- **status:** `'loading'` / `'authenticated'` / `'unauthenticated'` のいずれか。ログイン状態の表示切り替えに使う。

### 新規登録の流れ（メール確認あり）

```ts
if (isSignUp) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? '登録に失敗しました' };
  if (json.requiresEmailConfirmation) {
    window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
    return;
  }
  // メール確認が不要な場合はそのままログイン
  const result = await signIn('credentials', { email, password, redirect: false });
  // ...
}
```

- **流れ:** まず「受付」である `/api/auth/signup` に登録依頼。返ってきた `requiresEmailConfirmation` が true なら「確認メールを送った」ので `/verify-email` に飛ばす。false なら（設定でメール確認なしの場合）その場で `signIn('credentials', ...)` してログイン完了。

### ログインの流れ（メール・パスワード）

```ts
const result = await signIn('credentials', {
  email,
  password,
  redirect: false,
});
if (result?.error) {
  return { error: msg };
}
return { successMessage: 'ログインしました' };
```

- **メソッド:** NextAuth の `signIn('credentials', { email, password, redirect: false })`
  - 内部で `/api/auth/callback/credentials` が呼ばれ、auth.ts の `authorize` が実行される。そこで `supabase.auth.signInWithPassword` が呼ばれ、成功すると NextAuth が JWT を発行して Cookie にセットする。
  - `redirect: false` なので、成功・失敗とも同じページに留まり、戻り値でハンドリングする。

### Google ログイン・ログアウト

```ts
const handleGoogleLogin = () => {
  signIn('google', { callbackUrl: '/' });
};
const handleLogout = () => {
  signOut({ callbackUrl: '/' });
};
```

- **signIn('google', ...):** NextAuth の Google プロバイダーに任せる。ブラウザが Google の認証画面に飛び、戻ってきたあと `callbackUrl` にリダイレクトされる。
- **signOut:** NextAuth のセッション（Cookie）を消してから `callbackUrl` へ飛ばす。

---

## 8. 画面: メール確認後 verify-email/page.tsx

**ファイル:** `app/verify-email/page.tsx`

### URL から「認証の証」を取り出す

メールの「確認」リンクは Supabase が発行しており、クリック後は次のような URL でこのページに戻ってきます。

- 例: `https://あなたのサイト/verify-email#access_token=xxx&refresh_token=yyy&type=signup`

`#` 以降は「ハッシュフラグメント」で、サーバーには送られずブラウザの JavaScript だけで読める。

```ts
const hash = window.location.hash;
if (hash && hash.includes('access_token')) {
  handleEmailVerification(hash);
}
```

```ts
const params = new URLSearchParams(hash.substring(1));
const accessToken = params.get('access_token');
const refreshToken = params.get('refresh_token');
const type = params.get('type');

if (!accessToken || (type !== 'signup' && type !== 'recovery')) {
  throw new Error('無効な認証トークンです');
}
```

- **理由:** `type=signup` は「新規登録の確認」、`type=recovery` は「パスワードリセット」。それ以外（例: 悪用）は弾く。

### Supabase に「この人、ログインした」と伝える

```ts
const supabase = createClient();  // lib/supabase/client（ブラウザ用）
const { data: sessionData, error: sessionError } =
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || '',
  });
```

- **ライブラリ:** Supabase（ブラウザ用クライアント）
- **メソッド:** `supabase.auth.setSession({ access_token, refresh_token })`
  - 「この access_token を信頼して、この人をログイン状態にして」と Supabase に伝える。Supabase がブラウザに Cookie をセットするので、以降のリクエストでは「Supabase 的にはログイン済み」になる。
- **なぜここでやるか:** メールのリンクで飛んできた時点では、まだ「Supabase の Cookie」が無い。ここで `setSession` することで、同じタブ内の次の `fetch('/api/auth/create-session')` では、Supabase の Cookie が付いてサーバーに送られる（create-session はサーバー側で `getUser()` するため）。

### NextAuth のセッションを作る

```ts
const res = await fetch('/api/auth/create-session', {
  method: 'POST',
  credentials: 'include',
  headers: { 'x-csrf-protection': '1' },
});
// 成功したら
window.location.href = '/';
```

- **credentials: 'include':** 同じオリジンの Cookie（今セットした Supabase の Cookie）をリクエストに付けて送る。create-session 側で `getUser()` が成功するために必要。
- **x-csrf-protection: '1':** 上で書いた CSRF 対策用ヘッダー。
- **window.location.href = '/':** フルリロードでホームへ。これで NextAuth の Cookie が付いた状態でトップが読み直され、`useSession()` が「ログイン済み」を返す。

### 確認メールの再送

```ts
const { error } = await supabase.auth.resend({
  type: 'signup',
  email,
  options: { emailRedirectTo: `${window.location.origin}/verify-email` },
});
```

- **メソッド:** Supabase の `supabase.auth.resend({ type: 'signup', email, options })`
  - 「このメール宛に、もう一度サインアップ用の確認メールを送って」と依頼する。

---

## 9. 型の拡張 types/next-auth.d.ts

**ファイル:** `types/next-auth.d.ts`

```ts
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}
```

- **目的:** NextAuth の標準の `Session.user` には `id` が含まれないため、`session.user.id` を TypeScript で使えるように型を拡張している。auth.ts の `session` コールバックで `session.user.id = token.id` を入れているので、この型と一致させるため。

---

## 10. 使っているメソッド一覧（ライブラリ別）

### NextAuth（next-auth / next-auth/react）

| 場所 | メソッド・API | 役割 |
|------|----------------|------|
| auth.ts | `NextAuth({ ... })` | プロバイダー・セッション・コールバックの設定 |
| auth.ts | `Credentials({ authorize })` | メール・パスワードでログインするときの「本人確認」処理 |
| auth.ts | `Google({ ... })` | Google ログインの有効化 |
| auth.ts | callbacks `jwt` | ログイン成功時に JWT に載せる内容を決める |
| auth.ts | callbacks `session` | クライアントに返す session.user の内容を決める |
| create-session/route.ts | `encode` (next-auth/jwt) | Supabase ユーザー情報から NextAuth 用 JWT を生成 |
| page.tsx | `useSession()` | 現在のログイン状態・ユーザー情報の取得 |
| page.tsx | `signIn('credentials', { ... })` | メール・パスワードでログイン試行 |
| page.tsx | `signIn('google', { callbackUrl })` | Google ログイン開始 |
| page.tsx | `signOut({ callbackUrl })` | ログアウトして指定 URL へ |
| [...nextauth]/route.ts | `handlers` | GET/POST を NextAuth に渡す |

### Supabase（@supabase/supabase-js, @supabase/ssr）

| 場所 | メソッド・API | 役割 |
|------|----------------|------|
| auth.ts | `createClient(url, key)` | 認証チェック用クライアント（サーバー・Cookie なし） |
| auth.ts | `supabase.auth.signInWithPassword({ email, password })` | メール・パスワードの照合（ログイン） |
| signup/route.ts | `supabase.auth.signUp({ email, password, options })` | 会員登録＋確認メール送信 |
| create-session/route.ts | `supabase.auth.getUser()` | リクエストに付いた Cookie から「今のユーザー」を取得 |
| verify-email/page.tsx | `supabase.auth.setSession({ access_token, refresh_token })` | メール確認後の「Supabase のログイン状態」をブラウザに持たせる |
| verify-email/page.tsx | `supabase.auth.resend({ type, email, options })` | 確認メールの再送 |
| lib/supabase/server.ts | `createServerClient(url, key, { cookies })` | サーバー側で Cookie を読む Supabase クライアント |
| lib/supabase/client.ts | `createBrowserClient(url, key)` | ブラウザ用 Supabase クライアント |

### Next.js

| 場所 | メソッド・API | 役割 |
|------|----------------|------|
| signup/route.ts, create-session/route.ts | `NextResponse.json(...)` | API の JSON 返却 |
| create-session/route.ts | `cookies()` → `cookieStore.set(...)` | レスポンスで Cookie をセットする |
| lib/supabase/server.ts | `cookies()` | リクエストに付いている Cookie の取得 |

---

## 11. 画面上に email / ユーザー名が表示されるまで

「ログインしたあと、ヘッダーにメールやユーザー名がどうやって出るか」を、**いつ・どのファイルのどの関数・どのライブラリのどのメソッドが呼ばれるか**で追います。

### 11.1 たとえ話で全体像

- **鍵（Cookie）** = ログイン成功時に NextAuth が発行する「この人、ログイン済み」というメモ（JWT）。ブラウザが保存し、毎回リクエストに付ける。
- **受付（/api/auth/session）** = クライアントが「今の鍵、誰のもの？」と聞く窓口。鍵を見て「この人です」と返す。
- **useSession()** = クライアント側の「受付に聞いて、結果を React の state で返す」仕組み。

流れはこうなります。

1. ログインが成功すると、NextAuth が **鍵（JWT Cookie）** を発行する（auth.ts の `jwt` コールバックで中身が決まる）。
2. 画面（page.tsx）が **useSession()** を呼ぶ。
3. useSession の内部で **getSession()** が呼ばれ、**GET /api/auth/session** にリクエストが飛ぶ（Cookie 付き）。
4. サーバー側の NextAuth が Cookie から JWT を読む → **auth.ts の session コールバック** で `session.user` に `id` / `email` / `name` / `image` を詰める → JSON で返す。
5. クライアントがその JSON を `session` として受け取り、`session?.user?.name` や `session?.user?.email` を使って **userName** を計算する。
6. その **userName** を Header に渡し、画面上に表示する。

---

### 11.2 ステップ別：どのファイルのどの関数・どのメソッドか

#### ステップ0：ログイン成功まで（鍵が発行されるまで）

- **クライアント**  
  - `app/page.tsx` の `handleEmailAuth` 内で  
    **next-auth/react** の **signIn('credentials', { email, password, redirect: false })** を呼ぶ。
- **サーバー**  
  - リクエストは **GET/POST /api/auth/...** に飛び、**app/api/auth/[...nextauth]/route.ts** の **handlers**（NextAuth ライブラリが処理）に渡る。
  - **auth.ts** の **Credentials の authorize(credentials)** が実行される。
  - その中で **@supabase/supabase-js** の **supabase.auth.signInWithPassword({ email, password })** を呼び、Supabase に本人確認。
  - 成功すると authorize が **{ id, email, name, image }** を返す。
  - NextAuth が **auth.ts の callbacks.jwt({ token, user })** を呼ぶ。ここで **token** に **user.id / user.email / user.name / user.picture** をコピーし、その token を JWT にして **Cookie に書き込む**（鍵が発行される）。

この時点で「誰がログインしたか」の情報は、**Cookie に入った JWT の中** にあります。

---

#### ステップ1：画面が「今のログイン状態」を取得したい

- **クライアント**  
  - **app/page.tsx** の先頭で  
    **next-auth/react** の **useSession()** を呼ぶ。

```ts
const { data: session, status } = useSession();
```

- **useSession() の正体（next-auth ライブラリ）**  
  - **next-auth** の **SessionProvider** 内で、初回マウント時やタブフォーカス時などに  
    **getSession()**（同じく next-auth/react）が呼ばれる。
  - **getSession()** は内部で **fetchData("session", ...)** を呼び、  
    **GET /api/auth/session** に **fetch** する（Cookie はブラウザが自動で付与）。

つまり、**クライアント側で明示的に呼んでいるのは useSession() だけ**で、その裏で getSession() → GET /api/auth/session が行われます。

---

#### ステップ2：サーバーが Cookie を見て「誰か」を返す

- **リクエスト**  
  - **GET /api/auth/session** は **app/api/auth/[...nextauth]/route.ts** の **handlers** で受け、NextAuth ライブラリが処理する。
- **NextAuth の内部**  
  - リクエストヘッダーの **Cookie** から **next-auth.session-token**（または本番では __Secure-...）を読む。
  - その値を **JWT** として検証・デコードし、**token**（id, email, name, picture など）を取り出す。
  - その後、**auth.ts で定義した callbacks.session({ session, token })** が呼ばれる。

- **auth.ts の session コールバック（あなたが書いた設定）**

```ts
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string;
    session.user.email = token.email as string;
    session.user.name = token.name as string;
    session.user.image = token.picture as string | undefined;
  }
  return session;
}
```

- **目的**  
  - JWT の **token** に入っている id / email / name / picture を、クライアントに返す **session.user** に詰め直す。
  - これにより、**session.user.email** や **session.user.name** がクライアントで使えるようになる。

サーバーはこの **session** オブジェクトを JSON でレスポンスし、クライアントの getSession() → useSession() がそれを受け取ります。

---

#### ステップ3：page.tsx で「表示用の名前」を作る

- **ファイル**  
  - **app/page.tsx**
- **コード**

```ts
const { data: session, status } = useSession();
const isLoggedIn = status === 'authenticated' && !!session?.user;
const userName = session?.user?.name ?? session?.user?.email?.split('@')[0];
```

- **意味**  
  - **useSession()** は **next-auth/react** のフック。返り値の **data** が、上で説明した **session**（session.user に id, email, name, image が入っている）。
  - **userName** は「表示用の名前」で、**session.user.name** があればそれを使い、なければ **session.user.email** の @ より前を使う。
  - **auth.ts** の **authorize** で `name: u.email?.split('@')[0] ?? ...` としているので、多くの場合 **session.user.name** にはすでにメールの @ より前が入っており、結果として **email のローカル部分がユーザー名として表示される** 形になる。

ここまでが「どのライブラリのどのメソッドを、クライアント側でどう使っているか」の部分です。

---

#### ステップ4：Header に渡して表示する

- **app/page.tsx** で `<Header ... userName={userName} isLoggedIn={isLoggedIn} />` のように **userName** を渡す。
- **components/header/Header.tsx** で、**isLoggedIn && userName** のときに **{userName}** を表示する。

```tsx
{isLoggedIn && userName ? (
  <span className="...">{userName}</span>
) : (
  ...
)}
```

これで「email が userId のように（またはユーザー名として）画面上に表示される」までの過程がつながります。

---

### 11.3 まとめ：データの流れと役割

| 段階 | どこで | 何が呼ばれるか | 目的 |
|------|--------|----------------|------|
| ログイン時 | auth.ts | authorize → Supabase signInWithPassword | 本人確認し、user 情報を NextAuth に渡す |
| ログイン時 | auth.ts | callbacks.jwt | user を token に載せ、JWT Cookie を発行する |
| 表示時 | page.tsx | useSession()（next-auth/react） | クライアントが「今のセッション」を取得したいと依頼 |
| 表示時 | next-auth 内部 | getSession() → GET /api/auth/session | サーバーに「今の鍵（Cookie）は誰のもの？」と聞く |
| 表示時 | サーバー NextAuth | Cookie から JWT を読む → callbacks.session | token を session.user に詰め、JSON で返す |
| 表示時 | page.tsx | userName = session?.user?.name ?? session?.user?.email?.split('@')[0] | 表示用の名前を決める |
| 表示時 | Header.tsx | props.userName を表示 | 画面上にユーザー名を出す |

- **自動で生成されるもの**  
  - `/api/auth/session` や `/api/auth/callback/credentials` などの**ルートそのもの**は、NextAuth が **app/api/auth/[...nextauth]/route.ts** の handlers 経由で処理しているため、**あなたが callback 用のファイルを用意する必要はありません**。
- **あなたが用意するもの**  
  - **auth.ts**（authorize / jwt / session の内容）、**page.tsx** での **useSession()** の利用と **userName** の計算、**Header** への **userName** の受け渡しと表示。

---

このドキュメントは、コードを読みながら「いまどのライブラリのどのメソッドが動いているか」「なぜこの順番で呼んでいるか」を確認するためのものです。特定の行についてさらに知りたい場合は、ファイル名と行番号を指定してもらえれば、そこに絞った説明もできます。


現在、モーダルからサインイン→メール送信→メールのリンクをクリック→verify-emailページに飛ぶ→何らかの方法でメインページにたどり着く→モーダルからログインとなっています。
次の実装、モーダルからサインイン→メールの送信→verify-emailページに飛ぶ→メールのリンクをクリック→ログインされたメインページに飛ぶ
というのが望ましいです。