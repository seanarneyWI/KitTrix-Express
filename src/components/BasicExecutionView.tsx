import React from 'react';
import { formatDuration } from '../utils/kittingCalculations';

interface BasicExecutionViewProps {
  jobNumber: string;
  customerName: string;
  currentKitNumber: number;
  totalKits: number;
  currentElapsedKitTime: number;
  expectedKitDuration: number;
  performanceStatus: 'AHEAD' | 'ON_TRACK' | 'BEHIND';
  onCompleteKit: () => void;
  isPaused: boolean;
}

const BasicExecutionView: React.FC<BasicExecutionViewProps> = ({
  jobNumber,
  customerName,
  currentKitNumber,
  totalKits,
  currentElapsedKitTime,
  expectedKitDuration,
  performanceStatus,
  onCompleteKit,
  isPaused
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
      {/* Top Info Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Job {jobNumber}</h2>
            <p className="text-sm text-gray-600">{customerName}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-800">
              Kit {currentKitNumber} / {totalKits}
            </p>
            <p className={`text-sm font-semibold ${getPerformanceColor()}`}>
              {performanceStatus === 'AHEAD' && '⚡ Ahead of Schedule'}
              {performanceStatus === 'ON_TRACK' && '✓ On Track'}
              {performanceStatus === 'BEHIND' && '⚠ Behind Schedule'}
            </p>
          </div>
        </div>
      </div>

      {/* Timer Display */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">
            {isOverdue ? 'Overtime' : 'Time Remaining'}
          </p>
          <p className={`text-6xl font-mono font-bold ${getTimerColor()} ${
            isOverdue ? 'animate-pulse' : ''
          }`}>
            {formatDuration(isOverdue ? currentElapsedKitTime - expectedKitDuration : remainingTime)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Expected: {formatDuration(expectedKitDuration)} |
            Elapsed: {formatDuration(currentElapsedKitTime)}
          </p>
        </div>
      </div>

      {/* Large Action Button - Takes remaining space */}
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={onCompleteKit}
          disabled={isPaused}
          className={`
            w-full h-full max-w-4xl max-h-96
            rounded-3xl shadow-2xl
            text-white text-6xl font-bold
            transition-all duration-300 transform
            ${isPaused
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 hover:scale-105 active:scale-95'
            }
          `}
        >
          {isPaused ? (
            <div className="flex flex-col items-center gap-4">
              <svg className="w-20 h-20 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <span>PAUSED</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
              <span>NEXT KIT</span>
            </div>
          )}
        </button>
      </div>

      {/* Bottom Spacer */}
      <div className="h-4"></div>
    </div>
  );
};

export default BasicExecutionView;
