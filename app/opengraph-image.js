import { ImageResponse } from "next/og";
export const alt = "My Life Manager";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, background: "linear-gradient(135deg,#0a2925,#0f766e)", color: "#fff" }}>
    <div style={{ fontSize: 40, opacity: 0.8 }}>My Life Manager</div><div style={{ fontSize: 76, fontWeight: 700, marginTop: 20, lineHeight: 1.1 }}>Know where your money is, and where it is going.</div></div>, size);
}
