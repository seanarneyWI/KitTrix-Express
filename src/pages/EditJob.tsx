import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomerAutocomplete from '../components/CustomerAutocomplete';
import ShiftSelector from '../components/ShiftSelector';
import { apiUrl } from '../config/api';

interface RouteStep {
  id?: string;
  name: string;
  expectedSeconds: number;
  order: number;
  instructionType: 'NONE' | 'VIDEO' | 'IMAGE' | 'TEXT';
  instructionUrl?: string;
  instructionText?: string;
  autoLoop: boolean;
}

interface JobFormData {
  customerName: string;
  companyId?: number;
  jobNumber: string;
  description: string;
  customerSpec: string;
  orderedQuantity: number;
  runLength: number;
  dueDate: string;
  scheduledDate: string;
  scheduledStartTime: string;
  executionInterface: 'STEPS' | 'TARGET' | 'BASIC';
  setup: number;
  makeReady: number;
  takeDown: number;
  stationCount: number;
  expectedKitDuration: number;
  expectedJobDuration: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  allowedShiftIds: string[];
  includeWeekends: boolean;
  routeSteps: RouteStep[];
}

const EditJob: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const isNewJob = jobId === 'new';

  const [formData, setFormData] = useState<JobFormData>({
    customerName: '',
    jobNumber: '',
    description: '',
    customerSpec: '',
    orderedQuantity: 1,
    runLength: 1,
    dueDate: '',
    scheduledDate: '',
    scheduledStartTime: '',
    executionInterface: 'STEPS',
    setup: 0,
    makeReady: 0,
    takeDown: 0,
    stationCount: 1,
    expectedKitDuration: 0,
    expectedJobDuration: 0,
    status: 'SCHEDULED',
    allowedShiftIds: [],
    includeWeekends: false,
    routeSteps: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNewJob && jobId) {
      fetchJobData(jobId);
    }
  }, [jobId, isNewJob]);

  const fetchJobData = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl(`/api/kitting-jobs/${id}`));
      if (response.ok) {
        const job = await response.json();
        setFormData({
          customerName: job.customerName || '',
          jobNumber: job.jobNumber || '',
          description: job.description || '',
          customerSpec: job.customerSpec || '',
          orderedQuantity: job.orderedQuantity || 1,
          runLength: job.runLength || 1,
          dueDate: job.dueDate ? new Date(job.dueDate).toISOString().slice(0, 16) : '',
          scheduledDate: job.scheduledDate ? new Date(job.scheduledDate).toISOString().slice(0, 10) : '',
          scheduledStartTime: job.scheduledStartTime || '',
          executionInterface: job.executionInterface || 'STEPS',
          setup: job.setup || 0,
          makeReady: job.makeReady || 0,
          takeDown: job.takeDown || 0,
          stationCount: job.stationCount || 1,
          expectedKitDuration: job.expectedKitDuration || 0,
          expectedJobDuration: job.expectedJobDuration || 0,
          status: job.status || 'SCHEDULED',
          allowedShiftIds: job.allowedShiftIds || [],
          includeWeekends: job.includeWeekends || false,
          routeSteps: job.routeSteps || []
        });
      } else {
        setError('Failed to load job data');
      }
    } catch (err) {
      setError('Error fetching job data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRouteStep = () => {
    const newStep: RouteStep = {
      name: '',
      expectedSeconds: 0,
      order: formData.routeSteps.length,
      instructionType: 'NONE',
      instructionUrl: '',
      instructionText: '',
      autoLoop: true
    };
    setFormData(prev => ({
      ...prev,
      routeSteps: [...prev.routeSteps, newStep]
    }));
  };

  const removeRouteStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      routeSteps: prev.routeSteps.filter((_, i) => i !== index).map((step, i) => ({ ...step, order: i }))
    }));
  };

  const updateRouteStep = (index: number, field: keyof RouteStep, value: any) => {
    setFormData(prev => ({
      ...prev,
      routeSteps: prev.routeSteps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const calculateDurations = () => {
    const kitDuration = formData.routeSteps.reduce((sum, step) => sum + step.expectedSeconds, 0);
    // New formula with station parallelization:
    // EJD = Setup + MakeReady + Math.ceil((EKD × Qty) ÷ StationCount) + TakeDown
    const totalKitTime = kitDuration * formData.orderedQuantity;
    const parallelizedKitTime = Math.ceil(totalKitTime / formData.stationCount);
    const jobDuration = formData.setup + formData.makeReady + parallelizedKitTime + formData.takeDown;

    setFormData(prev => ({
      ...prev,
      expectedKitDuration: kitDuration,
      expectedJobDuration: jobDuration
    }));
  };

  useEffect(() => {
    calculateDurations();
  }, [formData.routeSteps, formData.orderedQuantity, formData.setup, formData.makeReady, formData.takeDown, formData.stationCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isNewJob ? apiUrl('/api/kitting-jobs') : apiUrl(`/api/kitting-jobs/${jobId}`);
      const method = isNewJob ? 'POST' : 'PATCH';

      // Prepare job data - exclude routeSteps for updates
      const { routeSteps, ...jobData } = formData;
      const jobPayload = {
        ...jobData,
        dueDate: new Date(formData.dueDate).toISOString(),
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : null,
        scheduledStartTime: formData.scheduledStartTime || null,
      };

      // For create, include routeSteps in the main payload
      if (isNewJob) {
        jobPayload.routeSteps = routeSteps;
      }


      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        setError(errorData.error || `Failed to save job: ${response.status} ${response.statusText}`);
        return;
      }

      // For updates, separately update route steps using bulk-update endpoint
      if (!isNewJob && routeSteps && routeSteps.length > 0) {
        const routeStepsPayload = {
          jobId,
          routeSteps: routeSteps.map(({ id, kittingJobId, ...step }) => step)
        };

        const routeStepsResponse = await fetch(apiUrl('/api/route-steps/bulk-update'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(routeStepsPayload),
        });

        if (!routeStepsResponse.ok) {
          const errorData = await routeStepsResponse.json();
          setError(errorData.error || 'Failed to update route steps');
          return;
        }
      }

      // Dispatch event to notify other components that jobs have been updated
      window.dispatchEvent(new CustomEvent('jobsUpdated'));
      alert(isNewJob ? 'Job created successfully!' : 'Job updated successfully!');
      navigate('/admin');
    } catch (err) {
      console.error('Error saving job:', err);
      setError(`Error saving job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading && !isNewJob) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {isNewJob ? 'Create New Job' : `Edit Job ${formData.jobNumber}`}
            </h1>
            <button
              onClick={() => navigate('/admin')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Job Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CustomerAutocomplete
                value={formData.customerName}
                onChange={(value, companyId) => {
                  setFormData(prev => ({
                    ...prev,
                    customerName: value,
                    companyId: companyId
                  }));
                }}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Number *</label>
                <input
                  type="text"
                  required
                  value={formData.jobNumber}
                  onChange={(e) => handleInputChange('jobNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Spec</label>
                <input
                  type="text"
                  value={formData.customerSpec}
                  onChange={(e) => handleInputChange('customerSpec', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordered Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.orderedQuantity}
                  onChange={(e) => handleInputChange('orderedQuantity', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Run Length</label>
                <input
                  type="number"
                  min="1"
                  value={formData.runLength}
                  onChange={(e) => handleInputChange('runLength', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Start Time</label>
                <input
                  type="time"
                  value={formData.scheduledStartTime}
                  onChange={(e) => handleInputChange('scheduledStartTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Execution Interface *</label>
                <select
                  value={formData.executionInterface}
                  onChange={(e) => handleInputChange('executionInterface', e.target.value as 'STEPS' | 'TARGET' | 'BASIC')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="STEPS">📋 Steps - Instruction-driven with media viewer</option>
                  <option value="TARGET">🎯 Target - Performance-focused circular view</option>
                  <option value="BASIC">⚡ Basic - One-button simplicity</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose how workers will interact with this job during execution</p>
              </div>
            </div>

            {/* Shift and Weekend Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Shift and Weekend Configuration</h3>
              <p className="text-sm text-gray-600 mb-4">
                Control which shifts this job can run on and whether it can be scheduled on weekends.
                By default, jobs use the globally active shifts and weekday-only scheduling.
              </p>

              {/* Shift Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed Shifts
                </label>
                <ShiftSelector
                  value={formData.allowedShiftIds}
                  onChange={(shiftIds) => handleInputChange('allowedShiftIds', shiftIds)}
                />
              </div>

              {/* Weekend Toggle */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includeWeekends}
                    onChange={(e) => handleInputChange('includeWeekends', e.target.checked)}
                    className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Include Weekends in Scheduling</div>
                    <div className="text-sm text-gray-600 mt-1">
                      When enabled, this job can be scheduled on Saturdays and Sundays.
                      Useful for rush jobs that need to finish faster than normal weekday-only scheduling allows.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Time Estimates */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Time Estimates (seconds)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Setup Time</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.setup}
                    onChange={(e) => handleInputChange('setup', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make Ready</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.makeReady}
                    onChange={(e) => handleInputChange('makeReady', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Take Down</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.takeDown}
                    onChange={(e) => handleInputChange('takeDown', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Calculated Durations - Read Only */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Expected Kit Duration:</span>
                    <span className="ml-2 text-gray-900">{formData.expectedKitDuration}s ({formatDuration(formData.expectedKitDuration)})</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Expected Job Duration:</span>
                    <span className="ml-2 text-gray-900">{formData.expectedJobDuration}s ({formatDuration(formData.expectedJobDuration)})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Station Planning */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Station Planning</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure how many stations will work on this job simultaneously.
                Each station requires 2 kitters + 0.5 runner (rounded up to whole people).
                More stations = faster completion, but higher resource requirements.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Stations
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.stationCount}
                      onChange={(e) => handleInputChange('stationCount', parseInt(e.target.value) || 1)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Typical: 1-10 stations</p>
                  </div>

                  <div className="bg-white border border-gray-300 rounded-md p-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Resource Requirements:</div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Total People:</span>
                        <span className="font-medium text-gray-900">{formData.stationCount * 2 + Math.ceil(formData.stationCount * 0.5)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kitters:</span>
                        <span className="font-medium text-gray-900">{formData.stationCount * 2}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Runners:</span>
                        <span className="font-medium text-gray-900">{Math.ceil(formData.stationCount * 0.5)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {formData.stationCount > 1 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    <strong>ℹ️ Note:</strong> With {formData.stationCount} stations, kit production time will be parallelized,
                    reducing total job duration. Setup, make-ready, and take-down times remain constant.
                  </div>
                )}
              </div>
            </div>

            {/* Route Steps */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Route Steps</h3>

              {formData.routeSteps.map((step, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">Step {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeRouteStep(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Step Name *</label>
                      <input
                        type="text"
                        required
                        value={step.name}
                        onChange={(e) => updateRouteStep(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expected Seconds *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={step.expectedSeconds}
                        onChange={(e) => updateRouteStep(index, 'expectedSeconds', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Instruction Type</label>
                      <select
                        value={step.instructionType}
                        onChange={(e) => updateRouteStep(index, 'instructionType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="NONE">None</option>
                        <option value="TEXT">Text</option>
                        <option value="IMAGE">Image</option>
                        <option value="VIDEO">Video</option>
                      </select>
                    </div>

                    {step.instructionType !== 'NONE' && step.instructionType !== 'TEXT' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Instruction URL</label>
                        <input
                          type="url"
                          value={step.instructionUrl || ''}
                          onChange={(e) => updateRouteStep(index, 'instructionUrl', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {step.instructionType === 'TEXT' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Instruction Text</label>
                        <textarea
                          value={step.instructionText || ''}
                          onChange={(e) => updateRouteStep(index, 'instructionText', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {step.instructionType === 'VIDEO' && (
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={step.autoLoop}
                            onChange={(e) => updateRouteStep(index, 'autoLoop', e.target.checked)}
                            className="mr-2"
                          />
                          Auto Loop Video
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {formData.routeSteps.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No route steps defined. Click "Add Step" to create the first step.
                </div>
              )}

              {/* Add Step Button */}
              <button
                type="button"
                onClick={addRouteStep}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg mt-4"
              >
                + Add Step
              </button>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving...' : (isNewJob ? 'Create Job' : 'Update Job')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditJob;