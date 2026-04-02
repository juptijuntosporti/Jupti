// Arquivo: completar_perfil.js (VERSÃO FINAL com UPLOAD ASSINADO)

document.addEventListener("DOMContentLoaded", function() {
    // --- LÓGICA DE INICIALIZAÇÃO ---
    const urlParams = new URLSearchParams(window.location.search);
    const perfilSelecionado = urlParams.get('profile');
    const perfilOutro = urlParams.get('other');
    const token = localStorage.getItem('authTokenJUPTI');

    if (!perfilSelecionado || !token) {
        alert("Acesso inválido. Você será redirecionado.");
        window.location.href = "selecao_perfil.html";
        return;
    }

    configurarPagina(perfilSelecionado, perfilOutro);
    preencherDadosIniciais();

    // --- FUNÇÕES ---
    // (As funções preencherDadosIniciais e configurarPagina continuam as mesmas)
    async function preencherDadosIniciais() { /* ...código sem alteração... */ }
    function configurarPagina(perfil, outro) { /* ...código sem alteração... */ }

    // --- EVENT LISTENERS ---
    document.getElementById("photo-upload").addEventListener("change", function(e) { /* ...código sem alteração... */ });

    // ✅✅✅ LÓGICA DE SUBMISSÃO TOTALMENTE ATUALIZADA PARA UPLOAD ASSINADO ✅✅✅
    document.getElementById("profileForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const submitButton = this.querySelector("button[type='submit']");
        const originalButtonText = submitButton.textContent;

        submitButton.disabled = true;
        submitButton.textContent = "Salvando...";

        const dadosDoFormulario = Object.fromEntries(new FormData(this).entries());
        dadosDoFormulario.profile_type = perfilSelecionado === 'outro' ? perfilOutro : perfilSelecionado;

        try {
            // --- ETAPA 1: UPLOAD DA FOTO (SE EXISTIR) ---
            const photoFile = document.getElementById('photo-upload').files[0];
            let photoUrl = null;

            if (photoFile) {
                submitButton.textContent = "Preparando foto...";

                // 1.1. Pedir a assinatura para o nosso backend
                const sigResponse = await fetch('/api/generate-upload-signature', { method: 'POST' });
                const sigData = await sigResponse.json();
                if (!sigData.success) throw new Error('Não foi possível obter permissão para o upload.');

                // 1.2. Preparar os dados para enviar ao Cloudinary
                const cloudinaryFormData = new FormData();
                cloudinaryFormData.append('file', photoFile);
                cloudinaryFormData.append('api_key', sigData.api_key);
                cloudinaryFormData.append('timestamp', sigData.timestamp);
                cloudinaryFormData.append('signature', sigData.signature);
                cloudinaryFormData.append('folder', sigData.folder); // Organiza em uma pasta

                submitButton.textContent = "Enviando foto...";

                // 1.3. Enviar a imagem DIRETO para o Cloudinary
                const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`;
                const cloudinaryResponse = await fetch(cloudinaryUrl, {
                    method: 'POST',
                    body: cloudinaryFormData,
                });
                const cloudinaryResult = await cloudinaryResponse.json();
                if (cloudinaryResult.error) throw new Error(cloudinaryResult.error.message);

                photoUrl = cloudinaryResult.secure_url; // Guarda a URL da foto
            }

            // Adiciona a URL da foto (se existir) aos dados a serem salvos
            if (photoUrl) {
                dadosDoFormulario.profile_picture_url = photoUrl;
            }

            // --- ETAPA 2: SALVAR DADOS DO PERFIL ---
            submitButton.textContent = "Finalizando...";
            const completeProfileResponse = await fetch('/api/complete-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dadosDoFormulario)
            });

            const completeProfileResult = await completeProfileResponse.json();
            if (!completeProfileResponse.ok) throw new Error(completeProfileResult.message);

            alert(completeProfileResult.message || "Perfil atualizado com sucesso!");
            window.location.href = "perfil.html";

        } catch (error) {
            console.error("Erro ao enviar dados:", error);
            alert("Erro: " + error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });

    // Cole aqui as funções preencherDadosIniciais e configurarPagina que não foram alteradas
    async function preencherDadosIniciais() {
        try {
            const response = await fetch('/api/get-profile-data', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success && result.user) {
                const user = result.user;
                document.getElementById('email').value = user.email || '';
                document.getElementById('telefone').value = user.phone_number || '';
            } else {
                console.warn(result.message || 'Não foi possível pré-carregar os dados do usuário.');
            }
        } catch (error) {
            console.error("Erro ao buscar dados iniciais:", error);
        }
    }

    function configurarPagina(perfil, outro) {
        const profileBadge = document.getElementById("profileBadge");
        const camposPais = document.getElementById("camposPais");
        const camposPaisSeparados = document.getElementById("camposPaisSeparados");
        const camposPaisJuntos = document.getElementById("camposPaisJuntos");
        const camposProfissionais = document.getElementById("camposProfissionais");

        [camposPais, camposPaisSeparados, camposPaisJuntos, camposProfissionais].forEach(el => {
            if (el) el.style.display = 'none';
        });

        const perfisPais = ["pai_separado", "mae_separada", "pai_junto", "mae_junta"];
        const perfisProfissionais = ["advogado", "psicologo", "juiz"];
        let badgeText = "Perfil";

        if (perfisPais.includes(perfil)) {
            camposPais.style.display = "block";
            badgeText = perfil.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (perfil === "pai_separado" || perfil === "mae_separada") {
                camposPaisSeparados.style.display = "block";
            } else if (perfil === "pai_junto" || perfil === "mae_junta") {
                camposPaisJuntos.style.display = "block";
            }
        } else if (perfisProfissionais.includes(perfil)) {
            camposProfissionais.style.display = "block";
            badgeText = perfil.charAt(0).toUpperCase() + perfil.slice(1);
        } else if (perfil === "outro") {
            badgeText = outro || "Outro";
        }
        profileBadge.textContent = badgeText;
    }
    
    document.getElementById("photo-upload").addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById("preview").src = event.target.result;
                document.getElementById("preview").style.display = "block";
                document.querySelector(".add-icon").style.display = "none";
            };
            reader.readAsDataURL(file);
        }
    });
});
// Adicione esta função em algum lugar do seu arquivo completar_perfil.js

/**
 * Função auxiliar para melhorar a seleção dos botões de rádio.
 * @param {string} radioId - O ID do input de rádio a ser marcado.
 */
function selectRadioOption(radioId) {
    const radio = document.getElementById(radioId);
    if (radio) {
        radio.checked = true;
        // Opcional: remover a classe 'selected' de outros e adicionar a este
        document.querySelectorAll('input[name="children_living_status"]').forEach(r => {
            r.closest('.profile-option').classList.remove('selected');
        });
        radio.closest('.profile-option').classList.add('selected');
    }
}
// Para que a função fique disponível no HTML, precisamos anexá-la ao objeto window.
window.selectRadioOption = selectRadioOption;
