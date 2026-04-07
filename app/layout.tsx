import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NightShift — AI That Works While You Sleep",
  description:
    "An autonomous AI agent that manages your digital life overnight, securely powered by Auth0 Token Vault. Wake up to a morning dashboard of everything it did and everything it needs your approval for.",
  openGraph: {
    title: "NightShift — AI That Works While You Sleep",
    description:
      "An autonomous AI agent secured with Auth0 Token Vault, CIBA, and Step-Up Authentication.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
