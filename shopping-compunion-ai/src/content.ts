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

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "ANALYZE_REVIEWS") {
        const productName = document.querySelector('h1')?.textContent?.trim() || document.title;
        const reviews = getReviews();

        // ส่งผลลัพธ์กลับไป (แม้จะเป็นอาเรย์ว่าง ก็ส่งไปเพื่อเช็ก)
        sendResponse({
            name: productName,
            reviews: reviews
        });
    }
    return true;
});