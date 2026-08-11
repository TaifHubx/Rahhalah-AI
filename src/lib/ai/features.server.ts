import { parseJsonOutput, runWithTools, type ChatMessage } from "./gateway.server";
import { callGeminiVision } from "./gemini-vision.server";
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
  // تحليل الصور (Vision) يمر عبر Google Gemini مباشرة — وليس نفس مزوّد توليد الرحلة النصي
  // (OpenAI) — انظر توثيق gemini-vision.server.ts.
  const raw = await callGeminiVision({
    systemInstruction:
      `أنت خبير سياحة سعودية في تطبيق "رحّالة". ` +
      (lang === "en"
        ? "مهم جداً: اكتب كل حقول الرد بالإنجليزية حصراً بلا أي مزج مع العربية. "
        : "اكتب كل حقول الرد بالعربية الفصحى المبسطة. ") +
      `يحلّل المستخدم صورة مكان (غالباً خارج السعودية) ` +
      `وتقترح أقرب الوجهات السعودية الشبيهة من هذه القائمة فقط:\n${catalogText}\n` +
      `أعد JSON فقط بالمفاتيح: recognizedPlace, sceneSummary, matches ` +
      `(مصفوفة من 3 عناصر: destinationId, destinationName, similarity رقم 0-100, reason, bestTime).`,
    userText: "حلّل هذه الصورة واقترح شبيهها في السعودية. json",
    imageDataUrl,
    // ٣ وجهات مقترحة بأسباب مفصّلة بالعربية تتجاوز غالباً 1600 توكن فتُقطَع في المنتصف
    // (نفس نمط انقطاع الرحلة الذي واجهناه سابقاً) — رفعناها لهامش أوسع.
    maxTokens: 3000,
  });
  const parsed = parseJsonOutput<VisualDiscoveryResult>(raw);
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
  // نفس منطق discoverByImage: تحليل الصور عبر Gemini مباشرة، لا عبر مزوّد الرحلة النصي.
  const raw = await callGeminiVision({
    systemInstruction:
      `أنت محكّم تحديات تصوير في تطبيق "رحّالة" السعودي. ` +
      (input.lang === "en"
        ? "مهم جداً: اكتب كل حقول الرد بالإنجليزية حصراً بلا أي مزج مع العربية. "
        : "اكتب كل حقول الرد بالعربية. ") +
      `قرّر إن كانت الصورة تحقق المهمة فعلاً. ` +
      `كن عادلاً: اقبل الصورة إذا كان العنصر المطلوب واضحاً، وارفضها إذا كانت لموضوع مختلف تماماً أو غير واضحة. ` +
      `أعد JSON فقط: verified (boolean), confidence (0-100), detected (وصف قصير لما في الصورة), feedback (سطر تشجيعي أو سبب الرفض).`,
    userText: `المهمة: ${input.task}\nالوجهة: ${input.destinationName}\nهل الصورة تحقق المهمة؟ أعد json`,
    imageDataUrl: input.imageDataUrl,
    maxTokens: 1200,
  });
  const parsed = parseJsonOutput<VerificationResult>(raw);
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
  /**
   * سياق مكان دقيق وقابل للتحديد الجغرافي (Place Context) — اسم المعلم/الحي الكامل
   * (وليس اسم المدينة وحده)، يُستخدم مباشرة كاستعلام Google Places في الخريطة التفاعلية
   * ليربط كل محطة بدبوس ومسار حقيقيَّين. انظر src/lib/journey.ts:resolveGeocodeQuery.
   */
  placeQuery: string;
  /** الحي/المنطقة داخل المدينة (مثال: "حطين") — يُدمج مع placeQuery لتقوية دقة البحث الجغرافي. */
  locationContext: string;
  /** ترتيب المحطة في مسار اليوم كما يراه الموديل — تحقّق إضافي؛ ترتيب العرض الفعلي مبني من فهرس المصفوفة. */
  sequenceOrder: number;
  indoor: boolean;
  weatherNote: string;
  travel: string;
  tip: string;
}

export interface SmartItinerary {
  city: string;
  summary: string;
  weatherSummary: string;
  prayerNote: string;
  dayTitle: string;
  stops: ItineraryStop[];
}

