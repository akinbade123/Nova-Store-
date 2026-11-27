// Loads every NOVA route in headless Chrome and reports runtime errors.
// Run through smoke.sh, which installs puppeteer-core and starts the dev server.
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:5179';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SETTLE_MS = 1800; // sample-data services add up to ~1.6s of fake latency
const extra = process.argv.slice(2); // optional extra paths to check, e.g. /shop?sale=1

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
let errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => ['error', 'warn'].includes(m.type()) && errors.push(`${m.type()}: ${m.text().slice(0, 300)}`));
page.on('requestfailed', (r) => r.url().startsWith(BASE) && errors.push(`request failed: ${r.url()}`));
page.on('response', (r) => r.url().startsWith(BASE) && r.status() >= 400 && errors.push(`HTTP ${r.status()}: ${r.url()}`));

let failures = 0;
async function visit(path) {
  errors = [];
  await page.goto(BASE + path, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, SETTLE_MS));
  const textLength = await page.$eval('#root', (n) => n.innerText.length);
  const landed = new URL(page.url()).pathname;
  const ok = errors.length === 0 && textLength > 50;
  if (!ok) failures += 1;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${path.padEnd(44)} -> ${landed}  (${textLength} chars) "${await page.title()}"`);
  errors.forEach((e) => console.log(`       ${e}`));
}

// Discover real slugs from the app instead of hard-coding them.
await page.goto(`${BASE}/shop`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, SETTLE_MS));
const productPath = await page.$eval('a[href^="/product/"]', (a) => a.getAttribute('href')).catch(() => null);
await page.goto(`${BASE}/collections`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, SETTLE_MS));
const collectionPath = await page.$eval('a[href^="/collections/"]', (a) => a.getAttribute('href')).catch(() => null);

const guest = [
  '/', '/shop', '/shop?category=electronics&sort=price-asc', productPath, '/cart', '/wishlist',
  '/collections', collectionPath, '/about', '/help', '/legal', '/legal/terms', '/legal/cookies',
  '/login', '/register', '/forgot-password', '/reset-password', '/reset-password?token=smoke', '/verify-email', '/verify-email?token=smoke', '/checkout', '/this-page-does-not-exist', ...extra,
].filter(Boolean);
console.log('— Signed out —');
for (const path of guest) await visit(path);

// Signed in with a cart: sample-data mode doesn't verify tokens, so a stored session is enough.
const productId = await (async () => {
  if (!productPath) return null;
  await page.goto(BASE + productPath, { waitUntil: 'networkidle0' });
  return page.evaluate(async (slug) => {
    const { products } = await import('/src/data/products.js');
    return products.find((p) => p.slug === slug)?.id ?? null;
  }, productPath.split('/').pop());
})();
await page.evaluate((id) => {
  localStorage.setItem('nova:session', JSON.stringify({
    user: { id: 'u-demo', firstName: 'Ada', lastName: 'Okafor', email: 'demo@nova.store', marketing: true, createdAt: '2025-03-14T10:00:00.000Z' },
  }));
  localStorage.setItem('nova:token', 'mock.smoke-test');
  if (id) localStorage.setItem('nova:cart', JSON.stringify([{ key: `${id}||`, productId: id, quantity: 2 }]));
}, productId);

console.log('— Signed in, 2 items in cart —');
for (const path of ['/account', '/account/orders', '/account/wishlist', '/account/addresses', '/account/settings', '/cart', '/checkout']) {
  await visit(path);
}

await browser.close();
console.log(failures ? `\n${failures} page(s) had problems.` : '\nAll pages loaded with no errors.');
process.exit(failures ? 1 : 0);
