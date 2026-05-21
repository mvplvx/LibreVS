export const MOCK_ORGANIZATION_ID = "librevs-demo-org";
export const MOCK_USER_ID = "librevs-demo-user";

export type AuthUser = {
  userId: string;
  organizationId: string;
};

export function getUser(req?: Request): AuthUser {
  const headerUserId = req?.headers.get("x-user-id")?.trim();
  const headerOrganizationId = req?.headers.get("x-organization-id")?.trim();

  if (headerUserId && headerOrganizationId) {
    return {
      userId: headerUserId,
      organizationId: headerOrganizationId,
    };
  }

  return {
    userId: MOCK_USER_ID,
    organizationId: MOCK_ORGANIZATION_ID,
  };
}
