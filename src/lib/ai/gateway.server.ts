/**
 * طبقة اتصال واحدة ومباشرة مع Google Gemini API — بلا أي بوابة وسيطة خارجية.
 * الواجهة العامة (ChatMessage/ToolDef بأسلوب OpenAI) تبقى كما هي كي لا يحتاج أي كود
 * مستهلك (features.server.ts) لأي تعديل؛ التحويل لبنية Gemini الأصلية (contents/parts)
 * يحدث داخلياً هنا فقط. المفتاح يُقرأ من بيئة السيرفر (GEMINI_API_KEY) ولا يظهر أبداً
 * في الواجهة، ولا يُكتب نصياً في أي ملف كود.
 */

export const GEMINI_MODEL = "gemini-1.5-flash"; // حصة مجانية أوسع من gemini-2.0-flash — بديل عند 429/RESOURCE_EXHAUSTED
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// تأكيد لمرة واحدة عند تحميل هذا الملف في عملية السيرفر (أول استدعاء AI يُحمّله) —
// يساعد على التحقق سريعاً من أن GEMINI_API_KEY مقروء فعلاً من .env دون كشف قيمته.
if (process.env["GEMINI_API_KEY"]) {
  console.log("✔ تم العثور على GEMINI_API_KEY واستخدام موديل Gemini المباشر جاهز");
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
  if (status === 401 || status === 403) return "مفتاح GEMINI_API_KEY غير صالح أو منتهي الصلاحية.";
  if (status === 429) return "الطلبات كثيرة الآن، جرّب بعد لحظات.";
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

// ---------------------------------------------------------------------------
// تحويل الرسائل/الأدوات من أسلوب OpenAI (المستخدَم داخلياً في المشروع) إلى بنية
// Gemini الأصلية (contents/parts)، ثم إعادة تنسيق الرد إلى شكل Choice.message نفسه.
// ---------------------------------------------------------------------------

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

/** يفكّك data URL (data:image/png;base64,....) إلى ما تحتاجه Gemini (inlineData). */
function dataUrlToInline(url: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(url);
  if (!match) return null;
  return { mimeType: match[1]!, data: match[2]! };
}

function contentToGeminiParts(content: ChatMessage["content"]): GeminiPart[] {
  if (content == null) return [];
  if (typeof content === "string") return content ? [{ text: content }] : [];
  return content.map((part): GeminiPart => {
    if (part.type === "text") return { text: part.text };
    const inline = dataUrlToInline(part.image_url.url);
    return inline ? { inlineData: inline } : { text: "" };
  });
}

/**
 * يحوّل تاريخ الرسائل بأسلوب OpenAI (system/user/assistant/tool) إلى بنية Gemini
 * (systemInstruction + contents بأدوار user/model، وfunctionCall/functionResponse
 * بدل tool_calls/tool). يتتبّع اسم كل استدعاء أداة عبر خريطة id→name محلية لأن رسائل
 * "tool" في تاريخنا الداخلي تحمل فقط tool_call_id (بأسلوب OpenAI) لا اسم الدالة.
 */
function toGeminiContents(messages: ChatMessage[]): {
  systemInstruction: { parts: GeminiPart[] } | null;
  contents: GeminiContent[];
} {
  let systemText = "";
  const contents: GeminiContent[] = [];
  const callIdToName = new Map<string, string>();

  for (const message of messages) {
    if (message.role === "system") {
      const text = typeof message.content === "string" ? message.content : "";
      systemText += systemText ? `\n${text}` : text;
      continue;
    }

    if (message.role === "user") {
      contents.push({ role: "user", parts: contentToGeminiParts(message.content) });
      continue;
    }

    if (message.role === "assistant") {
      const parts: GeminiPart[] = [];
      const text = typeof message.content === "string" ? message.content : "";
      if (text) parts.push({ text });
      for (const call of message.tool_calls ?? []) {
        callIdToName.set(call.id, call.function.name);
        let args: Record<string, unknown> = {};
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          args = {};
        }
        parts.push({ functionCall: { name: call.function.name, args } });
      }
      contents.push({ role: "model", parts });
      continue;
    }

    if (message.role === "tool") {
      const name = (message.tool_call_id && callIdToName.get(message.tool_call_id)) || "unknown";
      let response: Record<string, unknown>;
      try {
        response =
          typeof message.content === "string" && message.content
            ? (JSON.parse(message.content) as Record<string, unknown>)
            : {};
      } catch {
        response = { result: message.content };
      }
      // نتائج الأدوات تُرسَل لـ Gemini كجزء functionResponse ضمن دور "user" (مطابق لأمثلة Google الرسمية).
      contents.push({ role: "user", parts: [{ functionResponse: { name, response } }] });
    }
  }

  return { systemInstruction: systemText ? { parts: [{ text: systemText }] } : null, contents };
}

