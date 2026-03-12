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
      <div className="auth-grid">
        <div className="auth-hero">
          <div>
            <div className="hero-kicker">Knowledge Warehouse</div>
            <h1 className="hero-title hero-title-wide">정책·연구 보고서 인텔리전스</h1>
            <p className="hero-copy" style={{ marginTop: '16px', maxWidth: '42ch' }}>
              GitHub Actions가 매일 수집한 최신 보고서를 실무형 브리프로 재구성합니다.
              핵심만 빠르게 파악하고 후속 액션을 정리하세요.
            </p>
          </div>

          <div className="auth-stats">
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

          <div className="auth-notes">
            <article className="note-card note-card-strong">
              <p className="eyebrow">Cloud Digest</p>
              <h3>항상 최신</h3>
              <p>로그인 즉시 오늘의 보고서를 볼 수 있습니다.</p>
            </article>
            <article className="note-card">
              <p className="eyebrow">Decision Support</p>
              <h3>검토 시간 단축</h3>
              <p>PDF 스니펫과 요약을 한 화면에서 확인합니다.</p>
            </article>
          </div>
        </div>

        <div className="auth-form">
          <div className="auth-form-inner">
            <div>
              <p className="eyebrow">Admin Access</p>
              <h2 className="section-title" style={{ marginTop: '8px' }}>관리자 로그인</h2>
              <p className="muted" style={{ marginTop: '10px' }}>
                초기 계정으로 접속 후 비밀번호를 변경할 수 있습니다.
              </p>
            </div>
            <LoginForm />
            <article className="info-card">
              <p className="eyebrow">Security</p>
              <h3>세션 기반 인증</h3>
              <p>세션 쿠키로 인증되며 영구 저장소 연결 시 비밀번호가 안정적으로 유지됩니다.</p>
            </article>
          </div>
        </div>
      </div>
    </main>
  );
}
