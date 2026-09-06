import "./globals.css";

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
        <header className="flex items-center justify-center gap-2 py-4 border-b border-[#1E3350]">
          <div className="w-6 h-6 rounded-full bg-[var(--mint)]"></div>
          <h1 className="font-display font-extrabold text-xl tracking-tight">
            Sus-Penders
          </h1>
        </header>
        {children}
      </body>
    </html>
  );
}