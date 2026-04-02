// ============================================================
// JUPTI - Editar Post
// Gerencia edição e publicação de posts
// VERSÃO FINAL - CONECTADA AO BACKEND
// ============================================================

// 1. IMPORTAÇÕES ATUALIZADAS: Inclui a nova função 'createPost'
import { getProfileData, uploadImageToCloudinary, createPost } from './apiService.js';

let mediaData = null;
let currentLocation = null;
let currentPrivacy = 'public';

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    loadMediaData();
    setupEventListeners();
});

// ============================================================
// CARREGAR DADOS DO USUÁRIO (sem alterações)
// ============================================================
async function loadUserData() {
    try {
        const result = await getProfileData();
        if (result.success && result.user) {
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            
            userName.textContent = result.user.username || 'Usuário';
            
            if (result.user.profile_picture_url) {
                userAvatar.innerHTML = `<img src="${result.user.profile_picture_url}" alt="Seu perfil">`;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

// ============================================================
// CARREGAR MÍDIA CAPTURADA (sem alterações)
// ============================================================
function loadMediaData() {
    const storedMedia = sessionStorage.getItem('capturedMedia');
    
    if (!storedMedia) {
        const postType = sessionStorage.getItem('postType');
        if (postType === 'text') {
            document.getElementById('mediaContainer').style.display = 'none';
            return;
        }
        
        alert('Nenhuma mídia encontrada.');
        window.history.back();
        return;
    }

    try {
        mediaData = JSON.parse(storedMedia);
        const mediaContainer = document.getElementById('mediaContainer');
        
        if (mediaData.type === 'photo') {
            mediaContainer.innerHTML = `<img src="${mediaData.data}" alt="Foto capturada">`;
        } else if (mediaData.type === 'video') {
            mediaContainer.innerHTML = `<video src="${mediaData.data}" controls></video>`;
        }
    } catch (error) {
        console.error('Erro ao carregar mídia:', error);
        alert('Erro ao carregar a mídia.');
        window.history.back();
    }
}

// ============================================================
// CONFIGURAR EVENT LISTENERS (sem alterações)
// ============================================================
function setupEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
        if (confirm('Descartar este post?')) {
            sessionStorage.removeItem('capturedMedia');
            sessionStorage.removeItem('postType');
            window.history.back();
        }
    });

    document.getElementById('publishBtn').addEventListener('click', publishPost);

    document.getElementById('locationOption').addEventListener('click', () => {
        alert('Funcionalidade de localização será implementada em breve!');
    });

    document.getElementById('privacyOption').addEventListener('click', togglePrivacy);
}

// ============================================================
// ALTERNAR PRIVACIDADE (sem alterações)
// ============================================================
function togglePrivacy() {
    const privacyValue = document.getElementById('privacyValue');
    
    if (currentPrivacy === 'public') {
        currentPrivacy = 'friends';
        privacyValue.textContent = 'Amigos';
    } else if (currentPrivacy === 'friends') {
        currentPrivacy = 'private';
        privacyValue.textContent = 'Privado';
    } else {
        currentPrivacy = 'public';
        privacyValue.textContent = 'Público';
    }
}

// ============================================================
// PUBLICAR POST (FUNÇÃO TOTALMENTE ATUALIZADA)
// ============================================================
async function publishPost() {
    const caption = document.getElementById('captionInput').value.trim();
    const publishBtn = document.getElementById('publishBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (!caption && !mediaData) {
        alert('Adicione uma legenda ou mídia ao seu post.');
        return;
    }

    try {
        publishBtn.disabled = true;
        loadingOverlay.classList.add('active');

        let mediaUrl = null;
        let mediaType = 'text';

        // 1. Faz o upload da mídia, se existir
        if (mediaData) {
            const blob = await fetch(mediaData.data).then(r => r.blob());
            const file = new File([blob], mediaData.filename, { type: blob.type });
            const folder = mediaData.type === 'photo' ? 'jupti/posts/images' : 'jupti/posts/videos';
            
            mediaUrl = await uploadImageToCloudinary(file, folder);
            mediaType = mediaData.type;
        }

        // 2. Prepara o objeto com todos os dados do post
        
        // **PASSO CRUCIAL: Gerenciamento de Contexto do Filho**
const postContext = JSON.parse(
    sessionStorage.getItem('postContext')
);

const postData = {
    caption: caption,
    media_url: mediaUrl,
    media_type: mediaType,
    privacy: currentPrivacy,
    location: currentLocation
};

if (postContext?.type === 'CHILD') {
    postData.child_id = postContext.childId;
}


        // 3. Chama a API para salvar o post no banco de dados
        const result = await createPost(postData);

        // 4. Trata o resultado
        if (result.success) {
            sessionStorage.removeItem('capturedMedia');
            sessionStorage.removeItem('postType');
            sessionStorage.removeItem('postContext');
 // Limpa o contexto após a publicação
            alert('✅ Post publicado com sucesso!');
            window.location.href = 'feed.html'; // Redireciona para o feed
        } else {
            throw new Error(result.message || 'Falha ao criar o post.');
        }

    } catch (error) {
        console.error('Erro ao publicar post:', error);
        alert('❌ Erro ao publicar post: ' + error.message);
    } finally {
        publishBtn.disabled = false;
        loadingOverlay.classList.remove('active');
    }
}

// ============================================================
// LIMPEZA AO SAIR (sem alterações)
// ============================================================
window.addEventListener('beforeunload', (e) => {
    const caption = document.getElementById('captionInput').value.trim();
    if (caption || mediaData) {
        e.preventDefault();
        e.returnValue = '';
    }
});
