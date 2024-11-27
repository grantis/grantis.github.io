const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Starting PDF generation...');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ Browser launched');

    const page = await browser.newPage();
    console.log('✅ New page created');

    // Set viewport to A4 size
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2,
    });
    console.log('✅ Viewport set to A4');

    // Enable debug logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.error('Browser error:', err));
    page.on('requestfailed', req => console.error('Failed request:', req.url()));

    // Use absolute file path for local development
    const absolutePath = `file://${process.cwd()}/index.html`;
    console.log('📂 Loading file from:', absolutePath);
    
    // Intercept requests to fix image paths
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.resourceType() === 'image') {
        const url = request.url();
        if (url.startsWith('file://')) {
          const relativePath = url.split('/public/')[1];
          const absoluteImagePath = `file://${process.cwd()}/public/${relativePath}`;
          request.continue({ url: absoluteImagePath });
        } else {
          request.continue();
        }
      } else {
        request.continue();
      }
    });

    await page.goto(absolutePath, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('✅ Page loaded');

    // Debug image path
    const imageSrc = await page.evaluate(() => {
      const img = document.querySelector('.profile-image');
      return img ? img.src : 'Image not found';
    });
    console.log('🖼️  Image source:', imageSrc);

    // Wait for image with detailed logging
    console.log('⏳ Waiting for profile image to load...');
    try {
      await Promise.all([
        page.waitForSelector('.profile-image', { 
          visible: true,
          timeout: 5000 
        }),
        page.waitForFunction(() => {
          const img = document.querySelector('.profile-image');
          return img && img.complete && img.naturalHeight !== 0;
        }, { timeout: 5000 })
      ]);
      console.log('✅ Image selector found and loaded');
    } catch (error) {
      console.error('❌ Error waiting for image:', error);
      throw error;
    }

    // Detailed image status check
    const imageStatus = await page.evaluate(() => {
      const img = document.querySelector('.profile-image');
      if (!img) return { status: 'error', message: 'Image element not found' };
      
      return {
        status: 'debug',
        exists: !!img,
        complete: img.complete,
        naturalHeight: img.naturalHeight,
        naturalWidth: img.naturalWidth,
        currentSrc: img.currentSrc,
        display: window.getComputedStyle(img).display,
        visibility: window.getComputedStyle(img).visibility,
        dimensions: `${img.offsetWidth}x${img.offsetHeight}`,
      };
    });
    console.log('📊 Image status:', imageStatus);

    // Force image visibility
    const imageLoaded = await page.evaluate(() => {
      const img = document.querySelector('.profile-image');
      if (!img || !img.complete || !img.naturalHeight) {
        console.log('Image validation failed:', {
          exists: !!img,
          complete: img?.complete,
          naturalHeight: img?.naturalHeight
        });
        return false;
      }
      
      // Force image to be visible in print
      const styles = {
        display: 'block',
        visibility: 'visible',
        printColorAdjust: 'exact',
        webkitPrintColorAdjust: 'exact',
        opacity: '1'
      };
      
      Object.assign(img.style, styles);
      console.log('Applied styles:', styles);
      return true;
    });

    if (!imageLoaded) {
      console.error('❌ Profile image failed to load');
      process.exit(1);
    }
    console.log('✅ Image loaded and styles applied');

    // Replace waitForTimeout with setTimeout wrapped in a Promise
    console.log('⏳ Waiting for styles to settle...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Styles settled');

    console.log('📑 Generating PDF...');
    await page.pdf({
      path: 'grant-rigby-resume.pdf',
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: '25mm',
        bottom: '25mm',
        left: '20mm',
        right: '20mm'
      }
    });
    console.log('✅ PDF generated successfully');

    await browser.close();
    console.log('✅ Browser closed');
    console.log('🎉 Process completed successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
})();
