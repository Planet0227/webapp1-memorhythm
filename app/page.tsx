'use client';

import { useState, type FormEventHandler } from 'react';
import Header from '../components/header';
import { LoginModal } from '../components/auth';
import { LearningInputForm, LearningStartDate, LearningContentDisplay } from '../components/learning';
import { ReviewSchedule } from '../components/review';
import { ResetButton, TipBox } from '../components/common';
import { ForgettingCurveExplanation } from '../components/explanation';
import { calculateReviewDates } from '../lib/dateUtils';
import { REVIEW_INTERVALS } from '../lib/constants';

export default function Home() {
  const [learningContent, setLearningContent] = useState('');
  const [reviewDates, setReviewDates] = useState<Date[] | null>(null);
  const [learningStartDate, setLearningStartDate] = useState<Date | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const hasResult = Boolean(reviewDates);

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

  const handleEmailLogin = async (email: string, password: string) => {
    // TODO: 認証実装
    console.log('Email login:', email);
    setIsLoggedIn(true);
    setUserName(email.split('@')[0]);
    setIsLoginModalOpen(false);
  };

  const handleGoogleLogin = async () => {
    // TODO: Google認証実装
    console.log('Google login');
    setIsLoggedIn(true);
    setUserName('User');
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName(undefined);
    handleReset();
  };

  const handleSettingsClick = () => {
    // TODO: 設定モーダルまたはページを表示
    console.log('Settings clicked');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-2xl">
        <Header
          onLoginClick={() => setIsLoginModalOpen(true)}
          onSettingsClick={handleSettingsClick}
          isLoggedIn={isLoggedIn}
          userName={userName}
          onLogout={handleLogout}
        />

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onEmailLogin={handleEmailLogin}
          onGoogleLogin={handleGoogleLogin}
        />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          {!hasResult ? (
            <LearningInputForm
              value={learningContent}
              onChange={setLearningContent}
              onSubmit={handleSubmit}
            />
          ) : (
            <div className="space-y-6">
              {learningStartDate && <LearningStartDate date={learningStartDate} />}
              <LearningContentDisplay content={learningContent} />

              {reviewDates && <ReviewSchedule reviewDates={reviewDates} />}

              <ResetButton onClick={handleReset} />

              <TipBox />
            </div>
          )}
        </div>

        <ForgettingCurveExplanation />
      </div>
    </main>
  );
}
