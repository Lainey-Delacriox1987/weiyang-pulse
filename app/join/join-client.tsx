"use client";
/* eslint-disable react-hooks/set-state-in-effect -- Restore browser-only task/ownership after hydration and select the first asynchronously loaded team. */
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Heart, Lightbulb, Plus, Shuffle, Sparkles, Vote, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { sendAction, useMarket } from "@/lib/use-market";
import "../pulse.css";
import "./join.css";
import "./vote-entry.css";
import "../event-design.css";
import { EventHeader,SampleNotice } from "../event-ui";

import { challenges } from "@/lib/challenges";
import "../event-festival.css";
import "./join-festival.css";

const milestones = ["想法确定", "原型完成", "第一行代码", "首个 Demo 跑通", "完成联调", "准备路演"];

export default function JoinClient() {
  const { market, error, refresh } = useMarket();
  const [teamId, setTeamId] = useState("");
  const [challenge, setChallenge] = useState(challenges[0]);
  const [revealed, setRevealed] = useState(false);
  const [completedChallenge, setCompletedChallenge] = useState("");
  const [help, setHelp] = useState("");
  const [milestone, setMilestone] = useState(milestones[0]);
  const [note, setNote] = useState("");
  const [newName, setNewName] = useState("");
  const [newIdea, setNewIdea] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownedHelpIds, setOwnedHelpIds] = useState<string[]>([]);
  const [claimedHelpIds, setClaimedHelpIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const owned = JSON.parse(localStorage.getItem("pulse-owned-helps") || "[]");
      const claimed = JSON.parse(localStorage.getItem("pulse-claimed-helps") || "[]");
      setOwnedHelpIds(Array.isArray(owned) ? owned.filter(id => typeof id === "string") : []);
      setClaimedHelpIds(Array.isArray(claimed) ? claimed.filter(id => typeof id === "string") : []);
    } catch { /* Invalid local state must not break joining. */ }
    const incoming = new URLSearchParams(window.location.search).get("challenge");
    const index = incoming === null ? -1 : Number(incoming);
    if (Number.isInteger(index) && index >= 0 && index < challenges.length) { setChallenge(challenges[index]); setRevealed(true); }
  }, []);
  useEffect(() => { if (market?.teams.length && !teamId) setTeamId(market.teams[0].id); }, [market, teamId]);
  async function act(input: Record<string, unknown>, success: string) {
    setBusy(true); setMessage("");
    try {
      const result = await sendAction({ teamId, ...input });
      if (input.kind === "help" && result.eventId) { const ids = [...ownedHelpIds, result.eventId]; setOwnedHelpIds(ids); try { localStorage.setItem("pulse-owned-helps", JSON.stringify(ids)); } catch { /* Keep confirmed server success if storage is unavailable. */ } setHelp(""); }
      if (input.kind === "claim") { const targetId = String(input.targetId || ""); const ids = [...claimedHelpIds, targetId]; setClaimedHelpIds(ids); try { localStorage.setItem("pulse-claimed-helps", JSON.stringify(ids)); } catch { /* In-memory ownership still works this visit. */ } }
      setMessage(success); await refresh(); return true;
    }
    catch (err) { setMessage(err instanceof Error ? err.message : "提交失败"); return false; }
    finally { setBusy(false); }
  }
  const activeHelp = market?.events.filter((event) => !event.demo && event.kind === "help" && (event.status === "open" || event.status === "claimed")) || [];
  return <main className="event-page festival-page join-page">
    <EventHeader active="参与互动"/>
    <div className="join-wrap"><SampleNotice teams={market?.teams||[]}/><div className="join-hero"><span className="kicker">JOIN THE HACKATHON</span><h1>一起让现场<span>跳起来。</span></h1><p>选一支队伍，喝彩、破冰、发布求助，或播报一次进展。你的动作会出现在现场大屏。</p><div className="join-select"><label htmlFor="team-select">我来自 / 我支持</label><NativeSelect id="team-select" value={teamId} onChange={(event) => setTeamId(event.target.value)} className="join-field"><NativeSelectOption value="">选择队伍</NativeSelectOption>{market?.teams.map((team) => <NativeSelectOption value={team.id} key={team.id}>{team.name}</NativeSelectOption>)}</NativeSelect></div>{error && <div className="join-error" role="status">{error}</div>}</div>
      <nav className="join-quick-links" aria-label="互动快捷入口"><a href="#icebreak">✳ 破冰</a><a href="#help">↗ 求助</a><a href="#progress">✦ 进展</a><a href="#vote">♡ 投票</a></nav>
      <div className="join-grid">
        <section className="join-card cheer-card"><div className="join-card-head"><span>01 / CHEER</span><Heart/></div><h2>给灵感加点燃料</h2><p>看到喜欢的项目？为它喝彩一次，服务器确认后，这次回应就会出现在大屏。</p><Button disabled={busy || !teamId} onClick={() => act({ kind: "cheer" }, "喝彩已送达大屏！")} className="join-main-button"><Heart size={18}/> 为这支队伍喝彩</Button><small>同一设备对同队每 5 分钟可喝彩一次</small></section>
        <section className="join-card ice-card" id="icebreak"><div className="join-card-head"><span>02 / ICEBREAKER</span><Sparkles/></div><h2>破冰盲盒</h2><p>抽一张面对面任务，给第一次开口一个理由。</p><div className={`challenge-ticket ${revealed ? "ticket-revealed" : ""} ${completedChallenge === challenge ? "ticket-completed" : ""}`} key={challenge}><span>YOUR MISSION</span><strong>{completedChallenge === challenge && <Check size={24}/>} {revealed?challenge:"一张新的破冰任务，等你翻开。"}</strong><small>面对面完成 · 预计 3 分钟</small></div><p><a href="/play">想换一种玩法？试试 30 秒声浪接力 ↗</a></p><div className="join-button-row"><Button variant="outline" disabled={busy} onClick={() => { if(!revealed){setRevealed(true);return;} setCompletedChallenge(""); const next = challenges.filter((item) => item !== challenge); setChallenge(next[Math.floor(Math.random() * next.length)]); }}><Shuffle size={16}/> {revealed?"重抽一张":"翻开任务卡"}</Button><Button disabled={busy || !teamId || !revealed || completedChallenge===challenge} onClick={async () => { if(await act({kind:"icebreak",label:challenge},"服务器已确认完成，大屏将同步这次破冰。")) setCompletedChallenge(challenge); }}><Check size={16}/> {busy?"确认中…":completedChallenge===challenge?"已完成 ✓":"我完成了"}</Button></div></section>
        <section className="join-card help-card" id="help"><div className="join-card-head"><span>03 / HELP DESK</span><Lightbulb/></div><h2>求助广场</h2><p>把卡点写清楚。其他人会在大厅和大屏看到这条求助。</p><Textarea value={help} onChange={(event) => setHelp(event.target.value)} maxLength={160} placeholder="例如：需要一位会 Figma 的同学帮我们看看路演页…"/><Button disabled={busy || !teamId || help.trim().length < 6} onClick={() => act({ kind: "help", label: "现场求助", note: help }, "求助已发布到现场！")}><Plus size={16}/> 发布求助</Button><div className="active-help"><strong>正在求助 · {activeHelp.length}</strong>{activeHelp.slice(0, 3).map((item) => { const mine = ownedHelpIds.includes(item.id); const claimed = item.status === "claimed"; const iClaimed = claimedHelpIds.includes(item.id); return <div className="help-line" key={item.id}><span>{market?.teams.find((team) => team.id === item.teamId)?.name}{claimed && <em className="help-claimed-tag">已有人认领</em>}</span><p>{item.note}</p>{mine ? <button disabled={busy} onClick={() => act({ kind: "resolve", targetId: item.id, teamId: item.teamId }, "求助已标记解决。")}>{claimed ? "已有人帮忙 · 标记解决" : "标记已解决"}</button> : claimed ? (iClaimed ? <button disabled={busy} onClick={() => act({ kind: "resolve", targetId: item.id, teamId: item.teamId }, "求助已标记解决。")}>我认领的 · 标记解决</button> : <small className="help-taken">已被认领</small>) : <button disabled={busy} onClick={() => act({ kind: "claim", targetId: item.id, teamId: item.teamId }, "已认领，去联系他们吧！")}>我来帮忙</button>}</div>; })}</div></section>
        <section className="join-card progress-card" id="progress"><div className="join-card-head"><span>04 / MILESTONE</span><Zap/></div><h2>播报进度</h2><p>把一个小胜利送上大屏。别等到全部做完才庆祝。</p><div className="milestone-options">{milestones.map((item) => <button type="button" className={milestone === item ? "selected" : ""} onClick={() => setMilestone(item)} key={item}>{item}</button>)}</div><Input value={note} onChange={(event) => setNote(event.target.value)} maxLength={90} placeholder="补一句发生了什么（选填）"/><Button disabled={busy || !teamId} onClick={async () => { if (await act({ kind: "milestone", label: milestone, note }, "进度已播报，继续冲！")) setNote(""); }}>发布快讯</Button></section>
        <section className="join-card vote-card" id="vote"><div className="join-card-head"><span>05 / LIVE VOTE</span><Vote/></div><h2>人气投票</h2><p>先了解作品，再确认送出支持。服务器确认后，真实票数会同步到人气榜和现场大屏。每台设备限一票。</p><a href="/vote" className="vote-entry"><Vote size={16}/> 进入实时投票页 <ArrowLeft size={16}/></a></section>
        <section className="join-card team-card" id="team"><div className="join-card-head"><span>NEW TEAM</span><Plus/></div><h2>你的队伍还没上榜？</h2><p>输入队名和一句话介绍，让它出现在互动大厅。</p><Input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={28} placeholder="队伍名称"/><Input value={newIdea} onChange={(event) => setNewIdea(event.target.value)} maxLength={90} placeholder="一句话介绍项目"/><Button variant="outline" disabled={busy || newName.trim().length < 2 || newIdea.trim().length < 4} onClick={async () => { setBusy(true); try { const result = await sendAction({ kind: "team", name: newName, idea: newIdea }); setMessage("队伍已成功加入！"); setTeamId(result.teamId || ""); setNewName(""); setNewIdea(""); await refresh(); } catch (err) { setMessage(err instanceof Error ? err.message : "创建失败"); } finally { setBusy(false); } }}>创建队伍</Button></section>
      </div><footer className="join-footer"><a href="/screen">切到大屏模式</a><span>热度只表示现场互动，不是评审分数。</span></footer>
    </div>
    {message && <div className="join-feedback-toast" role="status"><span>{message}</span><button aria-label="关闭提示" onClick={() => setMessage("")}><X size={18}/></button></div>}
  </main>;
}

