-- Add optimistic concurrency version to existing tasks.
ALTER TABLE "Task" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- Store successful task mutation responses so retries are durable and replayable.
CREATE TABLE "TaskMutation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskMutation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskMutation_userId_key_key" ON "TaskMutation"("userId", "key");
CREATE INDEX "TaskMutation_createdAt_idx" ON "TaskMutation"("createdAt");

ALTER TABLE "TaskMutation" ADD CONSTRAINT "TaskMutation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
