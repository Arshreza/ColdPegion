-- CreateTable
CREATE TABLE "SuppressionEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuppressionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuppressionEntry_userId_idx" ON "SuppressionEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionEntry_userId_value_key" ON "SuppressionEntry"("userId", "value");

-- AddForeignKey
ALTER TABLE "SuppressionEntry" ADD CONSTRAINT "SuppressionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
