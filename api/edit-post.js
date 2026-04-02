const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Função de autenticação
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

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    if (event.httpMethod !== 'PUT') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        // 1. Autenticar o usuário
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        // 2. Obter os dados do post
        const data = JSON.parse(event.body);
        const { post_id, caption } = data;

        console.log('✏️ Edit Post - Dados recebidos:', { userId, post_id, caption_length: caption?.length });

        if (!post_id || !caption) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post e legenda são obrigatórios.' }) };
        }

        // Converte post_id para inteiro
        const postIdInt = parseInt(post_id);
        
        if (isNaN(postIdInt)) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post inválido.' }) };
        }

        client = await pool.connect();

        // 3. Verificar se o post pertence ao usuário
        const checkQuery = 'SELECT user_id FROM posts WHERE id = $1';
        const checkResult = await client.query(checkQuery, [postIdInt]);

        if (checkResult.rows.length === 0) {
            client.release();
            return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Post não encontrado.' }) };
        }

        if (checkResult.rows[0].user_id !== userId) {
            client.release();
            return { statusCode: 403, headers, body: JSON.stringify({ success: false, message: 'Você não tem permissão para editar este post.' }) };
        }

        // 4. Atualizar o post
        const updateQuery = 'UPDATE posts SET caption = $1 WHERE id = $2 RETURNING id, caption, created_at';
        console.log('🔄 Atualizando post:', { postIdInt, caption });
        const updateResult = await client.query(updateQuery, [caption.trim(), postIdInt]);

        client.release();

        console.log('✅ Post atualizado com sucesso:', { post_id: updateResult.rows[0].id });

        // 5. Retornar sucesso
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Post atualizado com sucesso!',
                post: updateResult.rows[0]
            })
        };

    } catch (error) {
        console.error('❌ Erro ao editar post:', error);
        console.error('Stack trace:', error.stack);
        
        if (client) {
            client.release();
        }
        
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};

