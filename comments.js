/**
 * ======================================================
 * 📄 COMMENTS.JS - MÓDULO DE COMENTÁRIOS (VERSÃO FINAL)
 * ======================================================
 * Descrição:
 * - Gerencia a exibição e interação do modal de comentários.
 * - Busca comentários de um post específico via API.
 * - Permite que o usuário adicione novos comentários.
 * - Atualiza a contagem de comentários no post original.
 * - Carrega os dados do usuário logado para exibir seu avatar.
 * - A lógica de clique para redirecionamento é gerenciada globalmente.
 * ======================================================
 */

// --- 1. IMPORTAÇÕES ---
// A função de redirecionamento não é mais importada aqui.
import { getComments, addComment, getProfileData } from './apiService.js';
import { getAvatarHtml, updateAvatarElement } from './avatarUtils.js'; // Importa funções para avatares com iniciais

// --- 2. VARIÁVEIS DE ESTADO DO MÓDULO ---
let currentPostId = null;
let currentUser = null;

// --- 3. INICIALIZAÇÃO DO MÓDULO ---
document.addEventListener('DOMContentLoaded', () => {
    initCommentsModule();
    loadCurrentUser(); // Carrega dados do usuário proativamente.
});

/**
 * Adiciona todos os event listeners internos do modal de comentários.
 */
function initCommentsModule() {
    const backBtn = document.getElementById('commentsBackBtn');
    const modal = document.getElementById('commentsModal');
    const input = document.getElementById('commentsInput');
    const sendBtn = document.getElementById('commentsSendBtn');

    if (backBtn) backBtn.addEventListener('click', closeCommentsModal);
    
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCommentsModal();
    });

    if (input) {
        input.addEventListener('input', updateSendButtonState);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) sendComment();
            }
        });
    }

    if (sendBtn) sendBtn.addEventListener('click', sendComment);
}


// --- 4. FUNÇÕES PRINCIPAIS DO MÓDULO ---

/**
 * Abre o modal de comentários, buscando os dados necessários.
 * @param {string} postId - O ID do post cujos comentários serão abertos.
 */
export async function openCommentsModal(postId) {
    currentPostId = parseInt(postId);
    const modal = document.getElementById('commentsModal');
    
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-aberto');
        document.body.classList.add('no-scroll');
        
        if (!currentUser) {
            await loadCurrentUser();
        }
        
        const userAvatarContainer = document.querySelector('.glb-comments-user-avatar');
        if (userAvatarContainer && currentUser) {
            updateAvatarElement(userAvatarContainer, currentUser.profile_picture_url, currentUser.username, 'Seu avatar');
        }
        
        // A inicialização do redirecionamento foi removida daqui.
        // O listener global em Global.js cuidará dos cliques.

        loadComments(postId);
        
        setTimeout(() => document.getElementById('commentsInput')?.focus(), 300);
    }
}

/**
 * Fecha o modal de comentários e reseta o estado.
 */
function closeCommentsModal() {
    const modal = document.getElementById('commentsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-aberto');
        document.body.classList.remove('no-scroll');
    }
    currentPostId = null;
}

/**
 * Carrega e exibe os comentários para um postId específico.
 */
async function loadComments(postId) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;

    commentsList.innerHTML = '<div class="glb-comments-loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

    try {
        const result = await getComments(parseInt(postId));
        commentsList.innerHTML = '';

        if (!result.success || result.comments.length === 0) {
            commentsList.innerHTML = `<div class="glb-comments-empty"><div class="glb-comments-empty-icon"><i class="fas fa-comment-dots"></i></div><div class="glb-comments-empty-text">Seja o primeiro a comentar!</div></div>`;
        } else {
            result.comments.forEach(comment => {
                const commentElement = document.createElement('div');
                commentElement.className = 'glb-comment-item';
                commentElement.dataset.userId = comment.user_id; // Essencial para o listener global
                
                const commentAvatarHtml = getAvatarHtml(comment.authorAvatar, comment.author, `Avatar de ${comment.author}`);
                
                commentElement.innerHTML = `
                    <div class="glb-comment-avatar">${commentAvatarHtml}</div>
                    <div class="glb-comment-content">
                        <div class="glb-comment-author">${comment.author}</div>
                        <div class="glb-comment-text">${comment.content}</div>
                        <div class="glb-comment-time">${formatCommentTime(comment.created_at)}</div>
                    </div>`;
                commentsList.appendChild(commentElement);
            });
        }
        setTimeout(() => { commentsList.scrollTop = commentsList.scrollHeight; }, 100);
    } catch (error) {
        console.error("Erro ao carregar comentários:", error);
        commentsList.innerHTML = '<div class="glb-comments-error"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar.</div>';
    }
}

/**
 * Envia um novo comentário para a API e atualiza a UI.
 */
async function sendComment() {
    const input = document.getElementById('commentsInput');
    if (!input || !input.value.trim() || !currentPostId) return;

    const sendBtn = document.getElementById('commentsSendBtn');
    const originalBtnContent = sendBtn.innerHTML;
    
    try {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const result = await addComment(parseInt(currentPostId), input.value.trim());

        if (result.success) {
            const commentsList = document.getElementById('commentsList');
            const emptyState = commentsList.querySelector('.glb-comments-empty');
            if (emptyState) commentsList.innerHTML = '';

            const commentElement = document.createElement('div');
            commentElement.className = 'glb-comment-item';
            
            // Garante que o user_id seja adicionado para o listener global funcionar
            const newCommentUserId = result.comment.user_id || currentUser.id;
            commentElement.dataset.userId = newCommentUserId;
            
            const newCommentAvatarHtml = getAvatarHtml(result.comment.authorAvatar, result.comment.author, 'Avatar');
            
            commentElement.innerHTML = `
                <div class="glb-comment-avatar">${newCommentAvatarHtml}</div>
                <div class="glb-comment-content">
                    <div class="glb-comment-author">${result.comment.author}</div>
                    <div class="glb-comment-text">${result.comment.content}</div>
                    <div class="glb-comment-time">agora</div>
                </div>`;
            commentsList.appendChild(commentElement);

            updatePostCommentsCount(currentPostId, result.commentCount);
            input.value = '';
            updateSendButtonState();
            setTimeout(() => { commentsList.scrollTop = commentsList.scrollHeight; }, 100);
        }
    } catch (error) {
        console.error("Erro ao enviar comentário:", error);
        alert("Erro ao enviar comentário. Tente novamente.");
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalBtnContent;
    }
}


// --- 5. FUNÇÕES AUXILIARES ---

async function loadCurrentUser() {
    if (currentUser) return;
    try {
        const result = await getProfileData();
        if (result.success && result.user) currentUser = result.user;
    } catch (error) {
        console.error("Erro ao carregar dados do usuário para comentários:", error);
    }
}

function updateSendButtonState() {
    const input = document.getElementById('commentsInput');
    const sendBtn = document.getElementById('commentsSendBtn');
    if (input && sendBtn) sendBtn.disabled = input.value.trim().length === 0;
}

function updatePostCommentsCount(postId, count) {
    const postElement = document.querySelector(`.glb-post[data-id="${postId}"]`);
    if (postElement) {
        const countElement = postElement.querySelector('.glb-comment-icon + .glb-action-count');
        if (countElement) countElement.textContent = count;
    }
}

function formatCommentTime(dateString) {
    if (!dateString) return '';
    const seconds = Math.round((new Date() - new Date(dateString)) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    if (seconds < 60) return 'agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}
