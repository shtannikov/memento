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

export function SparklesIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.4 3.6L7 8l3.6 1.4L12 13l1.4-3.6L17 8l-3.6-1.4L12 3Z" />
      <path d="m19 14-.8 2.2L16 17l2.2.8L19 20l.8-2.2L22 17l-2.2-.8L19 14Z" />
      <path d="m5 13-1 2.5L1.5 16.5 4 17.5 5 20l1-2.5 2.5-1L6 15.5 5 13Z" />
    </svg>
  );
}
