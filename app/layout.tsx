import type { Metadata } from "next";
import { Roboto, Roboto_Mono, Space_Grotesk } from "next/font/google";
import { PomodoroProvider } from "@/lib/contexts/PomodoroContext";
import { NotificationProvider } from "@/lib/contexts/NotificationContext";
import { ThemeProvider } from "next-themes";
import { AudioProvider } from "@/lib/contexts/AudioStore";
import { CommandBar } from "@/components/command-bar/CommandBar";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mindsy",
  description: "Study copilot for students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#FAFAFA" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1C1C1E" media="(prefers-color-scheme: dark)" />
      </head>
      <body
        className={`${roboto.variable} ${robotoMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          storageKey="mindsy-ui-theme"
          disableTransitionOnChange
        >
          <AudioProvider>
            <NotificationProvider>
              <PomodoroProvider>
                {/* <CommandBar /> */}
                {children}
              </PomodoroProvider>
            </NotificationProvider>
          </AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
