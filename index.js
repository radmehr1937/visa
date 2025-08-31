import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 3000;

// 🔑 BrightData Browser API (Scraping Browser)
const BROWSER_WSS =
  'wss://brd-customer-hl_554193fc-zone-scraping_browser1:68b5az1ldx0k@brd.superproxy.io:9222';

// اتصال به مرورگر BrightData
async function getBrowser() {
  const browser = await chromium.connectOverCDP(BROWSER_WSS);
  const context = browser.contexts()[0] || (await browser.newContext());
  return { browser, context };
}

// 🏠 Root route
app.get('/', (req, res) => {
  res.send('✅ Visa Checker is running via BrightData Browser API (with debug-login)');
});

// 📌 نمایش آی‌پی بیرونی
app.get('/myip', async (req, res) => {
  try {
    const { browser, context } = await getBrowser();
    const page = await context.newPage();
    await page.goto('https://api.ipify.org/?format=json', {
      waitUntil: 'domcontentloaded',
    });

    const body = await page.textContent('body');
    await browser.close();
    res.type('json').send(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 تست صفحه اصلی TLSContact
app.get('/test-home', async (req, res) => {
  try {
    const { browser, context } = await getBrowser();
    const page = await context.newPage();

    await page.goto('https://visas-de.tlscontact.com/en-us', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    const html = await page.content();
    console.log('Final URL:', page.url());
    await browser.close();

    res.type('html').send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 مسیر Debug برای بررسی لاگین
app.get('/debug-login', async (req, res) => {
  try {
    const { browser, context } = await getBrowser();
    const page = await context.newPage();

    // رفتن به صفحه لاگین
    await page.goto(
      'https://auth.visas-de.tlscontact.com/auth/realms/atlas/protocol/openid-connect/auth',
      { waitUntil: 'domcontentloaded', timeout: 60000 }
    );

    const url = page.url();
    const html = await page.content();

    await browser.close();

    res.json({
      final_url: url,
      snippet: html.substring(0, 1000), // فقط ۱۰۰۰ کاراکتر اول
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 بررسی وقت TLSContact
app.get('/check', async (req, res) => {
  try {
    const { browser, context } = await getBrowser();
    const page = await context.newPage();

    await page.goto(
      'https://auth.visas-de.tlscontact.com/auth/realms/atlas/protocol/openid-connect/auth',
      { waitUntil: 'domcontentloaded', timeout: 60000 }
    );

    // تلاش برای پیدا کردن فیلد لاگین
    await page.waitForSelector('#email-input-field', { timeout: 20000 });
    await page.fill('#email-input-field', 'ozbajik@telegmail.com');
    await page.fill('#password-input-field', '123456Negar@');
    await page.click('#btn-login');
    await page.waitForNavigation({ timeout: 60000 });

    // رفتن به صفحه وقت
    await page.goto(
      'https://visas-de.tlscontact.com/en-us/3487969/workflow/appointment-booking?location=irTHR2de',
      { waitUntil: 'domcontentloaded', timeout: 60000 }
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

// 🚀 اجرا
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
