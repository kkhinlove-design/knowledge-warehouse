'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PasswordChangeForm({ email, persistentStoreConfigured }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (nextPassword !== confirmPassword) {
      setError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, nextPassword }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error || '비밀번호 변경에 실패했습니다.');
      return;
    }

    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
    setSuccess('비밀번호가 변경되었습니다.');
    router.refresh();
  }

  return (
    <div className="settings-card">
      <p className="eyebrow">Admin Settings</p>
      <h3>비밀번호 변경</h3>
      <p>
        현재 로그인 계정은 <strong>{email}</strong> 입니다.
      </p>
      <p className="muted">
        {persistentStoreConfigured
          ? '변경한 비밀번호는 저장소에 영구 반영됩니다.'
          : '현재는 개발용 파일 저장소를 사용 중입니다. Vercel 배포에서는 KV를 연결하면 영구 저장됩니다.'}
      </p>
      <form onSubmit={handleSubmit} className="form-stack">
        <label>
          현재 비밀번호
          <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" required />
        </label>
        <label>
          새 비밀번호
          <input value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} type="password" minLength={8} required />
        </label>
        <label>
          새 비밀번호 확인
          <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" minLength={8} required />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? '변경 중...' : '비밀번호 저장'}
        </button>
      </form>
    </div>
  );
}
