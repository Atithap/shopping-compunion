🛍️ Shopping Compunion AI

Chrome Extension สำหรับวิเคราะห์รีวิวสินค้าอัตโนมัติด้วย Gemini AI
สรุป ข้อดี (Pros), ข้อเสีย (Cons) และ คำแนะนำ (Verdict) เป็นภาษาไทย

รองรับแพลตฟอร์มอีคอมเมิร์ซ เช่น Shopee และ Lazada

✨ **คุณสมบัติหลัก (Features)**

- ดึงรีวิวสินค้าจากหน้าเว็บ Shopee / Lazada โดยตรง (ใช้ heuristic หลากหลายกรณี)
- สรุป **Pros**, **Cons** และ **Verdict** เป็นภาษาไทย 100%
- ผลลัพธ์อยู่ในรูปแบบ JSON ที่แน่นอน (ไม่มี parse error)
- แสดงรายการ "สินค้าใกล้เคียง" พร้อมราคา/รูป/ลิงก์
- ระบบ cache บน Chrome storage เพื่อลดการเรียก API ซ้ำ ๆ
- ตรวจจับโควต้า (quota limit) ของ Gemini แล้วแสดง cooldown อัตโนมัติ
- มีแผง debug (กด **Shift+D**) สำหรับตรวจสอบข้อมูลภายใน

🏗 **สถาปัตยกรรมและเทคโนโลยี**

1. **Popup UI** (React + TypeScript + Vite)
   - จัดการการโต้ตอบผู้ใช้และแสดงผล
   - สื่อสารกับ content script และ background script ผ่าน `chrome.runtime`

2. **Content Script** (`src/content.ts`)
   - ทำงานบนหน้าสินค้า บดรีวิว/ข้อมูลอื่น ๆ
   - ส่งข้อมูลกลับให้ popup เพื่อเริ่มการวิเคราะห์
   - หาสินค้าใกล้เคียงคร่าว ๆ

3. **Background Script** (`src/background.ts`)
   - เก็บ/เรียกใช้ Gemini API key
   - รับข้อมูลรีวิวและเรียก Gemini API
   - จัดการ timeout, error, และโควต้า
   - ส่งผลลัพธ์วิเคราะห์กลับไปยัง popup

4. **Gemini API** (Google Generative Language API)
   - ใช้โมเดล `gemini-2.5-flash`
   - ตั้งค่า `response_schema` เพื่อรับ JSON ที่คาดหวัง

5. **Cache & โควต้า**
   - แคชผลลัพธ์ตาม URL ของแท็บ
   - เมื่อมีโควต้าหมด จะตั้ง cooldown และแจ้งเตือนผู้ใช้

🔧 **Tech stack**

- React, TypeScript, Vite
- Chrome Extension Manifest V3
- Gemini AI (Google Generative Language API)

🚀 **การติดตั้ง (Development)**

```bash
# คลอนโปรเจกต์
git clone https://github.com/Atithap/shopping-compunion.git
cd shopping-compunion-ai

# ติดตั้ง dependencies
npm install

# สร้างไฟล์ build
npm run build
```

ไฟล์ build จะอยู่ในโฟลเดอร์ `dist/`.

🧩 **ทดสอบ Extension บน Chrome**

1. เปิด `chrome://extensions/` ใน Chrome
2. เปิด *Developer mode* (มุมบนขวา)
3. กด **Load unpacked** แล้วเลือกโฟลเดอร์ `dist`
4. Extension จะปรากฏ และพร้อมใช้งานทันที

🔑 **ตั้งค่า Gemini API Key**

1. เปิด Popup ของ extension
2. คลิก `⚙️ Set API Key`
3. วาง API key แล้วกด **Save**

✅ เสร็จ! คุณสามารถเข้าไปที่หน้าสินค้าบน Shopee/Lazada แล้วกดปุ่มวิเคราะห์เพื่อดูผล

---

> 💡 **คำแนะนำเพิ่มเติม**
> - หากไม่เห็นผลลัพธ์ให้ลองรีเฟรชหน้าและเลื่อนไปยังส่วนรีวิว
> - ใช้ Shift+D เพื่อเปิดแผง debug ดูข้อมูลภายใน
> - หากคำสั่ง AI โควต้าหมด จะมีข้อความแจ้งและรอ cooldown ก่อนเรียกอีกครั้ง
