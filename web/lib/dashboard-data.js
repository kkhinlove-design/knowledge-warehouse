import fs from 'node:fs/promises';
import path from 'node:path';

async function readJson(filePath, fallback) {
  try {
    const payload = await fs.readFile(filePath, 'utf8');
    return JSON.parse(payload);
  } catch {
    return fallback;
  }
}

export async function getDashboardData() {
  const baseDir = path.join(process.cwd(), 'public', 'generated');
  const items = await readJson(path.join(baseDir, 'latest-report-items.json'), []);
  const summary = await readJson(path.join(baseDir, 'latest-run-summary.json'), {
    generated_at: null,
    item_count: 0,
    pdf_backed_count: 0,
    sources: [],
  });

  return {
    items,
    summary,
  };
}
