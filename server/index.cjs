const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config();

console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL);

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from Vite build (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'kittrix-api', timestamp: new Date().toISOString() });
});

// Authentication validation endpoint
app.post('/api/auth/validate', async (req, res) => {
  try {
    // Simple auth validation - expand as needed
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    res.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Auth validation error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Kitting Jobs API
app.get('/api/kitting-jobs', async (req, res) => {
  try {
    const { id, status } = req.query;

    let where = {};
    if (id) where.id = id;
    if (status) where.status = status;

    const jobs = await prisma.kittingJob.findMany({
      where,
      include: {
        routeSteps: {
          orderBy: { order: 'asc' }
        },
        jobProgress: {
          include: {
            kitExecutions: {
              orderBy: { kitNumber: 'asc' }
            }
          }
        },
        analytics: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching kitting jobs:', error);
    res.status(500).json({ error: 'Failed to fetch kitting jobs' });
  }
});

app.get('/api/kitting-jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.kittingJob.findUnique({
      where: { id: jobId },
      include: {
        routeSteps: {
          orderBy: { order: 'asc' }
        },
        jobProgress: true,
        analytics: true
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

app.post('/api/kitting-jobs', async (req, res) => {
  try {
    const jobData = req.body;

    // Validate shift IDs if provided
    if (jobData.allowedShiftIds && jobData.allowedShiftIds.length > 0) {
      const shifts = await prisma.shift.findMany({
        where: {
          id: { in: jobData.allowedShiftIds }
        },
        select: { id: true }
      });

      if (shifts.length !== jobData.allowedShiftIds.length) {
        const foundIds = shifts.map(s => s.id);
        const invalidIds = jobData.allowedShiftIds.filter(id => !foundIds.includes(id));
        return res.status(400).json({
          error: 'Invalid shift IDs provided',
          invalidIds
        });
      }
    }

    const job = await prisma.kittingJob.create({
      data: {
        ...jobData,
        routeSteps: jobData.routeSteps ? {
          create: jobData.routeSteps
        } : undefined
      },
      include: {
        routeSteps: {
          orderBy: { order: 'asc' }
        }
      }
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

app.patch('/api/kitting-jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const rawUpdateData = req.body;

    console.log('📝 PATCH /api/kitting-jobs/:jobId - Raw data:', rawUpdateData);

    // Sanitize data: Remove display-only and virtual fields that shouldn't be saved to DB
    const sanitizedData = { ...rawUpdateData };
    delete sanitizedData.__yScenario;
    delete sanitizedData.__yScenarioName;
    delete sanitizedData.__yScenarioDeleted;
    delete sanitizedData.__whatif;
    delete sanitizedData.jobNumber;  // Display-only field
    delete sanitizedData.customerName;  // Display-only field
    delete sanitizedData.id;  // Don't allow ID changes
    delete sanitizedData.createdAt;  // Don't allow timestamp changes
    delete sanitizedData.updatedAt;  // Prisma handles this automatically
    delete sanitizedData.routeSteps;  // Don't update route steps via this endpoint
    delete sanitizedData.assignments;  // Don't update assignments via this endpoint

    // Convert date strings to Date objects if needed
    if (sanitizedData.scheduledDate !== undefined) {
      if (sanitizedData.scheduledDate === null || sanitizedData.scheduledDate === '') {
        // Remove empty/null scheduledDate from update data to avoid Prisma validation error
        delete sanitizedData.scheduledDate;
        console.log('📅 Removed empty scheduledDate from update data');
      } else if (typeof sanitizedData.scheduledDate === 'string') {
        const parsedDate = new Date(sanitizedData.scheduledDate);
        if (isNaN(parsedDate.getTime())) {
          // Invalid date string - remove it
          delete sanitizedData.scheduledDate;
          console.log('📅 Removed invalid scheduledDate from update data:', sanitizedData.scheduledDate);
        } else {
          sanitizedData.scheduledDate = parsedDate;
          console.log('📅 Converted scheduledDate:', sanitizedData.scheduledDate);
        }
      }
    }

    const updateData = sanitizedData;
    console.log('✅ Sanitized data:', updateData);

    // Validate shift IDs if provided
    if (updateData.allowedShiftIds && updateData.allowedShiftIds.length > 0) {
      const shifts = await prisma.shift.findMany({
        where: {
          id: { in: updateData.allowedShiftIds }
        },
        select: { id: true }
      });

      if (shifts.length !== updateData.allowedShiftIds.length) {
        const foundIds = shifts.map(s => s.id);
        const invalidIds = updateData.allowedShiftIds.filter(id => !foundIds.includes(id));
        return res.status(400).json({
          error: 'Invalid shift IDs provided',
          invalidIds
        });
      }
    }

    // If stationCount is being updated, recalculate expectedJobDuration
    if (updateData.stationCount !== undefined) {
      // Fetch current job data
      const currentJob = await prisma.kittingJob.findUnique({
        where: { id: jobId }
      });

      if (currentJob) {
        // Recalculate expectedJobDuration with new station count
        // Formula: EJD = Setup + MakeReady + Math.ceil((EKD × Qty) ÷ StationCount) + TakeDown
        const totalKitTime = currentJob.expectedKitDuration * currentJob.orderedQuantity;
        const parallelizedKitTime = Math.ceil(totalKitTime / updateData.stationCount);
        const newExpectedJobDuration = currentJob.setup + currentJob.makeReady + parallelizedKitTime + currentJob.takeDown;

        updateData.expectedJobDuration = newExpectedJobDuration;
        console.log(`🔧 Recalculated job duration for ${currentJob.jobNumber}: ${currentJob.expectedJobDuration}s → ${newExpectedJobDuration}s (${updateData.stationCount} stations)`);
      }
    }

    const job = await prisma.kittingJob.update({
      where: { id: jobId },
      data: updateData,
      include: {
        routeSteps: {
          orderBy: { order: 'asc' }
        },
        jobProgress: true
      }
    });

    // Reset station counter when job status changes to IN_PROGRESS
    if (updateData.status === 'IN_PROGRESS' && job.jobProgress) {
      await prisma.jobProgress.update({
        where: { id: job.jobProgress.id },
        data: { nextStationNumber: 0 }
      });
      console.log('🔧 Reset station counter for job:', jobId);
    }

    res.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

app.delete('/api/kitting-jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    await prisma.kittingJob.delete({
      where: { id: jobId }
    });

    console.log(`🗑️ Deleted kitting job: ${jobId}`);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Update kitting job schedule (for drag-and-drop)
app.put('/api/kitting-jobs', async (req, res) => {
  try {
    const { id } = req.query;
    const { scheduledDate, scheduledStartTime, allowedShiftIds, includeWeekends } = req.body;

    console.log(`📅 Updating job ${id} schedule:`, { scheduledDate, scheduledStartTime, allowedShiftIds, includeWeekends });

    // Validate inputs
    if (!id) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Validate shift IDs if provided
    if (allowedShiftIds !== undefined && allowedShiftIds.length > 0) {
      const shifts = await prisma.shift.findMany({
        where: {
          id: { in: allowedShiftIds }
        },
        select: { id: true }
      });

      if (shifts.length !== allowedShiftIds.length) {
        const foundIds = shifts.map(s => s.id);
        const invalidIds = allowedShiftIds.filter(id => !foundIds.includes(id));
        return res.status(400).json({
          error: 'Invalid shift IDs provided',
          invalidIds
        });
      }
    }

    // Build update object - only update provided fields
    const updateData = {};
    if (scheduledDate !== undefined) {
      if (scheduledDate) {
        // Parse date as local date, not UTC
        // Add T12:00:00 to ensure it's interpreted as noon local time
        // This prevents timezone issues where UTC midnight becomes previous day
        updateData.scheduledDate = new Date(scheduledDate + 'T12:00:00');
      } else {
        updateData.scheduledDate = null;
      }
    }
    if (scheduledStartTime !== undefined) {
      updateData.scheduledStartTime = scheduledStartTime;
    }
    if (allowedShiftIds !== undefined) {
      updateData.allowedShiftIds = allowedShiftIds;
    }
    if (includeWeekends !== undefined) {
      updateData.includeWeekends = includeWeekends;
    }

    const updatedJob = await prisma.kittingJob.update({
      where: { id },
      data: updateData
    });

    console.log(`✅ Updated job ${id} schedule successfully`);
    res.json(updatedJob);
  } catch (error) {
    console.error('Error updating job schedule:', error);
    res.status(500).json({ error: 'Failed to update job schedule' });
  }
});

// Job Progress API
app.get('/api/job-progress', async (req, res) => {
  try {
    const { jobId } = req.query;

    let where = {};
    if (jobId) where.jobId = jobId;

    const progress = await prisma.jobProgress.findMany({
      where,
      include: {
        kittingJob: true
      }
    });

    res.json(progress);
  } catch (error) {
    console.error('Error fetching job progress:', error);
    res.status(500).json({ error: 'Failed to fetch job progress' });
  }
});

app.post('/api/job-progress', async (req, res) => {
  try {
    const progressData = req.body;

    // If this is a new job start (has startTime and completedKits is 0), reset station counter
    if (progressData.startTime && progressData.completedKits === 0) {
      progressData.nextStationNumber = 0;
      console.log('🔧 Resetting station counter for new job start');
    }

    const progress = await prisma.jobProgress.upsert({
      where: { jobId: progressData.jobId },
      update: progressData,
      create: progressData,
      include: {
        kittingJob: true
      }
    });

    res.json(progress);
  } catch (error) {
    console.error('Error creating/updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

app.delete('/api/job-progress/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    await prisma.jobProgress.delete({
      where: { jobId: jobId }
    });

    res.json({ message: 'Progress deleted successfully' });
  } catch (error) {
    console.error('Error deleting progress:', error);
    res.status(500).json({ error: 'Failed to delete progress' });
  }
});

// Assign station number to a new execution interface
app.post('/api/job-progress/:id/assign-station', async (req, res) => {
  try {
    const { id } = req.params;

    // Atomically increment nextStationNumber and return the new value
    const updated = await prisma.jobProgress.update({
      where: { id },
      data: {
        nextStationNumber: {
          increment: 1
        }
      },
      select: {
        nextStationNumber: true
      }
    });

    const stationNumber = updated.nextStationNumber;
    const stationName = `Station ${stationNumber}`;

    console.log(`📍 Assigned ${stationName} for job progress ${id}`);

    res.json({
      stationNumber,
      stationName
    });
  } catch (error) {
    console.error('Error assigning station:', error);
    res.status(500).json({ error: 'Failed to assign station' });
  }
});

// Reset all station counters (admin/debug endpoint)
app.post('/api/job-progress/reset-all-stations', async (req, res) => {
  try {
    const result = await prisma.jobProgress.updateMany({
      data: { nextStationNumber: 0 }
    });

    console.log(`🔧 Reset all station counters (${result.count} jobs)`);
    res.json({ message: `Reset ${result.count} station counters to 0` });
  } catch (error) {
    console.error('Error resetting station counters:', error);
    res.status(500).json({ error: 'Failed to reset station counters' });
  }
});

// Release station number when execution interface is closed
app.post('/api/job-progress/:id/release-station', async (req, res) => {
  try {
    const { id } = req.params;

    // Atomically decrement nextStationNumber (but never go below 0)
    const current = await prisma.jobProgress.findUnique({
      where: { id },
      select: { nextStationNumber: true }
    });

    if (current && current.nextStationNumber > 0) {
      const updated = await prisma.jobProgress.update({
        where: { id },
        data: {
          nextStationNumber: {
            decrement: 1
          }
        },
        select: {
          nextStationNumber: true
        }
      });

      console.log(`📍 Released station for job progress ${id}, now at ${updated.nextStationNumber}`);
      res.json({ nextStationNumber: updated.nextStationNumber });
    } else {
      console.log(`📍 Station already at 0 for job progress ${id}`);
      res.json({ nextStationNumber: 0 });
    }
  } catch (error) {
    console.error('Error releasing station:', error);
    res.status(500).json({ error: 'Failed to release station' });
  }
});

// Shifts API
app.get('/api/shifts', async (req, res) => {
  try {
    const { activeOnly } = req.query;

    let where = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { order: 'asc' }
    });

    res.json(shifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

app.patch('/api/shifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const shift = await prisma.shift.update({
      where: { id },
      data: updateData
    });

    console.log(`⏰ Updated shift ${shift.name} (isActive: ${shift.isActive})`);
    res.json(shift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

app.put('/api/shifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, breakStart, breakDuration, order, color } = req.body;

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        name,
        startTime,
        endTime,
        breakStart,
        breakDuration,
        order,
        color
      }
    });

    console.log(`⏰ Updated shift details for ${shift.name}`);
    res.json(shift);
  } catch (error) {
    console.error('Error updating shift details:', error);
    res.status(500).json({ error: 'Failed to update shift details' });
  }
});

app.delete('/api/shifts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await prisma.shift.delete({
      where: { id }
    });

    console.log(`🗑️ Deleted shift: ${shift.name}`);
    res.json({ success: true, message: `Shift ${shift.name} deleted` });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

// ===== SCENARIO MANAGEMENT API ENDPOINTS =====

// Get all scenarios
app.get('/api/scenarios', async (req, res) => {
  try {
    const scenarios = await prisma.scenario.findMany({
      include: {
        changes: true
      },
      orderBy: { updatedAt: 'desc' }
    });
    console.log(`🔮 Fetched ${scenarios.length} scenarios`);
    res.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// Get active scenario with all changes
app.get('/api/scenarios/active', async (req, res) => {
  try {
    const activeScenario = await prisma.scenario.findFirst({
      where: { isActive: true },
      include: {
        changes: true
      }
    });

    if (activeScenario) {
      console.log(`🔮 Fetched active scenario: ${activeScenario.name} (${activeScenario.changes.length} changes)`);
    } else {
      console.log('🔮 No active scenario found');
    }

    res.json(activeScenario);
  } catch (error) {
    console.error('Error fetching active scenario:', error);
    res.status(500).json({ error: 'Failed to fetch active scenario' });
  }
});

// Create new scenario
app.post('/api/scenarios', async (req, res) => {
  try {
    const { name, description, sourceJobId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Scenario name is required' });
    }

    // Create the scenario
    const scenario = await prisma.scenario.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        isActive: false
      }
    });

    console.log(`🔮 Created new scenario: ${scenario.name}`);

    // If sourceJobId provided, create initial MODIFY change to mirror the job
    if (sourceJobId) {
      // Fetch the source job with all its data
      const sourceJob = await prisma.kittingJob.findUnique({
        where: { id: sourceJobId },
        include: {
          routeSteps: { orderBy: { order: 'asc' } },
          jobProgress: true
        }
      });

      if (sourceJob) {
        // Create a MODIFY change that copies the job's current state
        const changeData = {
          scheduledDate: sourceJob.scheduledDate,
          scheduledStartTime: sourceJob.scheduledStartTime,
          allowedShiftIds: sourceJob.allowedShiftIds,
          jobNumber: sourceJob.jobNumber,
          customerName: sourceJob.customerName
        };

        // Add station count from job_progress if available
        if (sourceJob.jobProgress) {
          changeData.stationCount = sourceJob.jobProgress.stationCount;
        }

        await prisma.scenarioChange.create({
          data: {
            scenarioId: scenario.id,
            jobId: sourceJobId,
            operation: 'MODIFY',
            changeData: changeData,
            originalData: changeData  // Same as changeData initially
          }
        });

        console.log(`🔮 Created initial MODIFY change for job ${sourceJob.jobNumber} in scenario ${scenario.name}`);
      }
    }

    // Return scenario with changes included
    const scenarioWithChanges = await prisma.scenario.findUnique({
      where: { id: scenario.id },
      include: { changes: true }
    });

    res.json(scenarioWithChanges);
  } catch (error) {
    console.error('Error creating scenario:', error);
    res.status(500).json({ error: 'Failed to create scenario' });
  }
});

// Activate scenario (deactivates others)
app.patch('/api/scenarios/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    // Deactivate all scenarios first
    await prisma.scenario.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Activate the selected scenario
    const scenario = await prisma.scenario.update({
      where: { id },
      data: { isActive: true },
      include: { changes: true }
    });

    console.log(`🔮 Activated scenario: ${scenario.name} (${scenario.changes.length} changes)`);
    res.json(scenario);
  } catch (error) {
    console.error('Error activating scenario:', error);
    res.status(500).json({ error: 'Failed to activate scenario' });
  }
});

// Add change to scenario
app.post('/api/scenarios/:id/changes', async (req, res) => {
  try {
    const { id: scenarioId } = req.params;
    const { jobId, operation, changeData, originalData } = req.body;

    // Validate operation
    if (!['ADD', 'MODIFY', 'DELETE'].includes(operation)) {
      return res.status(400).json({ error: 'Invalid operation. Must be ADD, MODIFY, or DELETE' });
    }

    // Validate changeData exists
    if (!changeData) {
      return res.status(400).json({ error: 'changeData is required' });
    }

    // For MODIFY operations, check if there's an existing MODIFY change for this job
    // If yes, update it by merging changeData; if no, create a new one
    if (operation === 'MODIFY' && jobId) {
      const existingChange = await prisma.scenarioChange.findFirst({
        where: {
          scenarioId,
          jobId,
          operation: 'MODIFY'
        }
      });

      if (existingChange) {
        // Merge new changeData with existing changeData
        const mergedChangeData = {
          ...existingChange.changeData,
          ...changeData
        };

        // Merge originalData too
        const mergedOriginalData = originalData
          ? { ...existingChange.originalData, ...originalData }
          : existingChange.originalData;

        const updated = await prisma.scenarioChange.update({
          where: { id: existingChange.id },
          data: {
            changeData: mergedChangeData,
            originalData: mergedOriginalData
          }
        });

        console.log(`🔮 Updated existing MODIFY change for job ${jobId} in scenario ${scenarioId}`);
        return res.json(updated);
      }
    }

    // No existing change found, create a new one
    const change = await prisma.scenarioChange.create({
      data: {
        scenarioId,
        jobId: jobId || null,
        operation,
        changeData,
        originalData: originalData || null
      }
    });

    console.log(`🔮 Added ${operation} change to scenario ${scenarioId}${jobId ? ` for job ${jobId}` : ''}`);
    res.json(change);
  } catch (error) {
    console.error('Error adding change to scenario:', error);
    res.status(500).json({ error: 'Failed to add change' });
  }
});

// Delete individual scenario change
app.delete('/api/scenario-changes/:changeId', async (req, res) => {
  try {
    const { changeId } = req.params;

    // Verify change exists
    const change = await prisma.scenarioChange.findUnique({
      where: { id: changeId }
    });

    if (!change) {
      return res.status(404).json({ error: 'Change not found' });
    }

    // Delete the change
    await prisma.scenarioChange.delete({
      where: { id: changeId }
    });

    console.log(`🗑️ Deleted change ${changeId} from scenario ${change.scenarioId}`);
    res.json({ success: true, deletedChangeId: changeId });
  } catch (error) {
    console.error('Error deleting scenario change:', error);
    res.status(500).json({ error: 'Failed to delete change' });
  }
});

// Commit scenario (promote all changes to production)
app.post('/api/scenarios/:id/commit', async (req, res) => {
  try {
    const { id: scenarioId } = req.params;

    // Fetch scenario with all changes
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: { changes: true }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    console.log(`🔮 Committing scenario: ${scenario.name} (${scenario.changes.length} changes)`);

    // Process each change in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const applied = { added: 0, modified: 0, deleted: 0 };

      for (const change of scenario.changes) {
        try {
          switch (change.operation) {
            case 'ADD':
              await tx.kittingJob.create({
                data: change.changeData
              });
              applied.added++;
              console.log(`  ✅ Added job: ${change.changeData.jobNumber || 'New Job'}`);
              break;

            case 'MODIFY':
              if (!change.jobId) {
                console.log(`  ⚠️ Skipping MODIFY with no jobId`);
                continue;
              }

              // Sanitize changeData for Prisma
              const updateData = { ...change.changeData };

              // Convert scheduledDate string to proper ISO DateTime
              if (updateData.scheduledDate && typeof updateData.scheduledDate === 'string') {
                // If it's just a date string like "2025-10-31", convert to ISO DateTime
                if (updateData.scheduledDate.length === 10) {
                  updateData.scheduledDate = new Date(updateData.scheduledDate + 'T12:00:00.000Z');
                } else {
                  // If it's already a full ISO string, convert to Date object
                  updateData.scheduledDate = new Date(updateData.scheduledDate);
                }
              }

              // Remove fields that aren't part of the kittingJob schema
              delete updateData.jobNumber;
              delete updateData.customerName;

              await tx.kittingJob.update({
                where: { id: change.jobId },
                data: updateData
              });
              applied.modified++;
              console.log(`  ✅ Modified job: ${change.jobId}`);
              break;

            case 'DELETE':
              if (!change.jobId) {
                console.log(`  ⚠️ Skipping DELETE with no jobId`);
                continue;
              }
              await tx.kittingJob.delete({
                where: { id: change.jobId }
              });
              applied.deleted++;
              console.log(`  ✅ Deleted job: ${change.jobId}`);
              break;
          }
        } catch (changeError) {
          console.error(`  ❌ Error applying ${change.operation} change:`, changeError.message);
          throw changeError; // Rollback transaction on error
        }
      }

      // Delete the scenario after successful commit
      await tx.scenario.delete({
        where: { id: scenarioId }
      });

      return applied;
    });

    console.log(`🔮 Scenario committed successfully:`, results);
    res.json({
      success: true,
      message: 'Scenario committed successfully',
      applied: results
    });
  } catch (error) {
    console.error('❌ Error committing scenario:', error);
    res.status(500).json({ error: 'Failed to commit scenario: ' + error.message });
  }
});

// Discard scenario (delete without applying)
app.delete('/api/scenarios/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const scenario = await prisma.scenario.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    await prisma.scenario.delete({
      where: { id }
    });

    console.log(`🔮 Discarded scenario: ${scenario.name}`);
    res.json({ success: true, message: 'Scenario discarded successfully' });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

// ==================== Job Delay API ====================
// Supports both production delays (scenarioId = NULL) and scenario-specific delays

// Get all delays for a scenario
app.get('/api/scenarios/:id/delays', async (req, res) => {
  try {
    const { id: scenarioId } = req.params;

    const delays = await prisma.jobDelay.findMany({
      where: { scenarioId },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`⏰ Fetched ${delays.length} delays for scenario ${scenarioId}`);
    res.json(delays);
  } catch (error) {
    console.error('Error fetching delays:', error);
    res.status(500).json({ error: 'Failed to fetch delays' });
  }
});

// Get delays for a specific job in a scenario
app.get('/api/scenarios/:scenarioId/jobs/:jobId/delays', async (req, res) => {
  try {
    const { scenarioId, jobId } = req.params;

    const delays = await prisma.jobDelay.findMany({
      where: {
        scenarioId,
        jobId
      },
      orderBy: { insertAfter: 'asc' }
    });

    console.log(`⏰ Fetched ${delays.length} delays for job ${jobId} in scenario ${scenarioId}`);
    res.json(delays);
  } catch (error) {
    console.error('Error fetching job delays:', error);
    res.status(500).json({ error: 'Failed to fetch job delays' });
  }
});

// Get production delays for a specific job (scenarioId = NULL)
app.get('/api/jobs/:jobId/delays', async (req, res) => {
  try {
    const { jobId } = req.params;

    const delays = await prisma.jobDelay.findMany({
      where: {
        scenarioId: null,
        jobId
      },
      orderBy: { insertAfter: 'asc' }
    });

    console.log(`⏰ Fetched ${delays.length} production delays for job ${jobId}`);
    res.json(delays);
  } catch (error) {
    console.error('Error fetching production job delays:', error);
    res.status(500).json({ error: 'Failed to fetch production job delays' });
  }
});

// Create new delay for a job in a scenario
app.post('/api/scenarios/:id/delays', async (req, res) => {
  try {
    const { id: scenarioId } = req.params;
    const { jobId, name, duration, insertAfter } = req.body;

    // Validate required fields
    if (!jobId || !name || duration === undefined || insertAfter === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: jobId, name, duration, insertAfter'
      });
    }

    // Validate duration is positive
    if (duration <= 0) {
      return res.status(400).json({ error: 'Duration must be positive' });
    }

    // Validate insertAfter is non-negative
    if (insertAfter < 0) {
      return res.status(400).json({ error: 'insertAfter must be non-negative' });
    }

    const delay = await prisma.jobDelay.create({
      data: {
        scenarioId,
        jobId,
        name: name.trim(),
        duration: parseInt(duration),
        insertAfter: parseInt(insertAfter)
      }
    });

    console.log(`⏰ Created scenario delay "${delay.name}" (${delay.duration}s) for job ${jobId}`);
    res.json(delay);
  } catch (error) {
    console.error('Error creating delay:', error);
    res.status(500).json({ error: 'Failed to create delay' });
  }
});

// Create new production delay for a job (scenarioId = NULL)
app.post('/api/jobs/:jobId/delays', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { name, duration, insertAfter } = req.body;

    // Validate required fields
    if (!name || duration === undefined || insertAfter === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, duration, insertAfter'
      });
    }

    // Validate duration is positive
    if (duration <= 0) {
      return res.status(400).json({ error: 'Duration must be positive' });
    }

    // Validate insertAfter is non-negative
    if (insertAfter < 0) {
      return res.status(400).json({ error: 'insertAfter must be non-negative' });
    }

    const delay = await prisma.jobDelay.create({
      data: {
        scenarioId: null, // Production delay
        jobId,
        name: name.trim(),
        duration: parseInt(duration),
        insertAfter: parseInt(insertAfter)
      }
    });

    console.log(`⏰ Created production delay "${delay.name}" (${delay.duration}s) for job ${jobId}`);
    res.json(delay);
  } catch (error) {
    console.error('Error creating production delay:', error);
    res.status(500).json({ error: 'Failed to create production delay' });
  }
});

