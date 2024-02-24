import { resolve } from "path";
import { defineConfig } from "vite";

// const root = resolve(__dirname, "src");
// const outDir = resolve(__dirname, "dist");

export default defineConfig({
  base: "./",
  // root,
  // publicDir: resolve(root, "public"),
  build: {
    // outDir,
    // emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "./src", "index.html"),
        "webcodecs-data-moshing": resolve(
          __dirname,
          "./src/webcodecs-data-moshing",
          "index.html",
        ),
      },
    },
  },
});
