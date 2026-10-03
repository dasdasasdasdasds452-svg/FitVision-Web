import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Kanit } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FitVision — AI วิเคราะห์ท่าออกกำลังกาย",
  description: "วิเคราะห์ฟอร์ม Squat, Bench Press และ Deadlift แบบเรียลไทม์ด้วยกล้องมือถือ",
  applicationName: "FitVision",
  appleWebApp: { capable: true, title: "FitVision", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${kanit.variable} ${spaceGrotesk.className} antialiased font-sans text-slate-100 bg-background-dark min-h-screen font-display`}
      >
        <LanguageProvider>
          <AuthProvider>
            <Sidebar />
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
