import path from "node:path";
import fs from "node:fs";
import * as dotenv from "dotenv";
import { buildDefaultCommands } from "./defaultCommands";
dotenv.config();
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        throw new Error(`Configured directory not found: ${dir}`);
    }
    return dir;
};
const getEnv = (key, fallback) => {
    const value = process.env[key] ?? fallback;
    if (value === undefined) {
        throw new Error(`Missing required environment variable ${key}`);
    }
    return value;
};
export const loadRuntimeConfig = () => {
    const wisprApiKey = getEnv("WISPR_API_KEY", "");
    const openAIApiKey = process.env.OPENAI_API_KEY;
    const scriptsDir = ensureDir(process.env.RAYCAST_SCRIPTS_DIR ?? path.join(process.env.HOME ?? "~", "raycast-scripts"));
    return {
        wisprApiKey,
        openAIApiKey,
        raycastScriptsDir: scriptsDir,
        commands: buildDefaultCommands(scriptsDir)
    };
};
