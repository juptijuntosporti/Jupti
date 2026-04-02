/**
 * =================================================================
 * 🗑️ JUPTI - API para Excluir Post (delete-post.js) - VERSÃO CORRIGIDA
 * =================================================================
 * Descrição:
 * - Exclui um post do banco de dados e o arquivo de mídia associado do Cloudinary.
 * - Lógica refinada para garantir a exclusão da mídia antes da exclusão do registro no DB.
 * =================================================================
 */

// --- 1. IMPORTAÇÕES ---
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;

// Configura o Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- 2. FUNÇÃO DE AUTENTICAÇÃO (sem alterações) ---
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

// --- 3. FUNÇÃO AUXILIAR PARA EXTRAIR PUBLIC_ID (sem alterações) ---
const getPublicIdFromUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;
        const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/');
        const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
        return publicId;
    } catch (error) {
        console.error("Erro ao extrair public_id da URL:", url, error);
        return null;
    }
};

// --- 4. HANDLER PRINCIPAL DA FUNÇÃO ---
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };
    if (event.httpMethod !== 'DELETE') return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        // Etapa 1: Autenticar e obter dados da requisição
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;
        const { post_id } = JSON.parse(event.body);
        const postIdInt = parseInt(post_id, 10);

        if (isNaN(postIdInt)) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post inválido.' }) };
        }

        client = await pool.connect();

        // ✅ ETAPA 2: BUSCAR O POST, SUA URL DE MÍDIA E VERIFICAR A PROPRIEDADE
        const checkQuery = 'SELECT user_id, media_url FROM posts WHERE id = $1';
        const checkResult = await client.query(checkQuery, [postIdInt]);

        if (checkResult.rows.length === 0) {
            client.release();
            return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Post não encontrado.' }) };
        }

        const post = checkResult.rows[0];
        if (post.user_id !== userId) {
            client.release();
            return { statusCode: 403, headers, body: JSON.stringify({ success: false, message: 'Você não tem permissão para excluir este post.' }) };
        }

        // ✅ ETAPA 3: EXCLUIR O ARQUIVO DO CLOUDINARY PRIMEIRO (SE EXISTIR)
        if (post.media_url) {
            const publicId = getPublicIdFromUrl(post.media_url);
            if (publicId) {
                console.log(`🗑️ Tentando excluir mídia do Cloudinary: ${publicId}`);
                try {
                    // Usamos 'await' para garantir que esperamos a resposta do Cloudinary
                    await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
                    console.log('✅ Mídia excluída do Cloudinary com sucesso.');
                } catch (cloudinaryError) {
                    // Mesmo que falhe, logamos o erro mas continuamos para apagar o post do DB
                    console.error('⚠️ Erro ao excluir mídia do Cloudinary (o post ainda será excluído do banco):', cloudinaryError);
                }
            }
        }

        // ✅ ETAPA 4: AGORA, EXCLUIR O POST E SEUS DADOS RELACIONADOS DO BANCO DE DADOS
        console.log(`🗑️ Excluindo post ${postIdInt} e dados relacionados do banco de dados...`);
        await client.query('BEGIN');
        await client.query('DELETE FROM likes WHERE post_id = $1', [postIdInt]);
        await client.query('DELETE FROM comments WHERE post_id = $1', [postIdInt]);
        await client.query('DELETE FROM shares WHERE post_id = $1', [postIdInt]);
        await client.query('DELETE FROM favorites WHERE post_id = $1', [postIdInt]);
        await client.query('DELETE FROM posts WHERE id = $1', [postIdInt]);
        await client.query('COMMIT');
        
        console.log(`✅ Post ${postIdInt} excluído do banco de dados.`);

        // Etapa 5: Retornar sucesso
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Post excluído com sucesso!'
            })
        };

    } catch (error) {
        console.error('❌ Erro geral ao excluir post:', error);
        if (client) {
            await client.query('ROLLBACK').catch(console.error);
        }
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
