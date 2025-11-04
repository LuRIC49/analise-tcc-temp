document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const insumoId = urlParams.get('id');

    if (!insumoId) {
        document.querySelector('main').innerHTML = '<h1>Erro: ID do insumo não fornecido.</h1>';
        return;
    }

    // --- ELEMENTOS DO DOM ---
    const insumoTitle = document.getElementById('insumo-title');
    const insumoImage = document.getElementById('insumo-image');
    const insumoCodigo = document.getElementById('insumo-codigo');
    const insumoTipo = document.getElementById('insumo-tipo');
    const insumoLocal = document.getElementById('insumo-local');
    const insumoValidade = document.getElementById('insumo-validade');
    const insumoDescricao = document.getElementById('insumo-descricao');
    
    // [NOVO] Elementos do N° Serial
    const insumoSerial = document.getElementById('insumo-serial');
    const serialDisplayRow = document.getElementById('serial-display-row');
    const editSerialGroup = document.getElementById('edit-serial-group');
    const editSerialInput = document.getElementById('edit-serial');
    const serialDatalistEdit = document.getElementById('serial-list-edit');

    const btnVoltar = document.getElementById('btnVoltar');
    const btnEditar = document.getElementById('btnEditar');
    const btnExcluir = document.getElementById('btnExcluir');

    // Elementos do Modal de Edição
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const editModalTitle = document.getElementById('editModalTitle');
    const editLocal = document.getElementById('edit-local');
    const editValidade = document.getElementById('edit-validade');
    const editDescricao = document.getElementById('edit-descricao');
    const editModalCloseBtn = editModal.querySelector('.modal-close-btn');
    const editModalCancelBtn = editModal.querySelector('.btn-cancel');

    if (editLocal) {
        editLocal.addEventListener('blur', () => validateRequired(editLocal, 'Localização'));
    }
    if (editValidade) {
        // Nota: A validação de data aqui também checa se está vazio
        editValidade.addEventListener('blur', () => validateDate(editValidade));
    }

    const btnVerHistorico = document.getElementById('btnVerHistorico');
    const historyModal = document.getElementById('historyModal');
    const historyModalBody = document.getElementById('historyModalBody');
    const historyModalCloseBtn = document.getElementById('historyModalCloseBtn');
    const historyModalCloseXBtn = document.getElementById('historyModalCloseXBtn'); // Se você manteve o X

    let currentInsumoData = null; // Para guardar os dados atuais para edição]

    


    // [NOVO] Função para abrir o modal de histórico
    const openHistoryModal = async () => {
        if (!insumoId) return; // Garante que temos o ID do insumo atual

        historyModalBody.innerHTML = '<p>Carregando histórico...</p>';
        historyModal.style.display = 'flex';

        try {
            const response = await fetch(`/api/insumos/${insumoId}/historico`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || 'Falha ao carregar histórico.');
            }
            
            const historico = await response.json();
            
            if (historico.length === 0) {
                 historyModalBody.innerHTML = '<p>Nenhum histórico de alterações encontrado para este item.</p>';
                 return;
            }

            // Monta a tabela (ou lista) para exibir o histórico
            let historyHtml = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Origem</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Local</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Validade</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Serial</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descrição Adic.</th>
                            </tr>
                    </thead>
                    <tbody>
            `;

            historico.forEach(reg => {
                const origem = reg.vistoria_codigo 
                                ? `Vistoria #${reg.vistoria_codigo}` 
                                : 'Edição Manual';
                
                historyHtml += `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${origem}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${reg.local || 'N/A'}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${reg.validade_formatada || 'N/A'}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${reg.numero_serial || 'N/A'}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${reg.descricao || ''}</td>
                        </tr>
                `;
            });

            historyHtml += '</tbody></table>';
            historyModalBody.innerHTML = historyHtml;

        } catch (error) {
            historyModalBody.innerHTML = `<p style="color: red;">Erro ao carregar histórico: ${error.message}</p>`;
        }
    };

    // [NOVO] Função para fechar o modal de histórico
    const closeHistoryModal = () => {
        historyModal.style.display = 'none';
        historyModalBody.innerHTML = ''; // Limpa o conteúdo
    };

    // [NOVO] Event Listeners para o modal de histórico
    if (btnVerHistorico) {
        btnVerHistorico.addEventListener('click', openHistoryModal);
    }
    if (historyModalCloseBtn) {
        historyModalCloseBtn.addEventListener('click', closeHistoryModal);
    }
     if (historyModalCloseXBtn) { // Se você manteve o X
         historyModalCloseXBtn.addEventListener('click', closeHistoryModal);
     }
     // Opcional: Fechar se clicar fora do modal
     window.addEventListener('click', (event) => {
         if (event.target === historyModal) {
             closeHistoryModal();
         }
     });

    // --- FUNÇÕES DE CARREGAMENTO ---
