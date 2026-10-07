"use client";
import type { MarketEvent } from "@/lib/use-market";

export default function PulseLine({ events }: { events: MarketEvent[] }) {
  const now = Date.now();
  const buckets = Array.from({ length: 16 }, () => 0);
  for (const event of events) {
    if (event.demo === 1 || event.status === "hidden") continue;
    const age = now - event.createdAt;
    if (age >= 0 && age < 240000) buckets[15 - Math.floor(age / 15000)]++;
  }
  const points = ["0,36"];
  buckets.forEach((count, index) => {
    const x = index * 15;
    if (!count) { points.push((x + 15) + ",36"); return; }
    const peak = Math.max(7, 29 - count * 6);
    points.push((x + 4) + ",36", (x + 7) + "," + peak, (x + 10) + ",47", (x + 14) + ",36");
  });
  return <svg viewBox="0 0 240 56" preserveAspectRatio="none" role="img" aria-label="近四分钟现场互动心跳曲线"><polyline points={points.join(" ")}/></svg>;
}
