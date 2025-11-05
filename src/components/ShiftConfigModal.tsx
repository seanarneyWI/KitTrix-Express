import React, { useState, useEffect } from 'react';
import { Shift } from '../utils/shiftScheduling';

interface ShiftConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift | null;
  onSave: (shiftId: string, updates: Partial<Shift>) => Promise<void>;
  onDelete?: (shiftId: string) => Promise<void>;
}

/**
 * Shift Configuration Modal
 *
 * Features:
 * - Edit shift name, times, breaks, and color
 * - Validate time format (HH:MM)
 * - Visual color picker
 * - Delete shift option
 * - Keyboard shortcuts (Esc to close, Enter to save)
 */
const ShiftConfigModal: React.FC<ShiftConfigModalProps> = ({
  isOpen,
  onClose,
  shift,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    breakStart: '',
    breakDuration: '',
    color: '#3b82f6'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preset colors for quick selection
  const presetColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' }
  ];

  // Populate form when shift changes
  useEffect(() => {
    if (shift) {
      setFormData({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakStart: shift.breakStart || '',
        breakDuration: shift.breakDuration?.toString() || '',
        color: shift.color || '#3b82f6'
      });
      setErrors({});
    }
  }, [shift]);

  // Validate time format (HH:MM)
  const validateTime = (time: string): boolean => {
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Shift name is required';
    }

    if (!formData.startTime || !validateTime(formData.startTime)) {
      newErrors.startTime = 'Invalid time format (use HH:MM)';
    }

    if (!formData.endTime || !validateTime(formData.endTime)) {
      newErrors.endTime = 'Invalid time format (use HH:MM)';
    }

    if (formData.breakStart && !validateTime(formData.breakStart)) {
      newErrors.breakStart = 'Invalid time format (use HH:MM)';
    }

    if (formData.breakDuration) {
      const duration = parseInt(formData.breakDuration);
      if (isNaN(duration) || duration < 0 || duration > 180) {
        newErrors.breakDuration = 'Break duration must be 0-180 minutes';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!shift || !validateForm()) return;

    setIsSaving(true);
    try {
      const updates: Partial<Shift> = {
        name: formData.name.trim(),
        startTime: formData.startTime,
        endTime: formData.endTime,
        breakStart: formData.breakStart || null,
        breakDuration: formData.breakDuration ? parseInt(formData.breakDuration) : null,
        color: formData.color
      };

      await onSave(shift.id, updates);
      onClose();
    } catch (error) {
      console.error('Failed to save shift:', error);
      setErrors({ submit: 'Failed to save shift. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!shift || !onDelete) return;

    if (!confirm(`Delete shift "${shift.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(shift.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete shift:', error);
      setErrors({ submit: 'Failed to delete shift. Please try again.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !shift) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Edit Shift</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Shift Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Morning Shift"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.startTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.endTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
          </div>

          {/* Break Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Break Start
              </label>
              <input
                type="time"
                value={formData.breakStart}
                onChange={(e) => setFormData({ ...formData, breakStart: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.breakStart ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.breakStart && <p className="text-xs text-red-500 mt-1">{errors.breakStart}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                value={formData.breakDuration}
                onChange={(e) => setFormData({ ...formData, breakDuration: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.breakDuration ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="30"
                min="0"
                max="180"
              />
              {errors.breakDuration && <p className="text-xs text-red-500 mt-1">{errors.breakDuration}</p>}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shift Color
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {presetColors.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setFormData({ ...formData, color: preset.value })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    formData.color === preset.value ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                />
              ))}
              {/* Custom color input */}
              <div className="relative">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                  title="Custom color"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {errors.submit}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-between items-center gap-3">
          {/* Delete Button (left side) */}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
            </button>
          )}

          {/* Save/Cancel (right side) */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '⏳ Saving...' : '✓ Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftConfigModal;
