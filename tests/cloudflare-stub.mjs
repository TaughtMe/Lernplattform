// Ermöglicht es, den Cloudflare-Worker-Build (dist/server) in Node zu rendern:
// "cloudflare:workers" wird durch einen leeren Stub ersetzt.
import { register } from "node:module";

const stub = "data:text/javascript," + encodeURIComponent("export const env = {}; export class WorkerEntrypoint {}; export class DurableObject {}; export default {};");
register("data:text/javascript," + encodeURIComponent(`export async function resolve(specifier, context, next) { if (specifier.startsWith("cloudflare:")) return { url: ${JSON.stringify(stub)}, shortCircuit: true }; return next(specifier, context); }`));
