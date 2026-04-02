/**
 * =================================================================
 * 🔗 JUPTI - Scripts Globais (VERSÃO COM EFEITOS CORRIGIDOS)
 * =================================================================
 */

import { openCommentsModal } from './Comments.js';

// --- 1. Lógica de Navegação e Efeitos Visuais ---
document.addEventListener('DOMContentLoaded', () => {
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', () => { history.back(); });
  }
  let lastScrollTop = 0;
  const appHeader = document.getElementById('glb-appHeader');
  if (appHeader) {
    window.addEventListener('scroll', function() {
      const st = window.pageYOffset || document.documentElement.scrollTop;
      if (st > lastScrollTop && st > 50) { appHeader.classList.add('hidden'); } 
      else { appHeader.classList.remove('hidden'); }
      lastScrollTop = st <= 0 ? 0 : st;
    }, false);
  }
});

// --- 2. Geração de HTML para Posts (EXPORTADA) ---
export function createPostHtml(post) {
  const mediaHtml = post.media ? `<div class="glb-post-media"><img src="${post.media}" alt="Mídia do post"></div>` : '';
  const isOwner = post.author === 'Fabio Silva';
  return `
    <div class="glb-post" data-id="${post.id}" data-owner="${isOwner}">
      <div class="glb-post-header">
        <div class="glb-post-profile"><img src="${post.authorAvatar}" alt="Avatar de ${post.author}"></div>
        <div class="glb-post-info">
          <div class="glb-post-author">${post.author}</div>
          <div class="glb-post-time">${post.time}</div>
        </div>
        <div class="glb-post-options" data-post-id="${post.id}"><i class="fas fa-ellipsis-h"></i></div>
      </div>
      <div class="glb-post-content"><div class="glb-post-text">${post.text}</div>${mediaHtml}</div>
      <div class="glb-post-actions">
        <div class="glb-action-group"><div class="glb-star-icon ${post.isStarred ? 'active' : ''}" data-post-id="${post.id}"><i class="fas fa-star"></i></div><div class="glb-action-count">${post.likes}</div></div>
        <div class="glb-action-group"><div class="glb-comment-icon" data-post-id="${post.id}"><i class="fas fa-comment"></i></div><div class="glb-action-count">${post.comments}</div></div>
        <div class="glb-action-group"><div class="glb-share-icon" data-post-id="${post.id}"><i class="fas fa-share-alt"></i></div><div class="glb-action-count">${post.shares}</div></div>
        <div class="glb-register-icon ${post.isRegistered ? 'active' : ''}" data-post-id="${post.id}"><i class="fas fa-clipboard-list"></i></div>
      </div>
    </div>
  `;
}

