import React from 'react';
import { formatDuration } from '../utils/kittingCalculations';

interface BasicExecutionViewProps {
  jobNumber: string;
  customerName: string;
  currentKitNumber: number;
  totalKits: number;
  totalCompletedKits: number;
  stationKitsCompleted: number;
  currentElapsedKitTime: number;
  expectedKitDuration: number;
  performanceStatus: 'AHEAD' | 'ON_TRACK' | 'BEHIND';
  onCompleteKit: () => void;
  isPaused: boolean;
  stationName?: string | null;
}

const BasicExecutionView: React.FC<BasicExecutionViewProps> = ({
  jobNumber,
  customerName,
  currentKitNumber,
  totalKits,
  totalCompletedKits,
  stationKitsCompleted,
  currentElapsedKitTime,
  expectedKitDuration,
  performanceStatus,
  onCompleteKit,
  isPaused,
  stationName
}) => {
  const remainingTime = Math.max(0, expectedKitDuration - currentElapsedKitTime);
  const isOverdue = currentElapsedKitTime > expectedKitDuration;

  // Calculate performance color
  const getPerformanceColor = () => {
    if (performanceStatus === 'AHEAD') return 'text-green-600';
    if (performanceStatus === 'BEHIND') return 'text-red-600';
    return 'text-blue-600';
  };

  const getTimerColor = () => {
    if (isOverdue) return 'text-red-600';
    if (remainingTime <= 10) return 'text-orange-600';
    return 'text-gray-700';
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      {/* Combined Info Card - Job, Customer, Timer, Station, Kit Counter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Job & Customer */}
          <div>
            <h2 className="text-lg font-bold text-gray-800">Job {jobNumber}</h2>
            <p className="text-sm text-gray-600">{customerName}</p>
          </div>

          {/* Time Remaining */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">
              {isOverdue ? 'Overtime' : 'Time Remaining'}
            </p>
            <p className={`text-3xl font-mono font-bold ${getTimerColor()} ${
              isOverdue ? 'animate-pulse' : ''
            }`}>
              {formatDuration(isOverdue ? currentElapsedKitTime - expectedKitDuration : remainingTime)}
            </p>
          </div>

          {/* Station */}
          {stationName && (
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Station</p>
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-2xl font-bold text-blue-800">{stationName}</span>
              </div>
            </div>
          )}

          {/* Kit Counter */}
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Progress</p>
            <p className="text-3xl font-bold text-gray-800">
              {totalCompletedKits} / {totalKits}
            </p>
            <p className="text-sm text-gray-600">
              Station: {stationKitsCompleted} kits
            </p>
            <p className={`text-xs font-semibold ${getPerformanceColor()}`}>
              {performanceStatus === 'AHEAD' && '⚡ Ahead'}
              {performanceStatus === 'ON_TRACK' && '✓ On Track'}
              {performanceStatus === 'BEHIND' && '⚠ Behind'}
            </p>
          </div>
        </div>
      </div>

      {/* Maximized Action Button - Takes all remaining space */}
      <div className="flex-1 flex items-center justify-center pb-4">
        <button
          onClick={onCompleteKit}
          disabled={isPaused}
          className={`
            w-full h-full
            rounded-3xl shadow-2xl
            text-white text-7xl font-bold
            transition-all duration-300 transform
            ${isPaused
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 hover:scale-[1.02] active:scale-[0.98]'
            }
          `}
        >
          {isPaused ? (
            <div className="flex flex-col items-center gap-6">
              <svg className="w-24 h-24 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <span>PAUSED</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
              <span>NEXT KIT</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default BasicExecutionView;
