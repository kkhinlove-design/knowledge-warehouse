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
    <div className="login-page">
      <div className="login-wrap">
        <div className="login-brand-panel">
          <div>
            <div className="login-brand-icon">📋</div>
            <h1>Knowledge Warehouse</h1>
            <p>정책·연구 보고서를 매일 자동 수집해<br />실무형 브리프로 재구성합니다.</p>
          </div>

          <div className="login-brand-stats">
            <div className="login-brand-stat">
              <span className="login-stat-num">5</span>
              <div>
                <strong>추적 소스</strong>
                <span>정책브리핑·G-Zone·KRIVET 등</span>
              </div>
            </div>
            <div className="login-brand-stat">
              <span className="login-stat-num">매일</span>
              <div>
                <strong>자동 수집</strong>
                <span>GitHub Actions 08:00 KST 실행</span>
              </div>
            </div>
            <div className="login-brand-stat">
              <span className="login-stat-num">PDF</span>
              <div>
                <strong>원문 기반 요약</strong>
                <span>PDF 스니펫 + 카드뉴스 생성</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <span className="eyebrow">Admin Access</span>
          <h2>관리자 로그인</h2>
          <p>초기 계정으로 접속 후 비밀번호를 변경할 수 있습니다.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
