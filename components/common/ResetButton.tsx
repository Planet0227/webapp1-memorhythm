interface ResetButtonProps {
  onClick: () => void;
}

export default function ResetButton({ onClick }: ResetButtonProps) {
  return (
    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onClick}
        className="w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
      >
        新しい学習内容を入力
      </button>
    </div>
  );
}
