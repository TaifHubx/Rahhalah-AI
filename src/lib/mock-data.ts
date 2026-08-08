import diriyahImg from "@/assets/dest-diriyah.jpg";
import alulaImg from "@/assets/dest-alula.jpg";
import jeddahImg from "@/assets/dest-jeddah.jpg";
import abhaImg from "@/assets/dest-abha.jpg";
import boulevardImg from "@/assets/dest-boulevard.jpg";
import museumImg from "@/assets/dest-museum.jpg";

/**
 * Mock data layer.
 * كل الدوال هنا متزامنة الآن، ويمكن استبدالها لاحقاً بنداءات API / Gemini
 * دون تغيير واجهات المكوّنات.
 */

export type Category = "تراثي" | "طبيعي" | "ترفيهي" | "ثقافي" | "مطاعم ومقاهي";

export interface Destination {
  id: string;
  name: string;
  city: string;
  category: Category;
  description: string;
  image: string;
  rating: number;
  isOpen: boolean;
  hours: string;
  familyFriendly: boolean;
  accessible: boolean;
  weather: string;
  crowd: "منخفض" | "متوسط" | "مرتفع";
  accessibilityNote: string;
  activities: string[];
}

export const destinations: Destination[] = [
  {
    id: "diriyah",
    name: "الدرعية",
    city: "الرياض",
    category: "تراثي",
    description: "عاصمة الدولة السعودية الأولى وحي الطريف المبني بالطين النجدي.",
    image: diriyahImg,
    rating: 4.8,
    isOpen: true,
    hours: "٩:٠٠ صباحاً – ١١:٠٠ مساءً",
    familyFriendly: true,
    accessible: true,
    weather: "٢٨° مشمس – الطقس مناسب",
    crowd: "متوسط",
    accessibilityNote: "مسارات ممهدة، مصاعد، ودورات مياه مهيّأة لأصحاب الهمم.",
    activities: ["جولة في حي الطريف", "متحف الدرعية", "مقاهي البجيري", "جولة مسائية مضاءة"],
  },
  {
    id: "alula",
    name: "العلا",
    city: "المدينة المنورة",
    category: "طبيعي",
    description: "متحف مفتوح من التكوينات الصخرية والمقابر النبطية في الحِجر.",
    image: alulaImg,
    rating: 4.9,
    isOpen: true,
    hours: "٨:٠٠ صباحاً – ٦:٠٠ مساءً",
    familyFriendly: true,
    accessible: false,
    weather: "٣٠° صافٍ",
    crowd: "منخفض",
    accessibilityNote: "بعض المسارات رملية وغير ممهدة بالكامل.",
    activities: ["جبل الفيل", "الحِجر", "منطاد الهواء", "رحلة نجوم الصحراء"],
  },
  {
    id: "jeddah",
    name: "جدة التاريخية",
    city: "جدة",
    category: "تراثي",
    description: "أزقة البلد والرواشين الخشبية وبيوت الحجر المرجاني.",
    image: jeddahImg,
    rating: 4.6,
    isOpen: true,
    hours: "١٠:٠٠ صباحاً – ١٢:٠٠ منتصف الليل",
    familyFriendly: true,
    accessible: true,
    weather: "٣٢° رطب",
    crowd: "مرتفع",
    accessibilityNote: "مسارات رئيسية مناسبة للكراسي المتحركة.",
    activities: ["بيت نصيف", "سوق العلوي", "جولة الرواشين"],
  },
  {
    id: "abha",
    name: "أبها",
    city: "عسير",
    category: "طبيعي",
    description: "مرتفعات خضراء وضباب وقرى حجرية على حافة الجبل.",
    image: abhaImg,
    rating: 4.7,
    isOpen: true,
    hours: "مفتوح على مدار اليوم",
    familyFriendly: true,
    accessible: false,
    weather: "١٩° ضباب خفيف",
    crowd: "متوسط",
    accessibilityNote: "مسارات جبلية شديدة الانحدار في بعض المواقع.",
    activities: ["تلفريح السودة", "قرية رجال ألمع", "مسار المشي الجبلي"],
  },
  {
    id: "boulevard",
    name: "بوليفارد سيتي",
    city: "الرياض",
    category: "ترفيهي",
    description: "منطقة ترفيهية حديثة بالمطاعم والعروض والفعاليات الليلية.",
    image: boulevardImg,
    rating: 4.5,
    isOpen: false,
    hours: "٤:٠٠ مساءً – ١:٠٠ صباحاً",
    familyFriendly: true,
    accessible: true,
    weather: "٢٦° لطيف",
    crowd: "مرتفع",
    accessibilityNote: "مسارات مستوية ومواقف مخصصة لأصحاب الهمم.",
    activities: ["عروض حية", "مطاعم عالمية", "ألعاب عائلية"],
  },
  {
    id: "museum",
    name: "المتحف الوطني",
    city: "الرياض",
    category: "ثقافي",
    description: "رحلة داخلية في تاريخ الجزيرة العربية عبر ثماني قاعات.",
    image: museumImg,
    rating: 4.4,
    isOpen: true,
    hours: "٩:٠٠ صباحاً – ٩:٠٠ مساءً",
    familyFriendly: true,
    accessible: true,
    weather: "نشاط داخلي – غير متأثر بالطقس",
    crowd: "منخفض",
    accessibilityNote: "مهيّأ بالكامل لأصحاب الهمم.",
    activities: ["قاعة الحضارات", "معرض الحج", "جولة مرشدة"],
  },
];

