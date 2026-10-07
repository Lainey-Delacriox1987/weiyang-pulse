"use client";
import Link from "next/link";
import { useMarket } from "@/lib/use-market";
import PulseLine from "./pulse-line";
import "./pulse.css";
import { ArrowUpRight, HeartPulse, Lightbulb, Radio, Sparkles, Zap } from "lucide-react";

const teams = [
  { code: "NEON", name: "霓虹实验室", idea: "把夜晚的校园变成一张可探索的地图", score: 86, change: "+18", color: "pink" },
  { code: "404", name: "404 灵感俱乐部", idea: "让找不到的灵感主动找到你", score: 74, change: "+12", color: "mint" },
  { code: "WAVE", name: "声浪制造局", idea: "用声音把陌生人连接起来", score: 68, change: "+9", color: "yellow" },
  { code: "LOOP", name: "循环信号", idea: "给闲置物品安排下一次冒险", score: 53, change: "+6", color: "blue" },
];
const weights: Record<string, number> = { cheer: 2, icebreak: 6, help: 7, milestone: 10, vote: 4 };

export default function Home() {
  const { market, error } = useMarket();
  const liveTeams = (market?.teams || teams.map((team) => ({ ...team, id: team.code, createdAt: 0 }))).map((team, index) => {
    const teamEvents = market?.events.filter((event) => event.teamId === team.id && event.status === "open") || [];
    const score = teamEvents.reduce((sum, event) => sum + (weights[event.kind] || 0), 0);
    return { ...team, score: market ? score : teams[index]?.score || 0, change: market ? "+" + teamEvents.filter((event) => Date.now() - event.createdAt < 600000).length : teams[index]?.change || "+0", color: teams[index % teams.length]?.color || "mint" };
  }).sort((a, b) => b.score - a.score);
  const liveEvents = market?.events.filter((event) => event.status === "open" || (event.kind === "help" && event.status === "claimed")) || [];
  const helpEvents = liveEvents.filter((event) => event.kind === "help");
  const votes = liveEvents.filter((event) => event.kind === "vote");
  const voteLeader = liveTeams.map((team) => ({ name: team.name, votes: votes.filter((event) => event.teamId === team.id).length })).sort((a,b) => b.votes - a.votes)[0];
  const liveCount = liveEvents.filter((event) => event.demo === 0).length;
  const heat = Math.min(100, liveEvents.filter((event) => event.demo === 0 && Date.now() - event.createdAt < 240000).length * 8);
  const latestText = liveEvents.slice(0, 6).map((event) => {
    const name = liveTeams.find((team) => team.id === event.teamId)?.name || "现场队伍";
    return name + " · " + (event.kind === "cheer" ? "收到一份喝彩" : event.kind === "help" ? "发出求助" : event.kind === "claim" ? "有人认领了求助" : event.kind === "icebreak" ? "完成破冰挑战" : event.kind === "vote" ? "收到一张投票" : event.label);
  });
  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><img src="/weyoung-logo.png" alt="WeYoung"/></span><span>WeYoung</span></div>
      <nav className="topnav" aria-label="主导航"><a className="active" href="#floor">互动大厅</a><a href="#icebreak">破冰盲盒</a><a href="#help">求助广场</a><a href="#pulse">进度动态</a><Link href="/vote">赛博投票</Link></nav>
      <div className="top-actions"><span className="live-pill"><i/> LIVE · 第 1 场</span><Link className="top-join" href="/join">加入现场 <ArrowUpRight size={16}/></Link></div>
    </header>
    <section className="ticker-strip" aria-label="现场滚动消息"><span className="ticker-label">ON AIR</span><div className="ticker-track">{latestText.length ? latestText.join(" /// ") : "等待现场第一条互动 · 扫码加入互动大厅"}</div><span className="ticker-clock">{error ? "RETRY" : "LIVE"}</span></section>
    <div className="content-grid">
      <aside className="side-rail"><div className="rail-title">现场导航 <span>01 — 05</span></div><a className="rail-active" href="#floor"><span>01</span>互动大厅</a><a href="#icebreak"><span>02</span>破冰盲盒</a><a href="#help"><span>03</span>求助广场</a><a href="#pulse"><span>04</span>进度动态</a><a href="#vote"><span>05</span>人气投票</a><div className="rail-bottom"><span className="mini-pulse"><HeartPulse size={20}/></span><strong>现场心跳正常</strong><small>每一次互动，都算数。</small></div></aside>
      <div className="main-area">
        <section className="intro" id="floor"><div><div className="eyebrow"><span className="eyebrow-line"/> HACKATHON LIVE · 2026</div><h1>灵感正在<span>登场。</span></h1><p>看看谁在升温，谁需要一位新搭子。这里的每一次动态，都来自现场的人。</p>{error && <p role="status" className="connection-error">{error}</p>}</div><div className="session-badge"><div className="session-symbol">⌁</div><span>当前场次</span><strong>黑客松之夜</strong><small>{market ? "现场数据已同步" : "正在连接现场…"}</small></div></section>
        <section className="metrics"><div><span>现场热度</span><strong>{market ? heat : "--"}<span className="metric-unit">/100</span></strong><small className="up">近 4 分钟有效互动</small></div><div><span>正在发光的队伍</span><strong>{String(liveTeams.length).padStart(2,"0")}</strong><small>每支队伍都有新故事</small></div><div><span>真实互动</span><strong>{market ? liveCount : "--"}</strong><small>喝彩 · 破冰 · 互助</small></div><div className="metric-wave"><span>实时心跳 <Radio size={15}/></span><PulseLine key={market?.events[0]?.id || "empty"} events={market?.events || []}/><small>{market ? "3 秒同步一次" : "正在连接…"}</small></div></section>
        <section className="board-card"><div className="section-head"><div><span className="kicker">TEAM POPULARITY / 01</span><h2>队伍热度榜 <span className="head-count">{liveTeams.length} 支队伍</span></h2></div><Link href="/screen" className="subtle-link">打开大屏模式 <ArrowUpRight size={17}/></Link></div><div className="board-head"><span>队伍 / 项目</span><span>现场状态</span><span>热度指数</span><span>趋势</span></div><div className="team-list">{liveTeams.map((team, i)=><div className="team-row" key={team.id}><div className="team-id"><span className="rank">{String(i+1).padStart(2,"0")}</span><div className={'team-avatar '+team.color}>{team.code.slice(0,1)}</div><div><strong>{team.name}</strong><small>{team.idea}</small></div></div><span className="team-status"><i/> {helpEvents.some((event) => event.teamId === team.id) ? "求助中" : "开发中"}</span><strong className="team-score">{team.score}<small> PTS</small></strong><span className="team-change">↗ {team.change}</span></div>)}</div><div className="board-note"><span>!</span> 热度来自互动，不代表评审分数或项目质量。{market?.events.some((event) => event.demo) && " 含明确标记的演示事件。"}</div></section>
        <div className="zone-grid"><section className="zone-card ice" id="icebreak"><div className="zone-top"><span className="kicker">SOCIAL PULSE / 02</span><Sparkles size={22}/></div><h2>破冰盲盒</h2><p>随机抽一张社交任务，去认识一个还没说过话的人。完成后为现场心跳添一拍。</p><div className="prompt-card"><small>随时可抽取</small><strong>找到一位与你技术栈完全不同的人，互相介绍正在做的东西。</strong><span>预计 3 分钟 · 零社恐门槛</span></div><Link href="/join#icebreak" className="zone-link">抽一张挑战卡 <ArrowUpRight size={18}/></Link></section><section className="zone-card help" id="help"><div className="zone-top"><span className="kicker">HELP DESK / 03</span><Lightbulb size={22}/></div><h2>求助广场</h2><p>缺一个会画图的人？测试卡住了？把需求发到现场，让会的人主动来找你。</p><div className="help-preview"><span>正在求助 · {helpEvents.length}</span><strong>{helpEvents[0]?.note || "目前没有待解决的求助。你的问题可以成为第一条求助。"}</strong><small>{helpEvents[0] ? liveTeams.find((team) => team.id === helpEvents[0].teamId)?.name : "现场互助开放中"}</small></div><Link href="/join#help" className="zone-link">查看求助 / 发布需求 <ArrowUpRight size={18}/></Link></section></div>
        <div className="zone-grid lower"><section className="compact-zone" id="pulse"><div className="compact-icon"><Zap size={22}/></div><div><span className="kicker">MILESTONES / 04</span><h2>进度动态</h2><p>每个“终于跑通了”都值得被现场看到。</p></div><Link href="/join#progress" aria-label="发布进度"><ArrowUpRight/></Link></section><section className="compact-zone" id="vote"><div className="compact-icon vote-icon">✦</div><div><span className="kicker">LIVE VOTE / 05</span><h2>人气投票 · 赛博曲线</h2><p>{votes.length ? votes.length + " 票已投 · 当前最多：" + voteLeader?.name : "投下一票，看实时曲线和灵感火箭冲上大屏。"}</p></div><Link href="/vote" aria-label="进入实时投票页"><ArrowUpRight/></Link></section></div>
      </div>
      <aside className="right-rail"><div className="right-heading"><span>LIVE FEED</span><i/></div><h2>现场正在发生</h2>{liveEvents.slice(0,4).map((event) => <div className="feed-item" key={event.id}><span className="feed-time">{new Date(event.createdAt).toLocaleTimeString("zh-CN", {hour:"2-digit",minute:"2-digit"})}</span><div><b className="feed-dot yellow"/><strong>{liveTeams.find((team) => team.id === event.teamId)?.name || "现场队伍"} {event.kind === "cheer" ? "收到喝彩" : event.kind === "help" ? "发起求助" : event.kind === "claim" ? "认领求助" : event.kind === "icebreak" ? "完成破冰" : event.kind === "vote" ? "收到投票" : "播报进度"}</strong><p>{event.note || event.label}{event.demo === 1 ? " · 演示" : ""}</p></div></div>)}{liveEvents.length === 0 && <p className="feed-empty">等待第一条现场动态。</p>}<div className="right-divider"/><div className="next-round"><span className="kicker">NEXT UP</span><h3>破冰盲盒<br/>随时开抽</h3><p>抽卡、完成挑战，让陌生人变成搭子。</p></div><Link href="/join" className="right-cta">我也要参与 <ArrowUpRight size={18}/></Link></aside>
    </div>
  </main>;
}



