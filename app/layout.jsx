import { Hind_Siliguri } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import ThemedToaster from "@/components/ThemedToaster";
import { THEME_SCRIPT } from "@/lib/theme-script";
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
export const viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#0f766e" }, { media: "(prefers-color-scheme: dark)", color: "#0b1412" }] };
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className={`${hind.variable} font-sans antialiased`}><ThemeProvider>{children}<ThemedToaster /></ThemeProvider></body>
    </html>
  );
}