// --- 3. Lógica dos Modais e Interações ---
function initShareModal() {
  const shareModal = document.getElementById('shareModal');
  if (!shareModal) return;
  document.getElementById('closeShareModal')?.addEventListener('click', closeShareModal);
  shareModal.addEventListener('click', (e) => { if (e.target.classList.contains('com-modal-overlay')) closeShareModal(); });
  document.getElementById('shareCopyLink')?.addEventListener("click", () => copyShareLink(shareModal.dataset.postId));
  document.getElementById('shareCopyBtn')?.addEventListener("click", () => copyShareLink(shareModal.dataset.postId));
  document.getElementById('shareWhatsApp')?.addEventListener("click", () => {
    const link = document.getElementById("shareLinkInput").value;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Confira este post no JUPTI: ${link}`)}`, "_blank");
    incrementShareCount(shareModal.dataset.postId);
  });
  document.getElementById('shareTelegram')?.addEventListener("click", () => {
    const link = document.getElementById("shareLinkInput").value;
    window.open(`https://t.me/share/url?url=${link}&text=${encodeURIComponent("Confira este post no JUPTI!")}`, "_blank");
    incrementShareCount(shareModal.dataset.postId);
  });
  document.getElementById('shareJupti')?.addEventListener("click", () => {
    alert("Compartilhado via mensagem no JUPTI!");
    incrementShareCount(shareModal.dataset.postId);
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
function copyShareLink(postId) {
  const linkInput = document.getElementById("shareLinkInput");
  const copyBtn = document.getElementById("shareCopyBtn");
  linkInput.select();
  linkInput.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(linkInput.value).then(() => {
    copyBtn.textContent = "Copiado!";
    setTimeout(() => { copyBtn.textContent = "Copiar"; }, 2000);
    incrementShareCount(postId);
  }).catch(err => console.error("Erro ao copiar link: ", err));
}
function incrementShareCount(postId) {
    const postElement = document.querySelector(`.glb-post[data-id="${postId}"]`);
    if (!postElement) return;
    const countElement = postElement.querySelector(".glb-share-icon + .glb-action-count");
    if (countElement) {
        countElement.textContent = (parseInt(countElement.textContent) || 0) + 1;
    }
}
function createStarExplosion(x, y) {
  const numParticles = 20;
  for (let i = 0; i < numParticles; i++) {
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
    particle.style.animation = `starExplosion ${Math.random() * 0.8 + 0.7}s ease-out ${Math.random() * 0.3}s forwards`;
    document.body.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove());
  }
}

// --- 4. INICIALIZAÇÃO CENTRALIZADA DE EVENTOS (EXPORTADA) ---
export function initPostInteractions() {
  initShareModal();
  document.body.addEventListener('click', function(e) {
    const target = e.target;
    const starButton = target.closest('.glb-star-icon');
    if (starButton) {
      e.preventDefault();
      starButton.classList.toggle('active');
      const countElement = starButton.nextElementSibling;
      if (countElement) {
        let count = parseInt(countElement.textContent) || 0;
        countElement.textContent = starButton.classList.contains('active') ? count + 1 : Math.max(0, count - 1);
      }
      if (starButton.classList.contains('active')) {
        const rect = starButton.getBoundingClientRect();
        // ✅ CORREÇÃO APLICADA AQUI
        createStarExplosion(rect.left + rect.width / 2 + window.scrollX, rect.top + rect.height / 2 + window.scrollY);
      }
      return;
    }
    const commentIcon = target.closest(".glb-comment-icon");
    if (commentIcon) {
      e.preventDefault();
      openCommentsModal(commentIcon.dataset.postId);
      return;
    }
    const shareIcon = target.closest(".glb-share-icon");
    if (shareIcon) {
      e.preventDefault();
      openShareModal(shareIcon.dataset.postId);
      return;
    }
    const registerIcon = target.closest('.glb-register-icon');
    if (registerIcon) {
      e.preventDefault();
      const wasActive = registerIcon.classList.contains('active');
      registerIcon.classList.toggle('active');
      const rect = registerIcon.getBoundingClientRect();
      // ✅ CORREÇÃO APLICADA AQUI
      createFavoriteExplosion(rect.left + rect.width / 2 + window.scrollX, rect.top + rect.height / 2 + window.scrollY);
      showFavoriteFeedback(!wasActive);
      return;
    }
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
  const allOptionsModals = document.querySelectorAll('#glb-postOptionsModal, #glb-profileOptionsModal');
  allOptionsModals.forEach(modal => {
      modal.addEventListener('click', function(event) {
          if (event.target === modal || event.target.closest('.cancel')) {
              modal.classList.remove('active');
              document.body.classList.remove('modal-aberto');
          }
      });
  });
}

// --- 5. Funções de Feedback para Favoritar ---
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
  const numParticles = 12;
  const icons = ['📋', '❤️', '⭐', '✨'];
  for (let i = 0; i < numParticles; i++) {
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
    particle.style.animation = `favoriteExplosion ${Math.random() * 0.6 + 0.8}s ease-out ${Math.random() * 0.2}s forwards`;
    document.body.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove());
  }
}
