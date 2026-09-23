import { CookieIcon, FileTextIcon, LeafIcon, RepeatIcon, ShieldIcon, TruckIcon, type Icon } from "./icons";
import type { Policy } from "@/lib/policies";

export const POLICY_ICONS: Record<Policy["icon"], Icon> = {
  shield: ShieldIcon,
  file: FileTextIcon,
  repeat: RepeatIcon,
  truck: TruckIcon,
  cookie: CookieIcon,
  leaf: LeafIcon,
};
