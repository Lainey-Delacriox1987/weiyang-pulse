import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { events } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const input = await request.json() as { pin?: string; action?: string; eventId?: string };
    const expected = env.ADMIN_PIN || (process.env.NODE_ENV === "development" ? "pulse-demo" : "");
    if (!expected || input.pin !== expected) return Response.json({ error: "管理口令不正确。" }, { status: 403 });
    const db = getDb();
    if (input.action === "hide" || input.action === "resolve") {
      const [target] = await db.select().from(events).where(eq(events.id, input.eventId || "")).limit(1);
      if (!target) return Response.json({ error: "这条动态不存在。" }, { status: 404 });
      if (input.action === "resolve" && target.kind !== "help") return Response.json({ error: "只能解决求助单。" }, { status: 400 });
      await db.update(events).set({ status: input.action === "hide" ? "hidden" : "resolved" }).where(eq(events.id, target.id));
      return Response.json({ ok: true });
    }
    if (input.action === "clear-demo") {
      const all = await db.select().from(events).where(eq(events.demo, 1));
      for (const item of all) await db.delete(events).where(eq(events.id, item.id));
      return Response.json({ ok: true, removed: all.length });
    }
    return Response.json({ error: "未知管理操作。" }, { status: 400 });
  } catch (error) { console.error(error); return Response.json({ error: "管理操作失败，请重试。" }, { status: 500 }); }
}
