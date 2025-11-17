import React, { useState, useEffect } from 'react';
import { KittingJob } from '../types/kitting';

interface StationEditorProps {
  isOpen: boolean;
  onClose: () => void;
  job: KittingJob;
  onSave: (jobId: string, stationCount: number) => Promise<void>;
}

const StationEditor: React.FC<StationEditorProps> = ({
  isOpen,
  onClose,
  job,
  onSave
}) => {
  const [stationCount, setStationCount] = useState(job.stationCount || 1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStationCount(job.stationCount || 1);
    }
  }, [isOpen, job.stationCount]);

  const handleSave = async () => {
    if (stationCount < 1 || stationCount > 20) {
      alert('Station count must be between 1 and 20');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(job.id, stationCount);
      onClose();
    } catch (error) {
      console.error('Failed to update station count:', error);
      alert('Failed to update station count. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  // Calculate resource requirements
  const totalPeople = stationCount * 2 + Math.ceil(stationCount * 0.5);
  const kitters = stationCount * 2;
  const runners = Math.ceil(stationCount * 0.5);

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
              <h2 className="text-xl font-bold text-gray-900">Edit Stations</h2>
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
          <div className="p-6 space-y-6">
            {/* Station Count Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Stations
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={stationCount}
                onChange={(e) => setStationCount(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">Typical: 1-10 stations</p>
            </div>

            {/* Resource Requirements */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">Resource Requirements:</div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total People:</span>
                  <span className="font-medium text-gray-900">{totalPeople}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kitters:</span>
                  <span className="font-medium text-gray-900">{kitters}</span>
                </div>
                <div className="flex justify-between">
                  <span>Runners:</span>
                  <span className="font-medium text-gray-900">{runners}</span>
                </div>
              </div>
            </div>

            {/* Impact Note */}
            {stationCount !== job.stationCount && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>ℹ️ Note:</strong> Changing stations from <strong>{job.stationCount}</strong> to{' '}
                <strong>{stationCount}</strong> will recalculate the job duration and update the schedule.
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
              disabled={isSaving || stationCount === job.stationCount}
              className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '⏳ Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StationEditor;
