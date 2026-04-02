/**
 * =================================================================
 * 🧠 GET-NOTIFICATIONS.JS - VERSÃO FINAL CORRIGIDA
 * =================================================================
 * Descrição:
 * - Mantém toda a lógica original de agrupamento e busca de notificações.
 * - ✅ CORREÇÃO 1: A query agora faz um JOIN com a tabela 'children' para buscar
 *   o `child_name` e `child_avatar_url` em TODOS os tipos de notificação que
 *   possuem um `child_id`, incluindo 'PROPOSAL_RECEIVED'.
 * - ✅ CORREÇÃO 2: A query garante que os dados do remetente (`sender_id`),
 *   incluindo seu avatar, sejam sempre buscados corretamente.
 * - O resultado é que a notificação de proposta agora exibirá tanto o nome do filho
 *   quanto a foto de perfil do pai que a enviou, resolvendo os dois problemas
 *   identificados na imagem.
 * =================================================================
 */

// --- 1. IMPORTAÇÕES E FUNÇÕES AUXILIARES (sem alterações) ---
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

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

const timeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    if (seconds < 60) return 'agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
};

// --- 2. HANDLER PRINCIPAL (LÓGICA DA QUERY ATUALIZADA) ---
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        const decodedToken = authenticateToken(event.headers);
        const recipientId = decodedToken.userId;
        client = await pool.connect();

        // ✅✅✅ INÍCIO DA CORREÇÃO NA QUERY ✅✅✅
        // A query foi reestruturada para garantir que os dados do filho e do remetente
        // sejam sempre buscados corretamente, especialmente para PROPOSAL_RECEIVED.
        const notificationsQuery = `
            WITH RankedNotifications AS (
                SELECT
                    n.id,
                    n.type,
                    n.post_id,
                    n.child_id,
                    n.related_entity_id,
                    n.is_read,
                    n.created_at,
                    p.media_url AS post_preview_url,
                    -- Junta com 'users' para pegar os dados do REMETENTE (sender)
                    jsonb_build_object(
                        'userId', s.id,
                        'username', s.username,
                        'avatarUrl', s.profile_picture_url
                    ) AS actor,
                    -- Junta com 'children' para pegar os dados do FILHO
                    c.full_name AS child_name,
                    c.profile_picture_url AS child_avatar_url,
                    -- Numera as notificações dentro de cada grupo para pegar a mais recente
                    ROW_NUMBER() OVER(
                        PARTITION BY
                            CASE
                                WHEN n.type IN ('CONNECTION_REQUEST', 'PROPOSAL_RECEIVED') THEN n.id::text
                                ELSE n.type || n.post_id::text
                            END
                        ORDER BY n.created_at DESC
                    ) as rn
                FROM notifications n
                JOIN users s ON n.sender_id = s.id
                LEFT JOIN posts p ON n.post_id = p.id
                LEFT JOIN children c ON n.child_id = c.id -- LEFT JOIN para não quebrar se não houver child_id
                LEFT JOIN blocks b ON n.sender_id = b.blocked_id AND b.blocker_id = $1
                WHERE n.recipient_id = $1 AND b.blocker_id IS NULL
            )
            SELECT
                -- Agrupa por um identificador único (ID da notificação para tipos individuais, tipo+post para agrupáveis)
                (array_agg(id ORDER BY rn))[1] as id,
                type,
                post_id,
                child_id,
                (array_agg(related_entity_id ORDER BY rn))[1] as related_entity_id,
                MAX(created_at) as latest_created_at,
                BOOL_OR(NOT is_read) as is_unread,
                MAX(post_preview_url) as post_preview_url,
                MAX(child_name) as child_name,
                MAX(child_avatar_url) as child_avatar_url,
                jsonb_agg(actor ORDER BY rn) as actors
            FROM RankedNotifications
            GROUP BY
                type,
                post_id,
                child_id,
                -- Garante que tipos individuais não sejam agrupados
                CASE
                    WHEN type IN ('CONNECTION_REQUEST', 'PROPOSAL_RECEIVED') THEN id::text
                    ELSE type || post_id::text
                END;
        `;
        // ✅✅✅ FIM DA CORREÇÃO NA QUERY ✅✅✅

        const result = await client.query(notificationsQuery, [recipientId]);

        const allNotifications = result.rows.map(row => {
            const allActors = row.actors;
            return {
                id: row.id,
                type: row.type,
                postId: row.post_id,
                childId: row.child_id,
                related_entity_id: row.related_entity_id,
                childName: row.child_name,
                childAvatarUrl: row.child_avatar_url,
                isUnread: row.is_unread,
                time: timeAgo(row.latest_created_at),
                latest_created_at: row.latest_created_at,
                postPreviewUrl: row.post_preview_url,
                mainActor: allActors[0],
                otherActors: allActors.slice(1),
                otherActorsCount: allActors.length - 1
            };
        });

        allNotifications.sort((a, b) => new Date(b.latest_created_at) - new Date(a.latest_created_at));

        const unreadCountQuery = 'SELECT COUNT(*) FROM notifications n LEFT JOIN blocks b ON n.sender_id = b.blocked_id AND b.blocker_id = $1 WHERE n.recipient_id = $1 AND n.is_read = FALSE AND b.blocker_id IS NULL';
        const unreadCountResult = await client.query(unreadCountQuery, [recipientId]);
        const totalUnread = parseInt(unreadCountResult.rows[0].count, 10);

        client.release();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                groupedNotifications: allNotifications,
                totalUnreadCount: totalUnread
            })
        };

    } catch (error) {
        console.error('❌ Erro fatal ao buscar notificações:', error);
        if (client) client.release();
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};
