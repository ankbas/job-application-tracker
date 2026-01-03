import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load backend/.env no matter where you run from
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import pkg from "pg";
const { Pool } = pkg;

console.log("DATABASE_URL loaded:", process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL missing. Fix backend/.env");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
