import "server-only";

import type { ResetLimitsResult } from "@admin/ui/admin.types";
import { getAdminDatabase } from "./database";

export async function resetDailyLimits(
  userId: number,
  appId: string,
): Promise<ResetLimitsResult> {
  const { data, error } = await getAdminDatabase().rpc("admin_reset_daily_limits", {
    requested_user_id: userId,
    requested_app_id: appId,
  });
  if (error) throw error;
  return data as ResetLimitsResult;
}
