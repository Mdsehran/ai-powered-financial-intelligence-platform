import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { initDB } from './config/db';

import authRoutes from './routes/auth';
import companyRoutes from './routes/companies';
import financialRoutes from './routes/financials';
import analyticsRoutes from './routes/analytics';

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://ai-powered-financial-intelligence-a.vercel.app',
    'https://ai-powered-financial-intelligence-app-git-main-sehrans-projects.vercel.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok'
  });
});

const PORT = process.env.PORT || 4000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
});