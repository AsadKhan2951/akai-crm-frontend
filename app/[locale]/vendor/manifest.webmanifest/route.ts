import buildManifest from "../manifest";

// Next.js only serves manifest.ts from the app root, so the Vendor manifest is served here.
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const body = await buildManifest({ params });
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } });
}
