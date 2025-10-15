const db = require('../db');

class Vistoria {
    /**
     * Busca uma vistoria pelo seu código (ID).
     * @param {number} id - O código da vistoria.
     * @returns {Promise<object|null>} O objeto da vistoria ou null.
     */
    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM vistoria WHERE codigo = ?', [id]);
        return rows[0];
    }

    /**
     * Busca todas as vistorias de uma filial específica.
     * @param {string} filialCnpj - O CNPJ da filial.
     * @returns {Promise<Array>} Um array com as vistorias encontradas.
     */
    static async findByFilial(filialCnpj) {
        const query = 'SELECT * FROM vistoria WHERE filial_cnpj = ? ORDER BY data_inicio DESC';
        const [rows] = await db.query(query, [filialCnpj]);
        return rows;
    }

    /**
     * Cria uma nova vistoria.
     * @param {object} data - Contém filial_cnpj e tecnico_responsavel.
     * @returns {Promise<number>} O ID da nova vistoria criada.
     */
    static async create({ filial_cnpj, tecnico_responsavel }) {
        const query = 'INSERT INTO vistoria (filial_cnpj, data_inicio, tecnico_responsavel) VALUES (?, CURDATE(), ?)';
        const [result] = await db.execute(query, [filial_cnpj, tecnico_responsavel]);
        return result.insertId;
    }

    /**
     * Marca uma vistoria como finalizada, preenchendo a data_fim.
     * @param {number} id - O código da vistoria a ser finalizada.
     * @returns {Promise<number>} O número de linhas afetadas.
     */
    static async finalize(id) {
        const query = 'UPDATE vistoria SET data_fim = CURDATE() WHERE codigo = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows;
    }

    /**
     * Remove uma vistoria do banco de dados.
     * A regra ON DELETE CASCADE cuidará de remover os insumos_filial associados.
     * @param {number} id - O código da vistoria a ser removida.
     * @returns {Promise<number>} O número de linhas afetadas.
     */
    static async remove(id) {
        const query = 'DELETE FROM vistoria WHERE codigo = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows;
    }
}

module.exports = Vistoria;