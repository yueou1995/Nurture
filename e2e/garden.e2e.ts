import { test, expect, type Locator, type Page } from '@playwright/test'
import { careForPlant, createGarden, plantTypes } from '../src/lib/garden.ts'
import { plantArtwork, wateringCanArtwork, waterDropArtwork } from '../src/lib/artwork.ts'

const key = 'nurture.garden.v1'

async function activate(element: Locator, touch = false) {
  if (touch) await element.tap()
  else await element.click()
}

async function openPlantMenu(page: Page, id: string, touch = false) {
  await activate(page.locator(`[data-plant-id="${id}"]`), touch)
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu).toHaveCSS('opacity', '1')
  return menu
}

async function requestWater(page: Page, id: string, touch = false) {
  const menu = await openPlantMenu(page, id, touch)
  await activate(menu.getByRole('menuitem', { name: 'Water', exact: true }), touch)
}

async function dragPlant(page: Page, id: string, touch: boolean) {
  const plant = page.locator(`[data-plant-id="${id}"]`)
  await plant.scrollIntoViewIfNeeded()
  const box = (await plant.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  if (touch) {
    const session = await page.context().newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 37, y: y + 28 }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await session.detach()
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 37, y + 28)
    await page.mouse.up()
  }
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-09T12:00:00-07:00') })
})

test('a healthy garden starts without a draggable can or removed descriptions', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your habits are growing.')
  await expect(page).toHaveTitle('Nurture - Your habits are growing.')
  for (const description of [
    'Your garden, your pace.', 'Rooted here. Saved on this device.', 'A LITTLE CARE, EVERY DAY', 'pick me up',
    "Don't track your habits. Grow them.", 'a good day to grow',
  ]) {
    await expect(page.getByText(description, { exact: true })).toHaveCount(0)
  }
  await expect(page.locator('.plant-node')).toHaveCount(3)
  await expect(page.locator('.plant-pot, .plant-face, .plant-foliage')).toHaveCount(0)
  const plantSources = await page.locator('.plant-art img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))
  expect(plantSources.every((src) => src?.endsWith('-transparent.png'))).toBe(true)
  await expect(page.locator('[data-watered="true"]')).toHaveCount(0)
  await expect(page.locator('.watering-can')).toHaveCount(0)
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(page.locator('.garden-date')).toHaveCount(0)
  await expect.poll(() => page.locator('img').evaluateAll((images) =>
    images.every((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0))).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('garden.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('hover gives a tiny wiggle, two-percent growth and a pointer, not a tooltip', async ({ page }, info) => {
  test.skip(info.project.name === 'touch', 'Hover is a mouse affordance.')
  await page.goto('/')
  const plant = page.locator('[data-plant-id="self-care"]')
  await plant.hover()
  await expect(plant).toHaveCSS('cursor', 'pointer')
  await expect(plant.locator('.plant-art')).toHaveCSS('animation-name', 'plant-hover')
  await expect.poll(() => plant.locator('.plant-art').evaluate((art) =>
    new DOMMatrixReadOnly(getComputedStyle(art).transform).a)).toBeCloseTo(1.02, 2)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(page.locator('.plant-focus-hint')).toHaveCount(0)
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(page.locator('.watering-can')).toHaveCount(0)
})

test('click or tap opens the three-item doodle menu and clicking elsewhere closes it', async ({ page }, info) => {
  await page.goto('/')
  const touch = info.project.name === 'touch'
  const menu = await openPlantMenu(page, 'self-care', touch)
  expect(await menu.getByRole('menuitem').allTextContents()).toEqual(['Water', 'View history', 'Edit'])
  const menuBox = (await menu.boundingBox())!
  const plantBox = (await page.locator('[data-plant-id="self-care"]').boundingBox())!
  expect(menuBox.x >= plantBox.x + plantBox.width || menuBox.x + menuBox.width <= plantBox.x).toBe(true)
  const historyLines = await menu.getByRole('menuitem', { name: 'View history' }).locator('span').evaluate((label) =>
    label.getBoundingClientRect().height / parseFloat(getComputedStyle(label).lineHeight))
  expect(historyLines).toBeLessThan(1.05)
  await expect(page.locator('[data-plant-id="self-care"]')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('[data-watered="true"]')).toHaveCount(0)
  await expect(page.locator('.watering-can')).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('plant-menu.png') })
  await activate(page.getByRole('heading', { level: 1 }), touch)
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(page.locator('[data-plant-id="self-care"]')).toHaveAttribute('aria-expanded', 'false')
})

