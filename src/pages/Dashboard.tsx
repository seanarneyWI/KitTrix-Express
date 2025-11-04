import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import WeeklyCalendar from '../components/WeeklyCalendar';
import MonthlyCalendar from '../components/MonthlyCalendar';
import DailyCalendar from '../components/DailyCalendar';
import EventModal from '../components/EventModal';
import FloatingActionButton from '../components/FloatingActionButton';
import JobFilterPanel from '../components/JobFilterPanel';
import WhatIfControl from '../components/WhatIfControl';
import { useJobFilters } from '../hooks/useJobFilters';
import { useWhatIfMode } from '../hooks/useWhatIfMode';
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
  const [isWhatIfPanelOpen, setIsWhatIfPanelOpen] = useState(false);

  // Initialize What-If mode hook (applies scenario changes on top of production jobs)
  const whatIf = useWhatIfMode(kittingJobs);

  // Initialize job filter hook (applies filtering to what-if or production jobs)
  const jobFilters = useJobFilters(whatIf.jobs);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    event?: Event;
    initialDate?: string;
    initialTime?: string;
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
      console.log('Job update event received - refreshing jobs...');
      fetchKittingJobs();
    };

    // Auto-refresh when window gains focus (when returning from job creation)
    const handleWindowFocus = () => {
      console.log('Window focused - refreshing jobs...');
      fetchKittingJobs();
    };

    // Listen for custom job update events
    window.addEventListener('jobsUpdated', handleJobUpdate);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup
    return () => {
      window.removeEventListener('jobsUpdated', handleJobUpdate);
      window.removeEventListener('focus', handleWindowFocus);
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
      console.log('Loaded active shifts:', activeShiftsData.length, 'all shifts:', allShiftsData.length);
    } catch (error) {
      console.error('Failed to load shifts:', error);
      // Continue with empty shifts array (will fallback to 24/7 scheduling)
    }
  };

  const handleShiftsChange = (updatedActiveShifts: Shift[]) => {
    setActiveShifts(updatedActiveShifts);
    console.log('Active shifts updated:', updatedActiveShifts.length);
    // Re-render calendar with new shift configuration
    // The calendar will automatically update because kittingJobToEvents depends on activeShifts
  };

  const fetchKittingJobs = async () => {
    try {
      console.log('Fetching kitting jobs...');
      const response = await fetch(apiUrl('/api/kitting-jobs'));
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched kitting jobs:', data.length || 0);
        setKittingJobs(data || []);
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
      console.log('🔄 Converting job to events (shift-based):', job.jobNumber);

      // Determine the start date and time for the job
      // Priority: scheduledDate/scheduledStartTime > current date/8:00 AM
      const startDate = job.scheduledDate ? new Date(job.scheduledDate) : new Date();
      const startTimeStr = job.scheduledStartTime || '08:00';

      console.log(`  📅 Job ${job.jobNumber}: scheduledDate=${job.scheduledDate}, startDate=${startDate.toISOString()}, startTime=${startTimeStr}`);

      // Create full start datetime
      const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
      startDate.setHours(startHours, startMinutes, 0, 0);

      // Use shift-based forward scheduling if shifts are available
      if (allShifts.length > 0) {
        // Use per-job configuration if available, otherwise fall back to global active shifts
        const endDate = scheduleJobForwardWithConfig(
          startDate,
          job.expectedJobDuration,
          allShifts,
          job.allowedShiftIds || [],
          job.includeWeekends || false
        );

        // For now, create a single event spanning from start to end
        // TODO: In Sprint 3, split this into per-day events for multi-day jobs
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

        // If job spans multiple days, create events for each day
        if (startDateStr !== endDateStr) {
          console.log(`  📊 Multi-day job detected: ${startDateStr} to ${endDateStr}`);
          const events: Event[] = [];
          let currentDate = new Date(startDate);
          let dayCounter = 0;

          while (currentDate <= endDate && dayCounter < 30) {
            const currentDateStr = currentDate.toISOString().split('T')[0];
            const isLastDay = currentDateStr === endDateStr;
            const isFirstDay = dayCounter === 0;

            const dayStartTime = isFirstDay
              ? startTimeStr
              : activeShifts[0]?.startTime || '08:00';

            let dayEndTime = isLastDay
              ? endTimeStr
              : activeShifts[activeShifts.length - 1]?.endTime || '17:00';

            // Handle overnight shifts: if end time is before start time, it means the shift
            // ends the next day. For calendar display, cap at 23:59 for intermediate days.
            const startMinutes = parseInt(dayStartTime.split(':')[0]) * 60 + parseInt(dayStartTime.split(':')[1]);
            const endMinutes = parseInt(dayEndTime.split(':')[0]) * 60 + parseInt(dayEndTime.split(':')[1]);

            if (!isLastDay && endMinutes <= startMinutes) {
              // Overnight shift - use 23:59 as end time for this day
              dayEndTime = '23:59';
              console.log(`    ⚠️ Overnight shift detected, using 23:59 as end time for display`);
            }

            console.log(`    Day ${dayCounter + 1}: ${currentDateStr} ${dayStartTime}-${dayEndTime}`);

            events.push({
              id: `kj-${job.id}-day-${dayCounter}`,
              title: `${job.jobNumber} - ${job.description}${events.length > 0 ? ` (Day ${dayCounter + 1})` : ''}`,
              date: currentDateStr,
              startTime: dayStartTime,
              endTime: dayEndTime,
              description: `${job.customerName} | ${job.orderedQuantity} kits | ${formatDuration(job.expectedJobDuration)} | Due: ${job.dueDate}`,
              color: getKittingJobColor(job.status),
              type: 'kitting-job',
              kittingJob: job
            });

            currentDate.setDate(currentDate.getDate() + 1);
            dayCounter++;
          }

          console.log(`  ✅ Created ${events.length} day-events for ${job.jobNumber}`);
          return events;
        }

        // Single day job
        console.log(`  ✅ Single-day job: ${startDateStr} ${startTimeStr}-${endTimeStr}`);
        return [{
          id: `kj-${job.id}`,
          title: `${job.jobNumber} - ${job.description}`,
          date: startDateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          description: `${job.customerName} | ${job.orderedQuantity} kits | ${formatDuration(job.expectedJobDuration)} | Due: ${job.dueDate}`,
          color: getKittingJobColor(job.status),
          type: 'kitting-job',
          kittingJob: job
        }];
      }

      // Fallback to 24/7 scheduling if no shifts configured
      console.warn('No active shifts - using 24/7 scheduling for', job.jobNumber);
      const endDate = new Date(startDate.getTime() + job.expectedJobDuration * 1000);
      const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

      return [{
        id: `kj-${job.id}`,
        title: `${job.jobNumber} - ${job.description}`,
        date: startDate.toISOString().split('T')[0],
        startTime: startTimeStr,
        endTime: endTimeStr,
        description: `${job.customerName} | ${job.orderedQuantity} kits | ${formatDuration(job.expectedJobDuration)} | Due: ${job.dueDate}`,
        color: getKittingJobColor(job.status),
        type: 'kitting-job',
        kittingJob: job
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

  // Combine events and kitting jobs for display (use visible jobs from filter)
  const allCalendarItems = [
    ...events,
    ...jobFilters.visibleJobs.flatMap(kittingJobToEvents)
  ];

  // Log all calendar items for debugging
  console.log(`📋 Total calendar items: ${allCalendarItems.length}`);
  const oct27Items = allCalendarItems.filter(item => item.date === '2025-10-27');
  if (oct27Items.length > 0) {
    console.log(`📍 Items for Oct 27: ${oct27Items.length}`);
    oct27Items.forEach(item => {
      console.log(`  - ${item.id}: ${item.title} (${item.startTime}-${item.endTime})`);
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
    console.log('🎯 handleMoveEvent called:', { eventId, newDate, newTime });

    // Handle kitting job moves
    if (eventId.startsWith('kj-')) {
      const jobId = eventId.replace('kj-', '').split('-day-')[0];
      console.log('  Extracted job ID:', jobId);
      updateKittingJobSchedule(jobId, newDate, newTime);
      return;
    }

    // Handle regular event moves
    console.log('  Moving regular event');
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
      console.log('🔮 What-If mode: Adding MODIFY change to scenario');

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

        console.log('✅ What-If change added successfully');
      } catch (error) {
        console.error('❌ Failed to add what-if change:', error);
        toast.error(`Failed to add change to scenario`);
      }
      return;
    }

    // **PRODUCTION MODE**: Update database directly
    console.log('📅 Production mode: Updating job in database');

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

      console.log('📡 Making API call to update job schedule:', { url, payload });

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 API response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Job updated successfully:', data);

        // Show success toast
        toast.success(`Job ${jobNumber} rescheduled to ${displayDate} at ${newTime}`);

        // Refresh from server to get accurate recalculated data
        fetchKittingJobs();
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update job schedule:', response.status, errorText);

        // Show error toast
        toast.error(`Failed to reschedule job ${jobNumber}`);

        // Revert to previous state on error
        setKittingJobs(previousJobs);
      }
    } catch (error) {
      console.error('❌ Error updating kitting job schedule:', error);

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
    console.log('=== NAVIGATION TO EXECUTION PAGE ===');
    console.log('Starting job:', jobId);
    console.log('Navigating to:', `/execute/${jobId}`);
    window.open(`/execute/${jobId}`, '_blank');
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
                  onClick={() => setCalendarView('daily')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    calendarView === 'daily'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Daily
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
                  onClick={() => setCalendarView('monthly')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    calendarView === 'monthly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
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

              {/* What-If Control Button */}
              <button
                onClick={() => setIsWhatIfPanelOpen(true)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md flex items-center gap-2 ${
                  whatIf.mode === 'whatif'
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                title="What-If Scenario Planning"
              >
                🔮 What-If
                {whatIf.changeCount > 0 && (
                  <span className="ml-1 px-2 py-1 bg-purple-700 text-white text-xs rounded-full font-bold">
                    {whatIf.changeCount}
                  </span>
                )}
              </button>

              {/* Job Filter Panel Toggle */}
              <button
                onClick={() => setIsFilterPanelOpen(true)}
                className="relative px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-md flex items-center gap-2"
                title="Filter & Search Jobs (Cmd+F)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter Jobs
                {jobFilters.hiddenJobCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {jobFilters.hiddenJobCount}
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
              densityMode={jobFilters.densityMode}
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
              densityMode={jobFilters.densityMode}
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
              densityMode={jobFilters.densityMode}
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
          onClose={() => setIsFilterPanelOpen(false)}
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
        />

        <WhatIfControl
          isOpen={isWhatIfPanelOpen}
          onClose={() => setIsWhatIfPanelOpen(false)}
          mode={whatIf.mode}
          onModeChange={whatIf.switchMode}
          activeScenario={whatIf.activeScenario}
          allScenarios={whatIf.allScenarios}
          changeCount={whatIf.changeCount}
          onCreateScenario={whatIf.createScenario}
          onActivateScenario={whatIf.activateScenario}
          onCommitScenario={whatIf.commitScenario}
          onDiscardScenario={whatIf.discardScenario}
        />

        <FloatingActionButton onClick={() => window.open('/edit-job/new', '_blank')} />
      </div>
    </div>
  );
};

export default Dashboard;