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
  __whatif?: 'added' | 'modified' | 'deleted'; // What-if scenario change marker
}

export interface DragData {
  type: 'event' | 'resize';
  eventId: string;
  resizeHandle?: 'top' | 'bottom';
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