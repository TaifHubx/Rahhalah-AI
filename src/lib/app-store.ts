import { useEffect, useState } from "react";

/**
 * حالة تطبيق بسيطة (نقاط + رحلتي) بدون مكتبات خارجية.
 * يمكن استبدالها لاحقاً بمخزن مرتبط بالـ backend.
 */

type State = {
  points: number;
  tripIds: string[];
  completedChallenges: string[];
};

// يبدأ الزائر غير المسجَّل من صفر حقيقي — نفس منطق الحساب المسجَّل فعلياً (Supabase)، بلا أي
// نقاط أو رحلة تجريبية مسبقة الملء توحي بفعل لم يحدث فعلاً.
let state: State = { points: 0, tripIds: [], completedChallenges: [] };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const appStore = {
  get: () => state,
  addToTrip: (id: string) =>
    set({ tripIds: state.tripIds.includes(id) ? state.tripIds : [...state.tripIds, id] }),
  removeFromTrip: (id: string) => set({ tripIds: state.tripIds.filter((t) => t !== id) }),
  completeChallenge: (id: string, points: number) => {
    if (state.completedChallenges.includes(id)) return;
    set({
      completedChallenges: [...state.completedChallenges, id],
      points: state.points + points,
    });
  },
  redeem: (points: number) => set({ points: Math.max(0, state.points - points) }),
};

export function useAppStore() {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => {
    const listener = () => setSnapshot(appStore.get());
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return snapshot;
}
