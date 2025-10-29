// models/insumoModel.js
const db = require('../db');
const { parseDateAsLocal, formatDateForClient } = require('../utils/dateFormatter');

// Classe para interagir com a tabela 'insumo' (tipos de insumo)
class Insumo {
    // Busca todos os tipos de insumos cadastrados.
    static async findAllTypes() {
        // [CORRIGIDO] Seleciona 'imagem' (o BLOB)
        const [rows] = await db.query('SELECT codigo, descricao, imagem FROM insumo ORDER BY descricao ASC');
        return rows;
    }

    // Encontra o código de um tipo pelo nome ou cria um novo se não existir.
    static async findOrCreateType(descricao, connection) {
        const conn = connection || db;
        let [rows] = await conn.query('SELECT codigo FROM insumo WHERE descricao = ?', [descricao]);
        if (rows.length > 0) {
            return rows[0].codigo;
        } else {
            // Assume que a tabela 'insumo' tem 'imagem' (BLOB) que pode ser NULL inicialmente
            const [result] = await conn.execute('INSERT INTO insumo (descricao) VALUES (?)', [descricao]);
            return result.insertId;
        }
    }
}

// Classe para interagir com as tabelas de inventário da filial (mutável e imutável)
class InsumoFilial {

    // Adiciona ou ATUALIZA um insumo diretamente no inventário (sem vistoria), operando APENAS na tabela MUTÁVEL.
    static async createDirect(data) {
        const { filial_cnpj, tipo_descricao, validade, local, descricao_item, numero_serial } = data;
        if (!filial_cnpj || !tipo_descricao || !local) {
             throw new Error("Dados essenciais faltando (CNPJ Filial, Tipo, Local) para createDirect.");
        }
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const insumo_codigo = await Insumo.findOrCreateType(tipo_descricao, connection);
            let codigoExistente = null;
            if (numero_serial && numero_serial.trim() !== '') {
                 const queryBuscaExistente = ` SELECT codigo FROM insumo_filial_mutavel WHERE filial_cnpj = ? AND insumo_codigo = ? AND numero_serial = ? FOR UPDATE; `;
                 const [rowsExistente] = await connection.query(queryBuscaExistente, [filial_cnpj, insumo_codigo, numero_serial]);
                 if (rowsExistente.length > 0) codigoExistente = rowsExistente[0].codigo;
            }
            let resultadoOperacaoMutavel;
            if (codigoExistente) {
                const queryMutavelUpdate = 'UPDATE insumo_filial_mutavel SET validade = ?, local = ?, descricao = ? WHERE codigo = ?';
                [resultadoOperacaoMutavel] = await connection.execute(queryMutavelUpdate, [validade || null, local, descricao_item || null, codigoExistente]);
                console.log(`Atualizado (Direto): mutavel.codigo=${codigoExistente}`);
            } else {
                 const queryMutavelInsert = 'INSERT INTO insumo_filial_mutavel (insumo_codigo, filial_cnpj, validade, local, descricao, numero_serial) VALUES (?, ?, ?, ?, ?, ?)';
                [resultadoOperacaoMutavel] = await connection.execute(queryMutavelInsert, [insumo_codigo, filial_cnpj, validade || null, local, descricao_item || null, numero_serial || null]);
                console.log(`Inserido (Direto): mutavel.codigo=${resultadoOperacaoMutavel.insertId}`);
            }
            await connection.commit();
            return resultadoOperacaoMutavel;
        } catch (error) {
            await connection.rollback(); console.error("Erro em createDirect:", error); throw error;
        } finally { connection.release(); }
    }

    // Insere um registro na tabela de histórico imutável.
    static async createImutavelRecord(insumoData, vistoriaCodigoOverride = null, connection) {
        const conn = connection || db;
        const numeroSerial = insumoData.numero_serial || null;
        const validade = insumoData.validade || null;
        const local = insumoData.local || null;
        const descricao = insumoData.descricao_item !== undefined ? insumoData.descricao_item : (insumoData.descricao || null);
        const insumoCodigo = insumoData.insumo_codigo;
        const filialCnpj = insumoData.filial_cnpj;
        if(!insumoCodigo || !filialCnpj) { throw new Error("Dados incompletos (insumo_codigo ou filial_cnpj) ao tentar salvar histórico."); }
        const query = ` INSERT INTO insumo_filial_vistoria_imutavel (insumo_codigo, filial_cnpj, vistoria_codigo, validade, local, descricao, numero_serial) VALUES (?, ?, ?, ?, ?, ?, ?); `;
        const vistoriaCodigoParaSalvar = vistoriaCodigoOverride !== null ? vistoriaCodigoOverride : (insumoData.vistoria_codigo === undefined ? null : insumoData.vistoria_codigo);
        await conn.execute(query, [ insumoCodigo, filialCnpj, vistoriaCodigoParaSalvar, validade, local, descricao, numeroSerial ]);
        console.log(`Registro Histórico criado: insumo=${insumoCodigo}, filial=${filialCnpj}, vistoria=${vistoriaCodigoParaSalvar}, serial=${numeroSerial}`);
    }

    // Busca todos os insumos do inventário ATUAL (mutável) de uma filial, incluindo status de validade e imagem BLOB.
    static async findByFilial(filialCnpj) {
        // [CORRIGIDO] Seleciona i.imagem (o BLOB)
        const query = `
            SELECT inf.codigo, inf.validade, inf.local, inf.descricao AS descricao_item,
                   i.descricao AS tipo_descricao, i.imagem, inf.numero_serial
            FROM insumo_filial_mutavel AS inf
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            WHERE inf.filial_cnpj = ?
            ORDER BY i.descricao ASC;
        `;
        const [rows] = await db.query(query, [filialCnpj]);
        return rows.map(row => {
            let status = 'status-ok';
            if (row.validade) {
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                const dataValidade = parseDateAsLocal(row.validade);
                if (dataValidade) {
                    const diffTime = dataValidade - hoje;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) { status = 'status-expired'; }
                    else if (diffDays <= 30) { status = 'status-warning'; }
                } else { status = 'status-warning'; }
            }
            return {
                ...row,
                descricao: row.tipo_descricao, // Renomeia para consistência
                imagem: row.imagem, // [CORRIGIDO] Passa o BLOB como 'imagem'
                status: status,
                validade_formatada: formatDateForClient(row.validade)
            };
        });
    }

    // Busca todos os números de seriais distintos para uma filial na tabela mutável.
    static async findSeriaisByFilial(filialCnpj) {
        const query = ` SELECT DISTINCT numero_serial FROM insumo_filial_mutavel WHERE filial_cnpj = ? AND numero_serial IS NOT NULL ORDER BY numero_serial ASC; `;
        const [rows] = await db.query(query, [filialCnpj]);
        return rows.map(row => row.numero_serial);
    }

    // Busca todos os locais (distintos) usados por uma filial na tabela mutável.
    static async findLocationsByFilial(filialCnpj) { // Pode estar em filialModel.js
        const query = ` SELECT DISTINCT local FROM insumo_filial_mutavel WHERE filial_cnpj = ? AND local IS NOT NULL AND local <> '' ORDER BY local ASC; `;
        const [rows] = await db.query(query, [filialCnpj]);
        return rows.map(row => row.local);
    }

    // Busca um único insumo do inventário ATUAL (mutável) pelo seu ID, verificando a propriedade.
    static async findById(id, empresaCnpj) {
        // [CORRIGIDO] Seleciona i.imagem (o BLOB)
        const query = `
            SELECT inf.*, i.descricao as tipo_insumo, i.imagem
            FROM insumo_filial_mutavel AS inf
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            JOIN filial AS f ON inf.filial_cnpj = f.cnpj
            WHERE inf.codigo = ? AND f.empresa_cnpj = ?;
        `;
        const [rows] = await db.query(query, [id, empresaCnpj]);
        if (rows.length === 0) return null;
        const row = rows[0];
        return {
            ...row,
            imagem: row.imagem, // [CORRIGIDO] Passa o BLOB
            validade_formatada: formatDateForClient(row.validade)
        };
    }

    // Busca todos os registros históricos (imutável) associados a uma vistoria específica.
    static async findByVistoria(vistoriaId) {
        // [CORRIGIDO] Seleciona i.imagem (o BLOB)
        const query = `
            SELECT im.*, i.descricao AS tipo_insumo, i.imagem, mut.codigo AS codigo_atual
            FROM insumo_filial_vistoria_imutavel AS im
            JOIN insumo AS i ON im.insumo_codigo = i.codigo
            LEFT JOIN insumo_filial_mutavel AS mut
                ON im.filial_cnpj = mut.filial_cnpj
                AND im.insumo_codigo = mut.insumo_codigo
                AND im.numero_serial <=> mut.numero_serial
            WHERE im.vistoria_codigo = ?
            ORDER BY im.codigo ASC;
        `;
        const [rows] = await db.query(query, [vistoriaId]);
        return rows.map(row => ({
            ...row,
            descricao: row.tipo_insumo,
            imagem: row.imagem, // [CORRIGIDO] Passa o BLOB
            validade_formatada: formatDateForClient(row.validade)
        }));
    }

    // Adiciona ou Atualiza um insumo via Vistoria, logando o estado da vistoria no histórico (imutável) e atualizando/inserindo no estado atual (mutável).
    static async create(data) {
        const { filial_cnpj, vistoria_codigo, tipo_descricao, validade, local, descricao_item, numero_serial } = data;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const insumo_codigo = await Insumo.findOrCreateType(tipo_descricao, connection);
            const dadosParaHistoricoImutavel = { insumo_codigo, filial_cnpj, vistoria_codigo, validade, local, descricao: descricao_item, numero_serial };
            await InsumoFilial.createImutavelRecord(dadosParaHistoricoImutavel, vistoria_codigo, connection);
            let codigoExistenteMutavel = null;
            if (numero_serial && numero_serial.trim() !== '') {
                 const queryBuscaMutavel = ` SELECT codigo FROM insumo_filial_mutavel WHERE filial_cnpj = ? AND insumo_codigo = ? AND numero_serial = ? FOR UPDATE; `;
                 const [rowsMutavel] = await connection.query(queryBuscaMutavel, [filial_cnpj, insumo_codigo, numero_serial]);
                 if (rowsMutavel.length > 0) codigoExistenteMutavel = rowsMutavel[0].codigo;
            }
            if (codigoExistenteMutavel) {
                 const queryMutavelUpdate = 'UPDATE insumo_filial_mutavel SET validade = ?, local = ?, descricao = ? WHERE codigo = ?';
                 await connection.execute(queryMutavelUpdate, [validade || null, local, descricao_item || null, codigoExistenteMutavel]);
                 console.log(`Atualizado (Vistoria ${vistoria_codigo}): mutavel.codigo=${codigoExistenteMutavel}`);
            } else {
                 const queryMutavelInsert = 'INSERT INTO insumo_filial_mutavel (insumo_codigo, filial_cnpj, validade, local, descricao, numero_serial) VALUES (?, ?, ?, ?, ?, ?)';
                 const [insertResult] = await connection.execute(queryMutavelInsert, [insumo_codigo, filial_cnpj, validade || null, local, descricao_item || null, numero_serial || null]);
                 console.log(`Inserido (Vistoria ${vistoria_codigo}): mutavel.codigo=${insertResult.insertId}`);
            }
            await connection.commit();
        } catch (error) { await connection.rollback(); console.error("Erro em create (via vistoria):", error); throw error; }
        finally { connection.release(); }
    }

    // Atualiza um insumo via Edição Manual, logando o estado *anterior* no histórico (imutável) com vistoria NULL.
  static async update(id, newData, empresaCnpj) {
        // A verificação de propriedade/existência agora é feita no controller antes de chamar
        const { validade, local, descricao, numero_serial } = newData;
        const connection = await db.getConnection(); // Ainda usamos conexão para consistência futura
        try {
            await connection.beginTransaction(); // Mantém transação para update único

            const queryUpdate = `
                UPDATE insumo_filial_mutavel
                SET validade = ?, local = ?, descricao = ?, numero_serial = ?
                WHERE codigo = ?;
            `;
            // Nota: numero_serial não é editável no front, mas mantemos na query caso seja usado via API
            const [updateResult] = await connection.execute(queryUpdate, [
                validade || null,
                local,
                descricao || null,
                numero_serial || null,
                id
            ]);

            // Verifica se algo foi realmente atualizado (redundante se controller já verificou)
            if (updateResult.affectedRows === 0) {
                 // Lança erro se o ID não existia (embora controller deva pegar isso)
                 throw new Error('Insumo não encontrado para atualização (ID: ' + id + ')');
            }

            await connection.commit();
            console.log(`Atualizado (Manual SEM LOG): mutavel.codigo=${id}`);
            return updateResult.affectedRows;

        } catch (error) {
            await connection.rollback();
            console.error("Erro em update:", error);
            // Propaga o erro para o controller tratar (ex: 404 se ID não existir)
            throw error;
        } finally {
            connection.release();
        }
    }

    // Busca o histórico (imutável) de um insumo específico, filtrando por serial.
    static async findHistoryById(idMutavel, empresaCnpj) {
        const connection = await db.getConnection();
        try {
            const queryBuscaMutavel = ` SELECT inf.insumo_codigo, inf.filial_cnpj, inf.numero_serial FROM insumo_filial_mutavel AS inf JOIN filial AS f ON inf.filial_cnpj = f.cnpj WHERE inf.codigo = ? AND f.empresa_cnpj = ?; `;
            const [rowsMutavel] = await connection.query(queryBuscaMutavel, [idMutavel, empresaCnpj]);
            if (rowsMutavel.length === 0) { return null; }
            const { insumo_codigo, filial_cnpj, numero_serial } = rowsMutavel[0];
            // [CORRIGIDO] Seleciona i.imagem (o BLOB)
            const queryBuscaImutavel = `
                SELECT im.codigo AS historia_id, im.vistoria_codigo, im.validade, im.local,
                       im.descricao, im.numero_serial, i.descricao AS tipo_insumo, i.imagem
                FROM insumo_filial_vistoria_imutavel AS im
                JOIN insumo AS i ON im.insumo_codigo = i.codigo
                WHERE im.insumo_codigo = ? AND im.filial_cnpj = ? AND im.numero_serial <=> ?
                ORDER BY im.codigo ASC;
            `;
            const [rowsImutavel] = await connection.query(queryBuscaImutavel, [insumo_codigo, filial_cnpj, numero_serial]);
            return rowsImutavel.map(row => ({
                ...row,
                imagem: row.imagem, // [CORRIGIDO] Passa o BLOB
                validade_formatada: formatDateForClient(row.validade)
            }));
        } catch (error) { console.error("Erro no Model ao buscar histórico:", error); throw error; }
        finally { connection.release(); }
    }

    // Remove um registro da tabela mutável (inventário atual). O histórico é preservado.
    static async remove(id) {
        const [result] = await db.execute('DELETE FROM insumo_filial_mutavel WHERE codigo = ?', [id]);
        console.log(`Removido (Manual): mutavel.codigo=${id}`);
        return result.affectedRows;
    }

    // Remove um registro específico da tabela imutável (histórico), apenas se a vistoria associada estiver aberta.
    static async removeImutavelRecord(historia_id, empresaCnpj) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const queryBusca = ` SELECT im.codigo, v.data_fim FROM insumo_filial_vistoria_imutavel im JOIN vistoria v ON im.vistoria_codigo = v.codigo JOIN filial f ON im.filial_cnpj = f.cnpj WHERE im.codigo = ? AND f.empresa_cnpj = ? FOR UPDATE; `;
            const [rows] = await connection.query(queryBusca, [historia_id, empresaCnpj]);
            if (rows.length === 0) { throw new Error('Registro histórico não encontrado ou você não tem permissão.'); }
            if (rows[0].data_fim !== null) { throw new Error('Ação proibida. Não é possível remover insumos de uma vistoria finalizada.'); }
            const queryDelete = ` DELETE FROM insumo_filial_vistoria_imutavel WHERE codigo = ?; `;
            const [deleteResult] = await connection.execute(queryDelete, [historia_id]);
            await connection.commit();
            console.log(`Removido (Histórico): imutavel.codigo=${historia_id}`);
            return deleteResult.affectedRows;
        } catch (error) { await connection.rollback(); console.error("Erro em removeImutavelRecord:", error); throw error; }
        finally { connection.release(); }
    }
}

module.exports = { Insumo, InsumoFilial };