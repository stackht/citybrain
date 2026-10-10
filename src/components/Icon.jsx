const P = {
  city: <><path d="M3 21V9l6-3v15" /><path d="M9 21V4l8 3v14" /><path d="M17 21V11l4 2v8" /><path d="M2 21h20" /></>,
  route: <><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" /></>,
  rules: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 11h8M8 15h8M8 8h4" /></>,
  ambulance: <><path d="M2 7h12v10H2z" /><path d="M14 10h4l3 3v4h-7" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /><path d="M8 9.5v4M6 11.5h4" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  signal: <><rect x="8" y="2.5" width="8" height="19" rx="2" /><circle cx="12" cy="7" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="17" r="1.6" /></>,
  bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>,
  brain: <><circle cx="5" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="12" cy="12" r="2.4" /><circle cx="19" cy="9" r="2" /><circle cx="19" cy="17" r="2" /><path d="M7 6.5l3.2 4M7 17.5l3.2-4M14.2 11l3-1.2M14.2 13l3 2.8" /></>,
  perceptron: <><path d="M3 20L21 4" /><circle cx="6" cy="8" r="1.8" /><circle cx="10" cy="5" r="1.8" /><circle cx="17" cy="17" r="1.8" /><circle cx="19" cy="12" r="1.8" /></>,
  chat: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
  play: <path d="M7 4.5v15l12-7.5z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  step: <><path d="M6 5v14l9-7z" /><path d="M18 5v14" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v5h5" /></>,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.1" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  download: <><path d="M12 4v11M7 11l5 5 5-5" /><path d="M5 20h14" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.1" /></>,
  arrow:<path d="M5 12h14M13 6l6 6-6 6" />,
}

export default function Icon({ name, size = 24, stroke = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  )
}
