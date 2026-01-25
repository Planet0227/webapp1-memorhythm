export default function TipBox() {
  return (
    <div className="mt-6 p-4 bg-linear-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-100 dark:border-blue-800">
      <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
        💡 <strong>エビングハウスの忘却曲線</strong>に基づき、記憶の定着を高めるために最適なタイミングで復習することをお勧めします。最初の復習は24時間以内に行うと効果的です。
      </p>
    </div>
  );
}
