import {
  Car,
  CircleEllipsis,
  FileText,
  Home,
  MapPin,
  MessageCircleHeart,
  MonitorSmartphone,
  Package,
  PawPrint,
  Pill,
  Wrench,
} from "lucide-react";

const icons = {
  package: Package,
  pill: Pill,
  home: Home,
  map: MapPin,
  car: Car,
  tech: MonitorSmartphone,
  support: MessageCircleHeart,
  documents: FileText,
  repair: Wrench,
  pets: PawPrint,
  other: CircleEllipsis,
};

export function CategoryIcon({ name, size = 24 }: { name?: string | null; size?: number }) {
  const Icon = icons[(name ?? "other") as keyof typeof icons] ?? CircleEllipsis;
  return <Icon size={size} aria-hidden="true" />;
}
