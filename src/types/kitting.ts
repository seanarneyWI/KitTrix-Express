export type InstructionType = 'NONE' | 'VIDEO' | 'IMAGE' | 'TEXT';

export interface RouteStep {
  id?: string;
  name: string;
  expectedSeconds: number;
  order?: number;
  instructionType: InstructionType;
  instructionUrl?: string;
  instructionText?: string;
  autoLoop: boolean;
}

export interface KittingJobData {
  customerName: string;
  jobNumber: string;
  dueDate: string;
  orderedQuantity: number;
  runLength: number;
  customerSpec: string;
  description: string;
  setup: number; // seconds
  makeReady: number; // seconds
  takeDown: number; // seconds
  routeSteps: RouteStep[]; // array of route steps with instructions
}

export interface KittingJob {
  id: string;
  customerName: string;
  jobNumber: string;
  dueDate: string;
  orderedQuantity: number;
  runLength: number;
  customerSpec: string;
  description: string;
  setup: number;
  makeReady: number;
  takeDown: number;
  routeSteps: RouteStep[];
  expectedKitDuration: number; // EKD - calculated
  expectedJobDuration: number; // EJD - calculated
  status: 'scheduled' | 'in-progress' | 'completed' | 'paused';
  createdAt: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
}

export interface KitProgress {
  kitNumber: number;
  startTime: string;
  endTime?: string;
  actualDuration?: number;
  currentStepIndex: number;
  stepStartTime?: string;
  completed: boolean;
}

export interface JobProgress {
  id?: string; // JobProgress record ID
  jobId: string;
  startTime?: string;
  endTime?: string;
  actualJobDuration?: number;
  completedKits: number;
  remainingKits: number;
  currentKit?: KitProgress;
  completedKitsHistory: KitProgress[];
  isActive: boolean;
  pausedTime?: number; // accumulated pause time in seconds
}

export type JobStatus = 'scheduled' | 'in-progress' | 'completed' | 'paused';

export interface TimerState {
  jobStartTime?: number;
  kitStartTime?: number;
  stepStartTime?: number;
  isRunning: boolean;
  isPaused: boolean;
  pausedDuration: number;
}