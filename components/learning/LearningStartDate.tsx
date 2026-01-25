import { formatDate } from '../../lib/dateUtils';

interface LearningStartDateProps {
  date: Date;
}

export default function LearningStartDate({ date }: LearningStartDateProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">学習開始日</p>
      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formatDate(date)}</p>
    </div>
  );
}
