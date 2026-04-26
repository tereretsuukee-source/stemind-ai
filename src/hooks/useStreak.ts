import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Daily activity streak: consecutive UTC days (ending today or yesterday) where
 * the user solved at least 1 problem.
 */
export const useStreak = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["streak", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Pull last 60 days of problem timestamps
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const { data, error } = await supabase
        .from("problems")
        .select("created_at")
        .eq("user_id", userId!)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;

      const dayKeys = new Set<string>();
      for (const row of data ?? []) {
        const d = new Date(row.created_at);
        dayKeys.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`);
      }

      const today = new Date();
      const startOffset = (() => {
        const k = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        if (dayKeys.has(k(today))) return 0;
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        if (dayKeys.has(k(yest))) return 1;
        return -1; // streak broken
      })();

      if (startOffset === -1) return 0;

      let streak = 0;
      const cursor = new Date(today);
      cursor.setDate(cursor.getDate() - startOffset);
      while (true) {
        const key = `${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}-${cursor.getUTCDate()}`;
        if (dayKeys.has(key)) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else break;
      }
      return streak;
    },
  });
};
