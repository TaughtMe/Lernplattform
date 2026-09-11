import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

const sharedProps = {
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function HomeIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M20.5 15.1A8.7 8.7 0 0 1 8.9 3.5 9 9 0 1 0 20.5 15.1Z" />
    </svg>
  );
}

export function SystemThemeIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M12 7a3.5 3.5 0 0 0 0 7Z" />
    </svg>
  );
}

export function LiveLessonIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 21h8M12 18v3" />
      <path d="m10 8 5 3-5 3Z" />
    </svg>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function SmallScreenIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M12 7.5v4M12 14h.01" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M8.5 6 10 4h4l1.5 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function DiceIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m4 20 4.2-1 10.6-10.6a2 2 0 0 0-2.8-2.8L5.4 16.2Z" />
      <path d="m14.5 7.1 2.8 2.8" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SwapIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M7 7h12l-3-3M17 17H5l3 3" />
    </svg>
  );
}

export function SwordsIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m5 4 6 6-2 2-6-6V4ZM19 4l-6 6 2 2 6-6V4ZM7 14l3 3-3 3-3-3ZM17 14l-3 3 3 3 3-3" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M18.2 9A7 7 0 0 0 6.5 6.5L4 9M5.8 15A7 7 0 0 0 17.5 17.5L20 15" />
    </svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m12 3 .9 2.4L15 6.5l-2.1 1.1L12 10l-.9-2.4L9 6.5l2.1-1.1ZM6 12l1.2 3.2L10 16.5l-2.8 1.3L6 21l-1.2-3.2L2 16.5l2.8-1.3ZM18 11l.9 2.4 2.1 1.1-2.1 1.1L18 18l-.9-2.4-2.1-1.1 2.1-1.1Z" />
    </svg>
  );
}

export function BookOpenIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 5H12v15H7.5A3.5 3.5 0 0 0 4 20.5ZM20 5.5A3.5 3.5 0 0 0 16.5 5H12v15h4.5a3.5 3.5 0 0 1 3.5.5Z" />
    </svg>
  );
}

export function CalculatorIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </svg>
  );
}

export function LanguagesIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M4 5h8M8 3v2M6 5c.7 3.2 2.8 5.5 6 7M11 5c-.8 3.4-3.1 6.1-7 8" />
      <path d="m14 19 3-8 3 8M15.2 16h3.6" />
    </svg>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M10 10h.01M13 10h.01M16 10h.01M7 14h.01M10 14h.01M13 14h4" />
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M8 4h8v4a4 4 0 0 1-8 0ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6" />
    </svg>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M5 10v4h3l4 4V6L8 10ZM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />
    </svg>
  );
}

export function CloudIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M6.5 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 17.7 8a5 5 0 0 1-.7 10Z" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />
    </svg>
  );
}
