-- CreateTable
CREATE TABLE "ScoreSheet" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "shareCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetScore" INTEGER NOT NULL DEFAULT 1000,
    "scoreMode" TEXT NOT NULL DEFAULT 'points-faits',
    "status" TEXT NOT NULL DEFAULT 'in-progress',
    "finishedAt" TIMESTAMP(3),
    "winningTeam" INTEGER,
    "team1Player1Name" TEXT NOT NULL,
    "team1Player2Name" TEXT NOT NULL,
    "team2Player1Name" TEXT NOT NULL,
    "team2Player2Name" TEXT NOT NULL,
    "team1Player1UserId" TEXT,
    "team1Player2UserId" TEXT,
    "team2Player1UserId" TEXT,
    "team2Player2UserId" TEXT,

    CONSTRAINT "ScoreSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSheetRound" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "takerTeam" INTEGER NOT NULL,
    "bidValue" INTEGER NOT NULL,
    "bidType" TEXT NOT NULL DEFAULT 'normal',
    "trumpSuit" TEXT NOT NULL,
    "contred" BOOLEAN NOT NULL DEFAULT false,
    "surcontred" BOOLEAN NOT NULL DEFAULT false,
    "team1Points" INTEGER NOT NULL,
    "team2Points" INTEGER NOT NULL,
    "beloteTeam" INTEGER,
    "contractMet" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreSheetRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSheetShare" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreSheetShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoreSheet_shareCode_key" ON "ScoreSheet"("shareCode");

-- CreateIndex
CREATE INDEX "ScoreSheet_ownerId_idx" ON "ScoreSheet"("ownerId");

-- CreateIndex
CREATE INDEX "ScoreSheet_shareCode_idx" ON "ScoreSheet"("shareCode");

-- CreateIndex
CREATE INDEX "ScoreSheetRound_sheetId_idx" ON "ScoreSheetRound"("sheetId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreSheetRound_sheetId_index_key" ON "ScoreSheetRound"("sheetId", "index");

-- CreateIndex
CREATE INDEX "ScoreSheetShare_userId_idx" ON "ScoreSheetShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreSheetShare_sheetId_userId_key" ON "ScoreSheetShare"("sheetId", "userId");

-- AddForeignKey
ALTER TABLE "ScoreSheet" ADD CONSTRAINT "ScoreSheet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetRound" ADD CONSTRAINT "ScoreSheetRound_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ScoreSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetShare" ADD CONSTRAINT "ScoreSheetShare_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ScoreSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSheetShare" ADD CONSTRAINT "ScoreSheetShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
