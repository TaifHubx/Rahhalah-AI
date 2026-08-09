import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { appStore, useAppStore } from "@/lib/app-store";

/**
 * تقدّم المستخدم: النقاط، التحديات المنجزة، ووجهات رحلتي.
 * مسجّل الدخول → يُحفظ في Lovable Cloud. زائر → يبقى محلياً في الجلسة.
 */

export function useProgress() {
  const { user } = useAuth();
  const local = useAppStore();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const remote = useQuery({
    queryKey: ["progress", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [profile, challengeRows, tripRows] = await Promise.all([
        supabase.from("profiles").select("display_name, points").eq("id", userId!).maybeSingle(),
        supabase.from("user_challenges").select("challenge_id").eq("user_id", userId!),
        supabase.from("user_trip_items").select("destination_id").eq("user_id", userId!),
      ]);
      return {
        displayName: profile.data?.display_name ?? "",
        points: profile.data?.points ?? 0,
        completedChallenges: (challengeRows.data ?? []).map((r) => r.challenge_id),
        tripIds: (tripRows.data ?? []).map((r) => r.destination_id),
      };
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["progress", userId] });
    void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  }, [queryClient, userId]);

  const addToTrip = useCallback(
    async (destinationId: string) => {
      if (!userId) return appStore.addToTrip(destinationId);
      await supabase.from("user_trip_items").insert({ user_id: userId, destination_id: destinationId });
      invalidate();
    },
    [userId, invalidate],
  );

  const removeFromTrip = useCallback(
    async (destinationId: string) => {
      if (!userId) return appStore.removeFromTrip(destinationId);
      await supabase
        .from("user_trip_items")
        .delete()
        .eq("user_id", userId)
        .eq("destination_id", destinationId);
      invalidate();
    },
    [userId, invalidate],
  );

  const completeChallenge = useCallback(
    async (input: { challengeId: string; destinationId: string; points: number }) => {
      if (!userId) return appStore.completeChallenge(input.challengeId, input.points);
      await supabase.from("user_challenges").insert({
        user_id: userId,
        challenge_id: input.challengeId,
        destination_id: input.destinationId,
        points: input.points,
      });
      invalidate();
    },
    [userId, invalidate],
  );

  const redeem = useCallback(
    async (input: { rewardId: string; points: number }) => {
      if (!userId) return appStore.redeem(input.points);
      await supabase
        .from("user_redemptions")
        .insert({ user_id: userId, reward_id: input.rewardId, points: input.points });
      invalidate();
    },
    [userId, invalidate],
  );

  const signedIn = Boolean(userId);

  return {
    signedIn,
    loading: signedIn && remote.isPending,
    displayName: signedIn ? (remote.data?.displayName ?? "") : "",
    points: signedIn ? (remote.data?.points ?? 0) : local.points,
    completedChallenges: signedIn ? (remote.data?.completedChallenges ?? []) : local.completedChallenges,
    tripIds: signedIn ? (remote.data?.tripIds ?? []) : local.tripIds,
    addToTrip,
    removeFromTrip,
    completeChallenge,
    redeem,
  };
}

export interface LeaderboardRow {
  userId: string;
  name: string;
  points: number;
  challenges: number;
}

export function useLeaderboard(destinationId: string | null) {
  return useQuery({
    queryKey: ["leaderboard", destinationId ?? "overall"],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      if (!destinationId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, points")
          .order("points", { ascending: false })
          .limit(25);
        if (error) throw error;
        return (data ?? []).map((row) => ({
          userId: row.id,
          name: row.display_name || "رحّال",
          points: row.points,
          challenges: 0,
        }));
      }

      const { data, error } = await supabase
        .from("user_challenges")
        .select("user_id, points")
        .eq("destination_id", destinationId);
      if (error) throw error;

      const totals = new Map<string, { points: number; challenges: number }>();
      for (const row of data ?? []) {
        const current = totals.get(row.user_id) ?? { points: 0, challenges: 0 };
        totals.set(row.user_id, {
          points: current.points + row.points,
          challenges: current.challenges + 1,
        });
      }
      if (totals.size === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", [...totals.keys()]);
      const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

      return [...totals.entries()]
        .map(([userId, value]) => ({
          userId,
          name: names.get(userId) || "رحّال",
          points: value.points,
          challenges: value.challenges,
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 25);
    },
  });
}
