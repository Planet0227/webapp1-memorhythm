'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Header from '@/components/header';
import { StudyHistoryList } from '@/components/history';

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user; //同時に満たすか
  const userName = session?.user?.name ?? session?.user?.email?.split('@')[0]; //ユーザー名が無ければメアドの@より前を切り出して表示

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <p className="text-gray-600 dark:text-gray-300">読み込み中...</p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-2xl flex-1 flex flex-col mx-auto">
        <Header
          isLoggedIn={isLoggedIn}
          userName={userName}
          onLogout={() => {
            signOut({ callbackUrl: '/' });
          }}
        />
        <div className="mb-4">
          <Link
            href="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← ホームに戻る
          </Link>
        </div>
        <StudyHistoryList title="学習履歴一覧" />
      </div>
    </main>
  );
}
