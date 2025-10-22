-- Add missing unique constraints for seed data compatibility

-- Add unique constraint on evaluation_categories.name
ALTER TABLE public.evaluation_categories
ADD CONSTRAINT evaluation_categories_name_unique UNIQUE (name);

-- Add unique constraint on user_entitlements.user_id (one entitlement per user)
ALTER TABLE public.user_entitlements
ADD CONSTRAINT user_entitlements_user_id_unique UNIQUE (user_id);

-- Add unique constraint on validation_results.content_pack_id (one validation per content pack)
ALTER TABLE public.validation_results
ADD CONSTRAINT validation_results_content_pack_id_unique UNIQUE (content_pack_id);
