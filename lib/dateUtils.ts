// 復習日を計算する関数
export function calculateReviewDates(startDate: Date, intervals: readonly number[]): Date[] {
  return intervals.map(day => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day); //学習開始日の日付を抽出し、復習ペースを足す
    return date;
  });
}

// 日付をフォーマットする関数
export function formatDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 曜日を取得
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  
  return `${year}年${month}月${day}日（${weekday}）`;
}

// 日付までの日数を計算
export function getDaysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// 学習開始日と復習間隔から、次に来る復習日を取得
export function getNextReviewDate(
  startDate: Date,
  intervals: readonly number[],
  now: Date = new Date()
): Date | null {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0); //日付情報だけするために午前0時0分0秒0ミリ秒に書き換え

  // 一番近い復習日を算出
  const reviewDates = calculateReviewDates(startDate, intervals); //４日分の復習日を格納
  for (const reviewDate of reviewDates) {
    const reviewDay = new Date(reviewDate);
    reviewDay.setHours(0, 0, 0, 0);
    if (reviewDay.getTime() >= today.getTime()) {
      return reviewDate;
    }
  }

  return null;
}
