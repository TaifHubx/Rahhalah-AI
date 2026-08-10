import { callGemini, parseJsonOutput, runWithTools, type ChatMessage } from "./gateway.server";
import { catalogEntry, destinationCatalog } from "./destination-catalog";
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
  travelMinutes: number;
  distanceKm: number;
  openNow: boolean | null;
  accessible: boolean;
  crowdNote: string;
  tip: string;
  lat: number;
  lng: number;
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
  dataSources: string[];
  days: ItineraryDay[];
}

const ITINERARY_RULES =
  `قواعد إلزامية:\n` +
  `1) لا تخترع أي رقم واقعي. كل درجة حرارة/احتمال مطر يأتي من get_weather، وكل وقت صلاة من get_prayer_times، ` +
  `وكل أوقات عمل أو "مفتوح الآن" أو مؤشر إقبال من get_place_status، وكل مسافة أو زمن تنقل من get_travel_time.\n` +
  `2) نادِ get_weather و get_prayer_times أولاً، ثم get_place_status لكل وجهة تنويها، ثم get_travel_time بين كل محطة والتي تليها.\n` +
  `3) لا تجدول نشاطاً خارجياً في ساعة احتمال المطر فيها ٥٠٪ أو أكثر أو حرارتها ٤٠° وأعلى — اختر بديلاً داخلياً.\n` +
  `4) اترك فجوة ٢٥ دقيقة على الأقل حول أوقات الصلاة، ولا تبدأ محطة داخل وقت الصلاة.\n` +
  `5) احترم أوقات العمل الحقيقية: لا تجدول زيارة خارج ساعات العمل الواردة من get_place_status.\n` +
  `6) وقت الانتقال بين محطتين يجب أن يطابق travelMinutes من get_travel_time، وادخله في حساب توقيت المحطة التالية.\n` +
  `7) إن طُلبت متطلبات وصول، فضّل الوجهات التي accessible=true.\n` +
  `8) إن كان reviewCount مرتفعاً جداً (إقبال عالٍ) فاقترح ساعة أهدأ واذكر ذلك في crowdNote، وإلا اكتب crowdNote فارغاً.\n` +
  `9) ٣-٥ محطات في اليوم.`;

const ITINERARY_SHAPE =
  `أعد JSON فقط بالمفاتيح: city, summary, weatherSummary, prayerNote, dataSources (مصفوفة نصية بأسماء المصادر التي استخدمتها فعلاً), ` +
  `days (مصفوفة: day رقم, title, stops مصفوفة من: time "HH:MM", title, destinationId, place, indoor boolean, weatherNote, ` +
  `travel نص قصير, travelMinutes رقم, distanceKm رقم, openNow boolean أو null, accessible boolean, crowdNote, tip).`;

function normalizeStop(raw: Partial<ItineraryStop>): ItineraryStop {
  const entry = catalogEntry(String(raw.destinationId ?? ""));
  return {
    time: raw.time ?? "",
    title: raw.title ?? "",
    destinationId: raw.destinationId ?? "",
    place: raw.place ?? entry?.name ?? "",
    indoor: Boolean(raw.indoor ?? entry?.indoor),
    weatherNote: raw.weatherNote ?? "",
    travel: raw.travel ?? "",
    travelMinutes: Math.max(0, Math.round(Number(raw.travelMinutes) || 0)),
    distanceKm: Math.max(0, Math.round((Number(raw.distanceKm) || 0) * 10) / 10),
    openNow: typeof raw.openNow === "boolean" ? raw.openNow : null,
    accessible: Boolean(raw.accessible ?? entry?.accessible),
    crowdNote: raw.crowdNote ?? "",
    tip: raw.tip ?? "",
    // الإحداثيات تأتي من فهرس رحّالة، لا من الموديل.
    lat: entry?.lat ?? 24.7136,
    lng: entry?.lng ?? 46.6753,
  };
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
        `أنت مخطّط رحلات سعودية في تطبيق "رحّالة". استخدم الأدوات لجلب بيانات حقيقية قبل الجدولة، ` +
        `وابنِ برنامجاً من هذه الوجهات فقط:\n${catalogText}\n${ITINERARY_RULES}\n${ITINERARY_SHAPE} ` +
        (input.lang === "en" ? "النصوص بالإنجليزية." : "النصوص بالعربية."),
    },
    {
      role: "user",
      content:
        `المدينة: ${input.city}\nالرفقة: ${input.companions}\nالاهتمامات: ${input.interests.join("، ")}\n` +
        `متطلبات الوصول: ${input.accessNeeds}\nعدد الأيام: ${input.days}\nابنِ الرحلة وأعد json`,
    },
  ];

  const raw = await runWithTools(messages, liveTools, liveToolHandlers, 8);
  const parsed = parseJsonOutput<SmartItinerary>(raw);
  return {
    city: parsed.city ?? input.city,
    summary: parsed.summary ?? "",
    weatherSummary: parsed.weatherSummary ?? "",
    prayerNote: parsed.prayerNote ?? "",
    dataSources: Array.isArray(parsed.dataSources) ? parsed.dataSources.slice(0, 6) : [],
    days: (parsed.days ?? []).map((d, i) => ({
      day: Number(d.day) || i + 1,
      title: d.title ?? "",
      stops: (d.stops ?? []).map((s) => normalizeStop(s)),
    })),
  };
}

export interface AdaptationResult {
  needsChange: boolean;
  reason: string;
  replacedStopTitle: string;
  suggestion: ItineraryStop | null;
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
        `أنت مساعد تكيّف لحظي لرحلات "رحّالة". استخدم get_weather لمدينة المستخدم و get_place_status للوجهات المرشحة ` +
        `و get_travel_time للبديل، ثم قرّر إن كان أي نشاط خارجي معرّضاً للمطر أو حرارة عالية أو مغلقاً في وقته، ` +
        `واقترح بديلاً واحداً من هذه القائمة فقط:\n${catalogText}\n` +
        `لا تخترع أرقاماً: كل رقم من نتائج الأدوات. ` +
        `أعد JSON فقط: needsChange (boolean), reason (سبب واضح مبني على البيانات), replacedStopTitle (عنوان المحطة المتأثرة حرفياً), ` +
        `suggestion (أو null) بالمفاتيح: time "HH:MM", title, destinationId, place, indoor boolean, weatherNote, travel, ` +
        `travelMinutes رقم, distanceKm رقم, openNow boolean أو null, accessible boolean, crowdNote, tip. ` +
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

  const raw = await runWithTools(messages, liveTools, liveToolHandlers, 6);
  const parsed = parseJsonOutput<AdaptationResult>(raw);
  return {
    needsChange: Boolean(parsed.needsChange),
    reason: parsed.reason ?? "",
    replacedStopTitle: parsed.replacedStopTitle ?? "",
    suggestion: parsed.suggestion ? normalizeStop(parsed.suggestion) : null,
  };
}
