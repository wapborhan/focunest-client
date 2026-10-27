import { Hind_Siliguri } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
const hind = Hind_Siliguri({ subsets: ["latin", "bengali"], weight: ["400", "500", "600", "700"], variable: "--font-hind", display: "swap" });
const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description = "My Life Manager is a personal finance app to track income, expenses, lending and borrowing, and cash, bank and mobile banking accounts in one dashboard.";
export const metadata = {
  metadataBase: new URL(site),
  title: { default: "My Life Manager: personal finance, simplified", template: "%s · My Life Manager" },
  description, applicationName: "My Life Manager", keywords: ["personal finance", "expense tracker", "income tracker", "loan tracker", "bKash", "BDT", "budget"],
  openGraph: { type: "website", siteName: "My Life Manager", title: "My Life Manager", description, url: "/" },
  twitter: { card: "summary_large_image", title: "My Life Manager", description },
  robots: { index: true, follow: true }, alternates: { canonical: "/" },
};
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };
export default function RootLayout({ children }) {
  return (<html lang="en"><body className={`${hind.variable} font-sans antialiased`}>{children}<Toaster richColors position="top-right" toastOptions={{ className: "!rounded-xl" }} /></body></html>);
}
