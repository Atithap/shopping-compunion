/// <reference types="chrome"/>

interface AnalysisResult {
    pros: string[];
    cons: string[];
    verdict: string;
}

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Utility: fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(id);
    }
}

/**
 * Call Gemini API safely using structured output
 */
async function callGeminiAPI(
    apiKey: string,
    productName: string,
    reviews: string[]
): Promise<AnalysisResult> {

    const reviewsText = reviews.join("\n");

    const prompt = `
วิเคราะห์รีวิวสินค้าต่อไปนี้:

สินค้า: ${productName}

รีวิว:
${reviewsText}

สรุปข้อดี ข้อเสีย และคำแนะนำสุดท้าย
ตอบเป็นภาษาไทยเท่านั้น
`;

    const body = {
        systemInstruction: {
            parts: [
                {
                    text: "คุณเป็นผู้ช่วยวิเคราะห์รีวิวสินค้า ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอังกฤษ"
                }
            ]
        },
        generationConfig: {
            temperature: 0.2,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
            response_mime_type: "application/json",
            response_schema: {
                type: "object",
                properties: {
                    pros: {
                        type: "array",
                        items: { type: "string" }
                    },
                    cons: {
                        type: "array",
                        items: { type: "string" }
                    },
                    verdict: {
                        type: "string"
                    }
                },
                required: ["pros", "cons", "verdict"]
            }
        },
        contents: [
            {
                parts: [
                    { text: prompt }
                ]
            }
        ]
    };

    const response = await fetchWithTimeout(
        `${GEMINI_ENDPOINT}?key=${apiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${errText}`);
    }

    const data = await response.json();

    if (!data.candidates?.length) {
        console.error("Full Gemini response:", data);
        throw new Error("No candidates returned from Gemini");
    }

    const rawText = data.candidates[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
        console.error("Empty content:", data);
        throw new Error("Gemini returned empty content");
    }

    let parsed: AnalysisResult;

    try {
        parsed = JSON.parse(rawText);
    } catch (err) {
        console.error("Invalid JSON:", rawText);
        throw new Error("Invalid JSON format from AI");
    }

    return parsed;
}

/**
 * Chrome message listener
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

    // Set API Key
    if (message.action === "SET_GEMINI_API_KEY") {
        chrome.storage.local.set({ geminiApiKey: message.apiKey }, () => {
            sendResponse({ success: true });
        });
        return true;
    }

    // Call Gemini
    if (message.action === "CALL_GEMINI_AI") {

        (async () => {
            try {
                const storage = await chrome.storage.local.get<{ geminiApiKey?: string }>("geminiApiKey");
                const geminiApiKey = storage.geminiApiKey;

                if (!geminiApiKey) {
                    throw new Error("Gemini API key not configured.");
                }

                const result = await callGeminiAPI(
                    geminiApiKey,
                    message.productName,
                    message.reviews
                );

                sendResponse({
                    success: true,
                    data: result
                });

            } catch (error: any) {
                console.error("[background] Gemini error:", error);
                sendResponse({
                    success: false,
                    error: error?.message || "Unknown error"
                });
            }
        })();

        return true; // required for async sendResponse
    }

});
