const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTestJobs() {
  try {
    console.log('🗑️  Deleting all existing kitting jobs...');

    // Delete all kit executions first (foreign key constraint)
    await prisma.kitExecution.deleteMany({});
    console.log('✅ Deleted all kit executions');

    // Delete all job progress records
    await prisma.jobProgress.deleteMany({});
    console.log('✅ Deleted all job progress records');

    // Delete all job analytics
    await prisma.jobAnalytics.deleteMany({});
    console.log('✅ Deleted all job analytics');

    // Delete all kitting jobs
    await prisma.kittingJob.deleteMany({});
    console.log('✅ Deleted all kitting jobs');

    console.log('\n📊 Fetching customers from companies table...');
    // Fetch real customers from the companies table
    const companies = await prisma.company.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        companyName: true
      }
    });

    if (companies.length === 0) {
      throw new Error('No active companies found in database!');
    }

    console.log(`✅ Found ${companies.length} active companies\n`);

    console.log('🏭 Creating 20 new test jobs...');

    const jobs = [];
    const today = new Date();

    for (let i = 1; i <= 20; i++) {
      // Pick a random company
      const company = companies[Math.floor(Math.random() * companies.length)];

      // Generate a random scheduled date within the next 30 days
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + Math.floor(Math.random() * 30));
      const scheduledDateISO = scheduledDate.toISOString();

      // Generate random quantity between 5 and 50
      const quantity = Math.floor(Math.random() * 46) + 5;

      // Use raw SQL to avoid null byte issues
      const jobId = `cuid_${Date.now()}_${i}`;
      const jobNumber = `TEST-${String(i).padStart(3, '0')}`;
      const spec = `Spec-${Math.floor(Math.random() * 1000)}`;
      const desc = `Assembly Kit ${i}`;
      const expectedJobDuration = quantity * 10 + 15;

      await prisma.$executeRaw`
        INSERT INTO kitting_jobs (
          id, "jobNumber", "customerName", "customerSpec", description, "companyId",
          "orderedQuantity", "runLength", "scheduledDate", "dueDate", status,
          setup, "makeReady", "takeDown", "expectedKitDuration", "expectedJobDuration",
          "createdAt", "updatedAt"
        ) VALUES (
          ${jobId}, ${jobNumber}, ${company.companyName}, ${spec}, ${desc}, ${company.id},
          ${quantity}, ${quantity}, ${scheduledDateISO}::timestamp, ${scheduledDateISO}::timestamp, 'SCHEDULED',
          5, 5, 5, 10, ${expectedJobDuration},
          NOW(), NOW()
        )
      `;

      // Create route steps
      const step1Id = `step1_${jobId}`;
      const step2Id = `step2_${jobId}`;

      await prisma.$executeRaw`
        INSERT INTO route_steps (
          id, name, "expectedSeconds", "order", "instructionType",
          "instructionText", "autoLoop", "kittingJobId"
        ) VALUES
        (${step1Id}, 'Step 1', 5, 1, 'TEXT', 'Complete the first assembly step', false, ${jobId}),
        (${step2Id}, 'Step 2', 5, 2, 'TEXT', 'Complete the final assembly step', false, ${jobId})
      `;

      jobs.push({ jobNumber, customerName: company.companyName, quantity });
      console.log(`✅ Created job ${i}/20: ${jobNumber} - ${company.companyName} (${quantity} kits)`);
    }

    console.log('\n🎉 Successfully created 20 test jobs!');
    console.log('\n📋 Summary:');
    console.log(`   - Jobs created: ${jobs.length}`);
    console.log(`   - Route steps per job: 2 (5 seconds each)`);
    console.log(`   - Setup/MakeReady/TakeDown: 5 seconds each`);
    console.log(`   - Kit duration: 10 seconds`);
    console.log(`   - Scheduled dates: Random within next 30 days`);
    console.log(`   - Quantities: Random between 5-50 kits`);

  } catch (error) {
    console.error('❌ Error seeding test jobs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedTestJobs()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
