import type { MarketEvent, Team } from "./use-market";

export const VOTE_COLORS = ["#55f7ef", "#ff58bd", "#b8ff43", "#ffb951", "#ac88ff", "#83a9ff"];
const MAX_VISIBLE_VOTES = 24;
const CHART_LEFT = 55;
const CHART_STEP = 38;

export function voteCount(events: MarketEvent[], teamId: string) {
  return events.filter((event) => event.kind === "vote" && event.teamId === teamId && event.status === "open" && !event.demo).length;
}

export type VotePoint = { id: string; time: number; x: number; value: number; previous: number };
export type VoteSeries = { teamId: string; name: string; code: string; color: string; votes: number; points: VotePoint[] };

/** 每队一条固定颜色的走势；收到首票才出现，后续只随新选票追加。
 * 纵轴是该队票数占全场选票的比例，追赶会改变占比，累计票数不会减少。
 */
export function buildProgressiveVoteChart(teams: Team[], events: MarketEvent[]) {
  const knownTeams = new Set(teams.map((team) => team.id));
  const votes = events.filter((event) => event.kind === "vote" && event.status === "open" && !event.demo && knownTeams.has(event.teamId || ""))
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const series: VoteSeries[] = teams.map((team, index) => ({
    teamId: team.id, name: team.name, code: team.code,
    color: VOTE_COLORS[index % VOTE_COLORS.length], votes: 0, points: [],
  }));
  const visibleStart = Math.max(0, votes.length - MAX_VISIBLE_VOTES);
  votes.forEach((vote, index) => {
    series.forEach((entry) => {
      const previous = index ? entry.votes / index * 100 : 0;
      if (entry.teamId === vote.teamId) entry.votes += 1;
      if (!entry.votes || index < visibleStart) return;
      entry.points.push({
        id: vote.id, time: vote.createdAt, x: CHART_LEFT + (index - visibleStart) * CHART_STEP,
        previous, value: entry.votes / (index + 1) * 100,
      });
    });
  });
  return { series, totalVotes: votes.length, visibleVotes: Math.min(votes.length, MAX_VISIBLE_VOTES) };
}
