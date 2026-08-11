import diriyahImg from "@/assets/dest-diriyah.jpg";
import alulaImg from "@/assets/dest-alula.jpg";
import jeddahImg from "@/assets/dest-jeddah.jpg";
import abhaImg from "@/assets/dest-abha.jpg";
import boulevardImg from "@/assets/dest-boulevard.jpg";
import museumImg from "@/assets/dest-museum.jpg";
import rijalImg from "@/assets/dest-rijal-almaa.jpg";
import farasanImg from "@/assets/dest-farasan.jpg";
import edgeImg from "@/assets/dest-edge.jpg";
import taifImg from "@/assets/dest-taif.jpg";
import type { Lang, TranslationKey } from "@/lib/i18n";

/**
 * Mock data layer.
 * كل الدوال هنا متزامنة الآن، ويمكن استبدالها لاحقاً بنداءات API / Gemini
 * دون تغيير واجهات المكوّنات.
 */

export type Category = "تراثي" | "طبيعي" | "ترفيهي" | "ثقافي" | "مطاعم ومقاهي";
export type Crowd = "منخفض" | "متوسط" | "مرتفع";

// خرائط عرض ثنائية اللغة لقيم داخلية ثابتة (city/category/crowd) — القيمة الداخلية تبقى
// عربية دائماً (تُستخدم للمطابقة والفلترة في explore.tsx وغيره)، وهذه فقط لتحويلها لنص
// معروض بلغة الواجهة الحالية عبر localizeDestination().
const CATEGORY_KEY: Record<Category, TranslationKey> = {
  تراثي: "category.heritage",
  طبيعي: "category.nature",
  ترفيهي: "category.entertainment",
  ثقافي: "category.culture",
  "مطاعم ومقاهي": "category.dining",
};

const CROWD_KEY: Record<Crowd, TranslationKey> = {
  منخفض: "crowd.low",
  متوسط: "crowd.medium",
  مرتفع: "crowd.high",
};

export const CITY_LABEL_EN: Record<string, string> = {
  الرياض: "Riyadh",
  "المدينة المنورة": "Madinah",
  جدة: "Jeddah",
  عسير: "Aseer",
  جيزان: "Jazan",
  الطائف: "Taif",
  أبها: "Abha",
  العلا: "AlUla",
  الدمام: "Dammam",
};

// خرائط عرض إنجليزية لخيارات معالج التخطيط (/plan) — القيمة الداخلية (العربية) تبقى كما
// هي دائماً لأنها تُرسل مباشرة لبناء الرحلة بالذكاء الاصطناعي وربط إحداثيات المدينة
// (انظر journey.ts وlive-tools.server.ts)، هذه فقط للعرض حسب لغة الواجهة.
export const COMPANION_LABEL_EN: Record<string, string> = {
  فردي: "Solo",
  أصدقاء: "Friends",
  عائلة: "Family",
  زوجين: "Couple",
};

export const PLACE_TYPE_LABEL_EN: Record<string, string> = {
  تراثية: "Heritage",
  طبيعية: "Nature",
  ترفيهية: "Entertainment",
  ثقافية: "Culture",
  "مطاعم ومقاهي": "Dining & cafés",
};

export const ACCESS_NEED_LABEL_EN: Record<string, string> = {
  "مناسب لأصحاب الهمم": "Accessible-friendly",
  "سهولة الوصول": "Easy access",
  "بدون متطلبات خاصة": "No special requirements",
};

export interface Destination {
  id: string;
  name: string;
  nameEn: string;
  city: string;
  category: Category;
  description: string;
  descriptionEn: string;
  image: string;
  rating: number;
  isOpen: boolean;
  hours: string;
  hoursEn: string;
  familyFriendly: boolean;
  accessible: boolean;
  weather: string;
  weatherEn: string;
  crowd: Crowd;
  accessibilityNote: string;
  accessibilityNoteEn: string;
  activities: string[];
  activitiesEn: string[];
}

