document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const cpfCnpjInput = document.getElementById('cpfcnpj');
    const senhaLoginInput = document.getElementById('senhalogin');
    const loginButton = document.querySelector('.login-button');
    const togglePassword = document.getElementById('togglePassword');

    let notificationDiv = null;


    function showNotification(message, type) {
        if (notificationDiv) {
            notificationDiv.remove();
        }
        notificationDiv = document.createElement('div');
        notificationDiv.className = `notification-message ${type}`;
        notificationDiv.textContent = message;
        document.body.appendChild(notificationDiv);
        setTimeout(() => {
            if (notificationDiv) notificationDiv.remove();
        }, 3000);
    }

    function displayError(inputElement, message) {
        const errorDiv = inputElement.parentElement.querySelector('.field-error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    function clearError(inputElement) {
        const errorDiv = inputElement.parentElement.querySelector('.field-error-message');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
    }

    function validateRequired(inputElement, fieldName) {
        if (inputElement.value.trim() === '') {
            displayError(inputElement, `${fieldName} é obrigatório.`);
            return false;
        }
        clearError(inputElement);
        return true;
    }
    

    function validateLoginSenha(inputElement) {
        if (inputElement.value.length < 8) {
            displayError(inputElement, 'A senha deve ter no mínimo 8 caracteres.');
            return false;
        }
        clearError(inputElement);
        return true;
    }

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
            showNotification('Por favor, corrija os erros para continuar.', 'error');
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
                showNotification(data.message || 'Login realizado com sucesso!', 'success');
                localStorage.setItem('authToken', data.token);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                throw new Error(data.message || 'Credenciais inválidas.');
            }
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Logar';
        }
    });


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