import type { AdminUserAppRow, ResetLimitsResult } from "@admin/ui/admin.types";

export class AdminClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AdminClientError";
  }
}

export async function loadAdminUsers(initData: string): Promise<AdminUserAppRow[]> {
  const payload = await adminRequest<{ users: AdminUserAppRow[] }>(
    initData,
    "/api/admin/users",
    { method: "GET" },
  );
  return payload.users;
}

export async function resetAdminLimits(
  initData: string,
  userId: number,
  appId: string,
): Promise<ResetLimitsResult> {
  const payload = await adminRequest<{ result: ResetLimitsResult }>(
    initData,
    `/api/admin/users/${userId}/apps/${encodeURIComponent(appId)}/reset`,
    { method: "POST" },
  );
  return payload.result;
}

async function adminRequest<T>(
  initData: string,
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `tma ${initData}` },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload !== "object") {
    const record = payload && typeof payload === "object"
      ? payload as Record<string, unknown>
      : {};
    throw new AdminClientError(
      typeof record.code === "string" ? record.code : "REQUEST_FAILED",
      typeof record.message === "string" ? record.message : "Request failed.",
      response.status,
    );
  }
  return payload as T;
}
