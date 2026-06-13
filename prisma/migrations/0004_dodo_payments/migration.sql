-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "dodoCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "dodoSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_dodoCustomerId_key" ON "Organization"("dodoCustomerId");
