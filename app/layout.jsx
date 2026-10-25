import { Hind_Siliguri } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
const hind = Hind_Siliguri({
  subsets: ["latin", "bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind",
});
export const metadata = {
  title: "FocuNests",
  description:
    "Your personal space for focus, productivity, and well-being. Track habits, manage tasks, and achieve your goals with FocuNests.",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${hind.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
