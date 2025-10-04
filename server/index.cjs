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
        jobProgress: true,
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

    res.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
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