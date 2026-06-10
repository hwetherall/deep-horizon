import { getDb } from "../client.js";
import type { DigestRow } from "../types.js";

/** Idempotent by digest_date (unique constraint): re-runs update in place. */
export async function upsertDigest(params: {
  scanRunId: string | null;
  digestDate: string;
  title: string;
  markdown: string;
  emailSubject?: string;
  metadata?: Record<string, unknown>;
}): Promise<DigestRow> {
  const { data, error } = await getDb()
    .from("digests")
    .upsert(
      {
        scan_run_id: params.scanRunId,
        digest_date: params.digestDate,
        title: params.title,
        markdown: params.markdown,
        email_subject: params.emailSubject ?? null,
        metadata: params.metadata ?? {}
      },
      { onConflict: "digest_date" }
    )
    .select()
    .single();
  if (error) throw new Error(`upsertDigest failed: ${error.message}`);
  return data as DigestRow;
}

export async function setDigestItems(
  digestId: string,
  items: { opportunityId: string; rank: number; reason?: string }[]
): Promise<void> {
  const db = getDb();
  const { error: delError } = await db
    .from("digest_items")
    .delete()
    .eq("digest_id", digestId);
  if (delError) throw new Error(`setDigestItems delete failed: ${delError.message}`);
  if (items.length === 0) return;
  const { error } = await db.from("digest_items").insert(
    items.map((i) => ({
      digest_id: digestId,
      opportunity_id: i.opportunityId,
      rank: i.rank,
      reason: i.reason ?? null
    }))
  );
  if (error) throw new Error(`setDigestItems insert failed: ${error.message}`);
}

export async function markDigestEmailSent(
  digestId: string,
  providerMessageId: string
): Promise<void> {
  const { error } = await getDb()
    .from("digests")
    .update({
      email_sent_at: new Date().toISOString(),
      email_provider_message_id: providerMessageId
    })
    .eq("id", digestId);
  if (error) throw new Error(`markDigestEmailSent failed: ${error.message}`);
}

export async function getLastDigest(): Promise<DigestRow | null> {
  const { data, error } = await getDb()
    .from("digests")
    .select()
    .order("digest_date", { ascending: false })
    .limit(1);
  if (error) throw new Error(`getLastDigest failed: ${error.message}`);
  return (data?.[0] as DigestRow | undefined) ?? null;
}
