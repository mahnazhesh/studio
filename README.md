# فروشگاه کانفیگ V2Ray با پرداخت Plisio و بک‌اند Google Apps Script

این یک پروژه کامل Next.js برای فروش کانفیگ‌های V2Ray است که از Plisio برای پردازش پرداخت با لایت‌کوین (LTC) و از Google Apps Script به عنوان یک بک‌اند ساده برای مدیریت موجودی و ارسال ایمیل استفاده می‌کند.

---

## راهنمای راه‌اندازی (Setup)

برای راه‌اندازی کامل این پروژه، لطفاً مراحل زیر را با دقت دنبال کنید.

### مرحله اول: راه‌اندازی بک‌اند با Google Apps Script

بک‌اند این پروژه یک گوگل شیت (Google Sheet) است که توسط یک اسکریپت (Apps Script) مدیریت می‌شود.

**۱. ایجاد گوگل شیت:**
   - یک [گوگل شیت جدید](https://sheets.new) بسازید.
   - در ردیف اول شیت، **دقیقاً** این سه عنوان را برای ستون‌ها وارد کنید:
     - `productName` (در ستون A)
     - `emailBody` (در ستون B)
     - `priceUSD` (در ستون C)

**۲. وارد کردن داده‌ها:**
   - **productName:** نام محصول خود را وارد کنید (مثلاً `V2Ray Config`). اگر این سلول را خالی بگذارید، از مقدار ردیف بالایی استفاده می‌شود.
   - **emailBody:** کانفیگ V2Ray (یا هر متنی که می‌خواهید برای مشتری ایمیل شود) را در این ستون قرار دهید.
   - **priceUSD:** قیمت محصول را به دلار آمریکا و به صورت عدد (مثلاً `2.5`) وارد کنید.

**۳. ایجاد Google Apps Script:**
   - در منوی بالای گوگل شیت، به `Extensions` > `Apps Script` بروید.
   - تمام محتوای فایل `Code.gs` را پاک کرده و کد زیر را در آن کپی کنید.

   ```javascript
    // --- CONFIGURATION ---
    // 1. ID گوگل شیت خود را اینجا قرار دهید. (از URL کپی کنید)
    const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
    // 2. نام شیتی که اطلاعات در آن است.
    const SHEET_NAME = 'Sheet1';
    // 3. نام دقیق ستون‌ها در شیت شما (حساس به حروف بزرگ و کوچک)
    const PRODUCT_NAME_COL = 'productName';
    const EMAIL_BODY_COL = 'emailBody';
    const PRICE_USD_COL = 'priceUSD';
    // 4. نامی که به عنوان فرستنده در ایمیل نمایش داده می‌شود
    const EMAIL_SENDER_NAME = 'فروشگاه V2Ray';

    /**
     * Main function to handle GET requests from your web app.
     * It routes requests to the appropriate handler based on the 'action' parameter.
     */
    function doGet(e) {
      if (!e || !e.parameter || !e.parameter.action) {
        return createJsonResponse({ error: "Action parameter is missing." }, 400);
      }

      // Use a script lock to prevent race conditions (e.g., selling the same item twice)
      const lock = LockService.getScriptLock();
      lock.waitLock(30000); // Wait up to 30 seconds for other processes to finish

      try {
        const action = e.parameter.action;
        const productName = e.parameter.productName;
        const userEmail = e.parameter.userEmail;

        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
        if (!sheet) {
          return createJsonResponse({ error: 'Sheet not found. Check SHEET_NAME in script.' }, 404);
        }
        
        // --- Action Routing ---
        switch (action) {
          case 'getInfo':
            return handleGetInfo(sheet, productName);
          
          case 'sendSuccessEmail':
            if (!userEmail || !productName) {
              return createJsonResponse({ error: 'userEmail and productName are required for this action.'}, 400);
            }
            return handleSendSuccessEmail(sheet, productName, userEmail);

          default:
            return createJsonResponse({ error: 'Invalid action specified.' }, 400);
        }

      } catch (error) {
        Logger.log('Global Error:', error);
        return createJsonResponse({ error: 'An internal script error occurred.', details: error.message }, 500);
      } finally {
        lock.releaseLock();
      }
    }

    // --- Action Handlers ---

    /**
     * Gets the price and stock count for a given product.
     */
    function handleGetInfo(sheet, requestedProduct) {
      if (!requestedProduct) {
         return createJsonResponse({ error: 'productName parameter is required for getInfo action.' }, 400);
      }
      const { stockCount, firstPrice } = getStockInfo(sheet, requestedProduct);
      return createJsonResponse({ price: firstPrice, stock: stockCount });
    }

    /**
     * Finds an available config, sends it via email, and deletes the row from the sheet.
     */
    function handleSendSuccessEmail(sheet, requestedProduct, userEmail) {
      const { values, productNameIndex, emailBodyIndex } = getSheetData(sheet);
      
      let lastProductName = "";
      // Find the first available product that matches
      for (let i = 0; i < values.length; i++) {
        let currentProductName = values[i][productNameIndex];
        const emailBodyContent = values[i][emailBodyIndex];
        
        if (!currentProductName) currentProductName = lastProductName;
        else lastProductName = currentProductName;
        
        if (currentProductName === requestedProduct && emailBodyContent && emailBodyContent.toString().trim() !== "") {
          const rowIndexToDelete = i + 2; // +1 for zero-index, +1 for header row
          
          const subject = `کانفیگ V2Ray شما آماده است`;
          const htmlBody = `
              <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
                  <p>با تشکر از خرید شما،</p>
                  <p>کانفیگ V2Ray شما در زیر آماده استفاده است:</p>
                  <pre style="background-color: #f4f4f4; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: left; direction: ltr; white-space: pre-wrap; word-wrap: break-word;">${emailBodyContent}</pre>
                  <p>با احترام،<br/>${EMAIL_SENDER_NAME}</p>
              </div>`;

          // Send the email
          MailApp.sendEmail({
              to: userEmail,
              subject: subject,
              htmlBody: htmlBody,
              name: EMAIL_SENDER_NAME
          });
          
          // Delete the row from the sheet ONLY after successful email sending
          sheet.deleteRow(rowIndexToDelete);
          
          return createJsonResponse({ status: 'success', message: 'Email sent and config has been delivered.' });
        }
      }

      // If the loop finishes without finding a product
      Logger.log(`Failed to find stock for ${requestedProduct} for user ${userEmail}. It might have been sold out between checking and buying.`);
      return createJsonResponse({ error: 'موجودی محصول به اتمام رسیده است.' }, 404);
    }


    // --- Helper Functions ---

    /**
     * Reads the basic data structure from the sheet.
     */
    function getSheetData(sheet) {
        const dataRange = sheet.getDataRange();
        if (dataRange.getNumRows() <= 1) return { values: [], headers: [], productNameIndex: -1, emailBodyIndex: -1, priceUsdIndex: -1 };

        const values = dataRange.getValues();
        const headers = values.shift(); // Remove header row
        const productNameIndex = headers.indexOf(PRODUCT_NAME_COL);
        const emailBodyIndex = headers.indexOf(EMAIL_BODY_COL);
        const priceUsdIndex = headers.indexOf(PRICE_USD_COL);

        if (productNameIndex === -1 || emailBodyIndex === -1 || priceUsdIndex === -1) {
          throw new Error("ستون‌های الزامی (productName, emailBody, priceUSD) در شیت پیدا نشدند.");
        }

        return { values, headers, productNameIndex, emailBodyIndex, priceUsdIndex };
    }

    /**
     * Calculates stock and gets the price for a product.
     */
    function getStockInfo(sheet, requestedProduct) {
        const { values, productNameIndex, emailBodyIndex, priceUsdIndex } = getSheetData(sheet);
        let stockCount = 0;
        let firstPrice = 0;
        let lastProductName = "";

        for (const row of values) {
            let currentProductName = row[productNameIndex];
            const emailBodyContent = row[emailBodyIndex];
            
            if (!currentProductName) currentProductName = lastProductName;
            else lastProductName = currentProductName;

            if (currentProductName === requestedProduct && emailBodyContent && emailBodyContent.toString().trim() !== "") {
                stockCount++;
                if (firstPrice === 0) { // Get price from the first available item
                    firstPrice = parseFloat(row[priceUsdIndex]);
                }
            }
        }
        return { stockCount, firstPrice };
    }

    /**
     * Creates a standardized JSON response object for the web app.
     */
    function createJsonResponse(data) {
      const output = JSON.stringify(data);
      return ContentService.createTextOutput(output)
        .setMimeType(ContentService.MimeType.JSON);
    }
   ```
   
**۴. تنظیم و پابلیش کردن اسکریپت:**
   - **`SPREADSHEET_ID`:** در بالای کد اسکریپت، مقدار `YOUR_SPREADSHEET_ID` را با ID گوگل شیت خودتان جایگزین کنید. (ID را می‌توانید از URL صفحه شیت کپی کنید).
   - **پابلیش (Deploy):**
     - روی دکمه آبی **Deploy** در بالا سمت راست کلیک کرده و **New deployment** را انتخاب کنید.
     - در پنجره باز شده، روی آیکون چرخ‌دنده کنار "Select type" کلیک کرده و **Web app** را انتخاب کنید.
     - در بخش **Who has access**، گزینه **Anyone** را انتخاب کنید.
     - روی **Deploy** کلیک کنید.
     - در اولین بار، گوگل از شما می‌خواهد که دسترسی‌های لازم (برای مدیریت شیت و ارسال ایمیل) را تایید کنید. روی **Authorize access** کلیک کرده و مراحل را دنبال کنید. (ممکن است یک صفحه هشدار "Google hasn't verified this app" نمایش داده شود که باید روی "Advanced" و سپس "Go to (unsafe)" کلیک کنید).
     - پس از اتمام، یک **Web app URL** به شما داده می‌شود. **این URL را کپی کرده و نگه دارید**. این همان `GOOGLE_APPS_SCRIPT_URL` شماست.

### مرحله دوم: راه‌اندازی پروژه Next.js

**۱. نصب پیش‌نیازها:**
   - [Node.js](https://nodejs.org/) را نصب کنید.
   - با استفاده از ترمینال (Command Prompt یا Terminal) دستور `npm install` را در پوشه اصلی پروژه اجرا کنید تا تمام پکیج‌ها نصب شوند.

**۲. ایجاد فایل متغیرهای محیطی (`.env`):**
   - در پوشه اصلی پروژه، یک فایل جدید به نام `.env` بسازید.
   - محتوای زیر را در آن کپی کنید:

   ```env
   # کلید محرمانه API از حساب کاربری Plisio شما
   PLISIO_SECRET_KEY="YOUR_PLISIO_SECRET_KEY"

   # آدرس Web App که از Google Apps Script دریافت کردید
   GOOGLE_APPS_SCRIPT_URL="YOUR_GOOGLE_APPS_SCRIPT_URL"

   # آدرس کامل و نهایی سایت شما (مثلاً بعد از دیپلو در Vercel یا Netlify)
   # این آدرس برای برگشت کاربر از صفحه پرداخت استفاده می‌شود.
   # در حالت تست محلی می‌توانید از http://localhost:3000 استفاده کنید
   NEXT_PUBLIC_APP_URL="https://your-final-site-url.com"
   ```
   
**۳. پر کردن مقادیر `.env`:**
   - `PLISIO_SECRET_KEY`: کلید API خود را از داشبورد Plisio دریافت کرده و اینجا قرار دهید.
   - `GOOGLE_APPS_SCRIPT_URL`: آدرسی که در مرحله قبل از Google Apps Script کپی کردید را اینجا قرار دهید.
   - `NEXT_PUBLIC_APP_URL`: آدرس نهایی سایتتان را وارد کنید.

### مرحله سوم: اجرا و دیپلو

**۱. اجرای محلی (Local):**
   - دستور `npm run dev` را در ترمینال اجرا کنید.
   - سایت شما در آدرس `http://localhost:3000` (یا پورت دیگری) قابل مشاهده خواهد بود.

**۲. دیپلو در Netlify (یا Vercel):**
   - پروژه خود را به یک ریپازیتوری گیت (مانند GitHub) متصل کنید.
   - در داشبورد Netlify/Vercel، پروژه خود را از گیت ایمپورت کنید.
   - **مهم:** متغیرهای محیطی (`PLISIO_SECRET_KEY`, `GOOGLE_APPS_SCRIPT_URL`, `NEXT_PUBLIC_APP_URL`) را در تنظیمات سایت در پنل Netlify/Vercel خود نیز وارد کنید.
   - پروژه را دیپلو کنید. Netlify به طور خودکار فایل `netlify.toml` را شناسایی کرده و تنظیمات را اعمال می‌کند.

اکنون سایت شما آماده به کار است!
