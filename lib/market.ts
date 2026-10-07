import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { events, teams } from "@/db/schema";

const seedTeams = [
  { id: "neon", code: "NEON", name: "霓虹实验室", idea: "把夜晚的校园变成一张可探索的地图" },
  { id: "404", code: "404", name: "404 灵感俱乐部", idea: "让找不到的灵感主动找到你" },
  { id: "wave", code: "WAVE", name: "声浪制造局", idea: "用声音把陌生人连接起来" },
  { id: "loop", code: "LOOP", name: "循环信号", idea: "给闲置物品安排下一次冒险" },
];

export async function ensureSeed() {
  const db = getDb();
  const existing = await db.select({ id: teams.id }).from(teams).limit(1);
  if (existing.length) return;
  const now = Date.now();
  for (const team of seedTeams) await db.insert(teams).values({ ...team, createdAt: now }).onConflictDoNothing();
  const sample = [
    { id: "demo-m1", kind: "milestone", teamId: "wave", label: "首个 Demo 跑通", note: "声音明信片终于可以发出去了", createdAt: now - 240000 },
    { id: "demo-h1", kind: "help", teamId: "404", label: "需要设计搭子", note: "需要一位会 Figma 的伙伴，帮忙看下路演页面", createdAt: now - 480000 },
    { id: "demo-c1", kind: "cheer", teamId: "neon", label: "喝彩", note: "", createdAt: now - 600000 },
  ];
  for (const item of sample) await db.insert(events).values({ ...item, actor: "demo", status: "open", demo: 1 }).onConflictDoNothing();
}

export async function marketSnapshot() {
  await ensureSeed();
  const db = getDb();
  const [allTeams, recentEvents, voteRows] = await Promise.all([
    db.select().from(teams).orderBy(teams.createdAt),
    db.select().from(events).orderBy(desc(events.createdAt)).limit(150),
    db.select({ teamId: events.teamId, count: sql<number>`count(*)` }).from(events).where(and(eq(events.kind, "vote"), eq(events.status, "open"), eq(events.demo, 0))).groupBy(events.teamId),
  ]);
  const voteCounts = Object.fromEntries(voteRows.filter(row => row.teamId).map(row => [row.teamId!, Number(row.count)]));
  const totalVotes = voteRows.reduce((sum, row) => sum + Number(row.count), 0);
  return { teams: allTeams, voteCounts, totalVotes, events: recentEvents.map(({ actor: _actor, ...event }) => ({ ...event, note: event.kind === "claim" ? "" : event.note })), serverNow: Date.now() };
}