export const destinations: Destination[] = [
  {
    id: "diriyah",
    name: "الدرعية",
    nameEn: "Diriyah",
    city: "الرياض",
    category: "تراثي",
    description: "عاصمة الدولة السعودية الأولى وحي الطريف المبني بالطين النجدي.",
    descriptionEn: "First Saudi capital and At-Turaif District, built with Najdi mud architecture.",
    image: diriyahImg,
    rating: 4.8,
    isOpen: true,
    hours: "٩:٠٠ صباحاً – ١١:٠٠ مساءً",
    hoursEn: "9:00 AM – 11:00 PM",
    familyFriendly: true,
    accessible: true,
    weather: "٢٨° مشمس – الطقس مناسب",
    weatherEn: "28° Sunny – pleasant weather",
    crowd: "متوسط",
    accessibilityNote: "مسارات ممهدة، مصاعد، ودورات مياه مهيّأة لأصحاب الهمم.",
    accessibilityNoteEn: "Paved paths, elevators, and accessible restrooms.",
    activities: ["جولة في حي الطريف", "متحف الدرعية", "مقاهي البجيري", "جولة مسائية مضاءة"],
    activitiesEn: [
      "At-Turaif District tour",
      "Diriyah Museum",
      "Al-Bujairi cafés",
      "Illuminated evening tour",
    ],
  },
  {
    id: "alula",
    name: "العلا",
    nameEn: "AlUla",
    city: "المدينة المنورة",
    category: "طبيعي",
    description: "متحف مفتوح من التكوينات الصخرية والمقابر النبطية في الحِجر.",
    descriptionEn: "An open-air museum of rock formations and Nabataean tombs at Hegra.",
    image: alulaImg,
    rating: 4.9,
    isOpen: true,
    hours: "٨:٠٠ صباحاً – ٦:٠٠ مساءً",
    hoursEn: "8:00 AM – 6:00 PM",
    familyFriendly: true,
    accessible: false,
    weather: "٣٠° صافٍ",
    weatherEn: "30° Clear",
    crowd: "منخفض",
    accessibilityNote: "بعض المسارات رملية وغير ممهدة بالكامل.",
    accessibilityNoteEn: "Some trails are sandy and not fully paved.",
    activities: ["جبل الفيل", "الحِجر", "منطاد الهواء", "رحلة نجوم الصحراء"],
    activitiesEn: ["Elephant Rock", "Hegra", "Hot air balloon", "Desert stargazing trip"],
  },
  {
    id: "jeddah",
    name: "جدة التاريخية",
    nameEn: "Historic Jeddah",
    city: "جدة",
    category: "تراثي",
    description: "أزقة البلد والرواشين الخشبية وبيوت الحجر المرجاني.",
    descriptionEn: "Al-Balad's alleys, wooden roshan balconies, and coral-stone houses.",
    image: jeddahImg,
    rating: 4.6,
    isOpen: true,
    hours: "١٠:٠٠ صباحاً – ١٢:٠٠ منتصف الليل",
    hoursEn: "10:00 AM – 12:00 AM",
    familyFriendly: true,
    accessible: true,
    weather: "٣٢° رطب",
    weatherEn: "32° Humid",
    crowd: "مرتفع",
    accessibilityNote: "مسارات رئيسية مناسبة للكراسي المتحركة.",
    accessibilityNoteEn: "Main routes suitable for wheelchairs.",
    activities: ["بيت نصيف", "سوق العلوي", "جولة الرواشين"],
    activitiesEn: ["Naseef House", "Al-Alawi Souq", "Roshan balcony tour"],
  },
  {
    id: "abha",
    name: "أبها",
    nameEn: "Abha",
    city: "عسير",
    category: "طبيعي",
    description: "مرتفعات خضراء وضباب وقرى حجرية على حافة الجبل.",
    descriptionEn: "Green highlands, fog, and stone villages on the mountain edge.",
    image: abhaImg,
    rating: 4.7,
    isOpen: true,
    hours: "مفتوح على مدار اليوم",
    hoursEn: "Open around the clock",
    familyFriendly: true,
    accessible: false,
    weather: "١٩° ضباب خفيف",
    weatherEn: "19° Light fog",
    crowd: "متوسط",
    accessibilityNote: "مسارات جبلية شديدة الانحدار في بعض المواقع.",
    accessibilityNoteEn: "Steep mountain trails in some spots.",
    activities: ["تلفريح السودة", "قرية رجال ألمع", "مسار المشي الجبلي"],
    activitiesEn: ["Al Soudah cable car", "Rijal Almaa village", "Mountain hiking trail"],
  },
  {
    id: "boulevard",
    name: "بوليفارد سيتي",
    nameEn: "Boulevard City",
    city: "الرياض",
    category: "ترفيهي",
    description: "منطقة ترفيهية حديثة بالمطاعم والعروض والفعاليات الليلية.",
    descriptionEn: "A modern entertainment district with restaurants, shows, and nightlife.",
    image: boulevardImg,
    rating: 4.5,
    isOpen: false,
    hours: "٤:٠٠ مساءً – ١:٠٠ صباحاً",
    hoursEn: "4:00 PM – 1:00 AM",
    familyFriendly: true,
    accessible: true,
    weather: "٢٦° لطيف",
    weatherEn: "26° Pleasant",
    crowd: "مرتفع",
    accessibilityNote: "مسارات مستوية ومواقف مخصصة لأصحاب الهمم.",
    accessibilityNoteEn: "Level paths and dedicated accessible parking.",
    activities: ["عروض حية", "مطاعم عالمية", "ألعاب عائلية"],
    activitiesEn: ["Live shows", "International restaurants", "Family games"],
  },
  {
    id: "museum",
    name: "المتحف الوطني",
    nameEn: "National Museum",
    city: "الرياض",
    category: "ثقافي",
    description: "رحلة داخلية في تاريخ الجزيرة العربية عبر ثماني قاعات.",
    descriptionEn: "An indoor journey through Arabian Peninsula history across eight halls.",
    image: museumImg,
    rating: 4.4,
    isOpen: true,
    hours: "٩:٠٠ صباحاً – ٩:٠٠ مساءً",
    hoursEn: "9:00 AM – 9:00 PM",
    familyFriendly: true,
    accessible: true,
    weather: "نشاط داخلي – غير متأثر بالطقس",
    weatherEn: "Indoor activity – unaffected by weather",
    crowd: "منخفض",
    accessibilityNote: "مهيّأ بالكامل لأصحاب الهمم.",
    accessibilityNoteEn: "Fully accessible.",
    activities: ["قاعة الحضارات", "معرض الحج", "جولة مرشدة"],
    activitiesEn: ["Civilizations Hall", "Hajj exhibit", "Guided tour"],
  },
  {
    id: "rijal-almaa",
    name: "رجال ألمع",
    nameEn: "Rijal Almaa",
    city: "عسير",
    category: "تراثي",
    description: "قرية حجرية ملوّنة بأبراج مرتفعة على مدرجات جبال عسير.",
    descriptionEn:
      "A colorful stone village with tall towers on the terraces of Aseer's mountains.",
    image: rijalImg,
    rating: 4.7,
    isOpen: true,
    hours: "٨:٠٠ صباحاً – ٦:٠٠ مساءً",
    hoursEn: "8:00 AM – 6:00 PM",
    familyFriendly: true,
    accessible: false,
    weather: "٢١° ضباب متقطع",
    weatherEn: "21° Intermittent fog",
    crowd: "منخفض",
    accessibilityNote: "أدراج حجرية قديمة داخل القرية.",
    accessibilityNoteEn: "Old stone stairways within the village.",
    activities: ["متحف القرية", "جولة الأبراج", "السوق الحجري"],
    activitiesEn: ["Village museum", "Towers tour", "Stone souq"],
  },
  {
    id: "farasan",
    name: "جزر فرسان",
    nameEn: "Farasan Islands",
    city: "جيزان",
    category: "طبيعي",
    description: "أرخبيل بمياه فيروزية وشعاب مرجانية وشواطئ بيضاء.",
    descriptionEn: "An archipelago of turquoise waters, coral reefs, and white beaches.",
    image: farasanImg,
    rating: 4.6,
    isOpen: true,
    hours: "مفتوح على مدار اليوم",
    hoursEn: "Open around the clock",
    familyFriendly: true,
    accessible: false,
    weather: "٣١° بحري صافٍ",
    weatherEn: "31° Clear coastal",
    crowd: "منخفض",
    accessibilityNote: "الوصول عبر معدّية، ورمال غير ممهدة.",
    accessibilityNoteEn: "Accessible by ferry only; unpaved sand.",
    activities: ["الغطس والسنوركل", "بيت الرفاعي", "رحلة قارب"],
    activitiesEn: ["Diving and snorkeling", "Al-Refai House", "Boat trip"],
  },
  {
    id: "edge-of-the-world",
    name: "حافة العالم",
    nameEn: "Edge of the World",
    city: "الرياض",
    category: "طبيعي",
    description: "منحدرات صحراوية شاسعة تطل على أفق مفتوح شمال غرب الرياض.",
    descriptionEn: "Vast desert cliffs overlooking an open horizon northwest of Riyadh.",
    image: edgeImg,
    rating: 4.8,
    isOpen: true,
    hours: "أفضل وقت: قبل الغروب",
    hoursEn: "Best time: before sunset",
    familyFriendly: false,
    accessible: false,
    weather: "٢٧° جاف",
    weatherEn: "27° Dry",
    crowd: "متوسط",
    accessibilityNote: "طريق ترابي يحتاج سيارة دفع رباعي.",
    accessibilityNoteEn: "Dirt road requires a 4x4 vehicle.",
    activities: ["مشي على الحافة", "تصوير الغروب", "تخييم قصير"],
    activitiesEn: ["Walking the edge", "Sunset photography", "Short camping"],
  },
  {
    id: "taif-roses",
    name: "الطائف ومزارع الورد",
    nameEn: "Taif & the Rose Farms",
    city: "الطائف",
    category: "طبيعي",
    description: "مرتفعات معتدلة وحقول ورد طائفي ومدرجات زراعية.",
    descriptionEn: "Mild highlands, Taif rose fields, and agricultural terraces.",
    image: taifImg,
    rating: 4.5,
    isOpen: true,
    hours: "٧:٠٠ صباحاً – ٥:٠٠ مساءً",
    hoursEn: "7:00 AM – 5:00 PM",
    familyFriendly: true,
    accessible: true,
    weather: "٢٣° معتدل",
    weatherEn: "23° Mild",
    crowd: "متوسط",
    accessibilityNote: "مسارات ترابية مستوية في معظم المزارع.",
    accessibilityNoteEn: "Flat dirt paths in most farms.",
    activities: ["مصنع عطر الورد", "قطف الورد", "تلفريك الهدا"],
    activitiesEn: ["Rose perfume factory", "Rose picking", "Al-Hada cable car"],
  },
];

