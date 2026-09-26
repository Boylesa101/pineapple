// The job worker talks to the database through this interface: Supabase (secret key) in production,
// an in-memory fake in tests.

export type JobAction =
  | 'ensure_project' | 'upsert_briefing_task' | 'upsert_section_task' | 'section_reopened' | 'briefing_reopened';

export type Job = { id: number; action: JobAction; org_id: string | null; entity_id: string; attempts: number };

export type SiteInfo = {
  id: string; orgId: string; orgName: string; name: string;
  projectGid: string | null; sections: Record<string, string>;
};
export type SectionInfo = {
  id: string; orgId: string; orgName: string; type: string; title: string | null;
  status: 'draft' | 'submitted' | 'approved'; taskGid: string | null; submittedAt: string | null;
};
export type BriefingInfo = {
  orgId: string; orgName: string; status: 'draft' | 'submitted'; taskGid: string | null; submittedAt: string | null;
};

export interface JobStore {
  claim(limit: number): Promise<Job[]>;
  complete(id: number): Promise<void>;
  reschedule(id: number, at: Date, error: string): Promise<void>;
  fail(id: number, error: string): Promise<void>;

  site(id: string): Promise<SiteInfo | null>;
  saveSiteAsana(id: string, projectGid: string, sections: Record<string, string>): Promise<void>;
  // The Asana project for a firm: its first site that has one.
  orgProject(orgId: string): Promise<{ projectGid: string; sections: Record<string, string> } | null>;
  section(id: string): Promise<SectionInfo | null>;
  setSectionTask(id: string, gid: string): Promise<void>;
  briefing(orgId: string): Promise<BriefingInfo | null>;
  setBriefingTask(orgId: string, gid: string): Promise<void>;

  webhook(projectGid: string): Promise<{ webhookGid: string | null; hasSecret: boolean } | null>;
  openHandshake(projectGid: string): Promise<void>;
  setWebhookGid(projectGid: string, webhookGid: string): Promise<void>;
}

export type JobConfig = {
  teamGid: string;
  workspaceGid: string;
  assigneeGid?: string;
  portalUrl: string;
  // Asana must be able to reach this to deliver task changes; left out for localhost.
  webhookUrl?: string;
};
