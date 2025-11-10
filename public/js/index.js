document.addEventListener('DOMContentLoaded', () => {
    
    const swiperWrapper = document.querySelector('.swiper-wrapper');
    const token = localStorage.getItem('authToken');

    // --- Elementos do Modal CRUD ---
    const btnAbrirModalNovo = document.getElementById('btnAbrirModalNovo');
    const modal = document.getElementById('tipoModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('tipoForm');
    const tipoIdInput = document.getElementById('tipoId');
    const tipoDescricaoInput = document.getElementById('tipoDescricao');
    const tipoImagemInput = document.getElementById('tipoImagem');
    const previewContainer = document.getElementById('previewContainer');
    const imagemPreview = document.getElementById('imagemPreview');
    const btnCancel = modal.querySelector('.btn-cancel');
    const btnClose = modal.querySelector('.modal-close-btn');

    let modoEdicao = false;

    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const confirmDeleteTitle = document.getElementById('confirmDeleteTitle');
    const confirmDeleteText = document.getElementById('confirmDeleteText');
    const confirmDeleteCancelBtn = document.getElementById('confirmDeleteCancelBtn');
    const confirmDeleteConfirmBtn = document.getElementById('confirmDeleteConfirmBtn');
    const confirmDeleteCloseBtn = document.getElementById('confirmDeleteCloseBtn');
    
    let idParaExcluir = null;

    // --- FUNÇÕES PRINCIPAIS (Carrossel e CRUD) ---

// 1. Busca os dados dos tipos de insumo
    async function fetchInsumos() {
        
        // --- INÍCIO DA ALTERAÇÃO ---
        let url = '/api/insumos/public-tipos'; // Rota PÚBLICA (padrão para guest)
        let options = {};

        if (token) {
            // Se ESTIVER logado, usa a rota SEGURA
            url = '/api/insumos/tipos'; 
            options = { headers: { 'Authorization': `Bearer ${token}` } };
        }
        // --- FIM DA ALTERAÇÃO ---

        try {
            const response = await fetch(url, options); // Usa a URL e opções corretas
            
            if (!response.ok) {
                if (!token) throw new Error('Não foi possível carregar o catálogo de insumos.');
                else throw new Error('Sessão expirada. Faça login novamente para ver os insumos.');
            }
            
            const insumos = await response.json();
            return insumos;
        } catch (error) {
            console.error('Erro:', error);
            swiperWrapper.innerHTML = `<p>${error.message}</p>`;
            return []; 
        }
    }

async function initializeCarousel() {
        const insumos = await fetchInsumos();

        if (insumos.length === 0 && token) {
             swiperWrapper.innerHTML = '<p>Nenhum tipo de insumo cadastrado.</p>';
        }

        // Limpa o wrapper antes de adicionar novos slides
        swiperWrapper.innerHTML = ''; 

        // Adiciona os slides
        insumos.forEach(insumo => {
            const imgPath = insumo.imagem ? `/${insumo.imagem}` : 'images/logotipo.png';
            
            // --- INÍCIO DA ALTERAÇÃO ---
            // A API agora envia 'is_base' (1 ou 0)
            const isBase = insumo.is_base === 1;

            // Botões de CRUD (só aparecem se logado E se NÃO for base)
            const crudButtonsHTML = !isBase ? `
                <div class="crud-buttons card-footer" style="display: flex; gap: 5px; margin-top: 10px;">
                    <button class="btn-action btn-delete" data-id="${insumo.codigo}" data-descricao="${insumo.descricao}" style="background-color: #dc3545; color: white; padding: 5px 8px; border: none; cursor: pointer; font-size: 0.9em; flex: 1;">Excluir</button>
                    <button class="btn-action btn-edit" data-id="${insumo.codigo}" style="background-color: #007bff; color: white; padding: 5px 8px; border: none; cursor: pointer; font-size: 0.9em; flex: 1;">Editar</button>
                </div>
            ` : `
                <div class="crud-buttons" style="display: flex; gap: 5px; margin-top: 10px; height: 31px; justify-content: center; align-items: center;">
                    <span style="font-size: 0.9em; color: #777;">(Insumo Padrão)</span>
                </div>
            `;
            // --- FIM DA ALTERAÇÃO ---

            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.innerHTML = `
                <div class="product-card">
                    <img src="${imgPath}" alt="${insumo.descricao}" style="width: 100%; height: 150px; object-fit: contain;">
                    <h3>${insumo.descricao}</h3>
                    ${crudButtonsHTML} 
                </div>
            `;
            swiperWrapper.appendChild(slide);
        });

        // Só inicializa o Swiper se tivermos slides
        if (insumos.length > 0) {
            const swiper = new Swiper('.swiper', {
                loop: true,
                slidesPerView: 1,
                spaceBetween: 30,
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                breakpoints: {
                    640: { slidesPerView: 2, spaceBetween: 20 },
                    768: { slidesPerView: 3, spaceBetween: 40 },
                    1024: { slidesPerView: 4, spaceBetween: 50 },
                }
            });
        }
    }

    // --- Funções do Modal ---

            function openModal(modo, tipo = null) {
            form.reset(); // Limpa o formulário
            imagemPreview.src = '#';
            previewContainer.style.display = 'none';
            clearError(tipoDescricaoInput);
            clearError(tipoImagemInput);
            // --- FIM DA ADIÇÃO ---

            if (modo === 'editar' && tipo) {
            modoEdicao = true;
            modalTitle.textContent = 'Editar Tipo de Insumo';
            tipoIdInput.value = tipo.codigo;
            tipoDescricaoInput.value = tipo.descricao;
            if (tipo.imagem) {
                imagemPreview.src = `/${tipo.imagem}`;
                previewContainer.style.display = 'block';
            }
        } else {
            modoEdicao = false;
            modalTitle.textContent = 'Cadastrar Novo Tipo';
            tipoIdInput.value = '';
        }
        modal.style.display = 'flex';
    }

function closeModal() {
        modal.style.display = 'none';
        form.reset();
        
        // --- INÍCIO DA CORREÇÃO ---
        // Limpa erros pendentes
        clearError(tipoDescricaoInput);
        clearError(tipoImagemInput);
        
        // Redefine o estado
        modoEdicao = false; 
        // --- FIM DA CORREÇÃO ---
    }
    function openConfirmDeleteModal(id, descricao) {
        idParaExcluir = id; // Armazena o ID
        if(confirmDeleteTitle) confirmDeleteTitle.textContent = `Excluir "${descricao}"`;
        if(confirmDeleteText) confirmDeleteText.textContent = `Tem certeza que deseja excluir este tipo de Insumo?`;
        if (confirmDeleteModal) confirmDeleteModal.style.display = 'flex';
    }

    function closeConfirmDeleteModal() {
        idParaExcluir = null; // Limpa o ID
        if (confirmDeleteModal) confirmDeleteModal.style.display = 'none';
    }

async function handleExcluir(id, descricao) {
        // O confirm() ainda é útil, pois é uma pergunta (Sim/Não).
        // Podemos substituí-lo por um modal de confirmação customizado depois, se quiser.
        if (!confirm(`Tem certeza que deseja excluir o tipo "${descricao}"? \n\nAtenção: Isso só funcionará se nenhum item de inventário estiver usando este tipo.`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/insumos/tipos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            // --- SUBSTITUIÇÃO DO ALERT ---
            Notifier.showSuccess('Tipo excluído com sucesso!');
            // --- FIM DA SUBSTITUIÇÃO ---

            initializeCarousel(); // Recarrega a lista
        } catch (error) {
            // --- SUBSTITUIÇÃO DO ALERT ---
            Notifier.showError(error.message); // Erro!
            // --- FIM DA SUBSTITUIÇÃO ---
        }
    }

    function handlePreviewImagem(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagemPreview.src = e.target.result;
                previewContainer.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            imagemPreview.src = '#';
            previewContainer.style.display = 'none';
        }
    }

async function handleSubmit(event) {
        event.preventDefault();
        
        const isDescricaoValid = validateRequired(tipoDescricaoInput, 'Descrição (Nome do Tipo)');
        const isImagemValid = validateFileRequired(tipoImagemInput, 'Imagem');

        if (!isDescricaoValid || !isImagemValid) {
            return; 
        }

        const formData = new FormData(form);
        const id = tipoIdInput.value;
        const url = modoEdicao ? `/api/insumos/tipos/${id}` : '/api/insumos/tipos';
        const method = modoEdicao ? 'PUT' : 'POST';

        const saveButton = form.querySelector('.btn-save');
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData 
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            Notifier.showSuccess(result.message); // <--- SUBSTITUÍDO
            closeModal();
            initializeCarousel(); // Recarrega o carrossel

        } catch (error) {
            Notifier.showError(error.message); // <--- SUBSTITUÍDO
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar';
        }
    }

    async function handleExcluir() {
        if (!idParaExcluir) return; // Proteção
        
        const id = idParaExcluir; // Pega o ID armazenado
        
        // O confirm() foi removido
        
        try {
            const response = await fetch(`/api/insumos/tipos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            Notifier.showSuccess('Tipo excluído com sucesso!'); // <--- SUBSTITUÍDO
            initializeCarousel(); // Recarrega a lista
        } catch (error) {
            Notifier.showError(error.message); // <--- SUBSTITUÍDO
        } finally {
            closeConfirmDeleteModal(); // Fecha o modal de confirmação
        }
    }

// --- Event Listeners (VERSÃO CORRIGIDA E PROTEGIDA) ---
    
   if (btnAbrirModalNovo) {
        btnAbrirModalNovo.addEventListener('click', () => openModal('novo'));
    }

    // Botões do Modal de Edição/Criação
    if (btnCancel) {
        btnCancel.addEventListener('click', closeModal);
    }
    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }
    
    // Fechar ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
        if (e.target === confirmDeleteModal) closeConfirmDeleteModal(); // Adicionado
    });

    // Listeners de Validação do Formulário
    if (tipoImagemInput) {
        tipoImagemInput.addEventListener('change', (event) => {
            handlePreviewImagem(event);
            validateFileRequired(tipoImagemInput, 'Imagem');
        });
    }
    if (tipoDescricaoInput) {
        tipoDescricaoInput.addEventListener('blur', () => {
            validateRequired(tipoDescricaoInput, 'Descrição (Nome do Tipo)');
        });
    }

    // Listener de Submit
    if (form) {
        form.addEventListener('submit', handleSubmit);
    } else {
        console.error("ERRO CRÍTICO: O <form id='tipoForm'> não foi encontrado. O submit não vai funcionar.");
    }

    // --- INÍCIO DA MODIFICAÇÃO (Listeners do Modal de Exclusão) ---
    
    // Botões do Modal de Exclusão
    if (confirmDeleteCancelBtn) {
        confirmDeleteCancelBtn.addEventListener('click', closeConfirmDeleteModal);
    }
    if (confirmDeleteCloseBtn) {
        confirmDeleteCloseBtn.addEventListener('click', closeConfirmDeleteModal);
    }
    if (confirmDeleteConfirmBtn) {
        confirmDeleteConfirmBtn.addEventListener('click', handleExcluir); // Chama a nova função
    }
    
    // --- FIM DA MODIFICAÇÃO ---

    // Delegação de eventos para os botões nos slides do Carrossel
if (swiperWrapper) {
        swiperWrapper.addEventListener('click', async (e) => {
            
            if (e.target.classList.contains('btn-delete')) {
                const id = e.target.dataset.id;
                // --- CORREÇÃO AQUI ---
                const descricao = e.target.dataset.descricao; // Removido o 'dataset' duplicado
                // --- FIM DA CORREÇÃO ---
                openConfirmDeleteModal(id, descricao); 
            }
            
            if (e.target.classList.contains('btn-edit')) {
                const id = e.target.dataset.id;
                try {
                    const response = await fetch(`/api/insumos/tipos/${id}`, {
                         headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Falha ao buscar dados para edição.');
                    const tipo = await response.json();
                    openModal('editar', tipo);
                } catch (error) {
                    Notifier.showError(error.message); 
                }
            }
        });
    }
    // --- FIM DOS EVENT LISTENERS ---

    
function displayError(inputElement, message) {
    // Encontra o 'irmão' .field-error-message
    const errorDiv = inputElement.parentElement.querySelector('.field-error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    inputElement.classList.add('invalid');
}

function clearError(inputElement) {
    const errorDiv = inputElement.parentElement.querySelector('.field-error-message');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
    inputElement.classList.remove('invalid');
}

/**
 * Valida se um campo de texto não está vazio.
 */
function validateRequired(inputElement, fieldName) {
    if (!inputElement || inputElement.value.trim() === '') {
        displayError(inputElement, `${fieldName} é obrigatório.`);
        return false;
    }
    clearError(inputElement);
    return true;
}

/**
 * Valida se um arquivo foi selecionado (APENAS no modo de criação).
 * 'modoEdicao' é uma variável global que já temos no seu index.js
 */
function validateFileRequired(inputElement, fieldName) {
    // Se estiver em modo de edição, a imagem é opcional (não precisa reenviar)
    if (modoEdicao) {
        clearError(inputElement);
        return true; 
    }
    
    // Se estiver em modo de CRIAÇÃO, verifica se um arquivo foi selecionado
    if (inputElement.files.length === 0) {
        displayError(inputElement, `${fieldName} é obrigatória.`);
        return false;
    }
    
    clearError(inputElement);
    return true;
}


    // --- Inicialização ---
    initializeCarousel();
});


