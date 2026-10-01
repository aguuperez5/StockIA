import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Resolve configuration relative to this backend, regardless of the launch cwd.
// Explicit process settings (including a disposable test DB) keep precedence.
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
