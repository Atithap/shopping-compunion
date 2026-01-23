import { useState } from 'react'
import './App.css'

interface AnalysisResult {
  pros: string[];
  cons: string[];
  verdict: string;
}

function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const callGeminiAI = async (productName: string, reviews: string[]) => {
    // 1. นำ API Key ตัวใหม่ที่ลงท้ายด้วย ...KmQY มาใส่ตรงนี้
    const API_KEY = "AIzaSyBC3CHyGjBocVwv_kt-9sgPpEwRwtPKmQY";

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

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.id) {
      // ส่งคำสั่งไปหา content.ts เพื่อดูดข้อมูลรีวิว
      chrome.tabs.sendMessage(tab.id, { action: "ANALYZE_REVIEWS" }, async (response) => {
        if (response && response.reviews && response.reviews.length > 0) {
          try {
            const aiResult = await callGeminiAI(response.name, response.reviews);
            setResult(aiResult);
          } catch (error: any) {
            console.error("AI Analysis Failed:", error);
            alert("❌ วิเคราะห์ไม่สำเร็จ: " + error.message);
          }
        } else {
          alert("🔍 ไม่พบข้อมูลรีวิว! โปรดเลื่อนหน้าจอลงไปให้เห็นรีวิวบนเว็บก่อนกดปุ่มนี้");
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
            <span className="logo-icon">🛍️</span>
            <div>
              <h1 className="app-title">Shopping Companion</h1>
              <p className="app-subtitle">AI-Powered Review Analysis</p>
            </div>
          </div>
          <span className="ai-badge">✨ AI</span>
        </div>
      </header>

      <div className="main-content">
        <button
          onClick={analyzeProduct}
          disabled={loading}
          className="analyze-button"
        >
          <span className="button-icon">{loading ? '⚙️' : '🤖'}</span>
          <span className="button-text">{loading ? 'Analyzing...' : 'Analyze Reviews'}</span>
        </button>

        {result && (
          <div className="results-container">
            <div className="result-card pros-card">
              <div className="card-header">
                <span className="card-icon">✅</span>
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
                <span className="card-icon">⚠️</span>
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
                <span className="card-icon">💡</span>
                <h3 className="card-title">Verdict</h3>
              </div>
              <p className="verdict-text">{result.verdict}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App