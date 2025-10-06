import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calculadora de Investimentos - O Preço de Esperar",
  description: "Simule investimentos com taxas reais do Banco Central atualizadas automaticamente. Descubra quanto dinheiro você está perdendo por não começar a investir hoje.",
  keywords: "investimentos, calculadora, juros compostos, CDI, Selic, IPCA, tesouro direto, poupança, ações, fundos, Brasil",
  authors: [{ name: "O Preço de Esperar" }],
  creator: "O Preço de Esperar",
  publisher: "O Preço de Esperar",
  robots: "index, follow",
  openGraph: {
    title: "Calculadora de Investimentos - O Preço de Esperar",
    description: "Simule investimentos com taxas reais do Banco Central. Descubra quanto dinheiro você está perdendo por não começar a investir hoje.",
    type: "website",
    locale: "pt_BR",
    siteName: "O Preço de Esperar",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "Calculadora de Investimentos"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Calculadora de Investimentos - O Preço de Esperar",
    description: "Simule investimentos com taxas reais do Banco Central. Descubra quanto dinheiro você está perdendo por não começar a investir hoje.",
    images: ["/icon.svg"]
  },
  manifest: "/manifest.json",
  themeColor: "#10b981",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Preço de Esperar"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
    shortcut: "/icon.svg"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Preço de Esperar" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.className = theme;
                document.body.className = theme;
              } catch (e) {
                document.documentElement.className = 'dark';
                document.body.className = 'dark';
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
              <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem={false}
                disableTransitionOnChange
              >
          {children}
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155'
              }
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
