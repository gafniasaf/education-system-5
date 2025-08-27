import { getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { isTestMode } from "@/lib/testMode";

export type AppEvent = {
  event_type: string;
  entity_type: string;
  entity_id: string;
  user_id?: string | null;
  meta?: Record<string, unknown> | null;
};

const memoryEvents: AppEvent[] = [];

export function getInMemoryEvents(): AppEvent[] {
  return [...memoryEvents];
}

export function __clearInMemoryEventsForTests() {
  if (isTestMode()) {
    memoryEvents.length = 0;
  }
}

export async function recordEvent(ev: AppEvent): Promise<void> {
  if (isTestMode()) {
    memoryEvents.push({ ...ev });
    // Keep a reasonable cap to avoid unbounded growth in long test runs
    if (memoryEvents.length > 1000) memoryEvents.splice(0, memoryEvents.length - 1000);
    return;
  }
  const supabase = getRouteHandlerSupabase();
  try {
    await supabase
      .from('events')
      .insert({
        user_id: ev.user_id ?? null,
        event_type: ev.event_type,
        entity_type: ev.entity_type,
        entity_id: ev.entity_id,
        meta: ev.meta ?? {},
      });
  } catch {}
}


