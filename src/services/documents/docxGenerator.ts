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

    const empresaNome = localStorage.getItem("solutia_empresa_nome") || "Empresa Desconhecida";
    const empresaCnpj = localStorage.getItem("solutia_empresa_cnpj");
    const userName = localStorage.getItem("solutia_user") || "Usuário";
    const userCargo = localStorage.getItem("solutia_user_cargo");
    const userCpf = localStorage.getItem("solutia_user_cpf");
    const userRegistro = localStorage.getItem("solutia_user_registro");

    // Header da Empresa
    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: empresaNome,
                    bold: true,
                    size: 28, // 14pt
                }),
            ],
        })
    );

    if (empresaCnpj) {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `CNPJ: ${empresaCnpj}`,
                        size: 20, // 10pt
                    }),
                ],
            })
        );
    }

    children.push(new Paragraph({ text: "" })); // Spacing

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

    children.push(new Paragraph({ text: "" })); // Spacing
    children.push(new Paragraph({ text: "" })); // Spacing

    // Bloco de Assinatura
    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: "________________________________________________",
                    bold: true,
                }),
            ],
        })
    );

    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: userName,
                    bold: true,
                    size: 20, // 10pt
                }),
            ],
        })
    );

    if (userCargo) {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: userCargo,
                        size: 18, // 9pt
                    }),
                ],
            })
        );
    }

    let docIdText = [];
    if (userCpf) docIdText.push(`CPF: ${userCpf}`);
    if (userRegistro) docIdText.push(userRegistro);

    if (docIdText.length > 0) {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: docIdText.join(" | "),
                        size: 18,
                    }),
                ],
            })
        );
    }

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
