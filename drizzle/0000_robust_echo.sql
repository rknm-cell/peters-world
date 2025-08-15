CREATE TABLE "tiny-world_share" (
	"id" text PRIMARY KEY NOT NULL,
	"world_id" text NOT NULL,
	"short_code" text NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "tiny-world_share_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "tiny-world_user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "tiny-world_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tiny-world_world" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"data" json NOT NULL,
	"screenshot" text,
	"user_id" text,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "share_world_id_idx" ON "tiny-world_share" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "share_short_code_idx" ON "tiny-world_share" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "tiny-world_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "world_user_id_idx" ON "tiny-world_world" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "world_created_idx" ON "tiny-world_world" USING btree ("created");--> statement-breakpoint
CREATE INDEX "world_featured_idx" ON "tiny-world_world" USING btree ("featured");