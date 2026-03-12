import fs from 'node:fs/promises';
import path from 'node:path';
import { get as getBlob, put as putBlob } from '@vercel/blob';
import { kv } from '@vercel/kv';
import { hashPassword } from './auth';

const ADMIN_KEY = 'knowledge-warehouse-admin';
const ADMIN_BLOB_PATH = 'admin/admin-user.json';

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

function hasBlobConfig() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readBlobRecord() {
  try {
    const result = await getBlob(ADMIN_BLOB_PATH, { access: 'private' });
    if (!result?.stream) {
      return null;
    }
    const payload = await new Response(result.stream).text();
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function writeBlobRecord(record) {
  await putBlob(ADMIN_BLOB_PATH, JSON.stringify(record, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    contentType: 'application/json; charset=utf-8',
  });
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

export function getAdminStoreStatus() {
  if (hasKvConfig()) {
    return {
      kind: 'kv',
      label: 'Vercel KV',
      durable: true,
      description: '비밀번호 변경 사항이 Vercel KV에 영구 저장됩니다.',
    };
  }

  if (hasBlobConfig()) {
    return {
      kind: 'blob',
      label: 'Vercel Blob',
      durable: true,
      description: '비밀번호 변경 사항이 private Blob 저장소에 영구 저장됩니다.',
    };
  }

  if (process.env.VERCEL) {
    return {
      kind: 'vercel-ephemeral',
      label: 'Vercel 임시 저장',
      durable: false,
      description: '현재 배포에는 영구 저장소가 연결되지 않아 비밀번호 변경을 보존할 수 없습니다.',
    };
  }

  return {
    kind: 'file',
    label: '로컬 파일 저장',
    durable: true,
    description: '개발 환경에서는 로컬 파일에 비밀번호 변경이 저장됩니다.',
  };
}

export async function getAdminRecord() {
  if (hasKvConfig()) {
    const record = await kv.get(ADMIN_KEY);
    if (record) {
      return record;
    }
  } else if (hasBlobConfig()) {
    const blobRecord = await readBlobRecord();
    if (blobRecord) {
      return blobRecord;
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

  if (hasBlobConfig()) {
    await writeBlobRecord(payload);
    return payload;
  }

  await writeFileRecord(payload);
  return payload;
}

export function isPersistentStoreConfigured() {
  return getAdminStoreStatus().durable;
}
