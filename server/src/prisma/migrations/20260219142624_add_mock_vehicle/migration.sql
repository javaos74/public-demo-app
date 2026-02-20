-- CreateTable
CREATE TABLE "MockVehicle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mockStatusId" INTEGER NOT NULL,
    "modelName" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    CONSTRAINT "MockVehicle_mockStatusId_fkey" FOREIGN KEY ("mockStatusId") REFERENCES "MockApplicantStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
