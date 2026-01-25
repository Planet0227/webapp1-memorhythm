import { formatDate, getDaysUntil } from '../../lib/dateUtils';

interface ReviewDateCardProps {
  date: Date;
  interval: number;
  isNext: boolean;
}

export default function ReviewDateCard({ date, interval, isNext }: ReviewDateCardProps) {
  const days = getDaysUntil(date);

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        isNext
          ? 'bg-linear-to-r from-blue-500 to-purple-500 text-white border-transparent shadow-lg transform scale-[1.02]'
          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isNext && (
              <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                次の復習
              </span>
            )}
            <span className={`text-sm font-medium ${isNext ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
            {interval === 1 ? '明日' : `${interval}日後`}
            </span>
          </div>
          <p className={`font-semibold ${isNext ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
            {formatDate(date)}
          </p>
          {days > 0 && (
            <p className={`text-xs mt-1 ${isNext ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
              あと {days} 日
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
