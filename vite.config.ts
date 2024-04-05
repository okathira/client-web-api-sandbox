import { resolve } from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

const root = resolve(__dirname, "src"); // srcフォルダをrootにする。マルチページのフォルダをsrcにまとめたい＆変に階層を増やしたくない。
const outDir = resolve(__dirname, "dist"); // でも当然ビルドフォルダはsrcの外にしたい

export default defineConfig({
  base: "./", // JSのimportが相対パスになる。ビルドしたフォルダ単体で動くので便利。
  root,
  plugins: [react()],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),
        "webcodecs-data-moshing": resolve(
          root,
          "webcodecs-data-moshing",
          "index.html",
        ),
      },
    },
  },
});
