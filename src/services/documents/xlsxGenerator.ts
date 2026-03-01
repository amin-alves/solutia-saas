import ExcelJS from 'exceljs';

/**
 * Gera uma planilha XLSX simples em formato Blob a partir de uma lista de objetos.
 */
export const generateXlsx = async (title: string, data: any[]): Promise<Blob> => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    if (data && data.length > 0) {
        // Usa as chaves do primeiro objeto para criar as colunas automaticamente
        const columns = Object.keys(data[0]).map(key => ({
            header: key.charAt(0).toUpperCase() + key.slice(1), // Capitaliza a primeira letra
            key: key,
            width: 25
        }));
        worksheet.columns = columns;

        // Adiciona as linhas baseadas nos dados
        worksheet.addRows(data);

        // Formara a linha de cabeçalho (negrito)
        worksheet.getRow(1).font = { bold: true };
    } else {
        worksheet.addRow(['Nenhum dado fornecido']);
    }

    // Escreve o arquivo na memória como um buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Retorna o buffer como um Blob no formato correto do Excel
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
