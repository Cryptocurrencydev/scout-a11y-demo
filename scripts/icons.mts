import sharp from "sharp";
const mark = (pad: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="${pad ? 0 : 96}" fill="#0b5a52"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
<path d="M96 384 L416 192 L416 384 Z" fill="#fbf7f0"/><circle cx="352" cy="128" r="48" fill="#ffd23f"/></g></svg>`;
await sharp(Buffer.from(mark(0))).resize(192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(mark(0))).resize(512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(mark(64))).resize(512).png().toFile("public/icons/maskable-512.png");
await sharp(Buffer.from(mark(0))).resize(180).png().toFile("src/app/apple-icon.png");
await sharp(Buffer.from(mark(0))).resize(48).png().toFile("src/app/icon.png");
console.log("icons written");
