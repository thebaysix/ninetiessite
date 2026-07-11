import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";

// Single-page static site. One full-screen effect, no content collections.
export default defineConfig({
  site: "https://ohnoitsthenineties.lol",
  trailingSlash: "ignore",
  adapter: cloudflare(),
});