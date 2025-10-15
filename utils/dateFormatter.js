/**
 * CORREÇÃO: Constrói um objeto Date a partir de uma string 'AAAA-MM-DD' ou simplesmente retorna o objeto
 * se ele já for do tipo Date, ignorando problemas de fuso horário.
 * @param {string|Date} dateInput - A data no formato 'AAAA-MM-DD' ou um objeto Date.
 * @returns {Date|null} O objeto de data correspondente.
 */
function parseDateAsLocal(dateInput) {
    // Se a entrada for nula ou indefinida, retorna nulo.
    if (!dateInput) return null;

    // Se a entrada já for um objeto Date, simplesmente a retorna.
    if (dateInput instanceof Date) {
        return dateInput;
    }

    // Se for uma string, processa como antes.
    if (typeof dateInput === 'string') {
        const [year, month, day] = dateInput.split('-').map(Number);
        // O mês em JavaScript é 0-indexado (0 = Janeiro), então subtraímos 1.
        return new Date(year, month - 1, day);
    }
    
    // Se não for nem um Date nem uma string, retorna nulo para evitar erros.
    return null;
}

/**
 * Formata um objeto Date para o formato 'DD/MM/AAAA' para exibição no cliente.
 * @param {Date|string} date - O objeto de data ou a string do banco.
 * @returns {string|null} A data formatada ou 'N/A'.
 */
function formatDateForClient(date) {
    if (!date) return 'N/A';
    
    // Usa a função robusta para garantir que temos um objeto Date.
    const dateObj = parseDateAsLocal(date);
    
    if (!dateObj || isNaN(dateObj)) return 'Data Inválida';
    
    // toLocaleDateString é a forma mais segura de formatar para o padrão local (Brasil).
    return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); // Adicionado timeZone para consistência
}

module.exports = {
    parseDateAsLocal,
    formatDateForClient
};