document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const cpfCnpjInput = document.getElementById('cpfcnpj');
    const senhaLoginInput = document.getElementById('senhalogin');
    const loginButton = document.querySelector('.login-button');
    const togglePassword = document.getElementById('togglePassword');

    /**
     * @param {HTMLElement} inputElement
     * @returns {boolean}
     */
    
     //Valida senha mínimo de 8 caracteres.
    function validateLoginSenha(inputElement) {
        if (inputElement.value.length < 8) {
            displayError(inputElement, 'A senha deve ter no mínimo 8 caracteres.');
            return false;
        }
        clearError(inputElement);
        return true;
    }

    //formata o cnpj 14 digits
    cpfCnpjInput.addEventListener('input', function(event) {
        let value = event.target.value.replace(/\D/g, '');
        if (value.length > 14) {
            value = value.substring(0, 14);
        }
        event.target.value = value;
        clearError(event.target);
    });

    togglePassword.addEventListener('click', function() {
        const type = senhaLoginInput.getAttribute('type') === 'password' ? 'text' : 'password';
        senhaLoginInput.setAttribute('type', type);
        togglePassword.src = type === 'password' ? 'images/Olho coberto.png' : 'images/Olho descoberto.png';
    });

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        let isValid = true;
        const cleanCnpj = cpfCnpjInput.value.replace(/\D/g, '');

        if (!validateRequired(cpfCnpjInput, 'CNPJ')) {
            isValid = false;
        } else if (cleanCnpj.length !== 14) {
            displayError(cpfCnpjInput, 'O CNPJ deve ter 14 dígitos.');
            isValid = false;
        } else {
            clearError(cpfCnpjInput);
        }

        if (!validateLoginSenha(senhaLoginInput)) {
            isValid = false;
        }

        if (!isValid) {
            Notifier.showError('Por favor, corrija os erros para continuar.');
            return;
        }

        const cpfCnpj = cleanCnpj;
        const senha = senhaLoginInput.value;

        loginButton.disabled = true;
        loginButton.textContent = 'Verificando...';

        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpfCnpj, senha })
            });

            const data = await response.json();

            if (response.ok) {
                Notifier.showSuccess(data.message || 'Login realizado com sucesso!');
                localStorage.setItem('authToken', data.token);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                throw new Error(data.message || 'Credenciais inválidas.');
            }
        } catch (error) {
            Notifier.showError(error.message);
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Logar';
        }
    });

    //valida o cnpj quando sai do campo
    cpfCnpjInput.addEventListener('blur', function() {
        if (cpfCnpjInput.value.trim() !== '') {
            const cleanValue = cpfCnpjInput.value.replace(/\D/g, '');
            if (cleanValue.length !== 14) {
                displayError(cpfCnpjInput, 'O CNPJ deve ter 14 dígitos.');
            } else {
                clearError(cpfCnpjInput);
            }
        }
    });

    senhaLoginInput.addEventListener('blur', () => validateLoginSenha(senhaLoginInput));
});