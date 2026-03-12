import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminRecord, isPersistentStoreConfigured, saveAdminRecord } from '../../../../lib/admin-store';
import { createSessionToken, getSessionCookieOptions, hashPassword, SESSION_COOKIE, verifyPassword, verifySessionToken } from '../../../../lib/auth';

export async function POST(request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { currentPassword, nextPassword } = await request.json();
  if (process.env.VERCEL && !isPersistentStoreConfigured()) {
    return NextResponse.json({ error: 'Vercel KV? ???? ???? ??? ?? ??? ? ????.' }, { status: 400 });
  }
  if (!nextPassword || nextPassword.length < 8) {
    return NextResponse.json({ error: '새 비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
  }

  const admin = await getAdminRecord();
  if (!verifyPassword(currentPassword, admin.passwordHash)) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 });
  }

  const updated = await saveAdminRecord({
    email: admin.email,
    passwordHash: hashPassword(nextPassword),
  });

  const refreshedToken = createSessionToken({ email: updated.email, role: 'admin' });
  (await cookies()).set(SESSION_COOKIE, refreshedToken, getSessionCookieOptions());

  return NextResponse.json({ ok: true });
}
