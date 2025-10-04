import React, { useState, useEffect } from 'react';
import WeeklyCalendar from '../components/WeeklyCalendar';
import MonthlyCalendar from '../components/MonthlyCalendar';
import DailyCalendar from '../components/DailyCalendar';
import EventModal from '../components/EventModal';
import FloatingActionButton from '../components/FloatingActionButton';
import { Event } from '../types/event';
import { KittingJob } from '../types/kitting';
import { formatDuration } from '../utils/kittingCalculations';

const Dashboard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);

  const [kittingJobs, setKittingJobs] = useState<KittingJob[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'events' | 'kitting-jobs'>('all');
  const [calendarView, setCalendarView] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [mounted, setMounted] = useState(false);

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

  const fetchKittingJobs = async () => {
    try {
      console.log('Fetching kitting jobs...');
      const response = await fetch('http://localhost:3001/api/kitting-jobs');
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
   * Convert kitting job to calendar event format with proper duration calculation
   *
   * This function handles both single-day and multi-day job scheduling:
   * - Single-day jobs: Fit within a 9-hour work day (8 AM - 5 PM)
   * - Multi-day jobs: Automatically span across multiple work days
   *
   * @param job - KittingJob object containing duration and scheduling data
   * @returns Array of Event objects representing the job on the calendar
   */
  const kittingJobToEvents = (job: any): Event[] => {
    try {
      console.log('Converting job to events:', job.jobNumber);

      // Determine the base date for scheduling
      // Priority: scheduledDate > dueDate
      const baseDate = job.scheduledDate ? new Date(job.scheduledDate) : new Date(job.dueDate);
      const baseDateStr = baseDate.toISOString().split('T')[0];

      // Determine start time for the job
      // Priority: scheduledStartTime > default 8:00 AM
      const startTimeStr = job.scheduledStartTime || '08:00';

      // Convert job duration from seconds to hours for calculation
      // expectedJobDuration is stored in seconds in the database
      const jobDurationHours = job.expectedJobDuration / 3600;

      // Parse the start time into a Date object for calculations
      const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
      const startTimeDate = new Date();
      startTimeDate.setHours(startHours, startMinutes, 0, 0);

      // Calculate theoretical end time (used for single-day jobs)
      const endTimeDate = new Date(startTimeDate.getTime() + (job.expectedJobDuration * 1000));

      // Initialize events array to hold all calendar events for this job
      const events: Event[] = [];

      // Define work day parameters for multi-day job logic
      const workDayHours = 9; // Standard work day: 8 AM to 5 PM = 9 hours
      const workDayStart = 8; // 8 AM start time
      const workDayEnd = 17; // 5 PM

      if (jobDurationHours <= workDayHours) {
        // Single day job
        const endTimeStr = String(endTimeDate.getHours()).padStart(2, '0') + ':' +
                          String(endTimeDate.getMinutes()).padStart(2, '0');

        // Make sure we don't go past 5 PM on a single day
        const maxEndTime = endTimeDate.getHours() > workDayEnd ? '17:00' : endTimeStr;

        events.push({
          id: `kj-${job.id}`,
          title: `${job.jobNumber} - ${job.description}`,
          date: baseDateStr,
          startTime: startTimeStr,
          endTime: maxEndTime,
          description: `${job.customerName} | ${job.orderedQuantity} kits | ${formatDuration(job.expectedJobDuration)} | Due: ${baseDateStr}`,
          color: getKittingJobColor(job.status),
          type: 'kitting-job',
          kittingJob: job
        });
      } else {
        // Multi-day job - split across work days
        let remainingHours = jobDurationHours;
        let currentDate = new Date(baseDate);
        let currentStartTime = startHours;
        let dayCounter = 0;

        while (remainingHours > 0 && dayCounter < 30) { // Safety limit of 30 days
          const currentDateStr = currentDate.toISOString().split('T')[0];
          const hoursForThisDay = Math.min(remainingHours, workDayEnd - currentStartTime);

          const dayStartTimeStr = String(currentStartTime).padStart(2, '0') + ':00';
          const dayEndHours = currentStartTime + hoursForThisDay;
          const dayEndTimeStr = String(Math.floor(dayEndHours)).padStart(2, '0') + ':' +
                               String(Math.round((dayEndHours % 1) * 60)).padStart(2, '0');

          events.push({
            id: `kj-${job.id}-day-${dayCounter}`,
            title: `${job.jobNumber} - ${job.description} (Day ${dayCounter + 1})`,
            date: currentDateStr,
            startTime: dayStartTimeStr,
            endTime: dayEndTimeStr,
            description: `${job.customerName} | ${job.orderedQuantity} kits | Total: ${formatDuration(job.expectedJobDuration)} | Due: ${baseDateStr}`,
            color: getKittingJobColor(job.status),
            type: 'kitting-job',
            kittingJob: job
          });

          remainingHours -= hoursForThisDay;

          // Move to next work day
          currentDate.setDate(currentDate.getDate() + 1);
          currentStartTime = workDayStart; // Start at 8 AM for subsequent days
          dayCounter++;
        }
      }

      return events;
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

  // Combine events and kitting jobs for display
  const allCalendarItems = [
    ...events,
    ...kittingJobs.flatMap(kittingJobToEvents)
  ];

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
    try {
      const response = await fetch(`/api/kitting-jobs?id=${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledDate: newDate,
          scheduledStartTime: newTime
        })
      });

      if (response.ok) {
        // Refresh kitting jobs to reflect the change
        fetchKittingJobs();
      }
    } catch (error) {
      console.error('Failed to update kitting job schedule:', error);
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
      const response = await fetch('/api/job-assignments', {
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
      const response = await fetch(`/api/job-assignments/${assignmentId}`, {
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
      const response = await fetch(`/api/kitting-jobs?id=${jobId}`, {
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

  if (!mounted) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;
  };

  return (
    <div className={`min-h-screen bg-gray-100 ${calendarView === 'daily' ? 'p-2' : 'p-4'}`}>
      <div className={calendarView === 'daily' ? 'w-full' : 'container mx-auto'}>
        {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
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
            </div>
          </div>
        </div>

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
          />
        )}

        <EventModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          event={modalState.event}
          initialDate={modalState.initialDate}
          initialTime={modalState.initialTime}
        />

        <FloatingActionButton onClick={() => window.open('/edit-job/new', '_blank')} />
      </div>
    </div>
  );
};

export default Dashboard;