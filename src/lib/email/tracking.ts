import { appUrl } from "@/lib/email/transactional";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}

const URL_RE = /(https?:\/\/[^\s<>")]+)/g;

/**
 * Build an HTML body with optional open-tracking pixel and click-tracking link
 * rewrites. Only called when the agent has the corresponding toggle ON
 * (tracking is off by default for deliverability).
 */
export function buildTrackedHtml(
  emailId: string,
  textBody: string,
  opts: { trackOpens: boolean; trackClicks: boolean }
): string {
  const base = appUrl();
  let html = escapeHtml(textBody);

  if (opts.trackClicks) {
    html = html.replace(URL_RE, (url) => {
      const tracked = `${base}/api/track/click/${emailId}?u=${encodeURIComponent(url)}`;
      return `<a href="${tracked}">${url}</a>`;
    });
  } else {
    html = html.replace(URL_RE, (url) => `<a href="${url}">${url}</a>`);
  }

  html = html.replace(/\n/g, "<br>");

  if (opts.trackOpens) {
    html += `<img src="${base}/api/track/open/${emailId}" width="1" height="1" style="display:none" alt="">`;
  }
  return `<div>${html}</div>`;
}
