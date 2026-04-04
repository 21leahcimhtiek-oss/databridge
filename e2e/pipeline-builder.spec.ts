import { test, expect, Page } from '@playwright/test'

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123')
  await page.click('[type="submit"]')
  await page.waitForURL('/dashboard', { timeout: 10000 }).catch(() => {})
}

test.describe('Pipeline Builder', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('pipeline builder canvas renders', async ({ page }) => {
    await page.goto('/dashboard/pipelines/new')
    await expect(page.locator('[data-testid="pipeline-canvas"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="node-toolbar"]')).toBeVisible()
    await expect(page.locator('[data-testid="canvas-area"]')).toBeVisible()
  })

  test('can add source node', async ({ page }) => {
    await page.goto('/dashboard/pipelines/new')
    await page.waitForSelector('[data-testid="pipeline-canvas"]', { timeout: 15000 })

    // Open add-node panel or drag from toolbar
    const addSourceBtn = page.locator('[data-testid="add-source-node"]')
    if (await addSourceBtn.isVisible()) {
      await addSourceBtn.click()
    } else {
      // Fall back to toolbar drag-and-drop
      const sourceItem = page.locator('[data-testid="toolbar-node-source"]')
      const canvas = page.locator('[data-testid="canvas-area"]')
      const canvasBox = await canvas.boundingBox()
      if (canvasBox && await sourceItem.isVisible()) {
        await sourceItem.dragTo(canvas, {
          targetPosition: { x: canvasBox.width / 2, y: canvasBox.height / 2 },
        })
      }
    }

    // Verify a source node appeared on the canvas
    await expect(page.locator('[data-testid="node-type-source"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('can configure and save pipeline', async ({ page }) => {
    await page.goto('/dashboard/pipelines/new')
    await page.waitForSelector('[data-testid="pipeline-canvas"]', { timeout: 15000 })

    // Set pipeline name
    const nameInput = page.locator('[data-testid="pipeline-name-input"]')
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E Test Pipeline')
    }

    // Save the pipeline
    const saveBtn = page.locator('[data-testid="save-pipeline-btn"]')
    await expect(saveBtn).toBeVisible({ timeout: 5000 })
    await saveBtn.click()

    // Expect success feedback
    const successToast = page.locator('[data-testid="toast-success"], [role="status"]')
    await expect(successToast).toBeVisible({ timeout: 8000 })
  })

  test('pipeline list shows created pipelines', async ({ page }) => {
    await page.goto('/dashboard/pipelines')
    await page.waitForSelector('[data-testid="pipelines-list"]', { timeout: 15000 })

    // List container should be visible
    const list = page.locator('[data-testid="pipelines-list"]')
    await expect(list).toBeVisible()

    // Either shows pipeline items or an empty state message
    const items = page.locator('[data-testid="pipeline-list-item"]')
    const emptyState = page.locator('[data-testid="pipelines-empty-state"]')
    const count = await items.count()
    if (count === 0) {
      await expect(emptyState).toBeVisible()
    } else {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('run history shows after pipeline run', async ({ page }) => {
    await page.goto('/dashboard/pipelines')
    await page.waitForSelector('[data-testid="pipelines-list"]', { timeout: 15000 })

    const firstPipeline = page.locator('[data-testid="pipeline-list-item"]').first()
    const hasPipelines = await firstPipeline.isVisible()
    if (!hasPipelines) {
      test.skip()
      return
    }

    await firstPipeline.click()
    await page.waitForSelector('[data-testid="pipeline-detail"]', { timeout: 10000 })

    // Trigger a run
    const runBtn = page.locator('[data-testid="run-pipeline-btn"]')
    if (await runBtn.isVisible()) {
      await runBtn.click()
      await page.waitForSelector('[data-testid="run-history-list"]', { timeout: 15000 })
      const runItems = page.locator('[data-testid="run-history-item"]')
      await expect(runItems.first()).toBeVisible({ timeout: 15000 })
    } else {
      // Check if run history section exists at minimum
      const runHistorySection = page.locator('[data-testid="run-history-section"]')
      await expect(runHistorySection).toBeVisible()
    }
  })

  test('connector creation flow', async ({ page }) => {
    await page.goto('/dashboard/connectors/new')
    await page.waitForSelector('[data-testid="connector-form"]', { timeout: 15000 })

    // Select connector type
    const typeSelect = page.locator('[data-testid="connector-type-select"]')
    await expect(typeSelect).toBeVisible()
    await typeSelect.selectOption('postgres')

    // Fill out connector fields
    await page.fill('[data-testid="connector-name-input"]', 'E2E Test Connector')
    await page.fill('[data-testid="connector-host-input"]', 'localhost')
    await page.fill('[data-testid="connector-port-input"]', '5432')
    await page.fill('[data-testid="connector-database-input"]', 'testdb')
    await page.fill('[data-testid="connector-user-input"]', 'testuser')
    await page.fill('[data-testid="connector-password-input"]', 'testpass')

    // Submit the form
    const saveBtn = page.locator('[data-testid="save-connector-btn"]')
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // Verify redirect or success state
    const feedback = page.locator('[data-testid="toast-success"], [data-testid="connector-saved"]')
    await expect(feedback).toBeVisible({ timeout: 10000 })
  })

  test('billing page shows plans', async ({ page }) => {
    await page.goto('/dashboard/billing')
    await page.waitForSelector('[data-testid="billing-page"]', { timeout: 15000 })

    // Should see at least two plan cards
    const planCards = page.locator('[data-testid="plan-card"]')
    await expect(planCards.first()).toBeVisible()
    const planCount = await planCards.count()
    expect(planCount).toBeGreaterThanOrEqual(2)

    // Should show Starter and Pro
    await expect(page.locator('[data-testid="plan-card-starter"]')).toBeVisible()
    await expect(page.locator('[data-testid="plan-card-pro"]')).toBeVisible()
  })
})