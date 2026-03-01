import { Document, Packer, Paragraph, TextRun } from 'docx';

/**
 * Gera um documento DOCX simples em formato Blob.
 */
export const generateDocx = async (title: string, content: string): Promise<Blob> => {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: title,
                                bold: true,
                                size: 32, // 16pt (half-points)
                            }),
                        ],
                    }),
                    new Paragraph({ text: "" }), // Spacing
                    new Paragraph({
                        children: [
                            new TextRun(content),
                        ],
                    }),
                ],
            },
        ],
    });

    // Retorna o arquivo como um Blob
    const blob = await Packer.toBlob(doc);
    return blob;
};
