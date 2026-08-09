import { callGemini, parseJsonOutput, runWithTools, type ChatMessage } from "./gateway.server";
import { destinationCatalog } from "./destination-catalog";
import { liveToolHandlers, liveTools } from "./live-tools.server";

/** المنطق الفعلي لميزات الذكاء الاصطناعي — يُستدعى من server functions فقط. */

const catalogText = destinationCatalog
  .map((d) => `- ${d.id} | ${d.name} (${d.region}) | ${d.traits}`)
  .join("\n");

export interface VisualMatch {
  destinationId: string;
  destinationName: string;
  similarity: number;
  reason: string;
  bestTime: string;
}

export interface VisualDiscoveryResult {
  recognizedPlace: string;
  sceneSummary: string;
  matches: VisualMatch[];
}

export async function discoverByImage(imageDataUrl: string, lang: "ar" | "en") {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `أنت خبير سياحة سعودية في تطبيق "رحّالة". يحلّل المستخدم صورة مكان (غالباً خارج السعودية) ` +
        `وتقترح أقرب الوجهات السعودية الشبيهة من هذه القائمة فقط:\n${catalogText}\n` +
        `أعد JSON فقط بالمفاتيح: recognizedPlace, sceneSummary, matches ` +
        `(مصفوفة من 3 عناصر: destinationId, destinationName, similarity رقم 0-100, reason, bestTime). ` +
        (lang === "en" ? "اكتب النصوص بالإنجليزية." : "اكتب النصوص بالعربية الفصحى المبسطة."),
    },
    {
      role: "user",
      content: [
        { type: "text", text: "حلّل هذه الصورة واقترح شبيهها في السعودية. json" },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ];

  const message = await callGemini({ messages, jsonOutput: true, maxTokens: 1600 });
  const parsed = parseJsonOutput<VisualDiscoveryResult>(message.content);
  const known = new Set(destinationCatalog.map((d) => d.id));
  return {
    recognizedPlace: parsed.recognizedPlace ?? "",
    sceneSummary: parsed.sceneSummary ?? "",
    matches: (parsed.matches ?? [])
      .filter((m) => known.has(m.destinationId))
      .slice(0, 3)
      .map((m) => ({
        ...m,
        similarity: Math.max(0, Math.min(100, Math.round(Number(m.similarity) || 0))),
      })),
  };
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  feedback: string;
  detected: string;
}

export async function verifyChallengeImage(input: {
  imageDataUrl: string;
  task: string;
  destinationName: string;
  lang: "ar" | "en";
}) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `أنت محكّم تحديات تصوير في تطبيق "رحّالة" السعودي. قرّر إن كانت الصورة تحقق المهمة فعلاً. ` +
        `كن عادلاً: اقبل الصورة إذا كان العنصر المطلوب واضحاً، وارفضها إذا كانت لموضوع مختلف تماماً أو غير واضحة. ` +
        `أعد JSON فقط: verified (boolean), confidence (0-100), detected (وصف قصير لما في الصورة), feedback (سطر تشجيعي أو سبب الرفض). ` +
        (input.lang === "en" ? "النصوص بالإنجليزية." : "النصوص بالعربية."),
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `المهمة: ${input.task}\nالوجهة: ${input.destinationName}\nهل الصورة تحقق المهمة؟ أعد json`,
        },
        { type: "image_url", image_url: { url: input.imageDataUrl } },
      ],
    },
  ];

  const message = await callGemini({ messages, jsonOutput: true, maxTokens: 800 });
  const parsed = parseJsonOutput<VerificationResult>(message.content);
  return {
    verified: Boolean(parsed.verified),
    confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
    detected: parsed.detected ?? "",
    feedback: parsed.feedback ?? "",
  };
}

export interface ItineraryStop {
  time: string;
  title: string;
  destinationId: string;
  place: string;
  indoor: boolean;
  weatherNote: string;
  travel: string;
  tip: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  stops: ItineraryStop[];
}

export interface SmartItinerary {
  city: string;
  summary: string;
  weatherSummary: string;
  prayerNote: string;
  days: ItineraryDay[];
}

