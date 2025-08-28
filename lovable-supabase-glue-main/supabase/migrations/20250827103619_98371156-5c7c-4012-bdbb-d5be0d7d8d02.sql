-- Add file_attachments column to submissions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'submissions' AND column_name = 'file_attachments') THEN
        ALTER TABLE submissions 
        ADD COLUMN file_attachments JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add resource_files column to assignments table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assignments' AND column_name = 'resource_files') THEN
        ALTER TABLE assignments
        ADD COLUMN resource_files JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;