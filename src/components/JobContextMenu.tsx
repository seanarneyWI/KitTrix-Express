import React, { useState, useEffect, useRef } from 'react';
import { Event } from '../types/event';

interface JobContextMenuProps {
  event: Event;
  position: { x: number; y: number };
  onClose: () => void;
  onAssignJob?: (jobId: string, userId: string) => void;
  onUnassignJob?: (assignmentId: string) => void;
  onChangeStatus?: (jobId: string, status: string) => void;
  onStartJob?: (jobId: string) => void;
}

const JobContextMenu: React.FC<JobContextMenuProps> = ({
  event,
  position,
  onClose,
  onAssignJob,
  onUnassignJob,
  onChangeStatus,
  onStartJob,
}) => {
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusSubmenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log('=== JOB CONTEXT MENU DEBUG ===');
  console.log('onAssignJob prop:', !!onAssignJob);
  console.log('onUnassignJob prop:', !!onUnassignJob);
  console.log('onChangeStatus prop:', !!onChangeStatus);
  console.log('onStartJob prop:', !!onStartJob);
  console.log('Event:', event);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Extract the actual job ID from kitting job events for assignment lookup
  const actualJobId = event.id.startsWith('kj-') ? event.id.replace('kj-', '').split('-day-')[0] : event.id;

  const handleChangeStatus = async (newStatus: string) => {
    console.log('=== STATUS CHANGE CLICKED ===');
    console.log('Changing status:', event.id, 'to:', newStatus);
    if (onChangeStatus) {
      // Extract the actual job ID from kitting job events
      const jobId = event.id.startsWith('kj-') ? event.id.replace('kj-', '').split('-day-')[0] : event.id;
      console.log('Calling onChangeStatus with jobId:', jobId, 'status:', newStatus);
      onChangeStatus(jobId, newStatus);
    }
    onClose();
  };

  const handleStartJob = async () => {
    console.log('=== START JOB CLICKED ===');
    console.log('Starting job:', event.id);
    if (onStartJob) {
      // Extract the actual job ID from kitting job events
      const jobId = event.id.startsWith('kj-') ? event.id.replace('kj-', '').split('-day-')[0] : event.id;
      console.log('Calling onStartJob with jobId:', jobId);
      onStartJob(jobId);
    }
    onClose();
  };

  const handleStatusSubmenuEnter = () => {
    if (statusSubmenuTimeoutRef.current) {
      clearTimeout(statusSubmenuTimeoutRef.current);
    }
    setShowStatusSubmenu(true);
  };

  const handleStatusSubmenuLeave = () => {
    statusSubmenuTimeoutRef.current = setTimeout(() => {
      setShowStatusSubmenu(false);
    }, 500);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (statusSubmenuTimeoutRef.current) {
        clearTimeout(statusSubmenuTimeoutRef.current);
      }
    };
  }, []);

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled', color: 'text-blue-600' },
    { value: 'in-progress', label: 'In Progress', color: 'text-green-600' },
    { value: 'paused', label: 'Paused', color: 'text-yellow-600' },
    { value: 'completed', label: 'Completed', color: 'text-purple-600' },
  ];

  // Calculate menu position to stay within viewport
  const menuStyle = {
    left: Math.min(position.x, window.innerWidth - 320), // More space for submenus
    top: Math.min(position.y, window.innerHeight - 400),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-64"
      style={{...menuStyle, pointerEvents: 'all'}}
      onMouseDown={(e) => {
        console.log('=== CONTEXT MENU MOUSE DOWN ===');
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        console.log('=== CONTEXT MENU POINTER DOWN ===');
        e.stopPropagation();
      }}
    >
      {/* Job Info Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="font-semibold text-gray-900 truncate">{event.title}</div>
        <div className="text-sm text-gray-500 truncate">{event.description}</div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {/* View Details */}
        <button
          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
          onClick={() => {
            console.log('=== VIEW DETAILS CLICKED ===');
            console.log('Job Details:', {
              id: event.id,
              title: event.title,
              description: event.description,
              kittingJob: (event as any).kittingJob
            });
            onClose();
          }}
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          View Details
        </button>

        <hr className="my-1" />

        {/* Change Status */}
        <div
          className="relative"
          onMouseEnter={handleStatusSubmenuEnter}
          onMouseLeave={handleStatusSubmenuLeave}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
            onClick={(e) => {
              console.log('=== STATUS SUBMENU BUTTON CLICKED ===');
              e.stopPropagation();
              setShowStatusSubmenu(!showStatusSubmenu);
              console.log('Status submenu toggled to:', !showStatusSubmenu);
            }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Change Status
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Status Submenu */}
          {showStatusSubmenu && (
            <div
              className="absolute left-full top-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-44"
              style={{
                left: '100%',
                marginLeft: '-2px', // Overlap slightly to prevent gap
                zIndex: 10000
              }}
              onMouseEnter={handleStatusSubmenuEnter}
              onMouseLeave={handleStatusSubmenuLeave}
            >
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 text-sm ${status.color}`}
                  onClick={() => handleChangeStatus(status.value)}
                >
                  {status.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <hr className="my-1" />

        {/* Quick Actions based on current status */}
        {event.kittingJob?.status !== 'completed' && (
          <>
            {event.kittingJob?.status !== 'in-progress' && (
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-green-600"
                onClick={onStartJob ? handleStartJob : () => handleChangeStatus('in-progress')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a4.5 4.5 0 110 9H9m4-9h1.5a4.5 4.5 0 010 9H13" />
                </svg>
                Start Job
              </button>
            )}

            {event.kittingJob?.status === 'in-progress' && (
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-yellow-600"
                onClick={() => handleChangeStatus('paused')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause Job
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JobContextMenu;