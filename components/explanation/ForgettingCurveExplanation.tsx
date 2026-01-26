'use client';

export default function ForgettingCurveExplanation() {

  const dataPoints = [
    { days: 0, retention: 100 },
    { days: 0.014, retention: 58 }, // 約20分後
    { days: 1, retention: 34 },
    { days: 3, retention: 27 },
    { days: 7, retention: 23 },
    { days: 30, retention: 21 },
  ];

  // グラフのサイズ
  const width = 600;
  const height = 320;
  const padding = { top: 20, right: 40, bottom: 50, left: 60 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // スケール関数
  const maxDays = 30;
  const scaleX = (days: number) => (days / maxDays) * graphWidth;
  const scaleY = (retention: number) => graphHeight - (retention / 100) * graphHeight;

  // 忘却曲線のパスを生成
  const generatePath = (points: typeof dataPoints) => {
    return points
      .map((point, index) => {
        const x = scaleX(point.days) + padding.left;
        const y = scaleY(point.retention) + padding.top;
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(' ');
  };

  const forgettingPath = generatePath(dataPoints);

  return (
    <section className="mt-16 mb-8">

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800 mb-6" id="how-to-use">
          <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            ✅ Memorhythmの使い方
          </h3>
          <p className="leading-relaxed">
            学習内容を入力すると、エビングハウスの忘却曲線に基づいて最適な復習タイミングを自動計算します。
            推奨された日付に復習することで、効率的に記憶を定着させることができます。
          </p>
        </div>
        <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          エビングハウスの忘却曲線とは？
        </h2>

        <div className="space-y-6 text-gray-700 dark:text-gray-300">
          <p className="leading-relaxed">
            エビングハウスの忘却曲線は、19世紀の心理学者ヘルマン・エビングハウスが発見した、時間の経過と節約率の関係を示す理論です。
          </p>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-6 border-2 border-orange-200 dark:border-orange-800">
            <h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-200 flex items-center gap-2">
              ⚠️ 重要な注意事項
            </h3>
            <p className="text-sm leading-relaxed text-orange-800 dark:text-orange-300">
              この忘却曲線は、エビングハウスが「意味を持たない音節の記憶」、つまり<strong>理解を伴わない単純暗記</strong>を行った場合の実験結果に基づいています。
              実際の学習では、理解を伴う学習や既存知識との関連付けにより、記憶の定着率は個人差があり、この曲線とは異なる場合があります。
              本アプリで提示される復習タイミングは<strong>あくまで参考値</strong>としてご活用ください。
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 border border-yellow-100 dark:border-yellow-800">
            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
              📐 節約率とは？
            </h3>
            <p className="leading-relaxed mb-3">
              節約率は、復習にかかる時間が初回学習と比べてどれだけ短縮できたかを示す指標です。
            </p>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-3">
              <p className="font-mono text-sm mb-2">
                節約率 = (初回で要した時間 - 復習に要した時間) / 初回で要した時間
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                例：初回で10分、復習で7分かかった場合
                <br />
                (10 - 7) / 10 = 0.3 = <strong>30%の節約率</strong>
              </p>
            </div>
            <p className="text-sm leading-relaxed">
              つまり、節約率が高いほど、復習に必要な時間が少なく、記憶が定着していることを意味します。
            </p>
          </div>

          {/* グラフ */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                節約率の推移
              </h3>
              <svg
                width={width}
                height={height}
                className="w-full h-auto"
                viewBox={`0 0 ${width} ${height}`}
              >
                <rect
                  width={graphWidth}
                  height={graphHeight}
                  x={padding.left}
                  y={padding.top}
                  fill="url(#grid)"
                />

                {/* Y軸（節約率） */}
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={padding.left}
                  y2={padding.top + graphHeight}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-400 dark:text-gray-600"
                />
                {[0, 25, 50, 75, 100].map((value) => (
                  <g key={value}>
                    <line
                      x1={padding.left - 5}
                      y1={scaleY(value) + padding.top}
                      x2={padding.left}
                      y2={scaleY(value) + padding.top}
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-400 dark:text-gray-600"
                    />
                    <text
                      x={padding.left - 10}
                      y={scaleY(value) + padding.top + 4}
                      textAnchor="end"
                      className="text-xs fill-gray-600 dark:fill-gray-400"
                    >
                      {value}
                    </text>
                  </g>
                ))}

                {/* X軸（時間） */}
                <line
                  x1={padding.left}
                  y1={padding.top + graphHeight}
                  x2={padding.left + graphWidth}
                  y2={padding.top + graphHeight}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-400 dark:text-gray-600"
                />
                {/* 1日、3日、7日、30日の目盛り */}
                {[
                  { days: 0, label: '0' },
                  { days: 1, label: '1' },
                  { days: 3, label: '3' },
                  { days: 7, label: '7' },
                  { days: 30, label: '30' },
                ].map(({ days, label }) => (
                  <g key={days}>
                    <line
                      x1={scaleX(days) + padding.left}
                      y1={padding.top + graphHeight}
                      x2={scaleX(days) + padding.left}
                      y2={padding.top + graphHeight + 5}
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-400 dark:text-gray-600"
                    />
                    <text
                      x={scaleX(days) + padding.left}
                      y={padding.top + graphHeight + 18}
                      textAnchor="middle"
                      className="text-xs fill-gray-600 dark:fill-gray-400"
                    >
                      {label}
                    </text>
                  </g>
                ))}

                {/* 忘却曲線 */}
                <path
                  d={forgettingPath}
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>

                {/* データポイント */}
                {dataPoints.map((point, index) => (
                  <g key={index}>
                    <circle
                      cx={scaleX(point.days) + padding.left}
                      cy={scaleY(point.retention) + padding.top}
                      r="5"
                      fill="#3b82f6"
                      className="dark:fill-blue-400"
                    />

                  </g>
                ))}

                {/* ラベル */}
                <text
                  x={width / 2}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-sm fill-gray-600 dark:fill-gray-400 font-medium"
                >
                  経過時間（日）
                </text>
                <text
                  x={20}
                  y={height / 2}
                  textAnchor="middle"
                  transform={`rotate(-90, 20, ${height / 2})`}
                  className="text-sm fill-gray-600 dark:fill-gray-400 font-medium"
                >
                  節約率（%）
                </text>
              </svg>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800">
            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
              💡 間隔反復（Spaced Repetition）の効果
            </h3>
            <p className="leading-relaxed mb-3">
              適切なタイミングで復習することで、節約率が再び高くなります。これを「間隔反復（Spaced Repetition）」と呼びます。
              復習を繰り返すことで、節約率の減少が緩やかになり、記憶が長期にわたって定着します。
            </p>
          </div>


        </div>
      </div>
    </section>
  );
}
