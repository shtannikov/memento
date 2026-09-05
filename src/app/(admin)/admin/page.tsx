import type { Metadata } from "next";
import { headers } from "next/headers";

import { AdminPage } from "@admin/ui/admin-page";
import {
  POMNENKA_SITE_HEADER,
  titleForSite,
} from "@/app/site-routing";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();

  return {
    title: titleForSite(
      "Memento Admin",
      requestHeaders.get(POMNENKA_SITE_HEADER),
    ),
  };
}

export default AdminPage;
