import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Event, DragData } from '../types/event';
import JobContextMenu from './JobContextMenu';

interface ResizableEventProps {
  event: Event;
  onEdit: (event: Event) => void;
  onResize: (eventId: string, resizeHandle: 'top' | 'bottom', newTime: string) => void;
  formatTime: (time: string) => string;
  style?: React.CSSProperties;
  timeSlotHeight?: number;
  onAssignJob?: (jobId: string, userId: string) => void;
  onUnassignJob?: (assignmentId: string) => void;
  onChangeStatus?: (jobId: string, status: string) => void;
  onStartJob?: (jobId: string) => void;
}

const ResizableEvent: React.FC<ResizableEventProps> = ({
  event,
  onEdit,
  onResize,
  formatTime,
  style,
  timeSlotHeight = 48,
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

  // Top resize handle
  const topResizeDragData: DragData = {
    type: 'resize',
    eventId: event.id,
    resizeHandle: 'top',
  };

  const {
    attributes: topResizeAttributes,
    listeners: topResizeListeners,
    setNodeRef: setTopResizeNodeRef,
    isDragging: isTopResizing,
  } = useDraggable({
    id: `resize-top-${event.id}`,
    data: topResizeDragData,
  });

  // Bottom resize handle
  const bottomResizeDragData: DragData = {
    type: 'resize',
    eventId: event.id,
    resizeHandle: 'bottom',
  };

  const {
    attributes: bottomResizeAttributes,
    listeners: bottomResizeListeners,
    setNodeRef: setBottomResizeNodeRef,
    isDragging: isBottomResizing,
  } = useDraggable({
    id: `resize-bottom-${event.id}`,
    data: bottomResizeDragData,
  });

  const eventStyle = {
    transform: eventTransform ? `translate3d(${eventTransform.x}px, ${eventTransform.y}px, 0)` : undefined,
    zIndex: (isEventDragging || isTopResizing || isBottomResizing) ? 1000 : 10,
    opacity: isEventDragging ? 0.5 : 1,
    ...style,
  };

  const isDraggingAny = isEventDragging || isTopResizing || isBottomResizing;

  // Custom listeners to prevent drag on right-click
  const customEventListeners = {
    onPointerDown: (e: React.PointerEvent) => {
      // Only allow dragging on left mouse button (button 0)
      if (e.button === 0) {
        // Forward to drag listeners
        if (eventListeners?.onPointerDown) {
          eventListeners.onPointerDown(e as any);
        }
      }
    },
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    console.log('=== RESIZABLE EVENT CONTEXT MENU DEBUG ===');
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

  return (
    <>
      <div
        ref={setEventNodeRef}
        style={{
          ...eventStyle,
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          KhtmlUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none'
        }}
        className={`absolute left-1 right-1 rounded px-2 py-1 text-base text-white transition-all duration-200 ${
          event.color || 'bg-blue-500'
        } ${isDraggingAny ? 'shadow-lg scale-105' : 'hover:opacity-80'} group`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onContextMenu={handleContextMenu}
        {...eventAttributes}
        {...customEventListeners}
      >
      {/* Top resize handle */}
      <div
        ref={setTopResizeNodeRef}
        className={`absolute -top-1 left-0 right-0 h-2 cursor-ns-resize transition-opacity ${
          isHovering || isTopResizing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.1))',
          borderRadius: '4px 4px 0 0'
        }}
        {...topResizeAttributes}
        {...topResizeListeners}
        onClick={(e) => e.stopPropagation()}
      />

      <div
        className="font-medium truncate cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          // For kitting jobs, don't open edit modal on click - use right-click context menu instead
          if (event.type !== 'kitting-job') {
            onEdit(event);
          }
        }}
      >
        {event.title}
      </div>
      <div className="text-sm opacity-90">
        {formatTime(event.startTime)} - {formatTime(event.endTime)}
      </div>

      {/* Bottom resize handle */}
      <div
        ref={setBottomResizeNodeRef}
        className={`absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize transition-opacity ${
          isHovering || isBottomResizing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(to top, rgba(255,255,255,0.4), rgba(255,255,255,0.1))',
          borderRadius: '0 0 4px 4px'
        }}
        {...bottomResizeAttributes}
        {...bottomResizeListeners}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Visual feedback for resizing */}
      {(isTopResizing || isBottomResizing) && (
        <div className="absolute inset-0 border-2 border-white border-opacity-50 rounded pointer-events-none" />
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

export default ResizableEvent;