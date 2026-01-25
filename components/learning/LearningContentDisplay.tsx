interface LearningContentDisplayProps {
  content: string;
}

export default function LearningContentDisplay({ content }: LearningContentDisplayProps) {
  return (
    <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-blue-100 dark:border-gray-600">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">学習内容</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{content}</p>
    </div>
  );
}
