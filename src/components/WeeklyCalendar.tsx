import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core';
import { Event, DragData } from '../types/event';
import ResizableEvent from './ResizableEvent';
import JobContextMenu from './JobContextMenu';

interface WeeklyCalendarProps {
  events: Event[];
  onCreateEvent: (date?: string, time?: string) => void;
  onEditEvent: (event: Event) => void;
  onMoveEvent: (eventId: string, newDate: string, newTime: string) => void;
  onResizeEvent: (eventId: string, resizeHandle: 'top' | 'bottom', newTime: string) => void;
  onNavigateToDay?: (date: string) => void;
  onAssignJob?: (jobId: string, userId: string) => void;
  onUnassignJob?: (assignmentId: string) => void;
  onChangeStatus?: (jobId: string, status: string) => void;
  onStartJob?: (jobId: string) => void;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  events,
  onCreateEvent,
  onEditEvent,
  onMoveEvent,
  onResizeEvent,
  onNavigateToDay,
  onAssignJob,
  onUnassignJob,
  onChangeStatus,
  onStartJob,
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; event: Event } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDays = useMemo(() => getWeekDays(currentWeek), [currentWeek]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getEventsForDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleTimeSlotClick = (date: string, time: string) => {
    // Remove click-to-create behavior - only use + button for event creation
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const dragData = active.data.current as DragData;

    if (dragData?.type === 'event') {
      const eventToMove = events.find(e => e.id === dragData.eventId);
      if (eventToMove) {
        setActiveEvent(eventToMove);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);

    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as { date: string; time: string };

    if (dragData?.type === 'event' && dropData) {
      onMoveEvent(dragData.eventId, dropData.date, dropData.time);
    } else if (dragData?.type === 'resize' && dropData) {
      if (dragData.resizeHandle) {
        onResizeEvent(dragData.eventId, dragData.resizeHandle, dropData.time);
      }
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleEventContextMenu = (e: React.MouseEvent, event: Event) => {
    console.log('=== WEEKLY CALENDAR CONTEXT MENU DEBUG ===');
    console.log('Event ID:', event.id);
    console.log('Event type:', event.type);
    console.log('Event object:', event);
    console.log('Mouse event:', e.type, e.button);
    console.log('Position:', e.clientX, e.clientY);

    // Only show context menu for kitting jobs, not regular events
    if (event.type === 'kitting-job') {
      console.log('✅ This is a kitting job - showing context menu');
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      e.nativeEvent.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, event });
      console.log('Context menu state set:', { x: e.clientX, y: e.clientY, event: event.id });
      return false; // Extra prevention
    } else {
      console.log('❌ Not a kitting job, event type is:', event.type);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            navigateWeek('prev');
            break;
          case 'ArrowRight':
            e.preventDefault();
            navigateWeek('next');
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

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full max-w-7xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 text-gray-700 p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Weekly Calendar</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                ←
              </button>
              <span className="text-lg font-medium">
                {weekDays[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex flex-col">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-4 bg-gray-50"></div>
            {weekDays.map((day, index) => (
              <div
                key={index}
                className="p-4 text-center bg-gray-50 border-l border-gray-200"
              >
                <div className="font-semibold text-gray-700">
                  {dayNames[day.getDay()]}
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots and events */}
          <div className="max-h-96 overflow-y-auto relative">
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-8 border-b border-gray-100 h-12">
                <div className="p-2 text-xs text-gray-500 bg-gray-50 border-r border-gray-200">
                  {formatTime(time)}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const dateStr = formatDate(day);
                  return (
                    <WeeklyTimeSlot
                      key={dayIndex}
                      date={dateStr}
                      time={time}
                      onCreateEvent={handleTimeSlotClick}
                    />
                  );
                })}
              </div>
            ))}

            {/* Time-proportional event widgets per day */}
            <div className="absolute inset-0 pointer-events-none">
              {weekDays.map((day, dayIndex) => {
                const dateStr = formatDate(day);
                const dayEvents = getEventsForDate(dateStr);

                return (
                  <div
                    key={dateStr}
                    className="absolute inset-y-0 pointer-events-auto"
                    style={{
                      left: `${(12.5 + (dayIndex * 12.5))}%`, // Position for each day column
                      width: '12.5%'
                    }}
                  >
                    {dayEvents.map((event) => {
                      // Calculate position and height based on time
                      const startHour = parseInt(event.startTime.split(':')[0]);
                      const startMinute = parseInt(event.startTime.split(':')[1]);
                      const endHour = parseInt(event.endTime.split(':')[0]);
                      const endMinute = parseInt(event.endTime.split(':')[1]);

                      const startInMinutes = startHour * 60 + startMinute;
                      const endInMinutes = endHour * 60 + endMinute;
                      const durationInMinutes = endInMinutes - startInMinutes;

                      // Each hour slot is 48px (h-12), so each minute is 0.8px
                      const pixelsPerMinute = 48 / 60;
                      const top = startInMinutes * pixelsPerMinute;
                      const height = Math.max(durationInMinutes * pixelsPerMinute, 24); // Min height of 24px

                      return (
                        <DraggableWeeklyEvent
                          key={event.id}
                          event={event}
                          top={top}
                          height={height}
                          formatTime={formatTime}
                          onNavigateToDay={onNavigateToDay}
                          onContextMenu={handleEventContextMenu}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeEvent ? (
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
                width: '200px',
                height: '48px',
              }}
            />
            {/* Dragging indicator */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L3 7v11a1 1 0 001 1h3v-9h6v9h3a1 1 0 001-1V7l-7-5z"/>
              </svg>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Context Menu */}
      {contextMenu && (
        <JobContextMenu
          event={contextMenu.event}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onAssignJob={onAssignJob}
          onUnassignJob={onUnassignJob}
          onChangeStatus={onChangeStatus}
          onStartJob={onStartJob}
        />
      )}
    </DndContext>
  );
};

// Draggable event component for weekly view
const DraggableWeeklyEvent: React.FC<{
  event: Event;
  top: number;
  height: number;
  formatTime: (time: string) => string;
  onNavigateToDay?: (date: string) => void;
  onContextMenu: (e: React.MouseEvent, event: Event) => void;
}> = ({ event, top, height, formatTime, onNavigateToDay, onContextMenu }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `weekly-${event.id}`,
    data: {
      type: 'event',
      eventId: event.id,
    } as DragData,
  });

  // Custom listeners to prevent drag on right-click
  const customListeners = {
    onPointerDown: (e: React.PointerEvent) => {
      // Only allow dragging on left mouse button (button 0)
      if (e.button === 0) {
        // Forward to drag listeners
        if (listeners?.onPointerDown) {
          listeners.onPointerDown(e as any);
        }
      }
    },
  };

  return (
    <div
      ref={setNodeRef}
      {...customListeners}
      {...attributes}
      className={`absolute left-0.5 right-0.5 p-1.5 rounded shadow-sm cursor-move ${event.color} text-white overflow-hidden hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        KhtmlUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none'
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Single click does nothing - use double-click or right-click
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        // Double-click navigates to daily view for any event
        if (onNavigateToDay) {
          onNavigateToDay(event.date);
        }
      }}
      onContextMenu={(e) => onContextMenu(e, event)}
    >
      <div className="flex items-start justify-between gap-1 h-full">
        <div className="text-xs font-semibold truncate flex-1">{event.title}</div>
        <div className="text-xs opacity-90 whitespace-nowrap flex-shrink-0">{formatTime(event.startTime)}</div>
      </div>
    </div>
  );
};

// Simple time slot component for drop zones
const WeeklyTimeSlot: React.FC<{
  date: string;
  time: string;
  onCreateEvent: (date: string, time: string) => void;
}> = ({ date, time, onCreateEvent }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${date}-${time}`,
    data: { date, time },
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-12 border-l transition-all relative ${
        isOver
          ? 'bg-blue-100 border-blue-400 border-2 border-dashed'
          : 'border-gray-200 hover:bg-gray-50'
      }`}
      onClick={() => onCreateEvent(date, time)}
    >
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-medium shadow-lg">
            Drop
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendar;