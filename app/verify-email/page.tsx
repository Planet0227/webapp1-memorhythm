'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/header';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasStartedVerification = useRef(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Supabase のメールリンクは環境や設定で以下の形式があり得る:
  // - #access_token=...&refresh_token=...
  // - ?token_hash=...&type=signup
  // - ?code=...
  // どの形式でもこのページで受けて自動ログインまで完了させる。
  const handleEmailVerification = useCallback(async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash
      );
      const queryParams = new URLSearchParams(
        window.location.search.startsWith('?')
          ? window.location.search.substring(1)
          : window.location.search
      );
      const getParam = (key: string) => hashParams.get(key) ?? queryParams.get(key);
      const accessToken = getParam('access_token');
      const refreshToken = getParam('refresh_token');
      const tokenHash = getParam('token_hash');
      const type = getParam('type');
      const code = getParam('code');

      if (accessToken) {
        const supabase = createClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        if (sessionError) {
          throw new Error(sessionError.message);
        }
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('認証に失敗しました');
        }
        if (!user.email_confirmed_at) {
          throw new Error('メールアドレスがまだ確認されていません');
        }
      } else if (code || (tokenHash && type)) {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            tokenHash,
            type,
          }),
        });

        const json = (await res.json()) as {
          error?: string;
          ok?: boolean;
          user?: { id: string; email: string };
        };
        if (!res.ok || json.error) {
          throw new Error(json.error ?? 'メール認証に失敗しました');
        }
      } else {
        throw new Error('認証トークンが見つかりませんでした');
      }

      // SupabaseのセッションからNextAuthのセッションを作成
      // CSRF 対策用のカスタムヘッダーを含める
      const res = await fetch('/api/auth/create-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-csrf-protection': '1',
        },
      });

      const json = (await res.json()) as {
        error?: string;
        ok?: boolean;
        user?: { id: string; email: string; name: string };
      };
      if (!res.ok || json.error) {
        throw new Error(json.error ?? 'ログインに失敗しました');
      }

      // セッション作成成功後、トップページへ遷移
      window.location.href = '/';
    } catch (e) {
      console.error('Email verification error', e);
      setError(
        e instanceof Error ? e.message : 'メール認証中にエラーが発生しました'
      );
      setIsVerifying(false);
    }
  }, []);

  // 確認メールの再送処理
  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    setResendMessage(null);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setResendMessage('確認メールを再送しました。メールボックスをご確認ください。');
    } catch (e) {
      console.error('Resend email error', e);
      setError(
        e instanceof Error ? e.message : 'メールの再送に失敗しました'
      );
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    // URLパラメータからメールアドレスを取得
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    if (hasStartedVerification.current) {
      return;
    }

    // ハッシュフラグメント（#access_token=...）または
    // クエリパラメータ（?access_token=..., ?token_hash=..., ?code=...）をチェック
    const hash = window.location.hash;
    const hasHashToken =
      hash.includes('access_token=') || hash.includes('token_hash=');
    const hasQueryToken =
      searchParams.has('access_token') ||
      searchParams.has('token_hash') ||
      searchParams.has('code');

    if (hasHashToken || hasQueryToken) {
      hasStartedVerification.current = true;
      void handleEmailVerification();
    }
  }, [searchParams, handleEmailVerification]);

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
                    {resendMessage && (
                      <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                        {resendMessage}
                      </div>
                    )}
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
                    {email && (
                      <button
                        onClick={handleResendEmail}
                        disabled={isResending}
                        className="w-full px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isResending ? '送信中...' : '確認メールを再送する'}
                      </button>
                    )}
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
