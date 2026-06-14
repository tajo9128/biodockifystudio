import { test, expect } from '@playwright/test';

test('Quick test - check bundle hash on root', async ({ page }) => {
  const scripts = [];
  page.on('response', async resp => {
    if (resp.url().includes('/assets/index-') && resp.url().endsWith('.js')) {
      scripts.push(resp.url());
    }
  });
  
  await page.goto('http://127.0.0.1:3001/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  console.log('Loaded scripts:', scripts);
  
  // Check if it's the new hash
  const hasNewHash = scripts.some(s => s.includes('index-CG79EiWg'));
  const hasOldHash = scripts.some(s => s.includes('index-1hwnQtMq'));
  
  console.log('Has new hash:', hasNewHash);
  console.log('Has old hash:', hasOldHash);
  
  expect(hasNewHash).toBeTruthy();
  expect(hasOldHash).toBeFalsy();
});