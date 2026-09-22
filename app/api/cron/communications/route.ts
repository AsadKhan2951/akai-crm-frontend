import { processCommunicationQueue } from "@/lib/admin/communications-system-job";
import { processWebPushNotifications } from "@/lib/admin/web-push-system-job";
import { requireCronSecret } from "@/lib/admin/system-job";

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const rawLimit = new URL(request.url).searchParams.get("limit");
    const limit = rawLimit && /^\d+$/.test(rawLimit) ? Number.parseInt(rawLimit, 10) : 25;
    const [messages, push] = await Promise.all([processCommunicationQueue(limit), processWebPushNotifications(limit * 4)]);
    return Response.json({ messages, push });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Communication queue failed.";
    if (message === "Unauthorized") return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Communication queue could not be processed." }, { status: 500 });
  }
}
