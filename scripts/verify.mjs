import { spawnSync } from "node:child_process";

const steps = [
  ["lint", "npx", ["eslint", ".", "--max-warnings=0"]],
  ["test", "npx", ["vitest", "run"]],
  ["build", "npx", ["next", "build"]],
];

for (const [name, command, args] of steps) {
  console.log(`\n==> ${name}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  if (result.status !== 0) {
    console.error(`\nverify failed at ${name} (exit ${result.status ?? 1})`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nverify passed: lint, test, build");
