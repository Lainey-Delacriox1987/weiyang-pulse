"use client";
/* eslint-disable react-hooks/set-state-in-effect -- Restore URL selection and browser-only receipt after server hydration. */
/* eslint-disable @next/next/no-html-link-for-pages -- Native navigation is intentional: the deployed Vinext client router failed in v7; v8 verified full-page links. */
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, Heart, RotateCcw, Ticket, Vote } from "lucide-react";
import { sendAction, useMarket } from "@/lib/use-market";
import { EventHeader, SampleNotice, sampleIds } from "../event-ui";
import RankingBoard from "../ranking-board";
import VoteBurst, { type VoteBurstData } from "./vote-burst";
import "./vote.css";
import "../event-design.css";
import "../event-festival.css";
import "./ballot-festival.css";

const demoTeams = [
  { id: "demo-1", code: "WY", name: "未央创造队", idea: "让现场的每个点子被看见", createdAt: 0 },
  { id: "demo-2", code: "404", name: "灵感实验室", idea: "用小小的作品回应真实的问题", createdAt: 0 },
  { id: "demo-3", code: "GO", name: "今晚就上线", idea: "把第一次尝试变成可玩的原型", createdAt: 0 },
];
const receiptKey = "pulse-confirmed-vote";
type Receipt = { teamId: string; eventId: string };
export default function VoteClient() {
  const { market, error, refresh } = useMarket();
  const [selected, setSelected] = useState("");
  const [expanded, setExpanded] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [message, setMessage] = useState("");
  const [demo, setDemo] = useState(false);
  const [demoVotes, setDemoVotes] = useState<Record<string, number>>({});
  const [burst, setBurst] = useState<VoteBurstData | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("team");
    if (id) setSelected(id);
    try {
      const saved = JSON.parse(localStorage.getItem(receiptKey) || "null") as Receipt | null;
      if (saved && typeof saved.teamId === "string" && typeof saved.eventId === "string" && saved.eventId) {
        setReceipt(saved); setSubmitted(true); setSelected(saved.teamId);
      }
    } catch { /* A missing or invalid local receipt never invents a server vote. */ }
  }, []);
  const teams = demo ? (market?.teams.length ? market.teams : demoTeams) : (market?.teams || []);
  const total = demo ? Object.values(demoVotes).reduce((sum, count) => sum + count, 0) : (market?.totalVotes || 0);
  const selectedTeam = teams.find(t => t.id === selected);
  const votedTeam = teams.find(t => t.id === receipt?.teamId);
  async function submit() {
    if (!selectedTeam || busy || demo || submitted) return;
    const chosen = selectedTeam;
    setBusy(true); setMessage("");
    try {
      const result = await sendAction({ kind: "vote", teamId: chosen.id });
      setSubmitted(true);
      if (result.eventId) {
        const saved = { teamId: chosen.id, eventId: result.eventId };
        setReceipt(saved);
        try { localStorage.setItem(receiptKey, JSON.stringify(saved)); } catch { /* Server success remains success if local storage is unavailable. */ }
      }
      setMessage(`服务器已确认：你把这一票送给了 ${chosen.name}。`);
      setBurst({ id: `live-${result.eventId || Date.now()}`, team: chosen.name, demo: false });
      await refresh();
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "暂时未送达，请稍后重试。";
      if (text.includes("已经投过票")) setSubmitted(true);
      setMessage(text);
    } finally { setBusy(false); }
  }
  function simulate() {
    if (!selectedTeam) return;
    setDemoVotes(v => ({ ...v, [selectedTeam.id]: (v[selectedTeam.id] || 0) + 1 }));
    setBurst({ id: `demo-${Date.now()}`, team: selectedTeam.name, demo: true });
    setMessage(`本机演示：给 ${selectedTeam.name} +1。没有提交正式选票。`);
  }
  function exitDemo() { setDemo(false); setSelected(receipt?.teamId || ""); setExpanded(""); setMessage(""); setBurst(null); }

  return <main className={`event-page festival-page ballot-festival ${selectedTeam ? "has-choice" : ""}`}>
    <EventHeader active="作品 / 投票" />
    <div className="ballot-festival-wrap">
      <div className="ballot-festival-title"><div><p className="festival-eyebrow">THE IDEAS GALLERY / 作品人气票选</p><h1>看见好点子，<br /><span>投出你的喜欢。</span></h1><p>一台设备，一份支持。先了解作品，再确认这一票。</p></div><div className="ballot-counter"><Vote size={24} /><b>{total}</b><span>{demo ? "票 · 本机演示" : "票 · 服务器已确认"}</span><i aria-hidden="true">✳</i></div></div>
      <SampleNotice teams={market?.teams || []} />
      {demo && <div className="demo-banner" role="status"><strong>正在本机演示</strong><span>可以重复投票体验。不会写入服务器或改变正式结果。</span><button onClick={exitDemo}>退出演示</button></div>}
      {!demo && error && <p className="event-error" role="status">{error} 当前显示上一次获取的结果。</p>}
      <div className="ballot-festival-layout"><section aria-label="选择作品">
        <div className="ballot-instructions"><span><b>1</b> 了解作品</span><i /><span><b>2</b> 选择一个</span><i /><span><b>3</b> 确认支持</span></div>
        <div className="ballot-exhibits">{teams.map((t, i) => {
          const chosen = selected === t.id;
          const count = demo ? demoVotes[t.id] || 0 : market?.voteCounts?.[t.id] || 0;
          const milestone = market?.events.find(e => !e.demo && e.status !== "hidden" && e.teamId === t.id && e.kind === "milestone");
          return <article className={`exhibit-card ballot-exhibit exhibit-${i % 4} ${chosen ? "is-selected" : ""}`} key={t.id}>
            <button className="exhibit-art" aria-label={`选择${t.name}`} aria-pressed={chosen} disabled={busy || (!demo && submitted)} onClick={() => { setSelected(t.id); setMessage(""); }}><span className="exhibit-number">PROJECT / {String(i + 1).padStart(2, "0")}</span><b>{t.code.slice(0, 3)}</b><span className="exhibit-shape" aria-hidden="true">{["✳", "↗", "✦", "↻"][i % 4]}</span><span className="exhibit-tag">{sampleIds.has(t.id) || demo ? "示例作品" : "现场登记"}</span><span className="selection-dot">{chosen && <Check size={17} />}</span></button>
            <div className="exhibit-copy"><h2>{t.name}</h2><p>{t.idea}</p><div className="ballot-card-actions"><button className="project-detail-toggle" aria-expanded={expanded === t.id} aria-controls={`details-${t.id}`} onClick={() => setExpanded(v => v === t.id ? "" : t.id)}>作品近况 <ChevronDown size={15} /></button><span><Heart size={14} />{count} 票</span></div>
              {expanded === t.id && <div className="inline-project-detail" id={`details-${t.id}`}><strong>最新进展</strong><p>{milestone ? `${milestone.label}${milestone.note ? ` · ${milestone.note}` : ""}` : "这支队伍还没发布进展。投票前，去现场听听他们的介绍吧。"}</p>{sampleIds.has(t.id) && <small>这是示例作品，不代表实际参赛名单。</small>}</div>}
              <button className="select-project-button" disabled={busy || (!demo && submitted)} aria-pressed={chosen} onClick={() => { setSelected(t.id); setMessage(""); }}>{chosen ? <><Check size={16} />已选这个点子</> : <>选这个点子<ArrowUpRight size={16} /></>}</button>
            </div>
          </article>;
        })}</div>
        {!teams.length && <div className="festival-empty">{error ? "正在重新连接作品列表。" : "等待第一支队伍入场。"}<a href="/join#team">登记队伍 ↗</a></div>}
        <section className="ballot-receipt" aria-label="确认选票"><div><Ticket size={27} /><span>{!demo && submitted ? "这一票，已送达" : selectedTeam ? "你的选择" : "一张票，一份认真支持"}<strong>{!demo && submitted ? votedTeam?.name || "本浏览器已投票" : selectedTeam?.name || "还没选中作品"}</strong></span></div><button className="event-button" disabled={!selectedTeam || busy || (!demo && submitted)} onClick={demo ? simulate : submit}>{busy ? "等待服务器确认…" : demo ? "送出一票演示支持" : submitted ? "已确认投票 ✓" : "确认，把这一票给它"}<ArrowUpRight size={18} /></button><small>{demo ? "本机演示，可重复体验。" : "正式票不可撤回或改投。清空浏览器数据会丢失本机记录，不是实名防刷票。"}</small></section>
        {message && <div className="ballot-delivery-message" role="status"><Ticket size={19} /><p>{message}</p></div>}
      </section><aside className="ballot-ranking"><RankingBoard teams={teams} counts={demo ? demoVotes : market?.voteCounts || {}} demo={demo} /><div className="ballot-demo-card"><span>TRY IT FIRST</span><h3>先体验一次<br />“收到喜欢”的感觉。</h3><p>演示票数只在当前页面。放心点，不占用正式投票机会。</p><button onClick={() => { setDemo(true); setSelected(""); setMessage(""); setDemoVotes({}); setBurst(null); setExpanded(""); }}><RotateCcw size={16} />{demo ? "重新开始演示" : "进入本机演示"}<ArrowUpRight size={17} /></button>{demo && <button className="demo-return" onClick={exitDemo}>返回正式投票</button>}</div></aside></div>
    </div><footer className="festival-footer"><span>未央 · WEYOUNG PULSE</span><p>你的喜欢，让好点子走得更远。</p><a href="/">回到现场 <ArrowUpRight size={17} /></a></footer><VoteBurst burst={burst} />
  </main>;
}
