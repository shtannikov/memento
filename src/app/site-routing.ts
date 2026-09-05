export const POMNENKA_HOSTNAME = "pomnenka.me";
export const POMNENKA_SITE_HEADER = "x-memento-site";
export const POMNENKA_SITE = "pomnenka";

export function isPomnenkaProductionRequest(
  hostname: string,
  vercelEnvironment = process.env.VERCEL_ENV,
) {
  return (
    vercelEnvironment === "production" && hostname === POMNENKA_HOSTNAME
  );
}
