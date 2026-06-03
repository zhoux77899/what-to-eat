CREATE TYPE "public"."generated_image_kind" AS ENUM('ingredient', 'dish');--> statement-breakpoint
CREATE TYPE "public"."generated_image_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."generation_action_type" AS ENUM('recommendation', 'ingredient_image', 'dish_image_retry');--> statement-breakpoint
CREATE TYPE "public"."generation_mode" AS ENUM('production_openai', 'local_codex');--> statement-breakpoint
CREATE TYPE "public"."openai_key_status" AS ENUM('validation_required', 'valid', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."rate_limit_bucket_type" AS ENUM('minute', 'day');--> statement-breakpoint
CREATE TABLE "fridge_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" text NOT NULL,
	"normalized_unit" text NOT NULL,
	"image_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fridge_items_positive_quantity" CHECK ("fridge_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "generated_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "generated_image_kind" NOT NULL,
	"status" "generated_image_status" DEFAULT 'pending' NOT NULL,
	"model" text NOT NULL,
	"generation_mode" "generation_mode" NOT NULL,
	"blob_pathname" text,
	"public_url" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_rate_limit_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"action_type" "generation_action_type" NOT NULL,
	"bucket_type" "rate_limit_bucket_type" NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"locale" text DEFAULT 'zh' NOT NULL,
	"preference_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"text_model" text NOT NULL,
	"generation_mode" "generation_mode" NOT NULL,
	"candidate_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recommendations_candidate_count_range" CHECK ("recommendations"."candidate_count" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "recommended_dishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"instructions_json" jsonb NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"image_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_openai_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"key_hint" text NOT NULL,
	"status" "openai_key_status" DEFAULT 'validation_required' NOT NULL,
	"last_validated_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fridge_items" ADD CONSTRAINT "fridge_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fridge_items" ADD CONSTRAINT "fridge_items_image_id_generated_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."generated_images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommended_dishes" ADD CONSTRAINT "recommended_dishes_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommended_dishes" ADD CONSTRAINT "recommended_dishes_image_id_generated_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."generated_images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_openai_keys" ADD CONSTRAINT "user_openai_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fridge_items_user_ingredient_unit_idx" ON "fridge_items" USING btree ("user_id","normalized_name","normalized_unit");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_rate_limit_buckets_scope_idx" ON "generation_rate_limit_buckets" USING btree ("clerk_user_id","action_type","bucket_type","bucket_start");--> statement-breakpoint
CREATE UNIQUE INDEX "preferences_user_id_idx" ON "preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recommendations_user_created_at_idx" ON "recommendations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recommended_dishes_recommendation_position_idx" ON "recommended_dishes" USING btree ("recommendation_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "user_openai_keys_user_id_idx" ON "user_openai_keys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");