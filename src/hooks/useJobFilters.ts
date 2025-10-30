import { useState, useEffect, useMemo } from 'react';
import { KittingJob } from '../types/kitting';

interface JobFilters {
  visibleJobIds: Set<string>;
  searchQuery: string;
  statusFilters: Set<string>;
  densityMode: 'compact' | 'normal' | 'comfortable';
}

const STORAGE_KEY = 'kittrix-job-filters';

export function useJobFilters(jobs: KittingJob[]) {
  const [filters, setFilters] = useState<JobFilters>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [filters]);

  // Sync visible job IDs when jobs list changes (for new jobs)
  useEffect(() => {
    if (jobs.length > 0) {
      setFilters(prev => {
        const currentIds = new Set(prev.visibleJobIds);
        const newJobIds = jobs.filter(j => !currentIds.has(j.id)).map(j => j.id);

        // Add any new jobs to visible set
        if (newJobIds.length > 0) {
          newJobIds.forEach(id => currentIds.add(id));
          return { ...prev, visibleJobIds: currentIds };
        }

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
    return filteredJobs.filter(job => filters.visibleJobIds.has(job.id));
  }, [filteredJobs, filters.visibleJobIds]);

  // Helper functions
  const toggleJobVisibility = (jobId: string) => {
    setFilters(prev => {
      const newVisible = new Set(prev.visibleJobIds);
      if (newVisible.has(jobId)) {
        newVisible.delete(jobId);
      } else {
        newVisible.add(jobId);
      }
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
    setFilters(prev => ({
      ...prev,
      visibleJobIds: new Set(filteredJobs.map(j => j.id))
    }));
  };

  const deselectAll = () => {
    setFilters(prev => ({
      ...prev,
      visibleJobIds: new Set()
    }));
  };

  const resetFilters = () => {
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
