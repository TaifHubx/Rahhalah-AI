import { useEffect, useState } from "react";
import type { ItineraryStop, SmartItinerary, TripPreferences } from "./trip-types";

/**
 * تخزين الرحلة المولّدة من Gemini محلياً حتى تُعرض في الخط الزمني والخريطة معاً،
 * ويبقى نفس المصدر للبيانات بعد أي تعديل لحظي.
 */

const KEY = "rahhalah-trip";

export interface StoredTrip {
  itinerary: SmartItinerary;
  preferences: TripPreferences;
  createdAt: number;
}

let trip: StoredTrip | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) trip = JSON.parse(raw) as StoredTrip;
  } catch {
    trip = null;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    if (trip) window.localStorage.setItem(KEY, JSON.stringify(trip));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* التخزين المحلي غير متاح */
  }
}

export const tripStore = {
  get: () => trip,
  save(itinerary: SmartItinerary, preferences: TripPreferences) {
    trip = { itinerary, preferences, createdAt: Date.now() };
    persist();
    emit();
  },
  clear() {
    trip = null;
    persist();
    emit();
  },
  /** يستبدل محطة بعنوان معيّن ببديل مقترح — يُحدّث الخط الزمني والخريطة معاً. */
  replaceStop(dayIndex: number, stopTitle: string, replacement: ItineraryStop) {
    if (!trip) return;
    const days = trip.itinerary.days.map((day, i) => {
      if (i !== dayIndex) return day;
      const idx = day.stops.findIndex((s) => s.title === stopTitle);
      if (idx === -1) return day;
      const stops = [...day.stops];
      stops[idx] = { ...replacement, time: replacement.time || stops[idx]!.time };
      return { ...day, stops };
    });
    trip = { ...trip, itinerary: { ...trip.itinerary, days } };
    persist();
    emit();
  },
};

export function useTrip() {
  const [snapshot, setSnapshot] = useState<StoredTrip | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    hydrate();
    const listener = () => setSnapshot(tripStore.get());
    listeners.add(listener);
    listener();
    setReady(true);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return { trip: snapshot, ready };
}
