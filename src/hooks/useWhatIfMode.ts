import { useState, useEffect, useMemo } from 'react';
import { KittingJob } from '../types/kitting';
import { apiUrl } from '../config/api';
import { applyDelaysToJob, JobDelay } from '../utils/shiftScheduling';

interface Scenario {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  changes: ScenarioChange[];
  createdAt: Date;
  updatedAt: Date;
}

interface ScenarioChange {
  id: string;
  scenarioId: string;
  jobId?: string;
  operation: 'ADD' | 'MODIFY' | 'DELETE';
  changeData: any;
  originalData?: any;
  createdAt: Date;
}

/**
 * Custom hook for managing What-If scenario planning mode
 *
 * Features:
 * - Toggle between Production and What-If modes
 * - Create and manage scenarios
 * - Track changes (ADD, MODIFY, DELETE operations)
 * - Multi-window synchronization via BroadcastChannel
 * - Commit scenarios to production
 * - Discard scenarios without applying
 *
 * Usage:
 * const whatIf = useWhatIfMode(productionJobs);
 * const jobs = whatIf.jobs; // Returns production or what-if jobs based on mode
 */
export function useWhatIfMode(productionJobs: KittingJob[]) {
  const [mode, setMode] = useState<'production' | 'whatif'>('production');
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [allScenarios, setAllScenarios] = useState<Scenario[]>([]);
  const [visibleYScenarioIds, setVisibleYScenarioIds] = useState<Set<string>>(new Set());
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null);
  const [scenarioDelays, setScenarioDelays] = useState<Map<string, any[]>>(new Map());

  // Initialize BroadcastChannel for multi-window sync
  useEffect(() => {
    const channel = new BroadcastChannel('kittrix-whatif-sync');

    channel.onmessage = (event) => {
      const { type, data } = event.data;

      console.log('🔮 BroadcastChannel message received:', type, data);

      switch (type) {
        case 'mode-changed':
          setMode(data.mode);
          break;
        case 'scenario-activated':
          fetchActiveScenario();
          break;
        case 'scenario-committed':
          setMode('production');
          setActiveScenario(null);
          fetchScenarios();
          break;
        case 'scenario-discarded':
          setMode('production');
          setActiveScenario(null);
          fetchScenarios();
          break;
      }
    };

    setBroadcastChannel(channel);

    return () => {
      console.log('🔮 Closing BroadcastChannel');
      channel.close();
    };
  }, []);

  /**
   * Fetch delays for a specific scenario
   */
  const fetchScenarioDelays = async (scenarioId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/scenarios/${scenarioId}/delays`));
      if (!response.ok) {
        throw new Error(`Failed to fetch delays for scenario ${scenarioId}`);
      }
      const delays = await response.json();
      return delays;
    } catch (error) {
      console.error(`Failed to fetch delays for scenario ${scenarioId}:`, error);
      return [];
    }
  };

  /**
   * Fetch all scenarios from the server
   */
  const fetchScenarios = async () => {
    try {
      const response = await fetch(apiUrl('/api/scenarios'));
      if (!response.ok) {
        throw new Error(`Failed to fetch scenarios: ${response.statusText}`);
      }
      const scenarios = await response.json();
      setAllScenarios(scenarios);
      console.log(`🔮 Fetched ${scenarios.length} scenarios`);

      // Fetch delays for all scenarios
      const delaysMap = new Map<string, any[]>();
      for (const scenario of scenarios) {
        const delays = await fetchScenarioDelays(scenario.id);
        if (delays.length > 0) {
          delaysMap.set(scenario.id, delays);
          console.log(`  ⏰ Fetched ${delays.length} delays for scenario ${scenario.name}`);
        }
      }
      setScenarioDelays(delaysMap);
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
    }
  };

  /**
   * Fetch the currently active scenario
   */
  const fetchActiveScenario = async () => {
    try {
      const response = await fetch(apiUrl('/api/scenarios/active'));
      if (!response.ok) {
        throw new Error(`Failed to fetch active scenario: ${response.statusText}`);
      }
      const scenario = await response.json();

      if (scenario) {
        setActiveScenario(scenario);
        setMode('whatif');
        console.log(`🔮 Active scenario loaded: ${scenario.name} (${scenario.changes.length} changes)`);
      } else {
        setActiveScenario(null);
        setMode('production');
        console.log('🔮 No active scenario');
      }
    } catch (error) {
      console.error('Failed to fetch active scenario:', error);
    }
  };

  // Load scenarios on mount
  useEffect(() => {
    fetchScenarios();
    fetchActiveScenario();
  }, []);

  /**
   * Apply scenario changes to production jobs in memory
   * This creates a "what-if" view without modifying the actual database
   */
  const whatIfJobs = useMemo(() => {
    if (!activeScenario || mode === 'production') {
      return productionJobs;
    }

    console.log(`🔮 Applying ${activeScenario.changes.length} changes to ${productionJobs.length} production jobs`);

    let modifiedJobs = [...productionJobs];

    for (const change of activeScenario.changes) {
      switch (change.operation) {
        case 'ADD':
          // Add new job to list with visual indicator
          modifiedJobs.push({
            ...change.changeData,
            __whatif: 'added'  // Mark for visual indicator
          } as any);
          console.log(`  ➕ Added job: ${change.changeData.jobNumber || 'New Job'}`);
          break;

        case 'MODIFY':
          // Update existing job with visual indicator
          modifiedJobs = modifiedJobs.map(job =>
            job.id === change.jobId
              ? { ...job, ...change.changeData, __whatif: 'modified' } as any
              : job
          );
          console.log(`  ✏️ Modified job: ${change.jobId}`);
          break;

        case 'DELETE':
          // Mark job as deleted (keep in list with indicator for visual feedback)
          modifiedJobs = modifiedJobs.map(job =>
            job.id === change.jobId
              ? { ...job, __whatif: 'deleted' } as any
              : job
          );
          console.log(`  🗑️ Deleted job: ${change.jobId}`);
          break;
      }
    }

    return modifiedJobs;
  }, [productionJobs, activeScenario, mode]);

  /**
   * Create a new scenario
   */
  const createScenario = async (name: string, description?: string) => {
    try {
      const response = await fetch(apiUrl('/api/scenarios'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      if (!response.ok) {
        throw new Error(`Failed to create scenario: ${response.statusText}`);
      }

      const scenario = await response.json();
      await fetchScenarios();
      console.log(`🔮 Created scenario: ${scenario.name}`);
      return scenario;
    } catch (error) {
      console.error('Failed to create scenario:', error);
      throw error;
    }
  };

  /**
   * Activate a scenario (switches to what-if mode)
   */
  const activateScenario = async (scenarioId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/scenarios/${scenarioId}/activate`), {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error(`Failed to activate scenario: ${response.statusText}`);
      }

      const scenario = await response.json();
      setActiveScenario(scenario);
      setMode('whatif');

      // Broadcast to other windows
      broadcastChannel?.postMessage({
        type: 'scenario-activated',
        data: { scenarioId }
      });

      console.log(`🔮 Activated scenario: ${scenario.name}`);
      return scenario;
    } catch (error) {
      console.error('Failed to activate scenario:', error);
      throw error;
    }
  };

  /**
   * Add a change to the active scenario
   */
  const addChange = async (
    operation: 'ADD' | 'MODIFY' | 'DELETE',
    jobId: string | null,
    changeData: any,
    originalData?: any
  ) => {
    if (!activeScenario) {
      throw new Error('No active scenario');
    }

    try {
      const response = await fetch(apiUrl(`/api/scenarios/${activeScenario.id}/changes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          operation,
          changeData,
          originalData
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add change: ${response.statusText}`);
      }

      const change = await response.json();

      // Refresh active scenario to include new change
      await fetchActiveScenario();

      console.log(`🔮 Added ${operation} change to scenario`);
      return change;
    } catch (error) {
      console.error('Failed to add change:', error);
      throw error;
    }
  };

  /**
   * Commit scenario (promote all changes to production)
   */
  const commitScenario = async () => {
    if (!activeScenario) {
      throw new Error('No active scenario to commit');
    }

    try {
      console.log(`🔮 Committing scenario: ${activeScenario.name}...`);

      const response = await fetch(apiUrl(`/api/scenarios/${activeScenario.id}/commit`), {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to commit scenario');
      }

      const result = await response.json();
      console.log(`🔮 Scenario committed successfully:`, result.applied);

      setMode('production');
      setActiveScenario(null);

      // Broadcast to other windows
      broadcastChannel?.postMessage({
        type: 'scenario-committed'
      });

      // Refresh scenarios list
      await fetchScenarios();

      // Force page reload to get fresh production data
      window.location.reload();
    } catch (error) {
      console.error('Failed to commit scenario:', error);
      throw error;
    }
  };

  /**
   * Discard scenario (delete without applying changes)
   */
  const discardScenario = async () => {
    if (!activeScenario) {
      throw new Error('No active scenario to discard');
    }

    try {
      console.log(`🔮 Discarding scenario: ${activeScenario.name}...`);

      const response = await fetch(apiUrl(`/api/scenarios/${activeScenario.id}`), {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to discard scenario');
      }

      console.log(`🔮 Scenario discarded successfully`);

      setMode('production');
      setActiveScenario(null);

      // Broadcast to other windows
      broadcastChannel?.postMessage({
        type: 'scenario-discarded'
      });

      // Refresh scenarios list
      await fetchScenarios();
    } catch (error) {
      console.error('Failed to discard scenario:', error);
      throw error;
    }
  };

  /**
   * Switch between production and what-if modes
   */
  const switchMode = (newMode: 'production' | 'whatif') => {
    console.log(`🔮 Switching mode: ${mode} → ${newMode}`);
    setMode(newMode);

    // Broadcast to other windows
    broadcastChannel?.postMessage({
      type: 'mode-changed',
      data: { mode: newMode }
    });
  };

  /**
   * Toggle Y scenario visibility for overlay
   */
  const toggleYScenarioVisibility = (scenarioId: string) => {
    setVisibleYScenarioIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scenarioId)) {
        newSet.delete(scenarioId);
        console.log(`🔮 Hiding Y scenario overlay: ${scenarioId}`);
      } else {
        newSet.add(scenarioId);
        console.log(`🔮 Showing Y scenario overlay: ${scenarioId}`);
      }
      return newSet;
    });
  };

  /**
   * Get jobs from visible Y scenarios for overlay rendering
   */
  const yOverlayJobs = useMemo(() => {
    if (visibleYScenarioIds.size === 0) {
      return [];
    }

    const visibleScenarios = allScenarios.filter(s => visibleYScenarioIds.has(s.id));
    console.log(`🔮 Computing Y overlay jobs from ${visibleScenarios.length} visible scenarios`);

    const overlayJobs: any[] = [];

    visibleScenarios.forEach(scenario => {
      // Apply scenario changes to production jobs
      let modifiedJobs = [...productionJobs];

      for (const change of scenario.changes) {
        switch (change.operation) {
          case 'ADD':
            modifiedJobs.push({
              ...change.changeData,
              __yScenario: scenario.id,
              __yScenarioName: scenario.name
            } as any);
            break;

          case 'MODIFY':
            modifiedJobs = modifiedJobs.map(job =>
              job.id === change.jobId
                ? {
                    ...job,
                    ...change.changeData,
                    __yScenario: scenario.id,
                    __yScenarioName: scenario.name
                  } as any
                : job
            );
            break;

          case 'DELETE':
            // Mark job as deleted in Y scenario
            modifiedJobs = modifiedJobs.map(job =>
              job.id === change.jobId
                ? {
                    ...job,
                    __yScenario: scenario.id,
                    __yScenarioName: scenario.name,
                    __yScenarioDeleted: true
                  } as any
                : job
            );
            break;
        }
      }

      // Apply delays to jobs in this scenario
      const scenarioDelayList = scenarioDelays.get(scenario.id) || [];
      if (scenarioDelayList.length > 0) {
        console.log(`  ⏰ Applying ${scenarioDelayList.length} delays to scenario ${scenario.name}`);
        modifiedJobs = modifiedJobs.map(job => {
          // Get delays for this specific job
          const jobDelays = scenarioDelayList.filter((d: JobDelay) => d.jobId === job.id);
          if (jobDelays.length > 0) {
            return applyDelaysToJob(job, jobDelays);
          }
          return job;
        });
      }

      // Filter to only jobs modified by this scenario
      const scenarioJobs = modifiedJobs.filter(job => job.__yScenario === scenario.id);
      overlayJobs.push(...scenarioJobs);
    });

    console.log(`🔮 Generated ${overlayJobs.length} Y overlay jobs`);
    return overlayJobs;
  }, [productionJobs, allScenarios, visibleYScenarioIds, scenarioDelays]);

  return {
    // State
    mode,
    activeScenario,
    allScenarios,
    jobs: whatIfJobs,  // Returns production or what-if jobs based on mode
    changeCount: activeScenario?.changes.length || 0,
    yOverlayJobs,  // Jobs from visible Y scenarios for overlay rendering
    visibleYScenarioIds,

    // Actions
    switchMode,
    createScenario,
    activateScenario,
    addChange,
    commitScenario,
    discardScenario,
    fetchScenarios,
    fetchActiveScenario,
    toggleYScenarioVisibility,

    // Helpers
    isWhatIfMode: mode === 'whatif',
    hasActiveScenario: !!activeScenario,
    hasYOverlays: visibleYScenarioIds.size > 0
  };
}
