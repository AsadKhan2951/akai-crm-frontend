import "server-only";
import { getSystemSupabaseClient } from "./system-job";
import { providerFor } from "@/lib/messaging/providers";
import type { MessageChannel, MessageStatus } from "@/lib/types/db-enums";

function retryAt(attemptCount: number) {
  const seconds = attemptCount <= 1 ? 30 : 300;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function processCommunicationQueue(limit = 25) {
  const supabase = getSystemSupabaseClient();
  const { data: rows, error } = await supabase.rpc("claim_communications_messages", { p_limit: limit });
  if (error) throw new Error("Communication queue could not be claimed.");
  let sent = 0;
  let retried = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    try {
      const metadata = (row.metadata_json && typeof row.metadata_json === "object" ? row.metadata_json : {}) as Record<string, unknown>;
      const result = await providerFor({
        channel: row.channel as MessageChannel,
        toAddress: row.to_address,
        body: row.body,
        subject: row.subject ?? undefined,
        templateName: row.template_name ?? undefined,
        provider: row.provider === "mock" ? "mock" : undefined,
        metadataJson: metadata,
      }).send({
        channel: row.channel as MessageChannel,
        toAddress: row.to_address,
        body: row.body,
        subject: row.subject ?? undefined,
        templateName: row.template_name ?? undefined,
        provider: row.provider === "mock" ? "mock" : undefined,
        metadataJson: metadata,
      });
      const { error: updateError } = await supabase.from("message_logs").update({
        status: result.status as MessageStatus,
        provider_message_id: result.providerMessageId,
        sent_at: new Date().toISOString(),
        error_message: null,
        locked_at: null,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      if (updateError) throw new Error("The message result could not be saved.");
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider failure.";
      const nextStatus = Number(row.attempt_count) >= 3 ? "FAILED" : "QUEUED";
      const { error: updateError } = await supabase.from("message_logs").update({
        status: nextStatus,
        error_message: message.slice(0, 1000),
        next_attempt_at: nextStatus === "QUEUED" ? retryAt(Number(row.attempt_count)) : null,
        locked_at: null,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      if (updateError) throw new Error("The communication failure could not be recorded.");
      if (nextStatus === "QUEUED") retried += 1;
      else failed += 1;
    }
  }
  return { claimed: rows?.length ?? 0, sent, retried, failed };
}
