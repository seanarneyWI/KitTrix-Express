import React, { useState, useEffect } from 'react';
import { getAllShifts, toggleShift, updateShift, getShiftProductiveHours, type Shift } from '../utils/shiftScheduling';

interface ShiftControlProps {
  onShiftsChange?: (activeShifts: Shift[]) => void;
}

const ShiftControl: React.FC<ShiftControlProps> = ({ onShiftsChange }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    startTime: '',
    endTime: '',
    breakStart: '',
    breakDuration: 0,
    color: ''
  });

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedShifts = await getAllShifts();
      setShifts(fetchedShifts);

      // Notify parent component of active shifts
      if (onShiftsChange) {
        const activeShifts = fetchedShifts.filter(s => s.isActive);
        onShiftsChange(activeShifts);
      }
    } catch (err) {
      console.error('Failed to load shifts:', err);
      setError('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (shift: Shift) => {
    try {
      const updatedShift = await toggleShift(shift.id, !shift.isActive);

      // Update local state
      const updatedShifts = shifts.map(s =>
        s.id === updatedShift.id ? updatedShift : s
      );
      setShifts(updatedShifts);

      // Notify parent component of active shifts
      if (onShiftsChange) {
        const activeShifts = updatedShifts.filter(s => s.isActive);
        onShiftsChange(activeShifts);
      }
    } catch (err) {
      console.error('Failed to toggle shift:', err);
      setError('Failed to toggle shift');
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setEditForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakStart: shift.breakStart || '',
      breakDuration: shift.breakDuration || 0,
      color: shift.color || ''
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!editingShift) return;

    try {
      const updatedShift = await updateShift(editingShift.id, {
        name: editForm.name,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        breakStart: editForm.breakStart || null,
        breakDuration: editForm.breakDuration || null,
        color: editForm.color || null
      });

      // Update local state
      const updatedShifts = shifts.map(s =>
        s.id === updatedShift.id ? updatedShift : s
      );
      setShifts(updatedShifts);

      // Notify parent component
      if (onShiftsChange) {
        const activeShifts = updatedShifts.filter(s => s.isActive);
        onShiftsChange(activeShifts);
      }

      // Close modal
      setEditingShift(null);
      setError(null);
    } catch (err) {
      console.error('Failed to update shift:', err);
      setError('Failed to update shift');
    }
  };

  const handleCancel = () => {
    setEditingShift(null);
    setError(null);
  };

  const formatTimeRange = (shift: Shift): string => {
    return `${shift.startTime} - ${shift.endTime}`;
  };

  const getBreakInfo = (shift: Shift): string => {
    if (shift.breakStart && shift.breakDuration) {
      return `Break: ${shift.breakStart} (${shift.breakDuration} min)`;
    }
    return 'No break';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse flex items-center justify-center">
          <div className="text-gray-400">Loading shifts...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-4">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  const activeCount = shifts.filter(s => s.isActive).length;
  const totalProductiveHours = shifts
    .filter(s => s.isActive)
    .reduce((total, s) => total + getShiftProductiveHours(s), 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Work Shifts</h3>
          <p className="text-sm text-gray-500">
            {activeCount} active • {totalProductiveHours.toFixed(1)} productive hours/day
          </p>
        </div>
        <button
          onClick={loadShifts}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Refresh shifts"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="space-y-3">
        {shifts.map((shift) => {
          const productiveHours = getShiftProductiveHours(shift);

          return (
            <div
              key={shift.id}
              className={`
                relative rounded-lg border-2 transition-all duration-200
                ${
                  shift.isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }
              `}
              style={
                shift.isActive && shift.color
                  ? { backgroundColor: shift.color }
                  : undefined
              }
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-base font-semibold text-gray-900">
                        {shift.name}
                      </h4>
                      <span
                        className={`
                          px-2 py-0.5 text-xs font-medium rounded-full
                          ${
                            shift.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-600'
                          }
                        `}
                      >
                        {shift.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">⏰</span>
                        <span>{formatTimeRange(shift)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">☕</span>
                        <span>{getBreakInfo(shift)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">✓</span>
                        <span>{productiveHours.toFixed(1)} productive hours</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(shift)}
                      className="px-3 py-1.5 text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded transition-colors border border-blue-200"
                      title="Edit shift times and breaks"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleToggle(shift)}
                      className={`
                        relative inline-flex h-8 w-14 items-center rounded-full transition-colors
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        ${shift.isActive ? 'bg-blue-600' : 'bg-gray-300'}
                      `}
                      role="switch"
                      aria-checked={shift.isActive}
                      aria-label={`Toggle ${shift.name}`}
                    >
                      <span
                        className={`
                          inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                          ${shift.isActive ? 'translate-x-7' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {shifts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No shifts configured. Run the database migration to create default shifts.
        </div>
      )}

      {/* Edit Shift Modal */}
      {editingShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Edit {editingShift.name}
              </h3>

              <div className="space-y-4">
                {/* Shift Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time (24-hour format)
                  </label>
                  <input
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time (24-hour format)
                  </label>
                  <input
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Break Start */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Break Start Time (optional)
                  </label>
                  <input
                    type="time"
                    value={editForm.breakStart}
                    onChange={(e) => setEditForm({ ...editForm, breakStart: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Break Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Break Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={editForm.breakDuration}
                    onChange={(e) => setEditForm({ ...editForm, breakDuration: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="120"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Background Color (hex code)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      placeholder="#e3f2fd"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="color"
                      value={editForm.color || '#e3f2fd'}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftControl;
