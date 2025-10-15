const db = require('../db');

class Filial {
    /**
     * Busca uma única filial pelo seu CNPJ, garantindo que ela pertença à empresa logada.
     * @param {string} filialCnpj - O CNPJ da filial a ser encontrada.
     * @param {string} empresaCnpj - O CNPJ da empresa-mãe (para segurança).
     * @returns {Promise<object|null>} O objeto da filial ou null se не for encontrada.
     */
    static async findById(filialCnpj, empresaCnpj) {
        const query = 'SELECT * FROM filial WHERE cnpj = ? AND empresa_cnpj = ?';
        const [rows] = await db.query(query, [filialCnpj, empresaCnpj]);
        return rows[0];
    }

    /**
     * Busca todas as filiais pertencentes a uma empresa.
     * @param {string} empresaCnpj - O CNPJ da empresa-mãe.
     * @returns {Promise<Array>} Um array com todas as filiais encontradas.
     */
    static async findByEmpresa(empresaCnpj) {
        const query = 'SELECT * FROM filial WHERE empresa_cnpj = ? ORDER BY nome ASC';
        const [rows] = await db.query(query, [empresaCnpj]);
        return rows;
    }

    /**
     * Cria um novo registro de filial no banco de dados.
     * @param {object} data - Contém nome, cnpj, endereco, email_responsavel.
     * @param {string} empresaCnpj - O CNPJ da empresa-mãe.
     * @returns {Promise<object>} O resultado da inserção.
     */
    static async create(data, empresaCnpj) {
        const { nome, cnpj, endereco, email_responsavel } = data;
        const query = 'INSERT INTO filial (cnpj, empresa_cnpj, nome, endereco, email_responsavel) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.execute(query, [cnpj, empresaCnpj, nome, endereco, email_responsavel]);
        return result;
    }
}

module.exports = Filial;