export function getDestination(id: string) {
  return destinations.find((d) => d.id === id);
}

export interface TimelineItem {
  id: string;
  time: string;
  title: string;
  place: string;
  weather: string;
  booking: "مؤكد" | "بدون حجز" | "قيد الانتظار";
  travel: string;
  status: "منجز" | "قادم" | "جارٍ";
  indoor: boolean;
}

export const todayItinerary: TimelineItem[] = [
  { id: "t1", time: "09:00", title: "إفطار", place: "مقهى البجيري", weather: "٢٤° مشمس", booking: "بدون حجز", travel: "٥ دقائق مشياً", status: "منجز", indoor: true },
  { id: "t2", time: "10:30", title: "زيارة الدرعية", place: "حي الطريف", weather: "٢٨° مشمس", booking: "مؤكد", travel: "١٢ دقيقة بالسيارة", status: "جارٍ", indoor: false },
  { id: "t3", time: "13:00", title: "مطعم نجدي", place: "الدرعية", weather: "٣٠° مشمس", booking: "مؤكد", travel: "٧ دقائق مشياً", status: "قادم", indoor: true },
  { id: "t4", time: "16:00", title: "ممشى خارجي", place: "وادي حنيفة", weather: "أمطار متوقعة", booking: "بدون حجز", travel: "١٥ دقيقة بالسيارة", status: "قادم", indoor: false },
  { id: "t5", time: "19:00", title: "بوليفارد سيتي", place: "الرياض", weather: "٢٦° لطيف", booking: "قيد الانتظار", travel: "٢٠ دقيقة بالسيارة", status: "قادم", indoor: false },
];

export interface Challenge {
  id: string;
  destinationId: string;
  title: string;
  task: string;
  points: number;
}

export const challenges: Challenge[] = [
  { id: "c1", destinationId: "diriyah", title: "تحدي الدرعية", task: "📸 صوّر باباً نجدياً تقليدياً", points: 50 },
  { id: "c2", destinationId: "diriyah", title: "تحدي البجيري", task: "📸 صوّر منظر الطريف عند الغروب", points: 40 },
  { id: "c3", destinationId: "alula", title: "تحدي العلا", task: "📸 صوّر جبل الفيل من الزاوية الجنوبية", points: 70 },
  { id: "c4", destinationId: "jeddah", title: "تحدي البلد", task: "📸 صوّر روشاناً خشبياً بلونه الأصلي", points: 60 },
];

export interface Reward {
  id: string;
  title: string;
  emoji: string;
  points: number;
  partner: string;
}

export const rewards: Reward[] = [
  { id: "r1", emoji: "☕", title: "كوب قهوة مجاني", points: 200, partner: "مقاهي شريكة" },
  { id: "r2", emoji: "🎟️", title: "خصم ٢٠٪ على تجربة سياحية", points: 400, partner: "تجارب معتمدة" },
  { id: "r3", emoji: "🍽️", title: "خصم في مطعم شريك", points: 300, partner: "مطاعم شريكة" },
  { id: "r4", emoji: "🚗", title: "رحلة توصيل مجانية", points: 250, partner: "شركاء النقل" },
];

export const tripCompanions = ["فردي", "أصدقاء", "عائلة", "زوجين"] as const;
export const placeTypes = ["تراثية", "طبيعية", "ترفيهية", "ثقافية", "مطاعم ومقاهي"] as const;
export const accessNeeds = ["مناسب لأصحاب الهمم", "سهولة الوصول", "بدون متطلبات خاصة"] as const;
export const cities = ["الرياض", "جدة", "العلا", "أبها", "الدمام", "المدينة المنورة"] as const;