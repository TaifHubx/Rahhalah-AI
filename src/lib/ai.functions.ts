import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  adaptItinerary,
  buildSmartItinerary,
  discoverByImage,
  verifyChallengeImage,
} from "./ai/features.server";

const langSchema = z.enum(["ar", "en"]).default("ar");
const imageSchema = z
  .string()
  .startsWith("data:image/", "صيغة الصورة غير مدعومة")
  .max(8_000_000, "حجم الصورة كبير جداً (الحد ٦ ميجابايت)");

const discoverSchema = z.object({ imageDataUrl: imageSchema, lang: langSchema });
const verifySchema = z.object({
  imageDataUrl: imageSchema,
  task: z.string().trim().min(1).max(300),
  destinationName: z.string().trim().max(120).default(""),
  lang: langSchema,
});
const itinerarySchema = z.object({
  city: z.string().trim().min(1).max(80),
  companions: z.string().trim().max(80).default("فردي"),
  interests: z.array(z.string().trim().max(60)).max(8).default([]),
  accessNeeds: z.string().trim().max(120).default("بدون متطلبات خاصة"),
  lang: langSchema,
});
const adaptSchema = z.object({
  city: z.string().trim().min(1).max(80),
  stops: z
    .array(
      z.object({
        time: z.string().trim().max(10),
        title: z.string().trim().max(120),
        place: z.string().trim().max(120),
        indoor: z.boolean(),
      }),
    )
    .min(1)
    .max(12),
  lang: langSchema,
});

export const discoverSimilarDestinations = createServerFn({ method: "POST" })
  .validator((input: unknown) => discoverSchema.parse(input))
  .handler(async ({ data }) => discoverByImage(data.imageDataUrl, data.lang));

export const verifyChallengePhoto = createServerFn({ method: "POST" })
  .validator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data }) => verifyChallengeImage(data));

export const generateSmartItinerary = createServerFn({ method: "POST" })
  .validator((input: unknown) => itinerarySchema.parse(input))
  .handler(async ({ data }) => buildSmartItinerary(data));

export const adaptItineraryToConditions = createServerFn({ method: "POST" })
  .validator((input: unknown) => adaptSchema.parse(input))
  .handler(async ({ data }) => adaptItinerary(data));
