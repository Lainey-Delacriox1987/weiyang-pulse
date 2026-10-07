"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowRight, AudioLines, Check, Flag, Heart, Lightbulb, Shuffle, Vote, X } from "lucide-react";
import { useMarket } from "@/lib/use-market";
import { challenges } from "@/lib/challenges";
import { EventHeader, SampleNotice, sampleIds } from "./event-ui";
import "./event-design.css";
import "./event-festival.css";

const filters = [{ id: "all", name: "全部回声" }, { id: "help", name: "有人需要你" }, { id: "milestone", name: "小胜利" }];
const eventLabels: Record<string, string> = { cheer: "收到喝彩", icebreak: "完成破冰", help: "需要搭把手", claim: "接住了一条求助", milestone: "解锁新进展", vote: "收到一票支持" };

export default function Home() {
  const { market, error } = useMarket();
  const [card, setCard] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [filter, setFilter] = useState("all");
  const [project, setProject] = useState("");
  const dialog = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const events = (market?.events || []).filter(e => !e.demo && e.status !== "hidden");
  const helps = events.filter(e => e.kind === "help" && (e.status === "open" || e.status === "claimed"));
  const feed = (filter === "help" ? helps : filter === "all" ? events : events.filter(e => e.kind === filter)).slice(0, 4);
  const shown = market?.teams.find(t => t.id === project);
  const teams = market?.teams || [];

  useEffect(() => {
    if (!project) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]),a[href]") || []);
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProject("");
      if (e.key !== "Tab") return;
      const items = focusable();
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0]?.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = before; document.removeEventListener("keydown", key); returnFocus.current?.focus(); };
  }, [project]);

  function openProject(id: string) { returnFocus.current = document.activeElement as HTMLElement; setProject(id); }
  function shuffle() { setCard(current => (current + 1 + Math.floor(Math.random() * (challenges.length - 1))) % challenges.length); setRevealed(true); }

  return <main className="event-page festival-page">
    <EventHeader />
    <section className="festival-intro">
      <div><p className="festival-eyebrow"><span className={`signal-dot ${error ? "offline" : ""}`} /> WEYOUNG / MAKE SOME NOISE</p><h1>好点子，<span>现场见。</span><span className="title-star" aria-hidden="true">✳</span></h1><p className="festival-subtitle">抬个头，遇见下一位搭子。<br className="mobile-break" /> 破冰、求助、为喜欢的作品投一票。</p></div>
      <div className="event-ticket"><span>YOUR NEXT MOVE</span><strong>别等准备好<br />现在就加入 <ArrowUpRight /></strong><a href="/join">领取你的现场任务 <ArrowRight size={18} /></a></div>
    </section>

    <section className="festival-stations" aria-label="现场互动">
      <article className={`station ice-station ${revealed ? "is-revealed" : ""}`}>
        <div className="station-top"><span>01 / BREAK THE ICE</span><span className="station-sticker">随机遇见</span></div>
        <button className="mission-flip" aria-expanded={revealed} aria-controls="home-mission" onClick={() => setRevealed(v => !v)}>
          <div className="mission-face" key={revealed ? `open-${card}` : "closed"}>
            {revealed ? <><span className="mission-label">给你的第 {card + 1} 张任务</span><h2 id="home-mission">{challenges[card]}</h2><span className="mission-hint">面对面完成，让一段对话开始。</span></> : <><div className="hello-bubbles" aria-hidden="true"><b>Hi!</b><b>你好呀<span>✦</span></b></div><h2 id="home-mission">今天的搭子，<br />从哪一句开始？</h2><span className="mission-hint">点一下，翻开你的破冰卡 <ArrowUpRight size={17} /></span></>}
          </div>
        </button>
        <div className="station-footer"><button onClick={shuffle}><Shuffle size={17} /> 换一张</button><a href={`/join?challenge=${card}#icebreak`}>{revealed ? "带着任务出发" : "进入破冰盲盒"}<ArrowUpRight size={18} /></a></div>
      </article>
      <a className="station vote-station" href="/vote"><div className="station-top"><span>02 / PICK YOUR FAVORITE</span><Vote size={24} /></div><div className="vote-sticker-art" aria-hidden="true"><span>GOOD<br />IDEA!</span><Heart size={60} /><i>+1</i></div><h2>你的这一票，<br />给谁？</h2><p>先看看作品，再送出一份认真支持。</p><div className="station-footer"><span>逛逛作品展</span><span className="round-arrow"><ArrowUpRight size={22} /></span></div></a>
      <div className="station-stack">
        <a className="station help-station" href="/join#help"><div className="station-top"><span>03 / HELP EACH OTHER</span><Lightbulb size={25} /></div><h2>卡住了？<br />现场有人会。</h2><div className="station-footer"><span>{helps.length ? `${helps.length} 个求助等你接力` : "发出第一条支援信号"}</span><ArrowUpRight size={22} /></div></a>
        <a className="station sound-station" href="/play"><div className="station-top"><span>04 / PASS THE MIC</span><AudioLines size={25} /></div><div className="sound-title"><b>30<span>秒</span></b><h2>把一句你好，<br />变成声浪。</h2></div><div className="station-footer"><span>按钮就能玩 · 麦克风可选</span><ArrowUpRight size={22} /></div></a>
      </div>
    </section>

    <div className="festival-live-strip" role="status"><span><span className={`signal-dot ${error ? "offline" : ""}`} />{error ? "连接恢复中，数据可能未更新" : market ? "现场数据已连接" : "正在连接现场…"}</span><span><b>{market?.totalVotes ?? "—"}</b> 票已确认</span><span><b>{teams.length || "—"}</b> 支登记队伍{teams.some(t => sampleIds.has(t.id)) ? "（含示例）" : ""}</span><a href="/screen">打开现场大屏 <ArrowUpRight size={16} /></a></div>
    <SampleNotice teams={teams} />

    <section className="festival-works" id="projects"><div className="festival-section-head"><div><p className="festival-eyebrow">BUILT BY PEOPLE AROUND YOU</p><h2>这些点子，<span>正在发生。</span></h2></div><a href="/vote">全部作品 / 去投票 <ArrowUpRight size={20} /></a></div>
      <div className="festival-project-grid">{teams.map((t, i) => <article className={`exhibit-card exhibit-${i % 4}`} key={t.id}>
        <button className="exhibit-art" aria-label={`查看${t.name}作品详情`} onClick={() => openProject(t.id)}><span className="exhibit-number">PROJECT / {String(i + 1).padStart(2, "0")}</span><b>{t.code.slice(0, 3)}</b><span className="exhibit-shape" aria-hidden="true">{["✳", "↗", "✦", "↻"][i % 4]}</span><span className="exhibit-tag">{sampleIds.has(t.id) ? "示例作品" : "现场登记"}</span></button>
        <div className="exhibit-copy"><h3>{t.name}</h3><p>{t.idea}</p><div><span><Heart size={15} /> {market?.voteCounts?.[t.id] || 0} 票支持</span><button aria-label={`了解${t.name}`} onClick={() => openProject(t.id)}><ArrowUpRight size={21} /></button></div></div>
      </article>)}</div>
      {!teams.length && <div className="festival-empty">{error ? "作品暂时未能加载，正在重新连接。" : "作品即将入场。先来登记你的队伍吧。"}<a href="/join#team">登记作品 <ArrowUpRight size={18} /></a></div>}
    </section>

    <section className="festival-feed"><div className="festival-section-head"><div><p className="festival-eyebrow">SMALL MOMENTS, BIG ENERGY</p><h2>现场的<span>新鲜回声。</span></h2></div><a href="/join#progress">分享我的进展 <ArrowUpRight size={20} /></a></div><div className="feed-tabs" aria-label="动态筛选">{filters.map(f => <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.name}{f.id === "help" && helps.length > 0 && <b>{helps.length}</b>}</button>)}</div>
      <div className="festival-feed-grid" aria-live="polite">{feed.length ? feed.map(e => <article className={`echo-card echo-${e.kind}`} key={e.id}><div><span>{e.kind === "help" ? <Lightbulb size={18} /> : e.kind === "vote" ? <Heart size={18} /> : <Flag size={18} />}{eventLabels[e.kind] || "现场更新"}</span><time>{new Date(e.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time></div><h3>{market?.teams.find(t => t.id === e.teamId)?.name || "现场伙伴"}</h3><p>{e.note || e.label}</p>{e.kind === "help" && <a href="/join#help">{e.status === "claimed" ? "已有伙伴接力" : "我来搭把手"}<ArrowUpRight size={16} /></a>}</article>) : <div className="festival-empty"><span className="empty-flower" aria-hidden="true">✳</span><div><h3>{filter === "help" ? "暂时没有待回应的求助。" : filter === "milestone" ? "小胜利，值得第一个分享。" : "把第一声回响留给你。"}</h3><p>这里展示真实提交的现场互动，示例动态不会混进来。</p></div><a href={filter === "help" ? "/join#help" : "/join#progress"}>{filter === "help" ? "发布一条求助" : "分享一刻进展"}<ArrowUpRight size={18} /></a></div>}</div>
    </section>
    <footer className="festival-footer"><span>未央 · WEYOUNG PULSE</span><p>一起做点有意思的。</p><a href="/screen">大屏见 <ArrowUpRight size={17} /></a></footer>

    {shown && <div className="project-dialog-backdrop" onClick={() => setProject("")}><section className="project-dialog festival-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title" ref={dialog} onClick={e => e.stopPropagation()}><button className="dialog-close" aria-label="关闭作品详情" onClick={() => setProject("")}><X size={23} /></button><small>{sampleIds.has(shown.id) ? "示例作品 / 非真实参赛名单" : "现场登记作品"}</small><span className="dialog-stamp" aria-hidden="true">✳</span><h2 id="project-dialog-title">{shown.name}</h2><p>{shown.idea}</p><div className="detail-stats"><span><Heart size={18} /><b>{market?.voteCounts?.[shown.id] || 0}</b> 票现场支持</span><span><Check size={17} /> 服务器确认</span></div><div className="project-status"><b>最新进展</b><p>{events.find(e => e.teamId === shown.id && e.kind === "milestone")?.label || "这支队伍还没有发布进展。去现场听听他们的想法吧。"}</p></div><a className="pill-action" href={`/vote?team=${encodeURIComponent(shown.id)}`}>把这一票留给它<ArrowUpRight size={18} /></a><div className="dialog-switch"><button onClick={() => setProject(teams[(teams.findIndex(t => t.id === shown.id) + teams.length - 1) % teams.length].id)}>← 上一个作品</button><button onClick={() => setProject(teams[(teams.findIndex(t => t.id === shown.id) + 1) % teams.length].id)}>下一个作品 →</button></div></section></div>}
  </main>;
}
