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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        // 1. Autenticar o usuário
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        // 2. Obter o ID do post
        const data = JSON.parse(event.body);
        const { post_id } = data;

        console.log('📋 Toggle Favorite - Dados recebidos:', { userId, post_id, post_id_type: typeof post_id });

        if (!post_id) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post não fornecido.' }) };
        }

        // Converte post_id para inteiro se vier como string
        const postIdInt = parseInt(post_id);
        
        if (isNaN(postIdInt)) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post inválido.' }) };
        }

        client = await pool.connect();

        // 3. Verificar se o usuário já favoritou o post (SEM usar coluna id)
        const checkQuery = 'SELECT user_id, post_id FROM favorites WHERE user_id = $1 AND post_id = $2';
        console.log('🔍 Verificando favorito existente:', { userId, postIdInt });
        const checkResult = await client.query(checkQuery, [userId, postIdInt]);

        let favorited = false;

        if (checkResult.rows.length > 0) {
            // Usuário já favoritou, então remove dos favoritos
            const deleteQuery = 'DELETE FROM favorites WHERE user_id = $1 AND post_id = $2';
            console.log('🗑️ Removendo favorito:', { userId, postIdInt });
            await client.query(deleteQuery, [userId, postIdInt]);
            favorited = false;
        } else {
            // Usuário não favoritou ainda, então adiciona aos favoritos
            const insertQuery = 'INSERT INTO favorites (user_id, post_id) VALUES ($1, $2)';
            console.log('➕ Adicionando favorito:', { userId, postIdInt });
            await client.query(insertQuery, [userId, postIdInt]);
            favorited = true;
        }

        client.release();

        console.log('✅ Favorito processado com sucesso:', { favorited });

        // 4. Retornar sucesso
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                favorited: favorited,
                message: favorited ? 'Post adicionado aos favoritos!' : 'Post removido dos favoritos.'
            })
        };

    } catch (error) {
        console.error('❌ Erro ao processar favorito:', error);
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

