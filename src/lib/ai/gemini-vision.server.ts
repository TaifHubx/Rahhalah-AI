import { AiError, parseJsonOutput } from "./gateway.server";

/**
 * طبقة اتصال مخصّصة لمهام تحليل الصور فقط (رحّالة AI + تحقيق تحديات التصوير) — تستخدم
 * Google Gemini مباشرة (نموذج Vision حقيقي)، مستقلة تماماً عن gateway.server.ts الذي يخدم
 * توليد الرحلة النصي عبر OpenAI. هذا الفصل مقصود: تحليل الصور "منتج Google" (المشروع مبني
 * على تقنيات Google أصلاً — Maps وPlaces)، بينما توليد الرحلة يبقى على OpenAI المستقر حالياً.
 *
 * يتطلب GEMINI_API_KEY في بيئة السيرفر (.env) — لا علاقة له بـ OPENAI_API_KEY.
 */

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// gemini-flash-latest: اسم مستعار يديره Google نفسه (لا يتجمّد على نسخة مؤرَّخة قد تُهمَل
// فجأة لمستخدمين جدد كما حدث سابقاً مع gemini-1.5-flash/gemini-2.0-flash/gemini-2.5-flash).
export const GEMINI_MODEL = "gemini-flash-latest";

if (process.env["GEMINI_API_KEY"]) {
  console.log(`✔ تم العثور على GEMINI_API_KEY وتحليل الصور جاهز عبر Gemini (${GEMINI_MODEL})`);
}

function friendlyGemini(status: number, body: string) {
  if (status === 401 || status === 403) return "مفتاح GEMINI_API_KEY غير صالح أو منتهي الصلاحية.";
  if (status === 429) return "الطلبات كثيرة الآن على Gemini، جرّب بعد لحظات.";
  if (status === 404) return "نموذج Gemini المطلوب غير متاح حالياً.";
  return `تعذّر تحليل الصورة عبر Gemini (${status}): ${body.slice(0, 300)}`;
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
}

/** يفصل data URL إلى (mimeType, base64 بلا بادئة) كما يتطلبه inline_data في Gemini. */
function splitDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new AiError(400, "صيغة الصورة غير صالحة.");
  return { mimeType: match[1]!, data: match[2]! };
}

/**
 * يرسل صورة + تعليمات إلى Gemini ويعيد نص الرد الخام (متوقَّع JSON دائماً هنا).
 * يفلتر أجزاء "التفكير الداخلي" (thought: true) التي تُخلط أحياناً مع الرد النهائي في
 * نماذج Gemini "المفكّرة" — درس مستفاد من محاولة سابقة، ونُعطّل التفكير أصلاً عبر
 * thinkingBudget: 0 كخط دفاع أول.
 */
export async function callGeminiVision(input: {
  systemInstruction: string;
  userText: string;
  imageDataUrl: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new AiError(500, "مفتاح GEMINI_API_KEY غير مهيّأ — أضفه في .env لتفعيل تحليل الصور.");
  }

  const { mimeType, data } = splitDataUrl(input.imageDataUrl);

  const res = await fetch(`${GEMINI_ENDPOINT_BASE}/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.systemInstruction }] },
      contents: [
        {
          role: "user",
          parts: [{ text: input.userText }, { inlineData: { mimeType, data } }],
        },
      ],
      // بلا responseMimeType ولا thinkingConfig هنا عمداً — تأكّد بدليل مباشر من سجل التشغيل
      // أن thinkingConfig تحديداً هو ما يسبّب 400 (Request contains an invalid argument) مع
      // هذا الموديل عند إرفاق صورة؛ إزالته وحده كافية (الرد يصل نظيفاً بلا أي محتوى "تفكير"
      // مختلط، فلا حاجة لتعطيل التفكير أصلاً). نعتمد على تعليمة "أعد JSON فقط" في النص +
      // parseJsonOutput المرن (يستخرج JSON حتى من نص محاط بـ```json).
      generationConfig: {
        ...(input.maxTokens ? { maxOutputTokens: input.maxTokens } : {}),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Gemini vision API error", res.status, body);
    throw new AiError(res.status, friendlyGemini(res.status, body));
  }

  const data_ = (await res.json()) as GeminiResponse;
  const parts = data_.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => p.thought !== true && p.text)
    .map((p) => p.text)
    .join("");
  if (!text) throw new AiError(502, "لم يصل رد من Gemini.");
  return text;
}

export { parseJsonOutput };
