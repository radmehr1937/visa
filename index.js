import express from 'express';
import { chromium } from 'playwright';   // توجه کن: این بار playwright معمولی لازمه (نه playwright-chromium)

const app = express();
const PORT = process.env.PORT || 3000;

// 🔑 ادرس WSS از BrightData (Browser API)
const BROWSER_WSS = 'wss://brd-customer-hl_554193fc-zone-scraping_browser1:68b5az1ldx0k@brd.superproxy.io:9222';

async function getBrowser() {
  // اتصال به مرورگر BrightData
  const browser = await chromium.connectOverCDP(BROWSER_WSS);
  // context ها توی Browser API از قبل وجود دارن
  const context = browser.contexts()[0] || await browser.newContext();
  return { browser, context };
}

// 🏠 Root route
app.get('/', (req, res) => {
  res.send('✅ Visa Checker is running via BrightData Browser API');
});

// 📌 نمایش آی‌پی بیرونی (از دید BrightData)
app.get('/myip', async (req, res) => {
  try {
    const { browser, context } = await getBrowser();
    const page = await context.newPage();
    await page.goto('https://api.ipify.org/?format=json', { waitUntil: 'domcontentloaded' });

    const body = await page.textContent('body');
    await browser.close();

    res.type('json').send(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 تست TLSContact main page
app.get('/test-home', async (req, res) => {
  try {
    const { browser, context } = await getBrowser();
    const page = await context.newPage();

    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'
    });

    await page.goto('https://visas-de.tlscontact.com/en-us', { waitUntil: 'domcontentloaded' });
    const html = await page.content();

    await browser.close();
    res.type('html').send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 چک کردن نوبت TLSContact
app.get('/check', async (req, res) => {
  try {
    const { browser, context } = await getBrowser();
    const page = await context.newPage();

    // رفتن به صفحه لاگین
    await page.goto(
      'https://auth.visas-de.tlscontact.com/auth/realms/atlas/protocol/openid-connect/auth',
      { waitUntil: 'domcontentloaded' }
    );

    await page.fill('#email-input-field', 'ozbajik@telegmail.com');
    await page.fill('#password-input-field', '123456Negar@');
    await page.click('#btn-login');
    await page.waitForNavigation();

    // صفحه رزرو وقت
    await page.goto(
      'https://visas-de.tlscontact.com/en-us/3487969/workflow/appointment-booking?location=irTHR2de',
      { waitUntil: 'domcontentloaded' }
    );

    const available = await page.$$(
      'xpath=//*[@id="main"]/div[1]/div/div[2]/div[3]/div/div[3]/div[2]/div/div/div/div/button[not(@disabled)]'
    );

    await browser.close();
    res.json({ status: available.length > 0 ? 'AVAILABLE' : 'NOT_AVAILABLE' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
