/**
 * Remove Prefixes from Job Numbers
 *
 * Removes TEST-, SHIFT-TEST-, and KIT- prefixes from job numbers
 */

const { PrismaClient } = require('../node_modules/.prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Removing prefixes from job numbers...\n');

  try {
    // Find all jobs with prefixes
    const jobsWithPrefixes = await prisma.kittingJob.findMany({
      where: {
        OR: [
          { jobNumber: { contains: 'TEST-' } },
          { jobNumber: { contains: 'SHIFT-TEST-' } },
          { jobNumber: { startsWith: 'KIT-' } }
        ]
      },
      select: {
        id: true,
        jobNumber: true,
        customerName: true
      }
    });

    if (jobsWithPrefixes.length === 0) {
      console.log('✅ No jobs with prefixes found.');
      return;
    }

    console.log(`Found ${jobsWithPrefixes.length} jobs with prefixes:\n`);

    for (const job of jobsWithPrefixes) {
      // Remove all prefixes
      let newJobNumber = job.jobNumber
        .replace(/^SHIFT-TEST-/, '')
        .replace(/^TEST-/, '')
        .replace(/^KIT-/, '');

      console.log(`  ${job.jobNumber} → ${newJobNumber}`);

      // Update the job
      await prisma.kittingJob.update({
        where: { id: job.id },
        data: { jobNumber: newJobNumber }
      });
    }

    console.log(`\n✅ Updated ${jobsWithPrefixes.length} job numbers successfully!`);

  } catch (error) {
    console.error('❌ Error updating job numbers:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
