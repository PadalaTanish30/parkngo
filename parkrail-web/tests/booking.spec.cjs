const { test, expect } = require('@playwright/test');

test('booking form exposes validation and authentication state', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Reserve' }).first().waitFor();
  await page.getByRole('button', { name: 'Reserve' }).first().click();

  await page.getByLabel('Vehicle type').selectOption('2-wheeler');
  await page.getByPlaceholder('TS 09 AB 1234').fill('TS 09 AB 1234');
  await page.getByPlaceholder('Yamaha FZ or Maruti Swift').fill('Yamaha FZ');
  await page.getByRole('button', { name: /Pay .* with UPI|Sign in to reserve/ }).click();

  await expect(page.getByRole('heading', { name: 'Pick up where you left off.' })).toBeVisible();
});

test('booking form blocks incomplete vehicle details', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Reserve' }).first().waitFor();
  await page.getByRole('button', { name: 'Reserve' }).first().click();
  await page.getByRole('button', { name: /Pay .* with UPI|Sign in to reserve/ }).click();

  await expect(page.getByRole('alert')).toContainText('vehicle type');
});

test('booking modal remains usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Reserve' }).first().waitFor();
  await page.getByRole('button', { name: 'Reserve' }).first().click();

  const submit = page.getByRole('button', { name: /Pay .* with UPI|Sign in to reserve/ });
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
});

test('theme toggle persists dark mode across reloads', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');

  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByRole('button', { name: 'Switch to light mode' }),
  ).toBeVisible();
});

test('footer community controls and assistant are available', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');

  await expect(page.getByText('Made by Raj, Ram and Tanish')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Join the ParkNGo Discord' })).toHaveAttribute(
    'href',
    'https://discord.gg/avT2Zha4xR',
  );
  await page.getByRole('link', { name: 'Join the ParkNGo Discord' }).hover();
  await expect(page.getByRole('dialog', { name: 'ParkNGo Discord community' })).toBeVisible();
  await page.getByRole('button', { name: 'Play radio' }).click();
  await expect(page.getByRole('button', { name: 'Radio on' })).toBeVisible();
  await page.getByRole('button', { name: 'Ask ParkNGo' }).click();
  await expect(page.getByRole('region', { name: 'ParkNGo assistant' })).toBeVisible();
});
