INSERT INTO "User" ("id", "name", "email", "passwordHash", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ETAPA2 Development User',
  'etapa2@example.local',
  'temporary-placeholder-not-for-authentication',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
