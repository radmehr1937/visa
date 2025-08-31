import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 3000;

// 🔑 آدرس WSS برای BrightData Browser API
const BROWSER_WSS =
  'wss://brd-customer-hl_554193fc-zone-scraping_browser1:68b5az1ldx0k@brd.superproxy.io:9222';

// تابع اتصال به مرورگر BrightData
async function getBrowser() {
  const browser = await chromium.connectOverCDP(BROWSER_WSS);
  const context = browser.contexts()[0] || (await browser.newContext());
  return { browser, context };
}

// 🏠 Root route
app.get('/', (req, res) => {
  res.send('✅ Visa Checker is running via BrightData Browser API (login selectors fixed)');
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

    await page.goto(
      'https://auth.visas-de.tlscontact.com/auth/realms/atlas/protocol/openid-connect/auth',
      { waitUntil: 'networkidle', timeout: 60000 }
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

    // ۱) رفتن به صفحه لاگین
    await page.goto(
      'https://auth.visas-de.tlscontact.com/auth/realms/atlas/protocol/openid-connect/auth',
      { waitUntil: 'networkidle', timeout: 60000 }
    );

    // ۲) پر کردن ایمیل و پسورد (selector جدید)
    await page.waitForSelector('input[name="username"]', { timeout: 60000 });
    await page.fill('input[name="username"]', 'ozbajik@telegmail.com');

    await page.waitForSelector('input[name="password"]', { timeout: 60000 });
    await page.fill('input[name="password"]', '123456Negar@');

    // ۳) کلیک دکمه Submit
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 60000 });

    // ۴) رفتن به صفحه رزرو وقت
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
