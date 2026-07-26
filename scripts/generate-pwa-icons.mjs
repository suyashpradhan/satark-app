import sharp from "sharp";

const artwork = Buffer.from(`
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="#f7f7f5"/>
    <circle cx="256" cy="256" r="192" fill="#171717"/>
    <path d="M256 128 354 166v82c0 78-50 120-98 145-48-25-98-67-98-145v-82l98-38Z" fill="none" stroke="#fff" stroke-width="25" stroke-linejoin="round"/>
    <rect x="220" y="208" width="23" height="88" rx="11.5" fill="#c5221f"/>
    <rect x="269" y="208" width="23" height="88" rx="11.5" fill="#c5221f"/>
  </svg>
`);

await Promise.all([
  sharp(artwork).resize(512, 512).png().toFile("public/icon-512.png"),
  sharp(artwork).resize(192, 192).png().toFile("public/icon-192.png"),
  sharp(artwork).resize(180, 180).png().toFile("public/apple-touch-icon.png"),
]);
