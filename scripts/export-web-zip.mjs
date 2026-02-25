import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, "export_web");
const ZIP_PATH = path.join(ROOT, "export_web.zip");

execSync("node scripts/export-web.mjs", { cwd: ROOT, stdio: "inherit" });

if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);

// PowerShell zip
const ps = [
  "powershell",
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  `if (Test-Path "${EXPORT_DIR}") { Compress-Archive -Path "${EXPORT_DIR}\*" -DestinationPath "${ZIP_PATH}" -Force } else { throw "export_web not found" }`
].join(" ");

execSync(ps, { cwd: ROOT, stdio: "inherit" });
console.log("✅ Created:", ZIP_PATH);
