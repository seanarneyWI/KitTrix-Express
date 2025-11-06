import React, { useState, useEffect } from 'react';
import { KittingJob } from '../types/kitting';
import { apiUrl } from '../config/api';
import { formatDuration } from '../utils/kittingCalculations';
import AddDelayDialog from './AddDelayDialog';

interface JobDelay {
  id: string;
  scenarioId: string;
  jobId: string;
  name: string;
  duration: number;
  insertAfter: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DelayEditorProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId: string;
  scenarioName: string;
  job: KittingJob;
  onDelaysChanged?: () => void;
}

const DelayEditor: React.FC<DelayEditorProps> = ({
  isOpen,
  onClose,
  scenarioId,
  scenarioName,
  job,
  onDelaysChanged
}) => {
  const [delays, setDelays] = useState<JobDelay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [insertAfterStep, setInsertAfterStep] = useState(0);

  // Fetch delays when dialog opens
  useEffect(() => {
    if (isOpen && scenarioId && job.id) {
      fetchDelays();
    }
  }, [isOpen, scenarioId, job.id]);

  const fetchDelays = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/scenarios/${scenarioId}/jobs/${job.id}/delays`));
      if (!response.ok) {
        throw new Error('Failed to fetch delays');
      }
      const data = await response.json();
      setDelays(data);
      console.log(`⏰ Loaded ${data.length} delays for job ${job.jobNumber}`);
    } catch (err: any) {
      console.error('Error fetching delays:', err);
      setError(err.message || 'Failed to load delays');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDelay = async (delayId: string) => {
    if (!confirm('Are you sure you want to delete this delay?')) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/delays/${delayId}`), {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete delay');
      }

      await fetchDelays();
      onDelaysChanged?.();
      console.log(`⏰ Deleted delay ${delayId}`);
    } catch (err: any) {
      console.error('Error deleting delay:', err);
      alert(`Failed to delete delay: ${err.message}`);
    }
  };

  const handleAddDelay = (afterStep: number) => {
    setInsertAfterStep(afterStep);
    setShowAddDialog(true);
  };

  const handleDelayAdded = () => {
    fetchDelays();
    onDelaysChanged?.();
    setShowAddDialog(false);
  };

  if (!isOpen) return null;

  // Get delays for each step
  const getDelaysAfterStep = (stepOrder: number) => {
    return delays.filter(d => d.insertAfter === stepOrder);
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <span>⏰</span>
                <span>Delay Editor</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Scenario:</span> {scenarioName} •{' '}
                <span className="font-medium">Job:</span> {job.jobNumber} ({job.customerName})
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="text-center py-8 text-gray-500">
                Loading delays...
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-2">
                {/* Job Setup (before any steps) */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">Job Setup</div>
                      <div className="text-sm text-blue-700">
                        {formatDuration(job.setup)} total
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddDelay(0)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      + Add Delay After
                    </button>
                  </div>
                </div>

                {/* Delays after setup (insertAfter = 0) */}
                {getDelaysAfterStep(0).map(delay => (
                  <div key={delay.id} className="ml-8 bg-yellow-50 border border-yellow-300 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600">⏰</span>
                      <div>
                        <div className="font-medium text-yellow-900">{delay.name}</div>
                        <div className="text-xs text-yellow-700">{formatDuration(delay.duration)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDelay(delay.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Route Steps */}
                {job.routeSteps?.sort((a, b) => a.order - b.order).map((step) => (
                  <React.Fragment key={step.id}>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">STEP {step.order}</span>
                            <span className="font-medium text-gray-900">{step.name}</span>
                          </div>
                          <div className="text-sm text-gray-700">
                            {formatDuration(step.expectedSeconds)} per kit
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddDelay(step.order)}
                          className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                          + Add Delay After
                        </button>
                      </div>
                    </div>

                    {/* Delays after this step */}
                    {getDelaysAfterStep(step.order).map(delay => (
                      <div key={delay.id} className="ml-8 bg-yellow-50 border border-yellow-300 rounded-lg p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-600">⏰</span>
                          <div>
                            <div className="font-medium text-yellow-900">{delay.name}</div>
                            <div className="text-xs text-yellow-700">{formatDuration(delay.duration)}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteDelay(delay.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </React.Fragment>
                ))}

                {/* Make Ready & Take Down */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="font-medium text-blue-900">Make Ready & Take Down</div>
                  <div className="text-sm text-blue-700">
                    {formatDuration(job.makeReady + job.takeDown)} total
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {delays.length} {delays.length === 1 ? 'delay' : 'delays'} configured
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

      {/* Add Delay Dialog */}
      {showAddDialog && (
        <AddDelayDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          scenarioId={scenarioId}
          jobId={job.id}
          insertAfter={insertAfterStep}
          onDelayAdded={handleDelayAdded}
        />
      )}
    </>
  );
};

export default DelayEditor;
