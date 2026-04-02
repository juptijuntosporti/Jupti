/**
 * ==================================================================
 * JUPTI - PERFIL.JS - VERSÃO COMPLETA E CORRIGIDA
 * ==================================================================
 * Correções aplicadas:
 * 1. Lógica de navegação entre abas foi corrigida para funcionar corretamente.
 * 2. Lógica para exibir os botões "Acompanhar" e "Mensagem" no modo visitante foi restaurada.
 * 3. A chamada de initPostInteractions() foi mantida nos locais corretos (após a renderização de posts).
 * 4. ✅ Adicionada a inicialização do modalHandlers para ativar todas as funções dos modais.
 */

// --- 1. IMPORTAÇÕES ---
import { initPostCreationModal } from './modalHandlers.js'; // Importa a função de inicialização do modal de criação de post (FAB)
import { 
    getProfileData, 
    getPublicProfileData,
    getUserPosts, 
    getFavoritePosts, 
    editPost, 
    deletePost,
    toggleFollow,
    checkFollowStatus
} from './apiService.js';
import { createPostHtml, initPostInteractions } from './Global.js';
import { initModalActionHandlers } from './modalHandlers.js'; // ✅ 1. IMPORTA O "CÉREBRO" DOS MODAIS

document.addEventListener('DOMContentLoaded', function() {

    // --- 2. VARIÁVEIS DE ESTADO ---
    let allFavoritePosts = [];
    let currentFilter = 'all';
    let visitedUserId = null;

    // --- 3. FUNÇÕES DE CARREGAMENTO E RENDERIZAÇÃO ---

    async function inicializarPagina() {
        const urlParams = new URLSearchParams(window.location.search);
        const userIdFromUrl = urlParams.get('id');

        try {
            let profileResult, userPostsResult, favoritePostsResult;

            if (userIdFromUrl) {
                // MODO VISITANTE
                visitedUserId = userIdFromUrl;
                profileResult = await getPublicProfileData(userIdFromUrl);
                if (!profileResult.success) throw new Error(profileResult.message);
                
                preencherPaginaComDados(profileResult.user);
                configurarVisualizacaoVisitante(); // Lógica dos botões está aqui agora

                userPostsResult = await getUserPosts(userIdFromUrl);
                favoritePostsResult = { success: false, posts: [] };

            } else {
                // MODO DONO DO PERFIL
                profileResult = await getProfileData();
                if (!profileResult.success) throw new Error(profileResult.message);
                
                preencherPaginaComDados(profileResult.user);

                [userPostsResult, favoritePostsResult] = await Promise.all([
                    getUserPosts(),
                    getFavoritePosts()
                ]);
            }

            atualizarContadores(userPostsResult, favoritePostsResult);
            renderizarTimeline(userPostsResult);

        } catch (error) {
            alert("Erro ao carregar o perfil: " + error.message);
            window.location.href = 'feed.html';
        }
    }

    function preencherPaginaComDados(user) {
        const profileMap = {
            'pai_separado': 'Pai Separado', 'mae_separada': 'Mãe Separada',
            'pai_junto': 'Pai', 'mae_junta': 'Mãe',
            'advogado': 'Advogado(a)', 'psicologo': 'Psicólogo(a)', 'juiz': 'Juiz(a)'
        };
        const userRole = profileMap[user.profile_type] || user.profile_type || "Perfil";
        
        const roleElement = document.getElementById('profileUserRole');
        if (roleElement) {
            const profileTypeString = (user.profile_type_visible === false) ? 'Perfil Oculto' : userRole;
            const locationString = (user.location_visible === false) ? 'Localização Oculta' : `${user.city || 'Cidade'}, ${user.state || 'UF'}`;
            roleElement.textContent = `${profileTypeString} • ${locationString}`;
        }
        
        document.getElementById('profileUserName').textContent = user.username || 'Usuário';
        
        const avatar = document.querySelector('.pus-profile-avatar');
        if (avatar) {
            if (user.profile_picture_url) {
                avatar.innerHTML = `<img src="${user.profile_picture_url}" alt="Foto de perfil de ${user.username}">`;
            } else {
                avatar.innerHTML = '';
                avatar.textContent = user.username ? user.username.charAt(0).toUpperCase() : 'U';
            }
        }
        
        const bioText = document.querySelector('.pus-bio-text');
        if (bioText) bioText.textContent = user.bio || 'Nenhuma biografia adicionada ainda.';
        
        const coverElement = document.querySelector('.pus-profile-cover');
        if (coverElement) {
            coverElement.style.backgroundImage = user.cover_picture_url ? `url('${user.cover_picture_url}')` : '';
        }
        
        ajustarCorDoNomeNaCapa();
    }
    
    async function configurarVisualizacaoVisitante() {
        document.getElementById('profileSettingsIcon')?.remove();
        document.getElementById('fabButton')?.remove();
        document.querySelector('.pus-tab-item[data-tab="favorites"]')?.remove();
        document.querySelector('.pus-stat-item:nth-child(2)')?.remove();

        const actionButtonsContainer = document.getElementById('profileActionButtons');
        if (actionButtonsContainer) {
            actionButtonsContainer.style.display = 'flex';
        }

        await loadFollowStatus();

        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
            followBtn.addEventListener('click', handleFollowClick);
        }

        const messageBtn = document.getElementById('messageBtn');
        if (messageBtn) {
            messageBtn.addEventListener('click', () => {
                alert('Funcionalidade de Mensagem será implementada em breve!');
            });
        }
    }
    
    async function loadFollowStatus() {
        if (!visitedUserId) return;
        
        try {
            const result = await checkFollowStatus(visitedUserId);
            if (result.success) {
                updateFollowButton(result.isFollowing);
            }
        } catch (error) {
            console.error('Erro ao carregar status de follow:', error);
        }
    }

    function updateFollowButton(isFollowing) {
        const followBtn = document.getElementById('followBtn');
        if (!followBtn) return;
        
        const followBtnText = followBtn.querySelector('span');
        const followBtnIcon = followBtn.querySelector('i');
        
        if (isFollowing) {
            followBtn.classList.add('active');
            followBtnText.textContent = 'Acompanhando';
            followBtnIcon.className = 'fas fa-user-check';
        } else {
            followBtn.classList.remove('active');
            followBtnText.textContent = 'Acompanhar';
            followBtnIcon.className = 'fas fa-hand-holding-heart';
        }
    }

    async function handleFollowClick() {
        if (!visitedUserId) return;
        
        const followBtn = document.getElementById('followBtn');
        const followBtnText = followBtn.querySelector('span');
        
        followBtn.disabled = true;
        const originalText = followBtnText.textContent;
        followBtnText.textContent = 'Processando...';
        
        try {
            const result = await toggleFollow(visitedUserId);
            if (result.success) {
                updateFollowButton(result.isFollowing);
            } else {
                throw new Error(result.message || 'Erro ao processar ação');
            }
        } catch (error) {
            console.error('Erro ao alternar follow:', error);
            alert('Erro ao processar sua solicitação. Tente novamente.');
            followBtnText.textContent = originalText;
        } finally {
            followBtn.disabled = false;
        }
    }

    function atualizarContadores(userPostsResult, favoritePostsResult) {
        const postCount = userPostsResult?.posts?.length || 0;
        const favoriteCount = favoritePostsResult?.posts?.length || 0;
        
        const postStatElement = document.querySelector('.pus-stat-item:nth-child(1) .pus-stat-number');
        if (postStatElement) postStatElement.textContent = postCount;
        
        const favStatElement = document.querySelector('.pus-stat-item:nth-child(2) .pus-stat-number');
        if (favStatElement) favStatElement.textContent = favoriteCount;
        
        const momentStatElement = document.querySelector('.pus-stat-item:nth-child(3) .pus-stat-number');
        if (momentStatElement) momentStatElement.textContent = 0;
    }
    
    function ajustarCorDoNomeNaCapa() {
        const nomeUsuarioElemento = document.getElementById('profileUserName');
        const capaElemento = document.querySelector('.pus-profile-cover');
        if (!nomeUsuarioElemento || !capaElemento) return;
        nomeUsuarioElemento.classList.add('texto-claro');
        const estiloCapa = window.getComputedStyle(capaElemento);
        const urlImagem = estiloCapa.backgroundImage.slice(5, -2);
        if (!urlImagem || urlImagem.startsWith('data:image/svg+xml')) return;
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = urlImagem;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
            const rectNome = nomeUsuarioElemento.getBoundingClientRect();
            const rectCapa = capaElemento.getBoundingClientRect();
            const fatorX = img.width / rectCapa.width;
            const fatorY = img.height / rectCapa.height;
            const areaX = Math.max(0, (rectNome.left - rectCapa.left) * fatorX);
            const areaY = Math.max(0, (rectNome.top - rectCapa.top) * fatorY);
            const areaWidth = Math.min(img.width - areaX, rectNome.width * fatorX);
            const areaHeight = Math.min(img.height - areaY, rectNome.height * fatorY);
            if (areaWidth < 1 || areaHeight < 1) return;
            try {
                const dadosImagem = context.getImageData(areaX, areaY, areaWidth, areaHeight).data;
                let somaLuminancia = 0;
                for (let i = 0; i < dadosImagem.length; i += 4) {
                    somaLuminancia += (0.299 * dadosImagem[i] + 0.587 * dadosImagem[i + 1] + 0.114 * dadosImagem[i + 2]);
                }
                const luminanciaMedia = somaLuminancia / (dadosImagem.length / 4);
                nomeUsuarioElemento.classList.remove('texto-claro', 'texto-escuro');
                nomeUsuarioElemento.classList.add(luminanciaMedia > 128 ? 'texto-escuro' : 'texto-claro');
            } catch (e) {
                console.error("Erro de CORS ou processamento de imagem para ajuste de cor:", e);
                nomeUsuarioElemento.classList.add('texto-claro');
            }
        };
        img.onerror = () => nomeUsuarioElemento.classList.add('texto-claro');
    }

    function renderizarTimeline(result) {
        const container = document.getElementById('timelinePostsContainer');
        if (!container) return;
        if (result && result.success && result.posts.length > 0) {
            container.innerHTML = result.posts.map(post => {
                const postData = { ...post, id: post.id.toString(), time: timeAgo(post.created_at) };
                return createPostHtml(postData);
            }).join('');
        } else {
            const message = visitedUserId ? 'Este usuário ainda não criou nenhum post.' : 'Quando você criar um post, ele aparecerá aqui.';
            container.innerHTML = `<div class="pus-empty-state"><div class="pus-empty-icon"><i class="fas fa-stream"></i></div><div class="pus-empty-title">Nenhum registro criado</div><div class="pus-empty-description">${message}</div></div>`;
        }
        initPostInteractions();
    }

    async function loadAndRenderFavorites() {
        const container = document.getElementById('favoritesGridContainer');
        if (!container) return;
        container.innerHTML = '<div class="fav-loading"><i class="fas fa-spinner fa-spin"></i></div>';
        try {
            const result = await getFavoritePosts();
            allFavoritePosts = (result.success && result.posts) ? result.posts : [];
            renderFavoriteGrid(currentFilter);
        } catch (error) {
            container.innerHTML = `<div class="fav-empty-state"><div class="fav-empty-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="fav-empty-title">Erro ao carregar</div></div>`;
        }
    }

    function renderFavoriteGrid(filter) {
        const container = document.getElementById('favoritesGridContainer');
        if (!container) return;
        if (allFavoritePosts.length === 0) {
            container.innerHTML = `<div class="fav-empty-state"><div class="fav-empty-icon"><i class="fas fa-star"></i></div><div class="fav-empty-title">Nenhum favorito</div><div class="fav-empty-description">Posts que você favoritar aparecerão aqui.</div></div>`;
            return;
        }
        const filteredPosts = (filter === 'all') ? allFavoritePosts : allFavoritePosts.filter(post => {
            return filter === 'registros' ? !post.is_moment : post.is_moment;
        });
        if (filteredPosts.length === 0) {
            const filterName = filter === 'registros' ? 'registros' : 'momentos';
            container.innerHTML = `<div class="fav-empty-state"><div class="fav-empty-icon"><i class="fas fa-star"></i></div><div class="fav-empty-title">Nenhum ${filterName} favorito</div></div>`;
            return;
        }
        container.innerHTML = filteredPosts.map(createGridItem).join('');
        document.querySelectorAll('.fav-grid-item').forEach(item => {
            item.addEventListener('click', function() {
                const post = allFavoritePosts.find(p => p.id.toString() === this.dataset.postId);
                if (post) openFavoriteModal(post);
            });
        });
    }

    function createGridItem(post) {
        const hasMedia = post.media && post.media_type;
        const postType = post.is_moment ? 'Momento' : 'Registro';
        const content = hasMedia ? `<img src="${post.media}" alt="Post">` : `<div class="fav-grid-item-text">${post.text.substring(0, 100)}...</div>`;
        return `
            <div class="fav-grid-item" data-post-id="${post.id}">
                <div class="fav-grid-badge">${postType}</div>
                <div class="fav-grid-item-content">${content}</div>
                <div class="fav-grid-overlay">
                    <div class="fav-grid-stat"><i class="fas fa-star"></i><span>${post.likes || 0}</span></div>
                    <div class="fav-grid-stat"><i class="fas fa-comment"></i><span>${post.comments || 0}</span></div>
                </div>
            </div>`;
    }

    function timeAgo(dateString) {
        if (!dateString) return '';
        const seconds = Math.round((new Date() - new Date(dateString)) / 1000);
        const minutes = Math.round(seconds / 60);
        const hours = Math.round(minutes / 60);
        const days = Math.round(hours / 24);
        if (seconds < 60) return `${seconds}s`;
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    }

    function openFavoriteModal(post) {
        const modal = document.getElementById('favModal');
        const modalBody = document.getElementById('favModalBody');
        if (!modal || !modalBody) return;
        const postData = { ...post, id: post.id.toString(), time: timeAgo(post.created_at), isRegistered: true };
        modalBody.innerHTML = `<div class="fav-modal-post">${createPostHtml(postData)}</div>`;
        modal.classList.add('active');
        document.body.classList.add('modal-aberto');
        initPostInteractions();
    }

    function closeFavoriteModal() {
        const modal = document.getElementById('favModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-aberto');
        }
    }
    
    // --- PONTO DE ENTRADA E EVENT LISTENERS ---
    inicializarPagina();
    initModalActionHandlers(); // ✅ 2. ATIVA O "CÉREBRO" DOS MODAIS NESTA PÁGINA
    initPostCreationModal('perfil'); // ✅ 3. ATIVA A LÓGICA DO FAB PARA O PERFIL PRINCIPAL

    document.querySelectorAll('.pus-tab-item').forEach(clickedTab => {
        clickedTab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            const targetContent = document.getElementById(tabId);

            document.querySelectorAll('.pus-tab-item').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.pus-tab-content').forEach(content => content.classList.remove('active'));

            this.classList.add('active');
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (tabId === 'favorites' && allFavoritePosts.length === 0 && !visitedUserId) {
                loadAndRenderFavorites();
            }
        });
    });

    document.querySelectorAll('.fav-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelector('.fav-filter-btn.active')?.classList.remove('active');
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderFavoriteGrid(currentFilter);
        });
    });

    document.getElementById('favModalClose')?.addEventListener('click', closeFavoriteModal);
    document.getElementById('favModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeFavoriteModal(); });
    document.getElementById('profileSettingsIcon')?.addEventListener('click', () => window.location.href = 'configuracao.html');

    document.getElementById('backButton')?.addEventListener('click', () => history.back());
});
