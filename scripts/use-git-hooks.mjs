import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".git")) process.exit(0);

try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
} catch {
  // Vercel/CI checkouts may not allow git config; ignore.
}