export async function buildSmartItinerary(input: {
  city: string;
  companions: string;
  interests: string[];
  accessNeeds: string;
  lang: "ar" | "en";
}) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `أنت مخطّط رحلات سعودية في تطبيق "رحّالة". ` +
        // نضع تعليمة اللغة أولاً وبوضوح شديد (بدل نهاية الرسالة) لأن وضعها في النهاية سابقاً
        // كان يُهمَل جزئياً — الموديل كان يخلط عربي/إنجليزي في نفس الحقل (خصوصاً place).
        (input.lang === "en"
          ? `مهم جداً: اكتب كل النصوص المعروضة للمستخدم بالإنجليزية حصراً — بلا أي مزج مع العربية ` +
            `في نفس الجملة أو الحقل (city, summary, weatherSummary, prayerNote, dayTitle, ولكل ` +
            `محطة: title, place, travel, tip, weatherNote). ` +
            `الاستثناء الوحيد: placeQuery وlocationContext يبقيان بالاسم العربي الرسمي دائماً ` +
            `(بغض النظر عن هذه التعليمة) لأنهما يُستخدمان للبحث الجغرافي المباشر عبر Google Places، ` +
            `والأسماء العربية أدق جغرافياً للأماكن السعودية من أي ترجمة إنجليزية. `
          : `اكتب كل النصوص بالعربية الفصحى المبسطة. `) +
        `استخدم الأدوات المتاحة لجلب الطقس الحقيقي وأوقات الصلاة قبل الجدولة، ` +
        `ثم ابنِ برنامجاً واقعياً من هذه الوجهات فقط:\n${catalogText}\n` +
        `قواعد: لا تجدول نشاطاً خارجياً في ساعة احتمال المطر فيها ٥٠٪ أو أكثر، اترك فجوة قصيرة قرب أوقات الصلاة، ` +
        `راعِ متطلبات الوصول إن طُلبت، و٣-٥ محطات في اليوم. ` +
        `كل رحلة تُعرض على خريطة تفاعلية حية تربط كل محطة بدبوس ومسار حقيقيَّين عبر Google Places، ` +
        `لذا لكل محطة الحقول التالية إلزامية: ` +
        `placeQuery (اسم المعلم أو المكان المحدَّد كاملاً مع الحي والمدينة بالعربية دائماً، مثال: ` +
        `"بوليفارد رياض سيتي، حي حطين، الرياض" — لا يكفي "الرياض" وحدها لأنها غامضة جغرافياً)، ` +
        `locationContext (الحي أو المنطقة داخل المدينة فقط بالعربية، مثال: "حطين")، ` +
        `sequenceOrder (رقم ترتيب المحطة في مسار اليوم بدءاً من 1). ` +
        // نطلب يوماً واحداً بتفصيل كامل فقط (هذا كل ما تعرضه الواجهة)، بدل تبديد حد الرموز على
        // محتوى غير معروض — هذا ما كان يسبب انقطاع الرد قبل اكتماله سابقاً.
        `اطلب منك يوماً واحداً بتفصيل كامل. ` +
        `في النهاية أعد JSON فقط بالمفاتيح: city, summary, weatherSummary, prayerNote, dayTitle, ` +
        `stops (مصفوفة من: time "HH:MM", title, destinationId, place, placeQuery, ` +
        `locationContext, sequenceOrder, indoor boolean, weatherNote, travel, tip).`,
    },
    {
      role: "user",
      content:
        `المدينة: ${input.city}\nالرفقة: ${input.companions}\nالاهتمامات: ${input.interests.join("، ")}\n` +
        `متطلبات الوصول: ${input.accessNeeds}\nابنِ الرحلة وأعد json`,
    },
  ];

  const raw = await runWithTools(messages, liveTools, liveToolHandlers);
  const parsed = parseJsonOutput<SmartItinerary>(raw);
  return {
    city: parsed.city ?? input.city,
    summary: parsed.summary ?? "",
    weatherSummary: parsed.weatherSummary ?? "",
    prayerNote: parsed.prayerNote ?? "",
    dayTitle: parsed.dayTitle ?? "",
    stops: (parsed.stops ?? []).map((s, si) => ({
      ...s,
      indoor: Boolean(s.indoor),
      // شبكة أمان: لو أغفل الموديل placeQuery رغم التعليمات، نستخدم place ثم title بدل نص فارغ
      // يعطّل جلب إحداثيات الخريطة تماماً.
      placeQuery: s.placeQuery || s.place || s.title,
      locationContext: s.locationContext ?? "",
      sequenceOrder: Number(s.sequenceOrder) || si + 1,
      // gpt-4o-mini يعيد أحياناً null بدل نص فارغ لحقول اختيارية بطبيعتها (مثل travel) —
      // نطبّعها هنا كي لا يتسرّب null لمكان يتوقّع string.
      travel: s.travel || "",
      tip: s.tip || "",
      weatherNote: s.weatherNote || "",
    })),
  };
}

export interface AdaptationResult {
  needsChange: boolean;
  reason: string;
  replacedStopTitle: string;
  suggestion: {
    title: string;
    destinationId: string;
    place: string;
    /** سياق مكان دقيق للبديل — نفس دور ItineraryStop.placeQuery لتحديث الخريطة التفاعلية فور القبول. */
    placeQuery: string;
    /** الحي/المنطقة للبديل — نفس دور ItineraryStop.locationContext. */
    locationContext: string;
    time: string;
    why: string;
  } | null;
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
        `أنت مساعد تكيّف لحظي لرحلات "رحّالة". ` +
        (input.lang === "en"
          ? `مهم جداً: اكتب كل النصوص المعروضة للمستخدم بالإنجليزية حصراً بلا مزج مع العربية ` +
            `(reason, و suggestion: title, place, why). الاستثناء الوحيد: placeQuery وlocationContext ` +
            `يبقيان بالاسم العربي الرسمي دائماً لأنهما للبحث الجغرافي عبر Google Places. `
          : `اكتب كل النصوص بالعربية. `) +
        `استخدم أداة الطقس لمدينة المستخدم، ثم قرّر إن كان أي نشاط خارجي معرّضاً للمطر ` +
        `أو حرارة عالية جداً، واقترح بديلاً داخلياً قريباً من هذه القائمة فقط:\n${catalogText}\n` +
        `البديل يستبدل مباشرة دبوساً على خريطة تفاعلية حية، لذا حقلا placeQuery وlocationContext إلزاميان ` +
        `داخل suggestion: placeQuery اسم المعلم المحدَّد كاملاً بالعربية مع الحي والمدينة (وليس اسم المدينة وحده)، ` +
        `وlocationContext الحي أو المنطقة فقط بالعربية. ` +
        `أعد JSON فقط: needsChange (boolean), reason, replacedStopTitle, suggestion ` +
        `(أو null) بالمفاتيح: title, destinationId, place, placeQuery, locationContext, time, why.`,
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
  const suggestion = parsed.suggestion;
  return {
    needsChange: Boolean(parsed.needsChange),
    reason: parsed.reason ?? "",
    replacedStopTitle: parsed.replacedStopTitle ?? "",
    suggestion: suggestion
      ? {
          ...suggestion,
          placeQuery: suggestion.placeQuery || suggestion.place,
          locationContext: suggestion.locationContext ?? "",
        }
      : null,
  };
}
