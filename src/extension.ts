import * as vscode from 'vscode';
import { formattingVue } from './formattingVue';

export function activate(context: vscode.ExtensionContext) {
    const formattingProvider: vscode.DocumentFormattingEditProvider = {
        async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
            const edits: vscode.TextEdit[] = [];
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return [];
            }
            let result = await formattingVue(document);
            for (const res of result) {
                edits.push(vscode.TextEdit.replace(res.range, res.formatText));
            }
            return edits;
        }
    };

    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('vue', formattingProvider));
}
