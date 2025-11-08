import { useState, useEffect, useMemo, useRef } from 'react';
import { KittingJob } from '../types/kitting';

interface JobFilters {
  visibleJobIds: Set<string>;
  searchQuery: string;
  statusFilters: Set<string>;
  densityMode: 'compact' | 'normal' | 'comfortable';
}

const STORAGE_KEY = 'kittrix-job-filters';

export function useJobFilters(jobs: KittingJob[]) {
  console.log(`🔧 useJobFilters: Hook called with ${jobs.length} jobs`);

  // Track previous job IDs to detect truly new jobs (not just array reference changes)
  const prevJobIdsRef = useRef<Set<string>>(new Set());

  const [filters, setFilters] = useState<JobFilters>(() => {
    console.log(`🔧 useJobFilters: Initializing state (this should only happen once)`);
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log(`   📦 Loaded from localStorage: ${parsed.visibleJobIds?.length || 0} visible job IDs`);
        return {
          visibleJobIds: new Set(parsed.visibleJobIds || jobs.map(j => j.id)),
          searchQuery: '',
          statusFilters: new Set(parsed.statusFilters || ['SCHEDULED', 'IN_PROGRESS', 'PAUSED']),
          densityMode: parsed.densityMode || 'normal'
        };
      } catch (e) {
        console.error('Failed to load job filters from localStorage:', e);
      }
    }

    // Default: show all jobs
    console.log(`   ⚠️ No localStorage found - defaulting to show all ${jobs.length} jobs`);
    return {
      visibleJobIds: new Set(jobs.map(j => j.id)),
      searchQuery: '',
      statusFilters: new Set(['SCHEDULED', 'IN_PROGRESS', 'PAUSED']),
      densityMode: 'normal' as const
    };
  });

  // Save to localStorage whenever filters change
  useEffect(() => {
    const toSave = {
      visibleJobIds: Array.from(filters.visibleJobIds),
      statusFilters: Array.from(filters.statusFilters),
      densityMode: filters.densityMode
    };
    console.log(`💾 Saving to localStorage: ${toSave.visibleJobIds.length} visible jobs`);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [filters]);

  // Sync visible job IDs when jobs list changes (for new jobs)
  // IMPORTANT: Only add jobs that are truly new (not in previous jobs array)
  // This prevents filter reset when jobs array reference changes (e.g., during what-if modifications)
  useEffect(() => {
    if (jobs.length > 0) {
      const currentJobIds = new Set(jobs.map(j => j.id));

      setFilters(prev => {
        const currentVisible = new Set(prev.visibleJobIds);

        // Find truly new jobs: jobs that are in current jobs array but weren't in previous jobs array
        const trulyNewJobIds = jobs
          .filter(j => !prevJobIdsRef.current.has(j.id))
          .map(j => j.id);

        // Add only truly new jobs to visible set
        if (trulyNewJobIds.length > 0) {
          console.log(`🔍 useJobFilters: Adding ${trulyNewJobIds.length} truly new jobs to visible set`);
          console.log(`   Previous visible count: ${currentVisible.size}`);
          trulyNewJobIds.forEach(id => currentVisible.add(id));
          console.log(`   New visible count: ${currentVisible.size}`);

          // Update the ref for next comparison
          prevJobIdsRef.current = currentJobIds;

          return { ...prev, visibleJobIds: currentVisible };
        }

        // Update the ref even if no new jobs (to track current state)
        prevJobIdsRef.current = currentJobIds;

        console.log(`🔍 useJobFilters: Jobs changed but no truly new jobs. Visible count: ${currentVisible.size}/${jobs.length}`);
        return prev;
      });
    }
  }, [jobs]);

  // Filter jobs based on search and status
  const filteredJobs = useMemo(() => {
    let result = jobs;

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(job =>
        job.jobNumber.toLowerCase().includes(query) ||
        job.customerName.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.statusFilters.size > 0) {
      result = result.filter(job =>
        filters.statusFilters.has(job.status.toUpperCase())
      );
    }

    return result;
  }, [jobs, filters.searchQuery, filters.statusFilters]);

  // Get visible jobs (filtered by visibility checkboxes)
  const visibleJobs = useMemo(() => {
    const result = filteredJobs.filter(job => filters.visibleJobIds.has(job.id));
    console.log(`🔍 useJobFilters: visibleJobs calculated - ${result.length}/${filteredJobs.length} jobs visible`);
    return result;
  }, [filteredJobs, filters.visibleJobIds]);

  // Helper functions
  const toggleJobVisibility = (jobId: string) => {
    console.log(`🔍 toggleJobVisibility called for job: ${jobId}`);
    setFilters(prev => {
      const newVisible = new Set(prev.visibleJobIds);
      if (newVisible.has(jobId)) {
        console.log(`   Hiding job ${jobId}`);
        newVisible.delete(jobId);
      } else {
        console.log(`   Showing job ${jobId}`);
        newVisible.add(jobId);
      }
      console.log(`   New visible count: ${newVisible.size}`);
      return { ...prev, visibleJobIds: newVisible };
    });
  };

  const setSearchQuery = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const toggleStatusFilter = (status: string) => {
    setFilters(prev => {
      const newFilters = new Set(prev.statusFilters);
      if (newFilters.has(status)) {
        newFilters.delete(status);
      } else {
        newFilters.add(status);
      }
      return { ...prev, statusFilters: newFilters };
    });
  };

  const setDensityMode = (mode: 'compact' | 'normal' | 'comfortable') => {
    setFilters(prev => ({ ...prev, densityMode: mode }));
  };

  const selectAll = () => {
    console.log(`🔍 selectAll called - showing ${filteredJobs.length} jobs`);
    setFilters(prev => ({
      ...prev,
      visibleJobIds: new Set(filteredJobs.map(j => j.id))
    }));
  };

  const deselectAll = () => {
    console.log(`🔍 deselectAll called - hiding all jobs`);
    setFilters(prev => ({
      ...prev,
      visibleJobIds: new Set()
    }));
  };

  const resetFilters = () => {
    console.log(`🔍 resetFilters called - resetting to show all ${jobs.length} jobs`);
    console.trace('resetFilters call stack:');
    setFilters({
      visibleJobIds: new Set(jobs.map(j => j.id)),
      searchQuery: '',
      statusFilters: new Set(['SCHEDULED', 'IN_PROGRESS', 'PAUSED']),
      densityMode: 'normal'
    });
  };

  const hiddenJobCount = filteredJobs.length - visibleJobs.length;

  return {
    // State
    visibleJobs,
    filteredJobs,
    searchQuery: filters.searchQuery,
    statusFilters: filters.statusFilters,
    densityMode: filters.densityMode,
    hiddenJobCount,

    // Actions
    toggleJobVisibility,
    setSearchQuery,
    toggleStatusFilter,
    setDensityMode,
    selectAll,
    deselectAll,
    resetFilters,

    // Checks
    isJobVisible: (jobId: string) =>
      filters.visibleJobIds.has(jobId),
    isStatusFilterActive: (status: string) =>
      filters.statusFilters.has(status)
  };
}
