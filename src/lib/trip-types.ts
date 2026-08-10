/** أنواع الرحلة الذكية — ملف آمن للواجهة والسيرفر معاً. */

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

export interface AdaptationResult {
  needsChange: boolean;
  reason: string;
  replacedStopTitle: string;
  suggestion: ItineraryStop | null;
}

export interface TripPreferences {
  city: string;
  companions: string;
  interests: string[];
  accessNeeds: string;
  days: number;
}
