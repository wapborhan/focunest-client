export default function Logo({ size = 36 }) {
  return (<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2dd4bf" /><stop offset="1" stopColor="#0b4f49" /></linearGradient></defs>
    <rect width="32" height="32" rx="9" fill="url(#lg)" /><path d="M9 22V10l7 8 7-8v12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
