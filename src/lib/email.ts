import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM = `"${process.env.NOTIFICATION_FROM_NAME || "PRAMAAN AI"}" <${process.env.GMAIL_USER}>`;

// ─── Shared HTML shell ────────────────────────────────────────────────────────
function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0A1128 0%,#1e3a8a 100%);padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">🛡️ PRAMAAN AI</span>
                  <p style="margin:4px 0 0;font-size:12px;color:#93c5fd;letter-spacing:1px;text-transform:uppercase;">Border Document Verification System</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px 36px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              This is an automated alert from <strong>PRAMAAN AI</strong> — Document Screening System &nbsp;|&nbsp; v2.4<br/>
              You are receiving this because you have notifications enabled in your Settings.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── High-Risk Alert Email ────────────────────────────────────────────────────
export async function sendHighRiskAlert(opts: {
  to: string;
  officerName: string;
  screeningId: string;
  passengerName: string;
  documentType: string;
  riskScore: number;
  riskLevel: string;
  primaryConcern: string | null;
  isTampered: boolean;
  tamperingType: string | null;
  timestamp: Date;
}) {
  const {
    to, officerName, screeningId, passengerName,
    documentType, riskScore, riskLevel,
    primaryConcern, isTampered, tamperingType, timestamp,
  } = opts;

  const riskColor = riskLevel === "HIGH" ? "#dc2626" : riskLevel === "MEDIUM" ? "#d97706" : "#16a34a";
  const riskBg = riskLevel === "HIGH" ? "#fef2f2" : riskLevel === "MEDIUM" ? "#fffbeb" : "#f0fdf4";

  const body = `
    <div style="margin-bottom:24px;">
      <div style="background:${riskBg};border:2px solid ${riskColor};border-radius:12px;padding:20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${riskColor};text-transform:uppercase;letter-spacing:1px;">⚠️ HIGH RISK ALERT</p>
        <p style="margin:0;font-size:32px;font-weight:900;color:${riskColor};">${riskScore}<span style="font-size:18px;font-weight:400;color:#6b7280;">/100</span></p>
        <p style="margin:6px 0 0;font-size:13px;font-weight:600;color:${riskColor};">Flagged for Physical Inspection</p>
      </div>
    </div>

    <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0f172a;">Screening Alert: ${screeningId}</h2>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:10px 14px;background:#f8fafc;border-radius:8px 8px 0 0;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Passenger</span>
          <p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#0f172a;">${passengerName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Document Type</span>
          <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${documentType}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Screened By</span>
          <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${officerName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Timestamp</span>
          <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${new Date(timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#f8fafc;border-radius:0 0 8px 8px;">
          <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Tampering AI</span>
          <p style="margin:2px 0 0;font-size:14px;font-weight:700;color:${isTampered ? "#dc2626" : "#16a34a"};">
            ${isTampered ? `⚠️ TAMPERED — ${tamperingType || "Forgery Detected"}` : "✅ Clean — No Tampering"}
          </p>
        </td>
      </tr>
    </table>

    ${primaryConcern ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;">Primary Concern</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#991b1b;">${primaryConcern}</p>
    </div>` : ""}

    <p style="margin:0;font-size:13px;color:#64748b;">
      Please take immediate action. Log in to <strong>PRAMAAN AI</strong> to review the full screening report and make a decision.
    </p>`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `🚨 HIGH RISK ALERT — ${screeningId} | PRAMAAN AI`,
    html: wrap("High Risk Screening Alert", body),
  });
}

// ─── Screening Result Email ───────────────────────────────────────────────────
export async function sendScreeningResult(opts: {
  to: string;
  officerName: string;
  screeningId: string;
  passengerName: string;
  documentType: string;
  riskScore: number;
  riskLevel: string;
  status: string;
  timestamp: Date;
}) {
  const { to, officerName, screeningId, passengerName, documentType, riskScore, riskLevel, status, timestamp } = opts;

  const isCleared = status === "CLEARED";
  const riskColor = riskLevel === "HIGH" ? "#dc2626" : riskLevel === "MEDIUM" ? "#d97706" : "#16a34a";
  const statusColor = isCleared ? "#16a34a" : "#d97706";
  const statusBg = isCleared ? "#f0fdf4" : "#fffbeb";

  const body = `
    <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0f172a;">Screening Complete — ${screeningId}</h2>

    <div style="background:${statusBg};border:1px solid ${statusColor};border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;">
      <span style="font-size:28px;margin-right:12px;">${isCleared ? "✅" : "⚠️"}</span>
      <div>
        <p style="margin:0;font-size:16px;font-weight:800;color:${statusColor};">${status}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Risk Score: <strong style="color:${riskColor};">${riskScore}/100 (${riskLevel})</strong></p>
      </div>
    </div>

    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:24px;">
      <tr style="background:#f8fafc;">
        <td style="padding:10px 14px;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;">Passenger</td>
        <td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">${passengerName}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;">Document</td>
        <td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">${documentType}</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:10px 14px;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0;">Screened By</td>
        <td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">${officerName}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-weight:600;color:#64748b;">Timestamp</td>
        <td style="padding:10px 14px;font-weight:700;color:#0f172a;">${new Date(timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
      </tr>
    </table>`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `${isCleared ? "✅" : "⚠️"} Screening Result — ${screeningId} | PRAMAAN AI`,
    html: wrap("Screening Result", body),
  });
}

// ─── Daily Digest Email ───────────────────────────────────────────────────────
export async function sendDailyDigest(opts: {
  to: string;
  officerName: string;
  date: string;
  total: number;
  cleared: number;
  flagged: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  topConcern: string | null;
  recentScreenings: Array<{ screeningId: string; name: string; riskLevel: string; status: string }>;
}) {
  const { to, officerName, date, total, cleared, flagged, highRisk, mediumRisk, lowRisk, topConcern, recentScreenings } = opts;

  const clearedPct = total > 0 ? ((cleared / total) * 100).toFixed(1) : "0";

  const recentRows = recentScreenings.slice(0, 5).map(s => {
    const riskColor = s.riskLevel === "HIGH" ? "#dc2626" : s.riskLevel === "MEDIUM" ? "#d97706" : "#16a34a";
    return `
      <tr>
        <td style="padding:8px 12px;font-family:monospace;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">${s.screeningId}</td>
        <td style="padding:8px 12px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${s.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
          <span style="background:${riskColor}20;color:${riskColor};font-weight:700;font-size:11px;padding:2px 8px;border-radius:20px;">${s.riskLevel}</span>
        </td>
        <td style="padding:8px 12px;font-weight:600;color:${s.status === "CLEARED" ? "#16a34a" : "#d97706"};border-bottom:1px solid #e2e8f0;">${s.status}</td>
      </tr>`;
  }).join("");

  const body = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">Daily Screening Digest</h2>
    <p style="margin:0 0 28px;font-size:13px;color:#64748b;">Good morning, <strong>${officerName}</strong>! Here's your summary for <strong>${date}</strong>.</p>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:900;color:#1d4ed8;">${total}</p>
        <p style="margin:4px 0 0;font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;">Total</p>
      </td></tr></table>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:900;color:#16a34a;">${cleared}</p>
        <p style="margin:4px 0 0;font-size:11px;font-weight:700;color:#22c55e;text-transform:uppercase;">Cleared</p>
      </td></tr></table>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#fef2f2;border-radius:10px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:900;color:#dc2626;">${flagged}</p>
        <p style="margin:4px 0 0;font-size:11px;font-weight:700;color:#ef4444;text-transform:uppercase;">Flagged</p>
      </td></tr></table>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="33%" style="padding:12px;background:#fff7ed;border-radius:10px;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:900;color:#dc2626;">${highRisk}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#dc2626;font-weight:700;">HIGH RISK</p>
        </td>
        <td width="4%"></td>
        <td width="29%" style="padding:12px;background:#fffbeb;border-radius:10px;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:900;color:#d97706;">${mediumRisk}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#d97706;font-weight:700;">MEDIUM</p>
        </td>
        <td width="4%"></td>
        <td width="30%" style="padding:12px;background:#f0fdf4;border-radius:10px;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:900;color:#16a34a;">${lowRisk}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#16a34a;font-weight:700;">LOW RISK</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Clear Rate</p>
    <div style="background:#e2e8f0;border-radius:99px;height:8px;margin-bottom:4px;">
      <div style="background:#22c55e;height:8px;border-radius:99px;width:${clearedPct}%;"></div>
    </div>
    <p style="margin:0 0 28px;font-size:12px;color:#64748b;">${clearedPct}% of all screenings cleared successfully</p>

    ${topConcern ? `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#ea580c;text-transform:uppercase;">Top Concern</p>
      <p style="margin:0;font-size:13px;font-weight:600;color:#9a3412;">${topConcern}</p>
    </div>` : ""}

    ${recentScreenings.length > 0 ? `
    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#0f172a;">Recent Screenings</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;font-size:12px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">ID</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Name</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Risk</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Status</th>
        </tr>
      </thead>
      <tbody>${recentRows}</tbody>
    </table>` : ""}`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `📊 Daily Digest — ${date} | PRAMAAN AI`,
    html: wrap("Daily Screening Digest", body),
  });
}

// ─── Test Connection ──────────────────────────────────────────────────────────
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
