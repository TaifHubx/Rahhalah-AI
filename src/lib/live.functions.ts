import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPrayerTimes, getWeather } from "./ai/live-tools.server";

const citySchema = z.object({ city: z.string().trim().min(1).max(80).default("الرياض") });

/** ظروف اليوم (طقس + أوقات صلاة) لمدينة الرحلة — يعيد استخدام أدوات المشروع الحالية. */
export const getCityConditions = createServerFn({ method: "POST" })
  .validator((input: unknown) => citySchema.parse(input))
  .handler(async ({ data }) => {
    const [weather, prayer] = await Promise.all([
      getWeather({ city: data.city }),
      getPrayerTimes({ city: data.city }),
    ]);
    return { city: data.city, weather, prayer };
  });
