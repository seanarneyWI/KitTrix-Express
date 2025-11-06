import React, { useState } from 'react';
import { apiUrl } from '../config/api';

interface AddDelayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId: string;
  jobId: string;
  insertAfter: number;
  onDelayAdded: () => void;
}

const AddDelayDialog: React.FC<AddDelayDialogProps> = ({
  isOpen,
  onClose,
  scenarioId,
  jobId,
  insertAfter,
  onDelayAdded
}) => {
  const [name, setName] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Delay name is required');
      return;
    }

    const totalSeconds = (hours * 3600) + (minutes * 60);
    if (totalSeconds <= 0) {
      setError('Delay duration must be greater than 0');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/api/scenarios/${scenarioId}/delays`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          name: name.trim(),
          duration: totalSeconds,
          insertAfter
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create delay');
      }

      console.log(`⏰ Created delay: ${name} (${totalSeconds}s)`);
      onDelayAdded();
      handleClose();
    } catch (err: any) {
      console.error('Error creating delay:', err);
      setError(err.message || 'Failed to create delay');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setHours(0);
    setMinutes(0);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>⏰</span>
            <span>Add Delay</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Insert delay after step {insertAfter === 0 ? 'setup' : insertAfter}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Delay Name */}
          <div>
            <label htmlFor="delay-name" className="block text-sm font-medium text-gray-700 mb-1">
              Delay Name *
            </label>
            <input
              id="delay-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Equipment maintenance, Team meeting"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              disabled={saving}
              autoFocus
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Hours */}
              <div>
                <label htmlFor="hours" className="block text-xs text-gray-500 mb-1">Hours</label>
                <input
                  id="hours"
                  type="number"
                  min="0"
                  max="999"
                  value={hours}
                  onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              {/* Minutes */}
              <div>
                <label htmlFor="minutes" className="block text-xs text-gray-500 mb-1">Minutes</label>
                <input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.min(59, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total: {hours}h {minutes}m ({(hours * 3600) + (minutes * 60)} seconds)
            </p>
          </div>

          {/* Quick Duration Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => { setHours(0); setMinutes(15); }}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                disabled={saving}
              >
                15m
              </button>
              <button
                type="button"
                onClick={() => { setHours(0); setMinutes(30); }}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                disabled={saving}
              >
                30m
              </button>
              <button
                type="button"
                onClick={() => { setHours(1); setMinutes(0); }}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                disabled={saving}
              >
                1h
              </button>
              <button
                type="button"
                onClick={() => { setHours(2); setMinutes(0); }}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                disabled={saving}
              >
                2h
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Adding...' : 'Add Delay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDelayDialog;
