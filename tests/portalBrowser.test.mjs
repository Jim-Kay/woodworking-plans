import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { chromium } from 'playwright';

const port = Number(process.env.PORTAL_BROWSER_TEST_PORT || await findOpenPort());
const baseUrl = `http://127.0.0.1:${port}`;
let server = null;

await ensureServer();

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const card = page.locator('[data-plan-id="generated-two-step-stool"]');
  await expectCount(card, 1, 'generated stool catalog card');
  const thumbnailLoaded = await card.locator('.planThumb img').evaluate((img) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  assert.equal(thumbnailLoaded, true);
  const extensionTableCard = page.locator('[data-plan-id="generated-extension-leaf-table"]');
  await expectCount(extensionTableCard, 1, 'generated extension table catalog card');
  assert.equal(await extensionTableCard.getAttribute('data-status'), 'ready');
  assert.equal(await extensionTableCard.locator('.badge.ok').textContent(), 'Ready');
  await extensionTableCard.locator('.planThumb img').waitFor({ state: 'visible', timeout: 10_000 });
  const extensionThumbnailLoaded = await extensionTableCard.locator('.planThumb img').evaluate((img) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  assert.equal(extensionThumbnailLoaded, true);

  await page.goto(`${baseUrl}?plan=generated-two-step-stool`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#appTitle').textContent(), 'Generated Two-Step Stool');
  assert.match(await page.locator('#statusBar').textContent(), /Needs review/);
  assert.match(await page.locator('#statusBar').textContent(), /not load certified/);
  assert.equal(await page.locator('[data-generated-stool-controls]:not(.hidden)').count(), 2);
  assert.equal(await page.locator('[data-generated-controls]:not(.hidden)').count(), 0);

  const viewport = page.locator('#viewport');
  const box = await viewport.boundingBox();
  assert.equal(Boolean(box && box.width > 300 && box.height > 250), true);
  const screenshot = await viewport.screenshot();
  assert.equal(screenshot.length > 10_000, true);

  await page.goto(`${baseUrl}?plan=generated-extension-leaf-table`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#appTitle').textContent(), 'Generated Extension Leaf Table');
  assert.equal(await page.locator('#planNotesTab').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#planNotesPane').isVisible(), true);
  assert.equal(await page.locator('#planDimensionsPane').isVisible(), false);
  assert.match(await page.locator('#planNotesPane').textContent(), /advanced generated plan/i);
  await page.locator('#planDimensionsTab').click();
  assert.equal(await page.locator('#planDimensionsTab').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#planDimensionsPane').isVisible(), true);
  assert.match(await page.locator('#statusBar').textContent(), /Extension table/);
  assert.match(await page.locator('#dimensionSummary').textContent(), /Extension leaf table/);
  assert.deepEqual(await page.locator('.badge.err').allTextContents(), []);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  if (server) server.kill();
}

console.log('portal browser tests passed');

async function ensureServer() {
  if (await isServing()) return;
  server = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
    windowsHide: true
  });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isServing()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local server did not start at ${baseUrl}.`);
}

async function isServing() {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes('<title>Floating Frame Planner</title>');
  } catch {
    return false;
  }
}

function findOpenPort() {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const selectedPort = typeof address === 'object' && address ? address.port : null;
      probe.close(() => {
        if (selectedPort) resolve(selectedPort);
        else reject(new Error('Could not allocate a test port.'));
      });
    });
  });
}

async function expectCount(locator, count, label) {
  const actual = await locator.count();
  assert.equal(actual, count, `${label} count`);
}
