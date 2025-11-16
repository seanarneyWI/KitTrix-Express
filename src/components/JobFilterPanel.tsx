import React, { useState, useEffect } from 'react';
import { KittingJob } from '../types/kitting';
import { formatDuration } from '../utils/kittingCalculations';
import DelayManager from './DelayManager';

interface Scenario {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  changes: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface JobFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filteredJobs: KittingJob[];
  visibleJobs: KittingJob[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilters: Set<string>;
  onToggleStatusFilter: (status: string) => void;
  densityMode: 'compact' | 'normal' | 'comfortable';
  onDensityChange: (mode: 'compact' | 'normal' | 'comfortable') => void;
  onToggleJobVisibility: (jobId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onResetFilters: () => void;
  onJumpToJob: (job: KittingJob) => void;
  isJobVisible: (jobId: string) => boolean;
  hiddenJobCount: number;
  // Y Scenario props
  allScenarios?: Scenario[];
  visibleScenarios?: Scenario[];
  onToggleScenarioVisibility?: (scenarioId: string) => void;
  isScenarioVisible?: (scenarioId: string) => boolean;
  yOverlayCount?: number;
  allJobs?: KittingJob[];  // All jobs for delay editor
  delayManagerContext?: { scenarioId?: string; jobId?: string } | null; // Context from job card button
  // Scenario CRUD operations
  onCreateScenario?: (name: string, description?: string, sourceJobId?: string) => Promise<void>;
  onCommitScenario?: (scenarioId: string) => Promise<void>;
  onDeleteScenario?: (scenarioId: string) => Promise<void>;
}

const JobFilterPanel: React.FC<JobFilterPanelProps> = ({
  isOpen,
  onClose,
  filteredJobs,
  visibleJobs,
  searchQuery,
  onSearchChange,
  statusFilters,
  onToggleStatusFilter,
  densityMode,
  onDensityChange,
  onToggleJobVisibility,
  onSelectAll,
  onDeselectAll,
  onResetFilters,
  onJumpToJob,
  isJobVisible,
  hiddenJobCount,
  // Y Scenario props
  allScenarios = [],
  visibleScenarios = [],
  onToggleScenarioVisibility,
  isScenarioVisible,
  yOverlayCount = 0,
  allJobs = [],
  delayManagerContext = null,
  onCreateScenario,
  onCommitScenario,
  onDeleteScenario
}) => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'yoverlays'>('jobs');
  const [groupBy, setGroupBy] = useState<'none' | 'job#' | 'customer' | 'status'>('none');
  const [delayManagerState, setDelayManagerState] = useState<{
    isOpen: boolean;
    defaultScenarioId?: string;
    defaultJobId?: string;
  }>({
    isOpen: false,
    defaultScenarioId: undefined,
    defaultJobId: undefined
  });

  // Scenario modal states
  const [showCreateScenarioModal, setShowCreateScenarioModal] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');
  const [selectedBaseJobId, setSelectedBaseJobId] = useState('');
  const [scenarioToCommit, setScenarioToCommit] = useState<Scenario | null>(null);
  const [scenarioToDelete, setScenarioToDelete] = useState<Scenario | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());

  // Auto-open DelayManager when context is provided from job card button
  useEffect(() => {
    if (delayManagerContext?.scenarioId || delayManagerContext?.jobId) {
      console.log('⏰ Opening Delay Manager from context:', delayManagerContext);
      setDelayManagerState({
        isOpen: true,
        defaultScenarioId: delayManagerContext.scenarioId,
        defaultJobId: delayManagerContext.jobId
      });
      setActiveTab('yoverlays'); // Switch to Y Overlays tab
    }
  }, [delayManagerContext]);

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

