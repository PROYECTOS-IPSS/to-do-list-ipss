-- Persist upload fingerprint so image metadata records request content.
ALTER TABLE "TaskImage" ADD COLUMN "contentHash" TEXT;
