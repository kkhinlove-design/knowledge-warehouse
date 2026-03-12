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
          <p className="eyebrow">Knowledge Warehouse</p>
          <h1 className="hero-title">Policy Intelligence for Daily Work.</h1>
          <p className="hero-copy">
            정책브리핑, G-Zone, KRIVET 등 주요 사이트의 최신 보고서를 한곳에 모아 카드뉴스형으로 확인할 수 있는
            관리자 전용 대시보드입니다.
          </p>
          <div className="auth-notes">
            <article className="note-card">
              <h3>클라우드 수집</h3>
              <p className="muted">GitHub Actions가 최신 보고서를 수집하고, Vercel에서는 최신 결과를 바로 화면에 반영합니다.</p>
            </article>
            <article className="note-card">
              <h3>실무형 브리프</h3>
              <p className="muted">PDF 기반 스니펫, 핵심 시사점, 후속 액션 포인트를 빠르게 검토할 수 있게 정리합니다.</p>
            </article>
          </div>
        </div>
        <div className="panel auth-form">
          <p className="eyebrow">Admin Access</p>
          <h2 style={{ marginTop: 0, fontSize: '38px' }}>로그인</h2>
          <p className="muted">관리자 계정으로 접속한 뒤 비밀번호를 직접 변경할 수 있습니다.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
