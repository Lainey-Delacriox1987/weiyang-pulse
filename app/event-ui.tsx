"use client";
import type { Team } from "@/lib/use-market";
import { ArrowUpRight } from "lucide-react";
export const sampleIds=new Set(["neon","404","wave","loop"]);
export function SampleNotice({teams}:{teams:Team[]}){return teams.some(t=>sampleIds.has(t.id))?<aside className="sample-notice" role="note"><b>示例活动</b><span>霓虹实验室、404 灵感俱乐部、声浪制造局、循环信号是示例队伍，不代表实际参赛名单。示例事件不计入正式票数。</span></aside>:null;}
export function EventHeader({active="现场"}:{active?:string}){return <><header className="event-header"><a className="event-brand" href="/"><img src="/weyoung-logo.png" alt="未央标识"/><span>未央<small>WEYOUNG PULSE</small></span></a><nav aria-label="现场导航">{[["现场","/"],["参与互动","/join"],["作品 / 投票","/vote"],["大屏","/screen"]].map(([name,url])=><a key={url} href={url} aria-current={active===name?"page":undefined}>{name}</a>)}</nav><a className="header-join" href="/join">加入现场 <ArrowUpRight size={17}/></a></header><div className="join-strip"><span>未央黑客松 · 现场互动空间</span><a href="/join">从手机参与，把回声送到大屏 <ArrowUpRight size={16}/></a></div></>;}
