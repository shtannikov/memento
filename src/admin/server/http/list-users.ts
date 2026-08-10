import { NextResponse } from "next/server";

import { authenticateAdminRequest } from "../auth";
import { loadAdminStatistics } from "../statistics";
import { adminApiError } from "./responses";

export async function GET(request: Request) {
  try {
    await authenticateAdminRequest(request);
    return NextResponse.json({ users: await loadAdminStatistics() });
  } catch (error) {
    return adminApiError(error);
  }
}
