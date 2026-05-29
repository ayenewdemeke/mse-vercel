-- CreateTable
CREATE TABLE "PanelFaceDesign" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fc" DOUBLE PRECISION NOT NULL,
    "fy" DOUBLE PRECISION NOT NULL,
    "lPanel" DOUBLE PRECISION NOT NULL,
    "hPanel" DOUBLE PRECISION NOT NULL,
    "tPanel" DOUBLE PRECISION NOT NULL,
    "ssr" DOUBLE PRECISION NOT NULL,
    "cCoverPos" DOUBLE PRECISION NOT NULL,
    "cCoverNeg" DOUBLE PRECISION NOT NULL,
    "barNumVert" DOUBLE PRECISION NOT NULL,
    "spacingVert" DOUBLE PRECISION NOT NULL,
    "barNumHor" DOUBLE PRECISION NOT NULL,
    "spacingHor" DOUBLE PRECISION NOT NULL,
    "huStr" DOUBLE PRECISION NOT NULL,
    "huEe" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PanelFaceDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PanelFaceDesign_designId_key" ON "PanelFaceDesign"("designId");

-- AddForeignKey
ALTER TABLE "PanelFaceDesign" ADD CONSTRAINT "PanelFaceDesign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelFaceDesign" ADD CONSTRAINT "PanelFaceDesign_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;
