import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zero Two - Darling in the Franxx",
  description: "A live AI companion interface featuring a view-only 3D Zero Two model.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
