document.addEventListener('DOMContentLoaded', function() {

    const token = localStorage.getItem('authToken');
    if (!token) {
        Notifier.showError('Sessão não encontrada. Por favor, faça o login novamente.');
        window.location.href = 'login.html';
        return;
    }

    fetch('http://localhost:3001/api/auth/meu-perfil', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Erro do servidor: ${response.statusText}`);
        return response.json();
    })
    .then(data => {
        document.getElementById('profile-name').textContent = data.name || 'Não informado';
        document.getElementById('profile-cpf-cnpj').textContent = data.cpf_cnpj || 'Não informado';
        document.getElementById('profile-email').textContent = data.email || 'Não informado';
    })
    .catch(error => {
        console.error("Erro ao carregar dados do perfil:", error);
        Notifier.showError('Não foi possível carregar os dados do perfil. ' + error.message);
        localStorage.removeItem('userRole');
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    });


    const modal = document.getElementById('editProfileModal');
    const modalTitle = document.getElementById('modalTitle');
    const formInputsContainer = document.getElementById('formInputsContainer');
    const modalForm = document.getElementById('modalForm');
    const closeModalBtn = document.querySelector('.modal-close-btn');
    const cancelBtn = document.querySelector('.btn-cancel');

    /**
     * @param {string} mode ('email' or 'password').
     */
    function openModal(mode) {
        formInputsContainer.innerHTML = '';
        let title = '', inputsHTML = '';

        if (mode === 'email') {
            title = 'Alterar E-mail';
            inputsHTML = `<div class="form-group"><label for="newEmail">Novo E-mail:</label><input type="email" id="newEmail" name="email"</div>`;
        } else if (mode === 'password') {
            title = 'Alterar Senha';
            inputsHTML = `
                <div class="form-group">
                    <label for="currentPassword">Senha Atual:</label>
                    <input type="password" id="currentPassword" name="senhaAtual">
                </div>
                <div class="form-group">
                    <label for="newPassword">Nova Senha (mínimo 8 caracteres):</label>
                    <input type="password" id="newPassword" name="novaSenha">
                </div>
                <div class="form-group">
                    <label for="confirmNewPassword">Confirmar Nova Senha:</label>
                    <input type="password" id="confirmNewPassword" name="confirmarNovaSenha">
                </div>
            `;
        }
        
        modalTitle.textContent = title;
        formInputsContainer.innerHTML = inputsHTML;

        modal.style.display = 'flex';
    }


    function closeModal() {
        const inputs = modalForm.querySelectorAll('input');
        inputs.forEach(input => clearError(input)); 
        modal.style.display = 'none';
        modalForm.reset();
    }
    
    document.querySelector('.action-btn-email')?.addEventListener('click', () => openModal('email'));
    document.querySelector('.action-btn-senha')?.addEventListener('click', () => openModal('password'));

    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

    modalForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        let isValid = true;
        let endpoint = '', requiresLogout = false;
        const data = Object.fromEntries(new FormData(modalForm).entries());

         if (modalTitle.textContent.includes('E-mail')) {
            isValid = validateEmail(document.getElementById('newEmail'));
            endpoint = 'http://localhost:3001/api/auth/perfil/email';
        } else if (modalTitle.textContent.includes('Senha')) {
            const novaSenhaInput = document.getElementById('newPassword');
            const confirmarSenhaInput = document.getElementById('confirmNewPassword');
            
            isValid = validatePasswordLength(novaSenhaInput);
            if (novaSenhaInput.value !== confirmarSenhaInput.value) {
                displayError(confirmarSenhaInput, 'As senhas não coincidem.');
                isValid = false;
            } else {
                if (isValid) clearError(confirmarSenhaInput);
            }
            endpoint = 'http://localhost:3001/api/auth/perfil/senha';
            requiresLogout = true;
        }

        if (!isValid) return;

        const saveButton = modalForm.querySelector('.btn-save');
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        try {
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            Notifier.showSuccess(result.message || "Operação realizada com sucesso!");
            
            setTimeout(() => {
                if (requiresLogout) {
                    localStorage.removeItem('userRole');
                    localStorage.removeItem('authToken');
                    window.location.href = 'login.html';
                } else {
                    window.location.reload();
                }
            }, 1500);

        } catch (error) {
            Notifier.showError(`Erro: ${error.message}`);
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar';
        }
    });
});