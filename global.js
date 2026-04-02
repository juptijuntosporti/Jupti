/**
 * =================================================================
 * 🔗 JUPTI - Scripts Globais (VERSÃO FINAL COMPLETA)
 * =================================================================
 * Descrição:
 * - ✅ Renderiza VÍDEOS e IMAGENS corretamente.
 * - ✅ Conecta CURTIR, FAVORITAR e COMPARTILHAR com a API, salvando os dados.
 * - ✅ Centraliza a criação de AVATARES com fotos ou iniciais.
 * - Gerencia modais e interações de forma robusta.
 * =================================================================
 */

// --- 1. IMPORTAÇÕES ---
import { openCommentsModal } from './Comments.js';
import { initGlobalUserProfileRedirects } from './userProfileRedirect.js';
import { toggleLike, addShare, toggleFavorite, getProfileData } from './apiService.js';
import { getAvatarHtml } from './avatarUtils.js';

// --- 2. VARIÁVEIS GLOBAIS DO MÓDULO ---
let currentUserId = null;

// --- 3. INICIALIZAÇÃO E LÓGICA DE UI ---
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await getProfileData();
    if (result.success && result.user) {
      currentUserId = result.user.id;
    }
  } catch (error) {
    console.error("Erro ao carregar dados do usuário no Global.js:", error);
  }

  initGlobalUserProfileRedirects();

  let lastScrollTop = 0;
  const appHeader = document.getElementById('glb-appHeader');
  if (appHeader) {
    window.addEventListener('scroll', function() {
      const st = window.pageYOffset || document.documentElement.scrollTop;
      if (st > lastScrollTop && st > 50) {
        appHeader.classList.add('hidden');
      } else {
        appHeader.classList.remove('hidden');
      }
      lastScrollTop = st <= 0 ? 0 : st;
    }, false);
  }
});

// --- 4. FUNÇÕES EXPORTADAS ---

export function getLoggedInUserId() {
    return currentUserId;
}

/**
 * Cria o HTML para um post, agora com suporte a vídeo.
 */
export function createPostHtml(post) {
  // Lógica para renderizar mídia (IMAGEM ou VÍDEO)
  let mediaHtml = '';
  if (post.media) {
    if (post.media_type === 'video') {
      mediaHtml = `
        <div class="glb-post-media">
          <video src="${post.media}" controls playsinline loop muted>
            Seu navegador não suporta a tag de vídeo.
          </video>
        </div>`;
    } else {
      mediaHtml = `
        <div class="glb-post-media">
          <img src="${post.media}" alt="Mídia do post">
        </div>`;
    }
  }
  
  const isOwner = currentUserId && post.user_id && (post.user_id === currentUserId);
  const avatarHtml = getAvatarHtml(post.authorAvatar, post.author, `Avatar de ${post.author}`);
  
  return `
    <div class="glb-post" data-id="${post.id}" data-owner="${isOwner}" data-user-id="${post.user_id || ''}">
      <div class="glb-post-header">
        <div class="glb-post-profile">${avatarHtml}</div>
        <div class="glb-post-info">
          <div class="glb-post-author">${post.author}</div>
          <div class="glb-post-time">${post.time}</div>
        </div>
        <div class="glb-post-options" data-post-id="${post.id}"><i class="fas fa-ellipsis-h"></i></div>
      </div>
      <div class="glb-post-content"><div class="glb-post-text">${post.text}</div>${mediaHtml}</div>
      <div class="glb-post-actions">
        <div class="glb-action-group">
          <div class="glb-star-icon ${post.isStarred ? 'active' : ''}" data-post-id="${post.id}"><i class="fas fa-star"></i></div>
          <div class="glb-action-count">${post.likes}</div>
        </div>
        <div class="glb-action-group">
          <div class="glb-comment-icon" data-post-id="${post.id}"><i class="fas fa-comment"></i></div>
          <div class="glb-action-count">${post.comments}</div>
        </div>
        <div class="glb-action-group">
          <div class="glb-share-icon" data-post-id="${post.id}"><i class="fas fa-share-alt"></i></div>
          <div class="glb-action-count">${post.shares}</div>
        </div>
        <div class="glb-register-icon ${post.isRegistered ? 'active' : ''}" data-post-id="${post.id}"><i class="fas fa-clipboard-list"></i></div>
      </div>
    </div>
  `;
}

