import { AppData, Job, CutList, Drawer } from './types';
import { getSupabase } from './supabase';

const STORAGE_KEY = 'drawerCalcOffline';

// ── Local Storage ──────────────────────────────────────────────

function cleanData(data: AppData): AppData {
  return JSON.parse(
    JSON.stringify(data, (k, v) => (k.startsWith('_') ? undefined : v))
  );
}

export function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: AppData = JSON.parse(raw);
      let nextId = 1;
      parsed.jobs.forEach((j) => {
        if (!j.id) j.id = 'd' + nextId++ + Date.now() % 10000;
        j._open = true;
        j.lists.forEach((l) => {
          if (!l.id) l.id = 'd' + nextId++ + Date.now() % 10000;
        });
      });
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load local data:', e);
  }
  return { jobs: [] };
}

export function saveLocal(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData(data)));
  } catch (e) {
    console.warn('Failed to save local data:', e);
  }
}

// ── Supabase ───────────────────────────────────────────────────

export async function loadFromSupabase(): Promise<AppData | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data: jobs, error: jobsErr } = await sb
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: true });
    if (jobsErr) throw jobsErr;
    if (!jobs || !jobs.length) return { jobs: [] };

    const { data: lists, error: listsErr } = await sb
      .from('lists')
      .select('*')
      .order('position', { ascending: true });
    if (listsErr) throw listsErr;

    const { data: drawers, error: drawersErr } = await sb
      .from('drawers')
      .select('*')
      .order('position', { ascending: true });
    if (drawersErr) throw drawersErr;

    const result: AppData = { jobs: [] };
    for (const j of jobs) {
      const jobLists: CutList[] = (lists || [])
        .filter((l) => l.job_id === j.id)
        .map((l) => ({
          id: l.id,
          name: l.name,
          drawers: (drawers || [])
            .filter((d) => d.list_id === l.id)
            .map((d) => ({
              openWidth: d.open_width,
              openDepth: d.open_depth,
              height: d.height,
              qty: d.qty,
            })),
        }));
      result.jobs.push({
        id: j.id,
        name: j.name,
        lists: jobLists,
        _open: true,
      });
    }
    return result;
  } catch (e) {
    console.error('Failed to load from Supabase:', e);
    return null;
  }
}

export async function saveToSupabase(data: AppData): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    // Upsert jobs
    for (const job of data.jobs) {
      await sb.from('jobs').upsert({ id: job.id, name: job.name });

      for (let li = 0; li < job.lists.length; li++) {
        const list = job.lists[li];
        await sb.from('lists').upsert({
          id: list.id,
          job_id: job.id,
          name: list.name,
          position: li,
        });

        // Delete existing drawers for this list and re-insert
        await sb.from('drawers').delete().eq('list_id', list.id);
        if (list.drawers.length > 0) {
          await sb.from('drawers').insert(
            list.drawers.map((d, di) => ({
              list_id: list.id,
              open_width: d.openWidth,
              open_depth: d.openDepth,
              height: d.height,
              qty: d.qty,
              position: di,
            }))
          );
        }
      }
    }
    return true;
  } catch (e) {
    console.error('Failed to save to Supabase:', e);
    return false;
  }
}

export async function deleteJobFromSupabase(jobId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    // Cascade: drawers → lists → job
    const { data: lists } = await sb
      .from('lists')
      .select('id')
      .eq('job_id', jobId);
    if (lists) {
      for (const l of lists) {
        await sb.from('drawers').delete().eq('list_id', l.id);
      }
      await sb.from('lists').delete().eq('job_id', jobId);
    }
    await sb.from('jobs').delete().eq('id', jobId);
  } catch (e) {
    console.error('Failed to delete job from Supabase:', e);
  }
}

export async function deleteListFromSupabase(listId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('drawers').delete().eq('list_id', listId);
    await sb.from('lists').delete().eq('id', listId);
  } catch (e) {
    console.error('Failed to delete list from Supabase:', e);
  }
}
