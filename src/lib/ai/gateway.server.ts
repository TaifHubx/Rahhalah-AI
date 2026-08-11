/**
 * طبقة اتصال واحدة ومباشرة مع OpenAI API — بروتوكول قياسي مستقر (نفس شكل
 * ChatMessage/ToolDef/الرد هنا تماماً)، فلا حاجة لأي طبقة تحويل بنية. المفتاح يُقرأ من
 * بيئة السيرفر (OPENAI_API_KEY) ولا يظهر أبداً في الواجهة، ولا يُكتب نصياً في أي ملف كود.
 *
 * اسم الدالة العامة callGemini بقي كما هو (رغم أن المزوّد الفعلي الآن OpenAI) كي لا يحتاج
 * src/lib/ai/features.server.ts لأي تعديل في استيراداته.
 */

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
// gpt-4o-mini: سريع ورخيص وموثوق، بحدود معدّل مرتفعة جداً حتى على أدنى مستوى فوترة مدفوع —
// لا حاجة لموديل أكبر لمهامنا (توليد رحلة JSON بنيوية + استدعاء أدوات بسيط).
export const OPENAI_MODEL = "gpt-4o-mini";

// تأكيد لمرة واحدة عند تحميل هذا الملف في عملية السيرفر (أول استدعاء AI يُحمّله) —
// يساعد على التحقق سريعاً من أن OPENAI_API_KEY مقروء فعلاً من .env دون كشف قيمته.
if (process.env["OPENAI_API_KEY"]) {
  console.log(`✔ تم العثور على OPENAI_API_KEY والاتصال بـ OpenAI جاهز (${OPENAI_MODEL})`);
}

export type ContentPart =
  { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[] | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function friendly(status: number, body: string) {
  if (status === 401 || status === 403) return "مفتاح OPENAI_API_KEY غير صالح أو منتهي الصلاحية.";
  if (status === 429) return "الطلبات كثيرة الآن، جرّب بعد لحظات.";
  if (status === 402) return "رصيد الفوترة غير كافٍ في حساب OpenAI.";
  return `تعذّر تحليل الطلب (${status}): ${body.slice(0, 300)}`;
}

interface CallOptions {
  messages: ChatMessage[];
  tools?: ToolDef[];
  jsonOutput?: boolean;
  maxTokens?: number;
}

interface Choice {
  message: { content: string | null; tool_calls?: ToolCall[] };
}

/** نداء مباشر لـ OpenAI — بلا أي بوابة وسيطة أخرى. */
export async function callGemini({
  messages,
  tools,
  jsonOutput,
  maxTokens,
}: CallOptions): Promise<Choice["message"]> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new AiError(500, "مفتاح الذكاء الاصطناعي غير مهيّأ — أضف OPENAI_API_KEY في .env.");
  }

  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      ...(tools ? { tools } : {}),
      ...(jsonOutput ? { response_format: { type: "json_object" } } : {}),
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("OpenAI API error", res.status, body);
    throw new AiError(res.status, friendly(res.status, body));
  }

  const data = (await res.json()) as { choices?: Choice[] };
  const message = data.choices?.[0]?.message;
  if (!message) throw new AiError(502, "لم يصل رد من الذكاء الاصطناعي.");
  return message;
}

/** يستخرج JSON من نص الموديل حتى لو كان محاطاً بشرح أو ```json. */
export function parseJsonOutput<T>(raw: string | null): T {
  if (!raw) throw new AiError(502, "رد الذكاء الاصطناعي كان فارغاً.");
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    console.error("[parseJsonOutput Error] Raw model output:\n", raw);
    throw new AiError(502, "تعذّر قراءة نتيجة الذكاء الاصطناعي، حاول مرة أخرى.");
  }
}

/**
 * حلقة Function Calling: ينفّذ الأدوات التي يطلبها الموديل ثم يعيد إليه النتائج.
 */
export async function runWithTools(
  messages: ChatMessage[],
  tools: ToolDef[],
  handlers: Record<string, (args: Record<string, unknown>) => Promise<unknown> | unknown>,
  maxSteps = 4,
) {
  const history = [...messages];
  for (let step = 0; step < maxSteps; step += 1) {
    const isLast = step === maxSteps - 1;
    const message = await callGemini({
      messages: history,
      ...(isLast ? { jsonOutput: true } : { tools }),
      // رحلة ٧ أيام × ٥ محطات (الحد الأقصى من الويزارد) بحقول المحطة الحالية قد تتجاوز
      // بسهولة 4000 توكن فتُقطَع في المنتصف ويفشل تحليل JSON. لسنا على حصة Groq الضيّقة
      // بعد الآن (OpenAI مدفوع)، فنستخدم مساحة قريبة من حد gpt-4o-mini الأقصى (16384).
      maxTokens: isLast ? 16000 : 1200,
    });

    if (!message.tool_calls?.length) return message.content;

    history.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: message.tool_calls,
    });
    for (const call of message.tool_calls) {
      let result: unknown;
      try {
        const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        const handler = handlers[call.function.name];
        result = handler ? await handler(args) : { error: "أداة غير معروفة" };
      } catch (error) {
        result = { error: String(error) };
      }
      history.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
  throw new AiError(502, "لم يكتمل بناء الرحلة، حاول مرة أخرى.");
}
