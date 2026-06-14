const { test, expect } = require('@playwright/test');

const routes = [
  '/',
  '/recorder',
  '/editor',
  '/stream',
  '/webinar',
  '/export',
  '/settings'
];

for (const route of routes) {
  test(`Console errors on ${route}`, async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto(`http://localhost:3000${route}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log(`\n=== Errors on ${route} ===`);
      errors.forEach(e => console.log('ERROR:', e));
    }

    expect(errors).toHaveLength(0);
  });
}