test('Water runs arrival, tilt, four drops, smile, heart and exit without dragging', async ({ page }, info) => {
  await page.goto('/')
  const touch = info.project.name === 'touch'
  const menu = await openPlantMenu(page, 'self-care', touch)
  await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.garden-stage')!
    const phases: string[] = []
    stage.dataset.testPhases = '[]'
    new MutationObserver(() => {
      const phase = stage.querySelector('.watering-can')?.getAttribute('data-phase') ?? 'idle'
      if (phases.at(-1) !== phase) {
        phases.push(phase)
        stage.dataset.testPhases = JSON.stringify(phases)
      }
    }).observe(stage, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-phase'] })
  })
  await activate(menu.getByRole('menuitem', { name: 'Water', exact: true }), touch)
  await expect(page.getByRole('menu')).toHaveCount(0)
  const can = page.locator('.watering-can')
  await expect(can).toHaveAttribute('data-target', 'self-care')
  await expect(can).toHaveCSS('pointer-events', 'none')
  await expect(page.getByRole('button', { name: /Watering can/ })).toHaveCount(0)
  await expect(can).toHaveAttribute('data-phase', 'pouring')
  await expect(can.locator('img')).toHaveAttribute('src', wateringCanArtwork.src)
  const nozzleError = await page.evaluate((spout) => {
    const can = document.querySelector<HTMLElement>('.watering-can')!
    const motion = can.querySelector<HTMLElement>('.can-motion')!
    const image = can.querySelector<HTMLImageElement>('img')!
    const imageStyle = getComputedStyle(image)
    const motionStyle = getComputedStyle(motion)
    const [originX, originY] = motionStyle.transformOrigin.split(' ').map(parseFloat)
    const x = parseFloat(imageStyle.left) + spout.x * parseFloat(imageStyle.width) / image.naturalWidth - originX
    const y = parseFloat(imageStyle.top) + spout.y * parseFloat(imageStyle.height) / image.naturalHeight - originY
    const transformed = new DOMPoint(x, y).matrixTransform(new DOMMatrix(motionStyle.transform))
    const canBox = can.getBoundingClientRect()
    const waterBox = document.querySelector('.water-effect')!.getBoundingClientRect()
    const curve = document.querySelector('.water-still')!.getAttribute('d')!.split(' ')
    return Math.hypot(canBox.x + originX + transformed.x - waterBox.x - Number(curve[1]),
      canBox.y + originY + transformed.y - waterBox.y - Number(curve[2]))
  }, wateringCanArtwork.spout)
  expect(nozzleError).toBeLessThan(1)
  const drops = page.locator('.water-flow animateMotion')
  await expect(drops).toHaveCount(4)
  expect(await drops.evaluateAll((motions) => motions.every((motion) => motion.getAttribute('repeatCount') === '1'))).toBe(true)
  expect(await page.locator('.water-drop image').evaluateAll((images) => images.map((image) => image.getAttribute('href')))).toEqual(Array(4).fill(waterDropArtwork.src))
  await expect(page.locator('[data-plant-id="self-care"]')).toHaveClass(/is-drinking/)
  await page.waitForTimeout(360)
  await page.screenshot({ path: info.outputPath('pouring.png') })
  await expect(page.locator('[data-plant-id="self-care"]')).toHaveAttribute('data-watered', 'true')
  await expect(page.locator('[data-plant-id="self-care"] .plant-happy')).toHaveCSS('opacity', '1')
  await expect(page.locator('[data-plant-id="self-care"] .plant-happy')).toHaveAttribute('src', plantArtwork.succulent.happySrc)
  await expect(page.locator('[data-plant-id="self-care"] .plant-neutral')).toHaveCSS('opacity', '0')
  await expect(page.locator('[data-plant-id="self-care"] .plant-heart')).toHaveCount(1)
  await expect(can).toHaveCount(0)
  const phases = await page.locator('.garden-stage').evaluate((stage) => JSON.parse(stage.dataset.testPhases!))
  expect(phases).toEqual(['arriving', 'tilting', 'pouring', 'cared', 'leaving', 'idle'])
  expect(await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!).plants[0].history, key)).toEqual(['2026-10-09'])
  await page.reload()
  await expect(page.locator('[data-plant-id="self-care"]')).toHaveAttribute('data-watered', 'true')
  await expect(page.locator('.watering-can')).toHaveCount(0)
})

