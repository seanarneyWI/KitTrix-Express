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
    const updateData = req.body;

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
    const { scheduledDate, scheduledStartTime } = req.body;

    console.log(`📅 Updating job ${id} schedule:`, { scheduledDate, scheduledStartTime });

    // Validate inputs
    if (!id) {
      return res.status(400).json({ error: 'Job ID is required' });
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