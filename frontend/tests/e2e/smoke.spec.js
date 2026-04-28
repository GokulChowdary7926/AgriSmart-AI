import { expect, test } from '@playwright/test';

const authUser = {
  id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'farmer',
  preferences: { language: 'en' }
};

test('@smoke redirects protected route to login without auth', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('@smoke allows protected route with mocked profile auth', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'fake-token');
  });

  await page.route('**/api/auth/profile**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user: authUser })
    });
  });
  await page.route('**/api/auth/me**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user: authUser })
    });
  });

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('@smoke redirects to login when token is invalid', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'expired-token');
  });

  await page.route('**/api/auth/me**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
      })
    });
  });

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('@smoke chat history drawer shows fetched sessions', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({
      id: 'u1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'farmer'
    }));
  });

  await page.route('**/api/auth/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: authUser,
        token: 'fake-token'
      })
    });
  });

  await page.route('**/api/agri-gpt/quick-replies**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, quickReplies: [] })
    });
  });

  await page.route('**/api/agri-gpt/sessions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sessions: [{ sessionId: 's1', title: 'Rice Chat', updatedAt: new Date().toISOString() }]
      })
    });
  });

  await page.goto('/chat');
  await page.getByLabel(/chat history/i).click();
  await expect(page.getByText('Rice Chat').first()).toBeVisible();
});
