export default function manifest() {
  return {
    name: "सतर्क — पहले जाँच, फिर कदम",
    short_name: "सतर्क",
    description: "संदिग्ध कॉल में जोखिम भरी माँग पहचानने वाला सरल सुरक्षा साथी",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f7f5",
    theme_color: "#f7f7f5",
    lang: "hi",
    categories: ["utilities", "security", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
