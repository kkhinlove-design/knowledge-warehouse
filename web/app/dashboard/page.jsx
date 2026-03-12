import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LogoutButton from '../../components/logout-button';
import PasswordChangeForm from '../../components/password-change-form';
import { getDashboardData } from '../../lib/dashboard-data';
import { getAdminRecord, isPersistentStoreConfigured } from '../../lib/admin-store';
import { SESSION_COOKIE, verifySessionToken } from '../../lib/auth';

export default async function DashboardPage() {
  const sessionToken = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(sessionToken);

  if (!session) {
    redirect('/login');
  }

  const { items, summary } = await getDashboardData();
  const admin = await getAdminRecord();
  const topItems = items.slice(0, 8);
  const sourceLines = Array.isArray(summary.sources) ? summary.sources : [];

  return (
    <main className="page-shell dashboard-shell">
      <section className="panel dashboard-hero">
        <div className="hero-kicker">Daily Research Briefing</div>
        <div>
          <p className="eyebrow">Knowledge Warehouse</p>
          <h1 className="hero-title" style={{ maxWidth: '10ch' }}>Research Signals, Ready for Action.</h1>
        </div>
        <p className="hero-copy">
          클라우드에서 수집된 최신 정책·연구 보고서를 로그인 후 바로 확인할 수 있는 관리자 대시보드입니다.
          최신 브리프, PDF 기반 요약, 소스별 상태를 함께 보고 필요한 문서를 바로 열 수 있습니다.
        </p>
        <div className="dashboard-topline">
          <span className="pill">총 {summary.item_count ?? items.length}건</span>
          <span className="pill">PDF 기반 {summary.pdf_backed_count ?? 0}건</span>
          <span className="pill">생성 시각 {summary.generated_at ? new Date(summary.generated_at).toLocaleString('ko-KR') : '확인 필요'}</span>
        </div>
        <div className="digest-links">
          <a className="primary-btn" href="/generated/latest-policy-cards.html" target="_blank" rel="noreferrer">카드뉴스 열기</a>
          <a className="secondary-btn" href="/generated/latest-policy-brief.md" target="_blank" rel="noreferrer">Markdown 브리프</a>
          <a className="ghost-btn" href="/generated/latest-report-items.json" target="_blank" rel="noreferrer">원본 JSON</a>
          <LogoutButton />
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-main">
          <div className="stats-grid">
            <article className="stat-card">
              <p className="eyebrow">Run Summary</p>
              <h3>소스 상태</h3>
              <div className="status-grid">
                {sourceLines.length ? sourceLines.map((source) => (
                  <div className="status-chip" key={source.source_id}>
                    <strong>{source.source_name}</strong><br />
                    {source.status} · {source.item_count}건<br />
                    {source.note}
                  </div>
                )) : <div className="status-chip">아직 요약 메타가 없습니다.</div>}
              </div>
            </article>

            <article className="stat-card">
              <p className="eyebrow">Admin</p>
              <h3>접속 계정</h3>
              <p>{session.email}</p>
              <p className="muted">초기 관리자 이메일은 {admin.email}이며, 비밀번호는 오른쪽 설정 카드에서 변경할 수 있습니다.</p>
              <div className="kv-note">
                로그인 후 최신 보고서 링크, 카드 HTML, 원본 JSON까지 한 번에 이동할 수 있도록 설계했습니다.
              </div>
            </article>
          </div>

          <div className="report-grid">
            {topItems.map((item) => (
              <article className="report-card" key={`${item.source_id}-${item.title}`}>
                <div className="report-meta">
                  <span>{item.source_name}</span>
                  <span>{item.topic}</span>
                  <span>{item.extraction_mode}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.snippet || item.why_it_matters}</p>
                <div className="inline-actions">
                  <a className="secondary-btn" href={item.url} target="_blank" rel="noreferrer">상세 보기</a>
                  {item.pdf_url ? (
                    <a className="primary-btn" href={item.pdf_url} target="_blank" rel="noreferrer">PDF 열기</a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="dashboard-side">
          <PasswordChangeForm email={session.email} persistentStoreConfigured={isPersistentStoreConfigured()} />
        </aside>
      </section>
    </main>
  );
}
