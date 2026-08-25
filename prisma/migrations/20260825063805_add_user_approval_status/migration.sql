-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'BLOCKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING';

-- Grandfather in users that existed before the approval gate was introduced,
-- so this migration doesn't lock out everyone who was already using the system.
-- New registrations created after this point start out as PENDING via application code.
UPDATE "User" SET "status" = 'APPROVED';
