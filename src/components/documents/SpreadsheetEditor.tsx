import { useRef, useEffect } from 'react';
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import 'jsuites/dist/jsuites.css';

interface SpreadsheetEditorProps {
    data: any[][];
    columns?: any[];
    onChange?: (data: any[][]) => void;
    editable?: boolean;
}

export function SpreadsheetEditor({ data, columns, onChange, editable = true }: SpreadsheetEditorProps) {
    const jssRef = useRef<HTMLDivElement>(null);
    const jspreadsheetRef = useRef<any>(null);

    useEffect(() => {
        if (!jssRef.current) return;

        // Destroy previous instance if it exists to avoid memory leaks
        if (jspreadsheetRef.current) {
            jspreadsheetRef.current.destroy();
        }

        const options: any = {
            data: data.length > 0 ? data : [
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['', '', '', '', '']
            ],
            minDimensions: [10, 20],
            defaultColWidth: 100,
            tableOverflow: true,
            tableWidth: "100%",
            tableHeight: "100%",
            editable: editable,
            columnDrag: true,
            allowInsertRow: true,
            allowManualInsertRow: true,
            allowInsertColumn: true,
            allowManualInsertColumn: true,
            allowDeleteRow: true,
            allowDeleteColumn: true,
            allowRenameColumn: true,
            wordWrap: true,
            contextMenu: function (obj: any, x: string, y: string, _e: any) {
                let items = [];
                // Se não for editável, não mostramos menu
                if (!editable) return [];

                if (y !== null) {
                    items.push({ title: 'Inserir linha acima', onclick: () => obj.insertRow(1, parseInt(y), 1) });
                    items.push({ title: 'Inserir linha abaixo', onclick: () => obj.insertRow(1, parseInt(y)) });
                    items.push({ title: 'Excluir linha selecionada', onclick: () => obj.deleteRow(parseInt(y)) });
                }
                if (x !== null) {
                    items.push({ type: 'line' });
                    items.push({ title: 'Inserir coluna antes', onclick: () => obj.insertColumn(1, parseInt(x), 1) });
                    items.push({ title: 'Inserir coluna depois', onclick: () => obj.insertColumn(1, parseInt(x)) });
                    items.push({ title: 'Excluir coluna selecionada', onclick: () => obj.deleteColumn(parseInt(x)) });
                }

                return items;
            },
            onchange: function (_instance: any, _cell: any, _x: string, _y: string, _value: string) {
                if (onChange && jspreadsheetRef.current) {
                    onChange(jspreadsheetRef.current.getData());
                }
            }
        };

        if (columns && columns.length > 0) {
            options.columns = columns;
        }

        const initSpreadsheet = () => {
            jspreadsheetRef.current = jspreadsheet(jssRef.current!, options);
        }

        // Timeout is necessary due to StrictMode in React 18 creating race conditions with jspreadsheet
        setTimeout(initSpreadsheet, 0);

        return () => {
            if (jspreadsheetRef.current) {
                jspreadsheetRef.current.destroy();
                jspreadsheetRef.current = null;
            }
        };
    }, []); // Only run once on mount. Ideally we'd manage data diffing, but for a global editor this works well.

    return (
        <div className="w-full h-full overflow-hidden bg-white">
            <div ref={jssRef} className="w-full h-full" />
            <style>{`
                 /* Overrides to make jspreadsheet feel more modern, like Google Sheets */
                .jexcel_container { border: none !important; }
                .jexcel_content { box-shadow: none !important; width: 100% !important; height: 100% !important; max-height: 80vh; }
                .jexcel > thead > tr > td { background-color: #f8fafc; color: #64748b; font-weight: 600; font-size: 13px; border-color: #e2e8f0; }
                .jexcel > tbody > tr > td { border-color: #e2e8f0; font-family: Inter, sans-serif; font-size: 14px; padding: 4px 8px; }
                .jexcel > tbody > tr > td.readonly { background-color: #f8fafc; color: #94a3b8; }
                .jexcel > tbody > tr.selected > td { background-color: #f1f5f9; }
                .jexcel > tbody > tr > td.highlight { background-color: rgba(59, 130, 246, 0.1); border: 2px solid #3b82f6; }
            `}</style>
        </div>
    );
}
