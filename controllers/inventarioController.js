const { parseDateAsLocal, formatDateForClient } = require('../utils/dateFormatter');
const Filial = require('../models/filialModel');
const Vistoria = require('../models/vistoriaModel');
const { Insumo, InsumoFilial } = require('../models/insumoModel');
const db = require('../db');
const { createInventoryPdf } = require('../utils/pdfGenerator');


function isValidFutureDate(dateString) {
    if (!dateString) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const inputDate = parseDateAsLocal(dateString);
    if (!inputDate || isNaN(inputDate)) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return inputDate >= today;
}
function isNotEmpty(value) {
     return value !== null && value !== undefined && String(value).trim() !== ''; 
    }

// --- Funções do Controller ---

exports.listarFiliais = async (req, res) => {
    try {
        const { empresaCnpj } = req.user;
        const filiais = await Filial.findByEmpresa(empresaCnpj);
        res.json(filiais);
    } catch (error) {
        console.error('Erro ao listar filiais:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.criarFilial = async (req, res) => {
    try {
        // Adicionar validação de campos obrigatórios para filial aqui se necessário
        const { nome, cnpj, endereco, email_responsavel } = req.body;
        if (!isNotEmpty(nome) || !isNotEmpty(cnpj) || !isNotEmpty(endereco) || !isNotEmpty(email_responsavel)) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios para criar filial.' });
        }
        // Validação de formato CNPJ e Email também seria bom aqui

        const { empresaCnpj } = req.user;
        await Filial.create(req.body, empresaCnpj);
        res.status(201).json({ message: 'Filial cadastrada com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'O CNPJ desta filial já está cadastrado.' });
        }
        console.error('Erro ao criar filial:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.buscarDetalhesFilial = async (req, res) => {
    try {
        const { empresaCnpj } = req.user;
        const { cnpj: filialCnpj } = req.params;
        const filial = await Filial.findById(filialCnpj, empresaCnpj);
        if (!filial) {
            return res.status(404).json({ message: 'Filial não encontrada ou você não tem permissão.' });
        }
        res.json(filial);
    } catch (error) {
        console.error('Erro ao buscar detalhes da filial:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.listarVistorias = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const vistorias = await Vistoria.findByFilial(filialCnpj);
        res.json(vistorias);
    } catch (error) {
        console.error('Erro ao listar vistorias:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.iniciarNovaVistoria = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const { tecnico_responsavel } = req.body;
        if (!isNotEmpty(tecnico_responsavel)) { // Usa a validação
            return res.status(400).json({ message: 'O nome do técnico responsável é obrigatório.' });
        }
        const vistoriaId = await Vistoria.create({ filial_cnpj: filialCnpj, tecnico_responsavel });
        res.status(201).json({ message: 'Nova vistoria iniciada com sucesso!', vistoriaId });
    } catch (error) {
        console.error('Erro ao iniciar nova vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.finalizarVistoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const vistoria = await Vistoria.findByIdAndEmpresa(id, empresaCnpj);
        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria não encontrada ou você não tem permissão.' });
        }
        if (vistoria.data_fim) {
            return res.status(403).json({ message: 'Ação proibida. Esta vistoria já foi finalizada.' });
        }
        await Vistoria.finalize(id);
        res.status(200).json({ message: 'Vistoria finalizada com sucesso!' });
    } catch (error) {
        console.error('Erro ao finalizar vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.excluirVistoria = async (req, res) => {
    let connection; // Definir a conexão no escopo mais alto
    try {
        const { id: vistoria_codigo } = req.params; // Renomear para clareza
        const { empresaCnpj } = req.user;

        connection = await db.getConnection(); // Pegar conexão para a transação
        await connection.beginTransaction(); // Iniciar transação

        // 1. Verificar propriedade e status (usando a conexão da transação)
        // Adicionamos 'FOR UPDATE' para travar a linha da vistoria
        const [rowsVistoria] = await connection.query(
            `SELECT v.data_fim FROM vistoria AS v
             JOIN filial AS f ON v.filial_cnpj = f.cnpj
             WHERE v.codigo = ? AND f.empresa_cnpj = ? FOR UPDATE;`,
            [vistoria_codigo, empresaCnpj]
        );

        if (rowsVistoria.length === 0) {
            throw new Error('Vistoria não encontrada ou você não tem permissão para excluí-la.');
        }
        if (rowsVistoria[0].data_fim) {
            throw new Error('Ação proibida. Não é possível excluir uma vistoria finalizada.');
        }

        // 2. [NOVO] Encontrar os IDs dos itens em 'mutavel' que estão ligados a esta vistoria
        // A ligação é feita pela "chave" (cnpj, insumo_codigo, serial)
        const querySelectMutavel = `
            SELECT mut.codigo 
            FROM insumo_filial_mutavel AS mut
            JOIN insumo_filial_vistoria_imutavel AS imu
              ON mut.filial_cnpj = imu.filial_cnpj
              AND mut.insumo_codigo = imu.insumo_codigo
              AND mut.numero_serial <=> imu.numero_serial
            WHERE imu.vistoria_codigo = ?;
        `;
        const [rowsMutavel] = await connection.query(querySelectMutavel, [vistoria_codigo]);

        // 3. [NOVO] Excluir os itens encontrados da tabela 'mutavel'
        if (rowsMutavel.length > 0) {
            const codigosParaDeletar = rowsMutavel.map(row => row.codigo);
            const queryDeleteMutavel = 'DELETE FROM insumo_filial_mutavel WHERE codigo IN (?)';
            await connection.query(queryDeleteMutavel, [codigosParaDeletar]);
            console.log(`[excluirVistoria] Excluídos ${codigosParaDeletar.length} itens da tabela MUTAVEL.`);
        }

        // 4. Excluir a vistoria principal.
        // O 'ON DELETE CASCADE' do DB cuidará de excluir os registros da 'imutavel'.
        const [resultDeleteVistoria] = await connection.execute(
            'DELETE FROM vistoria WHERE codigo = ?', 
            [vistoria_codigo]
        );

        if (resultDeleteVistoria.affectedRows === 0) {
            throw new Error('Falha ao remover a vistoria (affectedRows=0).');
        }

        // 5. Se tudo deu certo, comitar a transação
        await connection.commit();
        
        res.status(200).json({ message: 'Vistoria e todos os seus insumos associados (no inventário e no histórico) foram excluídos com sucesso!' });

    } catch (error) {
        // 6. Se algo deu errado, reverter (rollback)
        if (connection) await connection.rollback(); 
        console.error('Erro ao excluir vistoria:', error);
        
        let statusCode = 500;
        if (error.message.includes('não encontrada') || error.message.includes('permissão')) {
            statusCode = 404;
        } else if (error.message.includes('finalizada')) {
            statusCode = 403;
        }
        
        res.status(statusCode).json({ message: error.message || 'Erro interno do servidor.' });
    } finally {
        // 7. Sempre liberar a conexão
        if (connection) connection.release(); 
    }
};

exports.listarTiposDeInsumos = async (req, res) => {
    try {
        const insumos = await Insumo.findAllTypes();
        res.json(insumos);
    } catch (error) {
        console.error('Erro ao listar tipos de insumos:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.listarSeriaisPorFilial = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const seriais = await InsumoFilial.findSeriaisByFilial(filialCnpj);
        res.json(seriais);
    } catch (error) {
        console.error('Erro ao listar números de serial:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.listarLocaisPorFilial = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const locais = await Filial.findLocationsByFilial(filialCnpj);
        res.json(locais);
    } catch (error) {
        console.error('Erro ao listar locais da filial:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar locais.' });
    }
};

exports.listarInventario = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const inventario = await InsumoFilial.findByFilial(filialCnpj);
        res.json(inventario);
    } catch (error) {
        console.error('Erro ao listar inventário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.buscarDetalhesVistoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const vistoria = await Vistoria.findByIdAndEmpresa(id, empresaCnpj);
        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria não encontrada ou você não tem permissão para acessá-la.' });
        }
        const insumos = await InsumoFilial.findByVistoria(id);
        res.json({ detalhes: vistoria, insumos });
    } catch (error) {
        console.error('Erro ao buscar detalhes da vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.adicionarInsumoAVistoria = async (req, res) => {
    try {
        const { id: vistoria_codigo } = req.params;
        const { empresaCnpj } = req.user; // Mantemos para verificar a VISTORIA
        const { descricao, validade, local, descricao_item, numero_serial } = req.body;

        // --- VALIDAÇÕES OBRIGATÓRIAS ---
        if (!isNotEmpty(descricao)) return res.status(400).json({ message: 'O tipo do insumo (descrição) é obrigatório.' });
        if (!isNotEmpty(local)) return res.status(400).json({ message: 'A localização é obrigatória.' });
        if (!isValidFutureDate(validade)) { // Usa a função que exige data
            return res.status(400).json({ message: 'Data de validade inválida. Use AAAA-MM-DD, não pode ser vazia ou passada.' });
        }
        if (!isNotEmpty(numero_serial)) { // Serial agora é sempre obrigatório
            return res.status(400).json({ message: 'O Número de Serial é obrigatório.' });
        }
        // --- FIM VALIDAÇÕES ---

        const vistoria = await Vistoria.findByIdAndEmpresa(vistoria_codigo, empresaCnpj);
        if (!vistoria) return res.status(404).json({ message: 'Vistoria não encontrada ou você não tem permissão.' });
        if (vistoria.data_fim) return res.status(403).json({ message: 'Ação proibida. Vistoria já finalizada.' });

        await InsumoFilial.create({
            filial_cnpj: vistoria.filial_cnpj,
            vistoria_codigo,
            tipo_descricao: descricao,
            validade: validade,
            local: local,
            descricao_item: descricao_item,
            numero_serial: numero_serial
            // REMOVEMOS 'empresaCnpj: empresaCnpj'
        });
        res.status(201).json({ message: 'Insumo adicionado à vistoria com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar insumo à vistoria:', error);
        // Verifica erro de duplicidade que PODE ocorrer se createDirect falhar e create tentar inserir
        if (error.code === 'ER_DUP_ENTRY') {
             res.status(409).json({ message: 'Erro de duplicidade detectado (Serial já existe?).'});
        } else {
            res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
        }
    }
};

exports.editarInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        // 'descricao' no body aqui é a descricao_item (nota), o tipo não muda na edição
        const { validade, local, descricao, numero_serial } = req.body; 

        // --- VALIDAÇÕES OBRIGATÓRIAS ---
         if (!isNotEmpty(local)) return res.status(400).json({ message: 'A localização é obrigatória.' });
         if (!isValidFutureDate(validade)) { // Usa a função que exige data
            return res.status(400).json({ message: 'Data de validade inválida. Use AAAA-MM-DD, não pode ser vazia ou passada.' });
         }
         if (!isNotEmpty(numero_serial)) { // Serial agora é sempre obrigatório (e não editável no front)
             return res.status(400).json({ message: 'O Número de Serial é obrigatório.' });
         }
        // --- FIM VALIDAÇÕES ---

        // Verifica existência (mantido)
        const queryBuscaTipo = ` SELECT i.descricao as tipo_insumo FROM insumo_filial_mutavel inf JOIN insumo i ON inf.insumo_codigo = i.codigo JOIN filial f ON inf.filial_cnpj = f.cnpj WHERE inf.codigo = ? AND f.empresa_cnpj = ?; `;
        const [rowsTipo] = await db.query(queryBuscaTipo, [id, empresaCnpj]);
        if (rowsTipo.length === 0) {
             return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão.' });
        }
        // Não precisamos mais validar serial condicionalmente aqui

        // Chama a função 'update' que não loga
        const affectedRows = await InsumoFilial.update(
            id,
            { validade, local, descricao, numero_serial },
            empresaCnpj
        );

        if (affectedRows === 0) { throw new Error('Falha ao atualizar o insumo (affectedRows=0).'); }
        res.json({ message: 'Insumo atualizado com sucesso!' });
    } catch (error) {
        // ... (tratamento de erro mantido) ...
        console.error('Erro ao editar insumo:', error);
        if (error.code === 'ER_LOCK_WAIT_TIMEOUT') { res.status(503).json({ message: 'Sistema ocupado. Tente novamente.' }); }
        else if (error.message.includes('não encontrado')) { res.status(404).json({ message: error.message }); }
        else { res.status(500).json({ message: error.message || 'Erro interno do servidor.' }); }
    }
};

exports.buscarInsumoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const insumo = await InsumoFilial.findById(id, empresaCnpj);
        if (!insumo) {
            return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão para acessá-lo.' });
        }
        res.json(insumo);
    } catch (error) {
        console.error('Erro ao buscar detalhes do insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.adicionarInsumoDireto = async (req, res) => {
    try {
        const { cnpj: filial_cnpj } = req.params;
        // Não precisamos do 'empresaCnpj' aqui, pois o middleware 'checkFilialOwnership' já protegeu a rota
        const insumoData = req.body;

        // --- VALIDAÇÕES OBRIGATÓRIAS ---
        if (!isNotEmpty(insumoData.descricao)) return res.status(400).json({ message: 'O tipo do insumo (descrição) é obrigatório.' });
        if (!isNotEmpty(insumoData.local)) return res.status(400).json({ message: 'A localização é obrigatória.' });
        if (!isValidFutureDate(insumoData.validade)) { // Usa a função que exige data
            return res.status(400).json({ message: 'Data de validade inválida. Use AAAA-MM-DD, não pode ser vazia ou passada.' });
        }
        if (!isNotEmpty(insumoData.numero_serial)) { // Serial agora é sempre obrigatório
            return res.status(400).json({ message: 'O Número de Serial é obrigatório.' });
        }
        // --- FIM VALIDAÇÕES ---

        await InsumoFilial.createDirect({
            ...insumoData,
            filial_cnpj,
            tipo_descricao: insumoData.descricao
            // REMOVEMOS 'empresaCnpj: empresaCnpj'
        });
        res.status(201).json({ message: 'Insumo adicionado/atualizado no inventário com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar insumo direto:', error);
        if (error.code === 'ER_DUP_ENTRY') {
             res.status(409).json({ message: 'Erro de duplicidade detectado (Serial já existe?).'}); // Mensagem mais específica
        } else {
             res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
        }
    }
};

exports.excluirItemInventario = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const insumoExistente = await InsumoFilial.findById(id, empresaCnpj);
        if (!insumoExistente) {
            return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão para excluí-lo.' });
        }
        const affectedRows = await InsumoFilial.remove(id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Falha ao excluir o insumo.' });
        }
        res.json({ message: 'Insumo removido do inventário com sucesso! (Histórico mantido)' });
    } catch (error) {
        console.error('Erro ao excluir insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.buscarHistoricoInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const historico = await InsumoFilial.findHistoryById(id, empresaCnpj);
        if (!historico) {
             return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão.' });
        }
        res.json(historico);
    } catch (error) {
        console.error('Erro ao buscar histórico do insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar histórico.' });
    }
};

exports.excluirRegistroHistorico = async (req, res) => {
    try {
        const { historia_id } = req.params;
        const { empresaCnpj } = req.user;
        const affectedRows = await InsumoFilial.removeImutavelRecord(historia_id, empresaCnpj);
        if (affectedRows === 0) {
            throw new Error('Não foi possível excluir o registro. Pode já ter sido removido ou a vistoria finalizada.');
        }
        res.json({ message: 'Registro de insumo removido da vistoria com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir registro histórico:', error);
        let statusCode = 500;
        if (error.message.includes('não encontrado') || error.message.includes('permissão')) {
            statusCode = 404;
        } else if (error.message.includes('finalizada')) {
            statusCode = 403;
        }
        res.status(statusCode).json({ message: error.message || 'Erro interno do servidor.' });
    }
};

exports.gerarRelatorioInventario = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const inventarioBruto = await InsumoFilial.findByFilial(filialCnpj);
        const filialDetails = await Filial.findById(filialCnpj, req.user.empresaCnpj);
        const inventarioOrdenado = sortInventoryByValidity(inventarioBruto);
        const filename = `Relatorio_Inventario_${filialCnpj}_${new Date().toISOString().split('T')[0]}.pdf`;
        console.log("[Controller] Dados antes de gerar PDF (verificar 'imagem'):",
            inventarioOrdenado.map(item => ({
                codigo: item.codigo,
                descricao: item.descricao,
                imagem_type: Buffer.isBuffer(item.imagem) ? `Buffer(${item.imagem.length})` : typeof item.imagem
            }))
        );
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await createInventoryPdf(inventarioOrdenado, filialDetails, res);
    } catch (error) {
        console.error('Erro ao gerar relatório de inventário:', error);
        if (!res.headersSent) {
             res.status(500).json({ message: 'Erro interno ao gerar o relatório.' });
        } else {
             console.error("Erro após início do envio do PDF. Resposta pode estar incompleta.");
             res.end();
        }
    }
};


// Cole estas funções ao final do arquivo inventarioController.js

/**
 * Busca um único tipo de insumo por ID.
 */
exports.buscarTipoInsumoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const tipoInsumo = await Insumo.findById(id);
        if (!tipoInsumo) {
            return res.status(404).json({ message: 'Tipo de insumo não encontrado.' });
        }
        res.json(tipoInsumo);
    } catch (error) {
        console.error('Erro ao buscar tipo de insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


exports.criarTipoInsumo = async (req, res) => {
    try {
        const { descricao } = req.body;
        if (!descricao || descricao.trim() === '') {
            return res.status(400).json({ message: 'A descrição é obrigatória.' });
        }

        // --- INÍCIO DA VALIDAÇÃO (BACKEND) ---
        if (!req.file) {
            // Se o 'req.file' (do multer) não existir, rejeita a criação.
            return res.status(400).json({ message: 'A imagem é obrigatória para o cadastro.' });
        }
        // Agora 'null' não é mais uma opção de caminho
        const imagemPath = `uploads/${req.file.filename}`;
        // --- FIM DA VALIDAÇÃO ---

        const novoId = await Insumo.createType(descricao, imagemPath); 
        res.status(201).json({ message: 'Tipo de insumo criado com sucesso!', id: novoId });

    } catch (error) {
        console.error('Erro ao criar tipo de insumo:', error);
        if (error.message.includes('Já existe')) {
            return res.status(409).json({ message: error.message });
        }
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.atualizarTipoInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const { descricao } = req.body;
        
        if (!descricao || descricao.trim() === '') {
            return res.status(400).json({ message: 'A descrição é obrigatória.' });
        }

        let imagemPath;
        if (req.file) {
            imagemPath = `uploads/${req.file.filename}`;
        }

        const affectedRows = await Insumo.updateType(id, descricao, imagemPath); // Não precisa de empresaCnpj
        
        if (affectedRows === 0) {
            // Este 'if' pode não ser atingido se o model lançar o erro primeiro, mas é uma boa proteção.
            return res.status(404).json({ message: 'Tipo de insumo não encontrado.' });
        }
        res.status(200).json({ message: 'Tipo de insumo atualizado com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar tipo de insumo:', error);
        // O model agora nos manda as mensagens de erro corretas
        if (error.message.includes('em uso') || error.message.includes('base')) {
            return res.status(403).json({ message: error.message }); // 403 = Proibido
        }
        if (error.message.includes('já está em uso')) {
            return res.status(409).json({ message: error.message }); // 409 = Conflito
        }
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


exports.excluirTipoInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const affectedRows = await Insumo.deleteType(id); // Não precisa de empresaCnpj
        
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Tipo de insumo não encontrado.' });
        }
        res.status(200).json({ message: 'Tipo de insumo excluído com sucesso!' });

    } catch (error) {
        console.error('Erro ao excluir tipo de insumo:', error);
        // Erro de "Insumo Base"
        if (error.message.includes('base')) {
            return res.status(403).json({ message: error.message }); // 403 = Proibido
        }
        // Erro de chave estrangeira (FK)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ message: 'Não é possível excluir. Este tipo de insumo já está em uso por itens no inventário.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

function sortInventoryByValidity(inventory) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const mapped = inventory.map(item => {
        let sortStatus = 1;
        let validityDate = item.validade ? parseDateAsLocal(item.validade) : null;
        if (validityDate) {
            const diffTime = validityDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 0) { sortStatus = 3; }
            else if (diffDays <= 30) { sortStatus = 2; }
        } else { sortStatus = 1; } // Sem validade = OK
        return { ...item, sortStatus, validityDate };
    });
    mapped.sort((a, b) => {
        if (a.sortStatus !== b.sortStatus) { return a.sortStatus - b.sortStatus; }
        if (a.sortStatus === 1) { // OK -> Validade DESC
             if (!a.validityDate && !b.validityDate) return 0;
             if (!a.validityDate) return -1;
             if (!b.validityDate) return 1;
             return b.validityDate - a.validityDate;
        } else { // Vencido ou Próximo -> Validade ASC
             if (!a.validityDate && !b.validityDate) return 0;
             if (!a.validityDate) return 1;
             if (!b.validityDate) return -1;
             return a.validityDate - b.validityDate;
        }
    });
    return mapped;
}