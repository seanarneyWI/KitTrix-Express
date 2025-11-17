import React, { useState } from 'react';
import { KittingJob } from '../types/kitting';
import { formatDuration } from '../utils/kittingCalculations';
import DelayEditor from './DelayEditor';

interface Scenario {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  changes: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface DelayManagerProps {
  isOpen: boolean;
  onClose: () => void;
  allScenarios: Scenario[];
  allJobs: KittingJob[];
  defaultScenarioId?: string;
  defaultJobId?: string; // If provided, skip job list and go straight to delay editor
  onDelaysChanged?: () => void;
}

const DelayManager: React.FC<DelayManagerProps> = ({
  isOpen,
  onClose,
  allScenarios,
  allJobs,
  defaultScenarioId,
  defaultJobId,
  onDelaysChanged
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    defaultScenarioId || allScenarios[0]?.id || ''
  );
  const [delayEditorState, setDelayEditorState] = useState<{
    isOpen: boolean;
    job: KittingJob | null;
  }>({
    isOpen: false,
    job: null
  });

  // If defaultJobId provided, open delay editor immediately
  React.useEffect(() => {
    if (isOpen && defaultJobId) {
      const job = allJobs.find(j => j.id === defaultJobId);
      if (job) {
        setDelayEditorState({
          isOpen: true,
          job
        });
      }
    }
  }, [isOpen, defaultJobId, allJobs]);

  const selectedScenario = allScenarios.find(s => s.id === selectedScenarioId);

  // If delay editor is open for a specific job (from defaultJobId), show it directly
  const showJobList = !delayEditorState.isOpen || !defaultJobId;

  const getStatusBadgeColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'scheduled': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'in_progress': case 'in-progress': return 'bg-green-100 text-green-800 border-green-300';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'paused': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const formatJobDates = (job: KittingJob) => {
    const start = job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unscheduled';
    return start;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-purple-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <span>⏰</span>
                  <span>Delay Manager</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Add delays to jobs in your what-if scenarios
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scenario Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Select Scenario to Manage:
              </label>
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
              >
                {allScenarios.map(scenario => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name} {scenario.isActive ? '(ACTIVE)' : ''} - {scenario.changes.length} changes
                  </option>
                ))}
              </select>
            </div>

            {selectedScenario?.description && (
              <div className="mt-2 text-sm text-gray-600 italic">
                {selectedScenario.description}
              </div>
            )}
          </div>

          {/* Job List - only show if not opened for specific job */}
          {showJobList && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  Select a job to add delays:
                </h3>
                <span className="text-xs text-gray-500">
                  {allJobs.length} jobs available
                </span>
              </div>

            {allJobs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm">No jobs available</p>
                <p className="text-xs mt-1">Create some jobs first</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allJobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setDelayEditorState({
                        isOpen: true,
                        job
                      });
                    }}
                    className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-purple-50 hover:border-purple-300 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-gray-900">{job.jobNumber}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusBadgeColor(job.status)}`}>
                            {job.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 font-medium">{job.customerName}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{job.description}</div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span title="Duration">⏱ {formatDuration(job.expectedJobDuration)}</span>
                          <span title="Start Date">📅 {formatJobDates(job)}</span>
                          <span title="Quantity">📦 {job.orderedQuantity}</span>
                        </div>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        <span className="text-yellow-600 text-2xl">⏰</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              💡 Tip: Delays will be applied to the selected scenario
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delay Editor */}
      {delayEditorState.isOpen && delayEditorState.job && selectedScenario && (
        <DelayEditor
          isOpen={delayEditorState.isOpen}
          onClose={() => setDelayEditorState({ isOpen: false, job: null })}
          scenarioId={selectedScenario.id}
          scenarioName={selectedScenario.name}
          job={delayEditorState.job}
          onDelaysChanged={() => {
            onDelaysChanged?.();
          }}
        />
      )}
    </>
  );
};

export default DelayManager;