/**
 * Inicializa as interações de post (curtir, comentar, compartilhar, etc.).
 */
export function initPostInteractions() {
  initShareModal();

  document.body.addEventListener('click', async function(e) {
    const target = e.target;
    
    // Lógica para Curtir (conecta com a API)
    const starButton = target.closest('.glb-star-icon');
    if (starButton) {
      e.preventDefault();
      const postId = parseInt(starButton.dataset.postId);
      try {
        const result = await toggleLike(postId);
        if (result.success) {
          starButton.classList.toggle('active', result.liked);
          starButton.nextElementSibling.textContent = result.likeCount;
          if (result.liked) {
            const rect = starButton.getBoundingClientRect();
            createStarExplosion(rect.left + rect.width / 2 + window.scrollX, rect.top + rect.height / 2 + window.scrollY);
          }
        }
      } catch (error) { alert("Erro ao curtir o post."); }
      return;
    }
    
    // Lógica para Comentar
    const commentIcon = target.closest(".glb-comment-icon");
    if (commentIcon) {
      e.preventDefault();
      openCommentsModal(commentIcon.dataset.postId);
      return;
    }
    
    // Lógica para Compartilhar
    const shareIcon = target.closest(".glb-share-icon");
    if (shareIcon) {
      e.preventDefault();
      openShareModal(shareIcon.dataset.postId);
      return;
    }
    
    // Lógica para Favoritar (conecta com a API)
    const registerIcon = target.closest('.glb-register-icon');
    if (registerIcon) {
      e.preventDefault();
      const postId = parseInt(registerIcon.dataset.postId);
      try {
        const result = await toggleFavorite(postId);
        if (result.success) {
          registerIcon.classList.toggle('active', result.favorited);
          const rect = registerIcon.getBoundingClientRect();
          createFavoriteExplosion(rect.left + rect.width / 2 + window.scrollX, rect.top + rect.height / 2 + window.scrollY);
          showFavoriteFeedback(result.favorited);
          if (!result.favorited && window.location.pathname.includes('perfil.html')) {
            window.dispatchEvent(new CustomEvent('favoriteChanged'));
          }
        }
      } catch (error) { alert("Erro ao favoritar o post."); }
      return;
    }
    
    // Lógica para abrir menu de opções
    const optionsIcon = target.closest('.glb-post-options');
    if (optionsIcon) {
      e.preventDefault();
      const postElement = optionsIcon.closest('.glb-post');
      const postId = postElement.dataset.id;
      const isOwner = postElement.dataset.owner === 'true';
      const modalId = isOwner ? 'glb-profileOptionsModal' : 'glb-postOptionsModal';
      const modal = document.getElementById(modalId);
      if (modal) {
          modal.classList.add('active');
          modal.dataset.currentPostId = postId;
          document.body.classList.add('modal-aberto');
      }
      return;
    }
  });
}

// --- 5. LÓGICA DE MODAIS E FEEDBACK VISUAL (sem alterações na funcionalidade) ---

