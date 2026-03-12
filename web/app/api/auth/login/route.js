import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminRecord } from '../../../../lib/admin-store';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE, verifyPassword } from '../../../../lib/auth';

export async function POST(request) {
  const { email, password } = await request.json();
  const admin = await getAdminRecord();

  if (email !== admin.email || !verifyPassword(password, admin.passwordHash)) {
    return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const token = createSessionToken({ email: admin.email, role: 'admin' });
  (await cookies()).set(SESSION_COOKIE, token, getSessionCookieOptions());
  return NextResponse.json({ ok: true });
}
