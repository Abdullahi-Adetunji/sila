import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sila",
  description: "Private carrier results for couples, explained clearly.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
