'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/header';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // URLパラメータからメールアドレスを取得
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    // ハッシュフラグメント（#access_token=...）をチェック
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      handleEmailVerification(hash);
    }
  }, [searchParams]);

  const handleEmailVerification = async (hash: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      // ハッシュからトークンを抽出
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (!accessToken || type !== 'signup') {
        throw new Error('無効な認証トークンです');
      }

      // Supabaseクライアントでセッションを確立
      const supabase = createClient();
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

      if (sessionError || !sessionData.user) {
        throw new Error('認証に失敗しました');
      }

      const user = sessionData.user;

      // メールアドレスが確認されているかチェック
      if (!user.email_confirmed_at) {
        throw new Error('メールアドレスがまだ確認されていません');
      }

      // Supabaseのセッションからユーザー情報を取得してNextAuthでログイン
      // パスワードは不要なので、一時的なトークンを使ってログイン
      // 実際には、Supabaseのセッションが確立されているので、
      // そのユーザー情報を使ってNextAuthのセッションを作成する必要がある

      // SupabaseのセッションからNextAuthのセッションを作成
      // パスワードなしでログインするため、カスタムAPIエンドポイントを使用
      const res = await fetch('/api/auth/create-session', {
        method: 'POST',
        credentials: 'include', // Cookieを含める
      });

      const json = (await res.json()) as {
        error?: string;
        ok?: boolean;
        user?: { id: string; email: string; name: string };
      };
      if (!res.ok || json.error) {
        throw new Error(json.error ?? 'ログインに失敗しました');
      }

      // セッション作成成功後、ページをリロードしてNextAuthのセッションを確認
      // 実際には、NextAuthのセッションCookieが設定されているので、ページをリロードすればログイン状態になる
      window.location.href = '/';
    } catch (e) {
      console.error('Email verification error', e);
      setError(
        e instanceof Error ? e.message : 'メール認証中にエラーが発生しました'
      );
      setIsVerifying(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-2xl flex-1 flex flex-col mx-auto">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            <div className="text-center space-y-6">
              {isVerifying ? (
                <>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    メールアドレスを確認中...
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    認証を処理しています。少々お待ちください。
                  </p>
                </>
              ) : error ? (
                <>
                  <div className="flex justify-center text-red-500">
                    <svg
                      className="w-16 h-16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
                    認証エラー
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{error}</p>
                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    ホームに戻る
                  </button>
                </>
              ) : (
                <>
                  <div className="flex justify-center text-blue-500">
                    <svg
                      className="w-16 h-16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    確認メールを送信しました
                  </h2>
                  <div className="space-y-4 text-left max-w-md mx-auto">
                    <p className="text-gray-600 dark:text-gray-400">
                      {email ? (
                        <>
                          <span className="font-semibold">{email}</span>
                          に確認メールを送信しました。
                        </>
                      ) : (
                        '確認メールを送信しました。'
                      )}
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-semibold mb-2">次の手順：</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>メールボックスを確認してください</li>
                        <li>メール内の「確認」リンクをクリックしてください</li>
                        <li>自動的にログイン状態になります</li>
                      </ol>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      メールが届かない場合は、迷惑メールフォルダもご確認ください。
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
