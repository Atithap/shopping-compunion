🛍️ Shopping Compunion AI

Chrome Extension สำหรับวิเคราะห์รีวิวสินค้าอัตโนมัติด้วย Gemini AI
สรุป ข้อดี (Pros), ข้อเสีย (Cons) และ คำแนะนำ (Verdict) เป็นภาษาไทย

รองรับแพลตฟอร์มอีคอมเมิร์ซ เช่น Shopee และ Lazada

✨ Features

วิเคราะห์รีวิวสินค้าจากหน้าเว็บโดยตรง

สรุปผลเป็นภาษาไทย 100%

Structured JSON output (ไม่มี parse error)

แสดงสินค้าใกล้เคียง

ระบบ cache ลดการเรียก API ซ้ำ

ตรวจจับ quota limit และ cooldown อัตโนมัติ

Debug panel (Shift + D)

🏗 Tech Stack

React

TypeScript

Vite

Chrome Extension Manifest V3

Gemini API (Google Generative Language API)

🚀 Installation (Development)
1️⃣ Clone โปรเจกต์
git clone https://github.com/Atithap/shopping-compunion.git
cd shopping-compunion-ai

2️⃣ Install dependencies
npm install

3️⃣ Build
npm run build


ไฟล์ที่ build แล้วจะอยู่ในโฟลเดอร์:

dist/

🧩 Load Extension ใน Chrome

เปิด Chrome

ไปที่ chrome://extensions/

เปิด Developer Mode

กด Load unpacked

เลือกโฟลเดอร์ dist

เสร็จแล้ว extension จะพร้อมใช้งาน

🔑 ตั้งค่า Gemini API Key

เปิด extension popup

กด ⚙️ Set API Key

วาง Gemini API key

กด Save