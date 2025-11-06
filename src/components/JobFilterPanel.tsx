import React, { useState, useEffect } from 'react';
import { KittingJob } from '../types/kitting';
import { formatDuration } from '../utils/kittingCalculations';

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
  yOverlayCount = 0
}) => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'yoverlays'>('jobs');
  const [groupBy, setGroupBy] = useState<'none' | 'job#' | 'customer' | 'status'>('none');

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
              📋 Jobs
            </button>
            <button
              onClick={() => setActiveTab('yoverlays')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'yoverlays'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              🔮 Y Overlays
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
              <div className="text-xs text-gray-500 mb-3">
                {visibleScenarios.length} of {allScenarios.length} scenarios visible
                {yOverlayCount > 0 && <span className="text-purple-600 font-medium"> ({yOverlayCount} active overlays)</span>}
              </div>

              {allScenarios.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔮</div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">No Y Scenarios Yet</h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Create what-if scenarios to overlay and compare on the calendar
                  </p>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 text-left max-w-sm mx-auto">
                    <p className="text-xs text-purple-900 font-medium mb-2">How to create scenarios:</p>
                    <ol className="text-xs text-purple-800 space-y-1 list-decimal list-inside">
                      <li>Click the "🔮 What-If" button</li>
                      <li>Create a new scenario</li>
                      <li>Make changes (drag jobs, etc.)</li>
                      <li>Return here to overlay it</li>
                    </ol>
                  </div>
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
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{scenario.name}</span>
                              {isActive && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-500 text-white">
                                  ACTIVE
                                </span>
                              )}
                            </div>

                            {scenario.description && (
                              <div className="text-sm text-gray-600 mb-2">
                                {scenario.description}
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span title="Changes">
                                ✏️ {scenario.changes.length} {scenario.changes.length === 1 ? 'change' : 'changes'}
                              </span>
                              <span title="Created">
                                📅 {new Date(scenario.createdAt).toLocaleDateString()}
                              </span>
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
    </>
  );
};

export default JobFilterPanel;