/** يحوّل قيم "type" في مخطط JSON من صيغة OpenAI (lowercase) إلى صيغة Gemini (UPPERCASE)، تكرارياً. */
function toGeminiSchema(schema: unknown): unknown {
  if (schema === null || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map((item) => toGeminiSchema(item));

  const input = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "type" && typeof value === "string") {
      out[key] = value.toUpperCase();
    } else if (key === "properties" && value && typeof value === "object") {
      const props: Record<string, unknown> = {};
      for (const [propKey, propValue] of Object.entries(value as Record<string, unknown>)) {
        props[propKey] = toGeminiSchema(propValue);
      }
      out[key] = props;
    } else if (key === "items") {
      out[key] = toGeminiSchema(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function toGeminiFunctionDeclaration(tool: ToolDef) {
  return {
    name: tool.function.name,
    description: tool.function.description,
    parameters: toGeminiSchema(tool.function.parameters),
  };
}

/** يستخرج النص والأدوات المستدعاة من رد Gemini، ويعيدها بشكل Choice.message المعتاد. */
function fromGeminiResponse(data: GeminiGenerateContentResponse): Choice["message"] {
  const candidate = data.candidates?.[0];
  if (!candidate) {
    const block = data.promptFeedback?.blockReason;
    throw new AiError(
      502,
      block ? `تعذّر توليد الرد: تم حجبه (${block}).` : "لم يصل رد من Gemini.",
    );
  }

  const parts = candidate.content?.parts ?? [];
  const textParts = parts
    .filter(
      (p): p is GeminiPart & { text: string } => typeof p.text === "string" && p.text.length > 0,
    )
    .map((p) => p.text);
  const functionCallParts = parts.filter((p) => p.functionCall);

  const tool_calls: ToolCall[] | undefined = functionCallParts.length
    ? functionCallParts.map((p, i) => ({
        id: `call_${Date.now()}_${i}`,
        type: "function" as const,
        function: {
          name: p.functionCall!.name,
          arguments: JSON.stringify(p.functionCall!.args ?? {}),
        },
      }))
    : undefined;

  return {
    content: textParts.length ? textParts.join("\n") : null,
    ...(tool_calls ? { tool_calls } : {}),
  };
}

/** نداء مباشر لـ Gemini API — بلا أي بوابة وسيطة. */
export async function callGemini({
  messages,
  tools,
  jsonOutput,
  maxTokens,
}: CallOptions): Promise<Choice["message"]> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new AiError(500, "مفتاح الذكاء الاصطناعي غير مهيّأ — أضف GEMINI_API_KEY في .env.");
  }

  const { systemInstruction, contents } = toGeminiContents(messages);

  const generationConfig: Record<string, unknown> = {};
  if (jsonOutput) generationConfig["responseMimeType"] = "application/json";
  if (maxTokens) generationConfig["maxOutputTokens"] = maxTokens;

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) body["systemInstruction"] = systemInstruction;
  if (tools?.length) {
    body["tools"] = [{ functionDeclarations: tools.map(toGeminiFunctionDeclaration) }];
  }
  if (Object.keys(generationConfig).length) body["generationConfig"] = generationConfig;

  // المفتاح يُمرَّر عبر الهيدر X-goog-api-key مباشرة إلى Google — بلا أي بوابة وسيطة.
  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    console.error("Gemini API error", res.status, bodyText);
    throw new AiError(res.status, friendly(res.status, bodyText));
  }

  const data = (await res.json()) as GeminiGenerateContentResponse;
  return fromGeminiResponse(data);
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
