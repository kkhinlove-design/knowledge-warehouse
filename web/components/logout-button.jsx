'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    startTransition(() => {
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <button className="secondary-btn" type="button" onClick={handleLogout} disabled={pending}>
      {pending ? '로그아웃 중...' : '로그아웃'}
    </button>
  );
}
