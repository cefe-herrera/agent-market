/**
 * Database seeding is disabled — agents are synced from 8004scan on API startup.
 * Run POST /agents/studio/sync to refresh manually.
 */
async function main(): Promise<void> {
  console.log('Seed skipped: agents are loaded from 8004scan (BNB Agent Studio sync).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
