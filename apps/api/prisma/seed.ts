/**
 * Database seeding is disabled — agents are loaded from the BNB indexer on API startup.
 * Run POST /agents/studio/sync to refresh manually.
 */
async function main(): Promise<void> {
  console.log('Seed skipped: agents are loaded from the BNB indexer (BNB Agent Studio sync).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
