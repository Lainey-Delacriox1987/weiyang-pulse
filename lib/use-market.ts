"use client";
import { useCallback, useEffect, useState } from "react";

export type Team = { id: string; code: string; name: string; idea: string; createdAt: number };
export type MarketEvent = { id: string; kind: string; teamId: string | null; label: string; note: string; status: string; demo: number; createdAt: number };
export type Market = { teams: Team[]; events: MarketEvent[]; serverNow: number; voteCounts: Record<string, number>; totalVotes: number };

export function getActor() {
  let actor = localStorage.getItem("pulse-actor");
  if (!actor) { actor = crypto.randomUUID(); localStorage.setItem("pulse-actor", actor); }
  return actor;
}

export function useMarket() {
  const [market, setMarket] = useState<Market | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error("数据暂时不可用");
      setMarket(await response.json() as Market);
      setError("");
    } catch { setError("连接中断，正在重试…"); }
  }, []);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 3000); return () => clearInterval(timer); }, [refresh]);
  return { market, error, refresh };
}

export async function sendAction(input: Record<string, unknown>) {
  const response = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, actor: getActor() }) });
  const data = await response.json() as { ok?: boolean; error?: string; teamId?: string; eventId?: string };
  if (!response.ok) throw new Error(data.error || "操作失败，请稍后重试。");
  return data;
}
