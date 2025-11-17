/**
 * Delete Test Jobs
 *
 * Removes all jobs with TEST or SHIFT-TEST in their job numbers
 */

const { PrismaClient } = require('../node_modules/.prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting test jobs...\n');

  try {
    // Find all jobs with prefixes
    const testJobs = await prisma.kittingJob.findMany({
      where: {
        OR: [
          { jobNumber: { startsWith: 'TEST-' } },
          { jobNumber: { startsWith: 'SHIFT-TEST-' } },
          { jobNumber: { startsWith: 'KIT-' } }
        ]
      },
      select: {
        id: true,
        jobNumber: true,
        customerName: true
      }
    });

    if (testJobs.length === 0) {
      console.log('✅ No test jobs found to delete.');
      return;
    }

    console.log(`Found ${testJobs.length} test jobs:`);
    testJobs.forEach(job => {
      console.log(`  - ${job.jobNumber} (${job.customerName})`);
    });
    console.log('');

    // Delete all test jobs
    const result = await prisma.kittingJob.deleteMany({
      where: {
        OR: [
          { jobNumber: { startsWith: 'TEST-' } },
          { jobNumber: { startsWith: 'SHIFT-TEST-' } },
          { jobNumber: { startsWith: 'KIT-' } }
        ]
      }
    });

    console.log(`✅ Deleted ${result.count} test jobs successfully!`);

  } catch (error) {
    console.error('❌ Error deleting test jobs:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
