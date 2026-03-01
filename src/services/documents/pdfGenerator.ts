import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

// Adiciona os types de autotable para contornar problemas no TS
interface jsPDFCustom extends jsPDF {
    autoTable: (options: UserOptions) => jsPDFCustom;
}

/**
 * Gera um PDF simples contendo um título, texto normal e uma tabela a partir de dados em JSON.
 */
export const generatePdf = (title: string, description: string, data?: any[]): Blob => {
    const doc = new jsPDF() as jsPDFCustom;

    // Adiciona o Título (negrito simulado ajustando a fonte)
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 22);

    // Adiciona uma Descrição
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    // Quebra texto longo em várias linhas
    const splitDescription = doc.splitTextToSize(description, 180);
    doc.text(splitDescription, 14, 32);

    // Salva o Y atual após a descrição (começa com 32 + tamanho da decrição)
    let finalY = 32 + (splitDescription.length * 6) + 10;

    // Se existirem dados, renderiza a tabela via jsPDF-autotable
    if (data && data.length > 0) {
        // Exemplo: pega as colunas do primeiro item
        const columns = Object.keys(data[0]);
        const rows = data.map(item => Object.values(item).map(val => String(val)));

        // Chamando a função autoTable importada diretamente passando o documento
        // Esta é a forma recomendada pela documentação oficial do jspdf-autotable em ambientes modernos
        autoTable(doc, {
            startY: finalY,
            head: [columns],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, // indigo-600
        });
    }

    // Retorna a saída como Blob
    return doc.output('blob');
};
