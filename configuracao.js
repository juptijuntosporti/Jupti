import { getProfileData, updateProfile, uploadImageToCloudinary } from './apiService.js';

document.addEventListener('DOMContentLoaded', function() {

    // ==================================================================
    // ✨ DECLARAÇÃO DE ELEMENTOS PRINCIPAIS
    // ==================================================================
    const editProfilePanel = document.getElementById('editProfilePanel');
    const mainContainer = document.querySelector('.glb-container');
    const mainHeader = document.querySelector('.glb-app-header');
    const settingsList = document.querySelector('.glb-profile-settings-list');

    // ==================================================================
    // ✨ LÓGICA DE PRÉ-VISUALIZAÇÃO E REMOÇÃO DE IMAGENS
    // ==================================================================
    function previewImage(event, previewElementId) {
        const input = event.target;
        const preview = document.getElementById(previewElementId);
        if (input.files && input.files[0] && preview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.dataset.removed = 'false';
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    document.getElementById('avatar-photo-upload')?.addEventListener('change', (event) => previewImage(event, 'editAvatarPreview'));
    document.getElementById('cover-photo-upload')?.addEventListener('change', (event) => previewImage(event, 'editCoverPreview'));

    document.getElementById('removeAvatarBtn')?.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja remover sua foto de perfil?')) {
            document.getElementById('editAvatarPreview').src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            document.getElementById('avatar-photo-upload').value = '';
            document.getElementById('editAvatarPreview').dataset.removed = 'true';
        }
    });

    document.getElementById('removeCoverBtn')?.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja remover sua foto de capa?')) {
            document.getElementById('editCoverPreview').src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            document.getElementById('cover-photo-upload').value = '';
            document.getElementById('editCoverPreview').dataset.removed = 'true';
        }
    });

    // ==================================================================
    // ✨ LÓGICA DE NAVEGAÇÃO E CONFIGURAÇÕES
    // ==================================================================
    document.getElementById('backButton')?.addEventListener('click', () => {
        window.location.href = 'perfil.html';
    });

    if (settingsList) {
        settingsList.addEventListener('click', function(e) {
            const settingItem = e.target.closest('.glb-profile-setting-item');
            if (!settingItem) return;
            const settingAction = settingItem.dataset.setting;
            handleSettingAction(settingAction);
        });
    }

    // ✅ VERSÃO NOVA (com o link)

