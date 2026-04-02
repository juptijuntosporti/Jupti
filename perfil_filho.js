/**
 * =========================================================
 * 📌 JavaScript — Perfil do Filho (VERSÃO FINAL ESTÁVEL)
 * =========================================================
**/
import { getChildPosts } from './apiService.js';
import { createPostHtml, initPostInteractions } from './Global.js';
import { initModalActionHandlers } from './modalHandlers.js';
import { initPostCore } from './postcore.js';

document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ Perfil do Filho iniciado");

    init(); // 👈 o seu init atual (perfil, tabs, timeline, etc)

    // 🔥 ADICIONAR ISSO
    initPostCore();            // criar / editar post
    initPostInteractions();    // curtir / comentar
    initModalActionHandlers(); // ações do modal
});
    // -------------------------------------------------
    // VARIÁVEIS
    // -------------------------------------------------
    const tabItems = document.querySelectorAll('.chp-tab-item');
    const tabContents = document.querySelectorAll('.chp-tab-content');
    const profileMenuIcon = document.getElementById('profileMenuIcon');
    const shareProfileIcon = document.getElementById('shareProfileIcon');

    let perfilAtivo = null;

    // -------------------------------------------------
    // INIT
    // -------------------------------------------------
    function init() {
        try {
            carregarPerfilBasico();
            verificarPermissoesGuardiao();
            setupEventListeners();
            loadTimelineContent();
        } catch (error) {
            console.error("❌ Erro crítico no perfil do filho:", error);
            document.body.innerHTML = `
                <div style="padding:40px;text-align:center;font-family:sans-serif">
                    <h2>Erro ao carregar perfil</h2>
                    <p>${error.message}</p>
                    <a href="selecao_perfis.html">Voltar</a>
                </div>
            `;
        }
    }

    // -------------------------------------------------
    // PERFIL DO FILHO
    // -------------------------------------------------
    function carregarPerfilBasico() {
        const perfilString = localStorage.getItem('perfilFilhoAtivo');
        if (!perfilString) throw new Error("Perfil do filho não encontrado.");

        const perfil = JSON.parse(perfilString);
        if (!perfil.id || !perfil.nomeCompleto) {
            throw new Error("Dados do perfil do filho incompletos.");
        }

        perfilAtivo = perfil;

        document.getElementById('childProfileNameHeader').textContent = perfil.nomeCompleto;
        document.getElementById('childName').textContent = perfil.nomeCompleto;
        document.getElementById('childAge').textContent = calcularIdadeTexto(perfil.dataNascimento);

        const avatarEl = document.getElementById('childAvatar');
        const avatarContainer = document.querySelector('.chp-profile-avatar');

        if (perfil.foto) {
            avatarEl.src = perfil.foto;
            avatarEl.style.display = 'block';
        } else {
            avatarEl.style.display = 'none';
            avatarContainer.innerHTML = `
                <div class="perf-child-avatar-initials">
                    ${obterIniciais(perfil.nomeCompleto)}
                </div>
            `;
        }

        console.log("👶 Perfil ativo:", perfilAtivo.nomeCompleto);
    }

    // -------------------------------------------------
    // PERMISSÕES
    // -------------------------------------------------
    function verificarPermissoesGuardiao() {
        const fabButton = document.getElementById('fabButton');
        if (!fabButton) return;

        const isPrimary = perfilAtivo.relationshipType === 'PRIMARY_GUARDIAN';
        fabButton.style.display = isPrimary ? 'flex' : 'none';
    }

    // -------------------------------------------------
    // EVENTOS GERAIS
    // -------------------------------------------------
    function setupEventListeners() {
        tabItems.forEach(item => item.addEventListener('click', handleTabClick));

        profileMenuIcon?.addEventListener('click', () => {
            window.location.href = 'configuracoes_filho.html';
        });

        shareProfileIcon?.addEventListener('click', () => {
            alert('Compartilhamento será implementado');
        });
        const fabButton = document.getElementById('fabButton');
if (fabButton) {
    fabButton.addEventListener('click', () => {
        sessionStorage.setItem('postContext', JSON.stringify({
            type: 'CHILD',
            childId: perfilAtivo.id
        }));

        document
            .getElementById('glb-createPostModal')
            ?.classList.add('active');

        document.body.classList.add('no-scroll');
    });
}
    }

    function handleTabClick() {
        const tabId = this.dataset.tab;

        tabItems.forEach(i => i.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        this.classList.add('active');
        document.getElementById(tabId)?.classList.add('active');

        if (tabId === 'timeline') loadTimelineContent();
    }


    // -------------------------------------------------
    // TIMELINE
    // -------------------------------------------------
async function loadTimelineContent() {
    const container = document.getElementById('timelinePostsContainer');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center;color:#999">Carregando...</p>';

    try {
        const perfilFilho = JSON.parse(localStorage.getItem('perfilFilhoAtivo'));
        if (!perfilFilho?.id) throw new Error('Filho ativo não encontrado');

        const data = await getChildPosts(perfilFilho.id);
        const posts = data.posts || [];

        if (!posts.length) {
            container.innerHTML = `
                <div class="chp-empty-state">
                    <div class="chp-empty-title">Linha do Tempo Vazia</div>
                    <div class="chp-empty-description">
                        Nenhum registro para ${perfilFilho.nomeCompleto}.
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

posts.forEach(post => {
    const postData = {
        ...post,
        id: post.id.toString(),
        author: perfilFilho.nomeCompleto,
        authorAvatar: perfilFilho.foto || 'icone.png',
        time: formatPostTime(post.created_at)
    };

    container.insertAdjacentHTML(
        'beforeend',
        createPostHtml(postData)
    );
});
    }  
    catch (error) {
        console.error('Erro ao carregar timeline do filho:', error);
        container.innerHTML =
            `<p style="text-align:center;color:red">Erro ao carregar posts</p>`;
    }
}
    // -------------------------------------------------
    // UTILITÁRIOS
    // -------------------------------------------------
    function calcularIdadeTexto(dataNascimento) {
        if (!dataNascimento) return 'Idade não informada';
        const hoje = new Date();
        const nasc = new Date(dataNascimento);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        return idade === 1 ? '1 ano' : `${idade} anos`;
    }

    function obterIniciais(nome) {
        if (!nome) return '?';
        const partes = nome.trim().split(' ');
        return partes.length === 1
            ? partes[0].slice(0, 2).toUpperCase()
            : (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }

function formatPostTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();

    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    return `${diffDay}d`;
}
// -------------------------------------------------
// START
// -------------------------------------------------
// init();
// });