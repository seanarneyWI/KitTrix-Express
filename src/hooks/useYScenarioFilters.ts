import { useState, useEffect, useMemo } from 'react';

interface Scenario {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  changes: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface YScenarioFilters {
  visibleScenarioIds: Set<string>;
  searchQuery: string;
  groupBy: 'none' | 'job#' | 'customer' | 'status';
}

const STORAGE_KEY = 'kittrix-y-scenario-filters';

/**
 * Hook for managing Y scenario overlay filters
 *
 * Similar to useJobFilters but for Y scenarios.
 * Controls which scenarios are visible as overlays on the calendar.
 */
export function useYScenarioFilters(scenarios: Scenario[]) {
  const [filters, setFilters] = useState<YScenarioFilters>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          visibleScenarioIds: new Set(parsed.visibleScenarioIds || []),
          searchQuery: '',
          groupBy: parsed.groupBy || 'none'
        };
      } catch (e) {
        console.error('Failed to load Y scenario filters from localStorage:', e);
      }
    }

    // Default: no scenarios visible (user must explicitly enable overlays)
    return {
      visibleScenarioIds: new Set<string>(),
      searchQuery: '',
      groupBy: 'none' as const
    };
  });

  // Save to localStorage whenever filters change
  useEffect(() => {
    const toSave = {
      visibleScenarioIds: Array.from(filters.visibleScenarioIds),
      groupBy: filters.groupBy
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [filters]);

  // Filter scenarios based on search query
  const filteredScenarios = useMemo(() => {
    let result = scenarios;

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(scenario =>
        scenario.name.toLowerCase().includes(query) ||
        (scenario.description && scenario.description.toLowerCase().includes(query))
      );
    }

    return result;
  }, [scenarios, filters.searchQuery]);

  // Get visible scenarios (filtered by visibility checkboxes)
  const visibleScenarios = useMemo(() => {
    return filteredScenarios.filter(scenario =>
      filters.visibleScenarioIds.has(scenario.id)
    );
  }, [filteredScenarios, filters.visibleScenarioIds]);

  // Helper functions
  const toggleScenarioVisibility = (scenarioId: string) => {
    setFilters(prev => {
      const newVisible = new Set(prev.visibleScenarioIds);
      if (newVisible.has(scenarioId)) {
        newVisible.delete(scenarioId);
      } else {
        newVisible.add(scenarioId);
      }
      return { ...prev, visibleScenarioIds: newVisible };
    });
  };

  const setSearchQuery = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const setGroupBy = (groupBy: 'none' | 'job#' | 'customer' | 'status') => {
    setFilters(prev => ({ ...prev, groupBy }));
  };

  const selectAll = () => {
    setFilters(prev => ({
      ...prev,
      visibleScenarioIds: new Set(filteredScenarios.map(s => s.id))
    }));
  };

  const deselectAll = () => {
    setFilters(prev => ({
      ...prev,
      visibleScenarioIds: new Set()
    }));
  };

  const resetFilters = () => {
    setFilters({
      visibleScenarioIds: new Set(),
      searchQuery: '',
      groupBy: 'none'
    });
  };

  const hiddenScenarioCount = filteredScenarios.length - visibleScenarios.length;

  return {
    // State
    visibleScenarios,
    filteredScenarios,
    searchQuery: filters.searchQuery,
    groupBy: filters.groupBy,
    hiddenScenarioCount,

    // Actions
    toggleScenarioVisibility,
    setSearchQuery,
    setGroupBy,
    selectAll,
    deselectAll,
    resetFilters,

    // Checks
    isScenarioVisible: (scenarioId: string) =>
      filters.visibleScenarioIds.has(scenarioId)
  };
}
