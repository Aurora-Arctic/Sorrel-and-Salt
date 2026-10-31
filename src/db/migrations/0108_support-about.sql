ALTER TYPE "public"."support_request_kind" ADD VALUE 'account' BEFORE 'question';--> statement-breakpoint
ALTER TYPE "public"."support_request_kind" ADD VALUE 'compendium' BEFORE 'question';--> statement-breakpoint
ALTER TYPE "public"."support_request_kind" ADD VALUE 'privacy' BEFORE 'question';--> statement-breakpoint
ALTER TYPE "public"."support_request_kind" ADD VALUE 'feedback' BEFORE 'question';--> statement-breakpoint
ALTER TYPE "public"."support_request_kind" RENAME TO "support_request_about";--> statement-breakpoint
ALTER TABLE "support_requests" RENAME COLUMN "kind" TO "about";
