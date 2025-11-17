import { KittingJob } from './kitting';

export interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  color?: string;
  type?: 'event' | 'kitting-job';
  kittingJob?: KittingJob;
  actualDurationMinutes?: number; // Actual work duration for this day segment (for multi-day jobs)
  __whatif?: 'added' | 'modified' | 'deleted'; // What-if scenario change marker
  __yScenario?: string; // Y scenario overlay ID
  __yScenarioName?: string; // Y scenario overlay name
  __yScenarioDeleted?: boolean; // Y scenario deleted marker
}

export interface DragData {
  type: 'event' | 'resize';
  eventId: string;
  resizeHandle?: 'top' | 'bottom';
  isYScenario?: boolean; // Flag indicating this is a Y scenario overlay
  yScenarioId?: string; // Y scenario ID for routing updates
}

export interface CalendarItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'event' | 'kitting-job';
  event?: Event;
  kittingJob?: KittingJob;
}