export function getDestination(id: string) {
  return destinations.find((d) => d.id === id);
}

/**
 * نسخة مترجَمة للعرض من وجهة — تُستخدم في كل مكان يعرض نص وجهة (بطاقات، تفاصيل).
 * الحقول الأصلية (id, category, city, crowd...) تبقى بلا تغيير للفلترة/الروابط.
 */
export function localizeDestination(
  d: Destination,
  lang: Lang,
  t: (key: TranslationKey) => string,
) {
  return {
    name: lang === "en" ? d.nameEn : d.name,
    description: lang === "en" ? d.descriptionEn : d.description,
    hours: lang === "en" ? d.hoursEn : d.hours,
    weather: lang === "en" ? d.weatherEn : d.weather,
    accessibilityNote: lang === "en" ? d.accessibilityNoteEn : d.accessibilityNote,
    activities: lang === "en" ? d.activitiesEn : d.activities,
    cityLabel: lang === "en" ? (CITY_LABEL_EN[d.city] ?? d.city) : d.city,
    categoryLabel: t(CATEGORY_KEY[d.category]),
    crowdLabel: t(CROWD_KEY[d.crowd]),
  };
}

export interface Challenge {
  id: string;
  destinationId: string;
  title: string;
  titleEn: string;
  task: string;
  taskEn: string;
  points: number;
}