function initShareModal() {
  const shareModal = document.getElementById('shareModal');
  if (!shareModal) return;

  document.getElementById('closeShareModal')?.addEventListener('click', closeShareModal);
  shareModal.addEventListener('click', (e) => { if (e.target.classList.contains('com-modal-overlay')) closeShareModal(); });
  
  document.getElementById('shareCopyLink')?.addEventListener("click", () => copyShareLink(shareModal.dataset.postId));
  document.getElementById('shareCopyBtn')?.addEventListener("click", () => copyShareLink(shareModal.dataset.postId));
  
  document.getElementById('shareWhatsApp')?.addEventListener("click", async () => {
    const postId = shareModal.dataset.postId;
    const link = document.getElementById("shareLinkInput").value;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Confira este post no JUPTI: ${link}`)}`, "_blank");
    await incrementShareCount(postId, 'whatsapp');
  });
  
  document.getElementById('shareTelegram')?.addEventListener("click", async () => {
    const postId = shareModal.dataset.postId;
    const link = document.getElementById("shareLinkInput").value;
    window.open(`https://t.me/share/url?url=${link}&text=${encodeURIComponent("Confira este post no JUPTI!")}`, "_blank");
    await incrementShareCount(postId, 'telegram');
  });
  
  document.getElementById('shareJupti')?.addEventListener("click", async () => {
    const postId = shareModal.dataset.postId;
    alert("Compartilhado via mensagem no JUPTI!");
    await incrementShareCount(postId, 'jupti');
    closeShareModal();
  });
}

function openShareModal(postId) {
  const modal = document.getElementById('shareModal');
  const linkInput = document.getElementById('shareLinkInput');
  if (modal && linkInput) {
    linkInput.value = `${window.location.origin}/post.html?id=${postId}`;
    modal.classList.add("active");
    modal.dataset.postId = postId;
    document.body.classList.add("modal-aberto");
  }
}

function closeShareModal() {
  const modal = document.getElementById('shareModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-aberto');
  }
}

async function copyShareLink(postId) {
  const linkInput = document.getElementById("shareLinkInput");
  const copyBtn = document.getElementById("shareCopyBtn");
  linkInput.select();
  linkInput.setSelectionRange(0, 99999);
  try {
    await navigator.clipboard.writeText(linkInput.value);
    copyBtn.textContent = "Copiado!";
    setTimeout(() => { copyBtn.textContent = "Copiar"; }, 2000);
    await incrementShareCount(parseInt(postId), 'link');
  } catch (err) {
    console.error("Erro ao copiar link: ", err);
  }
}

async function incrementShareCount(postId, shareType) {
  try {
    const result = await addShare(parseInt(postId), shareType);
    if (result.success) {
      const postElement = document.querySelector(`.glb-post[data-id="${postId}"]`);
      if (postElement) {
        const countElement = postElement.querySelector(".glb-share-icon + .glb-action-count");
        if (countElement) countElement.textContent = result.shareCount;
      }
    }
  } catch (error) {
    console.error("Erro ao registrar compartilhamento:", error);
  }
}

function createStarExplosion(x, y) {
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('i');
    particle.classList.add('fas', 'fa-star', 'glb-star-particle');
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    const colors = ['gold', 'yellow', 'orange', 'white'];
    particle.style.color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.fontSize = `${Math.random() * 8 + 12}px`;
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 80 + 50;
    particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
    particle.style.setProperty('--rotate', `${Math.random() * 720 - 360}deg`);
    particle.style.animation = `starExplosion ${Math.random() * 0.8 + 0.7}s ease-out forwards`;
    document.body.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove());
  }
}

function showFavoriteFeedback(isAdding) {
  document.querySelector('.glb-favorite-feedback')?.remove();
  const feedback = document.createElement('div');
  feedback.className = 'glb-favorite-feedback';
  feedback.innerHTML = isAdding ? '<i class="fas fa-heart"></i> Adicionado aos favoritos' : '<i class="fas fa-heart-broken"></i> Removido dos favoritos';
  document.body.appendChild(feedback);
  setTimeout(() => feedback.classList.add('show'), 10);
  setTimeout(() => {
    feedback.classList.remove('show');
    setTimeout(() => feedback.remove(), 300);
  }, 2000);
}

function createFavoriteExplosion(x, y) {
  const icons = ['📋', '❤️', '⭐', '✨'];
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.classList.add('glb-favorite-particle');
    particle.textContent = icons[Math.floor(Math.random() * icons.length)];
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 60 + 40;
    particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
    particle.style.setProperty('--rotate', `${Math.random() * 720 - 360}deg`);
    particle.style.animation = `favoriteExplosion ${Math.random() * 0.6 + 0.8}s ease-out forwards`;
    document.body.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove());
  }
}
