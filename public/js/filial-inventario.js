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

    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    // Elementos dos Modais
    const selectionModal = document.getElementById('selectionModal');
    const detailsModal = document.getElementById('detailsModal');
    const detailsForm = document.getElementById('detailsModalForm');
    const selectionGrid = selectionModal ? selectionModal.querySelector('.selection-grid') : null;
    const detailsFormContainer = detailsModal ? detailsModal.querySelector('#formInputsContainer') : null;
    const serialSearchInput = document.getElementById('serialSearchInput');
    const statusFilter = document.getElementById('statusFilter'); // Voltamos para statusFilter
    const serialSearchList = document.getElementById('serialSearchList');
    let todosOsInsumos = [];
    
    // --- NAVEGAÇÃO ---
    if (btnVerVistorias) {
        btnVerVistorias.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = `vistorias.html?cnpj=${filialCnpj}`;
        });
    }





    if (btnGerarRelatorio) {
        btnGerarRelatorio.addEventListener('click', async () => {
            if (!filialCnpj) {
                alert('CNPJ da filial não encontrado. Não é possível gerar o relatório.');
                return;
            }

            const originalButtonText = btnGerarRelatorio.textContent;
            btnGerarRelatorio.disabled = true;
            btnGerarRelatorio.textContent = 'Gerando...';

            try {
                const response = await fetch(`/api/filiais/${filialCnpj}/report`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    // Tenta ler a mensagem de erro do backend se for JSON
                    let errorMsg = `Erro ${response.status}: ${response.statusText}`;
                    try {
                         const errorResult = await response.json();
                         errorMsg = errorResult.message || errorMsg;
                    } catch(e) { /* Ignora se não for JSON */ }
                    throw new Error(errorMsg);
                }

                // Recebe o PDF como Blob
                const blob = await response.blob();

                // Cria URL temporária para o Blob
                const url = window.URL.createObjectURL(blob);

                // Cria link temporário para iniciar download
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                // Define o nome do arquivo (pode ser pego do header Content-Disposition se o backend enviar)
                a.download = `Relatorio_Inventario_${filialCnpj}.pdf`; 
                document.body.appendChild(a);
                a.click();

                // Limpeza
                window.URL.revokeObjectURL(url);
                a.remove();

            } catch (error) {
                console.error('Erro ao gerar ou baixar relatório:', error);
                alert(`Não foi possível gerar o relatório: ${error.message}`);
            } finally {
                btnGerarRelatorio.disabled = false;
                btnGerarRelatorio.textContent = originalButtonText;
            }
        });
    }

    
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

            // --- INÍCIO DA CORREÇÃO ---
            // Adicionamos os atributos 'title' para o tooltip
            filialNameInfo.innerHTML = `<strong>EMPRESA:</strong> ${filial.nome}`;
            filialNameInfo.title = filial.nome; // Tooltip

            filialCnpjInfo.innerHTML = `<strong>CNPJ:</strong> ${filial.cnpj}`;
            // CNPJ não precisa de tooltip, pois já é formatado

            filialAddressInfo.innerHTML = `<strong>ENDEREÇO:</strong> ${filial.endereco}`;
            filialAddressInfo.title = filial.endereco; // Tooltip

            filialEmailInfo.innerHTML = `<strong>EMAIL:</strong> ${filial.email_responsavel}`;
            filialEmailInfo.title = filial.email_responsavel; // Tooltip
            // --- FIM DA CORREÇÃO ---

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

            todosOsInsumos = await response.json(); // Salva na variável global
            
            // --- INÍCIO DA LÓGICA DE POPULAR FILTROS ---
            
            const seriais = new Set();
            // Removemos 'locais' e 'tipos'

            todosOsInsumos.forEach(item => {
                if (item.numero_serial) seriais.add(item.numero_serial);
            });

            // 1. Popula o Datalist (sugestões) de Seriais
            if (serialSearchList) {
                serialSearchList.innerHTML = ''; // Limpa sugestões antigas
                seriais.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s;
                    serialSearchList.appendChild(option);
                });
            }

            // 2. A lógica de popular o Select de Status foi removida (é estático).
            
            // --- FIM DA LÓGICA DE POPULAR FILTROS ---

            // Chama aplicarFiltros() para renderizar a lista inicial (já ordenada)
            aplicarFiltros(); 

        } catch (error) {
            todosOsInsumos = []; // Limpa em caso de erro
            insumosGridDiv.innerHTML = `<p>${error.message}</p>`;
        }
    }

    /**
     * [ALTERADO] Adiciona o N° de Serial se o item for um extintor.
     */
            function createInsumoCard(item) {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            if (item.status) {
            card.classList.add(item.status);
            }
            
            // --- ALTERAÇÃO INICIA AQUI ---
            // Lógica condicional removida. O N° Serial agora é exibido para todos os itens.
            let serialHtml = '';
                    if (item.numero_serial) {
            serialHtml = `<p><strong>Nº Serial:</strong> ${item.numero_serial}</p>`;
                    } else {
            serialHtml = `<p><strong>Nº Serial:</strong> N/A</p>`;
                    }
            // --- ALTERAÇÃO TERMINA AQUI ---
            
            card.innerHTML = `
            <img src="${item.imagem || 'images/logotipo.png'}" alt="${item.descricao}">
            <h3>${item.descricao}</h3>
            ${serialHtml} <p><strong>Local:</strong> ${item.local || 'Não informado'}</p>
            <p><strong>Válido até:</strong> ${item.validade_formatada}</p>
            
            <div class="card-footer">
            <a href="insumo-detalhe.html?id=${item.codigo}" class="btn-details">Ver Detalhes</a>
            </div>
            `;
            return card;
            }

            function renderizarInsumos(listaInsumos) {
        if (!insumosGridDiv) return;
        insumosGridDiv.innerHTML = ''; // Limpa o grid

        if (listaInsumos.length === 0) {
            insumosGridDiv.innerHTML = '<p>Nenhum insumo encontrado para este filtro.</p>';
        } else {
            listaInsumos.forEach(item => {
                const card = createInsumoCard(item);
                insumosGridDiv.appendChild(card);
            });
        }
    }

    /**
     * [NOVA FUNÇÃO]
     * É chamada sempre que o usuário digita ou muda o filtro de status.
     */