export const challenges: Challenge[] = [
  {
    id: "c1",
    destinationId: "diriyah",
    title: "تحدي الدرعية",
    titleEn: "Diriyah Challenge",
    task: "📸 صوّر باباً نجدياً تقليدياً",
    taskEn: "📸 Photograph a traditional Najdi door",
    points: 50,
  },
  {
    id: "c2",
    destinationId: "diriyah",
    title: "تحدي البجيري",
    titleEn: "Al-Bujairi Challenge",
    task: "📸 صوّر منظر الطريف عند الغروب",
    taskEn: "📸 Photograph the At-Turaif view at sunset",
    points: 40,
  },
  {
    id: "c3",
    destinationId: "alula",
    title: "تحدي العلا",
    titleEn: "AlUla Challenge",
    task: "📸 صوّر جبل الفيل من الزاوية الجنوبية",
    taskEn: "📸 Photograph Elephant Rock from the southern angle",
    points: 70,
  },
  {
    id: "c4",
    destinationId: "jeddah",
    title: "تحدي البلد",
    titleEn: "Al-Balad Challenge",
    task: "📸 صوّر روشاناً خشبياً بلونه الأصلي",
    taskEn: "📸 Photograph a wooden roshan in its original color",
    points: 60,
  },
];

export function localizeChallenge(c: Challenge, lang: Lang) {
  return {
    title: lang === "en" ? c.titleEn : c.title,
    task: lang === "en" ? c.taskEn : c.task,
  };
}

