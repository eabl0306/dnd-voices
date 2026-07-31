import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaqueta sólo los ficheros que la app usa: la imagen de producción no
  // necesita node_modules entero.
  output: "standalone",
};

export default nextConfig;
