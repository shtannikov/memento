export const POMNENKA_HOSTNAME = "pomnenka.me";
export const POMNENKA_SITE_HEADER = "x-memento-site";
export const POMNENKA_SITE = "pomnenka";

export function titleForSite(defaultTitle: string, site: string | null) {
  return site === POMNENKA_SITE
    ? defaultTitle.replace("Memento", "Pomněnka")
    : defaultTitle;
}

export function isPomnenkaProductionRequest(
  hostname: string,
  vercelEnvironment = process.env.VERCEL_ENV,
) {
  return (
    vercelEnvironment === "production" && hostname === POMNENKA_HOSTNAME
  );
}

export function isPomnenkaSiteRequest(
  hostname: string,
  requestedSite: string | null,
  vercelEnvironment = process.env.VERCEL_ENV,
) {
  if (isPomnenkaProductionRequest(hostname, vercelEnvironment)) return true;
  return (
    vercelEnvironment !== "production" && requestedSite === POMNENKA_SITE
  );
}

export function pomnenkaPublicPath(
  path: string,
  vercelEnvironment = process.env.VERCEL_ENV,
) {
  return vercelEnvironment === "production"
    ? path
    : `${path}?site=${POMNENKA_SITE}`;
}
