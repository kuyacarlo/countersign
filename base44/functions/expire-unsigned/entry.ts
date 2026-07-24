import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date().toISOString();
    const claims = await base44.asServiceRole.entities.Claim.list();
    const pending = (claims || []).filter((c) => c.status === "pending");

    let expired = 0;
    for (const claim of pending) {
      if (!claim.expires_at || claim.expires_at > now) continue;
      await base44.asServiceRole.entities.Claim.update(claim.id, {
        status: "expired",
      });
      expired += 1;
    }

    return Response.json({
      ok: true,
      scanned: pending.length,
      expired,
      at: now,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: String(error?.message || error) },
      { status: 500 },
    );
  }
});