export async function submitAction(input: Record<string, unknown>) {
  await ensureSeed();
  const db = getDb();
  const kind = String(input.kind || "");
  const actor = String(input.actor || "").trim().slice(0, 80);
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(actor)) throw new Error("请刷新页面后再试。匿名设备标识无效。");
  const now = Date.now();
  const minute = await db.select({ id: events.id }).from(events).where(and(eq(events.actor, actor), gte(events.createdAt, now - 60000))).limit(10);
  if (minute.length >= 10) throw new Error("操作太频繁了，请一分钟后再试。");

  if (kind === "team") {
    const name = String(input.name || "").trim().slice(0, 28);
    const idea = String(input.idea || "").trim().slice(0, 90);
    if (name.length < 2 || idea.length < 4) throw new Error("请填写队伍名和一句话项目介绍。");
    const code = name.replace(/\s+/g, "").slice(0, 8).toUpperCase();
    const id = crypto.randomUUID();
    await db.insert(teams).values({ id, code: code + id.slice(0, 2).toUpperCase(), name, idea, createdAt: now });
    return { ok: true, teamId: id };
  }

  const allowed = ["cheer", "icebreak", "help", "milestone", "vote", "resolve", "claim"];
  if (!allowed.includes(kind)) throw new Error("未知操作。");
  const teamId = String(input.teamId || "");
  const [team] = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) throw new Error("请先选择一支队伍。");
  const label = String(input.label || "").trim().slice(0, 50);
  const note = String(input.note || "").trim().slice(0, 160);

  if (kind === "claim") {
    const targetId = String(input.targetId || "");
    const [target] = await db.select().from(events).where(eq(events.id, targetId)).limit(1);
    if (!target || target.kind !== "help") throw new Error("这张求助单不存在或已经关闭。");
    if (target.status === "resolved") throw new Error("这张求助单已经解决了。");
    if (target.actor === actor) throw new Error("这是你自己发布的求助，可以标记为已解决。");
    if (target.status === "claimed") throw new Error("已经有人认领了这张求助单，去看看别的？");
    const claimed = await db.update(events).set({ status: "claimed" }).where(and(eq(events.id, targetId), eq(events.status, "open"))).returning({ id: events.id });
    if (!claimed.length) throw new Error("已经有人认领了这张求助单，去看看别的？");
    const claimId = crypto.randomUUID();
    await db.insert(events).values({ id: claimId, kind: "claim", teamId: target.teamId, actor, label: "已认领一张求助", note: targetId, status: "open", demo: 0, createdAt: now });
    return { ok: true, eventId: claimId };
  }

  if (kind === "resolve") {
    const targetId = String(input.targetId || "");
    const [target] = await db.select().from(events).where(eq(events.id, targetId)).limit(1);
    if (!target || target.kind !== "help") throw new Error("只能关闭求助单。");
    const [claim] = await db.select({ id: events.id }).from(events).where(and(eq(events.kind, "claim"), eq(events.actor, actor), eq(events.note, targetId))).limit(1);
    if (target.actor !== actor && !claim) throw new Error("只有发布者或认领者可以关闭这张求助单。");
    await db.update(events).set({ status: "resolved" }).where(eq(events.id, targetId));
    return { ok: true };
  }
  if (kind === "help" && note.length < 6) throw new Error("请用至少 6 个字说清楚需要什么帮助。");
  if (kind === "milestone" && !label) throw new Error("请选择一个进度节点。");
  if (kind === "icebreak" && !label) throw new Error("先抽一张破冰挑战卡。");

  const previous = await db.select().from(events).where(and(eq(events.actor, actor), eq(events.kind, kind), gte(events.createdAt, now - (kind === "cheer" ? 300000 : 86400000)))).orderBy(desc(events.createdAt)).limit(30);
  if (kind === "vote") {
    const voted = await db.select({ id: events.id }).from(events).where(and(eq(events.actor, actor), eq(events.kind, "vote"))).limit(1);
    if (voted.length) throw new Error("你已经投过票了，每台设备限一票。");
  }
  if (kind === "cheer" && previous.some((event) => event.teamId === teamId)) throw new Error("已经为这支队伍喝彩了，5 分钟后再来！");
  if (kind === "icebreak" && previous.some((event) => event.label === label)) throw new Error("这张破冰卡已完成，抽一张新的吧。");
  if (kind === "milestone" && previous.some((event) => event.teamId === teamId && event.label === label)) throw new Error("这个进度已经播报过了。");

  const id = crypto.randomUUID();
  if (kind === "vote") {
    // A single SQLite write statement is atomic. Concurrent callers cannot
    // both pass this predicate and create a second formal vote for an actor.
    // Do not constrain other kinds: cheers and milestones permit repeats.
    const result = await db.run(sql`
      INSERT INTO events (id, kind, team_id, actor, label, note, status, demo, created_at)
      SELECT ${id}, 'vote', ${teamId}, ${actor}, ${label || "人气投票"}, ${note}, 'open', 0, ${now}
      WHERE NOT EXISTS (SELECT 1 FROM events WHERE actor = ${actor} AND kind = 'vote' AND demo = 0)
    `);
    if (Number(result.meta.changes) !== 1) throw new Error("你已经投过票了，每台设备限一票。");
    return { ok: true, eventId: id };
  }
  await db.insert(events).values({ id, kind, teamId, actor, label: label || (kind === "cheer" ? "喝彩" : kind === "vote" ? "人气投票" : "现场求助"), note, status: "open", demo: 0, createdAt: now });
  return { ok: true, eventId: id };
}
