const db = require('../db');

class Filial {


    /**
     * NOVO: Busca todos os locais (distintos) já usados para insumos em uma filial.
     * @param {string} filialCnpj 
     * @returns {Promise<Array<string>>} Array com os nomes dos locais.
     */
    static async findLocationsByFilial(filialCnpj) {
        // Busca na tabela MUTAVEL pois reflete os locais atualmente em uso ou recentemente usados
        const query = `
            SELECT DISTINCT local 
            FROM insumo_filial_mutavel 
            WHERE filial_cnpj = ? 
              AND local IS NOT NULL 
              AND local <> '' -- Ignora vazios
            ORDER BY local ASC;
        `;
        const [rows] = await db.query(query, [filialCnpj]);
        return rows.map(row => row.local); // Retorna apenas o array de strings
    }
    /**
     * Busca uma única filial pelo seu CNPJ, garantindo que ela pertença à empresa logada.
     * @param {string} filialCnpj
     * @param {string} empresaCnpj 
     * @returns {Promise<object|null>}
     */
    static async findById(filialCnpj, empresaCnpj) {
        const query = 'SELECT * FROM filial WHERE cnpj = ? AND empresa_cnpj = ?';
        const [rows] = await db.query(query, [filialCnpj, empresaCnpj]);
        return rows[0];
    }

    /**
     * Busca todas as filiais pertencentes a uma empresa.
     * @param {string} empresaCnpj 
     * @returns {Promise<Array>} array com todas as filiais encontradas.
     */
    static async findByEmpresa(empresaCnpj) {
        const query = 'SELECT * FROM filial WHERE empresa_cnpj = ? ORDER BY nome ASC';
        const [rows] = await db.query(query, [empresaCnpj]);
        return rows;
    }

    /**
     * Cria um novo registro de filial no banco de dados.
     * @param {object} data - nome, cnpj, endereco, email_responsavel.
     * @param {string} empresaCnpj 
     * @returns {Promise<object>}
     */
    static async create(data, empresaCnpj) {
        const { nome, cnpj, endereco, email_responsavel } = data;
        const query = 'INSERT INTO filial (cnpj, empresa_cnpj, nome, endereco, email_responsavel) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.execute(query, [cnpj, empresaCnpj, nome, endereco, email_responsavel]);
        return result;
    }
}

module.exports = Filial;