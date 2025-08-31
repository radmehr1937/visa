import express from 'express';
import { chromium } from 'playwright-chromium';

const app = express();
const PORT = process.env.PORT || 3000;

// 🔑 مشخصات پروکسی BrightData Unlocker
const PROXY_SERVER = 'http://brd.superproxy.io:33335';
const PROXY_USERNAME = 'brd-customer-hl_554193fc-zone-web_unlocker1';
const PROXY_PASSWORD = '4jh6yy6g6e0r';

// 🎛️ فلگ‌های لازم برای اجرا در سرور ابری
const CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-zygote',
  '--single-process',
  '--disable-gpu',
  '--ignore-certificate-errors'
];

// تابع ساخت browser و page
async function newPage() {
  const browser = await chromium.launch({
    headless: true,
    proxy: {
      server: PROXY_SERVER,
      username: PROXY_USERNAME,
      password: PROXY_PASSWORD
    },
    args: CHROMIUM_ARGS,
  });

  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  return { browser, page };
}

// 🏠 root
app.get('/', (req, res) => {
  res.send('✅ Visa Checker running with BrightData Web Unlocker (direct Iran URL)');
});

// 📌 نمایش آی‌پی
app.get('/myip', async (req, res) => {
  try {
    const { browser, page } = await newPage();
    await page.goto('https://api.ipify.org/?format=json',
      { waitUntil: 'domcontentloaded', timeout: 60000 });
    const body = await page.textContent('body');
    await browser.close();
    res.type('json').send(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 تست صفحه اصلی TLSContact (مستقیم ایران)
app.get('/test-home', async (req, res) => {
  try {
    const { browser, page } = await newPage();

    // ✅ مستقیماً برو روی صفحه ایران
    await page.goto('https://visas-de.tlscontact.com/en-us/country/ir/vac/irTHR2de', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    const url = page.url();
    const html = await page.content();

    await browser.close();
    res.json({
      final_url: url,
      snippet: html.substring(0, 1000),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 Debug صفحه لاگین
app.get('/debug-login', async (req, res) => {
  try {
    const { browser, page } = await newPage();
    await page.goto(
      'https://auth.visas-de.tlscontact.com/auth/realms/atlas/protocol/openid-connect/auth',
      { waitUntil: 'networkidle', timeout: 60000 }
    );
    const url = page.url();
    const html = await page.content();
    await browser.close();
    res.json({
      final_url: url,
      snippet: html.substring(0, 1000)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 بررسی وقت TLSContact
app.get('/check', async (req, res) => {
  try {
    const { browser, page } = await newPage();

    // ورود به صفحه لاگین
    await page.goto(
      'https://auth.visas-de.tlscontact.com/auth/realms/atlas/protocol/openid-connect/auth',
      { waitUntil: 'networkidle', timeout: 60000 }
    );

    // پر کردن فرم لاگین
    await page.waitForSelector('input[name="username"]', { timeout: 60000 });
    await page.fill('input[name="username"]', 'ozbajik@telegmail.com');

    await page.waitForSelector('input[name="password"]', { timeout: 60000 });
    await page.fill('input[name="password"]', '123456Negar@');

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 60000 });

    // ✅ مستقیماً برو به صفحه وقت ایران
    await page.goto(
      'https://visas-de.tlscontact.com/en-us/country/ir/vac/irTHR2de',
      { waitUntil: 'domcontentloaded', timeout: 60000 }
    );

    // بررسی دکمه رزرو
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
