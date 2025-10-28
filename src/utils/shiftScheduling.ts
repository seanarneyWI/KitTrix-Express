/**
 * Shift-Based Calendar Scheduling Utilities
 *
 * This module provides functions for scheduling jobs based on user-defined shifts.
 * Jobs are scheduled FORWARD from start time (not backward from due date).
 */

import { apiUrl } from '../config/api';

export interface Shift {
  id: string;
  name: string;
  startTime: string;    // "07:00" (24-hour format)
  endTime: string;      // "15:00" (24-hour format)
  breakStart: string | null;
  breakDuration: number | null;  // minutes
  isActive: boolean;
  order: number;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  jobId: string;
  color?: string;
  [key: string]: any;
}

/**
 * Fetch all shifts from the API
 */
export async function getAllShifts(): Promise<Shift[]> {
  const response = await fetch(apiUrl('/api/shifts'));
  if (!response.ok) {
    throw new Error('Failed to fetch shifts');
  }
  return response.json();
}

/**
 * Fetch only active shifts from the API
 */
export async function getActiveShifts(): Promise<Shift[]> {
  const response = await fetch(apiUrl('/api/shifts?activeOnly=true'));
  if (!response.ok) {
    throw new Error('Failed to fetch active shifts');
  }
  return response.json();
}

/**
 * Toggle a shift's isActive status
 */
export async function toggleShift(shiftId: string, isActive: boolean): Promise<Shift> {
  const response = await fetch(apiUrl(`/api/shifts/${shiftId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive })
  });

  if (!response.ok) {
    throw new Error('Failed to toggle shift');
  }

  return response.json();
}

/**
 * Update shift details (times, breaks, name, color)
 */
export async function updateShift(
  shiftId: string,
  updates: {
    name?: string;
    startTime?: string;
    endTime?: string;
    breakStart?: string | null;
    breakDuration?: number | null;
    order?: number;
    color?: string | null;
  }
): Promise<Shift> {
  const response = await fetch(apiUrl(`/api/shifts/${shiftId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    throw new Error('Failed to update shift');
  }

  return response.json();
}

/**
 * Calculate productive hours in a shift (excluding break)
 */
export function getShiftProductiveHours(shift: Shift): number {
  const startMinutes = timeStringToMinutes(shift.startTime);
  let endMinutes = timeStringToMinutes(shift.endTime);

  // Handle overnight shifts (e.g., 23:00 to 07:00)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours
  }

  const totalMinutes = endMinutes - startMinutes;
  const breakMinutes = shift.breakDuration || 0;
  const productiveMinutes = totalMinutes - breakMinutes;

  return productiveMinutes / 60; // Convert to hours
}

/**
 * Calculate total productive hours per day based on active shifts
 */
export function getTotalProductiveHoursPerDay(activeShifts: Shift[]): number {
  return activeShifts.reduce((total, shift) => {
    return total + getShiftProductiveHours(shift);
  }, 0);
}

/**
 * Convert time string (e.g., "07:00") to minutes since midnight
 */
export function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (e.g., "07:00")
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Check if a given time falls within a shift's productive hours
 * (considering breaks)
 */
export function isTimeInShift(time: Date, shift: Shift, includeBreak: boolean = false): boolean {
  const timeMinutes = time.getHours() * 60 + time.getMinutes();
  const startMinutes = timeStringToMinutes(shift.startTime);
  let endMinutes = timeStringToMinutes(shift.endTime);

  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  let isInShift = timeMinutes >= startMinutes && timeMinutes < endMinutes;

  // Check if time falls within break
  if (!includeBreak && shift.breakStart && shift.breakDuration) {
    const breakStartMinutes = timeStringToMinutes(shift.breakStart);
    const breakEndMinutes = breakStartMinutes + shift.breakDuration;

    if (timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes) {
      isInShift = false;
    }
  }

  return isInShift;
}

/**
 * Find which shift a given time belongs to
 */
export function findShiftForTime(time: Date, activeShifts: Shift[]): Shift | null {
  for (const shift of activeShifts) {
    if (isTimeInShift(time, shift, false)) {
      return shift;
    }
  }
  return null;
}

/**
 * Get the next productive time slot (skipping breaks and inactive shifts)
 */
export function getNextProductiveTime(
  currentTime: Date,
  activeShifts: Shift[]
): Date {
  const sortedShifts = [...activeShifts].sort((a, b) => a.order - b.order);

  // Try to find a shift that contains the current time
  const currentShift = findShiftForTime(currentTime, sortedShifts);

  if (currentShift) {
    // Check if we're in a break
    if (currentShift.breakStart && currentShift.breakDuration) {
      const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      const breakStartMinutes = timeStringToMinutes(currentShift.breakStart);
      const breakEndMinutes = breakStartMinutes + currentShift.breakDuration;

      if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
        // Skip to end of break
        const newTime = new Date(currentTime);
        newTime.setHours(0, breakEndMinutes, 0, 0);
        return newTime;
      }
    }

    // Current time is in a productive period
    return currentTime;
  }

  // Current time is not in any shift, find the next shift start
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  for (const shift of sortedShifts) {
    const shiftStartMinutes = timeStringToMinutes(shift.startTime);

    if (shiftStartMinutes > currentMinutes) {
      const newTime = new Date(currentTime);
      newTime.setHours(0, shiftStartMinutes, 0, 0);
      return newTime;
    }
  }

  // No shift found today, move to first shift tomorrow
  const nextDay = new Date(currentTime);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, timeStringToMinutes(sortedShifts[0].startTime), 0, 0);
  return nextDay;
}

