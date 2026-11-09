import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: ReactNode, displayName: string) {
  const C = ({ size = 18, strokeWidth = 1.9, ...rest }: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths}
    </svg>
  );
  C.displayName = displayName;
  return C;
}

export const IconOverview = make(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>, "IconOverview");
export const IconMap = make(<><path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" /><path d="M9 4v13M15 7v13" /></>, "IconMap");
export const IconTruck = make(<><path d="M2 6.5A1.5 1.5 0 0 1 3.5 5H14v11H2V6.5Z" /><path d="M14 9h4.2a1 1 0 0 1 .8.4l2.7 3.6a1 1 0 0 1 .2.6V16h-7.9" /><circle cx="6.5" cy="17.5" r="2" /><circle cx="17" cy="17.5" r="2" /></>, "IconTruck");
export const IconPackage = make(<><path d="M21 8.5 12 4 3 8.5v7L12 20l9-4.5v-7Z" /><path d="m3 8.5 9 4.5 9-4.5M12 13v7" /><path d="m7.5 6.2 9 4.6" /></>, "IconPackage");
export const IconDriver = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>, "IconDriver");
export const IconUsers = make(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" /></>, "IconUsers");
export const IconBuilding = make(<><rect x="4" y="3" width="11" height="18" rx="1" /><path d="M15 9h4a1 1 0 0 1 1 1v11H15" /><path d="M8 7h3M8 11h3M8 15h3M3 21h18" /></>, "IconBuilding");
export const IconChart = make(<><path d="M3 3v18h18" /><path d="M8 16v-4M12 16V8M16 16v-6M20 16V5" /></>, "IconChart");
export const IconBell = make(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>, "IconBell");
export const IconAlert = make(<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>, "IconAlert");
export const IconSettings = make(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>, "IconSettings");
export const IconSearch = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, "IconSearch");
export const IconChevronLeft = make(<path d="m15 18-6-6 6-6" />, "IconChevronLeft");
export const IconChevronRight = make(<path d="m9 18 6-6-6-6" />, "IconChevronRight");
export const IconChevronDown = make(<path d="m6 9 6 6 6-6" />, "IconChevronDown");
export const IconArrowLeft = make(<><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>, "IconArrowLeft");
export const IconArrowRight = make(<><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>, "IconArrowRight");
export const IconX = make(<path d="M18 6 6 18M6 6l12 12" />, "IconX");
export const IconPlus = make(<path d="M12 5v14M5 12h14" />, "IconPlus");
export const IconPencil = make(<><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" /></>, "IconPencil");
export const IconEye = make(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>, "IconEye");
export const IconPhone = make(<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />, "IconPhone");
export const IconWhatsApp = make(<><path d="M3.5 20.5 5 16.3A8.5 8.5 0 1 1 8 19.2l-4.5 1.3Z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 1c-1.3-.5-2.4-1.6-2.9-2.9l1-1-1-2L9 8.5Z" strokeWidth="1.4" /></>, "IconWhatsApp");
export const IconSms = make(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" /><path d="M8 9h8M8 13h5" /></>, "IconSms");
export const IconPlay = make(<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z" />, "IconPlay");
export const IconPause = make(<><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>, "IconPause");
export const IconZap = make(<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />, "IconZap");
export const IconClock = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, "IconClock");
export const IconPin = make(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>, "IconPin");
export const IconNavigation = make(<path d="M3 11 22 2l-9 19-2-8-8-2Z" />, "IconNavigation");
export const IconGauge = make(<><path d="M12 14 15.5 9" /><path d="M3.3 19a10 10 0 1 1 17.4 0" /><circle cx="12" cy="14" r="1.2" /></>, "IconGauge");
export const IconRoute = make(<><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5" /></>, "IconRoute");
export const IconCheck = make(<path d="M20 6 9 17l-5-5" />, "IconCheck");
export const IconCheckCircle = make(<><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>, "IconCheckCircle");
export const IconCircle = make(<circle cx="12" cy="12" r="4" />, "IconCircle");
export const IconWeight = make(<><circle cx="12" cy="5.5" r="2.5" /><path d="M6.5 8h11l2.5 13H4L6.5 8Z" /></>, "IconWeight");
export const IconBox = make(<><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1zM10 12h4" /></>, "IconBox");
export const IconCalendar = make(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>, "IconCalendar");
export const IconTrendUp = make(<><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></>, "IconTrendUp");
export const IconTrendDown = make(<><path d="m22 17-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" /></>, "IconTrendDown");
export const IconArrowUpRight = make(<path d="M7 17 17 7M8 7h9v9" />, "IconArrowUpRight");
export const IconExternal = make(<><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>, "IconExternal");
export const IconCopy = make(<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>, "IconCopy");
export const IconRefresh = make(<><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 12A9 9 0 0 1 18.5 5.8L21 8" /><path d="M21 3v5h-5M3 21v-5h5" /></>, "IconRefresh");
export const IconSatellite = make(<><path d="M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4" /><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2" /></>, "IconSatellite");
export const IconFuel = make(<><path d="M3 22V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17M2 22h13M3 10h11" /><path d="M14 13h2a2 2 0 0 1 2 2v2a1.5 1.5 0 0 0 3 0V9.8a2 2 0 0 0-.6-1.4L17 5" /></>, "IconFuel");
export const IconShield = make(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />, "IconShield");
export const IconPanel = make(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 9l-3 3 3 3" /></>, "IconPanel");
export const IconMenu = make(<path d="M4 6h16M4 12h16M4 18h16" />, "IconMenu");
export const IconSparkle = make(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6 6 2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>, "IconSparkle");
export const IconSend = make(<><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></>, "IconSend");
export const IconFlag = make(<><path d="M4 22V4" /><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1" /></>, "IconFlag");
export const IconInfo = make(<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>, "IconInfo");
export const IconLayers = make(<><path d="m12 2 10 5-10 5L2 7l10-5Z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></>, "IconLayers");
export const IconCrosshair = make(<><circle cx="12" cy="12" r="9" /><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" /></>, "IconCrosshair");
export const IconMore = make(<><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>, "IconMore");
export const IconFilter = make(<path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4Z" />, "IconFilter");
export const IconStar = make(<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />, "IconStar");
export const IconRupee = make(<><path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10" /></>, "IconRupee");
export const IconWrench = make(<path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.7-2.3a4 4 0 0 0-5-5L2 10l8-8 4.7 4.3Z" />, "IconWrench");
export const IconDownload = make(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>, "IconDownload");
export const IconTarget = make(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>, "IconTarget");
export const IconHome = make(<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /></>, "IconHome");

/** Shree Sai Trucks mark: a highway that turns into an "S", inside a rounded badge. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Shree Sai Trucks" role="img">
      <rect width="40" height="40" rx="11" fill="#0b2545" />
      <path d="M27.5 10H17.5a5.75 5.75 0 0 0 0 11.5h5a5.75 5.75 0 0 1 0 11.5H11.5" fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M27.5 10H17.5a5.75 5.75 0 0 0 0 11.5h5a5.75 5.75 0 0 1 0 11.5H11.5" fill="none" stroke="#0b2545" strokeWidth="1.1" strokeDasharray="2 2.6" strokeLinecap="round" />
      <path d="M29 6.5a3 3 0 0 1 3 3v3.5h-6V9.5a3 3 0 0 1 3-3Z" fill="#f4b400" />
    </svg>
  );
}

export function KaptainXMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect width="20" height="20" rx="5" fill="#fff" fillOpacity="0.12" />
      <path d="M6 5v10M6 10l6-5M8.5 8.2 13 15" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
