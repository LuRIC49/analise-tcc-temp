const db = require('../db');

class Insumo {
    /**
     * Lista todos os tipos de insumo base.
     * @returns {Promise<Array>} Um array com os tipos de insumo.
     */
    static async findAllTypes() {
        const [rows] = await db.query('SELECT codigo, descricao, imagem FROM insumo ORDER BY descricao ASC');
        return rows;
    }

    /**
     * Encontra ou cria um tipo de insumo base.
     * @param {string} descricao - A descrição do tipo de insumo.
     * @param {object} connection - Uma conexão ativa para transações.
     * @returns {Promise<number>} O ID do insumo encontrado ou criado.
     */
    static async findOrCreateType(descricao, connection) {
        const conn = connection || db; // Usa a conexão da transação ou o pool padrão
        let [rows] = await conn.query('SELECT codigo FROM insumo WHERE descricao = ?', [descricao]);
        if (rows.length > 0) {
            return rows[0].codigo;
        } else {
            const [result] = await conn.execute('INSERT INTO insumo (descricao) VALUES (?)', [descricao]);
            return result.insertId;
        }
    }
}

class InsumoFilial {
    /**
     * Lista todos os insumos registrados em uma filial (inventário geral).
     * @param {string} filialCnpj - O CNPJ da filial.
     * @returns {Promise<Array>} Um array com os insumos da filial.
     */
    static async findByFilial(filialCnpj) {
        const query = `
            SELECT inf.codigo, inf.validade, inf.local, inf.descricao AS descricao_item, i.descricao, i.imagem
            FROM insumo_filial AS inf
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            WHERE inf.filial_cnpj = ?
            ORDER BY i.descricao ASC;
        `;
        const [rows] = await db.query(query, [filialCnpj]);
        return rows;
    }

    /**
     * Lista todos os insumos registrados DENTRO de uma vistoria específica.
     * @param {number} vistoriaId - O ID da vistoria.
     * @returns {Promise<Array>} Um array com os insumos da vistoria.
     */
    static async findByVistoria(vistoriaId) {
        const query = `
            SELECT i.descricao, inf.*
            FROM insumo_filial AS inf
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            WHERE inf.vistoria_codigo = ?;
        `;
        const [rows] = await db.query(query, [vistoriaId]);
        return rows;
    }

    /**
     * Adiciona um novo insumo a uma vistoria (e à filial).
     * @param {object} data - Contém filial_cnpj, vistoria_codigo, tipo_descricao, etc.
     * @returns {Promise<object>} O resultado da inserção.
     */
    static async create(data) {
        const { filial_cnpj, vistoria_codigo, tipo_descricao, validade, local, descricao_item } = data;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const insumo_codigo = await Insumo.findOrCreateType(tipo_descricao, connection);
            const query = 'INSERT INTO insumo_filial (insumo_codigo, filial_cnpj, vistoria_codigo, validade, local, descricao) VALUES (?, ?, ?, ?, ?, ?)';
            const [result] = await connection.execute(query, [insumo_codigo, filial_cnpj, vistoria_codigo, validade || null, local, descricao_item || null]);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error; // Propaga o erro para o controller
        } finally {
            connection.release();
        }
    }

    /**
     * Remove um insumo do inventário (insumo_filial).
     * @param {number} id - O ID do registro em insumo_filial.
     * @returns {Promise<number>} O número de linhas afetadas.
     */
    static async remove(id) {
        const [result] = await db.execute('DELETE FROM insumo_filial WHERE codigo = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = { Insumo, InsumoFilial };