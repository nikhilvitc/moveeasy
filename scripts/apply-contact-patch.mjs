import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const contactPath = path.join(root, "src/pages/Contact.jsx");
const blockPath = path.join(root, "scripts/contact-sales-support.block.jsx");

let contact = fs.readFileSync(contactPath, "utf8");
const block = fs.readFileSync(blockPath, "utf8").trimEnd();

const re =
  /          \) : \(\r?\n            <div className=\{`grid gap-8 \$\{gridCols\}`\}>[\s\S]*?          \)\}\r?\n\r?\n          \{\/\* Why talk to us \*\//;

if (!re.test(contact)) {
  console.error("pattern not found");
  process.exit(1);
}

contact = contact.replace(
  re,
  `${block}\n\n          {/* Why talk to us */`,
);

fs.writeFileSync(contactPath, contact);
console.log("patched");
