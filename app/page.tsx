'use client';

import { useState, useEffect, type FormEventHandler } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/header';
import { LoginModal, type EmailAuthResult } from '../components/auth';
import { LearningInputForm, LearningStartDate, LearningContentDisplay } from '../components/learning';
import { ReviewSchedule } from '../components/review';
import { ResetButton, TipBox } from '../components/common';
import { ForgettingCurveExplanation } from '../components/explanation';
import { calculateReviewDates } from '../lib/dateUtils';
import { REVIEW_INTERVALS } from '../lib/constants';

export default function Home() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [learningContent, setLearningContent] = useState('');
  const [reviewDates, setReviewDates] = useState<Date[] | null>(null);
  const [learningStartDate, setLearningStartDate] = useState<Date | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [emailConfirmedMessage, setEmailConfirmedMessage] = useState<string | null>(null);
  const hasResult = Boolean(reviewDates);
  const isLoggedIn = status === 'authenticated' && !!session?.user;
  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0];

  // メール確認後のリダイレクトを検知
  useEffect(() => {
    if (searchParams.get('emailConfirmed') === 'true') {
      setEmailConfirmedMessage('メールアドレスが確認されました。ログインしてください。');
      setIsLoginModalOpen(true);
      // URLからクエリパラメータを削除
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (learningContent.trim()) {
      const startDate = new Date();
      const dates = calculateReviewDates(startDate, REVIEW_INTERVALS);
      setReviewDates(dates);
      setLearningStartDate(startDate);
    }
  };

  const handleReset = () => {
    setLearningContent('');
    setReviewDates(null);
    setLearningStartDate(null);
  };

  const handleEmailAuth = async (
    email: string,
    password: string,
    isSignUp: boolean
  ): Promise<EmailAuthResult> => {
    if (isSignUp) {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as {
        error?: string;
        ok?: boolean;
        email?: string;
        requiresEmailConfirmation?: boolean;
      };
      if (!res.ok) return { error: json.error ?? '登録に失敗しました' };
      // 新規登録成功時は認証待ちページにリダイレクト
      if (json.requiresEmailConfirmation) {
        window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
        return; // リダイレクトするので何も返さない
      }
      // メール確認が不要な場合はそのままログイン
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        return { error: 'ログインに失敗しました' };
      }
      return { successMessage: '登録が完了しました' };
    }
    // ログイン処理
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      // メール未確認の場合のエラーメッセージを改善
      let msg =
        result.error === 'CredentialsSignin'
          ? 'メールアドレスまたはパスワードが正しくありません。確認メールのリンクをクリックしてメールアドレスを確認しましたか？'
          : result.error;
      return { error: msg };
    }
    // ログイン成功
    return { successMessage: 'ログインしました' };
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/' });
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
    handleReset();
  };

  const handleSettingsClick = () => {
    // TODO: 設定モーダルまたはページを表示
    console.log('Settings clicked');
  };

  return (
    <main className="min-h-screen flex flex-col bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setEmailConfirmedMessage(null);
        }}
        onEmailAuth={handleEmailAuth}
        onGoogleLogin={handleGoogleLogin}
        initialMessage={emailConfirmedMessage}
      />

      {!hasResult ? (
        <>
          {/* ChatGPT風: ビューポート高さのブロックでフォームを画面中央に */}
          <div className="min-h-dvh flex flex-col w-full max-w-2xl mx-auto">
            <Header
              onLoginClick={() => setIsLoginModalOpen(true)}
              onSettingsClick={handleSettingsClick}
              isLoggedIn={isLoggedIn}
              userName={userName}
              onLogout={handleLogout}
            />
            <section className="flex-1 flex items-center justify-center -mt-16">
              <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                <LearningInputForm
                  value={learningContent}
                  onChange={setLearningContent}
                  onSubmit={handleSubmit}
                />
              </div>
            </section>
          </div>
          <div className="w-full max-w-2xl mx-auto">
            <ForgettingCurveExplanation />
          </div>
        </>
      ) : (
        <div className="w-full max-w-2xl flex-1 flex flex-col mx-auto">
          <Header
            onLoginClick={() => setIsLoginModalOpen(true)}
            onSettingsClick={handleSettingsClick}
            isLoggedIn={isLoggedIn}
            userName={userName}
            onLogout={handleLogout}
          />
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            <div className="space-y-6">
              {learningStartDate && <LearningStartDate date={learningStartDate} />}
              <LearningContentDisplay content={learningContent} />

              {reviewDates && <ReviewSchedule reviewDates={reviewDates} />}

              <ResetButton onClick={handleReset} />

              <TipBox />
            </div>
          </div>
          <ForgettingCurveExplanation />
        </div>
      )}
    </main>
  );
}
