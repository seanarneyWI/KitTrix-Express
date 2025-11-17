/**
 * Create Test Jobs for Per-Job Scheduling Configuration
 *
 * This script creates several test jobs with different shift and weekend configurations
 * to verify the per-job scheduling feature works correctly.
 */

const API_URL = 'http://localhost:3001';

async function getShifts() {
  const response = await fetch(`${API_URL}/api/shifts`);
  if (!response.ok) {
    throw new Error('Failed to fetch shifts');
  }
  return response.json();
}

async function createJob(jobData) {
  const response = await fetch(`${API_URL}/api/kitting-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create job: ${error.error || response.statusText}`);
  }

  return response.json();
}

async function main() {
  console.log('🚀 Creating test jobs for per-job scheduling...\n');

  try {
    // Fetch available shifts
    const shifts = await getShifts();
    console.log(`📊 Found ${shifts.length} shifts:`);
    shifts.forEach(shift => {
      console.log(`  - ${shift.name} (${shift.startTime}-${shift.endTime}) ${shift.isActive ? '✓ Active' : '✗ Inactive'}`);
    });
    console.log('');

    // Get shift IDs for configuration
    const firstShiftId = shifts.find(s => s.name.includes('First'))?.id;
    const secondShiftId = shifts.find(s => s.name.includes('Second'))?.id;
    const thirdShiftId = shifts.find(s => s.name.includes('Third'))?.id;

    // Base date for scheduling (tomorrow at 7:00 AM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDate = tomorrow.toISOString().split('T')[0];

    // Job 1: Default Configuration (Global Active Shifts, Weekdays Only)
    console.log('Creating Job 1: Acme Manufacturing...');
    const routeSteps1 = [
      { name: 'Pick Parts', expectedSeconds: 60, order: 0, instructionType: 'NONE', autoLoop: false },
      { name: 'Assemble Kit', expectedSeconds: 120, order: 1, instructionType: 'NONE', autoLoop: false },
      { name: 'Quality Check', expectedSeconds: 30, order: 2, instructionType: 'NONE', autoLoop: false },
      { name: 'Package', expectedSeconds: 45, order: 3, instructionType: 'NONE', autoLoop: false }
    ];
    const expectedKitDuration1 = routeSteps1.reduce((sum, step) => sum + step.expectedSeconds, 0);
    const expectedJobDuration1 = 1800 + 600 + (expectedKitDuration1 * 100) + 1800;

    const job1 = await createJob({
      customerName: 'Acme Manufacturing',
      companyId: null,
      jobNumber: '2501',
      description: 'Standard Production Kit',
      customerSpec: 'Standard weekday production schedule',
      orderedQuantity: 100,
      runLength: 100,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      scheduledDate: new Date(scheduledDate + 'T07:00:00').toISOString(),
      scheduledStartTime: '07:00',
      executionInterface: 'STEPS',
      setup: 1800, // 30 min
      makeReady: 600, // 10 min
      takeDown: 1800, // 30 min
      expectedKitDuration: expectedKitDuration1,
      expectedJobDuration: expectedJobDuration1,
      allowedShiftIds: [], // Empty = use global active shifts
      includeWeekends: false, // Weekdays only
      status: 'SCHEDULED',
      routeSteps: routeSteps1
    });
    console.log(`✅ Created: ${job1.jobNumber} (ID: ${job1.id})`);
    console.log(`   Expected Duration: ${Math.round(job1.expectedJobDuration / 3600)} hours`);
    console.log('');

    // Job 2: First Shift Only
    if (firstShiftId) {
      console.log('Creating Job 2: Global Tech Solutions...');
      const routeSteps2 = [
        { name: 'Prepare Materials', expectedSeconds: 45, order: 0, instructionType: 'NONE', autoLoop: false },
        { name: 'Build Assembly', expectedSeconds: 180, order: 1, instructionType: 'NONE', autoLoop: false },
        { name: 'Test Unit', expectedSeconds: 60, order: 2, instructionType: 'NONE', autoLoop: false },
        { name: 'Box and Label', expectedSeconds: 30, order: 3, instructionType: 'NONE', autoLoop: false }
      ];
      const expectedKitDuration2 = routeSteps2.reduce((sum, step) => sum + step.expectedSeconds, 0);
      const expectedJobDuration2 = 1800 + 600 + (expectedKitDuration2 * 150) + 1800;

      const job2 = await createJob({
        customerName: 'Global Tech Solutions',
        companyId: null,
        jobNumber: '2502',
        description: 'Precision Assembly Kit',
        customerSpec: 'First shift only - specialized crew required',
        orderedQuantity: 150,
        runLength: 150,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        scheduledDate: new Date(scheduledDate + 'T07:00:00').toISOString(),
        scheduledStartTime: '07:00',
        executionInterface: 'TARGET',
        setup: 1800,
        makeReady: 600,
        takeDown: 1800,
        expectedKitDuration: expectedKitDuration2,
        expectedJobDuration: expectedJobDuration2,
        allowedShiftIds: [firstShiftId], // Only first shift
        includeWeekends: false,
        status: 'SCHEDULED',
        routeSteps: routeSteps2
      });
      console.log(`✅ Created: ${job2.jobNumber} (ID: ${job2.id})`);
      console.log(`   Expected Duration: ${Math.round(job2.expectedJobDuration / 3600)} hours`);
      console.log('');
    }

    // Job 3: Rush Job - First + Second Shifts
    if (firstShiftId && secondShiftId) {
      console.log('Creating Job 3: Premier Packaging Co...');
      const routeSteps3 = [
        { name: 'Stage Components', expectedSeconds: 30, order: 0, instructionType: 'NONE', autoLoop: false },
        { name: 'Fabricate', expectedSeconds: 240, order: 1, instructionType: 'NONE', autoLoop: false },
        { name: 'Inspect', expectedSeconds: 45, order: 2, instructionType: 'NONE', autoLoop: false },
        { name: 'Pack', expectedSeconds: 35, order: 3, instructionType: 'NONE', autoLoop: false }
      ];
      const expectedKitDuration3 = routeSteps3.reduce((sum, step) => sum + step.expectedSeconds, 0);
      const expectedJobDuration3 = 2400 + 900 + (expectedKitDuration3 * 200) + 2400;

      const job3 = await createJob({
        customerName: 'Premier Packaging Co',
        companyId: null,
        jobNumber: '2503-RUSH',
        description: 'Rush Order - Extended Production',
        customerSpec: 'Extended hours: 1st & 2nd shift coverage',
        orderedQuantity: 200,
        runLength: 200,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        scheduledDate: new Date(scheduledDate + 'T07:00:00').toISOString(),
        scheduledStartTime: '07:00',
        executionInterface: 'BASIC',
        setup: 2400, // 40 min
        makeReady: 900, // 15 min
        takeDown: 2400, // 40 min
        expectedKitDuration: expectedKitDuration3,
        expectedJobDuration: expectedJobDuration3,
        allowedShiftIds: [firstShiftId, secondShiftId], // First and second shifts
        includeWeekends: false,
        status: 'SCHEDULED',
        routeSteps: routeSteps3
      });
      console.log(`✅ Created: ${job3.jobNumber} (ID: ${job3.id})`);
      console.log(`   Expected Duration: ${Math.round(job3.expectedJobDuration / 3600)} hours`);
      console.log('');
    }

    // Job 4: Weekend Included (Global Shifts + Weekends)
    console.log('Creating Job 4: Midwest Distribution...');
    const routeSteps4 = [
      { name: 'Collect Materials', expectedSeconds: 50, order: 0, instructionType: 'NONE', autoLoop: false },
      { name: 'Assemble', expectedSeconds: 200, order: 1, instructionType: 'NONE', autoLoop: false },
      { name: 'Quality Test', expectedSeconds: 40, order: 2, instructionType: 'NONE', autoLoop: false },
      { name: 'Finalize', expectedSeconds: 25, order: 3, instructionType: 'NONE', autoLoop: false }
    ];
    const expectedKitDuration4 = routeSteps4.reduce((sum, step) => sum + step.expectedSeconds, 0);
    const expectedJobDuration4 = 1800 + 600 + (expectedKitDuration4 * 120) + 1800;

    const job4 = await createJob({
      customerName: 'Midwest Distribution',
      companyId: null,
      jobNumber: '2504-WE',
      description: 'Weekend Overtime Production',
      customerSpec: 'Weekend production authorized for early completion',
      orderedQuantity: 120,
      runLength: 120,
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
      scheduledDate: new Date(scheduledDate + 'T07:00:00').toISOString(),
      scheduledStartTime: '07:00',
      executionInterface: 'STEPS',
      setup: 1800,
      makeReady: 600,
      takeDown: 1800,
      expectedKitDuration: expectedKitDuration4,
      expectedJobDuration: expectedJobDuration4,
      allowedShiftIds: [], // Use global active shifts
      includeWeekends: true, // Include weekends!
      status: 'SCHEDULED',
      routeSteps: routeSteps4
    });
    console.log(`✅ Created: ${job4.jobNumber} (ID: ${job4.id})`);
    console.log(`   Expected Duration: ${Math.round(job4.expectedJobDuration / 3600)} hours`);
    console.log('');

    // Job 5: Super Rush - All Shifts + Weekends
    if (firstShiftId && secondShiftId && thirdShiftId) {
      console.log('Creating Job 5: Velocity Logistics...');
      const routeSteps5 = [
        { name: 'Prep Station', expectedSeconds: 40, order: 0, instructionType: 'NONE', autoLoop: false },
        { name: 'Main Assembly', expectedSeconds: 300, order: 1, instructionType: 'NONE', autoLoop: false },
        { name: 'Secondary Assembly', expectedSeconds: 120, order: 2, instructionType: 'NONE', autoLoop: false },
        { name: 'Final Inspection', expectedSeconds: 60, order: 3, instructionType: 'NONE', autoLoop: false },
        { name: 'Package and Ship', expectedSeconds: 45, order: 4, instructionType: 'NONE', autoLoop: false }
      ];
      const expectedKitDuration5 = routeSteps5.reduce((sum, step) => sum + step.expectedSeconds, 0);
      const expectedJobDuration5 = 3600 + 1200 + (expectedKitDuration5 * 250) + 3600;

      const job5 = await createJob({
        customerName: 'Velocity Logistics',
        companyId: null,
        jobNumber: '2505-URGENT',
        description: 'Critical Priority Order - 24/7',
        customerSpec: 'Maximum priority: All shifts & weekends authorized',
        orderedQuantity: 250,
        runLength: 250,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        scheduledDate: new Date(scheduledDate + 'T07:00:00').toISOString(),
        scheduledStartTime: '07:00',
        executionInterface: 'TARGET',
        setup: 3600, // 1 hour
        makeReady: 1200, // 20 min
        takeDown: 3600, // 1 hour
        expectedKitDuration: expectedKitDuration5,
        expectedJobDuration: expectedJobDuration5,
        allowedShiftIds: [firstShiftId, secondShiftId, thirdShiftId], // All shifts
        includeWeekends: true, // Weekends too!
        status: 'SCHEDULED',
        routeSteps: routeSteps5
      });
      console.log(`✅ Created: ${job5.jobNumber} (ID: ${job5.id})`);
      console.log(`   Expected Duration: ${Math.round(job5.expectedJobDuration / 3600)} hours`);
      console.log('');
    }

    console.log('✅ All jobs created successfully!');
    console.log('');
    console.log('📋 Jobs Summary:');
    console.log('  1. 2501 (Acme Manufacturing): Standard weekday production');
    console.log('  2. 2502 (Global Tech Solutions): First shift only');
    console.log('  3. 2503-RUSH (Premier Packaging): Extended hours (1st + 2nd shifts)');
    console.log('  4. 2504-WE (Midwest Distribution): Weekend production included');
    console.log('  5. 2505-URGENT (Velocity Logistics): Maximum priority (all shifts + weekends)');
    console.log('');
    console.log('🔍 Check the Dashboard to see how these jobs are scheduled differently!');

  } catch (error) {
    console.error('❌ Error creating test jobs:', error.message);
    process.exit(1);
  }
}

main();
