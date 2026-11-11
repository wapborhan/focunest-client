"use client";
import { Toaster } from "sonner";
import { useTheme } from "./ThemeProvider";
export default function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster richColors position="top-right" theme={resolved} toastOptions={{ className: "!rounded-xl" }} />;
}