// Update an existing delay
app.put('/api/delays/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, duration, insertAfter } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (duration !== undefined) {
      if (duration <= 0) {
        return res.status(400).json({ error: 'Duration must be positive' });
      }
      updateData.duration = parseInt(duration);
    }
    if (insertAfter !== undefined) {
      if (insertAfter < 0) {
        return res.status(400).json({ error: 'insertAfter must be non-negative' });
      }
      updateData.insertAfter = parseInt(insertAfter);
    }

    const delay = await prisma.jobDelay.update({
      where: { id },
      data: updateData
    });

    console.log(`⏰ Updated delay ${id}`);
    res.json(delay);
  } catch (error) {
    console.error('Error updating delay:', error);
    res.status(500).json({ error: 'Failed to update delay' });
  }
});

// Delete a delay
app.delete('/api/delays/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const delay = await prisma.jobDelay.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!delay) {
      return res.status(404).json({ error: 'Delay not found' });
    }

    await prisma.jobDelay.delete({
      where: { id }
    });

    console.log(`⏰ Deleted delay: ${delay.name}`);
    res.json({ success: true, message: 'Delay deleted successfully' });
  } catch (error) {
    console.error('Error deleting delay:', error);
    res.status(500).json({ error: 'Failed to delete delay' });
  }
});