export interface Reward {
  id: string;
  title: string;
  titleEn: string;
  emoji: string;
  points: number;
  partner: string;
  partnerEn: string;
}

export const rewards: Reward[] = [
  {
    id: "r1",
    emoji: "☕",
    title: "كوب قهوة مجاني",
    titleEn: "Free cup of coffee",
    points: 200,
    partner: "مقاهي شريكة",
    partnerEn: "Partner cafés",
  },
  {
    id: "r2",
    emoji: "🎟️",
    title: "خصم ٢٠٪ على تجربة سياحية",
    titleEn: "20% off a tourism experience",
    points: 400,
    partner: "تجارب معتمدة",
    partnerEn: "Certified experiences",
  },
  {
    id: "r3",
    emoji: "🍽️",
    title: "خصم في مطعم شريك",
    titleEn: "Discount at a partner restaurant",
    points: 300,
    partner: "مطاعم شريكة",
    partnerEn: "Partner restaurants",
  },
  {
    id: "r4",
    emoji: "🚗",
    title: "رحلة توصيل مجانية",
    titleEn: "Free ride",
    points: 250,
    partner: "شركاء النقل",
    partnerEn: "Transport partners",
  },
];

export function localizeReward(r: Reward, lang: Lang) {
  return {
    title: lang === "en" ? r.titleEn : r.title,
    partner: lang === "en" ? r.partnerEn : r.partner,
  };
}

export const tripCompanions = ["فردي", "أصدقاء", "عائلة", "زوجين"] as const;
export const placeTypes = ["تراثية", "طبيعية", "ترفيهية", "ثقافية", "مطاعم ومقاهي"] as const;
export const accessNeeds = ["مناسب لأصحاب الهمم", "سهولة الوصول", "بدون متطلبات خاصة"] as const;
export const cities = ["الرياض", "جدة", "العلا", "أبها", "الدمام", "المدينة المنورة"] as const;
