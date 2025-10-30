import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { Event, DragData } from '../types/event';
import ResizableEvent from './ResizableEvent';
import DurationBasedEvent from './DurationBasedEvent';
import { calculateEventPositions, calculateOverlapLayout } from '../utils/calendarLayout';

interface DailyCalendarProps {
  events: Event[];
  onCreateEvent: (date?: string, time?: string) => void;
  onEditEvent: (event: Event) => void;
  onMoveEvent: (eventId: string, newDate: string, newTime: string) => void;
  onResizeEvent: (eventId: string, resizeHandle: 'top' | 'bottom', newTime: string) => void;
  initialDate?: string;
  onAssignJob?: (jobId: string, userId: string) => void;
  onUnassignJob?: (assignmentId: string) => void;
  onChangeStatus?: (jobId: string, status: string) => void;
  onStartJob?: (jobId: string) => void;
  densityMode?: 'compact' | 'normal' | 'comfortable';
}

const DailyCalendar: React.FC<DailyCalendarProps> = ({
  events,
  onCreateEvent,
  onEditEvent,
  onMoveEvent,
  onResizeEvent,
  initialDate,
  onAssignJob,
  onUnassignJob,
  onChangeStatus,
  onStartJob,
  densityMode = 'normal',
}) => {
  const [currentDate, setCurrentDate] = useState(
    initialDate ? new Date(initialDate) : new Date()
  );
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const calendarScrollRef = React.useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Update current date when initialDate changes
  useEffect(() => {
    if (initialDate) {
      setCurrentDate(new Date(initialDate));
    }
  }, [initialDate]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getEventsForDate = (date: string) => {
    const filtered = events.filter(event => event.date === date);
    console.log(`📆 DailyCalendar filtering for ${date}: Found ${filtered.length} events out of ${events.length} total`);
    if (filtered.length > 0) {
      console.log('  Events:', filtered.map(e => `${e.id} - ${e.title}`));
    }
    return filtered;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  /**
   * Generate 24-hour time slots for complete daily coverage
   *
   * Creates 48 time slots (30-minute increments) covering full 24-hour period:
   * - Slot 0: 00:00 (midnight)
   * - Slot 1: 00:30
   * - Slot 2: 01:00
   * - ...
   * - Slot 47: 23:30
   *
   * This provides comprehensive coverage for round-the-clock manufacturing operations
   */
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);           // Each hour has 2 slots (0, 30 minutes)
    const minutes = (i % 2) * 30;             // Alternates between 0 and 30 minutes
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  });

  const handleTimeSlotClick = (date: string, time: string) => {
    // Remove click-to-create behavior - only use + button for event creation
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const dragData = active.data.current as DragData;
    console.log('🎯 DailyCalendar drag start:', { activeId: active.id, dragData });

    if (dragData?.type === 'event') {
      const eventToMove = events.find(e => e.id === dragData.eventId);
      if (eventToMove) {
        console.log('✅ Found event to move:', eventToMove.title);
        setActiveEvent(eventToMove);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('🎯 DailyCalendar drag end:', {
      activeId: active.id,
      overId: over?.id,
      hasOver: !!over
    });
    setActiveEvent(null);

    if (!over) {
      console.log('❌ No drop target');
      return;
    }

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as { date: string; time: string };
    console.log('📦 Drag/Drop data:', { dragData, dropData });

    if (dragData?.type === 'event' && dropData) {
      console.log('✅ Moving event:', dragData.eventId, 'to', dropData.date, 'at', dropData.time);
      onMoveEvent(dragData.eventId, dropData.date, dropData.time);
    } else if (dragData?.type === 'resize' && dropData) {
      if (dragData.resizeHandle) {
        console.log('✅ Resizing event:', dragData.eventId, dragData.resizeHandle, 'to', dropData.time);
        onResizeEvent(dragData.eventId, dragData.resizeHandle, dropData.time);
      }
    } else {
      console.log('❌ Invalid drag/drop data:', { dragType: dragData?.type, hasDropData: !!dropData });
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Get time slot dimensions based on density mode
  const getSlotHeight = () => {
    switch (densityMode) {
      case 'compact': return 40; // h-10
      case 'comfortable': return 80; // h-20
      default: return 64; // h-16 (normal)
    }
  };

  const getSlotHeightClass = () => {
    switch (densityMode) {
      case 'compact': return 'h-10';
      case 'comfortable': return 'h-20';
      default: return 'h-16'; // normal
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            navigateDate('prev');
            break;
          case 'ArrowRight':
            e.preventDefault();
            navigateDate('next');
            break;
          case 'n':
            e.preventDefault();
            onCreateEvent();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [onCreateEvent]);

  /**
   * Auto-scroll to first event position for immediate relevant content visibility
   *
   * This effect automatically positions the daily calendar view to show the earliest
   * scheduled event, providing immediate context to the user instead of starting
   * at midnight.
   *
   * Algorithm:
   * 1. Find the earliest event start time for the current date
   * 2. Convert time to slot index (30-minute increments)
   * 3. Calculate pixel position based on slot height (64px per slot)
   * 4. Smooth scroll to position with context offset
   *
   * Triggers: When currentDate or events change
   */
  useEffect(() => {
    const scrollToFirstEvent = () => {
      const currentDateStr = formatDate(currentDate);
      const dayEvents = getEventsForDate(currentDateStr);

      if (dayEvents.length > 0 && calendarScrollRef.current) {
        // Find the earliest start time among all events for this date
        const earliestTime = dayEvents.reduce((earliest, event) => {
          return event.startTime < earliest ? event.startTime : earliest;
        }, dayEvents[0].startTime);

        // Convert time string to minutes for slot calculation
        const [hours, minutes] = earliestTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;

        // Calculate which 30-minute slot this time corresponds to
        const slotIndex = Math.floor(totalMinutes / 30);

        // Calculate scroll position based on density mode
        const slotHeight = getSlotHeight();
        const scrollPosition = slotIndex * slotHeight;

        // Delay ensures DOM is fully rendered before scrolling
        // 100ms is sufficient for React rendering and positioning calculations
        setTimeout(() => {
          calendarScrollRef.current?.scrollTo({
            top: scrollPosition - 100, // 100px offset shows context above the event
            behavior: 'smooth'          // Smooth scroll animation for better UX
          });
        }, 100);
      }
    };

    scrollToFirstEvent();
  }, [currentDate, events]); // Re-run when date changes or events are updated

  const currentDateStr = formatDate(currentDate);
  const dayEvents = getEventsForDate(currentDateStr);
  const isToday = currentDateStr === new Date().toISOString().split('T')[0];

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 text-gray-700 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Daily Calendar</h1>
              <p className="text-gray-500 mt-1">
                {dayNames[currentDate.getDay()]}, {currentDate.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
                {isToday && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Today</span>}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-sm font-medium text-blue-700"
              >
                Today
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex overflow-y-auto w-full" ref={calendarScrollRef}>
            <div className="w-20 border-r border-gray-200 bg-gray-50 flex-shrink-0">
              <div className={`${getSlotHeightClass()} border-b border-gray-200 flex items-center justify-center`}>
                <span className="text-lg font-medium text-gray-500">Time</span>
              </div>
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className={`${getSlotHeightClass()} border-b border-gray-100 flex items-start justify-center pt-1`}
                >
                  <span className="text-lg text-gray-500 font-medium">
                    {formatTime(time)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex-1">
              <div className={`${getSlotHeightClass()} border-b border-gray-200 bg-gray-50 flex items-center justify-center`}>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {currentDate.getDate()}
                  </div>
                  <div className="text-base text-gray-500">
                    {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                  </div>
                </div>
              </div>

              <div className="relative">
                {timeSlots.map((time) => (
                  <DailyTimeSlot
                    key={time}
                    date={currentDateStr}
                    time={time}
                    onCreateEvent={handleTimeSlotClick}
                    heightClass={getSlotHeightClass()}
                  />
                ))}

                <div className="absolute inset-0 pointer-events-none">
                  <div className="relative h-full w-full">
                    {(() => {
                      const slotHeight = getSlotHeight();
                      const eventPositions = calculateEventPositions(dayEvents, timeSlots, slotHeight);
                      const overlapLayout = calculateOverlapLayout(dayEvents);

                      return eventPositions.map((position) => {
                        const layoutInfo = overlapLayout.find(layout => layout.event.id === position.event.id);
                        return (
                          <DurationBasedEvent
                            key={position.id}
                            event={position.event}
                            onEdit={onEditEvent}
                            onResize={onResizeEvent}
                            formatTime={formatTime}
                            top={position.top}
                            height={position.height}
                            left={layoutInfo?.left || 0}
                            width={layoutInfo?.width || 100}
                            showResizeHandles={true}
                            onAssignJob={onAssignJob}
                            onUnassignJob={onUnassignJob}
                            onChangeStatus={onChangeStatus}
                            onStartJob={onStartJob}
                          />
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeEvent && (
          <div className="relative">
            <ResizableEvent
              event={activeEvent}
              onEdit={() => {}}
              onResize={() => {}}
              formatTime={formatTime}
              style={{
                position: 'relative',
                opacity: 0.9,
                transform: 'rotate(2deg) scale(1.02)',
                boxShadow: '0 15px 35px rgba(0, 0, 0, 0.25)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                width: '300px',
                height: '64px',
              }}
            />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L3 7v11a1 1 0 001 1h3v-9h6v9h3a1 1 0 001-1V7l-7-5z"/>
              </svg>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

const DailyTimeSlot: React.FC<{
  date: string;
  time: string;
  onCreateEvent: (date: string, time: string) => void;
  heightClass: string;
}> = ({ date, time, onCreateEvent, heightClass }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${date}-${time}`,
    data: { date, time },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${heightClass} border-b transition-all relative ${
        isOver
          ? 'bg-blue-100 border-blue-400 border-2 border-dashed'
          : 'border-gray-100 hover:bg-gray-50'
      }`}
      onClick={() => onCreateEvent(date, time)}
    >
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
            Drop here
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCalendar;