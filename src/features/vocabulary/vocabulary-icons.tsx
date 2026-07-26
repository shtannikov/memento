function SvgIcon({
  path,
  size = 16,
}: {
  path: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export function CheckIcon() {
  return <SvgIcon path="M5 12.5 9.2 17 19 7" />;
}

export function TrashIcon() {
  return (
    <SvgIcon path="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />
  );
}

export function UndoIcon() {
  return <SvgIcon path="M9 7 5 11l4 4M5 11h8a5 5 0 1 1 0 10" />;
}

export function PlusIcon() {
  return <SvgIcon path="M12 5v14M5 12h14" size={20} />;
}

export function PlayIcon() {
  return <SvgIcon path="m8 5 11 7-11 7V5Z" size={20} />;
}
