import { seedIfNeeded } from "../lib/pipeline/seed/dev-bootstrap";

seedIfNeeded()
  .then(() => {
    console.info("seed-dev: store ready");
  })
  .catch((error: unknown) => {
    console.error("seed-dev failed", error);
    process.exit(1);
  });
