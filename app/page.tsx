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
import { StudyHistoryList } from '../components/history';
import { calculateReviewDates } from '../lib/dateUtils';
import { REVIEW_INTERVALS } from '../lib/constants';

type SaveStatus = {
  type: 'success' | 'error' | 'info';
  message: string;
};

export default function Home() {
  //　セッション情報
  const { data: session, status } = useSession(); //auth.tsのsessionで整えたオブジェクトを取得
  const searchParams = useSearchParams();
  const isEmailConfirmed = searchParams.get('emailConfirmed') === 'true';
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(isEmailConfirmed);
  const isLoggedIn = status === 'authenticated' && !!session?.user;
  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0];
  const [emailConfirmedMessage, setEmailConfirmedMessage] = useState<string | null>(
    isEmailConfirmed ? 'メールアドレスが確認されました。ログインしてください。' : null
  );
  
  //  学習情報
  const [learningStartDate, setLearningStartDate] = useState<Date | null>(null);
  const [learningContent, setLearningContent] = useState('');
  const [reviewDates, setReviewDates] = useState<Date[] | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const hasResult = Boolean(reviewDates);

  // メール確認後のリダイレクトを検知
  useEffect(() => {
    if (isEmailConfirmed) {
      // URLからクエリパラメータを削除
      window.history.replaceState({}, '', '/');
    }
  }, [isEmailConfirmed]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const trimmedContent = learningContent.trim();
    if (!trimmedContent) return;

    setSaveStatus(null);

    const startDate = new Date();
    const dates = calculateReviewDates(startDate, REVIEW_INTERVALS);
    setReviewDates(dates);
    setLearningStartDate(startDate);

    if (!isLoggedIn || !session?.user?.id) {
      setSaveStatus({
        type: 'info',
        message: 'ログインすると学習内容をアカウントに保存できます。',
      });
      return;
    }

    try {
      const res = await fetch('/api/learning-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmedContent,
          learningStartedAt: startDate.toISOString(), //日付の形式を標準にして渡す
        }),
      });
      const json = (await res.json()) as { error?: string; ok?: boolean; recordId?: string; };

      if (!res.ok || !json.ok) {
        setSaveStatus({
          type: 'error',
          message: json.error ?? '学習内容の保存に失敗しました。',
        });
        return;
      }

      setSaveStatus({
        type: 'success',
        message: '学習内容を保存しました。',
      });
    } catch (error) {
      console.error('learning-record save error', error);
      setSaveStatus({
        type: 'error',
        message: '通信エラーにより保存できませんでした。',
      });
    }
  };

  const handleReset = () => {
    setLearningContent('');
    setReviewDates(null);
    setLearningStartDate(null);
    setSaveStatus(null);
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

      // requiresEmailConfirmation が未定義でも安全側（認証必須）に倒す。
      const requiresEmailConfirmation = json.requiresEmailConfirmation !== false;
      if (requiresEmailConfirmation) {
        // 確認メール送信後の案内ページへ
        window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
        return; // リダイレクトするのでここでは何も返さない
      }

      // メール認証が不要な場合はそのまま NextAuth でログイン
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
      const msg =
        result.error === 'CredentialsSignin'
          ? 'メールアドレス,パスワードが正しくありません。または、確認メールのリンクをクリックしてメールアドレスを確認してください。'
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
          {isLoggedIn && (
            <div className="w-full max-w-2xl mx-auto mt-6">
              <StudyHistoryList limit={5} showViewAllLink title="最近の学習履歴" />
            </div>
          )}
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
              {saveStatus && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm border ${
                    saveStatus.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                      : saveStatus.type === 'info'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  }`}
                >
                  {saveStatus.message}
                </div>
              )}

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
