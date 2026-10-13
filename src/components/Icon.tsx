type IconName = 'sprout' | 'plus' | 'close' | 'arrow' | 'water' | 'edit' | 'back' | 'tidy' | 'trash'

const paths: Record<IconName, React.ReactNode> = {
  sprout: <><path d="M12 21c1-6-1-10-5-13m5 10c0-5 2-8 5-11" /><path d="M10 12C4 13 2 8 3 4c5 0 9 2 7 8Zm3-1c-1-6 3-9 8-8 0 5-3 9-8 8Z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="m9 5 7 7-7 7" />,
  back: <path d="m14 5-7 7 7 7" />,
  water: <path d="M12 3S5 10 5 15a7 7 0 0 0 14 0c0-5-7-12-7-12ZM8 15c0 2 1 3 3 3" />,
  edit: <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 7Z" /></>,
  tidy: <><path d="M12 2.5c.7 4.7 2.3 6.3 7 7-4.7.7-6.3 2.3-7 7-.7-4.7-2.3-6.3-7-7 4.7-.7 6.3-2.3 7-7Z" /><path d="M5 15.5c.3 2.1 1 2.8 3.1 3.1-2.1.3-2.8 1-3.1 3.1-.3-2.1-1-2.8-3.1-3.1 2.1-.3 2.8-1 3.1-3.1Z" /></>,
  trash: <><path d="M5 7h14M9 7V4h6v3m2 0-1 14H8L7 7" /><path d="M10 11v6m4-6v6" /></>,
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
