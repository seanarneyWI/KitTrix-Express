import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core';
import { Event, DragData } from '../types/event';
import JobContextMenu from './JobContextMenu';

interface MonthlyCalendarProps {
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
  densityMode?: 'compact' | 'normal' | 'comfortable';
}

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
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
  densityMode = 'normal',
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, 1 - (startingDayOfWeek - i));
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    // Add days from next month to complete the grid (42 days total - 6 weeks)
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({ date: nextDate, isCurrentMonth: false });
    }

    return days;
  };

  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getEventsForDate = (date: string) => {
    const filtered = events.filter(event => event.date === date);
    if (date === '2025-10-27' && filtered.length > 0) {
      console.log(`📅 MonthlyCalendar filtering for ${date}: Found ${filtered.length} events`);
      console.log('  Events:', filtered.map(e => `${e.id} - ${e.title} (${e.date})`));
    }
    return filtered;
  };

  const handleDayClick = (date: string) => {
    // Remove click-to-create behavior - only use + button for event creation
  };

  const handleDayDoubleClick = (date: string) => {
    if (onNavigateToDay) {
      onNavigateToDay(date);
    }
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const dragData = active.data.current as DragData;
    console.log('🎯 MonthlyCalendar drag start:', { activeId: active.id, dragData });

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
    console.log('🎯 MonthlyCalendar drag end:', {
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
    const dropData = over.data.current as { date?: string };
    console.log('📦 Drag/Drop data:', { dragData, dropData });

    if (dragData?.type === 'event' && dropData?.date) {
      // Preserve the original start time when moving between days
      const originalEvent = events.find(e => e.id === dragData.eventId);
      const startTime = originalEvent?.startTime || '09:00';
      console.log('✅ Moving event:', dragData.eventId, 'to', dropData.date, 'at', startTime);
      onMoveEvent(dragData.eventId, dropData.date, startTime);
    } else {
      console.log('❌ Invalid drag/drop data:', { dragType: dragData?.type, dropDate: dropData?.date });
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get cell height and event limits based on density mode
  const getCellHeightClass = () => {
    switch (densityMode) {
      case 'compact': return 'min-h-[80px]';
      case 'comfortable': return 'min-h-[160px]';
      default: return 'min-h-[120px]'; // normal
    }
  };

  const getEventLimit = () => {
    switch (densityMode) {
      case 'compact': return 2;
      case 'comfortable': return 999; // Show all events
      default: return 3; // normal
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            navigateMonth('prev');
            break;
          case 'ArrowRight':
            e.preventDefault();
            navigateMonth('next');
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
      <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 text-gray-700 p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Monthly Calendar</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                ←
              </button>
              <span className="text-lg font-medium">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white flex-1 flex flex-col overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {dayNames.map((dayName) => (
              <div
                key={dayName}
                className="p-4 text-center bg-gray-50 border-r border-gray-200 last:border-r-0 font-semibold text-gray-700"
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 flex-1 overflow-auto">
            {monthDays.map(({ date, isCurrentMonth }, index) => {
              const dateStr = formatDate(date);
              const dayEvents = getEventsForDate(dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={index}
                  className={`${getCellHeightClass()} border-r border-b border-gray-200 last:border-r-0 p-2 relative cursor-pointer hover:bg-gray-50 ${
                    !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                  } ${isToday ? 'bg-blue-50' : ''}`}
                  data-date={dateStr}
                  onDoubleClick={() => handleDayDoubleClick(dateStr)}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {date.getDate()}
                  </div>

                  {/* Events for this day */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, getEventLimit()).map((event) => (
                      <DraggableEvent
                        key={event.id}
                        event={event}
                        onEditEvent={onEditEvent}
                        onNavigateToDay={onNavigateToDay}
                        onAssignJob={onAssignJob}
                        onUnassignJob={onUnassignJob}
                        onChangeStatus={onChangeStatus}
                        onStartJob={onStartJob}
                      />
                    ))}

                    {dayEvents.length > getEventLimit() && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayEvents.length - getEventLimit()} more
                      </div>
                    )}
                  </div>

                  <DroppableDay date={dateStr} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeEvent ? (
          <div className="bg-white rounded-lg shadow-lg p-2 border-2 border-blue-500 opacity-90">
            <div className={`text-xs p-1 rounded ${activeEvent.color} text-white`}>
              {activeEvent.startTime} - {activeEvent.title}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// Draggable event component
const DraggableEvent: React.FC<{
  event: Event;
  onEditEvent: (event: Event) => void;
  onNavigateToDay?: (date: string) => void;
  onAssignJob?: (jobId: string, userId: string) => void;
  onUnassignJob?: (assignmentId: string) => void;
  onChangeStatus?: (jobId: string, status: string) => void;
  onStartJob?: (jobId: string) => void;
}> = ({ event, onEditEvent, onNavigateToDay, onAssignJob, onUnassignJob, onChangeStatus, onStartJob }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
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

  const handleContextMenu = (e: React.MouseEvent) => {
    console.log('=== MONTHLY CALENDAR CONTEXT MENU DEBUG ===');
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
      setContextMenu({ x: e.clientX, y: e.clientY });
      console.log('Context menu state set:', { x: e.clientX, y: e.clientY });
      return false; // Extra prevention
    } else {
      console.log('❌ Not a kitting job, event type is:', event.type);
    }
  };

  // Y Scenario ghost styling (takes precedence over what-if)
  const isYScenario = !!event.__yScenario;
  const yScenarioDeleted = event.__yScenarioDeleted;

  // Build Y scenario styling classes
  const yScenarioClasses = isYScenario
    ? yScenarioDeleted
      ? 'border-4 border-dashed border-red-500/80 opacity-40'
      : 'border-4 border-dashed border-purple-500/80 opacity-40 shadow-lg shadow-purple-500/30'
    : '';

  return (
    <>
      <div
        ref={setNodeRef}
        {...customListeners}
        {...attributes}
        className={`text-xs p-1 rounded cursor-pointer ${event.color} text-white hover:opacity-80 transition-opacity ${
          isDragging ? 'opacity-50' : ''
        } ${yScenarioClasses} relative`}
        style={{
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
        onContextMenu={handleContextMenu}
      >
        {/* Y Scenario badge */}
        {isYScenario && event.__yScenarioName && !yScenarioDeleted && (
          <div className="absolute -top-1 left-0 text-[10px] bg-purple-700 text-white px-1 rounded-sm font-bold z-10">
            🔮 {event.__yScenarioName}
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          <span className="truncate flex-1">{event.title}</span>
          <span className="whitespace-nowrap flex-shrink-0 text-white/80">{event.startTime}</span>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <JobContextMenu
          event={event}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onAssignJob={onAssignJob}
          onUnassignJob={onUnassignJob}
          onChangeStatus={onChangeStatus}
          onStartJob={onStartJob}
        />
      )}
    </>
  );
};

// Droppable day component
const DroppableDay: React.FC<{ date: string }> = ({ date }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${date}`,
    data: {
      date: date,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`absolute inset-0 pointer-events-none transition-all ${
        isOver ? 'bg-blue-100 border-2 border-blue-300 border-dashed rounded' : ''
      }`}
    />
  );
};

export default MonthlyCalendar;