// Users API
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Companies API
app.get('/api/companies', async (req, res) => {
  try {
    const { search } = req.query;
    console.log('Companies API called with search:', search);

    // Test raw query first
    const rawTest = await prisma.$queryRaw`SELECT COUNT(*) FROM companies`;
    console.log('Raw query test:', rawTest);

    let where = {};
    if (search) {
      where.companyName = {
        contains: search,
        mode: 'insensitive'
      };
    }

    console.log('Query where:', JSON.stringify(where));

    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        companyName: true
      },
      orderBy: { companyName: 'asc' },
      take: 50 // Limit results for autocomplete
    });

    console.log('Found companies:', companies.length);
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch companies', details: error.message });
  }
});

// Route Steps Bulk Update API
app.post('/api/route-steps/bulk-update', async (req, res) => {
  try {
    const { jobId, routeSteps } = req.body;

    // Delete existing route steps for this job
    await prisma.routeStep.deleteMany({
      where: { kittingJobId: jobId }
    });

    // Create new route steps
    const createdSteps = await prisma.routeStep.createMany({
      data: routeSteps.map(step => ({
        ...step,
        kittingJobId: jobId
      }))
    });

    res.json({ created: createdSteps.count });
  } catch (error) {
    console.error('Error bulk updating route steps:', error);
    res.status(500).json({ error: 'Failed to update route steps' });
  }
});

