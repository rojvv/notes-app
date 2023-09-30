CREATE TABLE IF NOT EXISTS "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"user_id" bigint NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "notes_id_unique" UNIQUE("id")
);
