import { json, limited, notFound, preflight, publicDb, validSite } from '@/lib/website/feed';
import { openNow, readWeek, TIME_ZONE, type Closure } from '@/lib/website/hours';

// GET /api/public/v1/sites/{siteId}/opening-times — each office's weekly hours, upcoming special days
// and whether it's open right now. Sites should re-check "openNow" client-side or refresh often.

type Row = { office_id: string; name: string; address: string | null; phone: string | null; weekly: unknown; note: string | null; closures: unknown; updated_at: string | null };

export async function GET(request: Request, ctx: RouteContext<'/api/public/v1/sites/[siteId]/opening-times'>) {
  const blocked = limited(request);
  if (blocked) return blocked;
  const { siteId } = await ctx.params;
  if (!validSite(siteId)) return notFound();
  const { data, error } = await publicDb().rpc('public_site_hours', { p_site: siteId });
  if (error) return json({ error: 'Unavailable' }, 503);
  const now = new Date();
  return json({
    timeZone: TIME_ZONE,
    generatedAt: now.toISOString(),
    offices: ((data ?? []) as Row[]).map((o) => {
      const weekly = readWeek(o.weekly);
      const closures = (Array.isArray(o.closures) ? o.closures : []) as Closure[];
      const status = openNow(weekly, closures, now);
      return {
        id: o.office_id,
        name: o.name,
        address: o.address,
        phone: o.phone,
        weekly,
        note: o.note,
        specialDays: closures,
        openNow: status.open,
        closesAt: status.closesAt,
        today: status.today,
        todayNote: status.todayNote,
        updatedAt: o.updated_at,
      };
    }),
  });
}

export const OPTIONS = preflight;
