-- CreateTable
CREATE TABLE "staffing_requirements" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "requiredCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staffing_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staffing_requirements_departmentId_idx" ON "staffing_requirements"("departmentId");

-- CreateIndex
CREATE INDEX "staffing_requirements_role_idx" ON "staffing_requirements"("role");

-- CreateIndex
CREATE UNIQUE INDEX "staffing_requirements_departmentId_role_key" ON "staffing_requirements"("departmentId", "role");

-- AddForeignKey
ALTER TABLE "staffing_requirements" ADD CONSTRAINT "staffing_requirements_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
