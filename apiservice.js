/**
 * =================================================================
 * 🔗 JUPTI - Serviço de API (apiService.js) - VERSÃO ATUALIZADA
 * =================================================================
 * Descrição:
 * - Centraliza todas as chamadas para o backend (Netlify Functions).
 * - Gerencia a autenticação (envio de token).
 * - Padroniza o tratamento de erros, como token expirado.
 * - ✅ NOVO: Exporta a função 'getProfileData' para ser usada em outras telas.
 * - ✅ NOVO: Inclui função para buscar o feed principal paginado ('getFeed').
 * - ✅ NOVO: Inclui funções de moderação e interação (denunciar, bloquear, etc.).
 * =================================================================
 */

// 1. URL BASE PARA AS FUNÇÕES NETLIFY
const BASE_URL = '/api';

// 2. FUNÇÃO 'REQUEST' GENÉRICA E CENTRAL (A base de tudo)
/**
 * Função genérica para fazer requisições à API.
 * @param {string} endpoint - O nome da função Netlify (ex: 'get-profile-data').
 * @param {object} options - Opções do fetch (method, body, etc.).
 * @returns {Promise<object>} - O resultado da API em formato JSON.
 */
async function request(endpoint, options = {}) {
    const token = localStorage.getItem('authTokenJUPTI');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Adiciona o token de autorização em todas as requisições autenticadas, se ele existir
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`, config);
        
        // Tenta parsear o JSON, mas se a resposta for vazia, retorna um objeto de sucesso padrão
        const text = await response.text();
        const data = text ? JSON.parse(text) : { success: true };

        if (!response.ok) {
            // Tratamento especial para sessão expirada
            if (response.status === 401) {
                alert('Sua sessão expirou. Por favor, faça o login novamente.');
                localStorage.removeItem('authTokenJUPTI');
                window.location.href = 'index.html';
                throw new Error('Sessão expirada'); 
            }
            // Lança um erro com a mensagem do backend ou um erro padrão
            throw new Error(data.message || `Erro ${response.status}`);
        }

        return data;

    } catch (error) {
        console.error(`Erro na requisição para ${endpoint}:`, error.message);
        throw error; // Re-lança o erro para que a função que chamou possa tratá-lo
    }
}


// =================================================================
// 🚀 FUNÇÕES EXPORTADAS (Todas as funções que o app vai usar)
// =================================================================

// --- PERFIL E USUÁRIO ---

// ✅✅✅ ESTA É A ÚNICA LINHA MODIFICADA: Adicionamos "export" ✅✅✅
export const getProfileData = () => {
    return request('get-profile-data', { method: 'GET' });
};

export const getPublicProfileData = (userId) => {
    return request(`get-public-profile-data?id=${userId}`, { method: 'GET' });
};

export const updateProfile = (profileData) => {
    return request('update-profile', { 
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
};

export const getUserStats = () => {
    return request('get-user-stats', { method: 'GET' });
};

// --- POSTS ---

/**
 * ✅ NOVA FUNÇÃO PARA O FEED PRINCIPAL PAGINADO
 * Busca os posts para o feed do usuário logado, com paginação.
 * @param {number} page - O número da página a ser buscada.
 * @param {number} limit - A quantidade de posts por página.
 * @returns {Promise<object>} - O resultado da API com os posts.
 */
export const getFeed = (page = 1, limit = 10) => {
    return request(`get-feed?page=${page}&limit=${limit}`, { method: 'GET' });
};


export const getUserPosts = (userId) => {
    const endpoint = userId ? `get-user-posts?id=${userId}` : 'get-user-posts';
    return request(endpoint, { method: 'GET' });
};

export const getPosts = () => {
    return request('get-posts', { method: 'GET' });
};

export const createPost = (postData) => {
    return request('create-post', { 
        method: 'POST',
        body: JSON.stringify(postData)
    });
};

export const editPost = (postId, caption) => {
    return request('edit-post', {
        method: 'PUT',
        body: JSON.stringify({ post_id: postId, caption })
    });
};

export const deletePost = (postId) => {
    return request('delete-post', {
        method: 'DELETE',
        body: JSON.stringify({ post_id: postId })
    });
};

// --- INTERAÇÕES COM POSTS (Likes, Comentários, etc.) ---

export const toggleLike = (postId) => {
    return request('toggle-like', { 
        method: 'POST',
        body: JSON.stringify({ post_id: postId })
    });
};

export const addComment = (postId, content) => {
    return request('add-comment', { 
        method: 'POST',
        body: JSON.stringify({ post_id: postId, content: content })
    });
};

export const getComments = (postId) => {
    return request(`get-comments?post_id=${postId}`, { method: 'GET' });
};

export const addShare = (postId, shareType = 'link') => {
    return request('add-share', { 
        method: 'POST',
        body: JSON.stringify({ post_id: postId, share_type: shareType })
    });
};

export const toggleFavorite = (postId) => {
    return request('toggle-favorite', { 
        method: 'POST',
        body: JSON.stringify({ post_id: postId })
    });
};

export const getFavoritePosts = () => {
    return request('get-favorite-posts', { method: 'GET' });
};

// --- FOLLOWERS (SEGUIDORES) ---

export const toggleFollow = (followingId) => {
    return request('toggle-follow', { 
        method: 'POST',
        body: JSON.stringify({ following_id: followingId })
    });
};

export const checkFollowStatus = (followingId) => {
    return request(`check-follow-status?following_id=${followingId}`, { method: 'GET' });
};

export const getFollowers = () => {
    return request('get-followers', { method: 'GET' });
};

export const getFollowing = () => {
    return request('get-following', { method: 'GET' });
};

export const removeFollower = (followerId) => {
    return request('remove-follower', { 
        method: 'DELETE',
        body: JSON.stringify({ follower_id: followerId })
    });
};

// --- UPLOAD DE MÍDIA ---

export const uploadImageToCloudinary = async (file, folder = 'jupti/media') => {
    try {
        // 1. Pede a assinatura para o nosso backend
        const signatureData = await request('generate-upload-signature', { 
            method: 'POST',
            body: JSON.stringify({ folder: folder })
        });
        
        if (!signatureData.success) {
            throw new Error('Falha ao obter assinatura de upload do nosso servidor.');
        }

        // 2. Monta o FormData para enviar ao Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', signatureData.api_key);
        formData.append('timestamp', signatureData.timestamp);
        formData.append('signature', signatureData.signature);
        formData.append('folder', folder);

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/auto/upload`;
        
        // 3. Envia o arquivo diretamente para o Cloudinary
        const uploadResponse = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error(`Falha no upload para o Cloudinary: ${errorData.error?.message || uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        
        // 4. Retorna a URL segura da imagem
        return uploadResult.secure_url;

    } catch (error) {
        console.error('❌ Erro no serviço uploadImageToCloudinary:', error);
        throw error;
    }
};

// --- SEÇÃO DE NOTIFICAÇÕES ---

export const getNotifications = () => {
    return request('get-notifications', { method: 'GET' });
};

export const markNotificationsAsRead = () => {
    return request('mark-notifications-as-read', { method: 'POST' });
};


// --- SEÇÃO DE PESQUISA ---

export const searchUsers = (term) => {
    const encodedTerm = encodeURIComponent(term);
    return request(`search-users?term=${encodedTerm}`, { method: 'GET' });
};


// =================================================================
// ✨ NOVA SEÇÃO DE MODERAÇÃO E INTERAÇÃO ✨
// =================================================================

/**
 * Envia uma denúncia sobre um post para o backend.
 * @param {number} postId - O ID do post que está sendo denunciado.
 * @param {string} reason - O motivo da denúncia (ex: 'spam').
 * @param {string} [details] - Detalhes adicionais (opcional).
 * @returns {Promise<object>} - O resultado da operação.
 */
export const reportPost = (postId, reason, details) => {
    return request('report-post', { 
        method: 'POST',
        body: JSON.stringify({ postId, reason, details })
    });
};

/**
 * Envia um comando para bloquear um usuário.
 * @param {number|string} blockedId - O ID do usuário a ser bloqueado.
 * @returns {Promise<object>}
 */
export const blockUser = (blockedId) => {
    return request('block-user', {
        method: 'POST',
        body: JSON.stringify({ blockedId })
    });
};

/**
 * Registra o interesse de um usuário em um post.
 * @param {number} postId - O ID do post.
 * @returns {Promise<object>}
 */
export const addInterest = (postId) => {
    return request('add-interest', {
        method: 'POST',
        body: JSON.stringify({ postId })
    });
};


// =================================================================
// 👶 SEÇÃO DE PERFIS DE FILHOS
// =================================================================

/**
 * Cria um novo perfil de filho vinculado ao usuário autenticado.
 * @param {object} childData - Dados do perfil do filho.
 * @param {string} childData.nomeCompleto - Nome completo da criança.
 * @param {string} childData.dataNascimento - Data de nascimento (formato YYYY-MM-DD).
 * @param {string} childData.cidadeNascimento - Cidade de nascimento.
 * @param {string} childData.estadoNascimento - Estado de nascimento (sigla).
 * @param {string} [childData.profilePictureUrl] - URL da foto de perfil (opcional).
 * @param {string} [childData.cpf] - CPF da criança (opcional).
 * @param {string} [childData.certidaoNascimento] - Número da certidão de nascimento (opcional).
 * @returns {Promise<object>} - O resultado da operação com os dados do perfil criado.
 */
export const createChildProfile = (childData) => {
    return request('create-child-profile', { 
        method: 'POST',
        body: JSON.stringify(childData)
    });
};

/**
 * Busca todos os perfis de filhos vinculados ao usuário autenticado.
 * @returns {Promise<object>} - O resultado da operação com a lista de filhos.
 */
export const getChildrenProfiles = () => {
    return request('get-children-profiles', { method: 'GET' });
};

// Adicione esta função ao final do seu arquivo apiService.js

/**
 * Envia a resposta (aceite ou recusa) para um pedido de conexão.
 * @param {string} notificationId - O ID da notificação do pedido.
 * @param {'ACCEPTED' | 'DECLINED'} response - A decisão do usuário.
 * @returns {Promise<object>} - O resultado da operação.
 */
export const respondToConnectionRequest = (notificationId, response) => {
    return request('respond-to-connection', {
        method: 'POST',
        body: JSON.stringify({ notificationId, response })
    });
};

// =================================================================
// 🤝 SEÇÃO DE COMPROMISSOS E NEGOCIAÇÕES
// =================================================================

/**
 * Envia a resposta (aceitação ou contraproposta) para um compromisso existente.
 * @param {string} commitmentId - O ID do compromisso que está sendo respondido.
 * @param {object} responses - Um objeto contendo as decisões do usuário para cada item.
 * @returns {Promise<object>} - O resultado da operação.
 */
export const respondToCommitment = (commitmentId, responses) => {
    // O corpo da requisição (body) envia exatamente o que o backend espera:
    // o ID do compromisso e o objeto com as respostas.
    const requestBody = {
        commitmentId: commitmentId,
        responses: responses
    };

    // Chama a função genérica 'request' para o novo endpoint que você criou.
    return request('respond-to-commitment', {
        method: 'POST',
        body: JSON.stringify(requestBody)
    });
};


/**
 * ✅ Busca os posts de um filho específico.
 * @param {string} childId - O ID do filho.
 * @returns {Promise<object>} - O resultado da API.
 */
export const getChildPosts = (childId) => {
    return request(`get-child-posts?child_id=${childId}`, { method: 'GET' });
};
