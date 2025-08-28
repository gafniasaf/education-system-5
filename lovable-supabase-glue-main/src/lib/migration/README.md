# Migration Utilities

This directory will contain utility functions and configurations migrated from your existing project.

## Available Utilities:

1. **Class Merging**: Use the existing `cn` utility:
   ```typescript
   import { cn } from "@/lib/utils";
   ```

2. **Supabase Types**: Generated types will be available at:
   ```typescript
   import { Database } from "@/integrations/supabase/types";
   ```

## Migration Steps:

1. Move utility functions to appropriate files in this directory
2. Update imports to use "@/lib/..." aliases
3. Ensure TypeScript compatibility
4. Test all utilities work with the new setup