import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InviteFlash } from '@/components/invite-flash';
import { Submit } from '@/components/submit';
import { requireUser } from '@/lib/auth';
import { takeInviteFlash } from '@/lib/invitations';
import { messageFor } from '@/lib/messages';
import { ROLE_HELP, ROLE_LABELS } from '@/lib/stages';
import { createClient } from '@/lib/supabase/server';
import { changeRole, inviteMember, removeMember, revokeInvite } from './actions';

export const metadata: Metadata = { title: 'Team' };

const ROLES = ['owner', 'approver', 'editor'] as const;

export default async function TeamPage(props: PageProps<'/team'>) {
  const viewer = await requireUser();
  const { error } = await props.searchParams;
  const supabase = await createClient();
  const { data: owned } = await supabase
    .from('memberships')
    .select('organisations (id, name)')
    .eq('user_id', viewer.userId)
    .eq('role', 'owner');
  if (!owned?.length) notFound();
  const flash = await takeInviteFlash();

  return (
    <>
      <div className="eyebrow">Team</div>
      <h1>Who can use your portal</h1>
      <p className="lede">Invite colleagues and choose what each person can do.</p>
      {flash && <InviteFlash {...flash} />}
      {messageFor(error) && (
        <div className="notice err" role="alert">
          {messageFor(error)}
        </div>
      )}
      <div className="card muted small">
        {ROLES.map((r) => (
          <p key={r}>
            <strong>{ROLE_LABELS[r]}:</strong> {ROLE_HELP[r]}
          </p>
        ))}
      </div>
      {await Promise.all(
        owned.map(async (o) => {
          const org = o.organisations as unknown as { id: string; name: string };
          const [{ data: members }, { data: invites }] = await Promise.all([
            supabase.from('memberships').select('user_id, role, profiles (email, full_name)').eq('org_id', org.id).order('created_at'),
            supabase
              .from('invitations')
              .select('id, email, role, expires_at')
              .eq('org_id', org.id)
              .is('accepted_at', null)
              .is('revoked_at', null)
              .gt('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false }),
          ]);
          return (
            <section key={org.id} className="card" aria-labelledby={`team-${org.id}`}>
              <h2 id={`team-${org.id}`}>{org.name}</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Person</th>
                      <th scope="col">Role</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(members ?? []).map((m) => {
                      const p = m.profiles as unknown as { email: string; full_name: string | null };
                      const label = p.full_name || p.email;
                      return (
                        <tr key={m.user_id}>
                          <td>
                            {p.full_name && <div>{p.full_name}</div>}
                            <div className="small">{p.email}{m.user_id === viewer.userId && ' (you)'}</div>
                          </td>
                          <td>
                            <form action={changeRole} className="row">
                              <input type="hidden" name="orgId" value={org.id} />
                              <input type="hidden" name="userId" value={m.user_id} />
                              <label className="sr-only" htmlFor={`role-${org.id}-${m.user_id}`}>Role for {label}</label>
                              <select id={`role-${org.id}-${m.user_id}`} name="role" defaultValue={m.role} style={{ width: 'auto' }}>
                                {ROLES.map((r) => (
                                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                              </select>
                              <Submit className="btn ghost">Save</Submit>
                            </form>
                          </td>
                          <td>
                            <form action={removeMember}>
                              <input type="hidden" name="orgId" value={org.id} />
                              <input type="hidden" name="userId" value={m.user_id} />
                              <Submit className="btn danger">Remove<span className="sr-only"> {label}</span></Submit>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                    {(invites ?? []).map((i) => (
                      <tr key={i.id}>
                        <td>
                          <div className="small">{i.email}</div>
                          <span className="pill amber">Invited</span>
                        </td>
                        <td>{ROLE_LABELS[i.role as keyof typeof ROLE_LABELS]}</td>
                        <td>
                          <form action={revokeInvite}>
                            <input type="hidden" name="orgId" value={org.id} />
                            <input type="hidden" name="inviteId" value={i.id} />
                            <Submit className="btn danger">Withdraw<span className="sr-only"> invitation for {i.email}</span></Submit>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form action={inviteMember} className="stack" style={{ marginTop: 18 }}>
                <input type="hidden" name="orgId" value={org.id} />
                <h3>Invite someone</h3>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor={`inv-email-${org.id}`}>Email</label>
                    <input id={`inv-email-${org.id}`} name="email" type="email" required autoComplete="off" />
                  </div>
                  <div className="field">
                    <label htmlFor={`inv-role-${org.id}`}>Role</label>
                    <select id={`inv-role-${org.id}`} name="role" defaultValue="editor">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Submit pending="Sending…">Send invitation</Submit>
              </form>
            </section>
          );
        }),
      )}
    </>
  );
}
