-- CreateEnum
CREATE TYPE "CampaignRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "CampaignMember" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CampaignRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignMember_userId_idx" ON "CampaignMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMember_campaignId_userId_key" ON "CampaignMember"("campaignId", "userId");

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El dueño de cada campaña existente pasa a tener también su fila de miembro:
-- toda comprobación de acceso consulta esta tabla, así que sin esto los dueños
-- perderían el acceso a sus propias campañas.
INSERT INTO "CampaignMember" ("id", "campaignId", "userId", "role", "createdAt")
SELECT gen_random_uuid()::text, c."id", c."userId", 'OWNER', c."createdAt"
FROM "Campaign" c;
