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