-- CreateTable
CREATE TABLE "public"."guilds" (
    "id" VARCHAR NOT NULL,
    "requester_channel" VARCHAR,
    "requester_message" VARCHAR,
    "prefix" VARCHAR,
    "dj_state" BOOLEAN DEFAULT false,
    "dj_roles" VARCHAR[],
    "allow_duplicate" BOOLEAN DEFAULT false,
    "max_queue" INTEGER,
    "default_volume" INTEGER DEFAULT 100,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);
