import ReviewDateCard from './ReviewDateCard';
import { REVIEW_INTERVALS } from '../../lib/constants';

interface ReviewScheduleProps {
  reviewDates: Date[];
}

export default function ReviewSchedule({ reviewDates }: ReviewScheduleProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        推奨復習スケジュール
      </h2>
      <div className="space-y-3">
        {reviewDates.map((date, index) => {
          const interval = REVIEW_INTERVALS[index];
          const isNext = index === 0;
          
          return (
            <ReviewDateCard
              key={index}
              date={date}
              interval={interval}
              isNext={isNext}
            />
          );
        })}
      </div>
    </div>
  );
}
