import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";

export const metadata = {
  title: "Sus-Penders",
  description: "Gamified group task tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">
        <div className="space-bg" aria-hidden="true">
          <div className="stars stars-1"></div>
          <div className="stars stars-2"></div>
          <div className="stars stars-3"></div>
          <div className="glow glow-green"></div>
          <div className="glow glow-red"></div>
          <div className="ship ship-1">🛸</div>
          <div className="ship ship-2">🚀</div>
        </div>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}