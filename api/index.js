import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-load environment files across directory variations
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';
import { ensureDemoAccounts } from '../server/src/config/seed.js';

let isInitialized = false;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
    responseLimit: false,
  },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (!isInitialized) {
    try {
      await connectDB();
      await ensureDemoAccounts();
      isInitialized = true;
    } catch (err) {
      console.warn('[Vercel Serverless] DB connection notice:', err.message);
    }
  }
  return app(req, res);
}
