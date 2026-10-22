CREATE TABLE "system_probes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
