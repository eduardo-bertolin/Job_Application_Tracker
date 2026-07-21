import { execSync } from 'child_process';

async function globalSetup() {
  console.log('--- Setting up E2E Test Database ---');
  
  // Set the TEST database URL
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/job_tracker_test?schema=public';
  
  try {
    // Run migrations on the test database
    console.log('Running prisma db push on test db...');
    execSync('npx prisma db push --accept-data-loss', {
      cwd: '../server',
      env: { ...process.env },
      stdio: 'inherit'
    });
    console.log('Test database is ready!');
  } catch (error) {
    console.error('Failed to setup test database. Ensure PostgreSQL is running on port 5432.');
    // Don't throw if we are in an environment without the DB yet, like some CI phases,
    // though Playwright will fail later anyway if the DB is truly down.
  }
}

export default globalSetup;
