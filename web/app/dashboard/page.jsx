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

  const generatedAt = summary.generated_at
    ? new Date(summary.generated_at).toLocaleString('ko-KR')
    : '확인 필요';

  return (
    <main className="page-shell dashboard-shell">

      {/* 헤더 */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>Knowledge Warehouse</h1>
          <p>정책·연구 보고서 인텔리전스 대시보드</p>
        </div>
        <div className="digest-links" style={{ margin: 0 }}>
          <span className="pill">{session.email}</span>
          <span className={`pill ${storeStatus.durable ? 'pill-ok' : 'pill-warn'}`}>
            {storeStatus.durable ? '저장소 연결됨' : '저장소 미연결'}
          </span>
          <LogoutButton />
        </div>
      </div>

      {/* 요약 카드 */}
      <section className="panel dashboard-hero">
        <div className="hero-layout">
          <div>
            <p className="eyebrow">Today&apos;s Digest</p>
            <h2 className="section-title" style={{ marginTop: '6px' }}>오늘의 보고서 요약</h2>
            <p className="hero-copy" style={{ marginTop: '10px', maxWidth: '46ch' }}>
              {generatedAt} 기준으로 수집된 최신 정책·연구 보고서입니다.
              카드뉴스, Markdown, JSON 형식으로 바로 확인할 수 있습니다.
            </p>
            <div className="dashboard-topline">
              <a className="primary-btn" href="/generated/latest-policy-cards.html" target="_blank" rel="noreferrer">카드뉴스 열기</a>
              <a className="secondary-btn" href="/generated/latest-policy-brief.md" target="_blank" rel="noreferrer">Markdown 브리프</a>
              <a className="ghost-btn" href="/generated/latest-report-items.json" target="_blank" rel="noreferrer">원본 JSON</a>
            </div>
          </div>

          <div className="hero-aside-card">
            <p className="eyebrow">Run Summary</p>
            <div className="hero-stat-list" style={{ marginTop: '12px' }}>
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
                <span>저장 방식</span>
              </div>
              <div>
                <strong>{session.email.split('@')[0]}</strong>
                <span>관리자</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-main">

          {/* 주요 보고서 */}
          {leadItem ? (
            <article className="feature-card panel-like">
              <div className="feature-copy">
                <p className="eyebrow">Featured Brief</p>
                <h2>{leadItem.title}</h2>
                <p>{leadItem.snippet || leadItem.why_it_matters}</p>
                <div className="feature-meta">
                  <span className="pill">{leadItem.source_name}</span>
                  <span className="pill">{leadItem.topic}</span>
                  <span className="pill">{leadItem.extraction_mode}</span>
                </div>
                <div className="inline-actions">
                  <a className="secondary-btn" href={leadItem.url} target="_blank" rel="noreferrer">상세 보기</a>
                  {leadItem.pdf_url ? (
                    <a className="primary-btn" href={leadItem.pdf_url} target="_blank" rel="noreferrer">PDF 열기</a>
                  ) : null}
                </div>
              </div>
              <div className="feature-side">
                <p className="eyebrow">빠르게 보는 법</p>
                <h3>활용 포인트</h3>
                <ul className="feature-points">
                  <li>원문 전에 핵심 문장으로 우선순위를 정하세요.</li>
                  <li>PDF 기반 여부로 요약 신뢰도를 확인할 수 있습니다.</li>
                  <li>카드뉴스·MD·JSON 세 가지 형식으로 활용하세요.</li>
                </ul>
              </div>
            </article>
          ) : null}

          {/* 소스 상태 + 운영 정보 */}
          <div className="stats-grid">
            <article className="stat-card">
              <p className="eyebrow">Source Status</p>
              <h3>소스 상태</h3>
              <div className="status-grid">
                {sourceLines.length ? sourceLines.map((source) => (
                  <div className="status-chip" key={source.source_id}>
                    <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '2px' }}>
                      {source.source_name}
                    </strong>
                    {source.status} · {source.item_count}건<br />
                    {source.note}
                  </div>
                )) : (
                  <div className="status-chip">요약 메타가 없습니다.</div>
                )}
              </div>
            </article>

            <article className="stat-card">
              <p className="eyebrow">Admin</p>
              <h3>운영 정보</h3>
              <p>관리자 이메일: <strong style={{ color: 'var(--ink)' }}>{admin.email}</strong></p>
              <p className="muted" style={{ marginTop: '6px' }}>{storeStatus.description}</p>
              <div className="kv-note" style={{ marginTop: '8px' }}>
                보고서 카드, 원문 링크, 저장 방식 상태를 한 화면에서 확인합니다.
              </div>
            </article>
          </div>

          {/* 소스별 최신 항목 */}
          <div className="source-lanes">
            {sourceGroups.map(([sourceName, sourceItems]) => (
              <article className="source-lane" key={sourceName}>
                <div className="source-lane-head">
                  <div>
                    <p className="eyebrow">Source</p>
                    <h3>{sourceName}</h3>
                  </div>
                  <span className="pill">{sourceItems.length}건</span>
                </div>
                <div className="source-lane-list">
                  {sourceItems.slice(0, 3).map((item) => (
                    <a
                      className="lane-item"
                      key={`${item.source_id}-${item.title}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <strong>{item.title}</strong>
                      <span>{item.snippet || item.why_it_matters}</span>
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* 보고서 카드 목록 */}
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