function aplicarFiltros() {
        const termoBusca = serialSearchInput.value.toLowerCase();
        const status = statusFilter.value; // Voltamos para statusFilter

        let insumosFiltrados = todosOsInsumos;

        // 1. Filtra por Status (Select)
        if (status !== 'todos') {
            insumosFiltrados = insumosFiltrados.filter(item => item.status === status);
        }

        // 2. Filtra por Serial (Input: Apenas N° Serial)
        if (termoBusca) {
            insumosFiltrados = insumosFiltrados.filter(item => {
                const serial = item.numero_serial || '';
                return serial.toLowerCase().includes(termoBusca); 
            });
        }

        // 3. Ordena pela data de validade (MAIS PRÓXIMA PRIMEIRO - ASC)
        // Esta ordenação é aplicada a todos os resultados, como solicitado.
        insumosFiltrados.sort((a, b) => {
            // Usa a função parseDateAsLocal que já existe no seu arquivo
            const dateA = parseDateAsLocal(a.validade);
            const dateB = parseDateAsLocal(b.validade);

            // Itens sem data de validade (null) vão para o final
            if (dateA && dateB) return dateA - dateB; // Ordena da data mais antiga para a mais nova
            if (dateA) return -1; // dateA tem data, dateB não (A vem primeiro)
            if (dateB) return 1;  // dateB tem data, dateA não (B vem primeiro)
            return 0; // Ambos são null
        });

        // 4. Renderiza o resultado final
        renderizarInsumos(insumosFiltrados);
    }





        function closeModal() {
         if (selectionModal) selectionModal.style.display = 'none';
         if (detailsModal) detailsModal.style.display = 'none';
         if (detailsForm) detailsForm.reset(); 
         const serialDatalist = document.getElementById('serial-list-direto');
         if (serialDatalist) serialDatalist.innerHTML = '';
         const locationDatalist = document.getElementById('location-list-direto'); // Limpa locais
         if (locationDatalist) locationDatalist.innerHTML = ''; // Limpa locais
     }
// --- INÍCIO DA ADIÇÃO: LISTENERS DOS FILTROS (VERSÃO RESTAURADA) ---
    if (serialSearchInput) {
        serialSearchInput.addEventListener('input', aplicarFiltros); 
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', aplicarFiltros);
    }
    // --- FIM DA ADIÇÃO ---

    
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

    /**
     * [ALTERADO] Agora é 'async' e busca a lista de seriais para o autocomplete.
     */
