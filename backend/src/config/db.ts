import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin','analyst','viewer')),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sector VARCHAR(100),
      description TEXT,
      country VARCHAR(100),
      founded_year INT,
      created_by INT REFERENCES users(id),
      deleted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS financials (
      id SERIAL PRIMARY KEY,
      company_id INT REFERENCES companies(id) ON DELETE CASCADE,
      fiscal_year INT NOT NULL,
      revenue NUMERIC,
      ebitda NUMERIC,
      pat NUMERIC,
      total_debt NUMERIC,
      operating_profit NUMERIC,
      UNIQUE(company_id, fiscal_year)
    );

    CREATE TABLE IF NOT EXISTS financial_metrics (
      id SERIAL PRIMARY KEY,
      company_id INT REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
      op_margin NUMERIC,
      pat_margin NUMERIC,
      sales_cagr_3y NUMERIC,
      pat_cagr_3y NUMERIC,
      debt_trend VARCHAR(20),
      margin_trend VARCHAR(20),
      calculated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS research_notes (
      id SERIAL PRIMARY KEY,
      company_id INT REFERENCES companies(id) ON DELETE CASCADE,
      author_id INT REFERENCES users(id),
      content TEXT NOT NULL,
      sentiment VARCHAR(20) DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','negative')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS company_scores (
      id SERIAL PRIMARY KEY,
      company_id INT REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
      investment_score NUMERIC,
      growth_score NUMERIC,
      risk_score NUMERIC,
      overall_score NUMERIC,
      scored_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_summaries (
      id SERIAL PRIMARY KEY,
      company_id INT REFERENCES companies(id) ON DELETE CASCADE,
      content TEXT,
      model_name VARCHAR(100),
      prompt_version VARCHAR(20),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      approved_by INT REFERENCES users(id),
      generated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS upload_audits (
      id SERIAL PRIMARY KEY,
      company_id INT REFERENCES companies(id),
      uploaded_by INT REFERENCES users(id),
      s3_key VARCHAR(500),
      row_count INT,
      status VARCHAR(20),
      error_log TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS company_briefs (
      id SERIAL PRIMARY KEY,
      company_id INT REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
      content TEXT,
      generated_by INT REFERENCES users(id),
      generated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('✅ DB tables ready');

  const existing = await pool.query(
    'SELECT * FROM users WHERE email=$1',
    ['superadmin@test.com']
  );

  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);

    await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)`,
      ['superadmin@test.com', hash, 'admin']
    );

    console.log('✅ Default admin user created');
  }
}