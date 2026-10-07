"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, Expand, HeartPulse, Lightbulb, Sparkles, Vote } from "lucide-react";
import { useMarket } from "@/lib/use-market";
import PulseLine from "../pulse-line";
import VoteBurst, { type VoteBurstData } from "../vote/vote-burst";
import "../pulse.css";
import "../vote/vote.css";
import "./screen.css";

const weights: Record<string, number> = { cheer: 2, icebreak: 6, help: 7, milestone: 10, vote: 4 };
export default function ScreenClient() {
  const { market, error } = useMarket();
  const [qr, setQr] = useState("");
  const [clock, setClock] = useState("");
  const [burst, setBurst] = useState<VoteBurstData | null>(null);
  const seenVotes = useRef<Set<string> | null>(null);
  useEffect(() => { QRCode.toDataURL(window.location.origin + "/join", { width: 220, margin: 1, color: { dark: "#10131b", light: "#ffffff" } }).then(setQr); const update = () => setClock(new Date().toLocaleTimeString("zh-CN", { hour12: false })); update(); const timer = setInterval(update, 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!market) return;
    const current = market.events.filter((event) => event.kind === "vote" && event.status === "open" && !event.demo);
    if (!seenVotes.current) { seenVotes.current = new Set(current.map((event) => event.id)); return; }
    const newest = current.find((event) => !seenVotes.current?.has(event.id));
    current.forEach((event) => seenVotes.current?.add(event.id));
    if (newest) setBurst({ id: newest.id, team: market.teams.find((team) => team.id === newest.teamId)?.name || "一支队伍", demo: false });
  }, [market]);
  useEffect(() => { if (!burst) return; const timer = setTimeout(() => setBurst(null), 3600); return () => clearTimeout(timer); }, [burst]);
  const teams = (market?.teams || []).map((team) => ({ ...team, score: (market?.events || []).filter((event) => event.teamId === team.id && event.status === "open").reduce((sum, event) => sum + (weights[event.kind] || 0), 0) })).sort((a,b) => b.score - a.score);
  const feed = (market?.events || []).filter((event) => event.status === "open" || (event.kind === "help" && event.status === "claimed")).slice(0, 6);
  const helps = feed.filter((event) => event.kind === "help");
  const openHelps = (market?.events || []).filter((event) => event.kind === "help" && (event.status === "open" || event.status === "claimed"));
  const votes = (market?.events || []).filter((event) => event.kind === "vote" && event.status === "open" && !event.demo);
  const voteLeader = teams.map((team) => ({ name: team.name, votes: votes.filter((event) => event.teamId === team.id).length })).sort((a,b) => b.votes - a.votes)[0];
  function title(kind: string) { return kind === "cheer" ? "收到喝彩" : kind === "icebreak" ? "完成破冰" : kind === "help" ? "发出求助" : kind === "claim" ? "认领了一张求助" : kind === "vote" ? "收到一张投票" : "播报进度"; }
  return <main className="screen-page">
    <header className="screen-top"><div className="screen-logo"><img src="/weyoung-logo.png" alt="WeYoung"/><span>WeYoung</span></div><div className="screen-top-right"><span className="screen-live">● {error ? "连接中断" : "现场直播"}</span><strong>{clock}</strong><button onClick={() => document.documentElement.requestFullscreen?.()} aria-label="全屏显示"><Expand size={19}/></button><Link href="/" aria-label="返回大厅"><ArrowLeft size={19}/></Link></div></header>
    <div className="screen-ticker"><span>即时快讯</span><div>{feed.length ? feed.map((event) => (teams.find((team) => team.id === event.teamId)?.name || "现场队伍") + " " + title(event.kind)).join("  ✦  ") : "扫码加入现场，让第一条消息出现在这里"}</div></div>
    <div className="screen-main"><section className="screen-headline"><div><span className="screen-eyebrow">HACKATHON NIGHT / ENERGY LIVE</span><h1>今晚，让<em>灵感</em>被看见。</h1><p>每一次互动，都在点亮现场正在发生的好点子。</p></div><div className="screen-heart"><HeartPulse size={30}/><span>全场心跳</span><strong>{Math.min(100, (market?.events || []).filter((event) => event.demo === 0 && event.status !== "hidden" && Date.now() - event.createdAt < 240000).length * 8)}<small> / 100</small></strong><PulseLine key={market?.events[0]?.id || "empty"} events={market?.events || []}/></div></section>
      <div className="screen-columns"><section className="screen-market"><div className="screen-section-head"><span>01 / TEAM POPULARITY</span><h2>队伍热度</h2><small>互动热度 · 实时更新</small></div><div className="screen-table-head"><span>排名 / 队伍</span><span>最新状态</span><span>热度</span></div><div className="screen-team-list">{teams.map((team, index) => <div className="screen-team" key={team.id}><div><b>{String(index+1).padStart(2,"0")}</b><span className="screen-team-symbol">{team.code.slice(0,2)}</span><div><strong>{team.name}</strong><small>{team.idea}</small></div></div><span>{openHelps.some((help) => help.teamId === team.id) ? (openHelps.find((help) => help.teamId === team.id)?.status === "claimed" ? "有人支援中" : "正在求助") : "正在创造"}</span><strong>{team.score}<small> PTS</small></strong></div>)}</div><div className="screen-disclaimer">热度只代表现场互动，不代表项目评审成绩。</div></section>
      <aside className="screen-sidebar"><div className="screen-qr"><div>{qr && <img src={qr} alt="扫描二维码，进入手机互动页面"/>}</div><section><span>SCAN TO JOIN</span><h2>扫一下，<br/>给现场加一拍。</h2><p>喝彩 · 破冰 · 求助 · 投票</p></section></div><div className="screen-side-card"><div><Sparkles/><span>破冰盲盒</span></div><strong>找一个陌生人，交换一个还没说出口的点子。</strong><small>打开手机页面，抽取你的任务</small></div><div className="screen-side-card help-side"><div><Lightbulb/><span>求助信号</span></div><strong>{openHelps[0]?.note || "现在没有待解决的求助，随时欢迎发布。"}</strong><small>{openHelps[0] ? (teams.find((team) => team.id === openHelps[0].teamId)?.name || "现场队伍") + (openHelps[0].status === "claimed" ? " · 已有人认领" : " · 等待支援") : "现场互助开放中"}</small></div><div className="screen-side-card vote-side"><div><Vote/><span>人气投票</span></div><strong>{votes.length ? voteLeader?.name + " 暂时领先" : "等待第一张选票"}</strong><small>{votes.length} 票已投 · <Link href="/vote">打开实时投票页 ↗</Link></small></div></aside></div>
      <section className="screen-feed"><span>LIVE FEED</span>{feed.slice(0,4).map((event) => <div key={event.id}><b>{new Date(event.createdAt).toLocaleTimeString("zh-CN", {hour:"2-digit",minute:"2-digit"})}</b><strong>{teams.find((team) => team.id === event.teamId)?.name || "现场队伍"}</strong><span>{title(event.kind)}{event.label && event.kind !== "cheer" && event.kind !== "vote" ? " · " + event.label : ""}</span>{event.demo === 1 && <small>演示</small>}</div>)}</section>
    </div><VoteBurst burst={burst}/>
  </main>;
}