test('Water selections queue in order without interrupting or duplicating care', async ({ page }, info) => {
  await page.goto('/')
  const touch = info.project.name === 'touch'
  await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.garden-stage')!
    const order: string[] = []
    stage.dataset.testCareOrder = '[]'
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const plant = mutation.target
        if (plant instanceof HTMLElement && plant.dataset.watered === 'true' && plant.dataset.plantId) {
          order.push(plant.dataset.plantId)
          stage.dataset.testCareOrder = JSON.stringify(order)
        }
      }
    }).observe(stage, { subtree: true, attributes: true, attributeFilter: ['data-watered'] })
  })
  for (const id of ['self-care', 'exercise', 'reading']) await requestWater(page, id, touch)
  await page.locator('[data-plant-id="reading"]').focus()
  await page.keyboard.press('w')
  await expect(page.locator('[data-watered="true"]')).toHaveCount(3, { timeout: 12_000 })
  expect(await page.locator('.garden-stage').evaluate((stage) => JSON.parse(stage.dataset.testCareOrder!))).toEqual(['self-care', 'exercise', 'reading'])
  await expect(page.locator('.watering-can')).toHaveCount(0)
  const saved = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key)
  expect(saved.plants.map((plant: { history: string[] }) => plant.history.length)).toEqual([1, 1, 1])
  await expect(page.locator('.celebration')).toContainText('Your garden is happy today.')
  await page.reload()
  await expect(page.locator('[data-watered="true"]')).toHaveCount(3)
  await expect(page.locator('.celebration')).toBeEmpty()
})

test('Escape cancels an unfinished pour and its queued requests', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-plant-id="self-care"]').focus()
  await page.keyboard.press('w')
  await page.locator('[data-plant-id="exercise"]').focus()
  await page.keyboard.press('w')
  await expect(page.locator('.watering-can')).toHaveAttribute('data-phase', 'pouring')
  await page.keyboard.press('Escape')
  await expect(page.locator('.watering-can')).toHaveCount(0)
  await page.waitForTimeout(1200)
  await expect(page.locator('[data-watered="true"]')).toHaveCount(0)
  await expect(page.locator('.water-effect')).toHaveCount(0)
})

test('plants still rearrange freely without opening a menu, and positions persist', async ({ page }, info) => {
  await page.goto('/')
  await dragPlant(page, 'self-care', info.project.name === 'touch')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const plant = page.locator('[data-plant-id="self-care"]')
  const position = await plant.evaluate((element) => ({ left: element.style.left, top: element.style.top }))
  await page.reload()
  await expect(plant).toHaveCSS('left', position.left)
  await expect(plant).toHaveCSS('top', position.top)
})

test('moving the plant being watered stops that pour rather than watering an old position', async ({ page }, info) => {
  await page.goto('/')
  await requestWater(page, 'self-care', info.project.name === 'touch')
  await expect(page.locator('.watering-can')).toHaveAttribute('data-phase', 'pouring')
  await dragPlant(page, 'self-care', info.project.name === 'touch')
  await expect(page.locator('.watering-can')).toHaveCount(0)
  await page.waitForTimeout(1000)
  await expect(page.locator('[data-watered="true"]')).toHaveCount(0)
})

