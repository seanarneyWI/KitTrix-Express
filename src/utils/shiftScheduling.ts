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

/**
 * Check if a given date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Skip to the next weekday (Monday) if current date is a weekend
 */
export function skipToWeekday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();

  if (day === 0) {
    // Sunday -> add 1 day to get to Monday
    result.setDate(result.getDate() + 1);
  } else if (day === 6) {
    // Saturday -> add 2 days to get to Monday
    result.setDate(result.getDate() + 2);
  }

  return result;
}

/**
 * Get the next productive time, optionally skipping weekends
 */
export function getNextProductiveTimeWithConfig(
  currentTime: Date,
  activeShifts: Shift[],
  includeWeekends: boolean = false
): Date {
  let nextTime = new Date(currentTime);

  // Skip weekends if needed
  if (!includeWeekends && isWeekend(nextTime)) {
    nextTime = skipToWeekday(nextTime);
    // Set to start of first shift on Monday
    const sortedShifts = [...activeShifts].sort((a, b) => a.order - b.order);
    if (sortedShifts.length > 0) {
      nextTime.setHours(0, timeStringToMinutes(sortedShifts[0].startTime), 0, 0);
    }
  }

  // Use existing logic to find next productive time
  return getNextProductiveTime(nextTime, activeShifts);
}

/**
 * Schedule a job forward with per-job configuration
 * Supports custom shift selection and weekend inclusion
 */
