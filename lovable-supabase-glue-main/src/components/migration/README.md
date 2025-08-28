# Migration Components

This directory will contain components migrated from your existing project.

## Important Migration Notes:

1. **Import Paths**: Update all imports to use "@/..." aliases
   - `import { Button } from "../ui/button"` → `import { Button } from "@/components/ui/button"`

2. **Supabase Client**: Replace your existing Supabase client with:
   ```typescript
   import { supabase } from "@/integrations/supabase/client";
   ```

3. **Assets**: Move images/assets to `public/` directory and reference with `/image.png`

4. **Styling**: Use semantic design tokens from the design system:
   - `className="bg-white text-black"` → `className="bg-background text-foreground"`
   - All colors are HSL and theme-aware (light/dark mode)

5. **Components**: Leverage existing shadcn/ui components in `/src/components/ui/`

## Directory Structure:
- `/layout/` - Layout components (headers, footers, navigation)
- `/features/` - Feature-specific components
- `/shared/` - Shared/common components