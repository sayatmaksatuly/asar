import { Award, LockKeyhole, Sparkles } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress";
import type { Dictionary } from "@/lib/i18n";

export interface AchievementView { id: string; name: string; description: string | null; rarity: "common" | "uncommon" | "rare" | "special"; progress: number; target: number; unlocked_at: string | null }

export function AchievementCard({ achievement, dictionary }: { achievement: AchievementView; dictionary: Dictionary }) {
  const unlocked = Boolean(achievement.unlocked_at);
  return <article className={`achievement-card rarity-${achievement.rarity} ${unlocked ? "is-unlocked" : "is-locked"}`}><div className="achievement-art" aria-hidden="true">{unlocked ? <Award /> : <LockKeyhole />}<Sparkles className="achievement-spark" /></div><div><span className="badge badge-neutral">{dictionary.achievements.rarity[achievement.rarity]}</span><h3>{achievement.name}</h3><p>{achievement.description}</p></div><ProgressBar value={achievement.progress} max={achievement.target} label={dictionary.achievements.progress} /><small>{unlocked && achievement.unlocked_at ? `${dictionary.achievements.unlocked}: ${new Intl.DateTimeFormat().format(new Date(achievement.unlocked_at))}` : dictionary.achievements.locked}</small></article>;
}