function handleSettingAction(action) {
    switch (action) {
        case 'edit-profile': 
            openEditPanel(); 
            break;
        case 'logout':
            if (confirm('Você tem certeza que deseja sair?')) {
                localStorage.removeItem('authTokenJUPTI');
                alert('Você foi desconectado. Até a próxima!');
                window.location.href = 'index.html';
            }
            break;
        case 'privacy': // 👈 ALTERAÇÃO APLICADA AQUI
            window.location.href = 'privacidade.html'; // Redireciona para a nova página
            break;
        case 'account':
            // Futuramente, podemos criar a página 'conta.html' e colocar o link aqui
            alert('Funcionalidade de Configurações da Conta será implementada em breve!');
            break;
        default: 
            alert(`Funcionalidade "${action}" será implementada aqui!`);
    }
}


    // ==================================================================
    // ✨ LÓGICA DO PAINEL DE EDIÇÃO
    // ==================================================================
    async function openEditPanel() {
        if (!editProfilePanel || !mainContainer || !mainHeader) return;

        mainContainer.style.display = 'none';
        mainHeader.style.display = 'none';
        editProfilePanel.style.display = 'flex';
        setTimeout(() => editProfilePanel.classList.add('active'), 10);

        try {
            const result = await getProfileData();
            if (result.success && result.user) {
                const user = result.user;
                
                document.getElementById('editUsername').value = user.username || '';
                document.getElementById('editBio').value = user.bio || '';
                
                const avatarPreview = document.getElementById('editAvatarPreview');
                avatarPreview.src = user.profile_picture_url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                avatarPreview.dataset.removed = 'false';

                const coverPreview = document.getElementById('editCoverPreview');
                coverPreview.src = user.cover_picture_url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                coverPreview.dataset.removed = 'false';

                const profileMap = {
                    'pai_separado': 'Pai Separado', 'mae_separada': 'Mãe Separada',
                    'pai_junto': 'Pai', 'mae_junta': 'Mãe',
                    'advogado': 'Advogado(a)', 'psicologo': 'Psicólogo(a)', 'juiz': 'Juiz(a)'
                };
                const userRole = profileMap[user.profile_type] || user.profile_type || "Não definido";
                
                document.getElementById('editProfileType').textContent = userRole;
                document.getElementById('editLocation').textContent = `${user.city || 'Cidade'}, ${user.state || 'UF'}`;

                updateEyeIcon('profile_type_visible', user.profile_type_visible);
                updateEyeIcon('location_visible', user.location_visible);
            }
        } catch (error) {
            alert('Não foi possível carregar seus dados para edição. Tente novamente.');
            closeEditPanel();
        }
    }

    function closeEditPanel() {
        if (!editProfilePanel || !mainContainer || !mainHeader) return;

        editProfilePanel.classList.remove('active');
        setTimeout(() => {
            editProfilePanel.style.display = 'none';
            mainContainer.style.display = 'block';
            mainHeader.style.display = 'flex';
        }, 300);
    }

    document.getElementById('backToConfigBtn')?.addEventListener('click', closeEditPanel);

    // ==================================================================
    // ✨ LÓGICA DE VISIBILIDADE (OLHO)
    // ==================================================================
    function updateEyeIcon(fieldName, isVisible) {
        const eyeIcon = document.querySelector(`.pus-visibility-toggle[data-field="${fieldName}"]`);
        if (eyeIcon) {
            const isActuallyVisible = isVisible !== false;
            if (isActuallyVisible) {
                eyeIcon.classList.remove('hidden', 'fa-eye-slash');
                eyeIcon.classList.add('fa-eye');
            } else {
                eyeIcon.classList.add('hidden', 'fa-eye-slash');
                eyeIcon.classList.remove('fa-eye');
            }
        }
    }

    editProfilePanel?.addEventListener('click', function(e) {
        if (e.target.matches('.pus-visibility-toggle')) {
            const icon = e.target;
            const field = icon.dataset.field;
            const isCurrentlyVisible = !icon.classList.contains('hidden');
            updateEyeIcon(field, !isCurrentlyVisible);
        }
    });

    // ==================================================================
    // ✨ LÓGICA DE SALVAMENTO DO PERFIL
    // ==================================================================
    async function saveProfileChanges() {
        const saveBtn = document.getElementById('saveProfileChangesBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Salvando...';
        }

        try {
            const profileData = {
                username: document.getElementById('editUsername').value.trim(),
                bio: document.getElementById('editBio').value.trim()
            };

            if (!profileData.username) {
                throw new Error('O nome de usuário é obrigatório.');
            }

            const avatarPreview = document.getElementById('editAvatarPreview');
            const avatarInput = document.getElementById('avatar-photo-upload');

            if (avatarPreview.dataset.removed === 'true') {
                profileData.profile_picture_url = null;
            } else if (avatarInput.files.length > 0) {
                profileData.profile_picture_url = await uploadImageToCloudinary(avatarInput.files[0], 'jupti/avatars');
            }

            const coverPreview = document.getElementById('editCoverPreview');
            const coverInput = document.getElementById('cover-photo-upload');

            if (coverPreview.dataset.removed === 'true') {
                profileData.cover_picture_url = null;
            } else if (coverInput.files.length > 0) {
                profileData.cover_picture_url = await uploadImageToCloudinary(coverInput.files[0], 'jupti/covers');
            }

            const profileTypeEye = document.querySelector('.pus-visibility-toggle[data-field="profile_type_visible"]');
            if (profileTypeEye) {
                profileData.profile_type_visible = !profileTypeEye.classList.contains('hidden');
            }
            
            const locationEye = document.querySelector('.pus-visibility-toggle[data-field="location_visible"]');
            if (locationEye) {
                profileData.location_visible = !locationEye.classList.contains('hidden');
            }

            const result = await updateProfile(profileData);

            if (result.success) {
                alert('✅ Perfil atualizado com sucesso!');
                
                avatarPreview.dataset.removed = 'false';
                coverPreview.dataset.removed = 'false';
                
                // Redireciona para a página de perfil após salvar
                window.location.href = 'perfil.html';
            } else {
                throw new Error(result.message || 'Falha ao atualizar o perfil.');
            }

        } catch (error) {
            alert(`❌ Erro ao salvar perfil: ${error.message}`);
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Salvar';
            }
        }
    }

    document.getElementById('saveProfileChangesBtn')?.addEventListener('click', saveProfileChanges);

});

