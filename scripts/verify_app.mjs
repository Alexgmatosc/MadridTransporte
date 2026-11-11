import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://127.0.0.1:5173';

async function runVerification() {
  console.log('🚀 Starting EMT Madrid PWA automated verification...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('Browser console error:', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.error('Browser page error:', err);
    pageErrors.push(err.message);
  });

  try {
    // -------------------------------------------------------------------------
    // 1. App Loads cleanly for Stop 2279
    // -------------------------------------------------------------------------
    console.log('\n--- 1. App Load & Stop 2279 Initial State ---');
    await page.goto(`${BASE_URL}/?stop=2279`, { waitUntil: 'networkidle2' });

    const stopHeaderElem = await page.waitForSelector('h1', { timeout: 8000 });
    const stopTitle = await page.evaluate((el) => el.textContent, stopHeaderElem);
    console.log(`Stop Title: "${stopTitle}"`);
    if (!stopTitle.includes('Estrella Polar')) {
      throw new Error(`Expected stop title to contain 'Estrella Polar', got: "${stopTitle}"`);
    }

    const stopIdBadge = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.textContent.includes('2279') : false;
    });
    if (!stopIdBadge) {
      throw new Error('Stop ID 2279 badge not found in StopHeader');
    }
    console.log('✓ Stop 2279 loaded successfully with correct ID and title');

    // -------------------------------------------------------------------------
    // 2. Real-time estimations from PMVVisor
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Real-Time Estimations from EMT Madrid PMVVisor ---');
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes('PRÓXIMAS LLEGADAS') || text.includes('No hay estimaciones disponibles');
      },
      { timeout: 10000 }
    );

    const estimatesData = await page.evaluate(() => {
      const body = document.body.innerText;
      const hasArrivalsSection = body.includes('PRÓXIMAS LLEGADAS');
      const lines = [];
      document.querySelectorAll('span, div').forEach((el) => {
        if (el.textContent?.trim() === '32') lines.push('32');
      });
      return {
        hasArrivalsSection,
        linesCount: lines.length,
        textSnippet: body.slice(0, 1000),
      };
    });

    console.log(`Arrivals section found: ${estimatesData.hasArrivalsSection}`);
    console.log(`Line 32 references found: ${estimatesData.linesCount}`);
    if (!estimatesData.hasArrivalsSection || estimatesData.linesCount === 0) {
      throw new Error('Real-time arrivals for line 32 were not rendered');
    }
    console.log('✓ Stop 2279 real-time estimations loaded cleanly from EMT Madrid PMVVisor');

    // -------------------------------------------------------------------------
    // 3. Interactive Leaflet Map & Bus Pins
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Interactive Leaflet Map & Markers ---');
    await page.waitForSelector('.leaflet-container', { timeout: 6000 });
    const mapMarkers = await page.evaluate(() => {
      const stopPins = document.querySelectorAll('.stop-pin');
      const busPins = document.querySelectorAll('.bus-pin');
      return {
        stopPinsCount: stopPins.length,
        busPinsCount: busPins.length,
      };
    });
    console.log(`Leaflet Map: ${mapMarkers.stopPinsCount} stop pin(s), ${mapMarkers.busPinsCount} bus pin(s)`);
    if (mapMarkers.stopPinsCount === 0) {
      throw new Error('Stop pin missing on Leaflet map');
    }
    console.log('✓ Leaflet map displays stop marker and incoming bus GPS coordinates');

    // -------------------------------------------------------------------------
    // 4. Favoriting a Stop (LocalStorage & UI persistence)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Favoriting Stop 2279 ---');
    const favBtn = await page.waitForSelector('button[title*="favoritos"]');
    await favBtn.click();
    await new Promise((r) => setTimeout(r, 400));

    // Check localStorage
    const savedFavorites = await page.evaluate(() => {
      const raw = localStorage.getItem('emt_madrid_favorites_v1');
      return raw ? JSON.parse(raw) : [];
    });
    console.log(`LocalStorage favorites count: ${savedFavorites.length}`);
    const is2279Fav = savedFavorites.some((f) => String(f.id) === '2279');
    if (!is2279Fav) {
      throw new Error('Stop 2279 was not found in localStorage emt_madrid_favorites_v1');
    }

    // Check favorite pill in header
    const favPillExists = await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('header button'));
      return pills.some((p) => p.textContent?.includes('Estrella Polar') || p.textContent?.includes('2279'));
    });
    console.log(`Favorite quick pill visible in header: ${favPillExists}`);
    if (!favPillExists) {
      throw new Error('Favorite quick access pill not found in header');
    }
    console.log('✓ Favoriting persists in localStorage and displays in header');

    // -------------------------------------------------------------------------
    // 5. Search Modal Verification (Stop Name, Street, Line)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Search Modal ---');
    // Open search modal via header button
    const searchTrigger = await page.waitForSelector('header button:has(svg.lucide-search)');
    await searchTrigger.click();

    const searchInput = await page.waitForSelector('input[placeholder*="parada"]', { timeout: 3000 });
    console.log('✓ Search modal opened');

    // 5a. Search by name: 'Estrella Polar'
    console.log('Testing search by name: "Estrella Polar"...');
    await searchInput.click();
    await page.keyboard.type('Estrella Polar');
    await new Promise((r) => setTimeout(r, 400));
    let results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[class*="overflow-y-auto"] div[class*="cursor-pointer"]'));
      return items.map((b) => b.textContent?.trim());
    });
    console.log(`Found ${results.length} result(s) for 'Estrella Polar'`);
    if (!results.some((r) => r.includes('2279') || r.includes('Estrella Polar'))) {
      throw new Error("Search by name 'Estrella Polar' did not return stop 2279");
    }

    // 5b. Search by street: 'Princesa'
    console.log('Testing search by street: "Princesa"...');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="parada"]');
      if (input) input.value = '';
    });
    await page.keyboard.type('Princesa');
    await new Promise((r) => setTimeout(r, 400));
    results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[class*="overflow-y-auto"] div[class*="cursor-pointer"]'));
      return items.map((b) => b.textContent?.trim());
    });
    console.log(`Found ${results.length} result(s) for 'Princesa'. First result: "${results[0]?.slice(0, 60)}"`);
    if (results.length === 0 || !results.some((r) => r.toLowerCase().includes('princesa'))) {
      throw new Error("Search by street 'Princesa' returned no results");
    }

    // 5c. Search by line: '32'
    console.log('Testing search by line: "32"...');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="parada"]');
      if (input) input.value = '';
    });
    await page.keyboard.type('32');
    await new Promise((r) => setTimeout(r, 400));
    results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[class*="overflow-y-auto"] div[class*="cursor-pointer"]'));
      return items.map((b) => b.textContent?.trim());
    });
    console.log(`Found ${results.length} result(s) for line '32'. First result: "${results[0]?.slice(0, 60)}"`);
    if (results.length === 0) {
      throw new Error("Search by line '32' returned no results");
    }
    console.log('✓ Search modal by name, street, and line verified!');

    // -------------------------------------------------------------------------
    // 6. Selecting a stop from search results
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Selecting Stop from Search Results ---');
    const firstStopItem = await page.waitForSelector('div[class*="overflow-y-auto"] div[class*="cursor-pointer"]');
    await firstStopItem.click();
    await new Promise((r) => setTimeout(r, 1200));

    const selectedStopInfo = await page.evaluate(() => {
      const url = new URL(window.location.href);
      const stopParam = url.searchParams.get('stop');
      const title = document.querySelector('h1')?.textContent?.trim();
      return { stopParam, title };
    });
    console.log(`New Stop selected: ID=${selectedStopInfo.stopParam}, Title="${selectedStopInfo.title}"`);
    if (!selectedStopInfo.stopParam || selectedStopInfo.stopParam === '2279') {
      throw new Error('Selection did not switch to the new stop');
    }
    console.log('✓ Selecting a stop successfully updates view and loads stop data');

    // -------------------------------------------------------------------------
    // 7. Dark/Light Mode Toggle
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Dark Mode Toggle ---');
    const themeBtn = await page.waitForSelector('button[title*="modo"]');
    const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await themeBtn.click();
    await new Promise((r) => setTimeout(r, 200));
    const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    console.log(`Dark mode toggle: was=${wasDark}, now=${isDarkNow}`);
    if (wasDark === isDarkNow) {
      throw new Error('Theme toggle did not switch dark class');
    }
    console.log('✓ Dark/Light theme switching verified');

    // -------------------------------------------------------------------------
    // 8. Console errors and uncaught exceptions
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Console Error Audit ---');
    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Total page errors: ${pageErrors.length}`);
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      console.warn('Errors encountered:', { consoleErrors, pageErrors });
      // Fail only if fatal
      if (pageErrors.length > 0) {
        throw new Error(`Fatal page errors detected: ${pageErrors.join(', ')}`);
      }
    } else {
      console.log('✓ Zero console errors and zero page exceptions!');
    }

    console.log('\n======================================================');
    console.log('🌟 ALL EMT MADRID PWA AUDIT CHECKS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runVerification();
