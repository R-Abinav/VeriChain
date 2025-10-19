import dotenv from "dotenv";

dotenv.config();

export const env = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    PORT: process.env.PORT || 3001,
    NODE_ENV: process.env.NODE_ENV || "development",
}