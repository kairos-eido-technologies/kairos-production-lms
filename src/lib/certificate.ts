// Printable certificate matching the view tab style on white paper (black and red). Auto-prints on load.
export interface CertPrintData {
  id: string;
  studentName: string;
  studentEmail?: string;
  courseName: string;
  courseCode?: string;
  teacherName: string;
  score: number;
  issuedAt?: string;
  requestedAt?: string;
}

export function renderPrintableCertificate(d: CertPrintData): string {
  const issued = d.issuedAt ?? new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certificate ${d.id}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0c0a09;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 297mm;
      height: 210mm;
      padding: 20mm;
      box-sizing: border-box;
      background: #ffffff;
      border: 12px solid #ef4444; /* Premium Red Border */
      border-radius: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      position: relative;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
    }
    .inner-border {
      position: absolute;
      inset: 6mm;
      border: 2px solid #1c1917; /* Slate/Black Inner Border */
      border-radius: 16px;
      pointer-events: none;
    }
    .icon {
      color: #ef4444;
      margin-bottom: 20px;
    }
    .brand {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3em;
      color: #78716c;
      margin-bottom: 4px;
    }
    .title {
      font-size: 20px;
      font-weight: 500;
      color: #78716c;
      margin-bottom: 30px;
    }
    .name {
      font-size: 44px;
      font-weight: 800;
      color: #0c0a09;
      margin-bottom: 15px;
      border-bottom: 2px solid #e7e5e4;
      padding-bottom: 10px;
      display: inline-block;
      min-width: 150mm;
    }
    .subtitle {
      font-size: 16px;
      color: #78716c;
      margin-bottom: 10px;
    }
    .course {
      font-size: 28px;
      font-weight: 700;
      color: #ef4444; /* Red Course Title */
      margin-bottom: 40px;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      width: 80%;
      margin-bottom: 40px;
      border-top: 1px solid #e7e5e4;
      border-bottom: 1px solid #e7e5e4;
      padding: 15px 0;
    }
    .stat-item {
      text-align: center;
    }
    .stat-val {
      font-size: 18px;
      font-weight: 700;
      color: #0c0a09;
      margin-bottom: 2px;
    }
    .stat-lbl {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #78716c;
    }
    .id {
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 11px;
      color: #a8a29e;
      margin-top: 10px;
    }
    @media print {
      .noprint { display: none; }
      body { background: #ffffff; }
      .sheet { box-shadow: none; border-color: #ef4444 !important; }
    }
    .noprint {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: #ffffff;
      border: 0;
      padding: 10px 18px;
      border-radius: 8px;
      cursor: pointer;
      font-family: system-ui;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
  </style>
</head>
<body>
  <button class="noprint" onclick="window.print()">Print / Save as PDF</button>
  <div class="sheet">
    <div class="inner-border"></div>
    <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="7"></circle>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
    </svg>
    <div class="brand">iTech Academy</div>
    <div class="title">Certificate of Completion</div>
    <div class="subtitle">This is to certify that</div>
    <div class="name">${escapeHtml(d.studentName)}</div>
    <div class="subtitle">has successfully completed</div>
    <div class="course">${escapeHtml(d.courseName)}</div>
    
    <div class="stats">
      <div class="stat-item">
        <div class="stat-val">${d.score}%</div>
        <div class="stat-lbl">Final Score</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">${escapeHtml(issued)}</div>
        <div class="stat-lbl">Issued</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">${escapeHtml(d.teacherName)}</div>
        <div class="stat-lbl">Instructor</div>
      </div>
    </div>
    
    <div class="id">ID: ${escapeHtml(d.id)} &nbsp;·&nbsp; Verify at /verify</div>
  </div>
  <script>setTimeout(function(){try{window.print();}catch(e){}}, 400);</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function openPrintableCertificate(d: CertPrintData) {
  const html = renderPrintableCertificate(d);
  const w = window.open("", "_blank");
  if (!w) {
    // fallback: download
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${d.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
