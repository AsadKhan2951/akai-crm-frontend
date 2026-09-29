/**
 * The public origin (https://crm.akai.pk) for links the server hands out.
 * Behind DigitalOcean's proxy `request.url` is the container address (https://0.0.0.0:3000),
 * so prefer NEXT_PUBLIC_APP_URL, then the forwarded host headers.
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const headers = request.headers;
  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").split(",")[0].trim();
  const proto = (headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
  if (host && !/^(0\.0\.0\.0|127\.0\.0\.1|\[::\])(:\d+)?$/.test(host)) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
