document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const vistoriaId = urlParams.get('id');

    if (!vistoriaId) {
        document.querySelector('main').innerHTML =
            '<h1>Erro: ID da vistoria não fornecido.</h1>';
        return;
    }

    const vistoriaTitle = document.getElementById('vistoria-title');
    const vistoriaInfoDiv = document.getElementById('vistoria-info');
    const insumosGrid = document.getElementById('insumos-vistoria-grid');
    const btnAdicionarInsumo = document.getElementById('btnAdicionarInsumo');
    const btnFinalizarVistoria = document.getElementById('btnFinalizarVistoria');
    const btnVoltarPagina = document.getElementById('btnVoltarPagina');

    const selectionModal = document.getElementById('selectionModal');
    const detailsModal = document.getElementById('detailsModal');
    const detailsForm = document.getElementById('detailsModalForm');

    const confirmFinalizarModal = document.getElementById('confirmFinalizarModal');
    const confirmFinalizarCancelBtn = document.getElementById(
        'confirmFinalizarCancelBtn'
    );
    const confirmFinalizarConfirmBtn = document.getElementById(
        'confirmFinalizarConfirmBtn'
    );
    const confirmFinalizarCloseBtn = document.getElementById(
        'confirmFinalizarCloseBtn'
    );

    const confirmExcluirItemModal = document.getElementById('confirmExcluirItemModal');
    const confirmExcluirItemCancelBtn = document.getElementById('confirmExcluirItemCancelBtn');
    const confirmExcluirItemConfirmBtn = document.getElementById('confirmExcluirItemConfirmBtn');
    const confirmExcluirItemCloseBtn = document.getElementById('confirmExcluirItemCloseBtn');
    let itemParaExcluirId = null;

    let filialCnpjGlobal = null;
    let isVistoriaAberta = true;

    async function carregarDadosVistoria() {
        try {
            const response = await fetch(`/api/vistorias/${vistoriaId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Vistoria não encontrada.');
            const { detalhes, insumos } = await response.json();

            filialCnpjGlobal = detalhes.filial_cnpj;

            if (btnVoltarPagina) {
                btnVoltarPagina.href = `vistorias.html?cnpj=${filialCnpjGlobal}`;
            }

            isVistoriaAberta = detalhes.data_fim === null;

            const dataInicio = new Date(
                detalhes.data_inicio
            ).toLocaleDateString();
            vistoriaTitle.textContent = `Vistoria #${detalhes.codigo}`;
            vistoriaInfoDiv.innerHTML = `
                <p><strong>Técnico:</strong> ${detalhes.tecnico_responsavel}</p>
                <p><strong>Data de Início:</strong> ${dataInicio}</p>
                <p><strong>Status:</strong> ${
                    isVistoriaAberta ? 'Em Andamento' : 'Finalizada'
                }</p>
            `;

            if (!isVistoriaAberta) {
                if (btnAdicionarInsumo) btnAdicionarInsumo.style.display = 'none';
                if (btnFinalizarVistoria) btnFinalizarVistoria.style.display = 'none';
            }

            insumosGrid.innerHTML = '';
            if (insumos.length === 0) {
                insumosGrid.innerHTML =
                    '<p>Nenhum insumo registrado nesta vistoria ainda.</p>';
            } else {
                insumos.forEach((item) => {
                    insumosGrid.appendChild(createInsumoCard(item, isVistoriaAberta));
                });
            }
        } catch (error) {
            document.querySelector('main').innerHTML = `<h1>${error.message}</h1>`;
        }
    }

    function createInsumoCard(item, isAberta) {
        const card = document.createElement('div');
        card.className = 'product-card';
        let statusClass = 'status-ok';
        let validadeFormatada =
            item.validade_formatada || formatDateForClient(item.validade) || 'N/A';
        if (item.validade) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const dataValidade = parseDateAsLocal(item.validade);
            if (dataValidade) {
                const diffTime = dataValidade - hoje;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                    statusClass = 'status-expired';
                } else if (diffDays <= 30) {
                    statusClass = 'status-warning';
                }
            } else {
                validadeFormatada = 'Data Inválida';
            }
        }
        card.classList.add(statusClass);
        let cardTitle = '';
        if (item.numero_serial && item.numero_serial.trim() !== '') {
            cardTitle = `Serial: ${item.numero_serial}`;
        } else {
            cardTitle = item.tipo_insumo || 'Insumo';
        }
        const imageUrl = item.imagem || 'images/logotipo.png';

        let deleteButtonHtml = '';
        if (isAberta && item.codigo) {
        deleteButtonHtml = `
                <a href="#" class="btn-access-info btn-danger btn-excluir-historico"
                        data-id="${item.codigo}" 
                        data-serial="${item.numero_serial || 'Item'}"
                        style="width: 100%; box-sizing: border-box; text-align: center; cursor: pointer; margin-top: 10px; display: inline-block; text-decoration: none;">
                    Excluir da Vistoria
                </a>
            `;
        }

        card.innerHTML = `
            <img src="${imageUrl}" alt="${
                item.tipo_insumo || 'Insumo'
            }" style="width: 100px; height: 80px; object-fit: contain; margin-bottom: 15px;">
            <h3>${cardTitle}</h3>
            ${
                item.numero_serial &&
                item.numero_serial.trim() !== '' &&
                item.tipo_insumo
                    ? `<p style="font-size: 0.9em; color: #555;">(${item.tipo_insumo})</p>`
                    : ''
            }
            <p><strong>Local:</strong> ${item.local || 'Não informado'}</p>
            <p><strong>Válido até:</strong> ${validadeFormatada}</p>
            ${deleteButtonHtml}
        `;
        return card;
    }

    function closeModal(modalElement) {
        if (modalElement) modalElement.style.display = 'none';
        if (modalElement === detailsModal) {
            const serialDatalist = document.getElementById('serial-list-vistoria');
            if (serialDatalist) serialDatalist.innerHTML = '';
            const locationDatalist = document.getElementById(
                'location-list-vistoria'
            );
            if (locationDatalist) locationDatalist.innerHTML = '';
        }
         if (modalElement === confirmExcluirItemModal) {
             itemParaExcluirId = null;
             if(confirmExcluirItemConfirmBtn) {
                 confirmExcluirItemConfirmBtn.disabled = false;
                 confirmExcluirItemConfirmBtn.textContent = 'Confirmar Exclusão';
             }
         }
         // Adicionado reset para o modal de finalizar também
         if (modalElement === confirmFinalizarModal) {
            if(confirmFinalizarConfirmBtn) {
                confirmFinalizarConfirmBtn.disabled = false;
                confirmFinalizarConfirmBtn.textContent = 'Sim (Confirmar)';
            }
         }
    }

    document
        .querySelectorAll(
            '#selectionModal .modal-close-btn, #selectionModal .btn-cancel'
        )
        .forEach((btn) =>
            btn?.addEventListener('click', () => closeModal(selectionModal))
        );
    document
        .querySelectorAll(
            '#detailsModal .modal-close-btn, #detailsModal .btn-cancel'
        )
        .forEach((btn) =>
            btn?.addEventListener('click', () => closeModal(detailsModal))
        );

    // FUNÇÃO closeConfirmFinalizarModal DECLARADA AQUI
    function closeConfirmFinalizarModal() {
        closeModal(confirmFinalizarModal); // Reutiliza a lógica genérica de fechar e resetar
    }

    // Listeners que USAM closeConfirmFinalizarModal
    if (confirmFinalizarCancelBtn)
        confirmFinalizarCancelBtn.addEventListener(
            'click',
            closeConfirmFinalizarModal // Agora a função existe
        );
    if (confirmFinalizarCloseBtn)
        confirmFinalizarCloseBtn.addEventListener(
            'click',
            closeConfirmFinalizarModal // Agora a função existe
        );

    // Fechar ao clicar fora
     window.addEventListener('click', (event) => {
         if (event.target === confirmFinalizarModal) closeConfirmFinalizarModal(); // Agora a função existe
         if (event.target === selectionModal) closeModal(selectionModal);
         if (event.target === detailsModal) closeModal(detailsModal);
         if (event.target === confirmExcluirItemModal) closeModal(confirmExcluirItemModal);
     });


    async function fetchLocations(cnpj) {
        try {
            const response = await fetch(`/api/filiais/${cnpj}/locations`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.warn('Falha ao buscar locais:', error);
            return [];
        }
    }
async function openDetailsModal(descricaoInsumo) {
        closeModal(selectionModal);
        detailsModal.querySelector('#detailsModalTitle').textContent =
            `Detalhes para: ${descricaoInsumo}`;
        const formContainer = detailsModal.querySelector('#formInputsContainer');
        const hoje = new Date().toISOString().split('T')[0];

        let seriais = [];
        let locais = [];

        // --- ALTERAÇÃO INICIA AQUI ---
        // A condição "if includes('extintor')" foi REMOVIDA.
        // Sempre busca seriais, pois todos os insumos agora os utilizam.
        if (filialCnpjGlobal) {
            try {
                const response = await fetch(
                    `/api/insumos/filial/${filialCnpjGlobal}/seriais`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (response.ok) seriais = await response.json();
            } catch (error) {
                console.warn('Não foi possível carregar seriais:', error);
            }
            // Busca locais (lógica original mantida)
            locais = await fetchLocations(filialCnpjGlobal);
        }
        // --- ALTERAÇÃO TERMINA AQUI ---

        let serialInputHtml = '';
        const serialDatalistId = 'serial-list-vistoria';
        let serialDatalistHtml = `<datalist id="${serialDatalistId}">`;
        seriais.forEach((s) => {
            serialDatalistHtml += `<option value="${s}"></option>`;
        });
        serialDatalistHtml += '</datalist>';

        // --- ALTERAÇÃO INICIA AQUI ---
        // A condição "if includes('extintor')" foi REMOVIDA.
        // O campo N° Serial agora é padrão para todos os insumos.
        serialInputHtml = `
            <div class="form-group">
                <label for="numero_serial">Nº Serial (Obrigatório):</label>
                <input type="text" id="numero_serial" name="numero_serial"
                       list="${serialDatalistId}" autocomplete="off">
            </div>
        `;
        // --- ALTERAÇÃO TERMINA AQUI ---

        const locationDatalistId = 'location-list-vistoria';
        let locationDatalistHtml = `<datalist id="${locationDatalistId}">`;
        locais.forEach((l) => {
            locationDatalistHtml += `<option value="${l}"></option>`;
        });
        locationDatalistHtml += '</datalist>';

        formContainer.innerHTML = `
            <input type="hidden" name="descricao" value="${descricaoInsumo}">
            ${serialInputHtml}
            <div class="form-group">
                <label for="local">Localização (Obrigatório):</label>
                <input type="text" id="local" name="local"
                       list="${locationDatalistId}" autocomplete="off">
            </div>
            <div class="form-group">
                <label for="descricao_item">Descrição (Opcional):</label>
                <textarea id="descricao_item" name="descricao_item"
                          rows="3" maxlength="255"></textarea>
            </div>
            <div class="form-group">
                <label for="validade">Data de Validade:</label>
                <input type="date" id="validade" name="validade" min="${hoje}">
            </div>
            ${serialDatalistHtml}
            ${locationDatalistHtml}
        `;

        // --- ANEXAR VALIDAÇÕES ---
        const serialInput = formContainer.querySelector('#numero_serial');
        const localInput = formContainer.querySelector('#local');
        const validadeInput = formContainer.querySelector('#validade'); 

        if (serialInput) {
            serialInput.addEventListener('blur', () => validateRequired(serialInput, 'Nº Serial'));
        }
        if (localInput) {
            localInput.addEventListener('blur', () => validateRequired(localInput, 'Localização'));
        }
        if (validadeInput) {
            validadeInput.addEventListener('blur', () => validateDate(validadeInput));
        
            // Validação de 4 dígitos
            validadeInput.addEventListener('input', () => {
                const ano = validadeInput.value.split('-')[0];
                if (ano && ano.length > 4) {
                    validadeInput.value = '';
                }
            });
        }
        detailsModal.style.display = 'flex';
    }

    if (btnAdicionarInsumo) {
            btnAdicionarInsumo.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const response = await fetch('/api/insumos/tipos', {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const tiposDeInsumo = await response.json();
                    const gridContainer =
                        selectionModal.querySelector('.selection-grid');
                    gridContainer.innerHTML = '';
                    tiposDeInsumo.forEach((tipo) => {
                        const card = document.createElement('div');
                        card.className = 'insumo-card-select';
                        card.innerHTML = `
                            <img src="${tipo.imagem || 'images/logotipo.png'}" alt="${
                                tipo.descricao
                            }">
                            <h3>${tipo.descricao}</h3>
                        `;
                        card.addEventListener('click', () =>
                            openDetailsModal(tipo.descricao)
                        );
                        gridContainer.appendChild(card);
                    });
                    selectionModal.style.display = 'flex';
                } catch (error) {
                    Notifier.showError('Erro ao carregar os tipos de insumo.'); // <--- SUBSTITUÍDO
                }
            });
        }

if (detailsForm) {
        detailsForm.addEventListener('submit', async (event) => {
            event.preventDefault();

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
            data.filial_cnpj = filialCnpjGlobal;
            const saveButton = detailsForm.querySelector('.btn-save');
            if (saveButton) saveButton.disabled = true;
            try {
                const response = await fetch(
                    `/api/vistorias/${vistoriaId}/insumos`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(data),
                    }
                );
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                Notifier.showSuccess(result.message || "Insumo adicionado!"); // <--- ADICIONADO
                closeModal(detailsModal);
                carregarDadosVistoria();
            } catch (error) {
                Notifier.showError(`Erro: ${error.message}`); // <--- SUBSTITUÍDO
            } finally {
                if (saveButton) saveButton.disabled = false;
            }
        });
    }

    function openConfirmFinalizarModal() {
        if (confirmFinalizarModal) confirmFinalizarModal.style.display = 'flex';
    }

    if (btnFinalizarVistoria) {
        btnFinalizarVistoria.addEventListener('click', (e) => {
            e.preventDefault();
            openConfirmFinalizarModal();
        });
    }

    if (confirmFinalizarConfirmBtn) {
        confirmFinalizarConfirmBtn.addEventListener('click', async () => {
            confirmFinalizarConfirmBtn.disabled = true;
            confirmFinalizarConfirmBtn.textContent = 'Finalizando...';

            try {
                const response = await fetch(
                    `/api/vistorias/${vistoriaId}/finalizar`,
                    {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                Notifier.showSuccess(result.message || "Vistoria finalizada!", 1500);
                closeConfirmFinalizarModal(); 
                setTimeout(() => {
                    if (filialCnpjGlobal) {
                        window.location.href = `vistorias.html?cnpj=${filialCnpjGlobal}`;
                    }
                }, 1500);

            } catch (error) {
                Notifier.showError(`Erro ao finalizar: ${error.message}`);
                closeConfirmFinalizarModal(); 
                // Reabilita o botão em caso de erro
                confirmFinalizarConfirmBtn.disabled = false;
                confirmFinalizarConfirmBtn.textContent = 'Finalizar';
            }
        });
    }

    function openConfirmExcluirItemModal(itemId) {
        itemParaExcluirId = itemId;
        if(confirmExcluirItemModal) confirmExcluirItemModal.style.display = 'flex';
    }

    if (confirmExcluirItemConfirmBtn) {
        confirmExcluirItemConfirmBtn.addEventListener('click', async () => {
            if (!itemParaExcluirId) return;

            confirmExcluirItemConfirmBtn.disabled = true;
            confirmExcluirItemConfirmBtn.textContent = 'Excluindo...';

            try {
                const response = await fetch(`/api/historico/${itemParaExcluirId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || `Erro ${response.status}`);
                }

                Notifier.showSuccess(result.message || "Item removido da vistoria."); 
                closeModal(confirmExcluirItemModal);
                carregarDadosVistoria();

            } catch (error) {
                Notifier.showError(`Erro ao excluir item: ${error.message}`); 
                closeModal(confirmExcluirItemModal);
            }
        });
    }

    // Listener do Botão "Cancelar" (ESTAVA FALTANDO)
    if (confirmExcluirItemCancelBtn) {
        confirmExcluirItemCancelBtn.addEventListener('click', () => {
            closeModal(confirmExcluirItemModal);
        });
    }
    
    // Listener do "X" (ESTAVA FALTANDO)
    if (confirmExcluirItemCloseBtn) {
        confirmExcluirItemCloseBtn.addEventListener('click', () => {
            closeModal(confirmExcluirItemModal);
        });
    }

    if (insumosGrid) {
        insumosGrid.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-excluir-historico')) {
                event.preventDefault();
                const historiaId = event.target.getAttribute('data-id');
                if (historiaId) {
                    openConfirmExcluirItemModal(historiaId);
                } else {
                    console.error('Botão de excluir clicado, mas data-id não encontrado.');
                }
            }
        });
    }

    carregarDadosVistoria();

    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            console.log('Página carregada do cache. Recarregando dados...');
            carregarDadosVistoria();
        }
    });
});

function parseDateAsLocal(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput === 'string') {
        const dateString = dateInput.split('T')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            console.error('Formato de data inválido recebido:', dateInput);
            return null;
        }
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    return null;
}
function formatDateForClient(date) {
    if (!date) return 'N/A';
    const dateObj = parseDateAsLocal(date);
    if (!dateObj || isNaN(dateObj)) return 'Data Inválida';
    return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
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