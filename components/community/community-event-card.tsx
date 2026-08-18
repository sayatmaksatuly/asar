import { Award, BadgeCheck, CalendarHeart, HeartHandshake, MapPin, Sparkles, UserPlus, UsersRound } from "lucide-react";
import { UserAvatar } from "@/components/ui/primitives";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { CommunityEvent } from "@/types/domain";

const icons = {
  help_completed: HeartHandshake,
  new_volunteer: UserPlus,
  achievement_unlocked: Award,
  community_milestone: UsersRound,
  verified_story: BadgeCheck,
  weekly_impact: CalendarHeart,
  new_city: MapPin,
  badge_received: Award,
  initiative: Sparkles,
};

export function CommunityEventCard({ event, locale, dictionary }: { event: CommunityEvent; locale: Locale; dictionary: Dictionary }) {
  const Icon = icons[event.event_type] ?? Sparkles;
  const actor = event.actor_name ?? dictionary.community.anonymous;
  const template = dictionary.community.events[event.event_type];
  const text = template.replace("{name}", actor).replace("{city}", event.city ?? dictionary.community.nearby);
  return (
    <article className="community-event-card">
      <div className="event-person">
        {event.actor_name ? <UserAvatar name={event.actor_name} src={event.actor_avatar_url} /> : <span className="event-icon" aria-hidden="true"><Icon /></span>}
        <div>
          <p className="event-copy">{text}</p>
          <p className="event-meta">
            {event.city ? <><MapPin size={15} aria-hidden="true" />{event.city}<span aria-hidden="true">·</span></> : null}
            <time dateTime={event.occurred_at}>{new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "kk-KZ", { day: "numeric", month: "long" }).format(new Date(event.occurred_at))}</time>
          </p>
        </div>
      </div>
    </article>
  );
}
