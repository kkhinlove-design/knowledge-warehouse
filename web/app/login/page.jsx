import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from '../../components/login-form';
import { SESSION_COOKIE, verifySessionToken } from '../../lib/auth';

export default async function LoginPage() {
  const sessionToken = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(sessionToken);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="page-shell">
      <section className="auth-grid">
        <div className="panel auth-hero">
          <div className="hero-kicker">Knowledge Warehouse</div>
          <h1 className="hero-title hero-title-wide">정책·연구 보고서 관리 대시보드</h1>
          <p className="hero-copy" style={{ marginTop: '14px' }}>
            GitHub Actions가 수집한 최신 정책·연구 보고서를 실무형 브리프와 카드형 화면으로 재구성합니다.
            관리자 한 명이 빠르게 핵심을 파악하고 후속 액션을 정리할 수 있도록 설계된 시스템입니다.
          </p>

          <div className="auth-stats" style={{ marginTop: '28px' }}>
            <article className="metric-card accent-card">
              <p className="metric-value">5</p>
              <p className="metric-label">추적 소스</p>
            </article>
            <article className="metric-card">
              <p className="metric-value">10+</p>
              <p className="metric-label">PDF 기반 요약</p>
            </article>
            <article className="metric-card muted-card">
              <p className="metric-value">매일</p>
              <p className="metric-label">자동 수집</p>
            </article>
          </div>

          <div className="auth-notes" style={{ marginTop: '20px' }}>
            <article className="note-card note-card-strong">
              <p className="eyebrow">Cloud Digest</p>
              <h3>항상 최신 브리프</h3>
              <p>GitHub Actions가 수집을 담당해 로그인 즉시 최신 보고서를 볼 수 있습니다.</p>
            </article>
            <article className="note-card">
              <p className="eyebrow">Decision Support</p>
              <h3>검토 시간 단축</h3>
              <p>PDF 스니펫, 요약, 후속 액션을 한 화면에서 확인할 수 있습니다.</p>
            </article>
          </div>
        </div>

        <div className="panel auth-form">
          <div className="auth-form-inner">
            <div>
              <p className="eyebrow">Admin Access</p>
              <h2 className="section-title">관리자 로그인</h2>
              <p className="muted" style={{ marginTop: '8px', fontSize: '0.88rem' }}>
                초기 관리자 계정으로 접속한 뒤 비밀번호를 직접 변경할 수 있습니다.
              </p>
            </div>
            <LoginForm />
            <article className="info-card">
              <p className="eyebrow">Secure Entry</p>
              <h3>운영 메모</h3>
              <p>세션 쿠키 기반으로 인증되며, 영구 저장소가 연결되면 비밀번호가 배포 환경에서도 안정적으로 유지됩니다.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
