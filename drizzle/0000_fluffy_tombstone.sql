CREATE TABLE `pieces` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`params` text NOT NULL,
	`token_hash` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	CONSTRAINT "piece_revision" CHECK("pieces"."revision" BETWEEN 1 AND 30),
	CONSTRAINT "piece_public" CHECK("pieces"."published" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pieces_token_hash_unique` ON `pieces` (`token_hash`);--> statement-breakpoint
CREATE INDEX `piece_expiry` ON `pieces` (`expires_at`);--> statement-breakpoint
CREATE TABLE `quotas` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
