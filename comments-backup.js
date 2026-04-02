/**
 * ======================================================
 * 📄 COMMENTS.JS - MÓDULO DE COMENTÁRIOS (REFATORADO)
 * ------------------------------------------------------
 * Agora é um módulo autocontido e independente.
 * Gerencia seus próprios dados, eventos e interações.
 * ======================================================
 */

// --- 1. DADOS MOCKADOS (Agora vivem aqui) ---
const commentsData = [
    { id: 'c1', postId: 'p1', author: 'Carlos Silva', authorAvatar: 'https://randomuser.me/api/portraits/men/47.jpg', text: 'Que legal! Aproveitem muito!', time: '1h' },
    { id: 'c2', postId: 'p1', author: 'Mariana Costa', authorAvatar: 'https://randomuser.me/api/portraits/women/48.jpg', text: 'Adorei a foto! ❤️', time: '45m' },
    { id: 'c3', postId: 'p2', author: 'Fernanda Dias', authorAvatar: 'https://randomuser.me/api/portraits/women/49.jpg', text: 'Excelente ponto, doutor. A comunicação é tudo.', time: '3h' },
    { id: 'c4', postId: 'p3', author: 'Pedro Martins', authorAvatar: 'https://randomuser.me/api/portraits/men/50.jpg', text: 'Passa a receita pra gente! 😁', time: '1d' }
];

// --- 2. VARIÁVEIS DE ESTADO DO MÓDULO ---
let currentPostId = null;

// --- 3. FUNÇÕES DO MÓDULO ---

/**
 * Carrega e exibe os comentários para um postId específico.
 * @param {string} postId - O ID do post.
 */
function loadComments(postId) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;

    const postComments = commentsData.filter(comment => comment.postId === postId);
    commentsList.innerHTML = ''; // Limpa a lista

    if (postComments.length === 0) {
        commentsList.innerHTML = `<div class="glb-comments-empty"><div class="glb-comments-empty-icon"><i class="fas fa-comment-dots"></i></div><div class="glb-comments-empty-text">Seja o primeiro a comentar!</div></div>`;
    } else {
        postComments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'glb-comment-item';
            commentElement.innerHTML = `<div class="glb-comment-avatar"><img src="${comment.authorAvatar}" alt="Avatar"></div><div class="glb-comment-content"><div class="glb-comment-author">${comment.author}</div><div class="glb-comment-text">${comment.text}</div><div class="glb-comment-time">${comment.time}</div></div>`;
            commentsList.appendChild(commentElement);
        });
    }
    // Rola para o final da lista de comentários
    setTimeout(() => { commentsList.scrollTop = commentsList.scrollHeight; }, 100);
}

/**
 * Atualiza o contador de comentários no post original.
 * @param {string} postId - O ID do post a ser atualizado.
 */
function updatePostCommentsCount(postId) {
    const count = commentsData.filter(c => c.postId === postId).length;
    const postElement = document.querySelector(`.glb-post[data-id="${postId}"]`);
    if (postElement) {
        const countElement = postElement.querySelector('.glb-comment-icon + .glb-action-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }
}

/**
 * Adiciona um novo comentário aos dados e atualiza a UI.
 */
function sendComment() {
    const input = document.getElementById('commentsInput');
    if (!input || !input.value.trim() || !currentPostId) return;

    // No futuro, a foto virá do usuário logado
    const userAvatar = document.getElementById('commentsUserAvatar')?.src || 'icone.png';

    const newComment = {
        id: 'c' + Date.now(),
        postId: currentPostId,
        author: 'Você', // No futuro, virá do usuário logado
        authorAvatar: userAvatar,
        text: input.value.trim(),
        time: 'agora'
    };

    commentsData.push(newComment);
    loadComments(currentPostId); // Recarrega a lista
    updatePostCommentsCount(currentPostId); // Atualiza o contador no post

    input.value = '';
    input.dispatchEvent(new Event('input')); // Força a atualização do botão de enviar
}

/**
 * Abre o modal de comentários.
 * Esta função será exportada para ser chamada de fora (pelo global.js).
 * @param {string} postId - O ID do post cujos comentários serão abertos.
 */
export function openCommentsModal(postId) {
    currentPostId = postId;
    const modal = document.getElementById('commentsModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-aberto');
        loadComments(postId);
        setTimeout(() => document.getElementById('commentsInput')?.focus(), 300);
    }
}

/**
 * Fecha o modal de comentários.
 */
function closeCommentsModal() {
    const modal = document.getElementById('commentsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-aberto');
    }
    currentPostId = null;
}

/**
 * Habilita/desabilita o botão de enviar com base no conteúdo do input.
 */
function updateSendButton() {
    const input = document.getElementById('commentsInput');
    const sendBtn = document.getElementById('commentsSendBtn');
    if (input && sendBtn) {
        sendBtn.disabled = input.value.trim().length === 0;
    }
}

// --- 4. INICIALIZAÇÃO DO MÓDULO ---

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
        input.addEventListener('input', updateSendButton);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) sendComment();
            }
        });
    }

    if (sendBtn) sendBtn.addEventListener('click', sendComment);
}

// Roda a inicialização quando o DOM estiver pronto.
document.addEventListener('DOMContentLoaded', initCommentsModule);
