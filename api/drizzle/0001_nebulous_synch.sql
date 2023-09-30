ALTER TABLE "notes" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "updated_at" timestamp with time zone;