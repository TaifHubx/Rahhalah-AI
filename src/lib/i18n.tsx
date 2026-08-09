import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** دعم عربي/إنجليزي مع تبديل الاتجاه RTL/LTR. */

export type Lang = "ar" | "en";

const STORAGE_KEY = "rahhalah-lang";

const dict = {
  ar: {
    "nav.home": "الرئيسية",
    "nav.explore": "استكشف",
    "nav.trip": "رحلتي",
    "nav.challenges": "التحديات",
    "nav.rewards": "المكافآت",
    "nav.leaderboard": "المتصدرون",
    "nav.menu": "القائمة",
    "nav.profile": "الملف الشخصي",
    "auth.login": "تسجيل الدخول",
    "auth.logout": "خروج",
    "auth.signup": "إنشاء حساب",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.name": "الاسم الظاهر",
    "auth.haveAccount": "لدي حساب بالفعل",
    "auth.noAccount": "ليس لدي حساب",
    "auth.loginTitle": "تسجيل الدخول",
    "auth.signupTitle": "إنشاء حساب جديد",
    "auth.subtitle": "احفظ نقاطك ورحلاتك وتنافس على لوحة المتصدرين.",
    "auth.google": "الدخول بحساب Google",
    "auth.or": "أو",
    "auth.checkEmail": "أرسلنا رابط تأكيد إلى بريدك.",
    "points.label": "نقطة",
    "ai.title": "رحّالة AI",
    "ai.open": "افتح رحّالة AI",
    "ai.subtitle": "ارفع صورة لأي مكان في العالم ونقترح شبيهه في السعودية.",
    "ai.upload": "اختر صورة",
    "ai.analyze": "حلّل الصورة",
    "ai.analyzing": "جاري التحليل بالذكاء الاصطناعي...",
    "ai.recognized": "المكان في الصورة",
    "ai.matches": "أقرب الوجهات السعودية",
    "ai.similarity": "نسبة الشبه",
    "ai.bestTime": "أفضل وقت",
    "ai.retry": "صورة أخرى",
    "ai.view": "عرض الوجهة",
    "leaderboard.title": "لوحة المتصدرين",
    "leaderboard.subtitle": "أكثر الرحّالة جمعاً للنقاط في السعودية.",
    "leaderboard.overall": "عام",
    "leaderboard.rank": "المركز",
    "leaderboard.traveler": "الرحّال",
    "leaderboard.points": "النقاط",
    "leaderboard.empty": "لا توجد نتائج بعد — كن أول المتصدرين!",
    "leaderboard.you": "أنت",
    "common.loading": "جاري التحميل...",
    "common.error": "حدث خطأ، حاول مرة أخرى.",
    "common.close": "إغلاق",
    "common.guest": "زائر",
  },
  en: {
    "nav.home": "Home",
    "nav.explore": "Explore",
    "nav.trip": "My Trip",
    "nav.challenges": "Challenges",
    "nav.rewards": "Rewards",
    "nav.leaderboard": "Leaderboard",
    "nav.menu": "Menu",
    "nav.profile": "Profile",
    "auth.login": "Sign in",
    "auth.logout": "Sign out",
    "auth.signup": "Create account",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Display name",
    "auth.haveAccount": "I already have an account",
    "auth.noAccount": "I don't have an account",
    "auth.loginTitle": "Sign in",
    "auth.signupTitle": "Create a new account",
    "auth.subtitle": "Save your points and trips, and climb the leaderboard.",
    "auth.google": "Continue with Google",
    "auth.or": "or",
    "auth.checkEmail": "We sent a confirmation link to your email.",
    "points.label": "pts",
    "ai.title": "Rahhalah AI",
    "ai.open": "Open Rahhalah AI",
    "ai.subtitle": "Upload a photo of any place worldwide and we'll match it in Saudi Arabia.",
    "ai.upload": "Choose a photo",
    "ai.analyze": "Analyze photo",
    "ai.analyzing": "Analyzing with AI...",
    "ai.recognized": "Place in the photo",
    "ai.matches": "Closest Saudi destinations",
    "ai.similarity": "Similarity",
    "ai.bestTime": "Best time",
    "ai.retry": "Another photo",
    "ai.view": "View destination",
    "leaderboard.title": "Leaderboard",
    "leaderboard.subtitle": "Top point collectors exploring Saudi Arabia.",
    "leaderboard.overall": "Overall",
    "leaderboard.rank": "Rank",
    "leaderboard.traveler": "Traveler",
    "leaderboard.points": "Points",
    "leaderboard.empty": "No results yet — be the first!",
    "leaderboard.you": "You",
    "common.loading": "Loading...",
    "common.error": "Something went wrong, please try again.",
    "common.close": "Close",
    "common.guest": "Guest",
  },
} satisfies Record<Lang, Record<string, string>>;

export type TranslationKey = keyof (typeof dict)["ar"];

interface I18nValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      toggleLang: () => setLang(lang === "ar" ? "en" : "ar"),
      t: (key) => dict[lang][key] ?? dict.ar[key] ?? key,
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
