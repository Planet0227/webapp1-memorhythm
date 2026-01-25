import type { FormEventHandler } from 'react';

interface LearningInputFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function LearningInputForm({
  value,
  onChange,
  onSubmit,
}: LearningInputFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          学習内容を入力してください
        </label>
        <input
          id="content"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例: JavaScriptの基本構文"
          className="w-full px-4 py-3 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all"
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={!value.trim()}
        className="w-full py-3 px-6 bg-linear-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
      >
        復習日を計算
      </button>
    </form>
  );
}
