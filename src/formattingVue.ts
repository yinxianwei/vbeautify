import * as vscode from 'vscode';
import beautify, { HTMLBeautifyOptions } from 'js-beautify';
import * as prettier from 'prettier';
import path from 'path';
import { parse } from '@vue/compiler-sfc';

const DEFAULT_PRETTIER_CONFIG: prettier.Options = {
    arrowParens: 'avoid',
    bracketSpacing: true,
    endOfLine: 'lf',
    htmlWhitespaceSensitivity: 'css',
    insertPragma: false,
    singleAttributePerLine: true,
    bracketSameLine: true,
    jsxBracketSameLine: false,
    jsxSingleQuote: true,
    printWidth: 150,
    proseWrap: 'preserve',
    quoteProps: 'consistent',
    requirePragma: false,
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'none',
    useTabs: false,
    embeddedLanguageFormatting: 'auto',
    vueIndentScriptAndStyle: false,
    experimentalTernaries: false,
};
export function formatHtml(content: string): string {
    const formatOptions: HTMLBeautifyOptions = {
        wrap_attributes: 'force-aligned',
        wrap_line_length: 150,
        unformatted: ['area', 'base', 'br', 'col', 'embed', 'hr', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr'],
    };
    return beautify.html(content, formatOptions);
}

export async function formatJs(content: string): Promise<string> {
    if (content) {
        try {
            let config = await getPrettierConfig();
            return await prettier.format(content, {
                parser: 'babel',
                ...config,
            });
        } catch (error) {
            console.error(error);
        }
    }
    return '';
}

export async function formatCss(content: string, lang: string): Promise<string> {
    if (content) {
        try {
            let config = await getPrettierConfig();
            return await prettier.format(content, {
                parser: lang,
                ...config,
            });
        } catch (error) {
            console.error(error);
        }
    }
    return '';
}

export async function getPrettierConfig(): Promise<prettier.Options> {
    const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const prettierConfigPath = path.join(workspacePath, '.prettierrc');
    let config = await prettier.resolveConfig(prettierConfigPath, {
        useCache: false,
    });
    if (config) {
        return {
            ...DEFAULT_PRETTIER_CONFIG,
            ...config,
        };
    }
    return DEFAULT_PRETTIER_CONFIG;
}
export function getText(document: vscode.TextDocument, startLine: number, endLine: number): string {
    const startPosition = new vscode.Position(startLine, 0);
    const endPosition = new vscode.Position(endLine, document.lineAt(endLine).text.length);
    const templateRange = new vscode.Range(startPosition, endPosition);
    return document.getText(templateRange);
}

export async function formattingVue(document: vscode.TextDocument) {
    const result: { type: string; text: string; formatText: string; range: vscode.Range }[] = [];
    const text = document.getText();
    const { descriptor } = parse(text);
    if (descriptor.template) {
        const startPosition = new vscode.Position(descriptor.template.loc.start.line - 1, 0);
        const endPosition = new vscode.Position(
            descriptor.template.loc.end.line - 1,
            document.lineAt(descriptor.template.loc.end.line - 1).text.length
        );
        let range = new vscode.Range(startPosition, endPosition);
        const text = document.getText(range);
        const formatText = formatHtml(text);
        if (formatText && text !== formatText) {
            result.push({
                type: 'template',
                text: text,
                formatText: formatText,
                range: range,
            });
        }
    }
    if (descriptor.script) {
        const startPosition = new vscode.Position(descriptor.script.loc.start.line - 1, 0);
        const endPosition = new vscode.Position(descriptor.script.loc.end.line - 1, document.lineAt(descriptor.script.loc.end.line - 1).text.length);
        let range = new vscode.Range(startPosition, endPosition);
        const text = document.getText(range);
        let res = await formatJs(descriptor.script.content);
        if (res) {
            let formatText = text.replace(descriptor.script.content, `\n${res}`);
            if (text !== formatText) {
                result.push({
                    type: 'script',
                    text: text,
                    formatText: formatText,
                    range: range,
                });
            }
        }
    }
    if (descriptor.scriptSetup) {
        const startPosition = new vscode.Position(descriptor.scriptSetup.loc.start.line - 1, 0);
        const endPosition = new vscode.Position(
            descriptor.scriptSetup.loc.end.line - 1,
            document.lineAt(descriptor.scriptSetup.loc.end.line - 1).text.length
        );
        let range = new vscode.Range(startPosition, endPosition);
        const text = document.getText(range);
        let res = await formatJs(descriptor.scriptSetup.content);
        if (res) {
            let formatText = text.replace(descriptor.scriptSetup.content, `\n${res}`);
            if (formatText && text !== formatText) {
                result.push({
                    type: 'script',
                    text: text,
                    formatText: formatText,
                    range: range,
                });
            }
        }
    }
    if (descriptor.styles) {
        for (let index = 0; index < descriptor.styles.length; index++) {
            const style = descriptor.styles[index];
            const startPosition = new vscode.Position(style.loc.start.line - 1, 0);
            const endPosition = new vscode.Position(style.loc.end.line - 1, document.lineAt(style.loc.end.line - 1).text.length);
            let range = new vscode.Range(startPosition, endPosition);
            const text = document.getText(range);
            let res = await formatCss(style.content, style.lang || 'css');
            if (res) {
                let formatText = text.replace(style.content, `\n${res}`);
                if (formatText && text !== formatText) {
                    result.push({
                        type: 'style',
                        text: text,
                        formatText: formatText,
                        range: range,
                    });
                }
            }
        }
    }
    return result;
}
