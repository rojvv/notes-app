CREATE TABLE IF NOT EXISTS "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" bigint NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "notes_id_unique" UNIQUE("id")
);
