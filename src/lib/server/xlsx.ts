import "server-only";
import { strToU8, zipSync } from "fflate";

/**
 * A small, dependable Excel (.xlsx) writer: several sheets, text, numbers,
 * dates, a bold header row, frozen header, column widths and number formats.
 * Enough for the accountant's monthly file without a large library.
 */
export type Cell = string | number | Date | null | undefined | { v: number; money: true } | { v: string; bold: true };
export type Sheet = { name: string; columns: { title: string; width?: number }[]; rows: Cell[][] };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const colName = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
// Excel counts days from 30 December 1899.
const serial = (d: Date) => d.getTime() / 86_400_000 + 25569;

// Styles: 0 normal, 1 bold header, 2 money (#,##0.00), 3 date, 4 bold text.
function cell(c: Cell, ref: string, header = false) {
  if (c === null || c === undefined || c === "") return "";
  if (header) return `<c r="${ref}" s="1" t="inlineStr"><is><t>${esc(String(c))}</t></is></c>`;
  if (c instanceof Date) return `<c r="${ref}" s="3"><v>${serial(c)}</v></c>`;
  if (typeof c === "number") return Number.isFinite(c) ? `<c r="${ref}"><v>${c}</v></c>` : "";
  if (typeof c === "object" && "money" in c) return `<c r="${ref}" s="2"><v>${Math.round(c.v * 100) / 100}</v></c>`;
  if (typeof c === "object" && "bold" in c) return `<c r="${ref}" s="4" t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
  // Text that starts like a formula is kept as plain text.
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(String(c))}</t></is></c>`;
}

function sheetXml(s: Sheet) {
  const cols = s.columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 16}" customWidth="1"/>`).join("");
  const head = `<row r="1">${s.columns.map((c, i) => cell(c.title, `${colName(i)}1`, true)).join("")}</row>`;
  const body = s.rows.map((r, ri) => `<row r="${ri + 2}">${r.map((c, ci) => cell(c, `${colName(ci)}${ri + 2}`)).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${head}${body}</sheetData></worksheet>`;
}

export function xlsx(sheets: Sheet[]): Buffer {
  const names = sheets.map((s, i) => esc(s.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || `Sheet${i + 1}`));
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="dd mmm yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3F2F4"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="5"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="165" applyNumberFormat="1"/><xf fontId="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`),
  };
  sheets.forEach((s, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s))));
  return Buffer.from(zipSync(files, { level: 6 }));
}
