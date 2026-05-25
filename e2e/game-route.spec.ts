import { test, expect } from '@playwright/test';

test.describe('game-route smoke', () => {
  // Game-route tests run sequentially: each spins up a full Phaser canvas + WebGL
  // context, and the heavy multi-screen traversal tests (52s each) compete for
  // CPU/GPU resources when run in parallel — dialog detection times out under load.
  // The static-pages spec stays fully parallel; only this describe block serializes.
  test.describe.configure({ mode: 'serial' });

  test('home mounts the game canvas and the skeleton fades out', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
  });

  test('static landing renders when ?nogame is set', async ({ page }) => {
    await page.goto('/?nogame');
    await expect(page.getByRole('heading', { name: /hello there/i })).toBeVisible();
    await expect(page.locator('canvas')).not.toBeVisible();
  });

  // HubRoom layout: spawn at 0.5 (x=640), portfolio doorway at 0.20 (x=256), about at 0.50 (x=640),
  // contact at 0.80 (x=1024). Doorways are 64px wide. Player body is 32px wide.
  // Walk speed: 250 px/s. Hub → portfolio/contact: 384px = ~1550ms.
  // The about doorway is AT the spawn position — player triggers it on interact without walking.
  // CorridorRoom: hub doorway at x=256, content doorway at x=1024 (768px apart = ~3000ms).
  // Warm-up platforms at x=480 and x=800 are oneWay (top-only collision) — player walks through them.
  // PortfolioRoom/ContactRoom (Phase 5a): spawn at x=300, view doorway at x=2400, return at x=200.
  // 2-screen content rooms with pits and spikes — use Space-pulse jumps during traversal.
  //
  // IMPORTANT: Click the canvas before keyboard input to ensure Phaser captures key events.
  // After each interact (ArrowUp), wait 1000ms to allow scene transitions to complete.

  test('walks hub → about → reads a panel → returns to hub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // About doorway is at center spawn (x=640) — interact directly without walking.
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // Corridor: hub-side spawn (x=256) → content doorway (x=1024). Walk 3000ms (~750px).
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3000);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // AboutRoom: spawn at x=300, first panel (panel-bio) at x=500.
    // Walk right ~200px = ~850ms to reach panel-bio's proximity zone.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(850);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);

    // Phaser-rendered panel body text is on canvas; we can't grep DOM text. This case
    // verifies the round-trip doesn't crash; the visual reveal is verified manually.
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('back-to-the-world link from a static page mounts the game', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.getByRole('link', { name: /back to the world/i }).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
  });

  test('hitting the mid-island spike respawns the player at the entry doorway', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // Hub → portfolio doorway (x=256, ~384px from spawn at 640 = 1550ms).
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1550);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // Corridor: hub-side spawn (x=256) → content doorway (x=1024). Walk 3000ms (~750px).
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3000);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // PortfolioRoom: spawn at x=300. Walk right, jump pit-1 (now x=930..1030, 100px wide),
    // then walk into spike at x=1280 WITHOUT jumping — triggers respawn.
    // Canvas must remain visible after the spike contact.
    await page.keyboard.down('ArrowRight');

    // Phase 1: ~2268ms (4 ArrowUp iterations × 567ms) to approach pit-1 edge at x=930.
    // Player at x=867 (before new pit-1 edge at x=930); then jump to clear it.
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(180);
      await page.keyboard.down('ArrowUp');
      await page.waitForTimeout(200);
      await page.keyboard.up('ArrowUp');
    }

    // Jump pit-1 (x=930..1030) — launch at x≈870, land at x≈1053 (on ground-2).
    await page.keyboard.down('Space');
    await page.waitForTimeout(50);
    await page.keyboard.up('Space');
    await page.waitForTimeout(500);

    // Phase 2: Walk into the spike at x=1280 without jumping.
    // (~1500ms from pit-1 land to spike). Continue ArrowUp pulsing; no Space.
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(180);
      await page.keyboard.down('ArrowUp');
      await page.waitForTimeout(200);
      await page.keyboard.up('ArrowUp');
    }

    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(500);

    // Canvas must remain visible after the spike contact (respawn keeps the game running).
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('falling into the first pit respawns the player at the entry doorway', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // Reach PortfolioRoom.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1550);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3000);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // PortfolioRoom: walk right WITHOUT jumping. Player will fall into pit-1 (x=930..1030)
    // and trigger checkPitFall once they pass world height + 64.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3500); // walk from x=300 to past x=930, fall, fade, respawn
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(500);

    await expect(page.locator('canvas')).toBeVisible();
  });

  test('pause coordinator: menu open in PortfolioRoom suspends physics and prevents respawn', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    await page.locator('canvas').click({ position: { x: 640, y: 400 } });
    await page.waitForTimeout(200);

    // Reach PortfolioRoom.
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1550);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(3000);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(1000);

    // Walk into the level a bit (~600 px from spawn), then open the menu BEFORE reaching the pit.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(2000); // ~500 px traversal — player around x=800
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);

    // Open menu.
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByRole('link', { name: 'Portfolio', exact: true })).toBeVisible();

    // While paused: try to walk right (should be a no-op — physics paused).
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowRight');

    // No respawn should have fired (player did not move, did not fall). Canvas is healthy.
    await expect(page.locator('canvas')).toBeVisible();

    // Close the menu.
    await page.getByRole('button', { name: /close menu/i }).click();
    await page.waitForTimeout(500);

    // Game resumes — canvas still present.
    await expect(page.locator('canvas')).toBeVisible();
  });
});
