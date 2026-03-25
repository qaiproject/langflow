import qosmoLogoDark from "@/assets/qosmo_mini.svg";
import qosmoLogoLight from "@/assets/qosomo_logo_black_mini.svg";
import { useDarkStore } from "@/stores/darkStore";

interface QosmoLogoProps {
  className?: string;
  title?: string;
}

export default function QosmoLogo({ className, title }: QosmoLogoProps) {
  const dark = useDarkStore((state) => state.dark);
  const src = dark ? qosmoLogoDark : qosmoLogoLight;

  return <img src={src} alt={title ?? "Qosmo logo"} className={className} />;
}
