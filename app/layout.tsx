import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zero Two Live Friend",
  description: "A live AI companion interface.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}