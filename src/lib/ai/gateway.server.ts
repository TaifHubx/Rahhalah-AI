import { GEMINI_MODEL } from "./config";

/**
 * طبقة اتصال واحدة مع Lovable AI Gateway (Gemini).
 * المفتاح يُقرأ من بيئة السيرفر فقط ولا يظهر أبداً في الواجهة.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

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

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiError(500, "مفتاح الذكاء الاصطناعي غير مهيّأ.");
  return key;
}

function friendly(status: number, body: string) {
  if (status === 429) return "الطلبات كثيرة الآن، جرّب بعد لحظات.";
  if (status === 402) return "انتهى رصيد الذكاء الاصطناعي لهذا المشروع.";
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

export async function callGemini({ messages, tools, jsonOutput, maxTokens }: CallOptions) {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      messages,
      ...(tools ? { tools } : {}),
      ...(jsonOutput ? { response_format: { type: "json_object" } } : {}),
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("AI gateway error", res.status, body);
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
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(candidate) as T;
  } catch {
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
      maxTokens: 4000,
    });

    if (!message.tool_calls?.length) return message.content;

    history.push({ role: "assistant", content: message.content ?? "", tool_calls: message.tool_calls });
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
