const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Set viewport to A4 size
  await page.setViewport({
    width: 794,
    height: 1123,
    deviceScaleFactor: 2,
  });

  // Use absolute file path for local development
  const absolutePath = `file://${process.cwd()}/index.html`;
  await page.goto(absolutePath, {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Ensure image is loaded before proceeding
  await page.waitForSelector('.profile-image', { 
    visible: true,
    timeout: 5000 
  });

  // Add error handling for image
  const imageLoaded = await page.evaluate(() => {
    const img = document.querySelector('.profile-image');
    return img && img.complete && img.naturalHeight !== 0;
  });

  if (!imageLoaded) {
    console.error('Profile image failed to load');
    process.exit(1);
  }

  await page.pdf({
    path: 'grant-rigby-resume.pdf',
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false
  });

  await browser.close();
})();
