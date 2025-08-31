# استفاده از ایمیج رسمی Playwright (همه‌ی libهای لازم + Chromium نصب‌شده)
FROM mcr.microsoft.com/playwright:focal

# مسیر کار
WORKDIR /app

# نصب dependency‌ها
COPY package*.json ./
RUN npm install

# کپی کردن سورس‌کد
COPY . .

# ران‌کردن برنامه
CMD ["npm", "start"]
