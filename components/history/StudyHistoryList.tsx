'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type LearningRecord = {
  id: string;
  content: string;
  learningStartedAt: string;
  createdAt: string;
  nextReviewAt: string | null;
};

type StudyHistoryListProps = {
  limit?: number;
  showViewAllLink?: boolean;
  title?: string;
};

function formatJstDate(dateString: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(dateString));
}

export default function StudyHistoryList({
  limit,
  showViewAllLink = false,
  title = '学習履歴',
}: StudyHistoryListProps) {
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams(); //URLのクエリ文字列を操作するjs標準オブジェクト
    if (limit) {
      params.set('limit', String(limit));  //limitを受け取り文字列に変えてparams内に保有
    }
    const query = params.toString(); //URL用のテキストに変換
    return `/api/learning-records${query ? `?${query}` : ''}`;
  }, [limit]);

  useEffect(() => {
    let isMounted = true;  //このコンポーネント自体が表示されているか確認。

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        //urlのlimitに与えられた数値の件数だけデータを取得する
        const res = await fetch(apiUrl, { cache: 'no-store' });
        const json = (await res.json()) as {
          error?: string;
          ok?: boolean;
          records?: LearningRecord[];
        };

        if (!res.ok || !json.ok || !json.records) {
          if (!isMounted) return; 
          setError(json.error ?? '学習履歴の取得に失敗しました。');
          setRecords([]);
          return;
        }
        if (!isMounted) return;

        setRecords(json.records);
      } catch {
        if (!isMounted) return;
        setError('通信エラーにより履歴を取得できませんでした。');
        setRecords([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    //非同期関数の実行結果（Promise）を、待機せず意図的に無視する
    void load();
    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {showViewAllLink && (
          <Link
            href="/history"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            すべて見る
          </Link>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && (
          <p className="text-sm text-gray-600 dark:text-gray-400">読み込み中...</p>
        )}

        {!isLoading && error && (
          <div className="rounded-xl px-4 py-3 text-sm border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!isLoading && !error && records.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            学習履歴はありません。
          </p>
        )}

        {!isLoading &&
          !error &&
          records.map((record) => (
            <article
              key={record.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40"
            >
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {record.content}
              </p>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>学習開始日: {formatJstDate(record.learningStartedAt)}</p>
                <p>
                  次の復習日:{' '}
                  {record.nextReviewAt
                    ? formatJstDate(record.nextReviewAt)
                    : '予定なし（最終復習日を経過）'}
                </p>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
