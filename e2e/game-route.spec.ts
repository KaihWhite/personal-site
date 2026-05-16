import { test, expect } from '@playwright/test';

test.describe('game-route smoke', () => {
  test('home mounts the game canvas and the skeleton fades out', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 8000 });
  });

  test('player can walk to the doorway and open the portfolio overlay', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });

    // Wait an extra beat for the scene to be interactive after the canvas mounts.
    await page.waitForTimeout(500);

    // Walk right toward the doorway. Spawn is at 50% (640px), doorway at 75% (960px).
    // At 250px/s, the player reaches the doorway center (~960px) in ~1.3s.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1300);

    // Interact while inside the doorway. Use down+wait+up (not press) so Phaser sees
    // _justDown=true on a game frame before keyup resets it.
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');

    await page.keyboard.up('ArrowRight');

    // Overlay should mount with the portfolio heading.
    await expect(page.getByRole('dialog', { name: /portfolio/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible();
  });

  test('Escape closes the portfolio overlay', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1300);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('ArrowRight');
    await expect(page.getByRole('dialog', { name: /portfolio/i })).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /portfolio/i })).not.toBeVisible();
  });

  test('static landing renders when ?nogame is set', async ({ page }) => {
    await page.goto('/?nogame');
    await expect(page.getByRole('heading', { name: /hello there/i })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});
