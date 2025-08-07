-- CreateTable
CREATE TABLE "Report" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "operationCost" INTEGER NOT NULL,
    "taxPercentage" DOUBLE PRECISION NOT NULL,
    "taxes" DOUBLE PRECISION NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL,
    "COGS" INTEGER NOT NULL,
    "totalGrossProfit" INTEGER NOT NULL,
    "netIncome" INTEGER NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
