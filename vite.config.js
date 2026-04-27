import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Production config — env loaded from .env
export default defineConfig({
    plugins: [react()],
    base: '/MOVEASY-WEBSITE/',
})