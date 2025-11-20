const db = require('../db');
const { parseDateAsLocal, formatDateForClient } = require('../utils/dateFormatter');



/**
 * Verifica se um tipo de insumo está em uso em QUALQUER tabela.
 * Lança um erro se estiver em uso.
 * @param {number} id - O insumo_codigo
 * @param {object} connection - O pool de conexão
 */
async function checkInsumoUsage(id, connection) {
    const conn = connection || db;
    
    
    let query = 'SELECT codigo FROM insumo_filial_mutavel WHERE insumo_codigo = ? LIMIT 1';
    let [rows] = await conn.query(query, [id]);
    if (rows.length > 0) {
        throw new Error('Este tipo de insumo está em uso no inventário e não pode ser modificado.');
    }

    
    query = 'SELECT codigo FROM insumo_filial_vistoria_imutavel WHERE insumo_codigo = ? LIMIT 1';
    [rows] = await conn.query(query, [id]);
    if (rows.length > 0) {
        throw new Error('Este tipo de insumo está em uso no histórico (imutavel) e não pode ser modificado.');
    }
}



class Insumo {
    
    /**
     * Busca todos os tipos de insumos (Globais e Custom).
     * Seleciona o 'is_base' para o frontend saber o que bloquear.
     */
    static async findAllTypes() {
        
        const query = `
            SELECT codigo, descricao, imagem, is_base 
            FROM insumo 
            ORDER BY descricao ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    /**
     * Busca um único TIPO de insumo pelo seu código.
     * @param {number} id 
     * @returns {Promise<object|null>}
     */
    static async findById(id) {
        
        const [rows] = await db.query('SELECT codigo, descricao, imagem, is_base FROM insumo WHERE codigo = ?', [id]);
        return rows[0];
    }

    /**
     * Cria um novo TIPO de insumo (sempre como "Não-Base").
     * @param {string} descricao 
     * @param {string} imagemPath
     * @returns {Promise<number>} O ID do novo tipo.
     */
    static async createType(descricao, imagemPath) {
        const descricaoPadronizada = descricao.trim().toLowerCase();
        
        
        
        const query = 'INSERT INTO insumo (descricao, imagem) VALUES (?, ?)'; 
        try {
            const [result] = await db.execute(query, [descricaoPadronizada, imagemPath || null]);
            return result.insertId;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Já existe um tipo de insumo com esta descrição.');
            }
            throw error;
        }
    }

    /**
     * Atualiza um TIPO de insumo.
     * BLOQUEIA se for 'is_base = 1' ou se estiver 'em uso'.
     * @param {number} id 
     * @param {string} descricao 
     * @param {string} imagemPath 
     * @returns {Promise<number>} Número de linhas afetadas.
     */
    static async updateType(id, descricao, imagemPath) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            
            const [rowsTipo] = await connection.query('SELECT is_base FROM insumo WHERE codigo = ? FOR UPDATE', [id]);
            if (rowsTipo.length === 0) {
                throw new Error('Tipo de insumo não encontrado.');
            }
            if (rowsTipo[0].is_base === 1) {
                throw new Error('Não é permitido editar um tipo de insumo base.');
            }

            
            
            await checkInsumoUsage(id, connection);

            
            const descricaoPadronizada = descricao.trim().toLowerCase();
            let query;
            let params;

            if (imagemPath !== undefined) {
                query = 'UPDATE insumo SET descricao = ?, imagem = ? WHERE codigo = ?';
                params = [descricaoPadronizada, imagemPath, id];
            } else {
                query = 'UPDATE insumo SET descricao = ? WHERE codigo = ?';
                params = [descricaoPadronizada, id];
            }
            
            const [result] = await connection.execute(query, params);
            await connection.commit();
            return result.affectedRows;

        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('A descrição fornecida já está em uso por outro tipo.');
            }
            throw error; 
        } finally {
            connection.release();
        }
    }

    /**
     * Exclui um TIPO de insumo.
     * BLOQUEIA se for 'is_base = 1'.
     * (O DB bloqueará via FK se estiver em uso).
     * @param {number} id 
     * @returns {Promise<number>} Número de linhas afetadas.
     */
    static async deleteType(id) {
        
        const [rowsTipo] = await db.query('SELECT is_base FROM insumo WHERE codigo = ?', [id]);
        if (rowsTipo.length === 0) {
            throw new Error('Tipo de insumo não encontrado.');
        }
        if (rowsTipo[0].is_base === 1) {
            throw new Error('Não é permitido excluir um tipo de insumo base.');
        }

        
        
        const [result] = await db.execute('DELETE FROM insumo WHERE codigo = ?', [id]);
        return result.affectedRows;
    }


    /**
     * Encontra (ou cria) um tipo de insumo.
     * @param {string} descricao - O texto (ex: "extintor pqs")
     * @param {object} connection - O pool de conexão (opcional)
     */
    static async findOrCreateType(descricao, connection) {
        const conn = connection || db;
        const descricaoPadronizada = descricao.trim().toLowerCase();

        
        let [rows] = await conn.query('SELECT codigo FROM insumo WHERE descricao = ?', [descricaoPadronizada]);
        if (rows.length > 0) {
            return rows[0].codigo;
        }
        
        
        const [result] = await conn.execute('INSERT INTO insumo (descricao) VALUES (?)', [descricaoPadronizada]);
        return result.insertId;
    }
}








class InsumoFilial {

    
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

    
    static async findByFilial(filialCnpj) {
        
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
                descricao: row.tipo_descricao, 
                imagem: row.imagem, 
                status: status,
                validade_formatada: formatDateForClient(row.validade)
            };
        });
    }

    
    static async findSeriaisByFilial(filialCnpj) {
        const query = ` SELECT DISTINCT numero_serial FROM insumo_filial_mutavel WHERE filial_cnpj = ? AND numero_serial IS NOT NULL ORDER BY numero_serial ASC; `;
        const [rows] = await db.query(query, [filialCnpj]);
        return rows.map(row => row.numero_serial);
    }

    /**
     * Busca todos os números de seriais distintos para uma filial E UM TIPO DE INSUMO.
     * @param {string} filialCnpj
     * @param {number} insumoCodigo
     * @returns {Promise<Array<string>>}
     */
    static async findSeriaisByFilialAndCodigo(filialCnpj, insumoCodigo) {
        const query = `
            SELECT DISTINCT numero_serial 
            FROM insumo_filial_mutavel 
            WHERE filial_cnpj = ? 
              AND insumo_codigo = ? 
              AND numero_serial IS NOT NULL 
            ORDER BY numero_serial ASC;
        `;
        const [rows] = await db.query(query, [filialCnpj, insumoCodigo]);
        return rows.map(row => row.numero_serial);
    }

    
    static async findLocationsByFilial(filialCnpj) { 
        const query = ` SELECT DISTINCT local FROM insumo_filial_mutavel WHERE filial_cnpj = ? AND local IS NOT NULL AND local <> '' ORDER BY local ASC; `;
        const [rows] = await db.query(query, [filialCnpj]);
        return rows.map(row => row.local);
    }

    
    static async findById(id, empresaCnpj) {
        
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
            imagem: row.imagem, 
            validade_formatada: formatDateForClient(row.validade)
        };
    }

    
    static async findByVistoria(vistoriaId) {
        
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
            imagem: row.imagem, 
            validade_formatada: formatDateForClient(row.validade)
        }));
    }

    
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

    
  static async update(id, newData, empresaCnpj) {
        
        const { validade, local, descricao, numero_serial } = newData;
        const connection = await db.getConnection(); 
        try {
            await connection.beginTransaction(); 

            const queryUpdate = `
                UPDATE insumo_filial_mutavel
                SET validade = ?, local = ?, descricao = ?, numero_serial = ?
                WHERE codigo = ?;
            `;
            
            const [updateResult] = await connection.execute(queryUpdate, [
                validade || null,
                local,
                descricao || null,
                numero_serial || null,
                id
            ]);

            
            if (updateResult.affectedRows === 0) {
                 
                 throw new Error('Insumo não encontrado para atualização (ID: ' + id + ')');
            }

            await connection.commit();
            console.log(`Atualizado (Manual SEM LOG): mutavel.codigo=${id}`);
            return updateResult.affectedRows;

        } catch (error) {
            await connection.rollback();
            console.error("Erro em update:", error);
            
            throw error;
        } finally {
            connection.release();
        }
    }

    
    static async findHistoryById(idMutavel, empresaCnpj) {
        const connection = await db.getConnection();
        try {
            const queryBuscaMutavel = ` SELECT inf.insumo_codigo, inf.filial_cnpj, inf.numero_serial FROM insumo_filial_mutavel AS inf JOIN filial AS f ON inf.filial_cnpj = f.cnpj WHERE inf.codigo = ? AND f.empresa_cnpj = ?; `;
            const [rowsMutavel] = await connection.query(queryBuscaMutavel, [idMutavel, empresaCnpj]);
            if (rowsMutavel.length === 0) { return null; }
            const { insumo_codigo, filial_cnpj, numero_serial } = rowsMutavel[0];
            
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
                imagem: row.imagem, 
                validade_formatada: formatDateForClient(row.validade)
            }));
        } catch (error) { console.error("Erro no Model ao buscar histórico:", error); throw error; }
        finally { connection.release(); }
    }

    
    static async remove(id) {
        const [result] = await db.execute('DELETE FROM insumo_filial_mutavel WHERE codigo = ?', [id]);
        console.log(`Removido (Manual): mutavel.codigo=${id}`);
        return result.affectedRows;
    }

    
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