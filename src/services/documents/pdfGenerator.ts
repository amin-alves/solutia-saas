import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

// Adiciona os types de autotable para contornar problemas no TS
interface jsPDFCustom extends jsPDF {
    autoTable: (options: UserOptions) => jsPDFCustom;
}

/**
 * Helper para carregar imagem de URL remota como base64
 */
const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
    const res = await fetch(imageUrl);
    const blob = await res.blob();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", function () {
            resolve(reader.result as string);
        }, false);
        reader.addEventListener("error", reject);
        reader.readAsDataURL(blob);
    });
};

/**
 * Gera um PDF simples contendo um título, texto normal e uma tabela a partir de dados em JSON.
 */
export const generatePdf = async (title: string, description: string, data?: any[]): Promise<Blob> => {
    const doc = new jsPDF() as jsPDFCustom;
    let currentY = 22;

    // Verificar se existe logo salva no localstorage
    const logoUrl = localStorage.getItem("solutia_empresa_logo");

    if (logoUrl) {
        try {
            const base64Img = await getBase64ImageFromUrl(logoUrl);
            // Injeta a imagem (x=14, y=10, width=30, height calculada ou fixa ex: 15)
            doc.addImage(base64Img, 'PNG', 14, 10, 30, 15);
            currentY = 40; // Empurra o restante do conteúdo pra baixo
        } catch (e) {
            console.error("Não foi possível carregar a logo para o PDF", e);
        }
    }

    // Adiciona o Título (negrito simulado ajustando a fonte)
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, currentY);

    // Adiciona uma Descrição
    currentY += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    // Quebra texto longo em várias linhas
    const splitDescription = doc.splitTextToSize(description, 180);
    doc.text(splitDescription, 14, currentY);

    // Salva o Y atual após a descrição (começa com o atual + tamanho da decrição)
    let finalY = currentY + (splitDescription.length * 6) + 10;

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