// Analytics API
app.get('/api/analytics', async (req, res) => {
  try {
    const { jobId } = req.query;

    let where = {};
    if (jobId) where.jobId = jobId;

    const analytics = await prisma.jobAnalytics.findMany({
      where,
      include: {
        job: true
      }
    });

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.post('/api/analytics', async (req, res) => {
  try {
    const analyticsData = req.body;

    const analytics = await prisma.jobAnalytics.upsert({
      where: { jobId: analyticsData.jobId },
      update: analyticsData,
      create: analyticsData
    });

    res.json(analytics);
  } catch (error) {
    console.error('Error creating/updating analytics:', error);
    res.status(500).json({ error: 'Failed to update analytics' });
  }
});

// Kit Execution API
app.post('/api/kit-executions', async (req, res) => {
  try {
    const { jobProgressId, kitNumber, startTime, stationNumber, stationName } = req.body;

    const kitExecution = await prisma.kitExecution.create({
      data: {
        jobProgressId,
        kitNumber,
        startTime: new Date(startTime),
        completed: false,
        stationNumber: stationNumber || null,
        stationName: stationName || null
      }
    });

    res.json(kitExecution);
  } catch (error) {
    console.error('Error creating kit execution:', error);
    res.status(500).json({ error: 'Failed to create kit execution', details: error.message });
  }
});

app.patch('/api/kit-executions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { endTime, actualDuration, completed } = req.body;

    const kitExecution = await prisma.kitExecution.update({
      where: { id },
      data: {
        endTime: endTime ? new Date(endTime) : undefined,
        actualDuration,
        completed
      }
    });

    res.json(kitExecution);
  } catch (error) {
    console.error('Error updating kit execution:', error);
    res.status(500).json({ error: 'Failed to update kit execution', details: error.message });
  }
});

app.get('/api/kit-executions', async (req, res) => {
  try {
    const { jobProgressId } = req.query;

    let where = {};
    if (jobProgressId) where.jobProgressId = jobProgressId;

    const executions = await prisma.kitExecution.findMany({
      where,
      include: {
        stepExecutions: {
          include: {
            routeStep: true
          }
        }
      },
      orderBy: { kitNumber: 'asc' }
    });

    res.json(executions);
  } catch (error) {
    console.error('Error fetching kit executions:', error);
    res.status(500).json({ error: 'Failed to fetch kit executions' });
  }
});

// Step Execution API
app.post('/api/step-executions', async (req, res) => {
  try {
    const { kitExecutionId, routeStepId, startTime } = req.body;

    const stepExecution = await prisma.stepExecution.create({
      data: {
        kitExecutionId,
        routeStepId,
        startTime: new Date(startTime),
        completed: false
      }
    });

    res.json(stepExecution);
  } catch (error) {
    console.error('Error creating step execution:', error);
    res.status(500).json({ error: 'Failed to create step execution', details: error.message });
  }
});

app.patch('/api/step-executions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { endTime, actualDuration, completed } = req.body;

    const stepExecution = await prisma.stepExecution.update({
      where: { id },
      data: {
        endTime: endTime ? new Date(endTime) : undefined,
        actualDuration,
        completed
      }
    });

    res.json(stepExecution);
  } catch (error) {
    console.error('Error updating step execution:', error);
    res.status(500).json({ error: 'Failed to update step execution', details: error.message });
  }
});

// Serve React app for all other routes (only in production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 KitTrix Express server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});