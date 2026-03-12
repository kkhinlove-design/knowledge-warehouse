import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LogoutButton from '../../components/logout-button';
import PasswordChangeForm from '../../components/password-change-form';
import { getDashboardData } from '../../lib/dashboard-data';
import { getAdminRecord, getAdminStoreStatus } from '../../lib/admin-store';
import { SESSION_COOKIE, verifySessionToken } from '../../lib/auth';

function groupBySource(items) {
  return items.reduce((accumulator, item) => {
    const key = item.source_name || '기타';
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

export default async function DashboardPage() {
  const sessionToken = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(sessionToken);

  if (!session) {
    redirect('/login');
  }

  const { items, summary } = await getDashboardData();
  const admin = await getAdminRecord();
  const storeStatus = getAdminStoreStatus();
  const topItems = items.slice(0, 8);
  const leadItem = items[0];
  const sourceLines = Array.isArray(summary.sources) ? summary.sources : [];
  const sourceGroups = Object.entries(groupBySource(items)).slice(0, 3);

  return (
    <main className="page-shell dashboard-shell">
      <section className="panel dashboard-hero">
        <div className="hero-kicker">Daily Research Briefing</div>
        <div className="hero-layout">
          <div>
            <p className="eyebrow">Knowledge Warehouse</p>
            <h1 className="hero-title hero-title-wide">Research Signals, Ready for Action.</h1>
            <p className="hero-copy">
              클라우드에서 수집된 최신 정책·연구 보고서를 실무형 브리프로 재구성해,
              의사결정에 필요한 핵심만 빠르게 읽을 수 있게 만든 관리자 전용 반응형 대시보드입니다.
            </p>
          </div>
          <div className="hero-aside-card">
            <p className="eyebrow">Today&apos;s Run</p>
            <h3>운영 상태 요약</h3>
            <div className="hero-stat-list">
              <div>
                <strong>{summary.item_count ?? items.length}건</strong>
                <span>총 수집 항목</span>
              </div>
              <div>
                <strong>{summary.pdf_backed_count ?? 0}건</strong>
                <span>PDF 기반 요약</span>
              </div>
              <div>
                <strong>{storeStatus.label}</strong>
                <span>비밀번호 저장 방식</span>
              </div>
            </div>
          </div>
        </div>
        <div className="dashboard-topline">
          <span className="pill">생성 시각 {summary.generated_at ? new Date(summary.generated_at).toLocaleString('ko-KR') : '확인 필요'}</span>
          <span className="pill">관리자 {session.email}</span>
          <span className={`pill ${storeStatus.durable ? 'pill-ok' : 'pill-warn'}`}>{storeStatus.durable ? '영구 저장 준비 완료' : '영구 저장소 연결 필요'}</span>
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
          {leadItem ? (
            <article className="feature-card panel-like">
              <div className="feature-copy">
                <p className="eyebrow">Featured Brief</p>
                <h2>{leadItem.title}</h2>
                <p>{leadItem.snippet || leadItem.why_it_matters}</p>
                <div className="feature-meta">
                  <span>{leadItem.source_name}</span>
                  <span>{leadItem.topic}</span>
                  <span>{leadItem.extraction_mode}</span>
                </div>
                <div className="inline-actions">
                  <a className="secondary-btn" href={leadItem.url} target="_blank" rel="noreferrer">상세 보기</a>
                  {leadItem.pdf_url ? <a className="primary-btn" href={leadItem.pdf_url} target="_blank" rel="noreferrer">PDF 열기</a> : null}
                </div>
              </div>
              <div className="feature-side">
                <p className="eyebrow">Operational Read</p>
                <h3>바로 볼 포인트</h3>
                <ul className="feature-points">
                  <li>원문 진입 전 핵심 문장을 먼저 읽고 우선순위를 정할 수 있습니다.</li>
                  <li>PDF 기반 요약 여부를 함께 보여줘 신뢰도 판단이 빠릅니다.</li>
                  <li>카드뉴스, Markdown, JSON이 모두 연결돼 활용 범위를 넓혔습니다.</li>
                </ul>
              </div>
            </article>
          ) : null}

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
              <h3>운영 정보</h3>
              <p>초기 관리자 이메일은 {admin.email}입니다.</p>
              <p className="muted">{storeStatus.description}</p>
              <div className="kv-note">
                보고서 카드, 원문 링크, 저장 방식 상태를 한 화면에서 확인할 수 있도록 설계했습니다.
              </div>
            </article>
          </div>

          <div className="source-lanes">
            {sourceGroups.map(([sourceName, sourceItems]) => (
              <article className="source-lane" key={sourceName}>
                <div className="source-lane-head">
                  <div>
                    <p className="eyebrow">Source Lane</p>
                    <h3>{sourceName}</h3>
                  </div>
                  <span className="pill">{sourceItems.length}건</span>
                </div>
                <div className="source-lane-list">
                  {sourceItems.slice(0, 3).map((item) => (
                    <a className="lane-item" key={`${item.source_id}-${item.title}`} href={item.url} target="_blank" rel="noreferrer">
                      <strong>{item.title}</strong>
                      <span>{item.snippet || item.why_it_matters}</span>
                    </a>
                  ))}
                </div>
              </article>
            ))}
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
          <PasswordChangeForm email={session.email} storeStatus={storeStatus} />
        </aside>
      </section>
    </main>
  );
}
