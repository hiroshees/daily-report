-- CreateTable
CREATE TABLE "revoked_token" (
    "jti" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_token_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "revoked_token_expires_at_idx" ON "revoked_token"("expires_at");
