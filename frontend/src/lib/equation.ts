import katex from "katex";
export function equationHtml(latex: string): string { try { return katex.renderToString(latex, { throwOnError: false, displayMode: false }); } catch { return latex; } }
