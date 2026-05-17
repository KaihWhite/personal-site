import { test, expect } from '@playwright/test';

test.describe('static site smoke', () => {
  test('home shows placeholder landing and the menu opens', async ({ page }) => {
    await page.goto('/?nogame');
    await expect(page.getByRole('heading', { name: /hello there/i })).toBeVisible();
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('link', { name: 'Portfolio' })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to the world/i })).not.toBeVisible();
  });

  test('portfolio page loads with project cards', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible();
    const cards = page.locator('a[href*="github.com"]');
    await expect(cards).toHaveCount(3);
  });

  test('about page shows bio and roles', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: /about/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /work experience/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /lead engineer/i })).toBeVisible();
  });

  test('contact page shows email and GitHub link', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('link', { name: /kaihgwhite@outlook\.com/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /KaihWhite/i })).toBeVisible();
  });

  test('static page menu navigates back to the world', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.getByRole('link', { name: /back to the world/i }).click();
    await expect(page).toHaveURL('/');
    // Whether the canvas appears depends on browser/viewport (auto-opt-out for mobile/webkit).
    // The chromium-only canvas assertion lives in e2e/game-route.spec.ts.
  });

  test('Escape closes the menu', async ({ page }) => {
    await page.goto('/?nogame');
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('link', { name: 'Portfolio' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: 'Portfolio' })).not.toBeVisible();
  });
});
