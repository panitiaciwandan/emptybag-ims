#!/usr/bin/env node
// EmptyBag-IMS database tooling: migrate / seed / test / reset / setup
// Works against a local PostgreSQL or any Supabase database URL.
// Requires DATABASE_URL env var (see .env.example).
//
// Usage:
//   node scripts/db.js setup   - create DB (if missing), mock auth, migrate, seed
//   node scripts/db.js migrate - apply pending migrations
//   node scripts/db.js seed    - apply seed data
//   node scripts/db.js test    - run SQL tests
//   node scripts/db.js reset   - drop & recreate DB (DANGEROUS)

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const SEED_DIR = path.join(ROOT, 'supabase', 'seed');
const TESTS_DIR = path.join(ROOT, 'supabase', 'tests');
const MOCK_AUTH = path.join(ROOT, 'scripts', 'mock_auth.sql');
const STATE_FILE = path.join(ROOT, '.db-state.json');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Create a .env file from .env.example and set DATABASE_URL.');
  process.exit(1);
}

function parseUrl(url) {
  const m = url.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!m) throw new Error('DATABASE_URL must be postgres://user:pass@host:port/dbname');
  return { user: m[1], pass: m[2], host: m[3], port: m[4], db: m[5] };
}

function psqlArgs(extraDb, opts = {}) {
  const { user, pass, host, port, db } = parseUrl(DATABASE_URL);
  const args = [
    '-v', 'ON_ERROR_STOP=1',
    '-X', '--no-password',
    '-h', host, '-p', port, '-U', user,
    '-d', extraDb || db,
  ];
  if (pass) process.env.PGPASSWORD = pass;
  return args;
}

function psql(fileOrSql, db, opts = {}) {
  const args = psqlArgs(db, opts);
  if (opts.noFile) {
    args.push('-c', fileOrSql);
  } else {
    args.push('-f', fileOrSql);
  }
  const result = execFileSync('psql', args, {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });
  return result;
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { applied: [] };
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function appliedMigrations() {
  // If the _migrations table doesn't exist yet, returns []
  try {
    const out = psql(
      "select filename from public._migrations order by filename",
      null,
      { noFile: true }
    );
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function ensureMigrationsTable() {
  psql(
    "create table if not exists public._migrations (filename text primary key, applied_at timestamptz default now())",
    null,
    { noFile: true }
  );
}

async function migrate() {
  console.log('-- Running migrations --');
  ensureMigrationsTable();
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied = appliedMigrations();

  for (const file of files) {
    if (applied.includes(file)) {
      console.log(`  [skip] ${file}`);
      continue;
    }
    console.log(`  [apply] ${file}`);
    psql(path.join(MIGRATIONS_DIR, file));
    psql(
      `insert into public._migrations (filename) values ('${file.replace(/'/g, "''")}')`,
      null,
      { noFile: true }
    );
  }
  console.log('Migrations complete.');
}

function seed() {
  console.log('-- Seeding --');
  const files = fs
    .readdirSync(SEED_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    console.log(`  [apply] ${file}`);
    psql(path.join(SEED_DIR, file));
  }
  console.log('Seed complete.');
}

function reset() {
  console.log('-- Reset (DROP database) --');
  const { db } = parseUrl(DATABASE_URL);
  // Connect to maintenance db 'postgres' to drop the target db
  psql(`drop database if exists "${db}"`, 'postgres', { noFile: true });
  psql(`create database "${db}"`, 'postgres', { noFile: true });
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  console.log('Reset complete.');
}

function setup() {
  const { db } = parseUrl(DATABASE_URL);
  console.log(`-- Setup database ${db} --`);
  try {
    // Create DB if missing (connect to postgres db)
    psql(`create database "${db}"`, 'postgres', { noFile: true });
  } catch (e) {
    // DB may already exist
  }
  // Mock auth for local testing (idempotent)
  if (fs.existsSync(MOCK_AUTH)) {
    console.log('  [apply] mock_auth.sql');
    try {
      psql(MOCK_AUTH);
    } catch (e) {
      console.log('  mock_auth skipped (may already exist in Supabase):', e.message.split('\n')[0]);
    }
  }
  migrate();
  seed();
  console.log('Setup complete.');
}

function test() {
  console.log('-- Running tests --');
  // pgTAP needed for assertion functions
  try {
    psql('create extension if not exists pgtap', null, { noFile: true });
  } catch (e) {
    console.error('ERROR: pgTAP extension is required for tests.');
    console.error('Install: apt-get install -y postgresql-15-pgtap');
    process.exit(1);
  }
  const files = fs
    .readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  let failed = 0;
  for (const file of files) {
    console.log(`  [test] ${file}`);
    try {
      psql(path.join(TESTS_DIR, file));
      console.log('    PASS');
    } catch (e) {
      failed++;
      console.error('    FAIL:', e.message.split('\n').slice(0, 5).join('\n    '));
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} test file(s) failed.`);
    process.exit(1);
  }
  console.log('All tests passed.');
}

const cmd = process.argv[2];
const commands = { migrate, seed, test, reset, setup };
if (!commands[cmd]) {
  console.error('Usage: node scripts/db.js <migrate|seed|test|reset|setup>');
  process.exit(1);
}
commands[cmd]();
