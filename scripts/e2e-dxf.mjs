import puppeteer from 'puppeteer-core';
import path from 'node:path';

const appUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const chromePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const filePath = process.env.TEST_FILE || '/home/iamx/Downloads/YHs7f-women-body-3d-wall-art.dxf';
const screenshotPath = process.env.SCREENSHOT_PATH || '/tmp/fileviewer-dxf-e2e.png';
const uploadedFileName = path.basename(filePath);
const expectedFileName = uploadedFileName.toLowerCase().endsWith('.dwg')
  ? uploadedFileName.replace(/\.[^.]+$/i, '.dxf')
  : uploadedFileName;

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push(message.text());
  }
});

page.on('pageerror', (error) => {
  pageErrors.push(String(error));
});

try {
  await page.goto(appUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  const input = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
  await input.uploadFile(filePath);

  await page.waitForFunction(
    () => document.body.innerText.includes('Loaded:'),
    { timeout: 15000 },
  );

  await page.waitForFunction(
    () => !document.body.innerText.includes('Processing file...'),
    { timeout: 15000 },
  );

  const loadedText = await page.$eval('body', (body) => body.innerText);
  const canvasCount = await page.$$eval('canvas', (nodes) => nodes.length);
  const hasErrorBanner = loadedText.includes('Unable to render this file.')
    || loadedText.includes('Failed to')
    || loadedText.includes('does not contain renderable geometry');

  if (!loadedText.includes(`Loaded: ${expectedFileName}`)) {
    throw new Error(`Viewer did not report the uploaded file as loaded. Text snapshot:\n${loadedText}`);
  }

  if (canvasCount === 0) {
    throw new Error('No canvas was rendered.');
  }

  if (hasErrorBanner) {
    throw new Error(`Viewer rendered an error banner. Text snapshot:\n${loadedText}`);
  }

  if (pageErrors.length > 0) {
    throw new Error(`Unhandled page errors:\n${pageErrors.join('\n')}`);
  }

  const relevantConsoleErrors = consoleErrors.filter((entry) => !entry.includes('favicon'));
  if (relevantConsoleErrors.length > 0) {
    throw new Error(`Console errors detected:\n${relevantConsoleErrors.join('\n')}`);
  }

  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Viewer E2E passed for ${filePath}`);
  console.log(`Screenshot: ${screenshotPath}`);
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
}
