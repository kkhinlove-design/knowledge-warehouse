import fs from 'node:fs/promises';
import path from 'node:path';
import { kv } from '@vercel/kv';
import { hashPassword } from './auth';

const ADMIN_KEY = 'knowledge-warehouse-admin';

function getFileStorePath() {
  return path.join(process.cwd(), '.auth', 'admin-user.json');
}

function getInitialAdmin() {
  const email = process.env.ADMIN_EMAIL || 'jason-ko@jiuc.or.kr';
  const password = process.env.ADMIN_INITIAL_PASSWORD || 'jiuc2026!';
  return { email, password };
}

function hasKvConfig() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function readFileRecord() {
  try {
    const payload = await fs.readFile(getFileStorePath(), 'utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function writeFileRecord(record) {
  await fs.mkdir(path.dirname(getFileStorePath()), { recursive: true });
  await fs.writeFile(getFileStorePath(), JSON.stringify(record, null, 2), 'utf8');
}

export async function getAdminRecord() {
  if (hasKvConfig()) {
    const record = await kv.get(ADMIN_KEY);
    if (record) {
      return record;
    }
  } else {
    const fileRecord = await readFileRecord();
    if (fileRecord) {
      return fileRecord;
    }
  }

  const initial = getInitialAdmin();
  return {
    email: initial.email,
    passwordHash: hashPassword(initial.password),
    source: 'bootstrap',
  };
}

export async function saveAdminRecord(record) {
  const payload = {
    ...record,
    updatedAt: new Date().toISOString(),
  };

  if (hasKvConfig()) {
    await kv.set(ADMIN_KEY, payload);
    return payload;
  }

  await writeFileRecord(payload);
  return payload;
}

export function isPersistentStoreConfigured() {
  return hasKvConfig();
}
