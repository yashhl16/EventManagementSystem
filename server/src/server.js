import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { connectDB } from './config/db.js';
import { ensureDemoAccounts } from './config/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 5000;

// Start Server & Connect Database
const startServer = async () => {
  try {
    await connectDB();
    await ensureDemoAccounts();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` Eventify Event Hub API Server running on port ${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);
      console.log(` Admin Portal: http://localhost:5173/admin/login`);
      console.log(` Student Portal: http://localhost:5173/student/login`);
      console.log(` Organizer Portal: http://localhost:5173/organizer/login`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
