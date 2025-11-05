import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Event, DragData } from '../types/event';
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
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Main event draggable
  const eventDragData: DragData = {
    type: 'event',
    eventId: event.id,
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

  // What-if visual indicators
  const whatIfBorder = event.__whatif
    ? event.__whatif === 'added'
      ? 'border-l-4 border-green-500 ring-2 ring-green-400/50'
      : event.__whatif === 'modified'
      ? 'border-l-4 border-yellow-500 ring-2 ring-yellow-400/50'
      : 'border-l-4 border-red-500 ring-2 ring-red-400/50 opacity-60'
    : 'border-l-4 border-white/20';

  const whatIfEmoji = event.__whatif
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
        className={`${event.color} text-white rounded-lg shadow-sm cursor-move transition-all duration-200 overflow-hidden ${whatIfBorder} pointer-events-auto`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={(e) => {
          e.stopPropagation();
          // For kitting jobs, don't open edit modal on click - use right-click context menu instead
          if (event.type !== 'kitting-job') {
            onEdit(event);
          }
        }}
        onContextMenu={handleContextMenu}
      >
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
        />
      )}
    </>
  );
};

export default DurationBasedEvent;