import { useState, useEffect } from 'react'
import './App.css'
import { GearIcon, BagIcon, SuccessIcon, ErrorIcon, InfoIcon, CheckIcon, WarningIcon, LightIcon } from './icons'

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
  const [notification, setNotification] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Quota cooldown (timestamp ms) when exceeding API limit
  const [quotaCooldown, setQuotaCooldown] = useState<number | null>(null);

  // Debugging (hidden): press Shift+D to toggle
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{ response?: any; aiResult?: any; aiError?: string } | null>(null);

  const MAX_REVIEWS = 20;
  const MAX_LENGTH = 300;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 'd') setDebugOpen(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  const handleSetApiKey = async () => {
    console.log('[App] handleSetApiKey called, input length:', apiKeyInput.length);
    if (!apiKeyInput.trim()) {
      alert('Please enter an API key');
      return;
    }
    console.log('[App] Sending SET_GEMINI_API_KEY message');
    chrome.runtime.sendMessage({ action: 'SET_GEMINI_API_KEY', apiKey: apiKeyInput }, (response) => {
      console.log('[App] SET_GEMINI_API_KEY response:', response);
      if (response?.success) {
        alert('✓ API key saved! You can now analyze products.');
        setApiKeyInput('');
        setShowApiKeyInput(false);
      } else {
        alert('Failed to save API key: ' + (response?.error || 'Unknown error'));
      }
    });
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
  const getHost = (link?: string) => {
    if (!link) return '';
    try {
      return new URL(link).hostname.replace(/^www\./i, '');
    } catch {
      try {
        const m = String(link).match(/https?:\/\/([^\/]+)/i);
        if (m && m[1]) return m[1].replace(/^www\./i, '');
      } catch { }
      return String(link);
    }
  };


  const callGeminiAI = async (productName: string, reviews: string[]) => {
    // Use background script to fetch (has proper host permissions)
    return new Promise<AnalysisResult>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'CALL_GEMINI_AI', productName, reviews },
        (response: any) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Background script error'));
          } else if (response?.success) {
            resolve(response.data as AnalysisResult);
          } else {
            reject(new Error(response?.error || 'Unknown error'));
          }
        }
      );
    });
  };

  const analyzeProduct = async () => {
    setLoading(true);
    setResult(null);
    setSimilarProducts([]);
    // setSimilarChecked(false); // รีเซ็ตการตรวจสอบสินค้าใกล้เคียงแต่ละรอบ

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (loading) return;


    if (tab?.id) {
      // ส่งคำสั่งไปหา content.ts เพื่อดูดข้อมูลรีวิว
      chrome.tabs.sendMessage(tab.id, { action: "ANALYZE_REVIEWS" }, async (response) => {
        console.log('ANALYZE_REVIEWS response:', response);
        if (response) {
          // capture content response for debugging
          setDebugInfo(prev => ({ ...(prev || {}), response }));

          // Compute deduped similar products locally (store in state for UI)
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
          // Prepare limited reviews and cache key
          const limitedReviews = response.reviews
            .slice(0, MAX_REVIEWS)
            .map((r: string) => r.slice(0, MAX_LENGTH));

          const cacheKey = `analysis_${tab?.url}`;
          try {
            const cached = await chrome.storage.local.get(cacheKey);
            if (cached && cached[cacheKey]) {
              setResult(cached[cacheKey] as AnalysisResult);
              showNotification('info', 'โหลดจากแคช ไม่เรียก AI');
              setLoading(false);
              return;
            }
          } catch (e) {
            // ignore storage errors and continue
            console.warn('Storage read failed', e);
          }

          try {
            const aiResult = await callGeminiAI(response.name, limitedReviews);
            console.debug('AI raw result:', aiResult);
            setDebugInfo(prev => ({ ...(prev || {}), aiResult }));

            // Normalize AI output to ensure pros/cons arrays and a readable verdict
            const normalized: AnalysisResult = {
              pros: Array.isArray(aiResult.pros) && aiResult.pros.length ? aiResult.pros : ['ไม่พบข้อดีที่ชัดเจนจากรีวิว'],
              cons: Array.isArray(aiResult.cons) && aiResult.cons.length ? aiResult.cons : ['ไม่พบข้อเสียที่ชัดเจนจากรีวิว'],
              verdict: typeof aiResult.verdict === 'string' && aiResult.verdict.trim() ? aiResult.verdict : 'ไม่สามารถสรุปได้'
            };

            setResult(normalized);
            // cache result
            try { await chrome.storage.local.set({ [cacheKey]: normalized }); } catch (e) { /* ignore */ }

            if ((Array.isArray(aiResult.pros) && aiResult.pros.length === 0) && (Array.isArray(aiResult.cons) && aiResult.cons.length === 0)) {
              showNotification('info', 'AI ให้คำตอบแต่ไม่พบข้อดี/ข้อเสียที่ชัดเจน — จะแสดงผล fallback');
            } else {
              showNotification('success', 'วิเคราะห์สำเร็จ — ดูผลลัพธ์ด้านล่าง');
            }
          } catch (error: any) {
            console.error("AI Analysis Failed:", error);
            const msg: string = (error && error.message) ? String(error.message) : '';
            setDebugInfo(prev => ({ ...(prev || {}), aiError: msg }));

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
        } else if (response && response.fallback && response.fallback.length > 0) {
          // If no direct reviews, try summarizing from product description / meta as fallback
          showNotification('info', 'ไม่พบรีวิวโดยตรง — สรุปจากรายละเอียดสินค้าแทน');
          try {
            const limitedFallback = response.fallback.slice(0, MAX_REVIEWS).map((r: string) => r.slice(0, MAX_LENGTH));
            const cacheKey = `analysis_${tab?.url}`;
            try {
              const cached = await chrome.storage.local.get(cacheKey);
              if (cached && cached[cacheKey]) {
                setResult(cached[cacheKey] as AnalysisResult);
                showNotification('info', 'โหลดจากแคช ไม่เรียก AI');
                setLoading(false);
                return;
              }
            } catch (e) { console.warn('Storage read failed', e); }

            const aiResult = await callGeminiAI(response.name + ' (สรุปจากรายละเอียดสินค้า)', limitedFallback);
            console.debug('AI raw result (fallback):', aiResult);
            setDebugInfo(prev => ({ ...(prev || {}), aiResult }));

            const normalized: AnalysisResult = {
              pros: Array.isArray(aiResult.pros) && aiResult.pros.length ? aiResult.pros : ['ไม่พบข้อดีที่ชัดเจนจากเนื้อหา'],
              cons: Array.isArray(aiResult.cons) && aiResult.cons.length ? aiResult.cons : ['ไม่พบข้อเสียที่ชัดเจนจากเนื้อหา'],
              verdict: typeof aiResult.verdict === 'string' && aiResult.verdict.trim() ? aiResult.verdict : 'ไม่สามารถสรุปได้'
            };

            setResult(normalized);
            try { await chrome.storage.local.set({ [cacheKey]: normalized }); } catch (e) { /* ignore */ }
            showNotification('success', 'สรุปจากรายละเอียดสินค้าเรียบร้อย — ตรวจสอบผลได้ด้านล่าง');
          } catch (error: any) {
            console.error('AI Fallback Failed:', error);
            const msg: string = (error && error.message) ? String(error.message) : '';
            setDebugInfo(prev => ({ ...(prev || {}), aiError: msg }));
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
      {/* API Key Setup - Always visible if not set */}
      {showApiKeyInput && (
        <div style={{ padding: '12px', backgroundColor: 'rgba(79,70,229,0.1)', borderBottom: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600 }}>Enter Gemini API Key:</div>
          <input
            autoFocus
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSetApiKey()}
            placeholder="Paste your Gemini API key here"
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSetApiKey} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: 'var(--success)', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Save Key</button>
            <button onClick={() => { setShowApiKeyInput(false); setApiKeyInput(''); }} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
          </div>
        </div>
      )}

      {!showApiKeyInput && (
        <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', borderBottom: '1px solid var(--border-soft)' }}>
          <button onClick={() => setShowApiKeyInput(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px' }}>⚙️ Set API Key</button>
        </div>
      )}

      <header className="header">
        <div className="header-content">
          <button
            onClick={analyzeProduct}
            disabled={loading || Boolean(quotaCooldown && Date.now() < quotaCooldown)}
            className="analyze-button header-analyze"
            aria-label="วิเคราะห์"
          >
            <span className="button-icon">{loading ? <GearIcon /> : <BagIcon />}</span>
            <span className="button-text">
              {loading ? 'กำลังวิเคราะห์...' : (quotaCooldown && Date.now() < quotaCooldown) ? `ลองอีกครั้งใน ${Math.ceil((quotaCooldown - Date.now()) / 1000)} วินาที` : 'วิเคราะห์'}
            </span>
          </button>
        </div>
      </header>

      {/* Quick status for debugging message delivery */}
      <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
        {debugInfo?.response ? (
          <div>Received content script response — reviews: {Array.isArray(debugInfo.response.reviews) ? debugInfo.response.reviews.length : 0}, fallback: {Array.isArray(debugInfo.response.fallback) ? debugInfo.response.fallback.length : 0}, similar: {Array.isArray(debugInfo.response.similarProducts) ? debugInfo.response.similarProducts.length : 0}</div>
        ) : (
          <div>No content response yet — ensure you're on a supported product page (Shopee/Lazada) and try again.</div>
        )}
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className={`toast ${notification.type}`} role="status" aria-live="polite">
          <div className="toast-icon">{notification.type === 'success' ? <SuccessIcon /> : notification.type === 'error' ? <ErrorIcon /> : <InfoIcon />}</div>
          <div className="toast-message">{notification.message}</div>
          <button className="toast-close" aria-label="ปิด" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      <div className="main-content">


        {/* Quota note */}
        {quotaCooldown && Date.now() < quotaCooldown && (
          <div className="quota-note">
            เกินโควต้า API — กรุณาลองอีกครั้งใน {Math.ceil((quotaCooldown - Date.now()) / 1000)} วินาที หรือดูรายละเอียดที่ <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer">เอกสาร</a>
          </div>
        )}

        {result && (
          <div className={`results-and-similar single-column`}>
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
          </div>
        )}

        {debugOpen && (
          <div className="debug-panel" role="region" aria-label="Debug" tabIndex={0}>
            <div className="debug-header">Debug (กด Shift+D เพื่อสลับ)</div>
            <pre className="debug-pre">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}

        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-header">
              <h4 className="footer-title">สินค้าใกล้เคียง</h4>
              <span className="count-badge" aria-hidden>{similarProducts.length}</span>
            </div>

            {similarProducts.length === 0 && (
              <div className="similar-empty">ไม่พบสินค้าใกล้เคียงบนหน้านี้</div>
            )}

            {similarProducts.length > 0 && (
              <div className="similar-grid footer-grid">
                {similarProducts.map((p, i) => (
                  <div key={i} className="product-card-small" onClick={() => p.link && chrome.tabs.create({ url: p.link })} role="link" tabIndex={0}>
                    <div className="product-thumb-small">
                      {p.image ? <img src={p.image} alt={p.name} /> : <div className="thumb-placeholder-small">🛒</div>}
                    </div>
                    <div className="product-info-small">
                      <div className="product-name-compact clamp-2" title={p.name}>{p.name}</div>
                      {p.link && <div className="product-source-compact">{getHost(p.link)}</div>}
                      <div className="product-price-compact">{p.price || '-'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </footer>

      </div>
    </div>
  )
}

export default App