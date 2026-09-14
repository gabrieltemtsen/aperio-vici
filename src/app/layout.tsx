import type { Metadata, Viewport } from "next";
import { Newsreader, Archivo } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Providers } from "@/components/providers";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aperio Vici Bookshops & Gifts",
    template: "%s · Aperio Vici",
  },
  description:
    "Order books and gifts from Aperio Vici and have them delivered anywhere in Nigeria. Pay by bank transfer, or buy over the counter.",
  openGraph: {
    title: "Aperio Vici Bookshops & Gifts",
    description: "Books and gifts, delivered anywhere in Nigeria.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#10203A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en-NG" className={`${newsreader.variable} ${archivo.variable}`}>
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