test('the plant menu supports keyboard navigation and repeat watering without duplicate dates', async ({ page }) => {
  await page.goto('/')
  const plant = page.locator('[data-plant-id="self-care"]')
  await plant.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Water', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: 'View history' })).toBeFocused()
  await page.keyboard.press('End')
  await expect(menu.getByRole('menuitem', { name: 'Edit', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: 'Water', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(plant).toBeFocused()
  await page.keyboard.press('w')
  await page.keyboard.press('w')
  await expect(plant).toHaveAttribute('data-watered', 'true')
  await expect(page.locator('.watering-can')).toHaveCount(0)
  await page.keyboard.press('w')
  await expect(page.locator('.watering-can')).toHaveAttribute('data-phase', 'pouring')
  await expect(page.locator('.watering-can')).toHaveAttribute('data-phase', 'cared')
  await expect(page.locator('.watering-can')).toHaveCount(0)
  await page.keyboard.press('Enter')
  await expect(menu.getByRole('menuitem', { name: 'Water', exact: true })).toBeEnabled()
  await expect(menu.getByRole('menuitem', { name: 'Water', exact: true })).toBeFocused()
  expect(await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!).plants[0].history.length, key)).toBe(1)
})

test('already-watered plants can queue from the menu and be watered again from history', async ({ page }, info) => {
  const day = '2026-10-09'
  const garden = careForPlant(createGarden(day), 'self-care', day)
  const touch = info.project.name === 'touch'
  await page.goto('/')
  await page.evaluate(({ storageKey, garden }) => localStorage.setItem(storageKey, JSON.stringify(garden)), { storageKey: key, garden })
  await page.reload()
  await requestWater(page, 'exercise', touch)
  const menu = await openPlantMenu(page, 'self-care', touch)
  await expect(menu.getByRole('menuitem', { name: 'Water', exact: true })).toBeEnabled()
  await activate(menu.getByRole('menuitem', { name: 'Water', exact: true }), touch)
  const can = page.locator('.watering-can')
  await expect(can).toHaveAttribute('data-target', 'self-care', { timeout: 7000 })
  await expect(can).toHaveAttribute('data-phase', 'pouring')
  await expect(can).toHaveAttribute('data-phase', 'cared')
  await expect(page.locator('[data-plant-id="self-care"] .plant-heart')).toHaveCount(1)
  await expect(can).toHaveCount(0)
  const historyMenu = await openPlantMenu(page, 'self-care', touch)
  await activate(historyMenu.getByRole('menuitem', { name: 'View history' }), touch)
  const water = page.getByRole('button', { name: 'Water Self-care', exact: true })
  await expect(water).toBeEnabled()
  await activate(water, touch)
  await expect(can).toHaveAttribute('data-phase', 'pouring')
  await expect(can).toHaveAttribute('data-phase', 'cared')
  await expect(page.locator('[data-plant-id="self-care"] .plant-heart')).toHaveCount(1)
  await expect(can).toHaveCount(0)
  await page.reload()
  const saved = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key)
  expect(saved.plants[0].history).toEqual([day])
  expect(saved.plants[1].history).toEqual([day])
  await expect(page.locator('[data-plant-id="self-care"]')).toHaveAttribute('data-watered', 'true')
})

test('plants and menus stay visible at every garden corner', async ({ page }, info) => {
  if (info.project.name === 'desktop') {
    await page.setViewportSize({ width: 3440, height: 1440 })
  }
  await page.goto('/')
  for (const position of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]) {
    const garden = createGarden('2026-10-09')
    garden.plants[0].position = position
    garden.plants[0].habitName = 'A long habit name using two full lines'
    await page.evaluate(({ storageKey, garden }) => localStorage.setItem(storageKey, JSON.stringify(garden)), { storageKey: key, garden })
    await page.reload()
    const stageBox = (await page.locator('.garden-stage').boundingBox())!
    const plant = page.locator('[data-plant-id="self-care"]')
    const artBox = (await plant.locator('.plant-art').boundingBox())!
    const labelBox = (await plant.locator('.plant-label').boundingBox())!
    expect(Math.min(artBox.x, labelBox.x)).toBeGreaterThanOrEqual(stageBox.x + 7)
    expect(Math.max(artBox.x + artBox.width, labelBox.x + labelBox.width))
      .toBeLessThanOrEqual(stageBox.x + stageBox.width - 7)
    expect(artBox.y).toBeGreaterThanOrEqual(stageBox.y + 7)
    expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height - 7)
    const menu = await openPlantMenu(page, 'self-care', info.project.name === 'touch')
    const box = (await menu.boundingBox())!
    const viewport = page.viewportSize()!
    expect(box.x).toBeGreaterThanOrEqual(7)
    expect(box.y).toBeGreaterThanOrEqual(7)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 7)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 7)
    await page.keyboard.press('Escape')
  }
})

test('Edit opens directly into the name field and preserves care and position', async ({ page }, info) => {
  await page.goto('/')
  const menu = await openPlantMenu(page, 'self-care', info.project.name === 'touch')
  await activate(menu.getByRole('menuitem', { name: 'Edit', exact: true }), info.project.name === 'touch')
  const field = page.getByLabel('A new name, same little plant.')
  await expect(field).toBeFocused()
  await expect(page.locator('.care-calendar')).toHaveCount(0)
  await field.fill('  A little me-time  ')
  await page.getByRole('button', { name: 'Save name', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-plant-id="self-care"]')).toHaveAccessibleName(/^A little me-time, azulita succulent/)
  await page.reload()
  const saved = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!).plants[0], key)
  expect(saved.habitName).toBe('A little me-time')
  expect(saved.position).toEqual({ x: 0.16, y: 0.65 })
  expect(saved.history).toEqual([])
})

