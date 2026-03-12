'use client';

import { useDeferredValue, useState } from 'react';
import { useRouter } from 'next/navigation';

function getPasswordScore(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

function getPasswordTone(score) {
  if (score >= 5) return { label: '매우 강함', className: 'strength-strong' };
  if (score >= 4) return { label: '강함', className: 'strength-good' };
  if (score >= 3) return { label: '보통', className: 'strength-fair' };
  return { label: '약함', className: 'strength-weak' };
}

export default function PasswordChangeForm({ email, storeStatus }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const deferredPassword = useDeferredValue(nextPassword);
  const strength = getPasswordTone(getPasswordScore(deferredPassword));

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
    setSuccess('비밀번호가 안전하게 저장되었습니다.');
    router.refresh();
  }

  return (
    <div className="settings-card">
      <div className="settings-head">
        <div>
          <p className="eyebrow">Admin Settings</p>
          <h3>비밀번호 변경</h3>
        </div>
        <span className={`store-pill ${storeStatus.durable ? 'store-pill-ready' : 'store-pill-warning'}`}>
          {storeStatus.label}
        </span>
      </div>
      <p>
        현재 로그인 계정은 <strong>{email}</strong> 입니다.
      </p>
      <p className="muted">{storeStatus.description}</p>
      <div className="kv-note">
        운영 기준: 8자 이상, 영문 대소문자, 숫자, 특수문자를 함께 사용하면 더 안전합니다.
      </div>
      <form onSubmit={handleSubmit} className="form-stack">
        <label>
          현재 비밀번호
          <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" required />
        </label>
        <label>
          새 비밀번호
          <input value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} type="password" minLength={8} required />
        </label>
        <div className="strength-row">
          <span className={`strength-indicator ${strength.className}`}></span>
          <span>{strength.label}</span>
        </div>
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
