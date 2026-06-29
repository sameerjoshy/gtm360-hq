const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT  = path.join('D:\\GTM-OS\\gtm360-hq\\screenshots');

const ROUTES = [
  '/',
  '/dashboard',
  '/sam',
  '/rex',
  '/andy',
  '/finn',
  '/ola',
  '/memo',
  '/outreach',
  '/proposals',
  '/prospects',
  '/nurture',
  '/trends',
  '/cleanup',
  '/okrs',
];

(async () => {
  const browser = await chromium.launch();
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const route of ROUTES) {
    const name = route === '/' ? 'landing' : route.slice(1);
    console.log(`→ ${route}`);
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(800);
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  saved: ${file}`);
  }

  await browser.close();
  console.log('\nAll done.');
})();
