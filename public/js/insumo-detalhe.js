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

    const btnVoltar = document.getElementById('btnVoltar');
    const btnEditar = document.getElementById('btnEditar');
    const btnExcluir = document.getElementById('btnExcluir');

    // Elementos do Modal de Edição
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const editModalTitle = document.getElementById('editModalTitle');
    const editInsumoCodigo = document.getElementById('edit-insumo-codigo');
    const editFilialCnpj = document.getElementById('edit-filial-cnpj');
    const editLocal = document.getElementById('edit-local');
    const editValidade = document.getElementById('edit-validade');
    const editDescricao = document.getElementById('edit-descricao');
    const editModalCloseBtn = editModal.querySelector('.modal-close-btn');
    const editModalCancelBtn = editModal.querySelector('.btn-cancel');

    let currentInsumoData = null; // Para guardar os dados atuais para edição

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
            insumoValidade.textContent = insumo.validade_formatada; // Usa a data formatada pelo backend
            insumoDescricao.textContent = insumo.descricao || 'Nenhuma descrição adicional.';

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
    const openEditModal = () => {
        if (!currentInsumoData) return;
        editModalTitle.textContent = `Editar Insumo: ${currentInsumoData.tipo_insumo}`;

        // ==========================================================
        // MELHORIA 1: PREENCHIMENTO AUTOMÁTICO DO FORMULÁRIO
        // ==========================================================
        editInsumoCodigo.value = currentInsumoData.insumo_codigo; // Campo hidden
        editFilialCnpj.value = currentInsumoData.filial_cnpj;     // Campo hidden
        editLocal.value = currentInsumoData.local || '';
        editDescricao.value = currentInsumoData.descricao || '';

        // Converte a data do banco (AAAA-MM-DD) que está em 'currentInsumoData.validade'
        // para o formato que o input type="date" precisa.
        editValidade.value = currentInsumoData.validade || ''; // A API já envia AAAA-MM-DD

        // ==========================================================
        // MELHORIA 2: REUTILIZAÇÃO DA VALIDAÇÃO DE DATA
        // ==========================================================
        // Define a data mínima como hoje
        const hoje = new Date().toISOString().split('T')[0];
        editValidade.setAttribute('min', hoje);

        // Listener para limitar o ano a 4 dígitos (reutilizado)
        editValidade.addEventListener('input', () => {
            const ano = editValidade.value.split('-')[0];
            if (ano && ano.length > 4) {
                alert('O ano deve ter no máximo 4 dígitos.');
                editValidade.value = ''; // Limpa se inválido
            }
        });
        // ==========================================================

        editModal.style.display = 'flex';
    };

    const closeEditModal = () => {
        editModal.style.display = 'none';
        editForm.reset();
    };

    btnEditar.addEventListener('click', openEditModal);
    editModalCloseBtn.addEventListener('click', closeEditModal);
    editModalCancelBtn.addEventListener('click', closeEditModal);

    editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(editForm);
        const data = Object.fromEntries(formData.entries());

        // Validação extra de data (segurança)
        if (data.validade) {
            const ano = data.validade.split('-')[0];
            if (ano.length !== 4) {
                alert('Ano da validade inválido. Use 4 dígitos.');
                return; // Impede o envio se o ano for inválido
            }

            const hoje = new Date().toISOString().split('T')[0];
            if (data.validade < hoje) {
                alert('A data de validade não pode ser anterior à data atual.');
                return;
            }
        }

        try {
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

            alert(result.message);
            closeEditModal();
            carregarDetalhesInsumo();

        } catch (error) {
            alert(`Erro ao salvar: ${error.message}`);
        }
    });

    carregarDetalhesInsumo();
});