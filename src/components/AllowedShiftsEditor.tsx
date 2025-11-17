import React, { useState, useEffect } from 'react';
import { KittingJob } from '../types/kitting';
import { Shift } from '../utils/shiftScheduling';

interface AllowedShiftsEditorProps {
  isOpen: boolean;
  onClose: () => void;
  job: KittingJob;
  allShifts: Shift[];
  onSave: (jobId: string, allowedShiftIds: string[]) => Promise<void>;
}

const AllowedShiftsEditor: React.FC<AllowedShiftsEditorProps> = ({
  isOpen,
  onClose,
  job,
  allShifts,
  onSave
}) => {
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      //   jobId: job.id,
      //   jobNumber: job.jobNumber,
      //   currentAllowedShifts: job.allowedShiftIds,
      //   allShiftsCount: allShifts.length
      // });

      // Initialize with current job's allowed shifts, or all shifts if none specified
      setSelectedShiftIds(job.allowedShiftIds && job.allowedShiftIds.length > 0
        ? job.allowedShiftIds
        : allShifts.map(s => s.id)
      );
    }
  }, [isOpen, job.allowedShiftIds, allShifts]);

  const toggleShift = (shiftId: string) => {
    setSelectedShiftIds(prev => {
      const newSelection = prev.includes(shiftId)
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId];
      return newSelection;
    });
  };

  const selectAll = () => {
    setSelectedShiftIds(allShifts.map(s => s.id));
  };

  const selectNone = () => {
    setSelectedShiftIds([]);
  };

  const handleSave = async () => {
    //   jobId: job.id,
    //   jobNumber: job.jobNumber,
    //   selectedShiftIds,
    //   shiftCount: selectedShiftIds.length
    // });

    if (selectedShiftIds.length === 0) {
      alert('Please select at least one shift');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(job.id, selectedShiftIds);
      onClose();
    } catch (error) {
      console.error('❌ Failed to update allowed shifts:', error);
      alert('Failed to update allowed shifts. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  const hasChanges = JSON.stringify(selectedShiftIds.sort()) !== JSON.stringify((job.allowedShiftIds || allShifts.map(s => s.id)).sort());

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-2xl max-w-md w-full pointer-events-auto"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Allowed Shifts</h2>
              <p className="text-sm text-gray-500 mt-1">{job.jobNumber} - {job.customerName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Instructions */}
            <p className="text-sm text-gray-600">
              Select which shifts this job can be scheduled in. The job will only use productive time from the selected shifts.
            </p>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="flex-1 py-2 px-3 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="flex-1 py-2 px-3 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Shift List */}
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {allShifts.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No shifts available. Create shifts in the Admin page first.
                </div>
              ) : (
                allShifts.map((shift) => (
                  <label
                    key={shift.id}
                    className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedShiftIds.includes(shift.id)}
                      onChange={() => toggleShift(shift.id)}
                      className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">{shift.name}</div>
                        {shift.color && (
                          <div
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: shift.color }}
                          />
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {shift.startTime} - {shift.endTime}
                        {shift.breakStart && shift.breakDuration && (
                          <span className="ml-2">
                            (Break: {shift.breakStart}, {shift.breakDuration}min)
                          </span>
                        )}
                      </div>
                    </div>
                    {!shift.isActive && (
                      <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                        Inactive
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>

            {/* Selection Summary */}
            <div className="text-sm text-gray-600">
              {selectedShiftIds.length} of {allShifts.length} shifts selected
            </div>

            {/* Impact Note */}
            {hasChanges && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>ℹ️ Note:</strong> Changing allowed shifts will reschedule this job to use only the selected shifts' productive time.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges || selectedShiftIds.length === 0}
              className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Ctrl+Enter to save"
            >
              {isSaving ? '⏳ Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AllowedShiftsEditor;
