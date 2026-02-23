'use client';

import HeaderMenu from './HeaderMenu';

interface HeaderProps {
  onLoginClick?: () => void;
  onSettingsClick?: () => void;
  isLoggedIn?: boolean;
  userName?: string;
  onLogout?: () => void;
}

export default function Header({
  onLoginClick,
  onSettingsClick,
  isLoggedIn = false,
  userName,
  onLogout,
}: HeaderProps) {
  const moreMenuItems = [
    {
      label: '使い方',
      onClick: () => {
        document
          .getElementById('how-to-use')
          ?.scrollIntoView({ behavior: 'smooth' });
      },

      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'プライバシーポリシー',
      onClick: () => {
        // TODO: プライバシーポリシーページ
        console.log('Privacy policy');
      },
    },
    {
      label: '利用規約',
      onClick: () => {
        // TODO: 利用規約ページ
        console.log('Terms of service');
      },
    },
  ];

  if (isLoggedIn) {
    moreMenuItems.unshift({
      label: 'ログアウト',
      onClick: onLogout || (() => { }),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
    });
  }

  return (
    <header className="relative z-10 mb-8">
      <div className="flex items-center justify-between">
        {/* 左側: ロゴ */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Memorhythm
          </h1>
        </div>

        {/* 右側: 設定、ユーザーネーム/ログイン、その他メニュー */}
        <div className="flex items-center gap-2">
          {/* 設定ボタン */}
          {onSettingsClick && (
            <div className="relative group">
              <button
                onClick={onSettingsClick}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:cursor-pointer"
                aria-label="設定"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-200 dark:text-gray-900 whitespace-nowrap">
                設定
              </span>
            </div>
          )}


          {/* 学習履歴ボタン（ログイン時のみ） */}
          {isLoggedIn && (
            <div className="relative group">
              <button
                onClick={() => {
                  window.location.assign('/history');
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:cursor-pointer"
                aria-label="学習履歴"
                title="学習履歴"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
              <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-200 dark:text-gray-900 whitespace-nowrap">
                学習履歴
              </span>
            </div>
          )}

          {/* ユーザーネーム（ログイン時）またはログインボタン（未ログイン時） */}
          {isLoggedIn && userName ? (
            <span className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 ">
              {userName}
            </span>
          ) : (
            onLoginClick && (
              <button
                onClick={onLoginClick}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:cursor-pointer"
              >
                ログイン
              </button>
            )
          )}

          {/* その他メニュー（"…"ボタン） */}
          <div className='relative group'>
            <HeaderMenu
              items={moreMenuItems}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              }
              ariaLabel="その他メニュー"
            />
            <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-200 dark:text-gray-900 whitespace-nowrap">
              その他
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
