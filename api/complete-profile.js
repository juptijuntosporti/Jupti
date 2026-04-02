// Arquivo: netlify/functions/complete-profile.js (VERSÃO CORRIGIDA)

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// ... (função authenticateToken sem alterações)
const authenticateToken = (headers) => {
    const authHeader = headers.authorization;
    if (!authHeader) throw new Error('Token de autenticação não fornecido.');
    const token = authHeader.split(' ')[1];
    if (!token) throw new Error('Token mal formatado.');
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido ou expirado.');
    }
};


exports.handler = async (event, context) => {
    // ... (código de headers e validação de método sem alterações)
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS preflight' }) };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;
        const data = JSON.parse(event.body);

        if (!data.username) {
            throw new Error('O nome de usuário é obrigatório.');
        }

        const client = await pool.connect();

        const fieldsToUpdate = {
            username: data.username,
            profile_type: data.profile_type,
            is_profile_complete: true
        };

        // ✅✅✅ CORREÇÃO APLICADA AQUI ✅✅✅
        const fieldMapping = {
            nascimento: 'birth_year',
            cidade: 'city',
            estado: 'state',
            qtd_filhos: 'children_count',
            guarda: 'custody_type',
            nome_conjuge: 'spouse_name',
            registro_profissional: 'professional_registry',
            area_atuacao: 'field_of_work',
            profile_picture_url: 'profile_picture_url',
            // Adicionamos a vírgula na linha anterior e colocamos a nova linha aqui dentro:
            children_living_status: 'children_living_status'
        };
        // ✅✅✅ FIM DA CORREÇÃO ✅✅✅

        for (const [formName, dbColumnName] of Object.entries(fieldMapping)) {
            if (data[formName] !== undefined && data[formName] !== null && data[formName] !== '') {
                fieldsToUpdate[dbColumnName] = data[formName];
            }
        }
        
        // ... (o resto da função continua exatamente o mesmo, sem alterações)
        const existingUser = await client.query('SELECT id FROM users WHERE username = $1 AND id != $2', [fieldsToUpdate.username, userId]);
        if (existingUser.rows.length > 0) {
            client.release();
            return { statusCode: 409, headers, body: JSON.stringify({ success: false, message: 'Este nome de usuário já está em uso.' }) };
        }
        const queryParts = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(fieldsToUpdate)) {
            queryParts.push(`${key} = $${paramIndex++}`);
            values.push(value);
        }
        values.push(userId);
        const updateQuery = `UPDATE users SET ${queryParts.join(', ')} WHERE id = $${paramIndex} RETURNING id;`;
        const result = await client.query(updateQuery, values);
        client.release();
        if (result.rowCount === 0) {
            throw new Error('Usuário não encontrado para atualização.');
        }
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Perfil atualizado com sucesso! Bem-vindo(a) ao JUPTI!' }) };

    } catch (error) {
        console.error('Erro detalhado ao completar perfil:', error);
        return { statusCode: error.message.includes('Token') ? 401 : 500, headers, body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` }) };
    }
};
