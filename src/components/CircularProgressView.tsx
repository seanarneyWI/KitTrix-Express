import React from 'react';

interface CircularProgressViewProps {
  completedKits: number;
  totalKits: number;
  currentElapsedKitTime: number; // in seconds
  expectedKitDuration: number; // in seconds
  performanceStatus: 'AHEAD' | 'ON_TRACK' | 'BEHIND'; // Kit performance
  jobPerformanceStatus?: 'AHEAD' | 'ON_TRACK' | 'BEHIND'; // Overall job performance
  isPaused: boolean;
  jobNumber: string;
  customerName: string;
  description: string;
}

const CircularProgressView: React.FC<CircularProgressViewProps> = ({
  completedKits,
  totalKits,
  currentElapsedKitTime,
  expectedKitDuration,
  performanceStatus,
  jobPerformanceStatus,
  isPaused,
  jobNumber,
  customerName,
  description
}) => {
  // SVG dimensions
  const size = 800;
  const center = size / 2;

  // Ring specifications
  const outerRadius = 360;
  const outerStrokeWidth = 70;
  const innerRadius = 240;
  const innerStrokeWidth = 200;

  // Calculate circumferences
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  // Calculate job progress (inner pie) - fills clockwise as kits complete
  const jobProgressPercent = totalKits > 0 ? (completedKits / totalKits) : 0;
  const jobProgressOffset = innerCircumference * (1 - jobProgressPercent);

  // Calculate kit countdown (outer doughnut) - fills clockwise as time passes
  // Stop at 100% when kit duration is reached (freeze the animation)
  const elapsedKitPercent = expectedKitDuration > 0 ? Math.min(1, currentElapsedKitTime / expectedKitDuration) : 0;
  const kitProgressOffset = outerCircumference * (1 - elapsedKitPercent);

  // Determine if kit is overdue
  const isOverdue = currentElapsedKitTime > expectedKitDuration;

  // Color selection for KIT performance (outer donut)
  const getKitPerformanceColor = () => {
    if (isOverdue) return '#dc2626'; // red-600
    if (performanceStatus === 'AHEAD') return '#16a34a'; // green-600
    if (performanceStatus === 'BEHIND') return '#ea580c'; // orange-600
    return '#2563eb'; // blue-600 (ON_TRACK)
  };

  // Color selection for JOB performance (inner pie)
  const getJobPerformanceColor = () => {
    const status = jobPerformanceStatus || performanceStatus;
    if (status === 'AHEAD') return '#16a34a'; // green-600
    if (status === 'BEHIND') return '#dc2626'; // red-600
    return '#2563eb'; // blue-600 (ON_TRACK)
  };

  const kitPerformanceColor = getKitPerformanceColor();
  const jobPerformanceColor = getJobPerformanceColor();

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-2xl p-12 mb-2">
      {/* Circular Progress Visualization */}
      <div className="relative mb-8" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          {/* Background circles */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={outerStrokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={innerStrokeWidth}
          />

          {/* Inner Pie Chart - Overall Job Progress & Performance */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke={jobPerformanceColor}
            strokeWidth={innerStrokeWidth}
            strokeDasharray={innerCircumference}
            strokeDashoffset={jobProgressOffset}
            className="transition-all duration-500 ease-in-out"
            style={{
              transformOrigin: 'center',
            }}
          />

          {/* Outer Doughnut - Current Kit Duration */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke={kitPerformanceColor}
            strokeWidth={outerStrokeWidth}
            strokeDasharray={outerCircumference}
            strokeDashoffset={kitProgressOffset}
            strokeLinecap="butt"
            className={`transition-all duration-1000 ease-linear ${isOverdue ? 'animate-pulse' : ''}`}
            style={{
              transformOrigin: 'center',
            }}
          />
        </svg>

        {/* Center Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center" style={{ maxWidth: '280px' }}>
            {/* Kit Count */}
            <div className="mb-4">
              <div className="text-5xl font-bold text-gray-800 mb-1">
                {completedKits}<span className="text-gray-400">/{totalKits}</span>
              </div>
              <div className="text-sm text-gray-600 font-semibold">Kits</div>
            </div>

            {/* Kit Timer */}
            <div className="mb-3">
              <div className={`text-4xl font-mono font-bold mb-1 ${
                isOverdue ? 'text-red-600 animate-pulse' : 'text-blue-600'
              }`}>
                {formatTime(currentElapsedKitTime)}
              </div>
              <div className="text-xs text-gray-600">
                {isOverdue ? 'OVERDUE!' : 'Elapsed'}
              </div>
            </div>

            {/* Performance Badge - Job Performance */}
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
              (jobPerformanceStatus || performanceStatus) === 'AHEAD' ? 'bg-green-100 text-green-800' :
              (jobPerformanceStatus || performanceStatus) === 'BEHIND' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {(jobPerformanceStatus || performanceStatus).replace('_', ' ')}
            </div>

            {isPaused && (
              <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                ⏸ PAUSED
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mt-8 grid grid-cols-3 gap-8 w-full max-w-2xl">
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">
            {formatTime(currentElapsedKitTime)}
          </div>
          <div className="text-sm text-gray-600 mt-1">Current Kit Time</div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">
            {formatTime(expectedKitDuration)}
          </div>
          <div className="text-sm text-gray-600 mt-1">Expected Kit Time</div>
        </div>

        <div className="text-center">
          <div className={`text-3xl font-bold ${
            currentElapsedKitTime > expectedKitDuration ? 'text-red-600' : 'text-green-600'
          }`}>
            {currentElapsedKitTime > expectedKitDuration ? '+' : '-'}{formatTime(Math.abs(currentElapsedKitTime - expectedKitDuration))}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {currentElapsedKitTime > expectedKitDuration ? 'Over Target' : 'Under Target'}
          </div>
        </div>
      </div>

      {/* Progress Percentage */}
      <div className="mt-6 text-center">
        <div className="text-4xl font-bold text-gray-700">
          {Math.round(jobProgressPercent * 100)}%
        </div>
        <div className="text-lg text-gray-600">Job Complete</div>
      </div>
    </div>
  );
};

export default CircularProgressView;
