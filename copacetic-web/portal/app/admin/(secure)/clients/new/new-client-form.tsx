'use client';
import { useState } from 'react';
import { Submit } from '@/components/submit';
import { slugify } from '@/lib/validation';
import { createClientOrg } from '@/app/admin/actions';

export function NewClientForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  return (
    <form action={createClientOrg}>
      <div className="card">
        <h2>Firm</h2>
        <div className="grid2">
          <div className="field">
            <label htmlFor="name">Firm name</label>
            <input
              id="name"
              name="name"
              required
              maxLength={200}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="slug">Short name</label>
            <input
              id="slug"
              name="slug"
              required
              maxLength={80}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
            <p className="hint">Lower-case letters, numbers and hyphens. Used internally; can’t be changed later.</p>
          </div>
          <div className="field">
            <label htmlFor="sraNumber">SRA number (optional)</label>
            <input id="sraNumber" name="sraNumber" inputMode="numeric" pattern="[0-9]{3,8}" />
          </div>
        </div>
      </div>
      <div className="card">
        <h2>Website</h2>
        <div className="grid2">
          <div className="field">
            <label htmlFor="siteName">Site name or domain</label>
            <input id="siteName" name="siteName" required maxLength={200} placeholder="e.g. smithandco.co.uk" />
          </div>
          <div className="field">
            <label htmlFor="invoiceOn">Invoicing</label>
            <select id="invoiceOn" name="invoiceOn" defaultValue="sign_off">
              <option value="sign_off">In full on sign-off</option>
              <option value="deposit_and_sign_off">50% deposit on content, balance on sign-off</option>
            </select>
          </div>
        </div>
      </div>
      <div className="card">
        <h2>First contact</h2>
        <div className="grid2">
          <div className="field">
            <label htmlFor="contactEmail">Email</label>
            <input id="contactEmail" name="contactEmail" type="email" required autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="contactRole">Role</label>
            <select id="contactRole" name="contactRole" defaultValue="owner">
              <option value="owner">Owner</option>
              <option value="approver">Approver</option>
              <option value="editor">Editor</option>
            </select>
            <p className="hint">Usually the owner, who can then invite the rest of the firm.</p>
          </div>
        </div>
      </div>
      <Submit pending="Creating…">Create client and send invitation</Submit>
    </form>
  );
}
