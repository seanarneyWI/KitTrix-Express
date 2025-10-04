import { KittingJobData, KittingJob, RouteStep } from '../types/kitting';

export function calculateExpectedKitDuration(routeSteps: RouteStep[]): number {
  return routeSteps.reduce((total, step) => total + step.expectedSeconds, 0);
}

export function calculateExpectedJobDuration(
  expectedKitDuration: number,
  orderedQuantity: number,
  setup: number,
  makeReady: number,
  takeDown: number
): number {
  return (expectedKitDuration * orderedQuantity) + setup + makeReady + takeDown;
}

export function convertRouteStepsToArray(routeSteps: RouteStep[]): RouteStep[] {
  return routeSteps.map((step, index) => ({
    ...step,
    order: step.order ?? index
  }));
}

export function createKittingJobFromData(data: KittingJobData): Omit<KittingJob, 'id' | 'createdAt'> {
  const routeStepsArray = convertRouteStepsToArray(data.routeSteps);
  const expectedKitDuration = calculateExpectedKitDuration(data.routeSteps);
  const expectedJobDuration = calculateExpectedJobDuration(
    expectedKitDuration,
    data.orderedQuantity,
    data.setup,
    data.makeReady,
    data.takeDown
  );

  return {
    customerName: data.customerName,
    jobNumber: data.jobNumber,
    dueDate: data.dueDate,
    orderedQuantity: data.orderedQuantity,
    runLength: data.runLength,
    customerSpec: data.customerSpec,
    description: data.description,
    setup: data.setup,
    makeReady: data.makeReady,
    takeDown: data.takeDown,
    routeSteps: routeStepsArray,
    expectedKitDuration,
    expectedJobDuration,
    status: 'scheduled'
  };
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}h`;
  } else {
    return `${minutes}m`;
  }
}

export function calculateProgress(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export function getCurrentExpectedStep(
  routeSteps: RouteStep[],
  elapsedKitTime: number
): { step: RouteStep | null; stepIndex: number; timeInStep: number } {
  let cumulativeTime = 0;

  for (let i = 0; i < routeSteps.length; i++) {
    const step = routeSteps[i];
    if (elapsedKitTime <= cumulativeTime + step.expectedSeconds) {
      return {
        step,
        stepIndex: i,
        timeInStep: elapsedKitTime - cumulativeTime
      };
    }
    cumulativeTime += step.expectedSeconds;
  }

  // If we've exceeded all steps, return the last step
  const lastStep = routeSteps[routeSteps.length - 1];
  return {
    step: lastStep || null,
    stepIndex: routeSteps.length - 1,
    timeInStep: lastStep ? elapsedKitTime - (cumulativeTime - lastStep.expectedSeconds) : 0
  };
}

export function getRemainingStepTime(step: RouteStep, timeInStep: number): number {
  return Math.max(0, step.expectedSeconds - timeInStep);
}

export function isJobOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

export function getJobPriority(dueDate: string): 'high' | 'medium' | 'low' {
  const now = new Date();
  const due = new Date(dueDate);
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) return 'high'; // Overdue
  if (hoursUntilDue < 24) return 'high'; // Due within 24 hours
  if (hoursUntilDue < 72) return 'medium'; // Due within 3 days
  return 'low';
}

export function validateKittingJobData(data: Partial<KittingJobData>): string[] {
  const errors: string[] = [];

  if (!data.customerName?.trim()) errors.push('Customer name is required');
  if (!data.jobNumber?.trim()) errors.push('Job number is required');
  if (!data.dueDate) errors.push('Due date is required');
  if (!data.orderedQuantity || data.orderedQuantity <= 0) errors.push('Ordered quantity must be greater than 0');
  if (!data.description?.trim()) errors.push('Description is required');
  if (data.setup === undefined || data.setup < 0) errors.push('Setup time must be 0 or greater');
  if (data.makeReady === undefined || data.makeReady < 0) errors.push('Make ready time must be 0 or greater');
  if (data.takeDown === undefined || data.takeDown < 0) errors.push('Take down time must be 0 or greater');
  if (!data.routeSteps || !Array.isArray(data.routeSteps) || data.routeSteps.length === 0) {
    errors.push('At least one route step is required');
  } else {
    data.routeSteps.forEach((step, index) => {
      if (!step.name?.trim()) errors.push(`Route step ${index + 1} name cannot be empty`);
      if (typeof step.expectedSeconds !== 'number' || step.expectedSeconds <= 0) {
        errors.push(`Route step "${step.name || index + 1}" must have a time greater than 0 seconds`);
      }
      if (step.instructionType && !['NONE', 'VIDEO', 'IMAGE', 'TEXT'].includes(step.instructionType)) {
        errors.push(`Route step "${step.name || index + 1}" has invalid instruction type`);
      }
    });
  }

  return errors;
}