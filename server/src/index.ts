import 'dotenv/config';
import { createDbFromEnv } from './db/client.ts';
import { migrate } from './db/migrate.ts';
import { seedAll } from './db/seed.ts';
import { createApp } from './app.ts';

const db = await createDbFromEnv();
const applied = await migrate(db);
if (applied.length) console.log(`Applied migrations: ${applied.join(', ')}`);
if (process.argv.includes('--seed') || applied.includes('001_core.sql')) {
  await seedAll(db, { userPassword: process.env.SEED_USER_PASSWORD });
  console.log(process.env.SEED_USER_PASSWORD ? 'Seeded prototype data (users can sign in with SEED_USER_PASSWORD).' : 'Seeded prototype data (no SEED_USER_PASSWORD set: users cannot sign in yet).');
}
if (process.argv.includes('--migrate-only')) {
  await db.close();
  process.exit(0);
}
const port = Number(process.env.API_PORT ?? 4000);
createApp(db, { uploadDir: process.env.UPLOAD_DIR ?? 'server/.data/uploads' }).listen(port, () => console.log(`API on http://localhost:${port} (db: ${db.kind})`));
