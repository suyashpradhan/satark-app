import "./globals.css";

export const metadata = {
  title: "सतर्क — पहले जाँच, फिर कदम",
  description: "संदिग्ध कॉल में जोखिम भरी माँग पहचानने वाला सरल सुरक्षा साथी",
  applicationName: "सतर्क",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "सतर्क",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f7f5",
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
