"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Crown, Gift, Radio, Vote, Zap } from "lucide-react";
import { sendAction, useMarket, type MarketEvent } from "@/lib/use-market";
import { buildProgressiveVoteChart, voteCount, VOTE_COLORS } from "@/lib/vote-chart";
import VoteBurst, { type VoteBurstData } from "./vote-burst";
import "./vote.css";
import "./vote-cinematic.css";
import "./vote-contrast.css";

// 连续支持、追赶和换位，展示 48 张票依次送达时的现场变化。
const simulationOrder = [[0, 6], [1, 8], [2, 6], [0, 5], [2, 5], [1, 6], [0, 7], [3, 5]]
  .flatMap(([team, count]) => Array.from({ length: count }, () => team));

function chartY(value: number, floor: number, ceiling: number) {
  const range = Math.max(1, ceiling - floor);
  return 282 - ((value - floor) / range) * 215;
}

function linePath(points: { x: number; value: number }[], floor: number, ceiling: number) {
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${chartY(point.value, floor, ceiling).toFixed(1)}`).join(" ");
}

export default function VoteClient() {
  const { market, error, refresh } = useMarket();
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [burst, setBurst] = useState<VoteBurstData | null>(null);
  const seenVotes = useRef<Set<string> | null>(null);
  const [simulation, setSimulation] = useState<MarketEvent[] | null>(null);
  const [simulationCount, setSimulationCount] = useState(0);

  useEffect(() => {
    if (!simulation || simulationCount >= simulation.length) return;
    const timer = window.setTimeout(() => setSimulationCount((count) => Math.min(count + 1, simulation.length)), 500);
    return () => window.clearTimeout(timer);
  }, [simulation, simulationCount]);

  useEffect(() => { if (market?.teams.length && !selectedId) setSelectedId(market.teams[0].id); }, [market, selectedId]);
  useEffect(() => {
    if (!market) return;
    const votes = market.events.filter((event) => event.kind === "vote" && event.status === "open" && !event.demo);
    if (!seenVotes.current) { seenVotes.current = new Set(votes.map((vote) => vote.id)); return; }
    const newest = votes.find((vote) => !seenVotes.current?.has(vote.id));
    votes.forEach((vote) => seenVotes.current?.add(vote.id));
    if (newest) setBurst({ id: newest.id, team: market.teams.find((team) => team.id === newest.teamId)?.name || "一支队伍", demo: false });
  }, [market]);
  useEffect(() => { if (!burst) return; const timer = setTimeout(() => setBurst(null), 3600); return () => clearTimeout(timer); }, [burst]);

  const displayVotes = useMemo(() => simulation
    ? simulation.slice(0, simulationCount).reverse()
    : market?.events.filter((event) => event.kind === "vote" && event.status === "open" && !event.demo) || [], [market, simulation, simulationCount]);
  const chartData = useMemo(() => market
    ? buildProgressiveVoteChart(market.teams, displayVotes)
    : { series: [], totalVotes: 0, visibleVotes: 0 }, [market, displayVotes]);
  const { series, visibleVotes } = chartData;
  const chartValues = series.flatMap((entry) => entry.points.flatMap((point) => [point.previous, point.value]));
  const floor = 0;
  const ceiling = chartValues.length ? Math.max(10, Math.ceil(Math.max(...chartValues) / 10) * 10) : 100;
  const latestVote = displayVotes[0];
  const latestTeam = market?.teams.find((team) => team.id === latestVote?.teamId);
  const ranked = market?.teams.map((team, index) => ({ team, votes: voteCount(displayVotes, team.id), color: VOTE_COLORS[index % VOTE_COLORS.length] })).sort((a, b) => b.votes - a.votes) || [];
  const selected = market?.teams.find((team) => team.id === selectedId);
  const recent = displayVotes.slice(0, 5);

  function startSimulation() {
    if (!market?.teams.length) return;
    const now = Date.now();
    setSimulationCount(0);
    setBurst(null);
    setMessage("");
    setSimulation(simulationOrder.map((teamIndex, index) => ({
      id: `preview-vote-${index}`, kind: "vote", teamId: market.teams[teamIndex % market.teams.length].id,
      label: "模拟投票", note: "", status: "open", demo: 0, createdAt: now + index * 500,
    })));
  }

  function exitSimulation() {
    setSimulation(null);
    setSimulationCount(0);
    setMessage("");
  }

  async function submitVote() {
    if (!selectedId || busy || simulation) return;
    setBusy(true); setMessage("");
    try {
      await sendAction({ kind: "vote", teamId: selectedId });
      setMessage(`投票成功：你的一票投给了 ${selected?.name || "这支队伍"}。`);
      await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "投票失败，请稍后再试。"); }
    finally { setBusy(false); }
  }

  return <main className="vote-page">
    <div className="vote-grid-glow" aria-hidden="true"/>
    <header className="vote-topbar"><Link href="/" className="vote-brand"><img src="/weyoung-logo.png" alt="WeYoung"/><span>WeYoung</span></Link><div className="vote-top-actions"><span className="vote-live"><i/> LIVE VOTE</span><Link href="/screen">现场大屏 <ArrowUpRight size={16}/></Link><Link href="/" aria-label="返回活动首页"><ArrowLeft size={18}/></Link></div></header>
    <div className="vote-ticker"><b>{simulation ? "● 模拟投票" : "● 最新投票"}</b><div>{recent.length ? recent.map((event) => `${market?.teams.find((team) => team.id === event.teamId)?.name || "现场队伍"} 收到一张投票`).join("　///　") : "投票即将开始　///　每一票都会点亮现场曲线　///　扫码加入投票"}</div><strong>{simulation ? "票数模拟" : error ? "重新连接中" : "实时投票"}</strong></div>
    <div className="vote-layout">
      {simulation && <section className="vote-simulation-banner" aria-label="票数模拟状态"><div><strong>票数模拟 · {simulationCount} / {simulation.length} 票</strong><span>{simulationCount < simulation.length ? "模拟票逐张送达，观察曲线延长与人气换位" : "模拟完成，可以重新播放或返回实时投票"} · 不计入正式票数</span></div><button type="button" onClick={startSimulation}>重新模拟</button><button type="button" onClick={exitSimulation}>返回实时投票</button></section>}
      <section className="vote-intro"><div className="vote-eyebrow"><span/> VOTE PULSE / LIVE POPULARITY</div><h1>把心跳，<em>投</em>上去<span>。</span></h1><p>一张票，一次心跳脉冲。看着你支持的灵感被现场点亮，也看着前三名在下一秒重新排序。</p><div className="vote-intro-tags"><span><Radio size={15}/> {simulation ? "每半秒增加一票" : "约 3 秒同步"}</span><span><Zap size={15}/> {simulation ? "模拟票逐张送达" : "现场投票驱动"}</span><span><Vote size={15}/> 每台设备一票</span></div></section>
      <div className="vote-dashboard">
        <section className="vote-chart-card">
          <div className="vote-panel-head"><div><span>01 / VOTE PULSE</span><h2>逐票心跳曲线</h2></div><div className="vote-chart-status"><i/>{simulation ? (simulationCount < simulation.length ? "模拟播放中" : "模拟完成") : visibleVotes === 0 ? "等待首票" : "实时更新"}</div></div>
          <div className="vote-chart-summary">
            <div><small>{simulation ? "累计模拟选票" : "累计选票"}</small><strong>{String(displayVotes.length).padStart(2, "0")}</strong><span>VOTES CAST</span></div>
            <div><small>目前领先</small><strong className="vote-leader-name" style={{ color: ranked[0]?.color }}>{ranked[0]?.votes ? ranked[0].team.name : "等待第一票"}</strong><span>{ranked[0]?.votes ? `${ranked[0].votes} 票 / 随时可能反转` : "YOUR VOTE STARTS IT"}</span></div>
            <div><small>最新支持</small><strong className="vote-movement" style={{ color: series.find((entry) => entry.teamId === latestTeam?.id)?.color }}>{latestTeam ? `${latestTeam.code.slice(0, 3)} +1 票` : "—"}</strong><span>{latestTeam?.name || "每票推动队伍走势"}</span></div>
          </div>
          <div className="vote-chart-wrap">
            <div className="vote-y-axis"><span>{ceiling}%</span><span>{ceiling / 2}%</span><span>0%</span></div>
            {visibleVotes === 0 && <div className="vote-chart-empty"><span>NO VOTES YET</span><strong>等待第一票点亮曲线</strong><small>收到首票的队伍才会出现走势</small></div>}
            <div className="vote-trend-caption">人气占比 · 每队一种颜色</div>
            <svg className="vote-chart" viewBox="0 0 1000 320" preserveAspectRatio="none" role="img" aria-label="每支队伍固定颜色的人气占比走势">
              {[55, 134, 212, 290].map((y) => <line key={y} x1="0" y1={y} x2="1000" y2={y} className="vote-chart-grid"/>)}
              {[0, 250, 500, 750, 1000].map((x) => <line key={x} x1={x} y1="55" x2={x} y2="290" className="vote-chart-grid vertical"/>)}
              {series.map((entry, teamIndex) => {
                if (!entry.points.length) return null;
                const first = entry.points[0];
                const last = entry.points.at(-1)!;
                const pathPoints = [{ x: Math.max(0, first.x - 14), value: first.previous }, ...entry.points];
                const offset = (teamIndex - (series.length - 1) / 2) * 3;
                return <g key={entry.teamId} className="vote-team-series" data-team-id={entry.teamId} style={{ color: entry.color }}>
                  <title>{entry.name} · {entry.votes} 票 · 人气占比 {last.value.toFixed(1)}%</title>
                  {entry.points.map((point, index) => {
                    const beforeY = chartY(point.previous, floor, ceiling);
                    const afterY = chartY(point.value, floor, ceiling);
                    const top = Math.min(beforeY, afterY);
                    const bottom = Math.max(beforeY, afterY);
                    const x = point.x + offset;
                    const rising = point.value >= point.previous;
                    return <g key={point.id} className={`vote-team-column ${index === entry.points.length - 1 ? "vote-candle-new" : ""}`} style={{ transformOrigin: `${x}px ${bottom}px` }}>
                      <line x1={x} y1={top - 3} x2={x} y2={bottom + 3} stroke={entry.color} strokeWidth="1" vectorEffect="non-scaling-stroke"/>
                      <rect x={x - 3} y={top} width="6" height={Math.max(3, bottom - top)} rx=".7" stroke={entry.color} strokeWidth="1" fill={rising ? entry.color : "#051829"} fillOpacity={rising ? .85 : .7} vectorEffect="non-scaling-stroke"/>
                    </g>;
                  })}
                  <path d={linePath(pathPoints, floor, ceiling)} fill="none" stroke={entry.color} strokeWidth="2" vectorEffect="non-scaling-stroke" className="vote-series-path vote-team-path"/>
                  <circle cx={last.x} cy={chartY(last.value, floor, ceiling)} r="4" fill={entry.color} className="vote-chart-tip"/>
                  <text x={last.x + 13} y={chartY(last.value, floor, ceiling) - 7} fill={entry.color} className="vote-series-label">{entry.code.slice(0, 3)} {last.value.toFixed(0)}%</text>
                </g>;
              })}
            </svg>
            <div className="vote-chart-notice">{visibleVotes === 0 ? "WAITING / 暂无投票 · 第一票点亮对应队伍走势" : `${simulation ? "模拟" : "实时"} / 已收到 ${displayVotes.length} 票 · 显示最近 24 票 · 占比随投票变化，累计票数不会减少`}</div>
          </div>
          <div className="vote-x-axis"><span>开始</span><span>{visibleVotes ? `第 ${Math.max(1, displayVotes.length - visibleVotes + 1)} 票` : "—"}</span><span>已收到 {displayVotes.length} 票</span><span>{simulationCount === simulation?.length ? "模拟完成" : "等待下一票"}</span><span>{simulation ? "模拟" : "LIVE"}</span></div>
          <div className="vote-legend">{ranked.map((entry) => <div key={entry.team.id}><i style={{ background: entry.color }}/><span>{entry.team.name}</span><strong>{entry.votes} 票</strong></div>)}</div>
        </section>
        <aside className="vote-sidebar"><section className="vote-ballot"><div className="vote-panel-head"><div><span>02 / PLACE YOUR VOTE</span><h2>投下一票</h2></div><Vote size={24}/></div><p>选择今晚最想继续了解的项目。提交后，所有人的大屏会同步看到这次心跳脉冲。</p><div className="vote-options">{market?.teams.map((team, index) => <button type="button" key={team.id} aria-pressed={selectedId === team.id} className={selectedId === team.id ? "selected" : ""} onClick={() => setSelectedId(team.id)}><span className="vote-option-code" style={{ borderColor: VOTE_COLORS[index % VOTE_COLORS.length], color: VOTE_COLORS[index % VOTE_COLORS.length] }}>{team.code.slice(0, 3)}</span><span><strong>{team.name}</strong><small>{team.idea}</small></span><i/></button>)}</div><button className="vote-submit" type="button" disabled={!selectedId || busy || !!simulation} onClick={submitVote}><Gift size={19}/>{simulation ? "返回实时投票后投票" : busy ? "正在送达投票大屏…" : `投给 ${selected?.name || "选中的队伍"}`}<ArrowUpRight size={18}/></button>{message && <div className="vote-message" role="status">{message}</div>}<small className="vote-rule">每台设备限一票 · 投票只反映现场兴趣，不作为正式评审分数</small></section><section className="vote-demo"><span>PREVIEW THE IMPACT</span><strong>看看投票之后的样子</strong><button type="button" disabled={!market?.teams.length || busy} onClick={startSimulation}>模拟票数变化 <ArrowUpRight size={16}/></button><button type="button" onClick={() => { setMessage("正在播放演示特效，不计入选票。"); setBurst({ id: `demo-${Date.now()}`, team: selected?.name || "霓虹实验室", demo: true }); }}>播放一次演示特效 <ArrowUpRight size={16}/></button><small>票数模拟与特效仅本机预览，不提交选票</small></section></aside>
        <section className="vote-orderbook"><div className="vote-panel-head"><div><span>03 / ALL RANKS</span><h2>全部票数</h2></div><span className="vote-minor-label">每一票都会重新排序</span></div><div className="vote-order-head"><span>排名 / 项目</span><span>现场状态</span><span>累计票数</span></div>{ranked.map((entry, index) => <div className="vote-order-row" key={entry.team.id}><div><b>{String(index + 1).padStart(2, "0")}</b><i style={{ background: entry.color }}/><span><strong>{entry.team.name}</strong><small>{entry.team.idea}</small></span></div><span className={entry.votes ? "steady" : ""}>{entry.votes ? "♥ 有人支持" : "· 等待支持"}</span><strong>{entry.votes}<small> VOTES</small></strong></div>)}</section>
        <section className="vote-top-three">
          <div className="vote-panel-head"><div><span>04 / POPULAR TOP 3</span><h2>人气前三</h2></div><span className="vote-minor-label">{simulation ? "模拟票选" : "实时票选"}</span></div>
          <div className="vote-podium" aria-label="当前人气前三名">
            {[ranked[1], ranked[0], ranked[2]].filter(Boolean).map((entry) => {
              const rank = ranked.findIndex((item) => item.team.id === entry.team.id) + 1;
              return <article className={`vote-podium-item rank-${rank}`} key={entry.team.id}>
                <div className="vote-podium-rank">{rank === 1 && <Crown size={20}/>}<span>TOP {rank}</span></div>
                <div className="vote-podium-avatar" style={{ "--podium-color": entry.color } as CSSProperties} role="img" aria-label={`${entry.team.name} 的头像预留位`}/>
                <strong>{entry.team.name}</strong>
                <span>{entry.votes ? `${entry.votes} 票` : "等你来投"}</span>
                <div className="vote-podium-bar" style={{ "--podium-color": entry.color } as CSSProperties}><b>{entry.votes}</b><small>VOTES</small></div>
              </article>;
            })}
          </div>
        </section>
      </div>
    </div>
    <VoteBurst burst={burst}/>
  </main>;
}
