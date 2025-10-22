-- Ensure unique constraint exists on system_status.status_type
-- This is needed for the update_system_status function's ON CONFLICT clause

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'system_status_type_unique'
        AND conrelid = 'public.system_status'::regclass
    ) THEN
        ALTER TABLE public.system_status
        ADD CONSTRAINT system_status_type_unique UNIQUE (status_type);

        RAISE NOTICE 'Added unique constraint system_status_type_unique';
    ELSE
        RAISE NOTICE 'Unique constraint system_status_type_unique already exists';
    END IF;
END $$;
