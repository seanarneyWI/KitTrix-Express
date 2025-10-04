import { Event } from '../types/event';

export interface EventPosition {
  id: string;
  event: Event;
  top: number;
  height: number;
  startSlot: number;
  endSlot: number;
}

/**
 * Calculate time in minutes from midnight
 */
export function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate minutes to time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate event positions for a calendar day
 * @param events - Events for the day
 * @param timeSlots - Array of time slot strings (e.g., ['08:00', '08:30', '09:00'])
 * @param slotHeightPx - Height of each time slot in pixels
 * @param minDurationMinutes - Minimum duration to show (default 15 minutes)
 */
export function calculateEventPositions(
  events: Event[],
  timeSlots: string[],
  slotHeightPx: number = 64,
  minDurationMinutes: number = 15
): EventPosition[] {
  const positions: EventPosition[] = [];

  if (timeSlots.length === 0) return positions;

  // Calculate minutes per pixel
  const firstSlotTime = timeToMinutes(timeSlots[0]);
  const lastSlotTime = timeSlots.length > 1
    ? timeToMinutes(timeSlots[timeSlots.length - 1])
    : firstSlotTime + 30; // Default to 30 min slots

  const slotDurationMinutes = timeSlots.length > 1
    ? (timeToMinutes(timeSlots[1]) - timeToMinutes(timeSlots[0]))
    : 30; // Default to 30 min slots

  const minutesPerPixel = slotDurationMinutes / slotHeightPx;

  for (const event of events) {
    const startMinutes = timeToMinutes(event.startTime);
    const endMinutes = timeToMinutes(event.endTime);
    const durationMinutes = Math.max(endMinutes - startMinutes, minDurationMinutes);

    // Calculate position relative to the first time slot
    const relativeStartMinutes = startMinutes - firstSlotTime;
    const top = Math.max(0, relativeStartMinutes / minutesPerPixel);
    const height = Math.max(slotHeightPx / 4, durationMinutes / minutesPerPixel); // Minimum height

    // Find which slots this event spans
    const startSlotIndex = timeSlots.findIndex(slot => timeToMinutes(slot) >= startMinutes);
    const endSlotIndex = timeSlots.findIndex(slot => timeToMinutes(slot) >= endMinutes);

    positions.push({
      id: event.id,
      event,
      top,
      height,
      startSlot: Math.max(0, startSlotIndex),
      endSlot: endSlotIndex >= 0 ? endSlotIndex : timeSlots.length - 1,
    });
  }

  return positions;
}

/**
 * Check if two events overlap in time
 */
export function eventsOverlap(event1: Event, event2: Event): boolean {
  const start1 = timeToMinutes(event1.startTime);
  const end1 = timeToMinutes(event1.endTime);
  const start2 = timeToMinutes(event2.startTime);
  const end2 = timeToMinutes(event2.endTime);

  return start1 < end2 && start2 < end1;
}

/**
 * Calculate overlap layout for events (side-by-side positioning)
 */
export function calculateOverlapLayout(events: Event[]): Array<{ event: Event; left: number; width: number }> {
  const result: Array<{ event: Event; left: number; width: number }> = [];

  // Group overlapping events
  const groups: Event[][] = [];

  for (const event of events) {
    let addedToGroup = false;

    for (const group of groups) {
      // Check if this event overlaps with any event in the group
      if (group.some(groupEvent => eventsOverlap(event, groupEvent))) {
        group.push(event);
        addedToGroup = true;
        break;
      }
    }

    if (!addedToGroup) {
      groups.push([event]);
    }
  }

  // Calculate positions for each group
  for (const group of groups) {
    const groupSize = group.length;
    const width = 100 / groupSize; // Percentage width

    group.forEach((event, index) => {
      result.push({
        event,
        left: (index * width),
        width: width - 1, // Small gap between overlapping events
      });
    });
  }

  return result;
}