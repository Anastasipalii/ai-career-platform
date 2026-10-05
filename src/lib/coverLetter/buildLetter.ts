// ============================================================================
// coverLetter/buildLetter — the ONE canonical textual representation of a
// cover letter (Cover Letter Step 3).
// ----------------------------------------------------------------------------
// Builds the complete letter (heading → recipient → subject → salutation →
// body → closing) from REAL candidate identity + the current edited body.
// Pure and deterministic (no date, no randomness) so Copy, and anything else
// that needs the full text, all agree. Blank optional fields are simply
// omitted — never rendered as a placeholder, and nothing is ever fabricated.
// ============================================================================

export interface LetterFields {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  jobTitle: string; // target role
  company: string;
}

const clean = (s: string | undefined | null) => (s ?? "").trim();

/**
 * Compose the full cover letter text from real fields + body. Any field that
 * is blank is omitted entirely (no placeholder lines, no fake identity).
 */
export function buildFullLetter(fields: Partial<LetterFields>, body: string): string {
  const name     = clean(fields.fullName);
  const role     = clean(fields.jobTitle);
  const company  = clean(fields.company);
  const contacts = [clean(fields.email), clean(fields.phone), clean(fields.location)].filter(Boolean);
  const bodyText = clean(body);

  const blocks: string[] = [];

  // Heading (candidate identity) — only the lines we actually have.
  const heading: string[] = [];
  if (name) heading.push(name);
  if (role) heading.push(role);
  if (contacts.length) heading.push(contacts.join(" · "));
  if (heading.length) blocks.push(heading.join("\n"));

  // Recipient.
  const recipient: string[] = ["Hiring Team"];
  if (company) recipient.push(company);
  blocks.push(recipient.join("\n"));

  // Subject (only the parts we have).
  const subject = ["Re: Application", role && `for ${role}`, company && `— ${company}`]
    .filter(Boolean)
    .join(" ");
  if (subject) blocks.push(subject);

  // Salutation.
  blocks.push("Dear Hiring Team,");

  // Body (the AI-written / user-edited content).
  if (bodyText) blocks.push(bodyText);

  // Closing — sign with the name only when we have it.
  blocks.push(name ? `Sincerely,\n${name}` : "Sincerely,");

  // One blank line between blocks; no leading/trailing noise.
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
