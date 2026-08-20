import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "מערכת ניהול קליניקות | קביעת תורים",
  description: "מערכת קביעת תורים לחדרי הקליניקה",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${assistant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Providers>
          <Navbar />
          <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="text-center text-xs text-slate-400 py-4">
            מערכת ניהול קליניקות
          </footer>
        </Providers>
      </body>
    </html>
  );
}
