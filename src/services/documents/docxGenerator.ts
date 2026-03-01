import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';

/**
 * Helper para carregar imagem de URL remota como ArrayBuffer (necessário pro docx)
 */
const getArrayBufferFromUrl = async (imageUrl: string): Promise<ArrayBuffer> => {
    const res = await fetch(imageUrl);
    return await res.arrayBuffer();
};

/**
 * Gera um documento DOCX simples em formato Blob.
 */
export const generateDocx = async (title: string, content: string): Promise<Blob> => {
    const children: any[] = [];

    // Verificar se existe logo salva no localstorage
    const logoUrl = localStorage.getItem("solutia_empresa_logo");

    if (logoUrl) {
        try {
            const imageBuffer = await getArrayBufferFromUrl(logoUrl);
            children.push(
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: 100,
                                height: 50,
                            },
                        } as any),
                    ],
                })
            );
            children.push(new Paragraph({ text: "" })); // Spacing after logo
        } catch (e) {
            console.error("Não foi possível carregar a logo para o DOCX", e);
        }
    }

    // Adiciona Título
    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: title,
                    bold: true,
                    size: 32, // 16pt (half-points)
                }),
            ],
        })
    );
    children.push(new Paragraph({ text: "" })); // Spacing

    // Adiciona Conteúdo
    children.push(
        new Paragraph({
            children: [
                new TextRun(content),
            ],
        })
    );

    const doc = new Document({
        sections: [
            {
                properties: {},
                children: children,
            },
        ],
    });

    // Retorna o arquivo como um Blob
    const blob = await Packer.toBlob(doc);
    return blob;
};
