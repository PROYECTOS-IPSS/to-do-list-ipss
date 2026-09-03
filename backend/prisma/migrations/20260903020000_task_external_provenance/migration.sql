-- Preserve optional origin identity for imported tasks.
ALTER TABLE "Task"
  ADD COLUMN "externalProvider" TEXT,
  ADD COLUMN "externalId" TEXT;

-- PostgreSQL permits multiple NULL tuples, so manual tasks remain unrestricted.
CREATE UNIQUE INDEX "Task_userId_externalProvider_externalId_key"
  ON "Task"("userId", "externalProvider", "externalId");
