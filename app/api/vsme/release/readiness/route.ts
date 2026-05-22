import { withApiHandler } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  isReadinessEndpointExposed,
  isPilotModeEnabled,
} from "@/lib/vsme/release/pilotMode";
import { runReadinessCheck } from "@/lib/vsme/release/readinessCheck";

/** Read-only pilot release readiness (no mutations). */
export async function GET() {
  return withApiHandler(async () => {
    if (!isReadinessEndpointExposed()) {
      return apiError("Readiness endpoint is not exposed outside pilot mode", 404);
    }

    const readiness = await runReadinessCheck();

    return apiSuccess({
      systemHealth: readiness.systemHealth,
      readinessScore: readiness.readinessScore,
      blockers: readiness.blockers,
      warnings: readiness.warnings,
      schemaVersion: readiness.schemaVersion,
      registryVersion: readiness.registryVersion,
      exportIntegrity: readiness.exportIntegrity,
      pilotMode: isPilotModeEnabled(),
    });
  });
}
