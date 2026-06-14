import { test, expect } from '@playwright/test';

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
  test(`Console errors on ${route}`, async ({ page, context }) => {
    // Clear cache and service workers
    await context.clearCookies();
    await context.clearPermissions();
    
    // Unregister any service workers
    await page.addInitScript(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(reg => reg.unregister());
        });
      }
    });
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto(`http://127.0.0.1:3001${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    if (errors.length > 0) {
      console.log(`\n=== Errors on ${route} ===`);
      errors.forEach(e => console.log('ERROR:', e));
    }

    expect(errors).toHaveLength(0);
  });
}