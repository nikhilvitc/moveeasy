import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, "..", "docs");
fs.mkdirSync(docsDir, { recursive: true });

const files = [
  { path: "D:/Cursor/Kuldeep Ops Work Sheet.xlsx", slug: "kuldeep-ops" },
  { path: "D:/Cursor/Master Data - movEAZY.xlsx", slug: "master-moveazy" },
];

const lines = [];

for (const { path: filePath, slug } of files) {
  if (!fs.existsSync(filePath)) {
    lines.push(`# MISSING: ${filePath}`);
    continue;
  }
  const wb = XLSX.readFile(filePath);
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!rows.length) continue;
    const header = rows[0].map((c) => String(c ?? ""));
    const safeName = name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 48);
    const outPath = path.join(docsDir, `crm-headers-${slug}__${safeName || "sheet"}.tsv`);
    fs.writeFileSync(outPath, header.join("\t"), "utf8");
    lines.push(`## ${slug} — sheet "${name}"`);
    lines.push(header.join("\t"));
    lines.push(`(saved: ${outPath})`);
    lines.push("");
  }
}

fs.writeFileSync(path.join(docsDir, "crm-all-header-rows.txt"), lines.join("\n"), "utf8");
console.log("OK", path.join(docsDir, "crm-all-header-rows.txt"));
