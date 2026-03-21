import { useMemo, useState } from 'react';

import { legalConfig } from '../../../src/content/legal';

const topicOptions = [
  'Vault or document issue',
  'Trip setup issue',
  'Reminder or notification issue',
  'Onboarding issue',
  'Privacy or legal question',
  'Other',
] as const;

function buildTicketReference() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PINE-${stamp}-${suffix}`;
}

export function SupportTicketForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<(typeof topicOptions)[number]>(topicOptions[0]);
  const [device, setDevice] = useState('');
  const [message, setMessage] = useState('');
  const [ticketReference] = useState(() => buildTicketReference());

  const mailtoHref = useMemo(() => {
    const subject = `[${ticketReference}] Pineapple support: ${topic}`;
    const body = [
      `Ticket reference: ${ticketReference}`,
      `Name: ${name || 'Not provided'}`,
      `Reply email: ${email || 'Not provided'}`,
      `Topic: ${topic}`,
      `Device: ${device || 'Not provided'}`,
      '',
      'Issue details:',
      message || 'Add the issue details here.',
    ].join('\n');

    return `mailto:${legalConfig.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [device, email, message, name, ticketReference, topic]);

  return (
    <section className="support-ticket-card">
      <div className="support-ticket-copy">
        <p className="page-eyebrow">Support ticket</p>
        <h2>Submit a support request</h2>
        <p>
          This form prepares a support ticket email with a Pineapple reference number. It does not use a hidden
          backend, so submission opens your mail app with the ticket details filled in.
        </p>
        <p className="support-ticket-reference">Ticket reference: {ticketReference}</p>
      </div>

      <form className="support-form" action={mailtoHref} method="get">
        <label className="field">
          <span>Name</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Andrew" />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="field">
          <span>Issue type</span>
          <select value={topic} onChange={(event) => setTopic(event.target.value as (typeof topicOptions)[number])}>
            {topicOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Device or app version</span>
          <input
            type="text"
            value={device}
            onChange={(event) => setDevice(event.target.value)}
            placeholder="Pixel 8 · Android 16 · Pineapple 1.7.4"
          />
        </label>

        <label className="field field-full">
          <span>What happened?</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={7}
            placeholder="Describe the problem, what you expected, and any steps that reproduce it."
          />
        </label>

        <button className="button button-primary support-submit" type="submit">
          <span className="material-symbols-rounded" aria-hidden="true">
            mail
          </span>
          <span>Submit ticket</span>
        </button>
      </form>
    </section>
  );
}
