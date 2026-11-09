ALTER TABLE "help_articles" ADD COLUMN "search_terms" text;--> statement-breakpoint
ALTER TABLE "help_articles" ALTER COLUMN "search_vector" SET EXPRESSION AS (setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', coalesce(summary, '')), 'B') || setweight(to_tsvector('english', coalesce(search_terms, '')), 'B') || setweight(to_tsvector('english', body), 'C'));
