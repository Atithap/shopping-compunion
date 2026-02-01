// src/content.ts

const getReviews = (): string[] => {
    const reviewsSet = new Set<string>();

    // เปลี่ยนคำว่า 'ใส่ชื่อคลาสที่คุณเจอที่นี่' เป็นชื่อจริง เช่น '.R9_pS8' (อย่าลืมใส่จุดข้างหน้า)
    const targetClass = '.shopee-product-rating__content';

    // วิธีที่ 1: ดึงจากคลาสที่ระบุ
    document.querySelectorAll(targetClass).forEach(el => {
        if (el.textContent) reviewsSet.add(el.textContent.trim());
    });

    // วิธีที่ 2: ดึงจาก Attribute ที่ Shopee/Lazada มักใช้ (กันเหนียว)
    if (reviewsSet.size === 0) {
        const allSpans = document.querySelectorAll('span, div');
        allSpans.forEach(el => {
            const text = el.textContent?.trim() || "";
            // กรองรีวิวที่ดูเหมือนจะเป็นของจริง (ยาวเกิน 20 ตัวอักษร)
            if (text.length > 20 && text.length < 300) {
                // ตรวจสอบว่าอยู่ในโซนรีวิวหรือไม่ โดยเช็ก parent
                if (el.closest('[class*="rating"], [class*="review"]')) {
                    reviewsSet.add(text);
                }
            }
        });
    }

    return Array.from(reviewsSet).slice(0, 10);
};

// พยายามดึงรายการ "สินค้าใกล้เคียง" จากหน้าเว็บ (heuristic)
const findSimilarProducts = () => {
    const results: Array<{ name: string; link?: string; price?: string; image?: string }> = [];
    const selectors = [
        '[aria-label*="related"]',
        '[class*="related"]',
        '[class*="recommend"]',
        '[class*="similar"]',
        '[data-section*="related"]',
        '.shopee-search-item-result__item',
        '[class*="product"]',
        '[data-item-id]',
        '[data-sku]',
        '.item-card',
        '.card-product'
    ];

    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.querySelectorAll('a').forEach(a => {
                const href = (a as HTMLAnchorElement).href || '';
                let name = a.textContent?.trim() || '';
                // หากชื่อยังไม่ชัด ให้ลองหาจากหัวข้อหรือ alt ของรูปใกล้เคียง
                if (!name) {
                    const img = a.querySelector('img') as HTMLImageElement | null;
                    if (img?.alt) name = img.alt.trim();
                }
                if (href && name.length > 3 && name.length < 140) {
                    // หา price heuristic ใน parent/ancestor
                    let price: string | undefined;
                    const priceSelectors = ['[class*="price"]', '[data-price]', '.price', '.prd-price', '.product-price'];
                    for (const selP of priceSelectors) {
                        const found = a.closest(sel)?.querySelector(selP) as HTMLElement | null;
                        if (found && found.textContent) {
                            const t = found.textContent.trim();
                            if (/\d/.test(t)) { price = t; break; }
                        }
                    }
                    // หา image
                    const img = a.querySelector('img') as HTMLImageElement | null;
                    const image = img?.src || a.closest('div')?.querySelector('img')?.src || undefined;

                    results.push({ name, link: href, price, image });
                }
            });
        });
    });

    // fallback: ค้นหา anchor ที่มี /product หรือ pattern คล้ายกัน
    if (results.length === 0) {
        document.querySelectorAll('a').forEach(a => {
            const href = (a as HTMLAnchorElement).href || '';
            const text = a.textContent?.trim() || '';
            if (href.includes('/product') && text.length > 3 && text.length < 120) {
                results.push({ name: text, link: href });
            }
        });
    }

    // ลบซ้ำและจำกัดจำนวนสูงสุด 6 รายการ
    const map = new Map<string, any>();
    for (const r of results) {
        const key = r.link || r.name;
        if (!map.has(key)) map.set(key, r);
        if (map.size >= 6) break;
    }

    console.log("findSimilarProducts -> returning", Array.from(map.values()));
    return Array.from(map.values());
};

// หากไม่พบรีวิว ให้พยายามดึงข้อความสำคัญจากรายละเอียดสินค้า/meta เพื่อใช้เป็น fallback
const getFallbackTexts = (): string[] => {
    const texts = new Set<string>();

    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim();
    if (ogDesc) texts.add(ogDesc);

    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
    if (metaDesc) texts.add(metaDesc);

    const selectors = ['.product-description', '#product-description', '[id*="description"]', '[class*="description"]', '.description', '.product-detail', '.specs', '.product-specs'];
    for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(el => {
            const t = el.textContent?.trim() || '';
            if (t.length > 40 && t.length < 5000) texts.add(t);
        });
    }

    // paragraphs near the title (take a few long paragraphs)
    const title = document.querySelector('h1');
    if (title) {
        const paras = Array.from(document.querySelectorAll('p'))
            .map(p => p.textContent?.trim() || '')
            .filter(t => t.length > 60)
            .slice(0, 3);
        paras.forEach(p => texts.add(p));
    }

    // กำจัดความยาวเกินและคืนค่าจำนวนจำกัด
    return Array.from(texts).slice(0, 3);
};

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "ANALYZE_REVIEWS") {
        const productName = document.querySelector('h1')?.textContent?.trim() || document.title;
        const reviews = getReviews();
        const similar = findSimilarProducts();
        const fallback = getFallbackTexts();

        // ส่งผลลัพธ์กลับไป (แม้จะเป็นอาเรย์ว่าง ก็ส่งไปเพื่อเช็ก)
        sendResponse({
            name: productName,
            reviews: reviews,
            fallback: fallback,
            similarProducts: similar
        });
    }

    if (request.action === 'FIND_SIMILAR') {
        const similar = findSimilarProducts();
        console.log('content.ts: FIND_SIMILAR ->', similar);
        sendResponse({ similarProducts: similar });
    }

    return true;
});