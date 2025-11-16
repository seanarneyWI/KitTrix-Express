import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Event, DragData } from '../types/event';
import { Shift } from '../utils/shiftScheduling';
import JobContextMenu from './JobContextMenu';

interface DurationBasedEventProps {
  event: Event;
  onEdit: (event: Event) => void;
  onResize?: (eventId: string, resizeHandle: 'top' | 'bottom', newTime: string) => void;
  formatTime: (time: string) => string;
  top: number;
  height: number;
  left?: number;
  width?: number;
  containerRef?: React.RefObject<HTMLDivElement>;
  showResizeHandles?: boolean;
  onAssignJob?: (jobId: string, userId: string) => void;
  onUnassignJob?: (assignmentId: string) => void;
  onChangeStatus?: (jobId: string, status: string) => void;
  onStartJob?: (jobId: string) => void;
  onEditStations?: (jobId: string) => void;
  onEditAllowedShifts?: (jobId: string) => void;
  onCreateScenarioForJob?: (jobId: string) => void;
  onEditProductionDelays?: (jobId: string) => void;
  onCommitYToProduction?: (jobId: string, scenarioId: string) => void;
  allShifts?: Shift[];
}

const DurationBasedEvent: React.FC<DurationBasedEventProps> = ({
  event,
  onEdit,
  onResize,
  formatTime,
  top,
  height,
  left = 0,
  width = 100,
  showResizeHandles = false,
  onAssignJob,
  onUnassignJob,
  onChangeStatus,
  onStartJob,
  onEditStations,
  onEditAllowedShifts,
  onCreateScenarioForJob,
  onEditProductionDelays,
  onCommitYToProduction,
  allShifts = [],
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Y Scenario ghost styling (takes precedence over what-if)
  const isYScenario = !!event.__yScenario;
  const yScenarioDeleted = event.__yScenarioDeleted;

  // Main event draggable (Y scenarios use special data to route to scenario updates)
  const eventDragData: DragData = {
    type: 'event',
    eventId: event.id,
    isYScenario: isYScenario,
    yScenarioId: event.__yScenario,
  };

  const {
    attributes: eventAttributes,
    listeners: eventListeners,
    setNodeRef: setEventNodeRef,
    transform: eventTransform,
    isDragging: isEventDragging,
  } = useDraggable({
    id: `event-${event.id}`,
    data: eventDragData,
  });

  const eventStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${top}px`,
    height: `${height}px`,
    left: `${left}%`,
    width: `${width}%`,
    transform: eventTransform
      ? `translate3d(${eventTransform.x}px, ${eventTransform.y}px, 0)`
      : undefined,
    zIndex: isEventDragging ? 1000 : 10,
    opacity: isEventDragging ? 0.8 : 1,
  };

  const shouldShowDetails = height >= 60; // Show details if event is tall enough (increased for larger text)
  const shouldShowTitle = height >= 30; // Show title if event is at least this tall (increased for larger text)

  const handleContextMenu = (e: React.MouseEvent) => {
    // Only show context menu for kitting jobs, not regular events
    if (event.type === 'kitting-job') {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  // Enhanced ghost styling for Y scenarios - MORE OBVIOUS
  const yScenarioBorder = isYScenario
    ? yScenarioDeleted
      ? 'border-4 border-dashed border-red-500/80 opacity-40'
      : 'border-4 border-dashed border-purple-500/80 shadow-lg shadow-purple-500/30'
    : '';

  const yScenarioOpacity = isYScenario && !yScenarioDeleted ? 'opacity-40' : '';
  const yScenarioBackdrop = isYScenario && !yScenarioDeleted ? 'backdrop-blur-sm' : '';
  const yScenarioPattern = isYScenario && !yScenarioDeleted ? 'bg-gradient-to-br from-purple-300/20 to-transparent' : '';

  // What-if visual indicators (only shown if NOT a Y scenario)
  const whatIfBorder = !isYScenario && event.__whatif
    ? event.__whatif === 'added'
      ? 'border-l-4 border-green-500 ring-2 ring-green-400/50'
      : event.__whatif === 'modified'
      ? 'border-l-4 border-yellow-500 ring-2 ring-yellow-400/50'
      : 'border-l-4 border-red-500 ring-2 ring-red-400/50 opacity-60'
    : !isYScenario ? 'border-l-4 border-white/20' : '';

  const whatIfEmoji = !isYScenario && event.__whatif
    ? event.__whatif === 'added'
      ? '➕'
      : event.__whatif === 'modified'
      ? '✏️'
      : '🗑️'
    : null;

  return (
    <>
      <div
        ref={setEventNodeRef}
        {...eventAttributes}
        {...eventListeners}
        style={eventStyle}
        className={`${event.color} text-white rounded-lg shadow-sm cursor-move transition-all duration-200 overflow-hidden ${whatIfBorder} ${yScenarioBorder} ${yScenarioOpacity} ${yScenarioBackdrop} ${yScenarioPattern} pointer-events-auto relative`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={(e) => {
          e.stopPropagation();
          // Don't allow editing Y scenario overlays - they're virtual
          if (isYScenario) {
            console.log('🔮 Y scenario overlay clicked - editing disabled');
            return;
          }
          // For kitting jobs, don't open edit modal on click - use right-click context menu instead
          if (event.type !== 'kitting-job') {
            onEdit(event);
          }
        }}
        onContextMenu={handleContextMenu}
      >
      {/* Y Scenario name badge - ENHANCED */}
      {isYScenario && event.__yScenarioName && !yScenarioDeleted && (
        <div className="absolute top-0.5 left-0.5 right-0.5 text-xs bg-purple-700 text-white px-2 py-1 rounded font-bold z-20 flex items-center justify-between shadow-md">
          <span className="truncate">🔮 Ŷ: {event.__yScenarioName}</span>
          {isHovering && height >= 60 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Open delay manager for this job
                window.dispatchEvent(new CustomEvent('openDelayManager', {
                  detail: {
                    scenarioId: event.__yScenario,
                    scenarioName: event.__yScenarioName,
                    jobId: event.id,
                    jobTitle: event.title
                  }
                }));
              }}
              className="ml-2 px-1.5 py-0.5 bg-yellow-500 hover:bg-yellow-400 text-white text-xs rounded flex-shrink-0 transition-colors"
              title="Add delays to this job"
            >
              ⏰
            </button>
          )}
        </div>
      )}

      {/* What-if emoji badge */}
      {whatIfEmoji && (
        <div className="absolute top-0.5 right-0.5 text-sm bg-black/30 rounded-full w-5 h-5 flex items-center justify-center backdrop-blur-sm z-20">
          {whatIfEmoji}
        </div>
      )}

      {/* Event Content */}
      <div className="p-1 h-full flex flex-col justify-start text-base">
        {shouldShowTitle && (
          <div className="flex items-start justify-between gap-1">
            <div className="font-semibold truncate leading-tight flex-1">
              {event.title}
            </div>
            <div className="text-white/90 text-sm leading-tight whitespace-nowrap flex-shrink-0">
              {formatTime(event.startTime)}
            </div>
          </div>
        )}

        {shouldShowDetails && (
          <>
            {event.description && height >= 80 && (
              <div className="text-white/80 text-sm mt-1 leading-tight overflow-hidden">
                {event.description}
              </div>
            )}
          </>
        )}

        {!shouldShowTitle && (
          <div className="text-white/90 text-sm leading-tight">
            {formatTime(event.startTime)}
          </div>
        )}
      </div>

      {/* Hover overlay for better visibility */}
      {isHovering && (
        <div className="absolute inset-0 bg-white/10 rounded-lg pointer-events-none" />
      )}

      {/* Resize handles - only show if requested and event is tall enough */}
      {showResizeHandles && isHovering && height >= 40 && onResize && (
        <>
          {/* Top resize handle */}
          <div
            className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize bg-white/20 opacity-0 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => {
              e.stopPropagation();
              // Handle top resize - implementation would depend on specific needs
            }}
          />

          {/* Bottom resize handle */}
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-white/20 opacity-0 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => {
              e.stopPropagation();
              // Handle bottom resize - implementation would depend on specific needs
            }}
          />
        </>
      )}

      {/* Duration indicator for very long events */}
      {height >= 80 && (
        <div className="absolute bottom-1 right-1 text-white/60 text-sm">
          {Math.round((new Date(`2000-01-01T${event.endTime}`).getTime() - new Date(`2000-01-01T${event.startTime}`).getTime()) / (1000 * 60 * 60) * 10) / 10}h
        </div>
      )}
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
          onEditStations={onEditStations}
          onEditAllowedShifts={onEditAllowedShifts}
          onCreateScenarioForJob={onCreateScenarioForJob}
          onEditProductionDelays={onEditProductionDelays}
          onCommitYToProduction={onCommitYToProduction}
          allShifts={allShifts}
        />
      )}
    </>
  );
};

export default DurationBasedEvent;