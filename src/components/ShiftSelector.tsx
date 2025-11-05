import React, { useState, useEffect } from 'react';
import { getAllShifts, getShiftProductiveHours, type Shift } from '../utils/shiftScheduling';

interface ShiftSelectorProps {
  value: string[]; // Array of selected shift IDs
  onChange: (shiftIds: string[]) => void;
  disabled?: boolean;
}

/**
 * ShiftSelector - Multi-select component for choosing which shifts a job can run on
 *
 * Features:
 * - Checkbox-based selection
 * - "Use Global Active Shifts" option (empty array)
 * - Shows shift details and productive hours
 * - Disabled state for inactive shifts (visual only)
 */
const ShiftSelector: React.FC<ShiftSelectorProps> = ({ value, onChange, disabled = false }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const useGlobalShifts = value.length === 0;

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedShifts = await getAllShifts();
      setShifts(fetchedShifts);
    } catch (err) {
      console.error('Failed to load shifts:', err);
      setError('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalToggle = () => {
    if (disabled) return;

    if (useGlobalShifts) {
      // Switch to custom: select all active shifts by default
      const activeShiftIds = shifts.filter(s => s.isActive).map(s => s.id);
      onChange(activeShiftIds);
    } else {
      // Switch to global: clear selection
      onChange([]);
    }
  };

  const handleShiftToggle = (shiftId: string) => {
    if (disabled || useGlobalShifts) return;

    const isSelected = value.includes(shiftId);

    if (isSelected) {
      // Remove from selection
      onChange(value.filter(id => id !== shiftId));
    } else {
      // Add to selection
      onChange([...value, shiftId]);
    }
  };

  const formatTimeRange = (shift: Shift): string => {
    return `${shift.startTime} - ${shift.endTime}`;
  };

  const getBreakInfo = (shift: Shift): string => {
    if (shift.breakStart && shift.breakDuration) {
      return `${shift.breakDuration} min break`;
    }
    return 'No break';
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-2"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  const activeShifts = shifts.filter(s => s.isActive);
  const totalProductiveHours = activeShifts.reduce((total, s) => total + getShiftProductiveHours(s), 0);

  return (
    <div className="space-y-3">
      {/* Global Shifts Option */}
      <div
        className={`
          border-2 rounded-lg p-3 cursor-pointer transition-all
          ${useGlobalShifts ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}
        `}
        onClick={handleGlobalToggle}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={useGlobalShifts}
            onChange={handleGlobalToggle}
            disabled={disabled}
            className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">Use Global Active Shifts</div>
            <div className="text-sm text-gray-600 mt-1">
              Job will run on whichever shifts are currently active ({activeShifts.length} active • {totalProductiveHours.toFixed(1)}h/day)
            </div>
          </div>
        </label>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-500">OR select specific shifts</span>
        </div>
      </div>

      {/* Individual Shift Selection */}
      <div className={`space-y-2 ${useGlobalShifts ? 'opacity-50' : ''}`}>
        {shifts.map((shift) => {
          const isSelected = value.includes(shift.id);
          const productiveHours = getShiftProductiveHours(shift);

          return (
            <div
              key={shift.id}
              className={`
                border-2 rounded-lg p-3 cursor-pointer transition-all
                ${isSelected && !useGlobalShifts ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
                ${!shift.isActive ? 'opacity-60' : ''}
                ${disabled || useGlobalShifts ? 'cursor-not-allowed' : 'hover:border-blue-400'}
              `}
              onClick={() => handleShiftToggle(shift.id)}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected && !useGlobalShifts}
                  onChange={() => handleShiftToggle(shift.id)}
                  disabled={disabled || useGlobalShifts}
                  className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{shift.name}</span>
                    <span
                      className={`
                        px-2 py-0.5 text-xs font-medium rounded-full
                        ${shift.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}
                      `}
                    >
                      {shift.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                    <div>⏰ {formatTimeRange(shift)}</div>
                    <div>☕ {getBreakInfo(shift)} • ✓ {productiveHours.toFixed(1)}h productive</div>
                  </div>
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      {!useGlobalShifts && value.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            <strong>{value.length} shift{value.length !== 1 ? 's' : ''} selected</strong> - This job will only run during these specific shifts, regardless of global shift settings.
          </div>
        </div>
      )}

      {!useGlobalShifts && value.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-sm text-yellow-800">
            <strong>Warning:</strong> No shifts selected. Please select at least one shift or use global active shifts.
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftSelector;
