-- CreateTable
CREATE TABLE "VsmeFeedback" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingPeriodId" TEXT,
    "fieldId" TEXT,
    "section" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VsmeFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VsmeFeedback_organizationId_idx" ON "VsmeFeedback"("organizationId");

-- CreateIndex
CREATE INDEX "VsmeFeedback_createdAt_idx" ON "VsmeFeedback"("createdAt");

-- AddForeignKey
ALTER TABLE "VsmeFeedback" ADD CONSTRAINT "VsmeFeedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
