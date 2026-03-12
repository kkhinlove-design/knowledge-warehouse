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
          <div className="hero-kicker">Curated by K-Warehouse</div>
          <div>
            <p className="eyebrow">Knowledge Warehouse</p>
            <h1 className="hero-title hero-title-wide">Policy Signals with Editorial Clarity.</h1>
          </div>
          <p className="hero-copy">
            정책브리핑, G-Zone, KRIVET 등 핵심 소스의 최신 보고서를 실무형 브리프와 카드형 화면으로 재구성해,
            관리자 한 명이 빠르게 판단하고 후속 액션을 정리할 수 있게 만든 리서치 운영용 반응형 웹입니다.
          </p>

          <div className="auth-stats">
            <article className="metric-card accent-card">
              <p className="metric-value">5</p>
              <p className="metric-label">핵심 추적 소스</p>
            </article>
            <article className="metric-card">
              <p className="metric-value">10+</p>
              <p className="metric-label">PDF 기반 요약</p>
            </article>
            <article className="metric-card muted-card">
              <p className="metric-value">3</p>
              <p className="metric-label">카드형 브리프 흐름</p>
            </article>
          </div>

          <div className="editorial-strip">
            <div>
              <span>Digest</span>
              <strong>보고서 수집과 요약 자동화</strong>
            </div>
            <div>
              <span>Review</span>
              <strong>핵심 포인트를 먼저 읽는 관리자 흐름</strong>
            </div>
            <div>
              <span>Sync</span>
              <strong>Obsidian과 웹 뷰의 역할 분리</strong>
            </div>
          </div>

          <div className="auth-notes">
            <article className="note-card note-card-strong">
              <p className="eyebrow">Cloud Digest</p>
              <h3>항상 최신 브리프</h3>
              <p>GitHub Actions가 수집을 담당하고, 웹은 최신 결과를 반영해 로그인 즉시 핵심 보고서를 볼 수 있습니다.</p>
            </article>
            <article className="note-card">
              <p className="eyebrow">Decision Support</p>
              <h3>보고서 읽기의 부담 축소</h3>
              <p>PDF 원문 스니펫, 요약, 후속 액션의 흐름을 한 화면에 묶어 검토 시간을 줄였습니다.</p>
            </article>
          </div>
        </div>

        <div className="panel auth-form">
          <div className="auth-form-inner">
            <div>
              <p className="eyebrow">Admin Access</p>
              <h2 className="section-title">관리자 로그인</h2>
              <p className="muted">초기 관리자 계정으로 접속한 뒤 비밀번호를 직접 변경할 수 있습니다.</p>
            </div>
            <LoginForm />
            <article className="info-card">
              <p className="eyebrow">Secure Entry</p>
              <h3>운영 메모</h3>
              <p>세션 쿠키 기반으로 인증되며, 영구 저장소가 연결되면 운영 비밀번호도 배포 환경에서 안정적으로 유지됩니다.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
