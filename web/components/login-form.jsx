'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('jason-ko@jiuc.or.kr');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error || '로그인에 실패했습니다.');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="form-stack auth-form-stack">
      <label>
        관리자 이메일
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="jason-ko@jiuc.or.kr"
          required
        />
      </label>
      <label>
        비밀번호
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="관리자 비밀번호를 입력하세요"
          required
        />
      </label>
      <div className="login-hint-grid">
        <div className="mini-note">
          <strong>관리자 전용</strong>
          <span>세션 쿠키 기반 인증</span>
        </div>
        <div className="mini-note">
          <strong>브리프 즉시 접근</strong>
          <span>로그인 후 카드뉴스와 원문 링크 확인</span>
        </div>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="primary-btn" type="submit" disabled={loading}>
        {loading ? '접속 중...' : '대시보드 열기'}
      </button>
    </form>
  );
}
