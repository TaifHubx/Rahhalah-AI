/**
 * فهرس الوجهات السعودية: المصدر الوحيد للإحداثيات والأسماء وأوقات العمل.
 * يُرسل مختصره إلى Gemini، ويُستخدم في الخريطة على الواجهة أيضاً.
 */
export interface CatalogEntry {
  id: string;
  name: string;
  nameEn: string;
  region: string;
  regionEn: string;
  traits: string;
  lat: number;
  lng: number;
  hours: string;
  indoor: boolean;
  accessible: boolean;
  /** استعلام يُستخدم مع Google Places للحصول على الحالة الحقيقية. */
  placeQuery: string;
}

export const destinationCatalog: CatalogEntry[] = [
  {
    id: "diriyah",
    name: "الدرعية",
    nameEn: "Diriyah",
    region: "الرياض",
    regionEn: "Riyadh",
    traits: "تراث نجدي، عمارة طينية، أزقة ضيقة، نخيل، وادي",
    lat: 24.7337,
    lng: 46.576,
    hours: "09:00-23:00",
    indoor: false,
    accessible: true,
    placeQuery: "Diriyah At-Turaif District Riyadh Saudi Arabia",
  },
  {
    id: "alula",
    name: "العلا",
    nameEn: "AlUla",
    region: "المدينة المنورة",
    regionEn: "Madinah",
    traits: "صحراء، تكوينات صخرية رملية، مقابر نبطية منحوتة، وديان، نجوم",
    lat: 26.6089,
    lng: 37.9216,
    hours: "08:00-20:00",
    indoor: false,
    accessible: true,
    placeQuery: "AlUla Old Town Saudi Arabia",
  },
  {
    id: "jeddah",
    name: "جدة التاريخية",
    nameEn: "Historic Jeddah",
    region: "جدة",
    regionEn: "Jeddah",
    traits: "بحر أحمر، رواشين خشبية، مبانٍ حجرية قديمة، أسواق، رطوبة",
    lat: 21.4839,
    lng: 39.1857,
    hours: "09:00-23:00",
    indoor: false,
    accessible: false,
    placeQuery: "Al-Balad Historic Jeddah Saudi Arabia",
  },
  {
    id: "abha",
    name: "أبها",
    nameEn: "Abha",
    region: "عسير",
    regionEn: "Asir",
    traits: "جبال خضراء، ضباب، أمطار، قرى حجرية معلّقة، مرتفعات، طقس بارد",
    lat: 18.2164,
    lng: 42.5053,
    hours: "مفتوح على مدار اليوم",
    indoor: false,
    accessible: true,
    placeQuery: "Abha city center Saudi Arabia",
  },
  {
    id: "rijal-almaa",
    name: "رجال ألمع",
    nameEn: "Rijal Almaa",
    region: "عسير",
    regionEn: "Asir",
    traits: "قرية جبلية حجرية ملوّنة، أبراج، مدرجات زراعية، شبيهة بالقرى الجبلية الأوروبية",
    lat: 18.1955,
    lng: 42.253,
    hours: "08:00-18:00",
    indoor: false,
    accessible: false,
    placeQuery: "Rijal Almaa Heritage Village Saudi Arabia",
  },
  {
    id: "boulevard",
    name: "بوليفارد سيتي",
    nameEn: "Boulevard City",
    region: "الرياض",
    regionEn: "Riyadh",
    traits: "مدينة حديثة، أنوار نيون، مطاعم، فعاليات، حياة ليلية",
    lat: 24.769,
    lng: 46.6203,
    hours: "16:00-02:00",
    indoor: false,
    accessible: true,
    placeQuery: "Boulevard City Riyadh Saudi Arabia",
  },
  {
    id: "museum",
    name: "المتحف الوطني",
    nameEn: "National Museum",
    region: "الرياض",
    regionEn: "Riyadh",
    traits: "متحف حديث، قاعات داخلية، معمار معاصر، ثقافة وتاريخ",
    lat: 24.6469,
    lng: 46.71,
    hours: "09:00-21:00",
    indoor: true,
    accessible: true,
    placeQuery: "National Museum of Saudi Arabia Riyadh",
  },
  {
    id: "farasan",
    name: "جزر فرسان",
    nameEn: "Farasan Islands",
    region: "جيزان",
    regionEn: "Jazan",
    traits: "شواطئ فيروزية، شعاب مرجانية، جزر، مياه صافية، غروب بحري",
    lat: 16.702,
    lng: 42.118,
    hours: "مفتوح على مدار اليوم",
    indoor: false,
    accessible: false,
    placeQuery: "Farasan Islands Jazan Saudi Arabia",
  },
  {
    id: "edge-of-the-world",
    name: "حافة العالم",
    nameEn: "Edge of the World",
    region: "الرياض",
    regionEn: "Riyadh",
    traits: "منحدرات صحراوية شاسعة، هضاب، أفق مفتوح، مشي جبلي",
    lat: 24.956,
    lng: 45.953,
    hours: "أفضل وقت قبل الغروب",
    indoor: false,
    accessible: false,
    placeQuery: "Edge of the World Jebel Fihrayn Saudi Arabia",
  },
  {
    id: "taif-roses",
    name: "الطائف ومزارع الورد",
    nameEn: "Taif Rose Farms",
    region: "مكة المكرمة",
    regionEn: "Makkah",
    traits: "مرتفعات معتدلة، حقول ورد، مدرجات زراعية، ضباب خفيف",
    lat: 21.2703,
    lng: 40.4158,
    hours: "07:00-17:00",
    indoor: false,
    accessible: true,
    placeQuery: "Taif rose farms Saudi Arabia",
  },
];

export function catalogEntry(id: string) {
  return destinationCatalog.find((d) => d.id === id);
}
