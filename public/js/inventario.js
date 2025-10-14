document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const filialCardsGrid = document.getElementById('filialCardsGrid');
    const btnAbrirModalFilial = document.getElementById('btnAbrirModalFilial');
    const modalNovaFilial = document.getElementById('modalNovaFilial');
    const formNovaFilial = document.getElementById('formNovaFilial');
    const filialCnpjInput = document.getElementById('filialCnpj');



    function displayError(inputElement, message) {

        let errorDiv = inputElement.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('error-message')) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.color = '#d32f2f';
            errorDiv.style.fontSize = '0.9em';
            errorDiv.style.marginTop = '5px';
            inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
        }
        errorDiv.textContent = message;
    }

    function clearError(inputElement) {
        let errorDiv = inputElement.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error-message')) {
            errorDiv.textContent = '';
        }
    }

    function validateCnpj(inputElement) {
        const cnpjValue = inputElement.value.trim().replace(/\D/g, '');
        if (cnpjValue.length !== 14) {
            displayError(inputElement, 'CNPJ deve conter 14 dígitos.');
            return false;
        }
        clearError(inputElement);
        return true;
    }

    function openModal() { modalNovaFilial.style.display = 'flex'; }
    function closeModal() { 
        modalNovaFilial.style.display = 'none'; 
        formNovaFilial.reset();
        clearError(filialCnpjInput);
    }

    btnAbrirModalFilial.addEventListener('click', openModal);
    modalNovaFilial.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    modalNovaFilial.querySelector('.btn-cancel').addEventListener('click', closeModal);


    filialCnpjInput.addEventListener('input', function(event) {
        let value = event.target.value.replace(/\D/g, '');
        if (value.length > 14) {
            value = value.substring(0, 14);
        }

        let formattedValue = '';
        if (value.length > 0) {
            formattedValue = value.substring(0, 2);
            if (value.length > 2) formattedValue += '.' + value.substring(2, 5);
            if (value.length > 5) formattedValue += '.' + value.substring(5, 8);
            if (value.length > 8) formattedValue += '/' + value.substring(8, 12);
            if (value.length > 12) formattedValue += '-' + value.substring(12, 14);
        }
        event.target.value = formattedValue;
        
        if (value.length < 14) {
            clearError(event.target);
        }
    });

    filialCnpjInput.addEventListener('blur', () => validateCnpj(filialCnpjInput));



    function createFilialCard(filial) {
        const cnpjFormatado = filial.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
        return `
            <div class="company-card">
                <div class="card-text-info">
                    <p class="institution-name">${filial.nome}</p>
                    <p class="company-cnpj">${cnpjFormatado}</p>
                    <p class="company-address">${filial.endereco}</p>
                    <div class="card-contact-section">
                        <p class="company-email">${filial.email_responsavel}</p>
                        <a href="filial-inventario.html?cnpj=${filial.cnpj}" class="btn-access-info">Acessar Inventário</a>
                    </div>
                </div>
            </div>
        `;
    }

    async function carregarFiliais() {
        filialCardsGrid.innerHTML = '<p>Carregando filiais...</p>';
        try {
            const response = await fetch('/api/filiais', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao carregar filiais.');
            const filiais = await response.json();
            filialCardsGrid.innerHTML = ''; 
            if (filiais.length === 0) {
                filialCardsGrid.innerHTML = '<p>Nenhuma filial cadastrada no momento.</p>';
            } else {
                filiais.forEach(filial => {
                    filialCardsGrid.insertAdjacentHTML('beforeend', createFilialCard(filial));
                });
            }
        } catch (error) {
            filialCardsGrid.innerHTML = `<p>Ocorreu um erro: ${error.message}</p>`;
        }
    }

    formNovaFilial.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!validateCnpj(filialCnpjInput)) {
            alert('Por favor, corrija o CNPJ antes de continuar.');
            return;
        }

        const formData = new FormData(formNovaFilial);
        const data = Object.fromEntries(formData.entries());
        data.cnpj = data.cnpj.replace(/\D/g, '');

        try {
            const response = await fetch('/api/filiais', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            alert('Filial cadastrada com sucesso!');
            closeModal();
            carregarFiliais();
        } catch (error) {
            alert(`Erro: ${error.message}`);
        }
    });

    carregarFiliais();
});