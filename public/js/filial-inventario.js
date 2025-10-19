document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const filialCnpj = urlParams.get('cnpj');

    if (!filialCnpj) {
        document.querySelector('main').innerHTML = '<h1>Erro: CNPJ da filial não fornecido na URL.</h1>';
        return;
    }

    // --- ELEMENTOS DO DOM ---
    const filialNameInfo = document.getElementById('filial-name-info');
    const filialCnpjInfo = document.getElementById('filial-cnpj-info');
    const filialAddressInfo = document.getElementById('filial-address-info');
    const filialEmailInfo = document.getElementById('filial-email-info');
    const insumosGridDiv = document.getElementById('insumos-gerais-grid');
    const btnVerVistorias = document.getElementById('btnVerVistorias');
    const btnAdicionarInsumoDireto = document.getElementById('btnAdicionarInsumoDireto');

    // Elementos dos Modais
    const selectionModal = document.getElementById('selectionModal');
    const detailsModal = document.getElementById('detailsModal');
    const detailsForm = document.getElementById('detailsModalForm');
    // Verifica se os elementos do modal existem antes de tentar acessá-los
    const selectionGrid = selectionModal ? selectionModal.querySelector('.selection-grid') : null;
    const detailsFormContainer = detailsModal ? detailsModal.querySelector('#formInputsContainer') : null;
    
    // --- NAVEGAÇÃO ---
    if (btnVerVistorias) {
        btnVerVistorias.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = `vistorias.html?cnpj=${filialCnpj}`;
        });
    }

    // --- FUNÇÕES PARA CARREGAR DADOS ---
    async function carregarDetalhesFilial() {
        if (!filialNameInfo || !filialCnpjInfo || !filialAddressInfo || !filialEmailInfo) {
             console.error("Elementos DOM para detalhes da filial não encontrados.");
             return;
        }
        try {
            const response = await fetch(`/api/filiais/${filialCnpj}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Filial não encontrada.');
            const filial = await response.json();
            
            document.title = `Inventário: ${filial.nome}`;
            filialNameInfo.innerHTML = `<strong>EMPRESA:</strong> ${filial.nome}`;
            filialCnpjInfo.innerHTML = `<strong>CNPJ:</strong> ${filial.cnpj}`;
            filialAddressInfo.innerHTML = `<strong>ENDEREÇO:</strong> ${filial.endereco}`;
            filialEmailInfo.innerHTML = `<strong>EMAIL:</strong> ${filial.email_responsavel}`;
        } catch (error) {
            document.querySelector('main').innerHTML = `<h1>${error.message}</h1>`;
        }
    }

    async function carregarInsumosGerais() {
        if (!insumosGridDiv) {
            console.error("Elemento DOM para grid de insumos não encontrado.");
            return;
        }
        insumosGridDiv.innerHTML = '<p>Carregando insumos...</p>';
        try {
            const response = await fetch(`/api/insumos/filial/${filialCnpj}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao carregar os insumos.');

            const inventario = await response.json();
            insumosGridDiv.innerHTML = '';
            
            if (inventario.length === 0) {
                insumosGridDiv.innerHTML = '<p>Nenhum insumo geral cadastrado para esta filial.</p>';
            } else {
                inventario.forEach(item => {
                    const card = createInsumoCard(item);
                    insumosGridDiv.appendChild(card);
                });
            }
        } catch (error) {
            insumosGridDiv.innerHTML = `<p>${error.message}</p>`;
        }
    }

function createInsumoCard(item) {
    const card = document.createElement('div');
    card.className = 'product-card';

    if (item.status) {
        card.classList.add(item.status);
    }

    card.innerHTML = `
        <img src="${item.imagem || 'images/logotipo.png'}" alt="${item.descricao}">
        <h3>${item.descricao}</h3>
        <p><strong>Local:</strong> ${item.local || 'Não informado'}</p>
        <p><strong>Válido até:</strong> ${item.validade_formatada}</p>
        
        <div class="card-footer">
            <a href="insumo-detalhe.html?id=${item.codigo}" class="btn-details">Ver Detalhes</a>
        </div>
    `;
    return card;
}

    // --- LÓGICA DOS MODAIS (REUTILIZADA E ADAPTADA) ---

    function closeModal() {
        if (selectionModal) selectionModal.style.display = 'none';
        if (detailsModal) detailsModal.style.display = 'none';
        if (detailsForm) detailsForm.reset(); // Limpa o formulário ao fechar
    }
    // Adiciona listeners aos botões de fechar/cancelar dos dois modais, verificando se existem
    document.querySelectorAll('#selectionModal .modal-close-btn, #selectionModal .btn-cancel, #detailsModal .modal-close-btn, #detailsModal .btn-cancel')
        .forEach(btn => btn?.addEventListener('click', closeModal));

    async function openCategorySelectionModal() {
        if (!selectionModal || !selectionGrid) {
            console.error("Elementos do modal de seleção não encontrados.");
            return;
        }
        try {
            const response = await fetch('/api/insumos/tipos', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao buscar tipos de insumo.');
            const tiposDeInsumo = await response.json();
            
            selectionGrid.innerHTML = ''; // Limpa o grid
            tiposDeInsumo.forEach(tipo => {
                const card = document.createElement('div');
                card.className = 'insumo-card-select';
                card.innerHTML = `
                    <img src="${tipo.imagem || 'images/logotipo.png'}" alt="${tipo.descricao}">
                    <h3>${tipo.descricao}</h3>
                `;
                card.addEventListener('click', () => openDetailsModal(tipo.descricao));
                selectionGrid.appendChild(card);
            });
            selectionModal.style.display = 'flex';
        } catch (error) {
            alert('Erro ao carregar os tipos de insumo: ' + error.message);
        }
    }

    function openDetailsModal(descricaoInsumo) {
        if (!detailsModal || !detailsFormContainer) {
             console.error("Elementos do modal de detalhes não encontrados.");
             return;
        }
        closeModal(); // Fecha o modal de seleção se estiver aberto
        detailsModal.querySelector('#detailsModalTitle').textContent = `Detalhes para: ${descricaoInsumo}`;
        
        const hoje = new Date().toISOString().split('T')[0]; // Para validação de data

        detailsFormContainer.innerHTML = `
            <input type="hidden" name="descricao" value="${descricaoInsumo}"> 
            <div class="form-group">
                <label for="local">Localização (Obrigatório):</label>
                <input type="text" id="local" name="local" required>
            </div>
            <div class="form-group">
                <label for="descricao_item">Descrição Adicional (Opcional):</label>
                <textarea id="descricao_item" name="descricao_item" rows="3" maxlength="255"></textarea>
            </div>
            <div class="form-group">
                <label for="validade">Data de Validade:</label>
                <input type="date" id="validade" name="validade" min="${hoje}">
            </div>
        `;
        
        // Adiciona validação de ano na data
        const validadeInput = detailsFormContainer.querySelector('#validade');
        if (validadeInput) {
            validadeInput.addEventListener('input', () => {
                const ano = validadeInput.value.split('-')[0];
                if (ano && ano.length > 4) {
                    alert('O ano deve ter no máximo 4 dígitos.');
                    validadeInput.value = '';
                }
            });
        }

        detailsModal.style.display = 'flex';
    }

    // Event listener para o botão "+ Insumo Direto"
    if (btnAdicionarInsumoDireto) {
        btnAdicionarInsumoDireto.addEventListener('click', (e) => {
            e.preventDefault();
            openCategorySelectionModal();
        });
    }

    // Event listener para o SUBMIT do formulário de detalhes
    if (detailsForm) {
        detailsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(detailsForm);
            const data = Object.fromEntries(formData.entries());

            // Validações extras (ano e data não passada)
            if (data.validade) {
                const ano = data.validade.split('-')[0];
                if (ano.length !== 4) {
                    alert('Ano da validade inválido. Use 4 dígitos.');
                    return;
                }
                const hoje = new Date().toISOString().split('T')[0];
                if (data.validade < hoje) {
                    alert('A data de validade não pode ser anterior à data atual.');
                    return;
                }
            }

            try {
                // Chama a rota '/direto' para adição sem vistoria
                const response = await fetch(`/api/insumos/filial/${filialCnpj}/direto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                alert(result.message);
                closeModal();
                carregarInsumosGerais(); // Recarrega a lista

            } catch (error) {
                alert(`Erro ao adicionar insumo: ${error.message}`);
            }
        });
    }

    // --- INICIALIZAÇÃO ---
    carregarDetalhesFilial();
    carregarInsumosGerais();
});

// Função utilitária para parsear data (DEVE EXISTIR NO ARQUIVO)
function parseDateAsLocal(dateString) {
    if (!dateString) return null;
    // Verifica se a string está no formato esperado AAAA-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        console.error("Formato de data inválido recebido:", dateString);
        return null; // Retorna nulo se o formato for inesperado
    }
    const [year, month, day] = dateString.split('-').map(Number);
    // Cria a data no fuso horário local
    return new Date(year, month - 1, day); 
}