/**
 * Schedule a job forward from start time, accounting for shifts and breaks
 * Returns the calculated end time
 */
export function scheduleJobForward(
  startTime: Date,
  durationSeconds: number,
  activeShifts: Shift[]
): Date {
  if (activeShifts.length === 0) {
    console.warn('No active shifts available, using 24/7 scheduling');
    return new Date(startTime.getTime() + durationSeconds * 1000);
  }

  let currentTime = getNextProductiveTime(new Date(startTime), activeShifts);
  let remainingSeconds = durationSeconds;

  while (remainingSeconds > 0) {
    const currentShift = findShiftForTime(currentTime, activeShifts);

    if (!currentShift) {
      // Move to next shift
      currentTime = getNextProductiveTime(currentTime, activeShifts);
      continue;
    }

    // Calculate time until end of current productive period
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    let endOfPeriodMinutes: number;

    // Check if there's a break coming up
    if (currentShift.breakStart && currentShift.breakDuration) {
      const breakStartMinutes = timeStringToMinutes(currentShift.breakStart);

      if (currentMinutes < breakStartMinutes) {
        endOfPeriodMinutes = breakStartMinutes;
      } else {
        // After break, go until shift end
        let shiftEndMinutes = timeStringToMinutes(currentShift.endTime);
        if (shiftEndMinutes <= timeStringToMinutes(currentShift.startTime)) {
          shiftEndMinutes += 24 * 60; // Overnight shift
        }
        endOfPeriodMinutes = shiftEndMinutes;
      }
    } else {
      // No break, go until shift end
      let shiftEndMinutes = timeStringToMinutes(currentShift.endTime);
      if (shiftEndMinutes <= timeStringToMinutes(currentShift.startTime)) {
        shiftEndMinutes += 24 * 60; // Overnight shift
      }
      endOfPeriodMinutes = shiftEndMinutes;
    }

    const availableMinutes = endOfPeriodMinutes - currentMinutes;
    const availableSeconds = availableMinutes * 60;

    if (availableSeconds >= remainingSeconds) {
      // Job finishes within this productive period
      currentTime = new Date(currentTime.getTime() + remainingSeconds * 1000);
      remainingSeconds = 0;
    } else {
      // Use all available time in this period, move to next
      currentTime = new Date(currentTime.getTime() + availableSeconds * 1000);
      remainingSeconds -= availableSeconds;
      currentTime = getNextProductiveTime(currentTime, activeShifts);
    }
  }

  return currentTime;
}

/**
 * Calculate job duration in calendar time (accounting for shifts, breaks, inactive shifts)
 * Returns duration in days/hours for display purposes
 */
export function calculateJobDuration(
  durationSeconds: number,
  activeShifts: Shift[]
): { days: number; hours: number } {
  if (activeShifts.length === 0) {
    const totalHours = durationSeconds / 3600;
    return {
      days: Math.floor(totalHours / 24),
      hours: totalHours % 24
    };
  }

  const productiveHoursPerDay = getTotalProductiveHoursPerDay(activeShifts);
  const requiredProductiveHours = durationSeconds / 3600;

  const days = Math.floor(requiredProductiveHours / productiveHoursPerDay);
  const remainingHours = requiredProductiveHours % productiveHoursPerDay;

  return { days, hours: remainingHours };
}
