import React, { useState } from 'react';

interface Scenario {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  changes: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface WhatIfControlProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'production' | 'whatif';
  onModeChange: (mode: 'production' | 'whatif') => void;
  activeScenario: Scenario | null;
  allScenarios: Scenario[];
  changeCount: number;
  onCreateScenario: (name: string, description?: string) => Promise<void>;
  onActivateScenario: (scenarioId: string) => Promise<void>;
  onCommitScenario: () => Promise<void>;
  onDiscardScenario: () => Promise<void>;
}

/**
 * What-If Control Panel - Slide-out sidebar for managing scenarios
 *
 * Features:
 * - Toggle between Production and What-If modes
 * - Create new scenarios with name and description
 * - View list of saved scenarios
 * - Activate scenarios to enter What-If mode
 * - View changes summary for active scenario
 * - Commit scenarios to production
 * - Discard scenarios without applying
 *
 * Design: Follows same pattern as JobFilterPanel (slide-out from right)
 */
const WhatIfControl: React.FC<WhatIfControlProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
  activeScenario,
  allScenarios,
  changeCount,
  onCreateScenario,
  onActivateScenario,
  onCommitScenario,
  onDiscardScenario
}) => {
  const [showNewScenarioModal, setShowNewScenarioModal] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const handleCreateScenario = async () => {
    if (!newScenarioName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateScenario(newScenarioName.trim(), newScenarioDescription.trim() || undefined);
      setNewScenarioName('');
      setNewScenarioDescription('');
      setShowNewScenarioModal(false);
    } catch (error) {
      console.error('Failed to create scenario:', error);
      alert('Failed to create scenario. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCommit = async () => {
    if (!confirm(`Commit "${activeScenario?.name}"?\n\nThis will permanently apply all ${changeCount} changes to production. This action cannot be undone.`)) {
      return;
    }

    setIsCommitting(true);
    try {
      await onCommitScenario();
    } catch (error) {
      console.error('Failed to commit scenario:', error);
      alert('Failed to commit scenario: ' + (error as Error).message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirm(`Discard "${activeScenario?.name}"?\n\nThis will permanently delete this scenario and all ${changeCount} changes. This action cannot be undone.`)) {
      return;
    }

    setIsDiscarding(true);
    try {
      await onDiscardScenario();
    } catch (error) {
      console.error('Failed to discard scenario:', error);
      alert('Failed to discard scenario. Please try again.');
    } finally {
      setIsDiscarding(false);
    }
  };

  // Close panel on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-250 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>

        {/* Header */}
        <div className="flex-shrink-0 border-b bg-gradient-to-r from-purple-50 to-blue-50 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">What-If Planning</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Close panel (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => onModeChange('production')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'production'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📅 Production
            </button>
            <button
              onClick={() => onModeChange('whatif')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'whatif'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              disabled={!activeScenario}
              title={!activeScenario ? 'Activate a scenario to enter What-If mode' : 'Switch to What-If mode'}
            >
              🔮 What-If
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">

          {mode === 'production' ? (
            // Production Mode: Show scenario library
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-700">Saved Scenarios</h3>
                <span className="text-sm text-gray-500">{allScenarios.length} total</span>
              </div>

              {allScenarios.length === 0 ? (
                <div className="bg-blue-50 rounded-lg p-6 text-center border border-blue-200">
                  <div className="text-4xl mb-3">🔮</div>
                  <p className="text-gray-600 text-sm mb-4">
                    No scenarios yet. Create one to start planning!
                  </p>
                  <button
                    onClick={() => setShowNewScenarioModal(true)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors text-sm"
                  >
                    + Create First Scenario
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {allScenarios.map(scenario => (
                      <div
                        key={scenario.id}
                        className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                        onClick={() => onActivateScenario(scenario.id)}
                      >
                        <div className="font-medium text-gray-800">{scenario.name}</div>
                        {scenario.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">{scenario.description}</div>
                        )}
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className="text-purple-500">●</span>
                            {scenario.changes.length} {scenario.changes.length === 1 ? 'change' : 'changes'}
                          </span>
                          <span>{new Date(scenario.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowNewScenarioModal(true)}
                    className="w-full py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
                  >
                    + New Scenario
                  </button>
                </>
              )}
            </div>
          ) : (
            // What-If Mode: Show active scenario details
            <div>
              {/* Active Scenario Info */}
              {activeScenario && (
                <div className="bg-purple-50 rounded-lg p-4 mb-4 border border-purple-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900">{activeScenario.name}</h3>
                      {activeScenario.description && (
                        <p className="text-sm text-purple-700 mt-1">{activeScenario.description}</p>
                      )}
                    </div>
                    <div className="ml-2 px-2 py-1 bg-purple-500 text-white text-xs rounded-full font-medium">
                      Active
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-3">
                    <span className="text-purple-700 font-medium">
                      {changeCount} {changeCount === 1 ? 'change' : 'changes'}
                    </span>
                    <span className="text-purple-600">
                      {new Date(activeScenario.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Change Summary */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <span>Changes in this scenario:</span>
                  {changeCount > 0 && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                      {changeCount}
                    </span>
                  )}
                </h4>

                {!activeScenario || activeScenario.changes.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
                    <div className="text-3xl mb-2">📝</div>
                    <p className="text-gray-500 text-sm">
                      No changes yet. Add or modify jobs on the calendar to see them here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeScenario.changes.map((change: any) => (
                      <div
                        key={change.id}
                        className={`rounded-lg p-3 border-l-4 ${
                          change.operation === 'ADD'
                            ? 'bg-green-50 border-green-500'
                            : change.operation === 'MODIFY'
                            ? 'bg-yellow-50 border-yellow-500'
                            : 'bg-red-50 border-red-500'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">
                            {change.operation === 'ADD' ? '➕' : change.operation === 'MODIFY' ? '✏️' : '🗑️'}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 text-sm">
                              {change.operation} Job {change.changeData?.jobNumber || change.jobId || 'New Job'}
                            </div>
                            {change.changeData?.customerName && (
                              <div className="text-xs text-gray-600 mt-1">
                                {change.changeData.customerName}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(change.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <div className="font-medium mb-1">💡 How to use What-If mode:</div>
                <ul className="text-xs space-y-1 ml-4 list-disc">
                  <li>Drag jobs on calendar to reschedule them</li>
                  <li>Changes are tracked but not applied to production</li>
                  <li>Switch to Production view anytime to see original schedule</li>
                  <li>Commit when ready to apply all changes</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {mode === 'whatif' && activeScenario && (
          <div className="flex-shrink-0 border-t bg-gray-50 p-4 space-y-2">
            <button
              onClick={handleCommit}
              disabled={isCommitting || isDiscarding}
              className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCommitting ? '⏳ Committing...' : '✅ Commit to Production'}
            </button>
            <button
              onClick={handleDiscard}
              disabled={isCommitting || isDiscarding}
              className="w-full py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDiscarding ? '⏳ Discarding...' : '🗑️ Discard Scenario'}
            </button>
          </div>
        )}
      </div>

      {/* New Scenario Modal */}
      {showNewScenarioModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-xl font-bold mb-4">Create New Scenario</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scenario Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  placeholder="e.g., Material Delay - 2 weeks"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newScenarioName.trim()) {
                      handleCreateScenario();
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newScenarioDescription}
                  onChange={(e) => setNewScenarioDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                  rows={3}
                  placeholder="What are you testing in this scenario?"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateScenario}
                disabled={!newScenarioName.trim() || isCreating}
                className="flex-1 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? '⏳ Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowNewScenarioModal(false);
                  setNewScenarioName('');
                  setNewScenarioDescription('');
                }}
                disabled={isCreating}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WhatIfControl;
