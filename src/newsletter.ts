/**
 * Newsletter form: submits email to a Google Sheets–backed endpoint.
 *
 * For a "live" Google Sheet, use one of:
 *
 * 1) Google Apps Script (no backend): create a script that doesPost(e) and
 *    appends e.parameter.email to a sheet, deploy as "Web app" (execute as me,
 *    who has access). Set VITE_GOOGLE_SCRIPT_URL to the script URL.
 *
 * 2) Vercel serverless: use api/submit-newsletter.ts and Google Sheets API
 *    (service account). Set VITE_NEWSLETTER_API_URL to /api/submit-newsletter.
 */

const API_URL =
  typeof import.meta.env.VITE_NEWSLETTER_API_URL === 'string' && import.meta.env.VITE_NEWSLETTER_API_URL
    ? import.meta.env.VITE_NEWSLETTER_API_URL
    : import.meta.env.VITE_GOOGLE_SCRIPT_URL ?? '';

export function initNewsletter(): void {
  const form = document.getElementById('newsletter-form') as HTMLFormElement;
  const input = document.getElementById('email') as HTMLInputElement;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
  const messageEl = document.getElementById('form-message');

  if (!form || !input || !submitBtn || !messageEl) return;

  const msgEl = messageEl;

  function setMessage(text: string, isError: boolean): void {
    msgEl.textContent = text;
    msgEl.className = 'form-message ' + (isError ? 'error' : 'success');
  }

  function clearMessage(): void {
    msgEl.textContent = '';
    msgEl.className = 'form-message';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();

    const email = (input.value ?? '').trim();
    if (!email) {
      setMessage('Please enter your email.', true);
      return;
    }

    if (!API_URL) {
      setMessage('Newsletter signup is not configured. Set VITE_GOOGLE_SCRIPT_URL or VITE_NEWSLETTER_API_URL.', true);
      return;
    }

    submitBtn.disabled = true;
    try {
      // Form-encoded so Google Apps Script doPost(e) receives e.parameter.email
      const body = new URLSearchParams({ email });
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || res.statusText || 'Request failed');
      }
      setMessage('Thanks! You’re subscribed.', false);
      input.value = '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setMessage(msg, true);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
