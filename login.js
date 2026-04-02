// Importações continuam as mesmas, mas usando 'import' em vez de 'require' (padrão ES Modules)
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ✅ MUDANÇA 1: Usar 'export default' e os parâmetros (req, res)
export default async function handler(req, res) {
    
    // O tratamento de CORS na Vercel geralmente é feito em um arquivo vercel.json
    // mas para simplificar, podemos adicionar os headers na resposta.

    // ✅ MUDANÇA 2: Verificar o método usando req.method
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'CORS preflight' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            message: 'Método não permitido. Use POST.' 
        });
    }

    // ✅ MUDANÇA 3: Os dados vêm diretamente de req.body, não precisa de JSON.parse
    const { email, password } = req.body;

    // Validação continua igual
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email e senha são obrigatórios.' 
        });
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        // A lógica do banco de dados permanece IDÊNTICA
        const client = await pool.connect();
        const result = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        client.release();

        const user = result.rows[0];

        if (!user) {
            // ✅ MUDANÇA 4: Usar res.status().json() para enviar a resposta
            return res.status(401).json({ 
                success: false, 
                message: 'Email ou senha incorretos.' 
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email ou senha incorretos.' 
            });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        delete user.password_hash;

        // ✅ MUDANÇA 5: Enviar a resposta final de sucesso
        return res.status(200).json({ 
            success: true,
            message: 'Login realizado com sucesso!', 
            token, 
            user
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        
        // ✅ MUDANÇA 6: Enviar a resposta de erro 500
        return res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor. Tente novamente mais tarde.' 
        });
    }
};