  // Group jobs by job#, customer, or status
  const groupedJobs = React.useMemo(() => {
    if (groupBy === 'job#') {
      const groups = new Map<string, KittingJob[]>();
      filteredJobs.forEach(job => {
        const jobNum = job.jobNumber || 'Unknown';
        if (!groups.has(jobNum)) {
          groups.set(jobNum, []);
        }
        groups.get(jobNum)!.push(job);
      });
      return Array.from(groups.entries()).map(([name, jobs]) => ({ name, jobs, isExpanded: true }));
    } else if (groupBy === 'customer') {
      const groups = new Map<string, KittingJob[]>();
      filteredJobs.forEach(job => {
        const customer = job.customerName || 'Unknown';
        if (!groups.has(customer)) {
          groups.set(customer, []);
        }
        groups.get(customer)!.push(job);
      });
      return Array.from(groups.entries()).map(([name, jobs]) => ({
        name,
        jobs,
        isExpanded: true
      }));
    } else if (groupBy === 'status') {
      const groups = new Map<string, KittingJob[]>();
      filteredJobs.forEach(job => {
        const status = job.status || 'UNKNOWN';
        if (!groups.has(status)) {
          groups.set(status, []);
        }
        groups.get(status)!.push(job);
      });
      return Array.from(groups.entries()).map(([name, jobs]) => ({
        name,
        jobs,
        isExpanded: true
      }));
    }
    return [{ name: 'All Jobs', jobs: filteredJobs, isExpanded: true }];
  }, [filteredJobs, groupBy]);

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

