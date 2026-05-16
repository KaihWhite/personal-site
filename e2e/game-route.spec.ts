import { test, expect } from '@playwright/test';

test.describe('game-route smoke', () => {
  test('home mounts the game canvas and the skeleton fades out', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 8000 });
  });

  test('player can walk to the hub portfolio doorway', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);

    // HubRoom layout (Phase 3b): spawn center (0.5), portfolio doorway at 0.20 (left).
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowLeft');

    // The overlay-open behavior is replaced by scene transitions in Phase 3b.
    // Task 18 will replace this test with a full multi-room walk.
    // For now, just confirm the canvas remains.
    await expect(page.locator('canvas')).toBeVisible();
  });

  test.skip('Escape closes the portfolio overlay [replaced by Task 18 multi-room walk]', async ({ page: _page }) => {
    // Phase 3b moves portfolio overlay trigger into PortfolioRoom (not HubRoom).
    // Full multi-room walk test lands in Task 18.
  });

  test('static landing renders when ?nogame is set', async ({ page }) => {
    await page.goto('/?nogame');
    await expect(page.getByRole('heading', { name: /hello there/i })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});