export function scheduleJobForwardWithConfig(
  startTime: Date,
  durationSeconds: number,
  allShifts: Shift[],
  allowedShiftIds: string[] = [],
  includeWeekends: boolean = false,
  ignoreActiveStatus: boolean = false  // New parameter for Y scenarios
): Date {
  console.log('📅 scheduleJobForwardWithConfig called:', {
    startTime: startTime.toISOString(),
    durationSeconds,
    totalShifts: allShifts.length,
    allowedShiftIds,
    allowedShiftCount: allowedShiftIds.length,
    includeWeekends,
    ignoreActiveStatus
  });
  // Determine which shifts to use
  let shiftsToUse: Shift[];

  if (allowedShiftIds.length > 0) {
    // Use specific shifts for this job
    if (ignoreActiveStatus) {
      // Y scenarios: ignore global isActive status to test any shift configuration
      shiftsToUse = allShifts.filter(shift =>
        allowedShiftIds.includes(shift.id)
      );
    } else {
      // Production jobs: respect both allowedShiftIds AND isActive status
      shiftsToUse = allShifts.filter(shift =>
        shift.isActive && allowedShiftIds.includes(shift.id)
      );
    }
  } else {
    // Use all active shifts (backward compatible)
    shiftsToUse = allShifts.filter(shift => shift.isActive);
  }

  console.log('📅 Shifts selected for scheduling:', {
    shiftsToUseCount: shiftsToUse.length,
    shiftNames: shiftsToUse.map(s => s.name).join(', '),
    totalProductiveHours: shiftsToUse.reduce((sum, s) => sum + getShiftProductiveHours(s), 0)
  });

  if (shiftsToUse.length === 0) {
    console.warn('No shifts available for scheduling, using 24/7 scheduling');
    return new Date(startTime.getTime() + durationSeconds * 1000);
  }

  let currentTime = getNextProductiveTimeWithConfig(
    new Date(startTime),
    shiftsToUse,
    includeWeekends
  );
  let remainingSeconds = durationSeconds;

  while (remainingSeconds > 0) {
    // Check if we're on a weekend and should skip
    if (!includeWeekends && isWeekend(currentTime)) {
      currentTime = skipToWeekday(currentTime);
      const sortedShifts = [...shiftsToUse].sort((a, b) => a.order - b.order);
      if (sortedShifts.length > 0) {
        currentTime.setHours(0, timeStringToMinutes(sortedShifts[0].startTime), 0, 0);
      }
      continue;
    }

    const currentShift = findShiftForTime(currentTime, shiftsToUse);

    if (!currentShift) {
      // Move to next shift
      currentTime = getNextProductiveTimeWithConfig(currentTime, shiftsToUse, includeWeekends);
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
      currentTime = getNextProductiveTimeWithConfig(currentTime, shiftsToUse, includeWeekends);
    }
  }

  const totalDays = Math.ceil((currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
  console.log('📅 Scheduling complete:', {
    startDate: startTime.toISOString().split('T')[0],
    endDate: currentTime.toISOString().split('T')[0],
    totalDays,
    durationSeconds,
    shiftsUsed: shiftsToUse.length
  });

  return currentTime;
}

/**
 * Apply delays to a job's route steps for Y scenario planning
 *
 * This function injects delay steps into a job's route steps array based on the
 * configured delays. Delays extend job duration and are inserted after specific steps.
 *
 * @param job - The kitting job to apply delays to
 * @param delays - Array of job delays to inject
 * @returns Modified job with delays injected into route steps and updated durations
 */
export interface JobDelay {
  id: string;
  scenarioId: string;
  jobId: string;
  name: string;
  duration: number;  // seconds
  insertAfter: number;  // step order number (0 = after setup)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recalculate job duration based on station count and allowed shifts
 * Formula: expectedJobDuration = (totalKitSeconds / stationCount)
 * This adjusts for parallel execution across multiple stations
 */
export function recalculateJobDuration(
  job: any,
  stationCount?: number,
  allowedShiftIds?: string[]
): any {
  const effectiveStationCount = stationCount || job.stationCount || 1;

  // Calculate base duration per station
  // totalKitSeconds is the total work time for all kits
  const totalKitSeconds = job.totalKitSeconds || (job.expectedJobDuration * (job.originalStationCount || job.stationCount || 1));
  const newExpectedJobDuration = totalKitSeconds / effectiveStationCount;

  console.log(`🔧 Recalculating job duration: ${job.expectedJobDuration}s → ${newExpectedJobDuration}s (${effectiveStationCount} stations)`);

  return {
    ...job,
    stationCount: effectiveStationCount,
    expectedJobDuration: newExpectedJobDuration,
    ...(allowedShiftIds && { allowedShiftIds })
  };
}

export function applyDelaysToJob(job: any, delays: JobDelay[]): any {
  if (!delays || delays.length === 0) {
    return job;  // No delays to apply
  }

  console.log(`⏰ Applying ${delays.length} delays to job ${job.jobNumber}`);

  // Sort route steps by order
  const sortedSteps = [...(job.routeSteps || [])].sort((a, b) => a.order - b.order);

  // Group delays by insertAfter position
  const delaysByPosition = new Map<number, JobDelay[]>();
  delays.forEach(delay => {
    if (!delaysByPosition.has(delay.insertAfter)) {
      delaysByPosition.set(delay.insertAfter, []);
    }
    delaysByPosition.get(delay.insertAfter)!.push(delay);
  });

  // Build new route steps array with delays injected
  const newRouteSteps: any[] = [];
  let stepOrderCounter = 1;

  // Insert delays after setup (insertAfter = 0)
  const setupDelays = delaysByPosition.get(0) || [];
  setupDelays.forEach((delay, index) => {
    newRouteSteps.push({
      id: `delay-${delay.id}`,
      name: `⏰ ${delay.name}`,
      expectedSeconds: delay.duration,
      order: stepOrderCounter++,
      __isDelay: true,  // Mark as synthetic delay step
      __delayId: delay.id
    });
  });

  // Insert regular steps and their associated delays
  sortedSteps.forEach(step => {
    // Add the regular step
    newRouteSteps.push({
      ...step,
      order: stepOrderCounter++
    });

    // Add any delays that come after this step
    const stepsAfter = delaysByPosition.get(step.order) || [];
    stepsAfter.forEach(delay => {
      newRouteSteps.push({
        id: `delay-${delay.id}`,
        name: `⏰ ${delay.name}`,
        expectedSeconds: delay.duration,
        order: stepOrderCounter++,
        __isDelay: true,
        __delayId: delay.id
      });
    });
  });

  // Calculate total delay duration
  const totalDelaySeconds = delays.reduce((sum, delay) => sum + delay.duration, 0);

  // Calculate new job durations with delays included
  const originalExpectedJobDuration = job.expectedJobDuration || 0;
  const newExpectedJobDuration = originalExpectedJobDuration + totalDelaySeconds;

  console.log(`  ⏰ Original EJD: ${originalExpectedJobDuration}s, Added delays: ${totalDelaySeconds}s, New EJD: ${newExpectedJobDuration}s`);

  // Return modified job
  return {
    ...job,
    routeSteps: newRouteSteps,
    expectedJobDuration: newExpectedJobDuration,
    __delaysApplied: true,
    __totalDelaySeconds: totalDelaySeconds
  };
}