test('viewing history does not interrupt care already in progress', async ({ page }, info) => {
  await page.goto('/')
  await requestWater(page, 'self-care', info.project.name === 'touch')
  const menu = await openPlantMenu(page, 'reading', info.project.name === 'touch')
  await activate(menu.getByRole('menuitem', { name: 'View history' }), info.project.name === 'touch')
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Reading')
  await expect(page.locator('[data-plant-id="self-care"]')).toHaveAttribute('data-watered', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('removing a queued plant skips it without losing the following turn', async ({ page }) => {
  await page.goto('/')
  for (const id of ['self-care', 'exercise', 'reading']) {
    await page.locator(`[data-plant-id="${id}"]`).focus()
    await page.keyboard.press('w')
  }
  const menu = await openPlantMenu(page, 'exercise')
  await menu.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.getByRole('button', { name: 'Let this plant go', exact: true }).click()
  await page.getByRole('button', { name: 'Remove plant', exact: true }).click()
  await page.getByRole('button', { name: 'Close panel' }).click()
  await expect(page.locator('[data-plant-id="exercise"]')).toHaveCount(0)
  await expect(page.locator('[data-watered="true"]')).toHaveCount(2, { timeout: 8000 })
  await expect(page.locator('.watering-can')).toHaveCount(0)
})

test('a new local day resets only smiles, including in an already-open tab', async ({ page }) => {
  await page.clock.setSystemTime(new Date('2026-10-09T23:59:00-07:00'))
  await page.goto('/')
  const plant = page.locator('[data-plant-id="self-care"]')
  await plant.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('w')
  await expect(plant).toHaveAttribute('data-watered', 'true')
  const before = await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)
  await page.clock.fastForward(61_000)
  await expect(page.locator('[data-watered="true"]')).toHaveCount(0)
  await expect(page.locator('.plant-node')).toHaveCount(3)
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(before)
  const menu = await openPlantMenu(page, 'self-care')
  await menu.getByRole('menuitem', { name: 'View history' }).click()
  await expect(page.locator('.calendar-day[aria-current="date"]')).toHaveAttribute('datetime', '2026-10-10')
})

test('reduced motion keeps a clear watering and happy state without swoops or wiggles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const plant = page.locator('[data-plant-id="exercise"]')
  await plant.focus()
  await page.keyboard.press('w')
  await expect(page.locator('.can-motion')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.water-still')).toBeVisible()
  await expect(page.locator('.water-flow')).toBeHidden()
  await expect(plant).toHaveAttribute('data-watered', 'true')
  await expect(plant.locator('.plant-happy')).toHaveCSS('opacity', '1')
  await expect(plant.locator('.plant-art')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.watering-can')).toHaveCount(0)
})

test('inspiration and custom plants can still be grown, renamed, and gently removed', async ({ page }, info) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Grow something new', exact: true }).click()
  await page.getByRole('button', { name: 'Go outside', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Choose sunflower', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Let it grow', exact: true }).click()
  await expect(page.locator('.plant-node')).toHaveCount(4)
  await page.getByRole('button', { name: 'Grow something new', exact: true }).click()
  await page.getByRole('button', { name: 'Something personal', exact: true }).click()
  await page.getByLabel('What do you want to grow?').fill('   ')
  await expect(page.getByRole('button', { name: 'Let it grow', exact: true })).toBeDisabled()
  await page.getByLabel('What do you want to grow?').fill('  Make a little art  ')
  await page.getByRole('button', { name: 'Choose cream orchid', exact: true }).click()
  await page.screenshot({ path: info.outputPath('grow-panel.png') })
  await page.getByRole('button', { name: 'Let it grow', exact: true }).click()
  await expect(page.locator('.plant-node')).toHaveCount(5)
  await page.getByRole('button', { name: /^Make a little art, cream orchid\./ }).click()
  await page.getByRole('menuitem', { name: 'View history' }).click()
  await page.getByRole('button', { name: 'Rename', exact: true }).click()
  await page.getByLabel('A new name, same little plant.').fill('  Sketch a little  ')
  await page.getByRole('button', { name: 'Save name', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Sketch a little')
  await page.getByRole('button', { name: 'Let this plant go', exact: true }).click()
  await page.getByRole('button', { name: 'Keep my plant', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Sketch a little')
  await page.getByRole('button', { name: 'Let this plant go', exact: true }).click()
  await page.getByRole('button', { name: 'Remove plant', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('My Garden')
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.reload()
  await expect(page.locator('.plant-node')).toHaveCount(4)
  await expect(page.getByRole('button', { name: /^Go outside, sunflower\./ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Sketch a little/ })).toHaveCount(0)
})

test('View history opens the monthly calendar and its accessible Water action', async ({ page }, info) => {
  await page.goto('/')
  const menu = await openPlantMenu(page, 'self-care', info.project.name === 'touch')
  await activate(menu.getByRole('menuitem', { name: 'View history' }), info.project.name === 'touch')
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Self-care')
  await expect(page.locator('.care-story')).toContainText('0 days')
  await page.getByRole('button', { name: 'Water Self-care', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-plant-id="self-care"]')).toHaveAttribute('data-watered', 'true')
  const again = await openPlantMenu(page, 'self-care', info.project.name === 'touch')
  await activate(again.getByRole('menuitem', { name: 'View history' }), info.project.name === 'touch')
  await expect(page.locator('.care-story')).toContainText('1 day')
  await expect(page.locator('.calendar-day.was-cared-for')).toHaveCount(1)
  await expect(page.locator('.calendar-day.was-cared-for')).toHaveAttribute('datetime', '2026-10-09')
  await expect(page.getByRole('button', { name: 'Water Self-care', exact: true })).toBeEnabled()
  await expect(page.getByText('A little care, remembered.', { exact: true })).toHaveCount(0)
  await expect(page.locator('.sheet-surface')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: info.outputPath('history-panel.png') })
  await page.getByRole('button', { name: 'Previous month' }).click()
  await expect(page.getByRole('heading', { name: 'September 2026' })).toBeVisible()
  await expect(page.locator('.calendar-day')).toHaveCount(30)
  await expect(page.locator('.calendar-day.was-cared-for')).toHaveCount(0)
  await page.getByRole('button', { name: 'Next month' }).click()
  await expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next month' })).toBeDisabled()
})

test('dialogs contain focus, close with Escape, and explain the new flow', async ({ page }) => {
  await page.goto('/')
  const opener = page.getByRole('button', { name: 'My Garden', exact: true })
  await opener.click()
  await expect(page.getByRole('dialog').getByText('YOUR OWN LITTLE PATCH', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('dialog').getByText('Good things grow with a little care.', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('dialog').getByText(/^Visit a plant to rename it, see its story,/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Close panel' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  expect(await page.getByRole('dialog').evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
  await page.getByRole('button', { name: 'A little help', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('A little tending')
  await expect(page.locator('.help-can img')).toHaveAttribute('src', wateringCanArtwork.src)
  await expect(page.getByRole('dialog')).toContainText('Click or tap to open its little menu.')
  await expect(page.getByRole('dialog')).not.toContainText('pull down')
  await page.getByText('A gentler way to water', { exact: true }).click()
  await expect(page.locator('.keyboard-details')).toContainText('Tab to a plant')
})

test('the picker offers all thirteen supplied plant pairs and no placeholder art', async ({ page }, info) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Grow something new', exact: true }).click()
  const choices = page.locator('.plant-choice')
  await expect(choices).toHaveCount(13)
  const sources = await choices.locator('img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))
  expect(sources).toEqual(plantTypes.flatMap((type) => [plantArtwork[type].src, plantArtwork[type].happySrc]))
  await expect.poll(() => choices.locator('img').evaluateAll((images) =>
    images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth === 768))).toBe(true)
  await expect(page.getByRole('button', { name: 'Choose fern', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Choose tulip', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Choose wildflower', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Something personal', exact: true }).click()
  await page.getByLabel('What do you want to grow?').fill('A little sunshine')
  await page.getByRole('button', { name: 'Choose bird of paradise', exact: true }).click()
  await page.screenshot({ path: info.outputPath('supplied-plant-picker.png') })
  await page.getByRole('button', { name: 'Let it grow', exact: true }).click()
  const plant = page.getByRole('button', { name: /^A little sunshine, bird of paradise\./ })
  await expect(plant.locator('.plant-neutral')).toHaveAttribute('src', plantArtwork['bird-of-paradise'].src)
})

test('old saved plant types migrate to supplied artwork without losing the garden', async ({ page }) => {
  const day = '2026-10-09'
  const base = careForPlant(createGarden(day), 'self-care', day)
  const legacyTypes = ['fern', 'tulip', 'wildflower']
  const saved = {
    ...base,
    plants: base.plants.map((plant, index) => ({
      ...plant, plantType: legacyTypes[index],
      habitName: `Saved habit ${index + 1}`, position: { x: 0.2 + index * 0.3, y: 0.5 },
    })),
  }
  await page.goto('/')
  await page.evaluate(({ storageKey, saved }) => localStorage.setItem(storageKey, JSON.stringify(saved)), { storageKey: key, saved })
  await page.reload()
  await expect(page.getByRole('alert')).toHaveCount(0)
  const replacements = ['monstera', 'cream-orchid', 'hydrangea']
  for (let index = 0; index < saved.plants.length; index++) {
    const plant = page.locator(`[data-plant-id="${saved.plants[index].id}"]`)
    await expect(plant.locator('.plant-label')).toHaveText(saved.plants[index].habitName)
    await expect(plant.locator('.plant-art')).toHaveAttribute('data-plant-type', replacements[index])
  }
  await expect(page.locator('[data-plant-id="self-care"]')).toHaveAttribute('data-watered', 'true')
  await page.locator('[data-plant-id="self-care"]').focus()
  await page.keyboard.press('ArrowRight')
  const persisted = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key)
  expect(persisted.plants.map((plant: { plantType: string }) => plant.plantType)).toEqual(replacements)
  expect(persisted.plants[0].history).toEqual([day])
  expect(persisted.plants[0].position.x).toBeCloseTo(0.235)
  expect(persisted.plants[0].position.y).toBe(0.5)
})

test('corrupt saved data stays untouched and is reported, with a working retry', async ({ page }) => {
  await page.addInitScript((storageKey) => localStorage.setItem(storageKey, '{broken garden'), key)
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Your original is untouched')
  await page.locator('[data-plant-id="self-care"]').focus()
  await page.keyboard.press('ArrowRight')
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe('{broken garden')
  await page.evaluate(({ storageKey, garden }) => localStorage.setItem(storageKey, JSON.stringify(garden)), { storageKey: key, garden: createGarden('2026-10-09') })
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.locator('[data-plant-id="self-care"]').focus()
  await page.keyboard.press('ArrowRight')
  expect(await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!).plants[0].position.x, key)).toBeCloseTo(0.195)
})

test('storage write failures are explicit and retry saves the latest changes', async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem
    window.addEventListener('nurture-test-restore-storage', () => { Storage.prototype.setItem = setItem })
    Storage.prototype.setItem = () => { throw new DOMException('Storage is full', 'QuotaExceededError') }
  })
  await page.goto('/')
  await page.locator('[data-plant-id="reading"]').focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('alert')).toContainText("couldn't be saved")
  await page.evaluate(() => window.dispatchEvent(new Event('nurture-test-restore-storage')))
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!).plants[2].position.x, key)).toBeCloseTo(0.765)
})

test('an intentionally empty garden stays empty after refresh, without celebrating', async ({ page }) => {
  const garden = { ...createGarden('2026-10-09'), plants: [] }
  await page.goto('/')
  await page.evaluate(({ storageKey, garden }) => localStorage.setItem(storageKey, JSON.stringify(garden)), { storageKey: key, garden })
  await page.reload()
  await expect(page.locator('.plant-node')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Every garden starts with a little seed,' })).toBeVisible()
  await expect(page.locator('.celebration')).toBeEmpty()
  await expect(page.locator('.watering-can')).toHaveCount(0)
  await page.getByRole('button', { name: 'Grow Something New', exact: true }).click()
  await expect(page.getByRole('dialog').locator('.text-back')).toHaveCount(0)
  await page.getByRole('button', { name: 'Read', exact: true }).click()
  await page.getByRole('button', { name: 'Plant it', exact: true }).click()
  await expect(page.locator('.plant-node')).toHaveCount(1)
  const saved = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key)
  expect(saved.plants[0].position).toEqual({ x: 0.5, y: 0.42 })
})
