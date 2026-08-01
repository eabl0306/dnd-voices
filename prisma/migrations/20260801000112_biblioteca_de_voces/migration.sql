-- CreateEnum
CREATE TYPE "VoiceProvider" AS ENUM ('ELEVENLABS', 'OPENAI', 'AZURE');

-- AlterEnum
ALTER TYPE "VoiceStrategy" ADD VALUE 'LIBRARY';

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "voiceRefId" TEXT;

-- CreateTable
CREATE TABLE "Voice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "VoiceProvider" NOT NULL DEFAULT 'ELEVENLABS',
    "externalId" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'eleven_multilingual_v2',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "campaignId" TEXT,
    "generated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Voice_userId_idx" ON "Voice"("userId");

-- CreateIndex
CREATE INDEX "Voice_campaignId_idx" ON "Voice"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Voice_userId_externalId_key" ON "Voice"("userId", "externalId");

-- AddForeignKey
ALTER TABLE "Voice" ADD CONSTRAINT "Voice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voice" ADD CONSTRAINT "Voice_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_voiceRefId_fkey" FOREIGN KEY ("voiceRefId") REFERENCES "Voice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
