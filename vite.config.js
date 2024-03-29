import path from 'path'
import { defineConfig } from "vite";

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, "lib/main.ts"),
            name: "appear",
            fileName: format => `appear.${format}.js`
        }
    }
})