async function fetchLocations(cnpj) {
        try {
            const response = await fetch(`/api/filiais/${cnpj}/locations`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.warn("Falha ao buscar locais:", error);
            return [];
        }
    }

                async function openDetailsModal(descricaoInsumo) {
                if (!detailsModal || !detailsFormContainer) {
                 console.error("Elementos do modal de detalhes não encontrados.");
                 return;
                }
                closeModal(); // Fecha outros modais se abertos
                detailsModal.querySelector('#detailsModalTitle').textContent = `Detalhes para: ${descricaoInsumo}`;

                const hoje = new Date().toISOString().split('T')[0];

                // --- BUSCA DADOS PARA AUTOCOMPLETE ---
                let seriais = [];
                let locais = [];

                // --- ALTERAÇÃO INICIA AQUI ---
                        // A condição "if includes('extintor')" foi REMOVIDA.
                        // Sempre busca seriais, pois todos os insumos agora os utilizam.
                if (filialCnpj) {
                try {
                const response = await fetch(`/api/insumos/filial/${filialCnpj}/seriais`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (response.ok) seriais = await response.json();
                } catch (error) { console.warn("Não foi possível carregar seriais:", error); }
                            
                            // Busca locais (lógica original mantida)
                locais = await fetchLocations(filialCnpj); // Usa a função helper
                }
                // --- ALTERAÇÃO TERMINA AQUI ---


                // --- MONTAGEM DO HTML ---
                let serialInputHtml = '';
                const serialDatalistId = 'serial-list-direto';
                let serialDatalistHtml = `<datalist id="${serialDatalistId}">`;
                seriais.forEach(s => { serialDatalistHtml += `<option value="${s}"></option>`; });
                serialDatalistHtml += '</datalist>';

                // --- ALTERAÇÃO INICIA AQUI ---
                        // A condição "if includes('extintor')" foi REMOVIDA.
                        // O campo N° Serial agora é padrão para todos os insumos.
                serialInputHtml = `
                <div class="form-group">
                <label for="numero_serial">Nº Serial (Obrigatório):</label> 
                <input type="text" id="numero_serial" name="numero_serial" list="${serialDatalistId}" autocomplete="off"> 
                </div>
                `;
                // --- ALTERAÇÃO TERMINA AQUI ---

                const locationDatalistId = 'location-list-direto';
                let locationDatalistHtml = `<datalist id="${locationDatalistId}">`;
                locais.forEach(l => { locationDatalistHtml += `<option value="${l}"></option>`; });
                locationDatalistHtml += '</datalist>';

                detailsFormContainer.innerHTML = `
                <input type="hidden" name="descricao" value="${descricaoInsumo}"> 
                ${serialInputHtml} 
                <div class="form-group">
                <label for="local">Localização (Obrigatório):</label>
                <input type="text" id="local" name="local" list="${locationDatalistId}" autocomplete="off"> </div>
                <div class="form-group">
                <label for="descricao_item">Descrição Adicional (Opcional):</label>
                <textarea id="descricao_item" name="descricao_item" rows="3" maxlength="255"></textarea>
                </div>
                <div class="form-group">
                <label for="validade">Data de Validade:</label>
                <input type="date" id="validade" name="validade" min="${hoje}">
                </div>
                ${serialDatalistHtml} 
                ${locationDatalistHtml} `;
                // --- FIM DA MONTAGEM ---

                // --- ANEXAR VALIDAÇÕES ---
                const serialInput = detailsFormContainer.querySelector('#numero_serial');
                const localInput = detailsFormContainer.querySelector('#local');
                const validadeInput = detailsFormContainer.querySelector('#validade');

                if (serialInput) {
                serialInput.addEventListener('blur', () => validateRequired(serialInput, 'Nº Serial'));
                }
                if (localInput) {
                localInput.addEventListener('blur', () => validateRequired(localInput, 'Localização'));
                }
                if (validadeInput) {
                 validadeInput.addEventListener('blur', () => validateDate(validadeInput));

                 validadeInput.addEventListener('input', () => {
                 const ano = validadeInput.value.split('-')[0];
                 if (ano && ano.length > 4) {
                 validadeInput.value = '';
                 }
                 });
                }
                detailsModal.style.display = 'flex';
                }

if (btnAdicionarInsumoDireto) {
        btnAdicionarInsumoDireto.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Botão Adicionar Insumo Direto clicado!"); 
            openCategorySelectionModal(); 
        });
    } else {
        console.error("Botão #btnAdicionarInsumoDireto não encontrado!"); 
    }
    if (detailsForm) {
        detailsForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // ESSENCIAL: Impede o reload da página

            // --- VALIDAR ANTES DE ENVIAR ---
            let isValid = true;
            const serialInput = detailsForm.querySelector('#numero_serial');
            const localInput = detailsForm.querySelector('#local');
            const validadeInput = detailsForm.querySelector('#validade');

            if (serialInput) {
                isValid = validateRequired(serialInput, 'Nº Serial') && isValid;
            }
            isValid = validateRequired(localInput, 'Localização') && isValid;
            isValid = validateDate(validadeInput) && isValid;

            if (!isValid) {
                return; // Impede o envio do formulário
            }
            // --- FIM DA VALIDAÇÃO ---
            
            const formData = new FormData(detailsForm);
            const data = Object.fromEntries(formData.entries());

            // --- Validações (Exemplo: data) ---
            if (data.validade) {
                const ano = data.validade.split('-')[0];
                if (ano.length !== 4) {
                    Notifier.showError('Ano da validade inválido. Use 4 dígitos.');
                    return; // Impede o envio
                }
                // A validação de data passada já foi feita pelo validateDate()
            }
            // --- Fim Validações ---


            // --- Envio para a API ---
            if (!filialCnpj) {
                 Notifier.showError("Erro crítico: CNPJ da filial não encontrado.");
                 return;
            }

            const saveButton = detailsForm.querySelector('.btn-save'); // Pega o botão de salvar
            if(saveButton) saveButton.disabled = true; // Desabilita durante o envio

            try {
                const response = await fetch(`/api/insumos/filial/${filialCnpj}/direto`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(data) // Envia os dados do formulário
                });

            const result = await response.json();
                if (!response.ok) throw new Error(result.message || `Erro ${response.status}`);
                
                Notifier.showSuccess(result.message || 'Insumo adicionado/atualizado com sucesso!'); // <--- SUBSTITUÍDO
                closeModal();           
                carregarInsumosGerais(); 

            } catch (error) {
                Notifier.showError(`Erro ao adicionar insumo: ${error.message}`); // <--- SUBSTITUÍDO
            } finally {
                 if(saveButton) saveButton.disabled = false; 
            }
        });
    } else {
        console.error("Elemento do formulário #detailsModalForm não encontrado!");
    }

    


    function inicializarPagina() {
        carregarDetalhesFilial();
        carregarInsumosGerais();
    }

    inicializarPagina();

    window.addEventListener('pageshow', function(event) {
        // 'persisted' é true se a página foi carregada do bfcache
        if (event.persisted) {
            console.log('Página carregada do cache. Recarregando dados...');
            inicializarPagina();
        }
    });
});

