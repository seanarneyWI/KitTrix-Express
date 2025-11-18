import { useState, useEffect, useMemo } from 'react';
import { KittingJob } from '../types/kitting';
import { apiUrl } from '../config/api';
import { applyDelaysToJob, recalculateJobDuration, JobDelay } from '../utils/shiftScheduling';

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
 * STATISTICAL FRAMEWORK:
 * - Y (Production) = Actual production schedule (reality/ground truth)
 * - Ŷ (Scenarios) = Predicted/forecasted schedule alternatives
 * - Y - Ŷ = Residuals (differences between predicted and actual outcomes)
 *
 * This hook implements the Ŷ prediction layer that overlays on top of Y reality.
 * Multiple scenarios (multiple Ŷ values) can be compared to find optimal predictions.
 * See Y_YHAT_ARCHITECTURE.md for comprehensive statistical model documentation.
 *
 * Features:
 * - Toggle between Production (Y) and What-If (Ŷ) modes
 * - Create and manage scenarios (Ŷ predictions)
 * - Track changes (ADD, MODIFY, DELETE operations)
 * - Multi-window synchronization via BroadcastChannel
 * - Commit scenarios to production (Ŷ → Y)
 * - Discard scenarios without applying
 * - Y Overlays: Display multiple Ŷ predictions as purple ghosts
 *
 * Usage:
 * const whatIf = useWhatIfMode(productionJobs); // productionJobs = Y
 * const jobs = whatIf.jobs; // Returns Y or Ŷ based on mode
 * const yHatOverlays = whatIf.yOverlayJobs; // Returns Ŷ predictions for visualization
 */
const Y_SCENARIO_VISIBILITY_KEY = 'kittrix-y-scenario-visibility';

