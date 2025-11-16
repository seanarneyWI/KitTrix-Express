import React, { useState, useEffect, useRef } from 'react';
import { Event } from '../types/event';
import { Shift } from '../utils/shiftScheduling';

interface JobContextMenuProps {
  event: Event;
  position: { x: number; y: number };
  onClose: () => void;
  onAssignJob?: (jobId: string, userId: string) => void;
  onUnassignJob?: (assignmentId: string) => void;
  onChangeStatus?: (jobId: string, status: string) => void;
  onStartJob?: (jobId: string) => void;
  onEditStations?: (jobId: string) => void;
  onEditAllowedShifts?: (jobId: string) => void;
  onCreateScenarioForJob?: (jobId: string) => void;
  onEditProductionDelays?: (jobId: string) => void;
  onCommitYToProduction?: (jobId: string, scenarioId: string) => void;
  onDeleteFromScenario?: (jobId: string, scenarioId: string) => void;
  onEditJob?: (jobId: string) => void;
  onDeleteJob?: (jobId: string) => void;
  allShifts?: Shift[];
}

const JobContextMenu: React.FC<JobContextMenuProps> = ({
  event,
  position,
  onClose,
  onAssignJob,
  onUnassignJob,
  onChangeStatus,
  onStartJob,
  onEditStations,
  onEditAllowedShifts,
  onCreateScenarioForJob,
  onEditProductionDelays,
  onCommitYToProduction,
  onDeleteFromScenario,
  onEditJob,
  onDeleteJob,
  allShifts = [],
}) => {
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusSubmenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // console.log('=== JOB CONTEXT MENU DEBUG ===');
  // console.log('onAssignJob prop:', !!onAssignJob);
  // console.log('onUnassignJob prop:', !!onUnassignJob);
  // console.log('onChangeStatus prop:', !!onChangeStatus);
  // console.log('onStartJob prop:', !!onStartJob);
  // console.log('Event:', event);

  // Detect if this is a Y scenario overlay
  const isYScenario = !!event.__yScenario;
  // console.log('Is Y Scenario:', isYScenario, 'Scenario ID:', event.__yScenario);

  // Helper function to extract numbers from shift names
  const getShiftNumbers = (shiftIds?: string[]): string => {
    try {
      if (!allShifts || allShifts.length === 0) return '—';

      // If no shifts specified, show all active shifts
      const shifts = shiftIds && shiftIds.length > 0
        ? allShifts.filter(s => shiftIds.includes(s.id))
        : allShifts.filter(s => s.isActive);

      if (shifts.length === 0) return '—';

      // Use shift order property if available, otherwise try to extract from name
      const numbers = shifts
        .map(s => {
          // First try using the order property
          if (s.order != null) {
            return s.order.toString();
          }
          // Fallback: try to extract number from name
          const match = s.name?.match(/\d+/);
          return match ? match[0] : null;
        })
        .filter(Boolean)
        .sort((a, b) => parseInt(a!) - parseInt(b!))
        .join(', ');

      return numbers || '—';
    } catch (error) {
      console.error('Error extracting shift numbers:', error);
      return '—';
    }
  };

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
  let actualJobId = event.id;
  try {
    if (event.id.startsWith('kj-')) {
      // Production kitting job: kj-{jobId} or kj-{jobId}-day-{n}
      actualJobId = event.id.replace('kj-', '').split('-day-')[0];
      // console.log('Extracted production job ID:', actualJobId);
    } else if (event.id.startsWith('y-')) {
      // Y overlay job: y-{scenarioId}-{jobId} or y-{scenarioId}-{jobId}-day-{n}
      // Format: y-cmhsbwazj0003sxrivpxnlgqj-cmhb9d75j000dsxi0jh1sv2nk
      const withoutPrefix = event.id.replace('y-', '');
      const withoutDay = withoutPrefix.split('-day-')[0]; // Remove day suffix if present
      const parts = withoutDay.split('-');

      // console.log('Y overlay ID parsing:', {
      //   original: event.id,
      //   withoutPrefix,
      //   withoutDay,
      //   parts
      // });

      if (parts.length >= 2) {
        actualJobId = parts[1]; // Extract just the jobId (second part)
        // console.log('Extracted Y overlay job ID:', actualJobId);
      } else {
        console.error('Failed to parse Y overlay job ID - not enough parts:', parts);
        actualJobId = event.id; // Fallback to full ID
      }
    }
  } catch (error) {
    console.error('Error extracting job ID:', error);
    actualJobId = event.id; // Fallback to full ID
  }

  // console.log('Final actualJobId:', actualJobId);

  const handleChangeStatus = async (newStatus: string) => {
    // console.log('=== STATUS CHANGE CLICKED ===');
    // console.log('Changing status:', event.id, 'to:', newStatus);
    if (onChangeStatus) {
      // Use the already-extracted actualJobId
      console.log('Calling onChangeStatus with jobId:', actualJobId, 'status:', newStatus);
      onChangeStatus(actualJobId, newStatus);
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
        // console.log('=== CONTEXT MENU MOUSE DOWN ===');
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        // console.log('=== CONTEXT MENU POINTER DOWN ===');
        e.stopPropagation();
      }}
    >
      {/* Job Info Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="font-semibold text-gray-900 truncate">{event.title}</div>
        <div className="text-sm text-gray-500 truncate">{event.description}</div>
        {event.kittingJob && allShifts && (
          <div className="text-xs text-gray-600 mt-1">
            <span className="font-medium">Stations:</span> {event.kittingJob.stationCount || 1} | {' '}
            <span className="font-medium">Shifts:</span> {getShiftNumbers(event.kittingJob.allowedShiftIds)}
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {/* Edit Job - Only for production jobs */}
        {!isYScenario && onEditJob && (
          <button
            className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-blue-700 font-medium"
            onClick={() => {
              console.log('=== EDIT JOB CLICKED ===');
              onEditJob(actualJobId);
              onClose();
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            ✏️ Edit Job
          </button>
        )}

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

        {/* Commit Y Scenario to Production - Only for Y overlays */}
        {isYScenario && onCommitYToProduction && (
          <button
            className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-green-700 font-medium"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();

              console.log('=== COMMIT Y TO PRODUCTION CLICKED ===');
              console.log('Job ID:', actualJobId, 'Scenario ID:', event.__yScenario);

              // Close menu first
              onClose();

              // Then execute async operation
              try {
                if (event.__yScenario) {
                  await onCommitYToProduction(actualJobId, event.__yScenario);
                } else {
                  console.error('No scenario ID found on event');
                }
              } catch (error) {
                console.error('Error in commit handler:', error);
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ✅ Commit to Production
          </button>
        )}

        {/* Create Scenario for this Job - Only for production jobs */}
        {!isYScenario && onCreateScenarioForJob && (
          <button
            className="w-full px-4 py-2 text-left hover:bg-purple-50 flex items-center gap-2 text-purple-600"
            onClick={() => {
              console.log('=== CREATE SCENARIO FOR JOB CLICKED ===');
              onCreateScenarioForJob(actualJobId);
              onClose();
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            🔮 Create Scenario for this Job
          </button>
        )}

        {/* Manage Production Delays */}
        {onEditProductionDelays && (
          <button
            className="w-full px-4 py-2 text-left hover:bg-yellow-50 flex items-center gap-2 text-yellow-700"
            onClick={() => {
              console.log('=== EDIT PRODUCTION DELAYS CLICKED ===');
              onEditProductionDelays(actualJobId);
              onClose();
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ⏰ Manage Production Delays
          </button>
        )}

        <hr className="my-1" />

        {/* Edit Stations */}
        {onEditStations && (
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
            onClick={() => {
              console.log('=== EDIT STATIONS CLICKED ===');
              onEditStations(actualJobId);
              onClose();
            }}
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Edit Stations
          </button>
        )}

        {/* Edit Allowed Shifts */}
        {onEditAllowedShifts && (
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
            onClick={() => {
              // console.log('=== EDIT ALLOWED SHIFTS CLICKED ===');
              onEditAllowedShifts(actualJobId);
              onClose();
            }}
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Edit Allowed Shifts
          </button>
        )}

        {(onEditStations || onEditAllowedShifts) && <hr className="my-1" />}

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

        {/* Delete from Scenario - Only for Y overlays */}
        {isYScenario && onDeleteFromScenario && (
          <>
            <hr className="my-1" />
            <button
              className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
              onClick={() => {
                console.log('=== DELETE FROM SCENARIO CLICKED ===');
                console.log('Job ID:', actualJobId, 'Scenario ID:', event.__yScenario);

                const confirmed = window.confirm(
                  `Remove job ${event.title} from scenario "${event.__yScenarioName}"?\n\nThis will delete this job from the Y scenario.`
                );
                if (confirmed && event.__yScenario) {
                  onDeleteFromScenario(actualJobId, event.__yScenario);
                }
                onClose();
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              🗑️ Delete from Scenario
            </button>
          </>
        )}

        {/* Delete Job - Dangerous action */}
        {!isYScenario && onDeleteJob && (
          <>
            <hr className="my-1" />
            <button
              className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
              onClick={() => {
                console.log('=== DELETE JOB CLICKED ===');
                const confirmed = window.confirm(
                  `Are you sure you want to delete job ${event.title}?\n\nThis action cannot be undone.`
                );
                if (confirmed) {
                  onDeleteJob(actualJobId);
                }
                onClose();
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              🗑️ Delete Job
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default JobContextMenu;