async function carregarDetalhesInsumo() {
        try {
            const response = await fetch(`/api/insumos/${insumoId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || 'Falha ao carregar.');
            }
            const insumo = await response.json();
            currentInsumoData = insumo;

            document.title = insumo.tipo_insumo;
            insumoTitle.textContent = `Detalhes: ${insumo.tipo_insumo}`;
            insumoImage.src = insumo.imagem || 'images/logotipo.png';
            insumoCodigo.textContent = insumo.codigo;
            insumoTipo.textContent = insumo.tipo_insumo;
            insumoLocal.textContent = insumo.local || 'Não informado';
            insumoValidade.textContent = insumo.validade_formatada; 
            insumoDescricao.textContent = insumo.descricao || 'Nenhuma descrição adicional.';

            // --- ALTERAÇÃO INICIA AQUI ---
            // A condição "if includes('extintor')" foi REMOVIDA.
            // O N° Serial agora é exibido para todos os insumos.
            if (insumoSerial) insumoSerial.textContent = insumo.numero_serial || 'Não informado';
            if (serialDisplayRow) serialDisplayRow.style.display = 'block';
            // --- ALTERAÇÃO TERMINA AQUI ---

        } catch (error) {
            document.querySelector('main').innerHTML = `<h1>Erro: ${error.message}</h1>`;
        }
    }

    // --- LÓGICA DOS BOTÕES DE AÇÃO ---
    btnVoltar.addEventListener('click', () => {
        window.history.back(); // Simplesmente volta para a página anterior
    });

    btnExcluir.addEventListener('click', async () => {
        if (!currentInsumoData) return;
        if (confirm(`Tem certeza que deseja excluir o insumo "${currentInsumoData.tipo_insumo}" (Código: ${currentInsumoData.codigo}) do inventário atual? O histórico será mantido.`)) {
            try {
                const response = await fetch(`/api/insumos/${insumoId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                alert(result.message);
                window.history.back(); // Volta para a lista após excluir
            } catch (error) {
                alert(`Erro ao excluir: ${error.message}`);
            }
        }
    });

    // --- LÓGICA DO MODAL DE EDIÇÃO ---
    
    /**
     * [ALTERADO] Agora é 'async' e busca a lista de seriais para o autocomplete.
     */
const openEditModal = async () => {
        if (!currentInsumoData) return;
        editModalTitle.textContent = `Editar Insumo: ${currentInsumoData.tipo_insumo}`;

        // Preenche campos existentes
        editLocal.value = currentInsumoData.local || '';
        editDescricao.value = currentInsumoData.descricao || '';
        editValidade.value = currentInsumoData.validade || ''; 

        const hoje = new Date().toISOString().split('T')[0];
        editValidade.setAttribute('min', hoje);

        // --- ALTERAÇÃO INICIA AQUI ---
        // A condição "if includes('extintor')" foi REMOVIDA.
        // O campo N° Serial (readonly) agora é exibido para todos os insumos.
        if (editSerialGroup) editSerialGroup.style.display = 'block';
        if (editSerialInput) {
             editSerialInput.value = currentInsumoData.numero_serial || '';
             editSerialInput.required = true; 
             editSerialInput.readOnly = true; // <<-- Mantém não editável
             editSerialInput.style.backgroundColor = '#e9ecef'; 
             editSerialInput.style.cursor = 'not-allowed'; 
        }
        if (serialDatalistEdit) {
             serialDatalistEdit.innerHTML = ''; // Limpa datalist
        }
        // --- ALTERAÇÃO TERMINA AQUI ---
        
        editValidade.addEventListener('input', () => {
            const ano = editValidade.value.split('-')[0];
            if (ano && ano.length > 4) {
                alert('O ano deve ter no máximo 4 dígitos.');
                editValidade.value = ''; // Limpa se inválido
            }
        });

        editModal.style.display = 'flex';
    };
    
const closeEditModal = () => {
        editModal.style.display = 'none';
        editForm.reset();
        
        if (editSerialGroup) editSerialGroup.style.display = 'none';
        // if (serialDatalistEdit) serialDatalistEdit.innerHTML = ''; // Não precisamos mais limpar datalist aqui
        if (editSerialInput) {
            editSerialInput.required = false; 
            editSerialInput.readOnly = false; // Garante reset do readonly
            editSerialInput.style.backgroundColor = ''; // Restaura estilo
            editSerialInput.style.cursor = ''; 
        }
    };

    btnEditar.addEventListener('click', openEditModal);
    editModalCloseBtn.addEventListener('click', closeEditModal);
    editModalCancelBtn.addEventListener('click', closeEditModal);

editForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // --- INÍCIO DA MODIFICAÇÃO: VALIDAR ANTES DE ENVIAR ---
        let isValid = true;
        // O serial é read-only, então não validamos, conforme sua instrução.
        isValid = validateRequired(editLocal, 'Localização') && isValid;
        isValid = validateDate(editValidade) && isValid;

        if (!isValid) {
            return; // Impede o envio do formulário
        }
        // --- FIM DA MODIFICAÇÃO ---

        const formData = new FormData(editForm);
        const data = Object.fromEntries(formData.entries());

        // Esta validação de 4 dígitos é redundante agora, mas não prejudicial.
        if (data.validade) {
            const ano = data.validade.split('-')[0];
            if (ano.length !== 4) {
                alert('Ano da validade inválido. Use 4 dígitos.');
                return; 
            }
            // A validação de data passada já foi feita pelo validateDate()
        }

        try {
            // O 'numero_serial' (se existir) será enviado automaticamente
            const response = await fetch(`/api/insumos/${insumoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            closeEditModal();
            carregarDetalhesInsumo(); // Recarrega os detalhes da página

        } catch (error) {
            alert(`Erro ao salvar: ${error.message}`);
        }
    });

    // --- INICIALIZAÇÃO ---
    // [ALTERADO] Para resolver o problema de cache do botão "Voltar"
    carregarDetalhesInsumo(); // Carrega na primeira vez

    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            console.log('Página carregada do cache. Recarregando dados...');
            carregarDetalhesInsumo(); // Recarrega os dados
        }
    });
});




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