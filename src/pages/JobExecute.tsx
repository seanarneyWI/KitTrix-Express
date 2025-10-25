import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { KittingJob, JobProgress, TimerState } from '../types/kitting';
import {
  formatDuration,
  formatTime,
  getCurrentExpectedStep,
  getRemainingStepTime,
  calculateProgress
} from '../utils/kittingCalculations';
import InstructionViewer from '../components/InstructionViewer';
import CircularProgressView from '../components/CircularProgressView';
import BasicExecutionView from '../components/BasicExecutionView';
import { apiUrl } from '../config/api';

const JobExecute: React.FC = () => {
  console.log('🔧 JobExecute component started');

  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();

  console.log('🔧 Component state:', { jobId });

  const [selectedJob, setSelectedJob] = useState<KittingJob | null>(null);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    pausedDuration: 0
  });
  const [stepCompletionSounds, setStepCompletionSounds] = useState<Set<number>>(new Set());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentKitExecutionId, setCurrentKitExecutionId] = useState<string | null>(null);

  // Comprehensive timing analytics state
  const [timingAnalytics, setTimingAnalytics] = useState({
    jobStartTime: null as number | null,
    actualJobDuration: 0,
    expectedJobDuration: 0,
    jobVariancePercentage: 0,
    completedKitsTimings: [] as Array<{
      kitNumber: number,
      expectedDuration: number,
      actualDuration: number,
      variancePercentage: number,
      stepTimings: Array<{
        stepIndex: number,
        stepName: string,
        expectedDuration: number,
        actualDuration: number,
        variancePercentage: number
      }>
    }>,
    jobPerformanceStatus: 'ON_TRACK' as 'AHEAD' | 'ON_TRACK' | 'BEHIND', // Overall job performance
    overallPerformanceStatus: 'ON_TRACK' as 'AHEAD' | 'ON_TRACK' | 'BEHIND' // Current kit performance
  });

  const fetchJobData = async () => {
    console.log('🔧 fetchJobData started for jobId:', jobId);
    try {
      console.log('🔧 Fetching job details for jobId:', jobId);
      const jobResponse = await fetch(apiUrl(`/api/kitting-jobs/${jobId}`));
      console.log('🔧 Job response status:', jobResponse.status);
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        console.log('🔧 Job data received:', jobData);
        setSelectedJob(jobData);
      } else {
        console.log('🔧 Job not found');
        setError('Job not found');
      }
    } catch (error) {
      console.error('🔧 Error fetching job data:', error);
      setError('Failed to load job data');
    }
  };

  const fetchJobProgress = async () => {
    console.log('🔧 fetchJobProgress started for jobId:', jobId);
    try {
      console.log('🔧 Fetching job progress from API');
      const response = await fetch(apiUrl(`/api/job-progress?jobId=${jobId}`));

      if (response.ok) {
        const progressData = await response.json();
        console.log('🔧 Progress data received:', progressData);

        if (progressData && progressData.length > 0) {
          const progress = progressData[0];

          // If there's an active kit, fetch the current kit execution
          if (progress.isActive && progress.currentKitNumber && progress.id) {
            try {
              const kitExecutionsResponse = await fetch(apiUrl(`/api/kit-executions?jobProgressId=${progress.id}`));
              if (kitExecutionsResponse.ok) {
                const kitExecutions = await kitExecutionsResponse.json();
                // Find the current kit execution (not completed)
                const currentKitExecution = kitExecutions.find(
                  (ke: any) => ke.kitNumber === progress.currentKitNumber && !ke.completed
                );
                if (currentKitExecution) {
                  console.log('🔧 Found current kit execution:', currentKitExecution.id);
                  setCurrentKitExecutionId(currentKitExecution.id);
                }
              }
            } catch (error) {
              console.error('🔧 Error fetching kit executions:', error);
            }
          }

          setJobProgress({
            id: progress.id,
            jobId: progress.jobId,
            startTime: progress.startTime,
            completedKits: progress.completedKits || 0,
            remainingKits: selectedJob ? selectedJob.orderedQuantity - (progress.completedKits || 0) : 0,
            completedKitsHistory: [],
            isActive: progress.isActive,
            currentKit: progress.isActive && progress.currentKitNumber ? {
              kitNumber: progress.currentKitNumber,
              startTime: new Date().toISOString(),
              currentStepIndex: 0,
              stepStartTime: new Date().toISOString(),
              completed: false
            } : undefined
          });
        } else {
          console.log('🔧 No progress data found - setting to null');
          setJobProgress(null);
        }
      } else {
        console.log('🔧 Failed to fetch progress data');
        setJobProgress(null);
      }
    } catch (error) {
      console.error('🔧 Error fetching job progress:', error);
      setJobProgress(null);
    }
  };

  // Fetch job data and progress
  useEffect(() => {
    console.log('🔧 Main data loading useEffect triggered:', { jobId });

    if (jobId) {
      console.log('🔧 Starting data load...');
      const loadData = async () => {
        try {
          console.log('🔧 Loading data with Promise.all...');
          await Promise.all([
            fetchJobData(),
            fetchJobProgress()
          ]);
          console.log('🔧 Data loading completed successfully');
        } catch (error) {
          console.error('🔧 Error in loadData:', error);
        } finally {
          console.log('🔧 Setting loading to false');
          setLoading(false);
        }
      };
      loadData();
    } else {
      console.log('🔧 No jobId provided - cannot load data');
      setLoading(false);
    }
  }, [jobId]);

  // Auto-start job if not yet started, or resume if in progress
  useEffect(() => {
    if (!loading && selectedJob) {
      if (!jobProgress && selectedJob.status === 'SCHEDULED') {
        console.log('🔧 Auto-starting job...');
        startJob();
      } else if (jobProgress && jobProgress.isActive && selectedJob.status === 'IN_PROGRESS' && !timerState.isRunning) {
        console.log('🔧 Resuming job...', {
          currentKitNumber: jobProgress.currentKitNumber,
          completedKits: jobProgress.completedKits,
          remainingKits: jobProgress.remainingKits
        });

        // Resume timer state
        setTimerState({
          jobStartTime: new Date(jobProgress.startTime).getTime(),
          kitStartTime: Date.now(), // Start fresh kit timer
          stepStartTime: Date.now(),
          isRunning: true,
          isPaused: false,
          pausedDuration: 0
        });

        // Start the current kit
        if (jobProgress.currentKitNumber) {
          console.log('🔧 Starting kit on resume:', jobProgress.currentKitNumber);
          startNewKit(jobProgress.currentKitNumber);
        }
      }
    }
  }, [loading, selectedJob, jobProgress]);

  // Timer effects with step progression
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerState.isRunning && !timerState.isPaused) {
      interval = setInterval(() => {
        const now = Date.now();
        setCurrentTime(now);

        // Update timing analytics every second
        updateTimingAnalytics();

        setTimerState(prev => {
          const newState = { ...prev };

          if (selectedJob && jobProgress?.currentKit && timerState.kitStartTime) {
            const totalElapsedKitTime = Math.floor((now - timerState.kitStartTime) / 1000);
            const currentStepInfo = getCurrentExpectedStep(selectedJob.routeSteps, totalElapsedKitTime);

            if (currentStepInfo && currentStepInfo.stepIndex !== undefined) {
              const stepElapsed = currentStepInfo.timeInStep;
              const stepDuration = currentStepInfo.step.expectedSeconds;

              if (stepElapsed >= stepDuration) {
                const currentStepIndex = currentStepInfo.stepIndex;
                if (!stepCompletionSounds.has(currentStepIndex)) {
                  setStepCompletionSounds(prev => new Set([...prev, currentStepIndex]));
                  playStepCompletionSound();
                }
              }
            }
          }

          return newState;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.isPaused, timerState.kitStartTime, selectedJob, jobProgress, stepCompletionSounds]);

  // Helper functions for timing analytics
  const calculateVariancePercentage = (actual: number, expected: number): number => {
    if (expected === 0) return 0;
    return Math.round(((actual - expected) / expected) * 100);
  };

  const updateTimingAnalytics = async () => {
    if (!selectedJob || !timingAnalytics.jobStartTime) return;

    const actualJobDuration = Math.floor((Date.now() - timingAnalytics.jobStartTime) / 1000);
    const expectedJobDuration = selectedJob.expectedJobDuration;
    const jobVariance = calculateVariancePercentage(actualJobDuration, expectedJobDuration);

    // Calculate overall JOB performance based on total job variance
    let jobPerformanceStatus: 'AHEAD' | 'ON_TRACK' | 'BEHIND' = 'ON_TRACK';
    if (jobVariance > 10) jobPerformanceStatus = 'BEHIND';
    else if (jobVariance < -10) jobPerformanceStatus = 'AHEAD';

    // Calculate current kit performance (if kit is in progress)
    let currentKitPerformance: 'AHEAD' | 'ON_TRACK' | 'BEHIND' = 'ON_TRACK';
    if (timerState.kitStartTime && selectedJob.expectedKitDuration > 0) {
      const currentKitActual = Math.floor((Date.now() - timerState.kitStartTime) / 1000);
      const currentKitExpected = selectedJob.expectedKitDuration;
      const currentKitVariance = calculateVariancePercentage(currentKitActual, currentKitExpected);

      if (currentKitVariance > 10) currentKitPerformance = 'BEHIND';
      else if (currentKitVariance < -10) currentKitPerformance = 'AHEAD';
    }

    const updatedAnalytics = {
      ...timingAnalytics,
      actualJobDuration,
      expectedJobDuration,
      jobVariancePercentage: jobVariance,
      jobPerformanceStatus: jobPerformanceStatus, // Overall job performance
      overallPerformanceStatus: currentKitPerformance // Current kit performance
    };

    setTimingAnalytics(updatedAnalytics);

    // Store analytics data for reporting and alerts
    try {
      await fetch(apiUrl('/api/analytics'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          totalExpectedTime: expectedJobDuration,
          actualJobDuration,
          expectedJobDuration,
          variancePercentage: jobVariance,
          performanceStatus: currentKitPerformance,
          completedKits: jobProgress?.completedKits || 0,
          totalKits: selectedJob.orderedQuantity,
          kitTimings: updatedAnalytics.completedKitsTimings
        }),
      });
    } catch (error) {
      console.error('Failed to update analytics:', error);
    }
  };

  const playStepCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio not available:', error);
    }
  };

  const getStepCountdown = (stepIndex: number, stepDuration: number) => {
    if (!timerState.isRunning || !currentStep) return stepDuration;

    if (stepIndex < currentStep.stepIndex) {
      return 0;
    } else if (stepIndex === currentStep.stepIndex) {
      const remaining = Math.max(0, stepDuration - currentStep.timeInStep);
      if (remaining === 0 && !stepCompletionSounds.has(stepIndex)) {
        setStepCompletionSounds(prev => new Set([...prev, stepIndex]));
        playStepCompletionSound();
      }
      return remaining;
    } else {
      return stepDuration;
    }
  };

  const startJob = async () => {
    if (!selectedJob) return;

    try {
      console.log('🔧 Starting job:', selectedJob.id);

      // Update job status to IN_PROGRESS
      const jobUpdateResponse = await fetch(apiUrl(`/api/kitting-jobs/${selectedJob.id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'IN_PROGRESS'
        }),
      });

      if (!jobUpdateResponse.ok) {
        throw new Error('Failed to update job status');
      }

      // Create initial progress record
      const progressData = {
        jobId: selectedJob.id,
        completedKits: 0,
        remainingKits: selectedJob.orderedQuantity,
        currentKitNumber: 1,
        startTime: new Date().toISOString(),
        isActive: true
      };

      const progressResponse = await fetch(apiUrl('/api/job-progress'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressData),
      });

      if (!progressResponse.ok) {
        throw new Error('Failed to create progress record');
      }

      // Get the job progress ID from the response
      const createdProgress = await progressResponse.json();
      console.log('🔧 Created job progress with ID:', createdProgress.id);

      // Update local state with the ID
      setJobProgress({
        id: createdProgress.id,
        jobId: selectedJob.id,
        startTime: new Date().toISOString(),
        completedKits: 0,
        remainingKits: selectedJob.orderedQuantity,
        completedKitsHistory: [],
        isActive: true
      });
      setTimerState({
        jobStartTime: Date.now(),
        kitStartTime: Date.now(),
        stepStartTime: Date.now(),
        isRunning: true,
        isPaused: false,
        pausedDuration: 0
      });

      // Update the selectedJob status locally
      setSelectedJob(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null);

      // Initialize timing analytics
      const jobStartTime = Date.now();
      setTimingAnalytics({
        jobStartTime,
        actualJobDuration: 0,
        expectedJobDuration: selectedJob.expectedJobDuration,
        jobVariancePercentage: 0,
        completedKitsTimings: [],
        jobPerformanceStatus: 'ON_TRACK',
        overallPerformanceStatus: 'ON_TRACK'
      });

      // Automatically start the first kit with the job progress ID
      startNewKit(1, createdProgress.id);

    } catch (error) {
      console.error('Error starting job:', error);
      alert('Failed to start job. Please try again.');
    }
  };

  const startNewKit = async (nextKitNumber?: number, explicitJobProgressId?: string) => {
    if (!selectedJob) return;

    try {
      // Use explicit job progress ID if provided, otherwise fall back to state
      const progressId = explicitJobProgressId || jobProgress?.id;
      if (!progressId) {
        throw new Error('Job progress ID is missing');
      }

      const kitNumber = nextKitNumber || ((jobProgress?.completedKits || 0) + 1);
      console.log('🔧 Starting new kit:', kitNumber, 'with job progress ID:', progressId);
      const startTime = new Date().toISOString();

      // Create KitExecution record in database
      const kitExecutionResponse = await fetch(apiUrl('/api/kit-executions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobProgressId: progressId,
          kitNumber,
          startTime
        }),
      });

      if (!kitExecutionResponse.ok) {
        throw new Error('Failed to create kit execution record');
      }

      const kitExecution = await kitExecutionResponse.json();
      console.log('🔧 Kit execution response:', kitExecution);
      console.log('🔧 Setting currentKitExecutionId to:', kitExecution.id);
      setCurrentKitExecutionId(kitExecution.id);

      const newKit = {
        kitNumber,
        startTime,
        currentStepIndex: 0,
        stepStartTime: startTime,
        completed: false
      };

      setJobProgress(prev => prev ? {
        ...prev,
        currentKit: newKit
      } : null);

      setTimerState(prev => ({
        ...prev,
        kitStartTime: Date.now(),
        stepStartTime: Date.now(),
        isRunning: true,
        isPaused: false
      }));

      setStepCompletionSounds(new Set());
      console.log('✅ Kit execution created with ID:', kitExecution.id);
    } catch (error) {
      console.error('Error starting kit:', error);
      alert('Failed to start kit. Please try again.');
    }
  };

  const completeKit = async () => {
    if (!selectedJob || !jobProgress || !jobProgress.currentKit || !jobProgress.id) {
      console.error('🔧 Missing required data:', {
        hasSelectedJob: !!selectedJob,
        hasJobProgress: !!jobProgress,
        hasCurrentKit: !!jobProgress?.currentKit,
        hasJobProgressId: !!jobProgress?.id
      });
      alert('Missing required data to complete kit. Please refresh and try again.');
      return;
    }

    try {
      const kitNumber = jobProgress.currentKit.kitNumber;
      console.log('🔧 Completing kit:', kitNumber, 'for job progress ID:', jobProgress.id);

      // Fetch the current kit execution ID from the database
      const fetchUrl = apiUrl(`/api/kit-executions?jobProgressId=${jobProgress.id}`);
      console.log('🔧 Fetching kit executions from:', fetchUrl);
      const kitExecutionsResponse = await fetch(fetchUrl);

      if (!kitExecutionsResponse.ok) {
        const errorText = await kitExecutionsResponse.text();
        console.error('🔧 Failed to fetch kit executions:', errorText);
        throw new Error(`Failed to fetch kit executions: ${errorText}`);
      }

      const kitExecutions = await kitExecutionsResponse.json();
      console.log('🔧 Found kit executions:', kitExecutions);

      const currentKitExecution = kitExecutions.find(
        (ke: any) => ke.kitNumber === kitNumber && !ke.completed
      );

      if (!currentKitExecution) {
        console.error('🔧 Current kit execution not found. Kit executions:', kitExecutions, 'Looking for kit number:', kitNumber);
        throw new Error(`Current kit execution not found for kit #${kitNumber}`);
      }

      console.log('🔧 Found kit execution:', currentKitExecution.id);

      console.log('🔧 Found kit execution:', currentKitExecution.id);
      const endTime = new Date().toISOString();
      const actualDuration = timerState.kitStartTime ?
        Math.floor((Date.now() - timerState.kitStartTime) / 1000) : 0;

      const expectedDuration = selectedJob.expectedKitDuration;
      const varianceSeconds = actualDuration - expectedDuration;
      const variancePercentage = expectedDuration > 0
        ? Math.round((varianceSeconds / expectedDuration) * 100)
        : 0;

      // Determine performance status for this kit
      let kitPerformance: 'AHEAD' | 'ON_TIME' | 'BEHIND' = 'ON_TIME';
      if (variancePercentage > 10) kitPerformance = 'BEHIND';
      else if (variancePercentage < -10) kitPerformance = 'AHEAD';

      console.log(`📊 Kit ${kitNumber} Performance:`, {
        expected: expectedDuration,
        actual: actualDuration,
        variance: varianceSeconds,
        variancePercent: variancePercentage,
        status: kitPerformance
      });

      // Update KitExecution record with completion data
      const kitExecutionUpdateResponse = await fetch(apiUrl(`/api/kit-executions/${currentKitExecution.id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endTime,
          actualDuration,
          completed: true
        }),
      });

      if (!kitExecutionUpdateResponse.ok) {
        throw new Error('Failed to update kit execution record');
      }

      const completedKit = {
        ...jobProgress.currentKit,
        endTime,
        actualDuration,
        completed: true
      };

      const newCompletedKits = jobProgress.completedKits + 1;
      const newRemainingKits = selectedJob.orderedQuantity - newCompletedKits;

      // Update progress in database
      const progressData = {
        jobId: selectedJob.id,
        completedKits: newCompletedKits,
        remainingKits: newRemainingKits,
        currentKitNumber: newRemainingKits > 0 ? newCompletedKits + 1 : null,
        isActive: newRemainingKits > 0,
        endTime: newRemainingKits > 0 ? null : new Date().toISOString()
      };

      const progressResponse = await fetch(apiUrl('/api/job-progress'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressData),
      });

      if (!progressResponse.ok) {
        throw new Error('Failed to update progress');
      }

      // Dispatch event to notify other components that jobs have been updated
      window.dispatchEvent(new CustomEvent('jobsUpdated'));

      // Update timing analytics with completed kit data
      setTimingAnalytics(prev => ({
        ...prev,
        completedKitsTimings: [
          ...prev.completedKitsTimings,
          {
            kitNumber: jobProgress.currentKit!.kitNumber,
            expectedDuration,
            actualDuration,
            variancePercentage,
            stepTimings: [] // Will be populated with step executions later
          }
        ],
        overallPerformanceStatus: kitPerformance
      }));

      // Update local state
      setJobProgress(prev => prev ? {
        ...prev,
        completedKits: newCompletedKits,
        remainingKits: newRemainingKits,
        currentKit: undefined,
        completedKitsHistory: [...(prev.completedKitsHistory || []), completedKit]
      } : null);

      if (newRemainingKits > 0) {
        // Immediately start the next kit with explicit kit number
        const nextKitNumber = newCompletedKits + 1;
        console.log('🔧 About to start next kit:', nextKitNumber);
        startNewKit(nextKitNumber);
      } else {
        // Job completed - update job status
        const jobUpdateResponse = await fetch(apiUrl(`/api/kitting-jobs/${selectedJob.id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'COMPLETED'
          }),
        });

        if (!jobUpdateResponse.ok) {
          console.error('Failed to update job status to COMPLETED');
        }

        setJobProgress(prev => prev ? {
          ...prev,
          endTime: new Date().toISOString(),
          actualJobDuration: timerState.jobStartTime ?
            Math.floor((Date.now() - timerState.jobStartTime) / 1000) : 0,
          isActive: false
        } : null);
        setTimerState(prev => ({
          ...prev,
          isRunning: false
        }));
        setSelectedJob(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
      }
    } catch (error) {
      console.error('Error completing kit:', error);
      alert('Failed to complete kit. Please try again.');
    }
  };

  const pauseResumeJob = async () => {
    if (!selectedJob) return;

    console.log('🔧 Toggling pause/resume');
    setTimerState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  const currentElapsedJobTime = useMemo(() => {
    if (!timerState.jobStartTime || !timerState.isRunning) return 0;
    return Math.floor((currentTime - timerState.jobStartTime) / 1000);
  }, [timerState.jobStartTime, timerState.isRunning, currentTime]);

  const currentElapsedKitTime = useMemo(() => {
    if (!timerState.kitStartTime || !timerState.isRunning) return 0;
    return Math.floor((currentTime - timerState.kitStartTime) / 1000);
  }, [timerState.kitStartTime, timerState.isRunning, currentTime]);

  const currentStep = useMemo(() => {
    if (!selectedJob || !timerState.isRunning) return null;
    return getCurrentExpectedStep(selectedJob.routeSteps, currentElapsedKitTime);
  }, [selectedJob, currentElapsedKitTime, timerState.isRunning]);

  console.log('🔧 Render decision:', {
    loading,
    hasSelectedJob: !!selectedJob,
    hasJobProgress: !!jobProgress,
    error
  });

  if (loading) {
    console.log('🔧 Rendering loading spinner');
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Back to Your Jobs
          </button>
        </div>
      </div>
    );
  }

  if (!selectedJob) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job data...</p>
        </div>
      </div>
    );
  }

  if (!jobProgress) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Starting job...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto max-w-6xl">

        {/* Job Timing Strip - Only shown for STEPS and TARGET interfaces */}
        {selectedJob.executionInterface !== 'BASIC' && (
          <div className="bg-white rounded-lg shadow-sm mb-2 p-4">
            <div className="flex items-center justify-center gap-8 text-sm">
              {/* Timing Stats */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Expected Job Time:</span>
                  <span className="font-bold text-gray-700">{formatDuration(timingAnalytics.expectedJobDuration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Actual Job Time:</span>
                  <span className={`font-bold ${
                    timingAnalytics.overallPerformanceStatus === 'AHEAD' ? 'text-green-600' :
                    timingAnalytics.overallPerformanceStatus === 'BEHIND' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {formatDuration(timingAnalytics.actualJobDuration)}
                    {timingAnalytics.jobVariancePercentage !== 0 && (
                      <span className={`ml-1 ${
                        timingAnalytics.jobVariancePercentage > 0 ? 'text-red-500' : 'text-green-500'
                      }`}>
                        ({timingAnalytics.jobVariancePercentage > 0 ? '+' : ''}{timingAnalytics.jobVariancePercentage}%)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conditional View Rendering Based on Execution Interface */}
        {selectedJob.executionInterface === 'BASIC' ? (
          /* Basic View - Large Button Interface */
          jobProgress?.currentKit ? (
            <BasicExecutionView
              jobNumber={selectedJob.jobNumber}
              customerName={selectedJob.customerName}
              currentKitNumber={jobProgress.currentKit.kitNumber}
              totalKits={selectedJob.orderedQuantity}
              currentElapsedKitTime={currentElapsedKitTime}
              expectedKitDuration={selectedJob.expectedKitDuration}
              performanceStatus={timingAnalytics.overallPerformanceStatus}
              onCompleteKit={completeKit}
              isPaused={timerState.isPaused}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-2xl p-12 text-center border-4 border-green-200 mb-2">
              <div className="text-8xl text-green-500 mb-6">✓</div>
              <div className="text-3xl text-gray-600">
                {selectedJob?.status === 'COMPLETED' || jobProgress?.remainingKits === 0
                  ? 'Job Complete!'
                  : 'Starting Next Kit...'}
              </div>
            </div>
          )
        ) : selectedJob.executionInterface === 'TARGET' ? (
          /* Target View - Circular Progress Interface */
          jobProgress?.currentKit ? (
            <CircularProgressView
              completedKits={jobProgress.completedKits}
              totalKits={selectedJob.orderedQuantity}
              currentElapsedKitTime={currentElapsedKitTime}
              expectedKitDuration={selectedJob.expectedKitDuration}
              performanceStatus={timingAnalytics.overallPerformanceStatus}
              jobPerformanceStatus={timingAnalytics.jobPerformanceStatus}
              isPaused={timerState.isPaused}
              jobNumber={selectedJob.jobNumber}
              customerName={selectedJob.customerName}
              description={selectedJob.description}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-2xl p-12 text-center border-4 border-green-200 mb-2">
              <div className="text-8xl text-green-500 mb-6">✓</div>
              <div className="text-3xl text-gray-600">
                {selectedJob?.status === 'COMPLETED' || jobProgress?.remainingKits === 0
                  ? 'Job Complete!'
                  : 'Starting Next Kit...'}
              </div>
            </div>
          )
        ) : (
          /* Steps View - Instruction-Driven Interface */
          <>
            {/* Media Card */}
            <div className="mb-0">
              {jobProgress?.currentKit && currentStep?.step ? (
            <div className="bg-white rounded-lg shadow-2xl p-6 text-center border-4 border-blue-200">
              <div className="flex justify-between items-center mb-4 px-2">
                <div>
                  <h1 className="text-2xl font-semibold text-blue-800">
                    {currentStep.step.name}
                  </h1>
                  <div className="text-xs text-gray-500 text-left mt-1">
                    Kit #{jobProgress.currentKit.kitNumber} of {selectedJob?.orderedQuantity || 0}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">
                    Kit Timer: {selectedJob ? formatDuration(selectedJob.expectedKitDuration - currentElapsedKitTime) : 'Loading...'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Expected: {selectedJob ? formatDuration(selectedJob.expectedKitDuration) : 'Loading...'}
                  </div>
                </div>
              </div>

              <div className="mb-6" style={{ height: '500px' }}>
                <InstructionViewer
                  instructionType={currentStep.step.instructionType || 'NONE'}
                  instructionUrl={currentStep.step.instructionUrl}
                  instructionText={currentStep.step.instructionText}
                  autoLoop={currentStep.step.autoLoop !== false}
                  className="h-full w-full"
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className={`text-4xl font-mono font-bold transition-colors duration-300 ${
                  getRemainingStepTime(currentStep.step, currentStep.timeInStep) <= 10
                    ? 'text-red-600 animate-pulse'
                    : getRemainingStepTime(currentStep.step, currentStep.timeInStep) <= 30
                    ? 'text-orange-600'
                    : 'text-blue-600'
                }`}>
                  {Math.max(0, getRemainingStepTime(currentStep.step, currentStep.timeInStep))}s
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-2xl p-8 text-center border-4 border-green-200">
              <div className="flex justify-center items-center mb-6">
                <h1 className="text-3xl font-semibold text-green-800">
                  {selectedJob?.status === 'COMPLETED' || jobProgress?.remainingKits === 0
                    ? 'Job Complete!'
                    : 'Starting Next Kit'}
                </h1>
              </div>

              <div className="bg-gray-100 rounded-lg p-12" style={{ height: '400px' }}>
                <div className="text-center flex flex-col justify-center h-full">
                  <div className="text-8xl text-green-500 mb-6">✓</div>
                  <div className="text-3xl text-gray-600 mb-4">
                    {selectedJob?.status === 'COMPLETED' || jobProgress?.remainingKits === 0
                      ? `All ${selectedJob?.orderedQuantity || 0} Kits Completed!`
                      : 'Kit Complete!'}
                  </div>
                  <div className="text-xl text-gray-500">
                    {selectedJob?.status === 'COMPLETED' || jobProgress?.remainingKits === 0
                      ? 'Great work!'
                      : 'Next kit starting automatically...'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
          </>
        )}

        {/* Bottom Control Panel */}
        <div className="bg-white rounded-lg shadow-md p-3">
          <div className="flex items-center justify-between gap-4">
            {/* Timing Stats */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-sm font-bold text-purple-600">
                  {formatDuration(currentElapsedKitTime)}
                </div>
                <div className="text-xs text-gray-500">Current Kit</div>
              </div>

              <div className="text-center">
                <div className="text-sm font-bold text-green-600">
                  {jobProgress?.completedKits || 0}
                </div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>

              <div className="text-center">
                <div className="text-sm font-bold text-orange-600">
                  {jobProgress?.remainingKits || selectedJob?.orderedQuantity || 0}
                </div>
                <div className="text-xs text-gray-500">Remaining</div>
              </div>

              <div className="text-center">
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                  timingAnalytics.overallPerformanceStatus === 'AHEAD' ? 'bg-green-100 text-green-800' :
                  timingAnalytics.overallPerformanceStatus === 'BEHIND' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {timingAnalytics.overallPerformanceStatus.replace('_', ' ')}
                </div>
                <div className="text-xs text-gray-500">Performance</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {jobProgress?.currentKit ? (
                <button
                  onClick={completeKit}
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-all"
                >
                  Complete Kit #{jobProgress.currentKit.kitNumber}
                </button>
              ) : (
                <div className="text-gray-500 text-xs">Next kit starting...</div>
              )}

              <button
                onClick={pauseResumeJob}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  timerState.isPaused
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                {timerState.isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                Back to Jobs
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default JobExecute;