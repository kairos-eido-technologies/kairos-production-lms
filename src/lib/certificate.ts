import { ITECH_LOGO_BASE64 } from "./logo-base64";

// Printable certificate with iTech branding, instructor signature, and Founder Ram Subramaniyan signature.
export interface CertPrintData {
  id: string;
  studentName: string;
  studentEmail?: string;
  courseName: string;
  courseCode?: string;
  teacherName?: string;
  score?: number;
  issuedAt?: string;
  requestedAt?: string;
}

export function renderPrintableCertificate(d: CertPrintData): string {
  const issued = d.issuedAt ?? new Date().toISOString().slice(0, 10);
  const instructor = d.teacherName || "Course Instructor";
  const ownerName = "Ram Subramaniyan";
  const logoSrc = ITECH_LOGO_BASE64 || "https://kairos-production-lms.vercel.app/logo.png";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Certificate ${escapeHtml(d.id)} — iTech Academy</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Great+Vibes&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&display=swap" rel="stylesheet">
  <style>
    @page { 
      size: A4 landscape; 
      margin: 0; 
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #0f172a;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 297mm;
      height: 210mm;
      padding: 16mm 20mm;
      background: #ffffff;
      border: 10px solid #dc2626; /* Premium iTech Crimson/Red Border */
      border-radius: 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      position: relative;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
    }
    .inner-border {
      position: absolute;
      inset: 4.5mm;
      border: 2px solid #1e293b;
      border-radius: 12px;
      pointer-events: none;
    }
    .corner-decor {
      position: absolute;
      width: 32px;
      height: 32px;
      border-color: #dc2626;
      pointer-events: none;
    }
    .corner-tl { top: 7mm; left: 7mm; border-top: 3px solid #dc2626; border-left: 3px solid #dc2626; }
    .corner-tr { top: 7mm; right: 7mm; border-top: 3px solid #dc2626; border-right: 3px solid #dc2626; }
    .corner-bl { bottom: 7mm; left: 7mm; border-bottom: 3px solid #dc2626; border-left: 3px solid #dc2626; }
    .corner-br { bottom: 7mm; right: 7mm; border-bottom: 3px solid #dc2626; border-right: 3px solid #dc2626; }
    
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 480px;
      opacity: 0.035;
      pointer-events: none;
      user-select: none;
    }

    /* Header Section */
    .cert-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 1;
      margin-top: 2mm;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }
    .logo-img {
      height: 52px;
      width: auto;
      object-fit: contain;
    }
    .brand-name {
      font-family: 'Cinzel', serif;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.22em;
      color: #0f172a;
      text-transform: uppercase;
    }
    .main-title {
      font-family: 'Cinzel', serif;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 0.18em;
      color: #dc2626;
      text-transform: uppercase;
      margin: 4px 0 0 0;
      position: relative;
    }
    .main-title::after {
      content: '';
      display: block;
      width: 140px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #dc2626, transparent);
      margin: 6px auto 0 auto;
    }

    /* Body Content */
    .cert-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 1;
      width: 100%;
      margin: auto 0;
    }
    .presented-text {
      font-size: 14px;
      font-style: italic;
      color: #64748b;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .recipient-name {
      font-family: 'Playfair Display', serif;
      font-size: 38px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.02em;
      padding: 0 30px 4px 30px;
      border-bottom: 2px solid #e2e8f0;
      display: inline-block;
      min-width: 150mm;
      max-width: 230mm;
      margin-bottom: 8px;
    }
    .completion-text {
      font-size: 13.5px;
      color: #475569;
      letter-spacing: 0.03em;
      margin-bottom: 6px;
    }
    .course-title {
      font-family: 'Inter', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #dc2626;
      letter-spacing: -0.01em;
      max-width: 240mm;
      line-height: 1.25;
    }

    /* Signatures & Seal Section */
    .cert-footer {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: end;
      padding: 0 10mm;
      margin-bottom: 2mm;
      z-index: 1;
    }
    .signature-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .sig-handwritten {
      font-family: 'Great Vibes', cursive;
      font-size: 32px;
      color: #1e293b;
      line-height: 1;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(-3deg);
    }
    .sig-line {
      width: 170px;
      height: 1.5px;
      background: #0f172a;
      margin: 4px 0 6px 0;
    }
    .sig-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.03em;
    }
    .sig-title {
      font-size: 11px;
      font-weight: 500;
      color: #64748b;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* Center Seal & ID */
    .seal-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 15px;
    }
    .seal-badge {
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: radial-gradient(circle, #fef08a 0%, #ca8a04 70%, #854d0e 100%);
      border: 3px double #ffffff;
      box-shadow: 0 4px 14px rgba(202, 138, 4, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      margin-bottom: 6px;
      position: relative;
    }
    .seal-badge svg {
      width: 32px;
      height: 32px;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
    }
    .cert-meta {
      font-size: 10.5px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }
    .cert-id-tag {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      margin-top: 3px;
      letter-spacing: 0.04em;
    }

    /* Print Control */
    @media print {
      .noprint { display: none !important; }
      body { background: #ffffff !important; }
      .sheet { 
        box-shadow: none !important; 
        border-color: #dc2626 !important;
        border-radius: 0 !important;
      }
    }
    .noprint {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc2626;
      color: #ffffff;
      border: 0;
      padding: 12px 24px;
      border-radius: 10px;
      cursor: pointer;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 10px 25px rgba(220, 38, 38, 0.4);
      z-index: 100;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .noprint:hover {
      background: #b91c1c;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <button class="noprint" onclick="window.print()">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>
    Print / Save as PDF
  </button>

  <div class="sheet">
    <div class="inner-border"></div>
    <div class="corner-decor corner-tl"></div>
    <div class="corner-decor corner-tr"></div>
    <div class="corner-decor corner-bl"></div>
    <div class="corner-decor corner-br"></div>

    <!-- Background Watermark Logo -->
    <img src="${logoSrc}" alt="Watermark" class="watermark" />

    <!-- Top Header with Official Logo -->
    <div class="cert-header">
      <div class="logo-wrap">
        <img src="${logoSrc}" alt="iTech Academy Logo" class="logo-img" />
        <span class="brand-name">iTech Academy</span>
      </div>
      <h1 class="main-title">Certificate of Completion</h1>
    </div>

    <!-- Main Recipient & Course Details -->
    <div class="cert-body">
      <div class="presented-text">This is proudly presented to</div>
      <div class="recipient-name">${escapeHtml(d.studentName)}</div>
      <div class="completion-text">for successfully completing all requirements for the course</div>
      <div class="course-title">${escapeHtml(d.courseName)}</div>
    </div>

    <!-- Signatures: Instructor & Owner (Ram Subramaniyan) + Official Seal with Certificate ID -->
    <div class="cert-footer">
      <!-- Left: Course Instructor -->
      <div class="signature-block">
        <div class="sig-handwritten">${escapeHtml(instructor)}</div>
        <div class="sig-line"></div>
        <div class="sig-name">${escapeHtml(instructor)}</div>
        <div class="sig-title">Course Instructor</div>
      </div>

      <!-- Center: Official Seal & ID (NO verify URL) -->
      <div class="seal-block">
        <div class="seal-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="7"></circle>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
          </svg>
        </div>
        <div class="cert-meta">Date: ${escapeHtml(issued)}</div>
        <div class="cert-id-tag">Certificate ID: ${escapeHtml(d.id)}</div>
      </div>

      <!-- Right: Owner / Director (Ram Subramaniyan) -->
      <div class="signature-block">
        <div class="sig-handwritten">${escapeHtml(ownerName)}</div>
        <div class="sig-line"></div>
        <div class="sig-name">${escapeHtml(ownerName)}</div>
        <div class="sig-title">Founder & Managing Director, iTech</div>
      </div>
    </div>
  </div>

  <script>
    setTimeout(function() {
      try { window.print(); } catch(e) {}
    }, 500);
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s || "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function openPrintableCertificate(d: CertPrintData) {
  const html = renderPrintableCertificate(d);
  const w = window.open("", "_blank");
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
  } else {
    // fallback: download as HTML file
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${d.id}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
