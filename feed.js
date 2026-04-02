/**
 * ======================================================
 * 📄 FEED.JS - VERSÃO COMPLETA E CORRIGIDA
 * ======================================================
 * - ✅ CORREÇÃO: Lógica para exibir a foto de perfil ou a
 *   inicial do nome do usuário no cabeçalho.
 * - Mantém todas as outras funcionalidades:
 *   - Carregamento paginado do feed.
 *   - Abertura e lógica do modal de pesquisa de usuários.
 *   - Abertura do modal de criação de post.
 *   - Ocultação de posts marcados como "Não quero mais ver".
 *   - Integração com os módulos de Notificações e Ações de Modal.
 * ======================================================
 */

// --- 1. IMPORTAÇÕES ---
import { getProfileData, getFeed, searchUsers } from './apiService.js';
import { createPostHtml, initPostInteractions } from './Global.js';
import { initNotifications } from './notifications.js';
import { initModalActionHandlers } from './modalHandlers.js';

// --- 2. VARIÁVEIS DE ESTADO DO MÓDULO ---
let debounceTimer;
let currentPage = 1;
let isLoading = false;
const postsPerPage = 10;

// --- 3. FUNÇÕES DA PÁGINA ---

/**
 * Esconde posts previamente marcados como "Não quero mais ver".
 */
function hidePostsFromLocalStorage() {
    const hiddenPosts = JSON.parse(localStorage.getItem('hiddenPostsJUPTI')) || [];
    if (hiddenPosts.length === 0) return;

    hiddenPosts.forEach(postId => {
        const postElement = document.querySelector(`.glb-post[data-id='${postId}']`);
        if (postElement) {
            postElement.style.display = 'none';
        }
    });
    console.log(`${hiddenPosts.length} post(s) ocultos foram escondidos do feed.`);
}

/**
 * Carrega os posts da API e os renderiza na tela.
 */
async function loadPosts(page = 1) {
    if (isLoading) return;
    isLoading = true;

    const postsContainer = document.getElementById('postsContainer');
    const loadingIndicator = document.getElementById('glb-loadingIndicator');
    
    if (page === 1) {
        postsContainer.innerHTML = '<div class="glb-loading-indicator">Carregando feed...</div>';
    } else {
        loadingIndicator.style.display = 'block';
    }

    try {
        const result = await getFeed(page, postsPerPage);
        
        if (page === 1) {
            postsContainer.innerHTML = '';
        }

        if (result.success && result.posts.length > 0) {
            result.posts.forEach(post => {
                // 🚫 BLOQUEIA POSTS DE FILHO NO FEED
    if (post.child_id) {
        return;
    }
                const postData = {
                    ...post,
                    id: post.id.toString(),
                    author: post.author || 'Usuário',
                    authorAvatar: post.authorAvatar || 'icone.png',
                    time: timeAgo(post.created_at)
                };
                postsContainer.insertAdjacentHTML('beforeend', createPostHtml(postData));
            });
            currentPage = page;
        } else if (page === 1) {
            postsContainer.innerHTML = '<div class="glb-loading-indicator">Nenhum post encontrado. Seja o primeiro a publicar!</div>';
        } else {
            console.log('Fim dos posts.');
        }

        hidePostsFromLocalStorage();

    } catch (error) {
        console.error("Erro ao carregar posts:", error);
        if (page === 1) {
            postsContainer.innerHTML = '<div class="glb-loading-indicator" style="color: red;">Erro ao carregar o feed.</div>';
        }
    } finally {
        isLoading = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

/**
 * Configura todos os event listeners da página.
 */
function setupEvents() {
    document.getElementById('userProfileIcon')?.addEventListener('click', () => window.location.href = 'perfil.html');

    const createPostModal = document.getElementById('glb-createPostModal');
    document.getElementById('addPostBtn')?.addEventListener('click', () => {
        createPostModal?.classList.add('active');
        document.body.classList.add('no-scroll');
    });
    document.getElementById('cancelCreatePost')?.addEventListener('click', () => {
        createPostModal?.classList.remove('active');
        document.body.classList.remove('no-scroll');
    });
    createPostModal?.addEventListener('click', (e) => {
        if (e.target.id === 'glb-createPostModal') {
            createPostModal.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }
    });
    document.getElementById('createTextPost')?.addEventListener('click', () => {
        sessionStorage.setItem('postType', 'text');
        window.location.href = 'editar_post.html';
    });
    document.getElementById('createPhotoPost')?.addEventListener('click', () => {
        sessionStorage.setItem('postType', 'photo');
        window.location.href = 'camera.html';
    });
    document.getElementById('createVideoPost')?.addEventListener('click', () => {
        sessionStorage.setItem('postType', 'video');
        window.location.href = 'camera.html';
    });

    // Lógica do modal de pesquisa
    const searchModal = document.getElementById('searchModal');
    const searchInput = document.getElementById('searchInput');
    const searchCancelBtn = document.getElementById('searchCancelBtn');
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const searchInputContainer = document.querySelector('.glb-search-input-container');

    function showInitialSearchState() {
        if (searchResultsContainer) {
            searchResultsContainer.innerHTML = `
                <div class="glb-search-initial-state">
                    <i class="fas fa-search"></i>
                    <p>Encontre pais, mães e profissionais na comunidade JUPTI.</p>
                </div>
            `;
        }
    }

    document.getElementById('searchBtn')?.addEventListener('click', () => {
        searchModal?.classList.add('active');
        document.body.classList.add('no-scroll');
        searchInput?.focus();
        showInitialSearchState();
    });

    searchCancelBtn?.addEventListener('click', () => {
        searchModal?.classList.remove('active');
        document.body.classList.remove('no-scroll');
        searchInput.value = '';
        if (searchResultsContainer) searchResultsContainer.innerHTML = '';
    });
    
    searchInputContainer?.addEventListener('click', () => searchInput?.focus());

    searchInput?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const searchTerm = searchInput.value.trim();
        if (!searchResultsContainer) return;
        if (searchTerm === '') {
            showInitialSearchState();
            return;
        }
        searchResultsContainer.innerHTML = '<div class="glb-loading-indicator">Buscando...</div>';
        debounceTimer = setTimeout(async () => {
            try {
                const result = await searchUsers(searchTerm);
                renderSearchResults(result.users, searchResultsContainer);
            } catch (error) {
                searchResultsContainer.innerHTML = '<div class="glb-loading-indicator" style="color: red;">Erro ao buscar.</div>';
                console.error("Erro na busca:", error);
            }
        }, 300);
    });

    // Inicializa as interações de post (curtir, compartilhar, etc.)
    initPostInteractions();
}

