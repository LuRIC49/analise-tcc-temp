// utils/pdfGenerator.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// --- Funções Auxiliares de Data ---
function parseDateAsLocal(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput === 'string') {
        const dateString = dateInput.split('T')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            console.error("[PDF Generator] Formato de data inválido:", dateInput);
            return null;
        }
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    return null;
}

function formatDateForClient(date) {
    if (!date) return 'N/A';
    const dateObj = parseDateAsLocal(date);
    if (!dateObj || isNaN(dateObj)) return 'Data Inválida';
    return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// --- Função Principal para Criar o PDF ---
async function createInventoryPdf(inventoryData, filialDetails, res) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.pipe(res);

        // --- Cabeçalho do Documento ---
        doc.fontSize(18).font('Helvetica-Bold').text('Relatório de Inventário', { align: 'center' });
        doc.moveDown();
        doc.font('Helvetica');
        if (filialDetails) {
            doc.fontSize(12).text(`Filial: ${filialDetails.nome}`);
            doc.fontSize(10).text(`CNPJ: ${filialDetails.cnpj}`);
            doc.fontSize(10).text(`Endereço: ${filialDetails.endereco}`);
        }
        doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`);
        doc.moveDown(2);

        // --- Tabela de Itens: Definições ---
        const tableTop = doc.y;
        const tableLeft = 50;
        const tableRight = 550;
        const backgroundRightPadding = 5;
        const rowHeight = 55;
        const imageWidth = 45;
        const columnGap = 10;
        const imageX = tableLeft;
        const descX = imageX + imageWidth + columnGap;
        const statusX = tableRight - 50;
        const validadeX = statusX - 80 - columnGap;
        const localX = validadeX - 120 - columnGap;
        const descWidth = localX - descX - columnGap;

        // --- Cabeçalho da Tabela ---
        const headerY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Item / Serial', descX, headerY, { width: descWidth });
        doc.text('Local', localX, headerY, { width: 120 });
        doc.text('Validade', validadeX, headerY, { width: 80 });
        doc.text('Status', statusX, headerY, { width: 50, align: 'right' });
        const headerBottomY = headerY + doc.currentLineHeight() + 2;
        doc.moveTo(tableLeft, headerBottomY).lineTo(tableRight, headerBottomY).strokeColor('#333333').lineWidth(1).stroke();
        doc.font('Helvetica');
        doc.moveDown(1);

        // --- Linhas da Tabela ---
        inventoryData.forEach((item, index) => {
            let rowY = doc.y;

            if (rowY + rowHeight > 780) {
                 doc.addPage();
                 const newHeaderY = doc.y;
                 doc.fontSize(10).font('Helvetica-Bold');
                 doc.text('Item / Serial', descX, newHeaderY, { width: descWidth });
                 doc.text('Local', localX, newHeaderY, { width: 120 });
                 doc.text('Validade', validadeX, newHeaderY, { width: 80 });
                 doc.text('Status', statusX, newHeaderY, { width: 50, align: 'right' });
                 const newHeaderBottomY = newHeaderY + doc.currentLineHeight() + 2;
                 doc.moveTo(tableLeft, newHeaderBottomY).lineTo(tableRight, newHeaderBottomY).strokeColor('#333333').lineWidth(1).stroke();
                 doc.font('Helvetica'); doc.moveDown(1);
                 rowY = doc.y;
            }

            let statusColorHex = '#d4edda'; let statusTextColor = '#155724'; let statusText = 'OK';
            if (item.sortStatus === 3) { statusColorHex = '#f8d7da'; statusTextColor = '#721c24'; statusText = 'Vencido'; }
            else if (item.sortStatus === 2) { statusColorHex = '#fff3cd'; statusTextColor = '#856404'; statusText = 'Vencendo.'; }

            doc.rect(tableLeft, rowY, (tableRight - tableLeft) + backgroundRightPadding, rowHeight).fill(statusColorHex);

            const imageDrawY = rowY + (rowHeight - imageWidth) / 2;
            const textDrawY = imageDrawY + 5;

            // [CORRIGIDO] Lógica de Imagem para tratar CAMINHO RELATIVO
            let imagePath = null;
            if (item.imagem && typeof item.imagem === 'string' && item.imagem.trim() !== '') {
                // Assume que item.imagem é como 'uploads/nome.png'
                imagePath = path.join(__dirname, '..', 'public', item.imagem);
            }

            console.log(`[PDF Generator] Item: ${item.descricao}, Imagem do DB: ${item.imagem}, Caminho Construído: ${imagePath}`); // Log

            try {
                if (imagePath && fs.existsSync(imagePath)) {
                    console.log(`[PDF Generator] Arquivo de imagem encontrado: ${imagePath}`); // Log
                    doc.image(imagePath, imageX + 2, imageDrawY, { fit: [imageWidth, imageWidth], align: 'center', valign: 'center' });
                } else {
                    console.log(`[PDF Generator] Arquivo de imagem NÃO encontrado ou caminho nulo/inválido.`); // Log
                    doc.rect(imageX + 2, imageDrawY, imageWidth, imageWidth).strokeColor('#cccccc').lineWidth(0.5).stroke();
                    doc.fillColor('#aaaaaa').fontSize(8).text('Sem Img', imageX + 2, imageDrawY + imageWidth / 2 - 4, { width: imageWidth, align: 'center' });
                }
            } catch (imgError) {
                 console.error("[PDF Generator] Erro EXCEPCIONAL ao processar arquivo de imagem:", imagePath, imgError);
                 doc.rect(imageX + 2, imageDrawY, imageWidth, imageWidth).strokeColor('#cccccc').lineWidth(0.5).stroke();
                 doc.fillColor('#aaaaaa').fontSize(8).text('Erro Img', imageX + 2, imageDrawY + imageWidth / 2 - 4, { width: imageWidth, align: 'center' });
            }
            doc.fillColor(statusTextColor); // Resetar cor após texto fallback

            let itemDesc = item.descricao || 'Desconhecido';
            if (item.numero_serial) {
                 itemDesc += ` (Serial: ${item.numero_serial})`;
            }
            doc.fontSize(9).text(itemDesc, descX, textDrawY, { width: descWidth });
            doc.text(item.local || 'N/A', localX, textDrawY, { width: 120 });
            doc.text(formatDateForClient(item.validade), validadeX, textDrawY, { width: 80 });
            doc.font('Helvetica-Bold').text(statusText, statusX, textDrawY, { width: 50, align: 'right' });
            doc.font('Helvetica');

            doc.fillColor('black');
            doc.y = rowY + rowHeight + 2;

        });

        doc.end();
        res.on('finish', resolve);
        res.on('error', (err) => { console.error("Erro no stream de resposta:", err); reject(err); });
        doc.on('error', (err) => { console.error("Erro no PDFKit:", err); reject(err); });
    });
}

module.exports = { createInventoryPdf };