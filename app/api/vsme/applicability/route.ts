import { withApiHandler } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  COMPREHENSIVE_EMPLOYEE_MAX,
  COMPREHENSIVE_EMPLOYEE_THRESHOLD,
  resolveSectionApplicability,
} from "@/lib/vsme/applicability";
import { isModuleCInReportingScope } from "@/lib/vsme/moduleScope";

export async function GET(req: Request) {
  return withApiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("employeeCount");

    if (raw === null || raw === "") {
      return apiError("employeeCount query parameter is required", 400);
    }

    const employeeCount = Number(raw);
    if (!Number.isFinite(employeeCount) || employeeCount < 0) {
      return apiError("employeeCount must be a non-negative number", 400);
    }

    const count = Math.floor(employeeCount);

    return apiSuccess({
      employeeCount: count,
      comprehensiveEmployeeThreshold: COMPREHENSIVE_EMPLOYEE_THRESHOLD,
      comprehensiveEmployeeMax: COMPREHENSIVE_EMPLOYEE_MAX,
      moduleCInReportingScope: isModuleCInReportingScope(count),
      sections: resolveSectionApplicability(count),
    });
  });
}