/**
 * Renderiza os resultados da busca de usuários.
 */
function renderSearchResults(users, container) {
    container.innerHTML = '';
    if (!users || users.length === 0) {
        container.innerHTML = '<div class="glb-loading-indicator">Nenhum usuário encontrado.</div>';
        return;
    }
    container.innerHTML = users.map(user => {
        const profileType = user.profile_type ? user.profile_type.replace(/_/g, ' ') : 'Membro';
        return `
            <div class="interaction-user-item" data-user-id="${user.id}">
                <div class="interaction-user-avatar">
                    <img src="${user.profile_picture_url || 'icone.png'}" alt="Avatar de ${user.username}">
                </div>
                <div class="interaction-user-info">
                    <div class="interaction-user-name">${user.username}</div>
                    <div class="interaction-user-role">${profileType}</div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Função principal que inicializa a página do feed.
 */
async function initPage() {
    // Configura todos os eventos da página (cliques em botões, etc.)
    setupEvents();
    initNotifications();
    initModalActionHandlers();

    // --- INÍCIO DA LÓGICA DO AVATAR (A PARTE CORRIGIDA) ---
    try {
        // Busca os dados do usuário logado
        const result = await getProfileData();

        // Seleciona os elementos do avatar no cabeçalho e no modal de comentários
        const headerAvatarContainer = document.getElementById('userProfileIcon');
        const commentAvatarImg = document.getElementById('commentsUserAvatar');

        if (result.success && result.user) {
            const user = result.user;
            const avatarUrl = user.profile_picture_url;
            const username = user.username || 'Usuário';

            // Limpa o conteúdo do avatar no cabeçalho antes de adicionar o novo
            if (headerAvatarContainer) {
                headerAvatarContainer.innerHTML = ''; 
            }

            // 1. Lógica para o AVATAR NO CABEÇALHO
            if (avatarUrl && avatarUrl !== 'icone.png') {
                // Se tem uma URL de foto válida, cria a tag <img>
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.alt = `Perfil de ${username}`;
                img.id = 'userAvatar'; // Mantém o ID para consistência
                headerAvatarContainer.appendChild(img);
            } else {
                // Se NÃO tem foto, cria a inicial
                const initials = username.charAt(0).toUpperCase();
                const initialsDiv = document.createElement('div');
                initialsDiv.className = 'glb-avatar-initials'; // Usa a classe para estilização
                initialsDiv.textContent = initials;
                headerAvatarContainer.appendChild(initialsDiv);
            }

            // 2. Lógica para o AVATAR NO MODAL DE COMENTÁRIOS
            if (commentAvatarImg) {
                commentAvatarImg.src = avatarUrl || 'icone.png';
            }

        } else {
            // Caso de erro ao buscar perfil, mostra um placeholder
            if (headerAvatarContainer) {
                headerAvatarContainer.innerHTML = '<div class="glb-avatar-initials">?</div>';
            }
        }
    } catch (error) {
        console.error("Falha ao carregar dados do usuário no feed:", error.message);
        // Em caso de erro de rede, também mostra um placeholder
        const headerAvatarContainer = document.getElementById('userProfileIcon');
        if (headerAvatarContainer) {
            headerAvatarContainer.innerHTML = '<div class="glb-avatar-initials">!</div>';
        }
    }
    // --- FIM DA LÓGICA DO AVATAR ---

    // Carrega os posts do feed
    await loadPosts(1);
}


/**
 * Converte uma data para tempo relativo (ex: "2h", "3d").
 */
function timeAgo(dateString) {
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
}

// PONTO DE ENTRADA PRINCIPAL
document.addEventListener('DOMContentLoaded', initPage);
