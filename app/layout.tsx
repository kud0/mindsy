import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import { PomodoroProvider } from "@/lib/contexts/PomodoroContext";
import { NotificationProvider } from "@/lib/contexts/NotificationContext";
import { ThemeProvider } from "@/lib/contexts/theme-context";
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
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#ffffff" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('mindsy-ui-theme') || 'light';
                document.documentElement.classList.add(theme === 'dark' ? 'dark' : 'light');
              } catch (e) {
                document.documentElement.classList.add('light');
              }
            `,
          }}
        />
      </head>
      <body
        className={`${roboto.variable} ${robotoMono.variable} antialiased`}
      >
        <ThemeProvider
          defaultTheme="light"
          storageKey="mindsy-ui-theme"
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