  // Scenario CRUD handlers
  const handleCreateScenario = async () => {
    if (!newScenarioName.trim() || !onCreateScenario) return;

    setIsCreating(true);
    try {
      await onCreateScenario(
        newScenarioName.trim(),
        newScenarioDescription.trim() || undefined,
        selectedBaseJobId || undefined
      );
      // Reset form
      setNewScenarioName('');
      setNewScenarioDescription('');
      setSelectedBaseJobId('');
      setShowCreateScenarioModal(false);
    } catch (error) {
      console.error('Failed to create scenario:', error);
      alert('Failed to create scenario. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCommitScenario = async (scenario: Scenario) => {
    if (!onCommitScenario) return;

    try {
      await onCommitScenario(scenario.id);
      setScenarioToCommit(null);
    } catch (error) {
      console.error('Failed to commit scenario:', error);
      alert('Failed to commit scenario: ' + (error as Error).message);
    }
  };

  const handleDeleteScenario = async (scenario: Scenario) => {
    if (!onDeleteScenario) return;

    try {
      await onDeleteScenario(scenario.id);
      setScenarioToDelete(null);
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      alert('Failed to delete scenario. Please try again.');
    }
  };

  const toggleChangeExpansion = (scenarioId: string) => {
    const newExpanded = new Set(expandedChanges);
    if (newExpanded.has(scenarioId)) {
      newExpanded.delete(scenarioId);
    } else {
      newExpanded.add(scenarioId);
    }
    setExpandedChanges(newExpanded);
  };

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity duration-250"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-250 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-200 transition-colors"
              title="Close (Esc)"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'jobs'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              📋 Y (Production)
            </button>
            <button
              onClick={() => setActiveTab('yoverlays')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'yoverlays'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              🔮 Ŷ (Scenarios)
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={onSelectAll}
              className="flex-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md border border-green-200 transition-colors"
              title="Show all jobs"
            >
              ☑ All
            </button>
            <button
              onClick={onDeselectAll}
              className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors"
              title="Hide all jobs"
            >
              ☐ None
            </button>
            <button
              onClick={onResetFilters}
              className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
              title="Reset all filters"
            >
              ↻ Reset
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search jobs..."
              className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Status Filters */}
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">Status Filters</label>
            <div className="flex flex-wrap gap-2">
              {['SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'].map(status => (
                <button
                  key={status}
                  onClick={() => onToggleStatusFilter(status)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    statusFilters.has(status)
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Group By */}
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">Group By</label>
            <div className="grid grid-cols-2 gap-2">
              {(['none', 'job#', 'customer', 'status'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setGroupBy(mode)}
                  className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                    groupBy === mode
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'job#' ? 'Job #' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'jobs' ? (
            <>
              <div className="text-xs text-gray-500 mb-3">
                {visibleJobs.length} of {filteredJobs.length} jobs visible
                {hiddenJobCount > 0 && <span className="text-orange-600 font-medium"> ({hiddenJobCount} hidden)</span>}
              </div>

              {groupedJobs.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-4">
              {groupBy !== 'none' && (
                <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  <div className="h-px flex-1 bg-gray-300" />
                  <span>{group.name}</span>
                  <div className="h-px flex-1 bg-gray-300" />
                </div>
              )}

              <div className="space-y-2">
                {group.jobs.map(job => {
                  const visible = isJobVisible(job.id);
                  return (
                    <div
                      key={job.id}
                      className={`border rounded-lg p-3 transition-all cursor-pointer hover:shadow-md ${
                        visible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'
                      }`}
                      onClick={() => onJumpToJob(job)}
                    >
                      <div className="flex items-start gap-2">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={visible}
                          onChange={(e) => {
                            e.stopPropagation();
                            onToggleJobVisibility(job.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />

                        {/* Job Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-gray-900">{job.jobNumber}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusBadgeColor(job.status)}`}>
                              {job.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="text-sm text-gray-700 font-medium truncate" title={job.customerName}>
                            {job.customerName}
                          </div>

                          <div className="text-xs text-gray-500 mt-1">
                            {job.description}
                          </div>

                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span title="Duration">⏱ {formatDuration(job.expectedJobDuration)}</span>
                            <span title="Start Date">📅 {formatJobDates(job)}</span>
                            <span title="Quantity">📦 {job.orderedQuantity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

              {filteredJobs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">No jobs match your filters</p>
                </div>
              )}
            </>
          ) : (
            /* Y Overlays Tab Content */
            <>
              <div className="flex justify-between items-center mb-3">
                <div className="text-xs text-gray-500">
                  {visibleScenarios.length} of {allScenarios.length} scenarios visible
                  {yOverlayCount > 0 && <span className="text-purple-600 font-medium"> ({yOverlayCount} active overlays)</span>}
                </div>
                <button
                  onClick={() => setShowCreateScenarioModal(true)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                >
                  <span>+</span>
                  <span>New Scenario</span>
                </button>
              </div>

              {allScenarios.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔮</div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">No Y Scenarios Yet</h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Create what-if scenarios to overlay and compare on the calendar
                  </p>
                  <button
                    onClick={() => setShowCreateScenarioModal(true)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors text-sm"
                  >
                    + Create First Scenario
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {allScenarios.map(scenario => {
                    const visible = isScenarioVisible?.(scenario.id) || false;
                    const isActive = scenario.isActive;
                    return (
                      <div
                        key={scenario.id}
                        className={`border rounded-lg p-3 transition-all ${
                          visible ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'
                        } ${isActive ? 'ring-2 ring-purple-400' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={visible}
                            onChange={(e) => {
                              e.stopPropagation();
                              onToggleScenarioVisibility?.(scenario.id);
                            }}
                            className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                          />

                          {/* Scenario Info */}
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{scenario.name}</span>
                                {isActive && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-500 text-white">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                            </div>

                            {scenario.description && (
                              <div className="text-sm text-gray-600 mb-2">
                                {scenario.description}
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                              <button
                                onClick={() => toggleChangeExpansion(scenario.id)}
                                className="hover:text-purple-600 transition-colors"
                                title={expandedChanges.has(scenario.id) ? "Collapse changes" : "Expand changes"}
                              >
                                {expandedChanges.has(scenario.id) ? '▼' : '▶'} {scenario.changes.length} {scenario.changes.length === 1 ? 'change' : 'changes'}
                              </button>
                              <span title="Created">
                                📅 {new Date(scenario.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Expandable Change List */}
                            {expandedChanges.has(scenario.id) && scenario.changes.length > 0 && (
                              <div className="mt-2 mb-2 space-y-1 pl-2 border-l-2 border-purple-200">
                                {scenario.changes.slice(0, 5).map((change: any, idx: number) => {
                                  const jobNumber = change.changeData?.jobNumber || change.jobId || 'Unknown';
                                  const operation = change.operation;
                                  const desc = operation === 'MODIFY'
                                    ? `${jobNumber} → ${change.changeData?.scheduledDate ? new Date(change.changeData.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'rescheduled'}`
                                    : operation === 'ADD'
                                    ? `Add ${jobNumber}`
                                    : `Remove ${jobNumber}`;

                                  return (
                                    <div key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                                      <span className={
                                        operation === 'ADD' ? 'text-green-600' :
                                        operation === 'MODIFY' ? 'text-yellow-600' :
                                        'text-red-600'
                                      }>
                                        {operation === 'ADD' ? '➕' : operation === 'MODIFY' ? '✏️' : '🗑️'}
                                      </span>
                                      <span>{desc}</span>
                                    </div>
                                  );
                                })}
                                {scenario.changes.length > 5 && (
                                  <div className="text-xs text-gray-400 italic">
                                    +{scenario.changes.length - 5} more...
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDelayManagerState({
                                    isOpen: true,
                                    defaultScenarioId: scenario.id
                                  });
                                }}
                                className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors flex items-center gap-1"
                                title="Manage delays"
                              >
                                ⏰ Delays
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open edit scenario modal
                                  setNewScenarioName(scenario.name);
                                  setNewScenarioDescription(scenario.description || '');
                                  setShowCreateScenarioModal(true);
                                  // TODO: Add edit mode state to differentiate create vs edit
                                }}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                                title="Edit scenario"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScenarioToCommit(scenario);
                                }}
                                className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                                title="Commit to production"
                              >
                                ✅ Commit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScenarioToDelete(scenario);
                                }}
                                className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                                title="Delete scenario"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Density Controls */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">Calendar Density</label>
          <div className="flex gap-2">
            {(['compact', 'normal', 'comfortable'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => onDensityChange(mode)}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                  densityMode === mode
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Scenario Modal */}
      {showCreateScenarioModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-xl font-bold mb-4">Create New Scenario</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Job (Optional)
                </label>
                <select
                  value={selectedBaseJobId}
                  onChange={(e) => setSelectedBaseJobId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                >
                  <option value="">No job (blank scenario)</option>
                  {allJobs.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.jobNumber} - {job.customerName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a job to start with a copy of its current schedule
                </p>
              </div>

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
                  setShowCreateScenarioModal(false);
                  setNewScenarioName('');
                  setNewScenarioDescription('');
                  setSelectedBaseJobId('');
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

      {/* Commit Scenario Modal */}
      {scenarioToCommit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-xl font-bold mb-4">Commit Scenario to Production</h3>

            <div className="space-y-3 mb-6">
              <div>
                <span className="font-semibold text-gray-900">{scenarioToCommit.name}</span>
                {scenarioToCommit.description && (
                  <p className="text-sm text-gray-600 mt-1">{scenarioToCommit.description}</p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-900 font-medium mb-1">
                  ⚠️ This will permanently apply {scenarioToCommit.changes.length} {scenarioToCommit.changes.length === 1 ? 'change' : 'changes'} to production
                </p>
                <p className="text-xs text-yellow-800">
                  This action cannot be undone. The scenario will be deleted after committing.
                </p>
              </div>

              {/* Change preview */}
              {scenarioToCommit.changes.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2">
                  {scenarioToCommit.changes.slice(0, 10).map((change: any, idx: number) => {
                    const jobNumber = change.changeData?.jobNumber || change.jobId || 'Unknown';
                    const operation = change.operation;
                    return (
                      <div key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                        <span className={
                          operation === 'ADD' ? 'text-green-600' :
                          operation === 'MODIFY' ? 'text-yellow-600' :
                          'text-red-600'
                        }>
                          {operation === 'ADD' ? '➕' : operation === 'MODIFY' ? '✏️' : '🗑️'}
                        </span>
                        <span>{operation} {jobNumber}</span>
                      </div>
                    );
                  })}
                  {scenarioToCommit.changes.length > 10 && (
                    <div className="text-xs text-gray-400 italic">
                      +{scenarioToCommit.changes.length - 10} more...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCommitScenario(scenarioToCommit)}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                ✅ Commit to Production
              </button>
              <button
                onClick={() => setScenarioToCommit(null)}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Scenario Confirmation */}
      {scenarioToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-xl font-bold mb-4">Delete Scenario</h3>

            <div className="space-y-3 mb-6">
              <p className="text-gray-800">
                Are you sure you want to delete <span className="font-semibold">"{scenarioToDelete.name}"</span>?
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-900 font-medium mb-1">
                  ⚠️ This will permanently delete this scenario and all {scenarioToDelete.changes.length} {scenarioToDelete.changes.length === 1 ? 'change' : 'changes'}
                </p>
                <p className="text-xs text-red-800">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteScenario(scenarioToDelete)}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                🗑️ Delete Scenario
              </button>
              <button
                onClick={() => setScenarioToDelete(null)}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delay Manager Modal */}
      <DelayManager
        isOpen={delayManagerState.isOpen}
        onClose={() => setDelayManagerState({ isOpen: false, defaultScenarioId: undefined, defaultJobId: undefined })}
        allScenarios={allScenarios}
        allJobs={allJobs}
        defaultScenarioId={delayManagerState.defaultScenarioId}
        defaultJobId={delayManagerState.defaultJobId}
        onDelaysChanged={() => {
          console.log('⏰ Delays changed, refreshing scenarios...');
          // The parent component will handle refreshing scenario data
        }}
      />
    </>
  );
};

export default JobFilterPanel;