export async function buildSmartItinerary(input: {
  city: string;
  companions: string;
  interests: string[];
  accessNeeds: string;
  days: number;
  lang: "ar" | "en";
}) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `أنت مخطّط رحلات سعودية في تطبيق "رحّالة". استخدم الأدوات المتاحة لجلب الطقس الحقيقي وأوقات الصلاة قبل الجدولة، ` +
        `ثم ابنِ برنامجاً واقعياً من هذه الوجهات فقط:\n${catalogText}\n` +
        `قواعد: لا تجدول نشاطاً خارجياً في ساعة احتمال المطر فيها ٥٠٪ أو أكثر، اترك فجوة قصيرة قرب أوقات الصلاة، ` +
        `راعِ متطلبات الوصول إن طُلبت، و٣-٥ محطات في اليوم. ` +
        `في النهاية أعد JSON فقط بالمفاتيح: city, summary, weatherSummary, prayerNote, days ` +
        `(مصفوفة: day رقم, title, stops مصفوفة من: time "HH:MM", title, destinationId, place, indoor boolean, weatherNote, travel, tip). ` +
        (input.lang === "en" ? "النصوص بالإنجليزية." : "النصوص بالعربية."),
    },
    {
      role: "user",
      content:
        `المدينة: ${input.city}\nالرفقة: ${input.companions}\nالاهتمامات: ${input.interests.join("، ")}\n` +
        `متطلبات الوصول: ${input.accessNeeds}\nعدد الأيام: ${input.days}\nابنِ الرحلة وأعد json`,
    },
  ];

  const raw = await runWithTools(messages, liveTools, liveToolHandlers);
  const parsed = parseJsonOutput<SmartItinerary>(raw);
  return {
    city: parsed.city ?? input.city,
    summary: parsed.summary ?? "",
    weatherSummary: parsed.weatherSummary ?? "",
    prayerNote: parsed.prayerNote ?? "",
    days: (parsed.days ?? []).map((d, i) => ({
      day: Number(d.day) || i + 1,
      title: d.title ?? "",
      stops: (d.stops ?? []).map((s) => ({ ...s, indoor: Boolean(s.indoor) })),
    })),
  };
}

export interface AdaptationResult {
  needsChange: boolean;
  reason: string;
  replacedStopTitle: string;
  suggestion: { title: string; destinationId: string; place: string; time: string; why: string } | null;
}

export async function adaptItinerary(input: {
  city: string;
  stops: { time: string; title: string; place: string; indoor: boolean }[];
  lang: "ar" | "en";
}) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `أنت مساعد تكيّف لحظي لرحلات "رحّالة". استخدم أداة الطقس لمدينة المستخدم، ثم قرّر إن كان أي نشاط خارجي معرّضاً للمطر ` +
        `أو حرارة عالية جداً، واقترح بديلاً داخلياً قريباً من هذه القائمة فقط:\n${catalogText}\n` +
        `أعد JSON فقط: needsChange (boolean), reason, replacedStopTitle, suggestion ` +
        `(أو null) بالمفاتيح: title, destinationId, place, time, why. ` +
        (input.lang === "en" ? "النصوص بالإنجليزية." : "النصوص بالعربية."),
    },
    {
      role: "user",
      content:
        `المدينة: ${input.city}\nالجدول الحالي:\n` +
        input.stops
          .map((s) => `${s.time} - ${s.title} (${s.place}) ${s.indoor ? "داخلي" : "خارجي"}`)
          .join("\n") +
        `\nهل يحتاج الجدول تعديلاً؟ أعد json`,
    },
  ];

  const raw = await runWithTools(messages, liveTools, liveToolHandlers, 3);
  const parsed = parseJsonOutput<AdaptationResult>(raw);
  return {
    needsChange: Boolean(parsed.needsChange),
    reason: parsed.reason ?? "",
    replacedStopTitle: parsed.replacedStopTitle ?? "",
    suggestion: parsed.suggestion ?? null,
  };
}
