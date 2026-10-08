"use client";
import { useState } from "react";
import { ArrowLeft, EyeOff, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMarket } from "@/lib/use-market";
import "../pulse.css";
import "./admin.css";

export default function AdminClient() {
  const { market, error, refresh } = useMarket();
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: string, eventId?: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, action, eventId }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "操作失败");
      setMessage("操作已同步到现场。"); await refresh();
    } catch (err) { setMessage(err instanceof Error ? err.message : "操作失败"); }
    finally { setBusy(false); }
  }
  const visible = market?.events.filter((event) => event.status === "open" || event.status === "claimed") || [];
  return <main className="admin-page"><header><a href="/"><img src="/weyoung-logo.png" alt="WeYoung"/><span>WeYoung</span></a><span>组织者控制台</span><a href="/"><ArrowLeft size={16}/> 返回大厅</a></header><div className="admin-wrap"><div className="admin-intro"><span className="kicker">CONTROL ROOM</span><h1>掌控现场节奏。</h1><p>查看互动、处理求助和隐藏不合适的内容。操作会影响所有人的大屏。</p>{error && <p role="status">{error}</p>}</div><div className="admin-layout"><aside className="admin-side"><div className="admin-stat"><span>队伍</span><strong>{market?.teams.length ?? "--"}</strong></div><div className="admin-stat"><span>真实互动</span><strong>{market?.events.filter((event) => event.demo === 0).length ?? "--"}</strong></div><div className="admin-stat"><span>待解决求助</span><strong>{visible.filter((event) => event.kind === "help").length}</strong></div><label htmlFor="admin-pin">管理口令</label><Input id="admin-pin" value={pin} onChange={(event) => setPin(event.target.value)} type="password" placeholder="输入口令后操作"/><Button variant="outline" disabled={busy || !pin || !market?.events.some((event) => event.demo)} onClick={() => run("clear-demo")}><Trash2 size={16}/> 清除演示事件</Button><small>本地开发默认口令见 README；线上口令由站点管理员配置。</small></aside><section className="admin-events"><div className="admin-events-head"><h2>现场动态</h2><span>{visible.length} 条显示中</span></div>{visible.length ? visible.map((event) => <div className="admin-event" key={event.id}><div><span>{new Date(event.createdAt).toLocaleString("zh-CN")}{event.demo === 1 && " · 演示"}</span><strong>{market?.teams.find((team) => team.id === event.teamId)?.name || "现场队伍"} · {event.kind === "cheer" ? "喝彩" : event.kind === "help" ? "求助" : event.kind === "icebreak" ? "破冰" : event.kind === "vote" ? "投票" : "进度"}</strong><p>{event.note || event.label}</p></div><div className="admin-event-actions">{event.kind === "help" && <Button variant="outline" disabled={busy || !pin} onClick={() => run("resolve", event.id)}><CheckCircle2 size={15}/> 解决</Button>}<Button variant="outline" disabled={busy || !pin} onClick={() => run("hide", event.id)}><EyeOff size={15}/> 隐藏</Button></div></div>) : <p className="admin-empty">暂无现场动态，等待第一位参与者。</p>}</section></div>{message && <div className="admin-toast" role="status">{message}</div>}</div></main>;
}
