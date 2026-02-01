import { useState, useEffect } from 'react'
import './App.css'
import { CartIcon, GearIcon, BagIcon, SuccessIcon, ErrorIcon, InfoIcon, CheckIcon, WarningIcon, LightIcon } from './icons'

interface AnalysisResult {
  pros: string[];
  cons: string[];
  verdict: string;
}

function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  interface SimilarProduct {
    name: string;
    price?: string;
    link?: string;
    image?: string;
  }

  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [similarChecked, setSimilarChecked] = useState(false);
  const [notification, setNotification] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);

  // Quota cooldown (timestamp ms) when exceeding API limit
  const [quotaCooldown, setQuotaCooldown] = useState<number | null>(null);

  useEffect(() => {
    if (!quotaCooldown) return;
    const id = setInterval(() => {
      if (Date.now() >= quotaCooldown) setQuotaCooldown(null);
    }, 1000);
    return () => clearInterval(id);
  }, [quotaCooldown]);

  const showNotification = (type: 'info' | 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const dedupeProducts = (items: SimilarProduct[]) => {
    const map = new Map<string, SimilarProduct>();
    for (const it of items) {
      const key = it.link || it.name;
      if (!map.has(key)) map.set(key, it);
    }
    return Array.from(map.values());
  };





  // Safe hostname extractor for display (returns domain without www.)
  const getHost = (link: string | undefined) => {
    if (!link) return '';
    try {
      const url = new URL(link);
      return url.hostname.replace(/^www\./i, '');
    } catch {
      try { const m = String(link).match(/https?:\/\/([^\/]+)/i); if (m && m[1]) return m[1].replace(/^www\./i, ''); } catch {}
      return link;
    }
  };

  const callGeminiAI = async (productName: string, reviews: string[]) => {
    // 1. นำ API Key ตัวใหม่ที่ลงท้ายด้วย ...KmQY มาใส่ตรงนี้
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    // 2. ใช้ชื่อโมเดลแบบ Full ID สำหรับรุ่น Flash (เสถียรที่สุดสำหรับ Free Tier)
    const MODEL = "models/gemini-2.5-flash";
    const URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${API_KEY}`;

    const promptText = `
      ในฐานะผู้เชี่ยวชาญด้านสินค้า จงสรุปรีวิวจากผู้ซื้อสินค้า: "${productName}"
      โดยวิเคราะห์จากรีวิวเหล่านี้: ${reviews.join(" | ")}

      ตอบกลับเป็น JSON ภาษาไทยเท่านั้น (ห้ามมีคำเกริ่น):
      {
        "pros": ["สรุปข้อดีเป็นข้อๆ"],
        "cons": ["สรุปข้อเสียหรือปัญหาที่พบ"],
        "verdict": "สรุปสั้นๆ ว่าน่าซื้อหรือไม่"
      }
    `;

    const requestBody = {
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    const response = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    // ตรวจสอบสถานะการตอบกลับ
    if (!response.ok) {
      const errorData = await response.json();
      const errorMsg = errorData.error?.message || "Unknown API Error";

      // ถ้ายังเจอ 404 ให้แจ้งเตือนผู้ใช้ว่าอาจต้องเปลี่ยนชื่อโมเดล
      if (response.status === 404) {
        throw new Error("ไม่พบรุ่นโมเดล (404) ");
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();

    // ตรวจสอบว่ามีข้อมูลตอบกลับมาไหม
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("AI ไม่สามารถให้คำตอบได้ในขณะนี้");
    }

    const aiText = data.candidates[0].content.parts[0].text;
    return JSON.parse(aiText) as AnalysisResult;
  };

  const analyzeProduct = async () => {
    setLoading(true);
    setResult(null);
    setSimilarChecked(false); // รีเซ็ตการตรวจสอบสินค้าใกล้เคียงแต่ละรอบ

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.id) {
      // ส่งคำสั่งไปหา content.ts เพื่อดูดข้อมูลรีวิว
      chrome.tabs.sendMessage(tab.id, { action: "ANALYZE_REVIEWS" }, async (response) => {
        console.log('ANALYZE_REVIEWS response:', response);
        if (response) {
          setSimilarChecked(true);
          const items = dedupeProducts(response.similarProducts || []);
          setSimilarProducts(items);
          console.debug('สินค้าใกล้เคียง (หลังตั้งค่า):', items.length);
          if (items.length > 0) {
            showNotification('success', `พบ ${items.length} สินค้าใกล้เคียง`);
          } else {
            showNotification('info', 'ไม่พบสินค้าใกล้เคียง — ลองกดรีเฟรชเพื่อค้นหาอีกครั้ง');
          }
        }

        if (response && response.reviews && response.reviews.length > 0) {
          try {
            const aiResult = await callGeminiAI(response.name, response.reviews);
            setResult(aiResult);
            showNotification('success', 'วิเคราะห์สำเร็จ — ดูผลลัพธ์ด้านล่าง');
          } catch (error: any) {
            console.error("AI Analysis Failed:", error);
            const msg: string = (error && error.message) ? String(error.message) : '';

            // Detect quota error from Gemini API and set cooldown
            if (/quota/i.test(msg) || msg.includes('Quota exceeded') || msg.includes('rate-limits')) {
              const match = msg.match(/Please retry in\s*([0-9.]+)s/i);
              if (match) {
                const secs = Math.max(1, Math.ceil(parseFloat(match[1])));
                setQuotaCooldown(Date.now() + secs * 1000);
                showNotification('error', `เกินโควต้า API — กรุณาลองอีกครั้งใน ${secs} วินาที หรือตรวจสอบแผนที่ https://ai.google.dev/gemini-api/docs/rate-limits`);
              } else {
                showNotification('error', 'เกินโควต้า API — โปรดตรวจสอบแผนและการชำระเงิน: https://ai.google.dev/gemini-api/docs/rate-limits');
              }
            } else {
              showNotification('error', 'เกิดข้อผิดพลาดขณะวิเคราะห์: ' + (msg || 'ไม่ทราบสาเหตุ'));
            }
          }
        } else {
          showNotification('info', 'ไม่พบรีวิว — โปรดเลื่อนหน้าจอไปยังส่วนรีวิวบนหน้าเว็บแล้วลองอีกครั้ง');
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">

          <div className="logo-section">
            <span className="logo-icon"><CartIcon /></span>
            <div>
              <h1 className="app-title">Shopping Companion</h1>
            </div>
          </div>

        </div>
      </header>

      {/* Toast Notification */}
      {notification && (
        <div className={`toast ${notification.type}`} role="status" aria-live="polite">
          <div className="toast-icon">{notification.type === 'success' ? <SuccessIcon /> : notification.type === 'error' ? <ErrorIcon /> : <InfoIcon />}</div>
          <div className="toast-message">{notification.message}</div>
          <button className="toast-close" aria-label="ปิด" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      <div className="main-content">
        <button
          onClick={analyzeProduct}
          disabled={loading || Boolean(quotaCooldown && Date.now() < quotaCooldown)}
          className="analyze-button"
        >
          <span className="button-icon">{loading ? <GearIcon /> : <BagIcon />}</span>
          <span className="button-text">
            {loading ? 'กำลังวิเคราะห์...' : (quotaCooldown && Date.now() < quotaCooldown) ? `ลองอีกครั้งใน ${Math.ceil((quotaCooldown - Date.now())/1000)} วินาที` : 'วิเคราะห์รีวิว'}
          </span>
        </button>

        {/* Quota note */}
        {quotaCooldown && Date.now() < quotaCooldown && (
          <div className="quota-note">
            เกินโควต้า API — กรุณาลองอีกครั้งใน {Math.ceil((quotaCooldown - Date.now())/1000)} วินาที หรือดูรายละเอียดที่ <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer">เอกสาร</a>
          </div>
        )}

        {result && (
          <div className="results-container">
            <div className="result-card pros-card">
              <div className="card-header">
                <span className="card-icon"><CheckIcon /></span>
                <h3 className="card-title">Pros</h3>
              </div>
              <ul className="card-list">
                {result.pros.map((p, i) => (
                  <li key={i} className="list-item">
                    <span className="list-dot">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="result-card cons-card">
              <div className="card-header">
                <span className="card-icon"><WarningIcon /></span>
                <h3 className="card-title">Cons</h3>
              </div>
              <ul className="card-list">
                {result.cons.map((c, i) => (
                  <li key={i} className="list-item">
                    <span className="list-dot">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <div className="result-card verdict-card">
              <div className="card-header">
                <span className="card-icon"><LightIcon /></span>
                <h3 className="card-title">Verdict</h3>
              </div>
              <p className="verdict-text">{result.verdict}</p>
            </div>
          </div>
        )}

        <div className="similar-section">
          <div className="section-header">
            <div className="section-left">
              <h3 className="section-title">สินค้าใกล้เคียง</h3>
              <span className="count-badge" aria-hidden>{similarProducts.length}</span>
            </div>

          </div>

          {similarProducts.length === 0 && similarChecked && (
            <div className="similar-empty">ไม่พบสินค้าใกล้เคียงบนหน้านี้</div>
          )}

          {similarProducts.length === 0 && !similarChecked && (
            <div className="similar-empty">ยังไม่ได้ค้นหาสินค้าใกล้เคียง </div>
          )}

          {similarProducts.length > 0 && (
            <div className="similar-grid similar-list-compact">
              {similarProducts.map((p, i) => (
                <div
                  key={i}
                  className="product-row"
                  role="link"
                  tabIndex={0}
                  onClick={() => p.link && chrome.tabs.create({ url: p.link })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.link && chrome.tabs.create({ url: p.link }); } }}
                >
                  <div className="product-thumb-small">
                    {p.image ? <img src={p.image} alt={p.name} /> : <div className="thumb-placeholder-small">🛒</div>}
                  </div>

                  <div className="product-main">
                    <div className="product-name-compact clamp-2" title={p.name}>{p.name}</div>
                    {p.link && <div className="product-source-compact">{getHost(p.link)}</div>}
                  </div>

                  <div className="product-right">
                    <div className="product-price-compact">{p.price || '-'}</div>
                    {p.link && <button className="product-action small" onClick={(e) => { e.stopPropagation(); chrome.tabs.create({ url: p.link }); }}>ดู</button>}
                  </div>
                </div>
              ))}
            </div>
          )}


        </div>

      </div>
    </div>
  )
}

export default App