export function useWhatIfMode(productionJobs: KittingJob[]) {
  const [mode, setMode] = useState<'production' | 'whatif'>('production');
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [allScenarios, setAllScenarios] = useState<Scenario[]>([]);
  const [visibleYScenarioIds, setVisibleYScenarioIds] = useState<Set<string>>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(Y_SCENARIO_VISIBILITY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      } catch (e) {
        console.error('Failed to load Y scenario visibility from localStorage:', e);
      }
    }
    return new Set();
  });
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null);
  const [scenarioDelays, setScenarioDelays] = useState<Map<string, any[]>>(new Map());
  const [productionDelays, setProductionDelays] = useState<Map<string, any[]>>(new Map()); // Map<jobId, delays[]>

  // Initialize BroadcastChannel for multi-window sync
  useEffect(() => {
    const channel = new BroadcastChannel('kittrix-whatif-sync');

    channel.onmessage = (event) => {
      const { type, data } = event.data;


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
      channel.close();
    };
  }, []);

  // Save Y scenario visibility to localStorage whenever it changes
  useEffect(() => {
    const toSave = Array.from(visibleYScenarioIds);
    localStorage.setItem(Y_SCENARIO_VISIBILITY_KEY, JSON.stringify(toSave));
  }, [visibleYScenarioIds]);

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
   * Fetch production delays for a specific job (scenarioId = NULL)
   */
  const fetchProductionDelays = async (jobId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/jobs/${jobId}/delays`));
      if (!response.ok) {
        throw new Error(`Failed to fetch production delays for job ${jobId}`);
      }
      const delays = await response.json();
      return delays;
    } catch (error) {
      console.error(`Failed to fetch production delays for job ${jobId}:`, error);
      return [];
    }
  };

  /**
   * Fetch all production delays for all jobs
   */
  const fetchAllProductionDelays = async (jobs: KittingJob[]) => {
    try {
      const delaysMap = new Map<string, any[]>();
      for (const job of jobs) {
        const delays = await fetchProductionDelays(job.id);
        if (delays.length > 0) {
          delaysMap.set(job.id, delays);
        }
      }
      setProductionDelays(delaysMap);
    } catch (error) {
      console.error('Failed to fetch production delays:', error);
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

      // Fetch delays for all scenarios
      const delaysMap = new Map<string, any[]>();
      for (const scenario of scenarios) {
        const delays = await fetchScenarioDelays(scenario.id);
        if (delays.length > 0) {
          delaysMap.set(scenario.id, delays);
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
      } else {
        setActiveScenario(null);
        setMode('production');
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

  // Fetch production delays when jobs change
  useEffect(() => {
    if (productionJobs.length > 0) {
      fetchAllProductionDelays(productionJobs);
    }
  }, [productionJobs]);

  /**
   * Apply scenario changes to production jobs in memory
   * This creates a "what-if" view without modifying the actual database
   * Also applies production delays to all jobs (both production and what-if mode)
   */
  const whatIfJobs = useMemo(() => {
    let jobs = productionJobs;

    // In what-if mode, apply scenario changes first
    if (activeScenario && mode === 'whatif') {

      let modifiedJobs = [...productionJobs];

      for (const change of activeScenario.changes) {
        switch (change.operation) {
          case 'ADD':
            // Add new job to list with visual indicator
            modifiedJobs.push({
              ...change.changeData,
              __whatif: 'added'  // Mark for visual indicator
            } as any);
            break;

          case 'MODIFY':
            // Update existing job with visual indicator
            modifiedJobs = modifiedJobs.map(job => {
              if (job.id === change.jobId) {
                let modifiedJob = { ...job, ...change.changeData, __whatif: 'modified' } as any;

                // Recalculate duration ONLY if station count changed
                // Shift changes don't affect work duration, only calendar rendering
                if (change.changeData.stationCount !== undefined) {
                  modifiedJob = recalculateJobDuration(
                    modifiedJob,
                    change.changeData.stationCount
                  );
                } else if (change.changeData.allowedShiftIds) {
                }

                return modifiedJob;
              }
              return job;
            });
            break;

          case 'DELETE':
            // Mark job as deleted (keep in list with indicator for visual feedback)
            modifiedJobs = modifiedJobs.map(job =>
              job.id === change.jobId
                ? { ...job, __whatif: 'deleted' } as any
                : job
            );
            break;
        }
      }

      jobs = modifiedJobs;
    }

    // Apply production delays to ALL jobs (in both production and what-if mode)
    if (productionDelays.size > 0) {
      jobs = jobs.map(job => {
        const jobDelays = productionDelays.get(job.id);
        if (jobDelays && jobDelays.length > 0) {
          const beforeDuration = job.expectedJobDuration;
          const result = applyDelaysToJob(job, jobDelays);
          console.log('🔍 DIAGNOSTIC: Applying production delays');
          console.log('  Job:', job.jobNumber, 'Before:', beforeDuration + 's');
          console.log('  Delays:', jobDelays.length, 'After:', result.expectedJobDuration + 's');
          return result;
        }
        return job;
      });
    }

    return jobs;
  }, [productionJobs, activeScenario, mode, productionDelays]);

  /**
   * Create a new scenario
   */
  const createScenario = async (name: string, description?: string, sourceJobId?: string) => {
    try {
      const response = await fetch(apiUrl('/api/scenarios'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, sourceJobId })
      });

      if (!response.ok) {
        throw new Error(`Failed to create scenario: ${response.statusText}`);
      }

      const scenario = await response.json();
      await fetchScenarios();
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

      return change;
    } catch (error) {
      console.error('Failed to add change:', error);
      throw error;
    }
  };

  /**
   * Update station count for a job in the active scenario
   */
  const updateScenarioStationCount = async (jobId: string, stationCount: number) => {
    if (!activeScenario) {
      throw new Error('No active scenario');
    }

    try {
      // Find existing MODIFY change for this job
      const existingChange = activeScenario.changes.find(
        c => c.jobId === jobId && c.operation === 'MODIFY'
      );

      const changeData = existingChange?.changeData || {};
      changeData.stationCount = stationCount;

      // If there's an existing change, we're updating it; otherwise create new
      await addChange('MODIFY', jobId, changeData);

    } catch (error) {
      console.error('Failed to update station count in scenario:', error);
      throw error;
    }
  };

  /**
   * Update allowed shifts for a job in the active scenario
   */
  const updateScenarioShifts = async (jobId: string, allowedShiftIds: string[]) => {
    if (!activeScenario) {
      throw new Error('No active scenario');
    }

    try {
      // Find existing MODIFY change for this job
      const existingChange = activeScenario.changes.find(
        c => c.jobId === jobId && c.operation === 'MODIFY'
      );

      const changeData = existingChange?.changeData || {};
      changeData.allowedShiftIds = allowedShiftIds;

      // If there's an existing change, we're updating it; otherwise create new
      await addChange('MODIFY', jobId, changeData);

    } catch (error) {
      console.error('Failed to update shifts in scenario:', error);
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

      const response = await fetch(apiUrl(`/api/scenarios/${activeScenario.id}/commit`), {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to commit scenario');
      }

      const result = await response.json();

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

      const response = await fetch(apiUrl(`/api/scenarios/${activeScenario.id}`), {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to discard scenario');
      }


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
   * Delete individual scenario change
   */
  const deleteChange = async (changeId: string) => {
    if (!activeScenario) {
      throw new Error('No active scenario');
    }

    try {

      const response = await fetch(apiUrl(`/api/scenario-changes/${changeId}`), {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete change');
      }


      // Refresh active scenario to get updated changes list
      await fetchActiveScenario();

      // Broadcast to other windows
      broadcastChannel?.postMessage({
        type: 'change-deleted',
        scenarioId: activeScenario.id,
        changeId
      });
    } catch (error) {
      console.error('Failed to delete change:', error);
      throw error;
    }
  };

  /**
   * Switch between production and what-if modes
   */
  const switchMode = (newMode: 'production' | 'whatif') => {
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
      } else {
        newSet.add(scenarioId);
      }
      return newSet;
    });
  };

  /**
   * Generate Ŷ (Y-hat) predictions from visible scenarios
   *
   * This useMemo transforms Y (production reality) into multiple Ŷ (predicted) alternatives
   * by applying scenario changes (ADD/MODIFY/DELETE operations) and delay injections.
   *
   * Process:
   * 1. Start with Y (productionJobs) as baseline
   * 2. Apply scenario changes to create Ŷ predictions
   * 3. Inject delays to model disruptions (equipment downtime, meetings, etc.)
   * 4. Tag each job with __yScenario and __yScenarioName for visual rendering
   *
   * Each visible scenario produces a separate Ŷ prediction layer displayed as purple ghost
   * overlays on the calendar. Multiple Ŷ values can be compared simultaneously.
   *
   * Future: When jobs execute, actual outcomes (Y) will be compared to these predictions (Ŷ)
   * to calculate residuals (Y - Ŷ) for statistical analysis and model improvement.
   */
  const yOverlayJobs = useMemo(() => {
    if (visibleYScenarioIds.size === 0) {
      return [];
    }

    const visibleScenarios = allScenarios.filter(s => visibleYScenarioIds.has(s.id));

    const overlayJobs: any[] = [];

    visibleScenarios.forEach(scenario => {
      /**
       * CRITICAL DATA ISOLATION PRINCIPLE
       * ===================================
       * Production jobs and Y scenario overlay jobs MUST remain completely separate.
       * Any modifications to Y scenarios must NOT affect production data, and vice versa.
       *
       * WHY DEEP CLONE IS REQUIRED:
       * - Shallow copy ([...array]) only copies array references
       * - Job objects inside array are still SHARED references
       * - Nested objects/arrays (routeSteps, allowedShiftIds, etc.) are SHARED references
       * - Modifying nested properties will mutate BOTH production and Y scenario jobs
       *
       * CORRECT APPROACH:
       * - Deep clone production jobs using JSON.parse(JSON.stringify())
       * - This creates completely independent copies with no shared references
       * - Changes to Y scenario jobs will never affect production jobs
       * - Changes to production jobs will never affect Y scenario jobs
       *
       * IMPORTANT FOR FUTURE SESSIONS:
       * If you see bugs where editing a job affects both production and Y scenarios,
       * or where Y scenario changes leak into production, the cause is ALWAYS
       * insufficient cloning/copying. Check this line first.
       */
      let modifiedJobs = JSON.parse(JSON.stringify(productionJobs));

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
            modifiedJobs = modifiedJobs.map(job => {
              if (job.id === change.jobId) {
                let modifiedJob = {
                  ...job,
                  ...change.changeData,
                  __yScenario: scenario.id,
                  __yScenarioName: scenario.name
                } as any;

                // Recalculate duration ONLY if station count changed
                // Shift changes don't affect work duration, only calendar rendering
                if (change.changeData.stationCount !== undefined) {
                  const originalStationCount = job.stationCount || 1;

                  // Use the same recalculateJobDuration function that production jobs use
                  // This ensures consistent duration calculation logic
                  modifiedJob = recalculateJobDuration(
                    job,  // Pass ORIGINAL job (before changeData applied)
                    change.changeData.stationCount
                  );

                  // Re-apply Y scenario markers that recalculateJobDuration doesn't know about
                  modifiedJob.__yScenario = scenario.id;
                  modifiedJob.__yScenarioName = scenario.name;

                  // Re-apply any other changes from changeData (except stationCount which was already applied)
                  const { stationCount, ...otherChanges } = change.changeData;
                  modifiedJob = { ...modifiedJob, ...otherChanges };

                  console.log('🔍 DIAGNOSTIC: Y scenario duration recalculation');
                  console.log('  Job:', job.jobNumber, 'Scenario:', scenario.name);
                  console.log('  Station change:', originalStationCount, '→', change.changeData.stationCount);
                  console.log('  Duration:', job.expectedJobDuration + 's', '→', modifiedJob.expectedJobDuration + 's');
                }

                return modifiedJob;
              }
              return job;
            });
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

      // Duration recalculation is now handled in the MODIFY case above (lines 622-630)
      // This duplicate logic was causing incorrect duration calculations

      // Apply scenario-specific delays ONLY to jobs in this scenario (prevent bleeding between scenarios)
      const scenarioDelayList = scenarioDelays.get(scenario.id) || [];
      if (scenarioDelayList.length > 0) {
        modifiedJobs = modifiedJobs.map(job => {
          // CRITICAL: Only apply delays if this job belongs to the current scenario
          if (job.__yScenario === scenario.id) {
            const jobDelays = scenarioDelayList.filter((d: JobDelay) => d.jobId === job.id);
            if (jobDelays.length > 0) {
              return applyDelaysToJob(job, jobDelays);
            }
          }
          return job;
        });
      }

      // Apply production delays to ALL jobs in this scenario (production delays apply to base job)
      if (productionDelays.size > 0) {
        modifiedJobs = modifiedJobs.map(job => {
          // Only apply production delays to jobs that belong to this scenario
          if (job.__yScenario === scenario.id) {
            const jobProductionDelays = productionDelays.get(job.id);
            if (jobProductionDelays && jobProductionDelays.length > 0) {
              return applyDelaysToJob(job, jobProductionDelays);
            }
          }
          return job;
        });
      }

      // Filter to only jobs modified by this scenario
      const scenarioJobs = modifiedJobs.filter(job => job.__yScenario === scenario.id);
      overlayJobs.push(...scenarioJobs);
    });

    return overlayJobs;
  }, [productionJobs, allScenarios, visibleYScenarioIds, scenarioDelays, productionDelays]);

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
    deleteChange,
    updateScenarioStationCount,
    updateScenarioShifts,
    commitScenario,
    discardScenario,
    fetchScenarios,
    fetchActiveScenario,
    toggleYScenarioVisibility,
    refreshProductionDelays: () => fetchAllProductionDelays(productionJobs),

    // Helpers
    isWhatIfMode: mode === 'whatif',
    hasActiveScenario: !!activeScenario,
    hasYOverlays: visibleYScenarioIds.size > 0
  };
}
