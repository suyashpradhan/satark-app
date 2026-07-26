import "./globals.css";

export const metadata = {
  title: "Satark — Pehle jaanch, phir action",
  description: "Pehle jaanch, phir action — a calm second opinion for suspicious calls",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
