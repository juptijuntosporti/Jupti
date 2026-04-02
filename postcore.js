/**
 * ======================================================
 * 📄 postCore.js
 * ======================================================
 * Responsável por:
 * - Abrir / fechar modal de criar post
 * - Definir tipo de post
 * - Redirecionar para edição ou câmera
 * ======================================================
 */

export function initPostCore() {
    const createPostModal = document.getElementById('glb-createPostModal');

    // Abrir modal
    document.getElementById('addPostBtn')?.addEventListener('click', () => {
        createPostModal?.classList.add('active');
        document.body.classList.add('no-scroll');
    });

    // Fechar modal
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

    // Criar post texto
    document.getElementById('createTextPost')?.addEventListener('click', () => {
        sessionStorage.setItem('postType', 'text');
        window.location.href = 'editar_post.html';
    });

    // Criar post foto
    document.getElementById('createPhotoPost')?.addEventListener('click', () => {
        sessionStorage.setItem('postType', 'photo');
        window.location.href = 'camera.html';
    });

    // Criar post vídeo
    document.getElementById('createVideoPost')?.addEventListener('click', () => {
        sessionStorage.setItem('postType', 'video');
        window.location.href = 'camera.html';
    });
}