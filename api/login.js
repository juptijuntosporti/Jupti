// Arquivo: /api/login.js (Conteúdo correto para a Vercel)

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// A estrutura que a Vercel entende: export default function...
export default async function handler(req, res) {
  
  // Verifica o método da requisição
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido. Use POST.' });
  }

  // Pega os dados direto do req.body
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios.' });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    client.release();

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email ou senha inválidos.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Email ou senha inválidos.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    delete user.password_hash;

    // Envia a resposta usando o objeto 'res'
    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso!',
      token,
      user
    });

  } catch (error) {
    console.error('ERRO NA API DE LOGIN:', error);
    // Envia o erro usando o objeto 'res'
    return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
}

