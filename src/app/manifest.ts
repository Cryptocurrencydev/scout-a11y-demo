import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ramplight: accessible travel scouts",
    short_name: "Ramplight",
    description: "Book local scouts for accessible travel advice and itineraries.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbf7f0",
    theme_color: "#0b5a52",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
