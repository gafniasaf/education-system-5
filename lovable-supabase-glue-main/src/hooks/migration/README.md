# Migration Hooks

This directory will contain custom hooks migrated from your existing project.

## Migration Guidelines:

1. **Supabase Hooks**: Update to use the integrated Supabase client:
   ```typescript
   import { supabase } from "@/integrations/supabase/client";
   ```

2. **React Query**: Already configured and available:
   ```typescript
   import { useQuery, useMutation } from "@tanstack/react-query";
   ```

3. **TypeScript**: Update type imports to use generated Supabase types:
   ```typescript
   import { Database } from "@/integrations/supabase/types";
   ```

4. **Toast Notifications**: Use the configured toast system:
   ```typescript
   import { useToast } from "@/hooks/use-toast";
   ```