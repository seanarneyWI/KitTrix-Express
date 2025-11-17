import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import WeeklyCalendar from '../components/WeeklyCalendar';
import MonthlyCalendar from '../components/MonthlyCalendar';
import DailyCalendar from '../components/DailyCalendar';
import EventModal from '../components/EventModal';
import FloatingActionButton from '../components/FloatingActionButton';
import JobFilterPanel from '../components/JobFilterPanel';
import ShiftConfigModal from '../components/ShiftConfigModal';
import StationEditor from '../components/StationEditor';
import AllowedShiftsEditor from '../components/AllowedShiftsEditor';
import DelayEditor from '../components/DelayEditor';
import { useJobFilters } from '../hooks/useJobFilters';
import { useWhatIfMode } from '../hooks/useWhatIfMode';
import { useYScenarioFilters } from '../hooks/useYScenarioFilters';
import { Event } from '../types/event';
import { KittingJob } from '../types/kitting';
import { formatDuration } from '../utils/kittingCalculations';
import { apiUrl } from '../config/api';
import {
  type Shift,
  scheduleJobForward,
  scheduleJobForwardWithConfig,
  getAllShifts,
  getActiveShifts
} from '../utils/shiftScheduling';

const Dashboard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);

  const [kittingJobs, setKittingJobs] = useState<KittingJob[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'events' | 'kitting-jobs'>('all');
  const [calendarView, setCalendarView] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [activeShifts, setActiveShifts] = useState<Shift[]>([]);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [delayManagerContext, setDelayManagerContext] = useState<{
    scenarioId?: string;
    jobId?: string;
  } | null>(null);

  // Initialize What-If mode hook (applies scenario changes on top of production jobs)
  const whatIf = useWhatIfMode(kittingJobs);

  // Initialize job filter hook (always uses pure production jobs for filtering)
  const jobFilters = useJobFilters(kittingJobs);

  // Initialize Y scenario filter hook (manages Y overlay visibility)
  const yFilters = useYScenarioFilters(whatIf.allScenarios);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    event?: Event;
    initialDate?: string;
    initialTime?: string;
  }>({
    isOpen: false,
  });

  const [stationEditorState, setStationEditorState] = useState<{
    isOpen: boolean;
    job?: KittingJob;
    isYScenario?: boolean;
  }>({
    isOpen: false,
  });

  const [shiftsEditorState, setShiftsEditorState] = useState<{
    isOpen: boolean;
    job?: KittingJob;
    isYScenario?: boolean;
  }>({
    isOpen: false,
  });

  const [productionDelayEditorState, setProductionDelayEditorState] = useState<{
    isOpen: boolean;
    job?: KittingJob;
  }>({
    isOpen: false,
  });

  // Initialize current date and fetch kitting jobs
  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date().toISOString().split('T')[0]);
    loadActiveShifts();
    fetchKittingJobs();

    // Listen for job update events from other components
    const handleJobUpdate = () => {
      fetchKittingJobs();
    };

    // Auto-refresh when window gains focus (when returning from job creation)
    const handleWindowFocus = () => {
      fetchKittingJobs();
    };

    // Handle opening Delay Manager from job card ⏰ button
    const handleOpenDelayManager = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { scenarioId, jobId } = customEvent.detail;
      setDelayManagerContext({ scenarioId, jobId });
      setIsFilterPanelOpen(true); // Open filter panel which contains DelayManager
    };

    // Listen for custom job update events
    window.addEventListener('jobsUpdated', handleJobUpdate);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('openDelayManager', handleOpenDelayManager as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('jobsUpdated', handleJobUpdate);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('openDelayManager', handleOpenDelayManager as EventListener);
    };
  }, []);

  const loadActiveShifts = async () => {
    try {
      const [activeShiftsData, allShiftsData] = await Promise.all([
        getActiveShifts(),
        getAllShifts()
      ]);
      setActiveShifts(activeShiftsData);
      setAllShifts(allShiftsData);
    } catch (error) {
      console.error('Failed to load shifts:', error);
      // Continue with empty shifts array (will fallback to 24/7 scheduling)
    }
  };

  const handleShiftsChange = (updatedActiveShifts: Shift[]) => {
    setActiveShifts(updatedActiveShifts);
    // Re-render calendar with new shift configuration
    // The calendar will automatically update because kittingJobToEvents depends on activeShifts
  };

  const handleShiftToggle = async (shiftId: string) => {
    try {
      // Find the shift to toggle
      const shift = allShifts.find(s => s.id === shiftId);
      if (!shift) {
        console.error('Shift not found:', shiftId);
        return;
      }

      // Toggle the isActive status
      const newActiveStatus = !shift.isActive;

      // Call API to update shift
      const response = await fetch(apiUrl(`/api/shifts/${shiftId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActiveStatus })
      });

      if (response.ok) {
        // Reload shifts to get updated data
        await loadActiveShifts();
        toast.success(
          newActiveStatus
            ? `✓ Activated ${shift.name}`
            : `Deactivated ${shift.name}`,
          { duration: 2000 }
        );
      } else {
        throw new Error('Failed to update shift');
      }
    } catch (error) {
      console.error('Failed to toggle shift:', error);
      toast.error('Failed to toggle shift. Please try again.', { duration: 3000 });
    }
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async (shiftId: string, updates: Partial<Shift>) => {
    try {
      const response = await fetch(apiUrl(`/api/shifts/${shiftId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        // Reload shifts to get updated data
        await loadActiveShifts();
        toast.success('✓ Shift saved successfully', { duration: 2000 });
      } else {
        throw new Error('Failed to save shift');
      }
    } catch (error) {
      console.error('Failed to save shift:', error);
      throw error; // Let modal handle error display
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/shifts/${shiftId}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        // Reload shifts to get updated data
        await loadActiveShifts();
        toast.success('✓ Shift deleted successfully', { duration: 2000 });
      } else {
        throw new Error('Failed to delete shift');
      }
    } catch (error) {
      console.error('Failed to delete shift:', error);
      throw error; // Let modal handle error display
    }
  };

  const fetchKittingJobs = async () => {
    try {
      const response = await fetch(apiUrl('/api/kitting-jobs'));
      if (response.ok) {
        const data = await response.json();
        setKittingJobs(data || []);
        return data;
      } else {
        console.error('Failed to fetch kitting jobs - response not ok:', response.status);
        // Mock data for development
        const mockJob: KittingJob = {
          id: 'kj-1',
          customerName: 'Harbor3D',
          jobNumber: '31107',
          dueDate: '2025-01-07',
          orderedQuantity: 50,
          runLength: 9,
          customerSpec: 'Kings Hawaiian Rolls',
          description: 'Large Hutch 5 Pack',
          setup: 1800,
          makeReady: 120,
          takeDown: 1800,
          routeSteps: [
            { name: 'Hutch', expectedSeconds: 40, order: 0, instructionType: 'NONE', autoLoop: false },
            { name: 'Instructions', expectedSeconds: 5, order: 1, instructionType: 'NONE', autoLoop: false },
            { name: 'Header', expectedSeconds: 25, order: 2, instructionType: 'NONE', autoLoop: false },
            { name: 'Label', expectedSeconds: 5, order: 3, instructionType: 'NONE', autoLoop: false },
            { name: 'OPF', expectedSeconds: 30, order: 4, instructionType: 'NONE', autoLoop: false },
            { name: 'Gaylord', expectedSeconds: 60, order: 5, instructionType: 'NONE', autoLoop: false }
          ],
          expectedKitDuration: 165,
          expectedJobDuration: 12045,
          status: 'scheduled',
          createdAt: '2025-01-06T20:00:00.000Z'
        };
        setKittingJobs([mockJob]);
      }
    } catch (error) {
      console.error('Failed to fetch kitting jobs:', error);
      // Mock data for development
      const mockJob: KittingJob = {
        id: 'kj-1',
        customerName: 'Harbor3D',
        jobNumber: '31107',
        dueDate: '2025-01-07',
        orderedQuantity: 50,
        runLength: 9,
        customerSpec: 'Kings Hawaiian Rolls',
        description: 'Large Hutch 5 Pack',
        setup: 1800,
        makeReady: 120,
        takeDown: 1800,
        routeSteps: [
          { name: 'Hutch', expectedSeconds: 40, order: 0, instructionType: 'NONE', autoLoop: false },
          { name: 'Instructions', expectedSeconds: 5, order: 1, instructionType: 'NONE', autoLoop: false },
          { name: 'Header', expectedSeconds: 25, order: 2, instructionType: 'NONE', autoLoop: false },
          { name: 'Label', expectedSeconds: 5, order: 3, instructionType: 'NONE', autoLoop: false },
          { name: 'OPF', expectedSeconds: 30, order: 4, instructionType: 'NONE', autoLoop: false },
          { name: 'Gaylord', expectedSeconds: 60, order: 5, instructionType: 'NONE', autoLoop: false }
        ],
        expectedKitDuration: 165,
        expectedJobDuration: 12045,
        status: 'scheduled',
        createdAt: '2025-01-06T20:00:00.000Z'
      };
      setKittingJobs([mockJob]);
    }
  };

  /**
   * Convert kitting job to calendar event format with shift-based scheduling
   *
   * This function uses shift-based forward scheduling:
   * - Jobs are scheduled FORWARD from start time (not backward from due date)
   * - Duration accounts for active shifts, breaks, and non-working hours
   * - Multi-day jobs automatically span across shifts
   *
   * @param job - KittingJob object containing duration and scheduling data
   * @returns Array of Event objects representing the job on the calendar
   */
  const kittingJobToEvents = (job: any): Event[] => {
    try {
      // DEBUG: DISABLED - too much logging

      // Determine the start date and time for the job
      // Priority: scheduledDate/scheduledStartTime > current date/8:00 AM
      const startDate = job.scheduledDate ? new Date(job.scheduledDate) : new Date();
      const startTimeStr = job.scheduledStartTime || '08:00';

      // DEBUG: DISABLED - too much logging

      // Create full start datetime
      const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
      startDate.setHours(startHours, startMinutes, 0, 0);

      // Use shift-based forward scheduling if shifts are available
      if (allShifts.length > 0) {
        // Shift rendering (debug disabled)

        // Use per-job configuration if available, otherwise fall back to global active shifts
        // Y scenarios should ignore global shift activation to allow testing any config
        const endDate = scheduleJobForwardWithConfig(
          startDate,
          job.expectedJobDuration,
          allShifts,
          job.allowedShiftIds || [],
          job.includeWeekends || false,
          !!job.__yScenario,  // Ignore isActive for Y scenarios
          job.jobNumber  // Pass job number for debugging
        );

        // For now, create a single event spanning from start to end
        // TODO: In Sprint 3, split this into per-day events for multi-day jobs
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

        // If job spans multiple days, create events for each day
        if (startDateStr !== endDateStr) {
          // DEBUG: DISABLED - too much logging
          const events: Event[] = [];
          let currentDate = new Date(startDate);
          let dayCounter = 0;

          while (currentDate <= endDate && dayCounter < 30) {
            const currentDateStr = currentDate.toISOString().split('T')[0];
            const isLastDay = currentDateStr === endDateStr;
            const isFirstDay = dayCounter === 0;

            // Get the job's allowed shifts (or fall back to active shifts for compatibility)
            const jobShifts = (job.allowedShiftIds || []).length > 0
              ? allShifts.filter(s => job.allowedShiftIds.includes(s.id))
              : activeShifts;

            const dayStartTime = isFirstDay
              ? startTimeStr
              : jobShifts[0]?.startTime || '08:00';

            let dayEndTime = isLastDay
              ? endTimeStr
              : jobShifts[jobShifts.length - 1]?.endTime || '17:00';

            // Handle overnight shifts: if end time is before start time, it means the shift
            // ends the next day. For calendar display, cap at 23:59 for intermediate days.
            const startMinutes = parseInt(dayStartTime.split(':')[0]) * 60 + parseInt(dayStartTime.split(':')[1]);
            const endMinutes = parseInt(dayEndTime.split(':')[0]) * 60 + parseInt(dayEndTime.split(':')[1]);

            if (!isLastDay && endMinutes <= startMinutes) {
              // Overnight shift - use 23:59 as end time for this day
              dayEndTime = '23:59';
              // DEBUG: DISABLED - too much logging
            }

            // Calculate actual duration for this day segment
            const dayStartMinutes = parseInt(dayStartTime.split(':')[0]) * 60 + parseInt(dayStartTime.split(':')[1]);
            const dayEndMinutes = parseInt(dayEndTime.split(':')[0]) * 60 + parseInt(dayEndTime.split(':')[1]);
            const actualDurationMinutes = dayEndMinutes - dayStartMinutes;

            // DEBUG: DISABLED - too much logging

            events.push({
              id: job.__yScenario
                ? `y-${job.__yScenario}-${job.id}-day-${dayCounter}` // Unique key for Y overlays
                : job.__whatif
                ? `whatif-${job.id}-day-${dayCounter}` // Unique key for active what-if scenario
                : `kj-${job.id}-day-${dayCounter}`, // Standard key for production jobs
              title: `${job.jobNumber} - ${job.description}${events.length > 0 ? ` (Day ${dayCounter + 1})` : ''}`,
              date: currentDateStr,
              startTime: dayStartTime,
              endTime: dayEndTime,
              actualDurationMinutes, // Set actual work duration for this day
              description: `${job.customerName} | ${job.orderedQuantity} kits | ${formatDuration(job.expectedJobDuration)} | Due: ${job.dueDate}`,
              color: getKittingJobColor(job.status),
              type: 'kitting-job',
              kittingJob: job,
              __whatif: job.__whatif, // Preserve what-if marker
              __yScenario: job.__yScenario, // Preserve Y scenario ID
              __yScenarioName: job.__yScenarioName, // Preserve Y scenario name
              __yScenarioDeleted: job.__yScenarioDeleted // Preserve Y scenario deleted flag
            });

            currentDate.setDate(currentDate.getDate() + 1);
            dayCounter++;
          }

          // DEBUG: DISABLED - too much logging
          return events;
        }

        // Single day job
        // Calculate actual duration for single-day job
        const singleDayDurationMinutes = Math.ceil(job.expectedJobDuration / 60);

        // DEBUG: DISABLED - too much logging
        return [{
          id: job.__yScenario
            ? `y-${job.__yScenario}-${job.id}` // Unique key for Y overlays
            : job.__whatif
            ? `whatif-${job.id}` // Unique key for active what-if scenario
            : `kj-${job.id}`, // Standard key for production jobs
          title: `${job.jobNumber} - ${job.description}`,
          date: startDateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          actualDurationMinutes: singleDayDurationMinutes, // Set actual work duration
          description: `${job.customerName} | ${job.orderedQuantity} kits | ${formatDuration(job.expectedJobDuration)} | Due: ${job.dueDate}`,
          color: getKittingJobColor(job.status),
          type: 'kitting-job',
          kittingJob: job,
          __whatif: job.__whatif, // Preserve what-if marker
          __yScenario: job.__yScenario, // Preserve Y scenario ID
          __yScenarioName: job.__yScenarioName, // Preserve Y scenario name
          __yScenarioDeleted: job.__yScenarioDeleted // Preserve Y scenario deleted flag
        }];
      }

      // Fallback to 24/7 scheduling if no shifts configured
      console.warn('No active shifts - using 24/7 scheduling for', job.jobNumber);
      const endDate = new Date(startDate.getTime() + job.expectedJobDuration * 1000);
      const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

      // Calculate actual duration for 24/7 fallback
      const fallbackDurationMinutes = Math.ceil(job.expectedJobDuration / 60);

      return [{
        id: job.__yScenario
          ? `y-${job.__yScenario}-${job.id}` // Unique key for Y overlays
          : `kj-${job.id}`, // Standard key for production jobs
        title: `${job.jobNumber} - ${job.description}`,
        date: startDate.toISOString().split('T')[0],
        startTime: startTimeStr,
        endTime: endTimeStr,
        actualDurationMinutes: fallbackDurationMinutes, // Set actual work duration
        description: `${job.customerName} | ${job.orderedQuantity} kits | ${formatDuration(job.expectedJobDuration)} | Due: ${job.dueDate}`,
        color: getKittingJobColor(job.status),
        type: 'kitting-job',
        kittingJob: job,
        __whatif: job.__whatif, // Preserve what-if marker
        __yScenario: job.__yScenario, // Preserve Y scenario ID
        __yScenarioName: job.__yScenarioName, // Preserve Y scenario name
        __yScenarioDeleted: job.__yScenarioDeleted // Preserve Y scenario deleted flag
      }];
    } catch (error) {
      console.error('Error converting job to events:', job.jobNumber, error);
      return [];
    }
  };

  const getKittingJobColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'scheduled': return 'bg-gradient-to-r from-cyan-400/80 to-teal-500/80 backdrop-blur-sm border border-cyan-200';
      case 'in-progress': return 'bg-gradient-to-r from-green-400/80 to-green-500/80 backdrop-blur-sm border border-green-200';
      case 'completed': return 'bg-gradient-to-r from-gray-400/80 to-gray-500/80 backdrop-blur-sm border border-gray-200';
      case 'paused': return 'bg-gradient-to-r from-amber-400/80 to-amber-500/80 backdrop-blur-sm border border-amber-200';
      default: return 'bg-gradient-to-r from-blue-400/80 to-blue-500/80 backdrop-blur-sm border border-blue-200';
    }
  };

  // Filter Y overlay jobs using the same filter logic as production jobs
  const filteredYOverlayJobs = whatIf.yOverlayJobs.filter(job => {
    // Check if this job's ID is in the visible jobs set
    const isVisible = jobFilters.isJobVisible(job.id);

    // Check search query match
    const searchMatch = !jobFilters.searchQuery.trim() ||
      job.jobNumber.toLowerCase().includes(jobFilters.searchQuery.toLowerCase()) ||
      job.customerName.toLowerCase().includes(jobFilters.searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(jobFilters.searchQuery.toLowerCase());

    // Check status filter match
    const statusMatch = jobFilters.isStatusFilterActive(job.status.toUpperCase());

    return isVisible && searchMatch && statusMatch;
  });

  // DEBUG: DISABLED - too much logging
  // if (filteredYOverlayJobs.length > 0) {
  //     filteredYOverlayJobs.map(j => ({
  //       jobNumber: j.jobNumber,
  //       __yScenario: j.__yScenario,
  //       __yScenarioName: j.__yScenarioName
  //     }))
  //   );
  // }

  // DEBUG: DISABLED - too much logging

  // Combine events and kitting jobs for display (use visible jobs from filter)
  const yOverlayEvents = filteredYOverlayJobs.flatMap(kittingJobToEvents);

  // DEBUG: DISABLED - too much logging
  // if (yOverlayEvents.length > 0) {
  //     yOverlayEvents.map(e => ({
  //       id: e.id,
  //       title: e.title,
  //       __yScenario: e.__yScenario,
  //       __yScenarioName: e.__yScenarioName
  //     }))
  //   );
  // }

  // ALWAYS use pure production jobs for the base calendar
  // Y overlays render as separate ghost overlays on TOP of production
  // They should NEVER modify the production job display
  const productionEvents = jobFilters.visibleJobs.flatMap(kittingJobToEvents);

  // NOTE: We removed the "active scenario" concept since WhatIfControl panel was removed
  // Scenarios are now ONLY shown as Y overlays (purple ghosts), never as solid replacements

  const allCalendarItems = [
    ...events,
    ...productionEvents,          // Always show production jobs
    ...yOverlayEvents             // Y scenario overlays (purple ghosts)
  ];
  const oct27Items = allCalendarItems.filter(item => item.date === '2025-10-27');
  if (oct27Items.length > 0) {
    oct27Items.forEach(item => {
    });
  }

  // Filter based on view mode
  const filteredItems = allCalendarItems.filter(item => {
    if (viewMode === 'events') return item.type === 'event';
    if (viewMode === 'kitting-jobs') return item.type === 'kitting-job';
    return true; // 'all'
  });

  const handleCreateEvent = (date?: string, time?: string) => {
    const defaultDate = new Date().toISOString().split('T')[0];
    setModalState({
      isOpen: true,
      initialDate: date || currentDate || defaultDate,
      initialTime: time || '09:00',
    });
  };

  const handleEditEvent = (event: Event) => {
    setModalState({
      isOpen: true,
      event,
    });
  };

  const handleSaveEvent = (eventData: Omit<Event, 'id'> | Event) => {
    if ('id' in eventData) {
      setEvents(events.map(e => (e.id === eventData.id ? eventData : e)));
    } else {
      const newEvent: Event = {
        ...eventData,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      setEvents([...events, newEvent]);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const handleMoveEvent = (eventId: string, newDate: string, newTime: string) => {
    // Handle Y overlay (scenario) job moves
    if (eventId.startsWith('y-')) {
      // Extract scenarioId and jobId from format: y-{scenarioId}-{jobId} or y-{scenarioId}-{jobId}-day-{n}
      const parts = eventId.replace('y-', '').split('-');
      const scenarioId = parts[0];
      const jobId = parts[1];

      // Find the job in Y overlay jobs
      const job = whatIf.yOverlayJobs.find(j => j.id === jobId && j.__yScenario === scenarioId);
      if (job) {
        // Add MODIFY change to the SPECIFIC Y overlay scenario (not active scenario)
        const changeData = {
          scheduledDate: newDate,
          scheduledStartTime: newTime,
          jobNumber: job.jobNumber,
          customerName: job.customerName
        };

        const originalData = {
          scheduledDate: job.scheduledDate,
          scheduledStartTime: job.scheduledStartTime
        };

        // Call API directly to add change to this specific scenario
        fetch(apiUrl(`/api/scenarios/${scenarioId}/changes`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            operation: 'MODIFY',
            changeData,
            originalData
          })
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to add change to Y scenario');
            }
            // Refresh scenarios to show the updated Y overlay
            whatIf.fetchScenarios();

            // Show toast
            const displayDate = new Date(newDate + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });
            toast.success(`🔮 Y Overlay: ${job.jobNumber} → ${displayDate} at ${newTime}`);
          })
          .catch(error => {
            console.error('Failed to update Y overlay:', error);
            toast.error('Failed to update Y overlay');
          });
      }
      return;
    }

    // Handle kitting job moves
    if (eventId.startsWith('kj-')) {
      const jobId = eventId.replace('kj-', '').split('-day-')[0];
      updateKittingJobSchedule(jobId, newDate, newTime);
      return;
    }

    // Handle regular event moves
    setEvents(events.map(event => {
      if (event.id === eventId) {
        // Calculate the duration
        const startTime = new Date(`2000-01-01T${event.startTime}`);
        const endTime = new Date(`2000-01-01T${event.endTime}`);
        const duration = endTime.getTime() - startTime.getTime();

        // Set new start time and calculate new end time
        const newStartTime = new Date(`2000-01-01T${newTime}`);
        const newEndTime = new Date(newStartTime.getTime() + duration);

        return {
          ...event,
          date: newDate,
          startTime: newTime,
          endTime: newEndTime.toTimeString().slice(0, 5),
        };
      }
      return event;
    }));
  };

  const updateKittingJobSchedule = async (jobId: string, newDate: string, newTime: string) => {
    // Find the job to get its number for the toast message
    const job = kittingJobs.find(j => j.id === jobId);
    const jobNumber = job?.jobNumber || jobId;

    // Format date for display
    const displayDate = new Date(newDate + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    // **WHAT-IF MODE**: Track change in scenario instead of updating production
    if (whatIf.isWhatIfMode && whatIf.activeScenario) {

      try {
        // Store original data for rollback
        const originalData = {
          scheduledDate: job?.scheduledDate,
          scheduledStartTime: job?.scheduledStartTime
        };

        // Store new data
        const changeData = {
          scheduledDate: newDate,
          scheduledStartTime: newTime,
          jobNumber: job?.jobNumber,
          customerName: job?.customerName
        };

        // Add change to scenario
        await whatIf.addChange('MODIFY', jobId, changeData, originalData);

        // Show what-if toast
        toast.success(`🔮 Scenario change: ${jobNumber} → ${displayDate} at ${newTime}`, {
          icon: '🔮',
          duration: 3000
        });
      } catch (error) {
        toast.error(`Failed to add change to scenario`);
      }
      return;
    }

    // **PRODUCTION MODE**: Update database directly
    // Optimistic update: update UI immediately
    const previousJobs = [...kittingJobs];
    const updatedJobs = kittingJobs.map(job => {
      if (job.id === jobId) {
        return {
          ...job,
          scheduledDate: new Date(newDate + 'T12:00:00'),
          scheduledStartTime: newTime
        };
      }
      return job;
    });
    setKittingJobs(updatedJobs);

    try {
      const url = apiUrl(`/api/kitting-jobs?id=${jobId}`);
      const payload = {
        scheduledDate: newDate,
        scheduledStartTime: newTime
      };

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {

        // Show success toast
        toast.success(`Job ${jobNumber} rescheduled to ${displayDate} at ${newTime}`);

        // NOTE: No need to fetchKittingJobs() here - optimistic update already handled UI
        // Removing this prevents job filters from being disrupted
      } else {
        // Show error toast
        toast.error(`Failed to reschedule job ${jobNumber}`);

        // Revert to previous state on error
        setKittingJobs(previousJobs);
      }
    } catch (error) {
      // Show error toast
      toast.error(`Error rescheduling job ${jobNumber}`);

      // Revert to previous state on error
      setKittingJobs(previousJobs);
    }
  };

  const handleResizeEvent = (eventId: string, resizeHandle: 'top' | 'bottom', newTime: string) => {
    setEvents(events.map(event => {
      if (event.id === eventId) {
        if (resizeHandle === 'top') {
          // Ensure new start time is before end time
          const newStartTime = new Date(`2000-01-01T${newTime}`);
          const endTime = new Date(`2000-01-01T${event.endTime}`);

          if (newStartTime < endTime) {
            return {
              ...event,
              startTime: newTime,
            };
          }
        } else if (resizeHandle === 'bottom') {
          // Ensure new end time is after start time
          const startTime = new Date(`2000-01-01T${event.startTime}`);
          const newEndTime = new Date(`2000-01-01T${newTime}`);

          if (newEndTime > startTime) {
            return {
              ...event,
              endTime: newTime,
            };
          }
        }
      }
      return event;
    }));
  };

  const closeModal = () => {
    setModalState({ isOpen: false });
  };

  const handleNavigateToDay = (date: string) => {
    setSelectedDate(date);
    setCalendarView('daily');
  };

  // Job operation handlers for context menu
  const handleAssignJob = async (jobId: string, userId: string) => {
    try {
      const response = await fetch(apiUrl('/api/job-assignments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          userId,
          assignedBy: 'current-user-id' // This would come from auth context
        }),
      });

      if (response.ok) {
        // Refresh data to show updated assignments
        fetchKittingJobs();
      }
    } catch (error) {
      console.error('Failed to assign job:', error);
    }
  };

  const handleUnassignJob = async (assignmentId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/job-assignments/${assignmentId}`), {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh data to show updated assignments
        fetchKittingJobs();
      }
    } catch (error) {
      console.error('Failed to unassign job:', error);
    }
  };

  const handleChangeStatus = async (jobId: string, status: string) => {
    try {
      const response = await fetch(apiUrl(`/api/kitting-jobs?id=${jobId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Refresh data to show updated status
        fetchKittingJobs();
      }
    } catch (error) {
      console.error('Failed to change job status:', error);
    }
  };

  const handleStartJob = (jobId: string) => {
    window.open(`/execute/${jobId}`, '_blank');
  };

  const handleEditStations = (jobId: string) => {

    // Check if this is a Y overlay job
    const yOverlayJob = whatIf.yOverlayJobs.find(j => j.id === jobId);
    if (yOverlayJob) {
      setStationEditorState({ isOpen: true, job: yOverlayJob, isYScenario: true });
      return;
    }

    // Otherwise, it's a production job
    const job = kittingJobs.find(j => j.id === jobId);
    if (job) {
      setStationEditorState({ isOpen: true, job, isYScenario: false });
    } else {
      console.error('❌ Job not found in kittingJobs array');
      toast.error('Job not found. Please try refreshing the page.');
    }
  };

  const handleEditAllowedShifts = (jobId: string) => {
    // Check if this is a Y overlay job
    const yOverlayJob = whatIf.yOverlayJobs.find(j => j.id === jobId);
    if (yOverlayJob) {
      setShiftsEditorState({ isOpen: true, job: yOverlayJob, isYScenario: true });
      return;
    }

    // Otherwise, it's a production job
    const job = kittingJobs.find(j => j.id === jobId);
    if (job) {
      setShiftsEditorState({ isOpen: true, job, isYScenario: false });
    }
  };

  const handleCreateScenarioForJob = async (jobId: string) => {

    const job = kittingJobs.find(j => j.id === jobId);
    if (!job) {
      toast.error('Job not found. Please try refreshing the page.');
      return;
    }

    // Prompt for scenario name with default
    const scenarioName = prompt(
      `Create scenario for ${job.jobNumber} - ${job.customerName}`,
      `Scenario for ${job.jobNumber}`
    );

    if (!scenarioName || !scenarioName.trim()) {
      return; // User cancelled or entered empty name
    }

    try {
      const scenario = await whatIf.createScenario(scenarioName.trim(), undefined, jobId);
      toast.success(`🔮 Created scenario: ${scenarioName.trim()}`);

      // Automatically make the new scenario visible as Y overlay
      whatIf.toggleYScenarioVisibility(scenario.id);

      // Open filter panel to Y Overlays tab to show the new scenario
      setIsFilterPanelOpen(true);
    } catch (error) {
      console.error('Failed to create scenario:', error);
      toast.error('Failed to create scenario. Please try again.');
    }
  };

  const handleEditProductionDelays = (jobId: string) => {
    const job = kittingJobs.find(j => j.id === jobId);

    console.log('🔍 DIAGNOSTIC: Opening production delays editor');
    console.log('  Job:', job?.jobNumber || 'NOT FOUND');
    console.log('  Has routeSteps?', !!job?.routeSteps, 'Count:', job?.routeSteps?.length || 0);
    console.log('  Duration:', job?.expectedJobDuration || 'N/A', 'seconds');
    console.log('  Station count:', job?.stationCount || 'N/A');

    if (!job) {
      toast.error('Job not found. Please try refreshing the page.');
      return;
    }

    if (!job.routeSteps || job.routeSteps.length === 0) {
      toast.error('Cannot manage delays: Job route steps not loaded. Please refresh the page.');
      console.error('❌ Job missing routeSteps:', job.jobNumber);
      return;
    }

    setProductionDelayEditorState({
      isOpen: true,
      job: job
    });
  };

  const handleCommitYToProduction = async (jobId: string, scenarioId: string) => {
    try {

      // Find the scenario
      if (!whatIf.allScenarios || !Array.isArray(whatIf.allScenarios)) {
        console.error('❌ allScenarios is not available or not an array');
        toast.error('Scenario data not loaded. Please refresh the page.');
        return;
      }

      const scenario = whatIf.allScenarios.find(s => s.id === scenarioId);

      if (!scenario) {
        toast.error('Scenario not found.');
        return;
      }

      // Find the production job
      const productionJob = kittingJobs.find(j => j.id === jobId);

      if (!productionJob) {
        toast.error('Production job not found.');
        return;
      }

      // Find the MODIFY change for this job in the scenario
      if (!scenario.changes || !Array.isArray(scenario.changes)) {
        console.error('❌ scenario.changes is not available or not an array');
        toast.error('Scenario has no changes data.');
        return;
      }

      const jobChange = scenario.changes.find(
        c => c.jobId === jobId && c.operation === 'MODIFY'
      );

      if (!jobChange) {
        toast.error('No changes found for this job in the scenario.');
        return;
      }

      // Confirm with user
      const confirmed = window.confirm(
        `Commit Y scenario "${scenario.name}" changes to production job ${productionJob.jobNumber}?\n\n` +
        `This will update the production job with the Y scenario's configuration.`
      );

      if (!confirmed) {
        return;
      }


      // Apply the change data to update the production job
      const response = await fetch(apiUrl(`/api/kitting-jobs/${jobId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobChange.changeData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }


      // Delete the scenario since it's been committed to production
      const deleteResponse = await fetch(apiUrl(`/api/scenarios/${scenarioId}`), {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        console.error('Failed to delete scenario after commit');
        // Don't throw - the job update succeeded, this is just cleanup
      } else {
      }

      // Refresh the job list to show updated production data
      await fetchKittingJobs();

      // Refresh scenarios list to remove the deleted scenario
      await whatIf.fetchScenarios();

      toast.success(`✅ Committed Y scenario "${scenario.name}" to ${productionJob.jobNumber}`);
    } catch (error) {
      console.error('❌ Failed to commit Y scenario to production:', error);
      toast.error(`Failed to commit changes: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSaveStationCount = async (jobId: string, stationCount: number) => {

    try {
      if (stationEditorState.isYScenario) {
        // Update scenario, not production
        const scenarioId = stationEditorState.job?.__yScenario;
        if (!scenarioId) {
          throw new Error('Cannot find scenario ID for Y overlay job');
        }

        // Get existing change data for this job (if any)
        const scenario = whatIf.allScenarios.find(s => s.id === scenarioId);
        const existingChange = scenario?.changes.find(c => c.jobId === jobId && c.operation === 'MODIFY');
        const changeData = existingChange?.changeData || {};
        changeData.stationCount = stationCount;

        // Add/update the change to the specific scenario
        const response = await fetch(apiUrl(`/api/scenarios/${scenarioId}/changes`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            operation: 'MODIFY',
            changeData,
            originalData: { stationCount: stationEditorState.job?.stationCount }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update Y scenario station count');
        }

        // Refresh scenarios to show updated duration
        await whatIf.fetchScenarios();
        toast.success(`🔮 Updated Y scenario stations to ${stationCount}`);
      } else {
        // Update production job

        const response = await fetch(apiUrl(`/api/kitting-jobs/${jobId}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ stationCount }),
        });


        if (!response.ok) {
          const errorText = await response.text();
          console.error('💾 Error response:', errorText);
          throw new Error('Failed to update station count');
        }

        // Refresh jobs to show updated duration
        fetchKittingJobs();
        toast.success(`✓ Updated stations to ${stationCount}`);
      }
    } catch (error) {
      console.error('💾 Failed to update station count:', error);
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleSaveAllowedShifts = async (jobId: string, allowedShiftIds: string[]) => {
    try {

      if (shiftsEditorState.isYScenario) {
        // Update Y scenario, not production
        const scenarioId = shiftsEditorState.job?.__yScenario;
        if (!scenarioId) {
          throw new Error('Cannot find scenario ID for Y overlay job');
        }

        // Get existing change data for this job (if any)
        const scenario = whatIf.allScenarios.find(s => s.id === scenarioId);
        const existingChange = scenario?.changes.find(c => c.jobId === jobId && c.operation === 'MODIFY');
        const changeData = existingChange?.changeData || {};
        changeData.allowedShiftIds = allowedShiftIds;

        // Add/update the change to the specific scenario
        const response = await fetch(apiUrl(`/api/scenarios/${scenarioId}/changes`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            operation: 'MODIFY',
            changeData,
            originalData: { allowedShiftIds: shiftsEditorState.job?.allowedShiftIds }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update Y scenario shifts');
        }

        // Refresh scenarios to recalculate duration with new shifts
        await whatIf.fetchScenarios();
        toast.success(`🔮 Updated Y scenario shifts (${allowedShiftIds.length} shifts)`);
      } else {
        // Update production job
        const response = await fetch(apiUrl(`/api/kitting-jobs/${jobId}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ allowedShiftIds }),
        });

        if (!response.ok) {
          throw new Error('Failed to update allowed shifts');
        }

        // Refresh jobs to show updated schedule
        await fetchKittingJobs();

        toast.success(`✓ Updated allowed shifts (${allowedShiftIds.length} shifts)`);
      }
    } catch (error) {
      console.error('Failed to update allowed shifts:', error);
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleEditJob = (jobId: string) => {
    // Open job in new tab for editing
    window.open(`/edit-job/${jobId}`, '_blank');
  };

  const handleDeleteJob = async (jobId: string) => {

    try {
      const response = await fetch(apiUrl(`/api/kitting-jobs/${jobId}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Job deleted successfully');
        // Refresh jobs list
        await fetchKittingJobs();
      } else {
        const error = await response.text();
        toast.error(`Failed to delete job: ${error}`);
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job. Please try again.');
    }
  };

  const handleDeleteFromScenario = async (jobId: string, scenarioId: string) => {

    try {
      // Use the whatIf hook's deleteChange method to remove the job from the scenario
      await whatIf.deleteChange(scenarioId, jobId);

      toast.success('Job removed from scenario');

      // Refresh scenarios to update the overlay
      await whatIf.fetchScenarios();
    } catch (error) {
      console.error('Failed to delete job from scenario:', error);
      toast.error('Failed to remove job from scenario. Please try again.');
    }
  };

  const handleJumpToJob = (job: KittingJob) => {
    // Navigate to the job's scheduled date
    if (job.scheduledDate) {
      const dateStr = new Date(job.scheduledDate).toISOString().split('T')[0];
      setSelectedDate(dateStr);
      setCalendarView('daily'); // Switch to daily view for best visibility
      setIsFilterPanelOpen(false); // Close filter panel
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 m-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-800">Calendar View</h2>
              {/* Calendar View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCalendarView('monthly')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    calendarView === 'monthly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setCalendarView('weekly')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    calendarView === 'weekly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setCalendarView('daily')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    calendarView === 'daily'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Daily
                </button>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Items ({allCalendarItems.length})
              </button>
              <button
                onClick={() => setViewMode('events')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'events'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Events ({events.length})
              </button>
              <button
                onClick={() => setViewMode('kitting-jobs')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'kitting-jobs'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Kitting Jobs ({kittingJobs.length})
              </button>

              {/* Shift Quick Toggles */}
              {allShifts.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide mr-1">Shifts:</span>
                  {allShifts.map((shift) => (
                    <div key={shift.id} className="relative group">
                      <button
                        onClick={() => handleShiftToggle(shift.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          shift.isActive
                            ? 'bg-blue-500 text-white shadow-sm hover:bg-blue-600'
                            : 'bg-white text-gray-500 border border-gray-300 hover:bg-gray-100'
                        }`}
                        title={`${shift.isActive ? 'Disable' : 'Enable'} ${shift.name} (${shift.startTime}-${shift.endTime})`}
                        style={shift.isActive && shift.color ? { backgroundColor: shift.color } : {}}
                      >
                        {shift.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditShift(shift);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-900 flex items-center justify-center"
                        title="Edit shift settings"
                      >
                        ⚙
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Filter Panel Toggle */}
              <button
                onClick={() => setIsFilterPanelOpen(true)}
                className="relative px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-md flex items-center gap-2"
                title="Filters - Jobs & Y Overlays (Cmd+F)"
              >
                {/* Y/Ŷ Dual Timeline Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Y (Production) - Solid line */}
                  <path d="M 3 18 L 8 15 L 13 16 L 18 12 L 21 10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"/>
                  {/* Ŷ (Scenarios) - Dashed line */}
                  <path d="M 3 20 L 8 16 L 13 17 L 18 11 L 21 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="3,2"
                        opacity="0.7"
                        fill="none"/>
                  {/* Data points */}
                  <circle cx="21" cy="10" r="1.5" fill="currentColor"/>
                  <circle cx="21" cy="8" r="1.5" fill="currentColor" opacity="0.7"/>
                </svg>
                Filters
                {/* Hidden Jobs Badge (top-right) */}
                {jobFilters.hiddenJobCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {jobFilters.hiddenJobCount}
                  </span>
                )}
                {/* Y Overlays Badge (bottom-right) */}
                {filteredYOverlayJobs.length > 0 && (
                  <span className="absolute -bottom-2 -right-2 bg-purple-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {filteredYOverlayJobs.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Container - Takes remaining vertical space */}
        <div className="flex-1 overflow-hidden m-2">
          {calendarView === 'daily' ? (
            <DailyCalendar
              events={filteredItems}
              onCreateEvent={handleCreateEvent}
              onEditEvent={handleEditEvent}
              onMoveEvent={handleMoveEvent}
              onResizeEvent={handleResizeEvent}
              initialDate={selectedDate}
              onAssignJob={handleAssignJob}
              onUnassignJob={handleUnassignJob}
              onChangeStatus={handleChangeStatus}
              onStartJob={handleStartJob}
              onEditStations={handleEditStations}
              onEditAllowedShifts={handleEditAllowedShifts}
              onCreateScenarioForJob={handleCreateScenarioForJob}
              onEditProductionDelays={handleEditProductionDelays}
              onCommitYToProduction={handleCommitYToProduction}
              onDeleteFromScenario={handleDeleteFromScenario}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob}
              densityMode={jobFilters.densityMode}
              activeShifts={activeShifts}
              allShifts={allShifts}
            />
          ) : calendarView === 'weekly' ? (
            <WeeklyCalendar
              events={filteredItems}
              onCreateEvent={handleCreateEvent}
              onEditEvent={handleEditEvent}
              onMoveEvent={handleMoveEvent}
              onResizeEvent={handleResizeEvent}
              onNavigateToDay={handleNavigateToDay}
              onAssignJob={handleAssignJob}
              onUnassignJob={handleUnassignJob}
              onChangeStatus={handleChangeStatus}
              onStartJob={handleStartJob}
              onEditStations={handleEditStations}
              onEditAllowedShifts={handleEditAllowedShifts}
              onCreateScenarioForJob={handleCreateScenarioForJob}
              onEditProductionDelays={handleEditProductionDelays}
              onCommitYToProduction={handleCommitYToProduction}
              onDeleteFromScenario={handleDeleteFromScenario}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob}
              densityMode={jobFilters.densityMode}
              allShifts={allShifts}
            />
          ) : (
            <MonthlyCalendar
              events={filteredItems}
              onCreateEvent={handleCreateEvent}
              onEditEvent={handleEditEvent}
              onMoveEvent={handleMoveEvent}
              onResizeEvent={handleResizeEvent}
              onNavigateToDay={handleNavigateToDay}
              onAssignJob={handleAssignJob}
              onUnassignJob={handleUnassignJob}
              onChangeStatus={handleChangeStatus}
              onStartJob={handleStartJob}
              onEditStations={handleEditStations}
              onEditAllowedShifts={handleEditAllowedShifts}
              onCreateScenarioForJob={handleCreateScenarioForJob}
              onEditProductionDelays={handleEditProductionDelays}
              onCommitYToProduction={handleCommitYToProduction}
              onDeleteFromScenario={handleDeleteFromScenario}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob}
              densityMode={jobFilters.densityMode}
              allShifts={allShifts}
            />
          )}
        </div>

        <EventModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          event={modalState.event}
          initialDate={modalState.initialDate}
          initialTime={modalState.initialTime}
        />

        {/* Job Filter Panel */}
        <JobFilterPanel
          isOpen={isFilterPanelOpen}
          onClose={() => {
            setIsFilterPanelOpen(false);
            setDelayManagerContext(null); // Clear context when panel closes
          }}
          filteredJobs={jobFilters.filteredJobs}
          visibleJobs={jobFilters.visibleJobs}
          searchQuery={jobFilters.searchQuery}
          onSearchChange={jobFilters.setSearchQuery}
          statusFilters={jobFilters.statusFilters}
          onToggleStatusFilter={jobFilters.toggleStatusFilter}
          densityMode={jobFilters.densityMode}
          onDensityChange={jobFilters.setDensityMode}
          onToggleJobVisibility={jobFilters.toggleJobVisibility}
          onSelectAll={jobFilters.selectAll}
          onDeselectAll={jobFilters.deselectAll}
          onResetFilters={jobFilters.resetFilters}
          onJumpToJob={handleJumpToJob}
          isJobVisible={jobFilters.isJobVisible}
          hiddenJobCount={jobFilters.hiddenJobCount}
          allScenarios={whatIf.allScenarios}
          visibleScenarios={yFilters.visibleScenarios}
          onToggleScenarioVisibility={whatIf.toggleYScenarioVisibility}
          isScenarioVisible={(id) => whatIf.visibleYScenarioIds.has(id)}
          yOverlayCount={filteredYOverlayJobs.length}
          allJobs={kittingJobs}
          delayManagerContext={delayManagerContext}
          onCreateScenario={whatIf.createScenario}
          onCommitScenario={whatIf.commitScenario}
          onDeleteScenario={whatIf.discardScenario}
        />


        <ShiftConfigModal
          isOpen={isShiftModalOpen}
          onClose={() => {
            setIsShiftModalOpen(false);
            setEditingShift(null);
          }}
          shift={editingShift}
          onSave={handleSaveShift}
          onDelete={handleDeleteShift}
        />

        {stationEditorState.job && (
          <StationEditor
            isOpen={stationEditorState.isOpen}
            onClose={() => setStationEditorState({ isOpen: false })}
            job={stationEditorState.job}
            onSave={handleSaveStationCount}
          />
        )}

        {shiftsEditorState.job && (
          <AllowedShiftsEditor
            isOpen={shiftsEditorState.isOpen}
            onClose={() => setShiftsEditorState({ isOpen: false })}
            job={shiftsEditorState.job}
            allShifts={allShifts}
            onSave={handleSaveAllowedShifts}
          />
        )}

        {productionDelayEditorState.job && (
          <DelayEditor
            isOpen={productionDelayEditorState.isOpen}
            onClose={() => setProductionDelayEditorState({ isOpen: false })}
            job={productionDelayEditorState.job}
            isProductionMode={true}
            onDelaysChanged={() => {
              // Refresh production delays to show updated durations
              whatIf.refreshProductionDelays();
            }}
          />
        )}

        <FloatingActionButton onClick={() => window.open('/edit-job/new', '_blank')} />
      </div>
    </div>
  );
};

export default Dashboard;