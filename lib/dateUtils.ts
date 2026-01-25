// 復習日を計算する関数
export function calculateReviewDates(startDate: Date, intervals: readonly number[]): Date[] {
  return intervals.map(days => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
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
  
  // 今日かどうか
  // if (date.toDateString() === today.toDateString()) {
  //   return '今日';
  // }
  
  // 明日かどうか
  // if (date.toDateString() === tomorrow.toDateString()) {
  //   return '明日';
  // }
  
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
