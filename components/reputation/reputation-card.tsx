import { Flame, HandHeart, Sparkles, TrendingUp } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress";
import type { Dictionary } from "@/lib/i18n";
import type { Profile, ReputationLevel } from "@/types/domain";

const thresholds: Array<[ReputationLevel, number]> = [["new_member", 0], ["kind_neighbor", 100], ["active_helper", 300], ["trusted_volunteer", 800], ["community_supporter", 1600], ["community_hero", 3000], ["asar_ambassador", 5000]];

export function ReputationCard({ profile, dictionary }: { profile: Profile; dictionary: Dictionary }) {
  const points = profile.reputation_points ?? 0;
  const level = profile.reputation_level ?? "new_member";
  const index = Math.max(0, thresholds.findIndex(([name]) => name === level));
  const currentFloor = thresholds[index][1];
  const next = thresholds[Math.min(index + 1, thresholds.length - 1)];
  const progress = next[1] === currentFloor ? 100 : Math.round(((points - currentFloor) / (next[1] - currentFloor)) * 100);
  return <article className="reputation-card"><div className="reputation-top"><span className="level-orb"><Sparkles /></span><div><span className="section-kicker">{dictionary.reputation.title}</span><h2>{dictionary.reputation.levels[level]}</h2><p><strong>{points}</strong> {dictionary.reputation.points}</p></div><span className="level-number">{dictionary.reputation.level} {index + 1}</span></div><ProgressBar value={progress} label={index === thresholds.length - 1 ? dictionary.reputation.topLevel : `${dictionary.reputation.toNext}: ${dictionary.reputation.levels[next[0]]}`} /><div className="reputation-facts"><span><HandHeart />{profile.completed_tasks_count}<small>{dictionary.reputation.helps}</small></span><span><Flame />{profile.consistency_streak ?? 0}<small>{dictionary.reputation.streak}</small></span><span><TrendingUp />{profile.community_contribution_count ?? 0}<small>{dictionary.reputation.contribution}</small></span></div></article>;
}