// A sua função atual (com o bug) se parece com isto:
function parseDateAsLocal(dateString) {
    if (!dateString) return null;

    // --- INÍCIO DA CORREÇÃO ---
    // O BD envia '2029-12-12T03:00:00.000Z'
    // Nós pegamos apenas a parte da data (antes do 'T')
    const dateOnly = dateString.split('T')[0];
    // --- FIM DA CORREÇÃO ---

    // Agora o teste regex original funciona com a data limpa
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) { 
        // O console.error que você está vendo
        console.error("Formato de data inválido recebido:", dateString); 
        return null;
    }
    
    const [year, month, day] = dateOnly.split('-').map(Number);
    // O mês em JavaScript é 0-indexado
    return new Date(year, month - 1, day); 
}


// --- FUNÇÕES AUXILIARES DE VALIDAÇÃO ---
function displayError(inputElement, message) {
    let errorDiv = inputElement.parentElement.querySelector('.field-error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'field-error-message';
        errorDiv.style.color = '#d32f2f';
        errorDiv.style.fontSize = '0.9em';
        errorDiv.style.marginTop = '5px';
        inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function clearError(inputElement) {
    let errorDiv = inputElement.parentElement.querySelector('.field-error-message');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
}

function validateRequired(inputElement, fieldName) {
    if (!inputElement || inputElement.value.trim() === '') {
        displayError(inputElement, `${fieldName} é obrigatório.`);
        return false;
    }
    clearError(inputElement);
    return true;
}

function validateDate(inputElement) {
    if (!inputElement || inputElement.value.trim() === '') {
        displayError(inputElement, 'Data de validade é obrigatória.');
        return false;
    }
    const hoje = new Date().toISOString().split('T')[0];
    if (inputElement.value < hoje) {
        displayError(inputElement, 'A data não pode ser anterior a hoje.');
        return false;
    }
    clearError(inputElement);
    return true;
}