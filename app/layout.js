import "./globals.css";

export const metadata = {
  title: "सतर्क — पहले जाँच, फिर कदम",
  description: "संदिग्ध कॉल में जोखिम भरी माँग पहचानने वाला सरल सुरक्षा साथी",
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
