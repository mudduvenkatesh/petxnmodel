"use strict";

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle,
  VerticalAlign, LevelFormat, convertInchesToTwip,
} = require("/sessions/inspiring-charming-pasteur/mnt/outputs/node_modules/docx");

const fs = require("fs");
const OUT = "/sessions/inspiring-charming-pasteur/mnt/outputs/golden_record_playbook.docx";

// ── Constants ─────────────────────────────────────────────────────────────────
const pt   = (n) => n * 2;
const twip = convertInchesToTwip;

const PAGE_W  = 12240;
const PAGE_H  = 15840;
const MARGIN  = twip(1.0);               // 1" margins
const CONTENT = PAGE_W - 2 * MARGIN;    // 10080 DXA

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  black:    "111827",
  dark:     "1F2937",
  mid:      "6B7280",
  border:   "E5E7EB",
  hdrBg:    "1E293B",
  hdrText:  "FFFFFF",
  // rule-type colours
  green:    "166534",  greenBg:  "DCFCE7",
  blue:     "1D4ED8",  blueBg:   "DBEAFE",
  purple:   "5B21B6",  purpleBg: "EDE9FE",
  amber:    "92400E",  amberBg:  "FEF3C7",
  red:      "991B1B",  redBg:    "FEE2E2",
  // coverage tiers
  native:   "166534",  nativeBg: "DCFCE7",
  partial:  "1D4ED8",  partialBg:"DBEAFE",
  custom:   "92400E",  customBg: "FEF3C7",
  app:      "991B1B",  appBg:    "FEE2E2",
  white:    "FFFFFF",
};

// ── Utility paragraphs ────────────────────────────────────────────────────────
function spacer() {
  return new Paragraph({ text: "", spacing: { before: 0, after: 60 } });
}

function pageBreak() {
  return new Paragraph({ pageBreakBefore: true, text: "" });
}

function hrule() {
  return new Paragraph({
    text: "",
    spacing: { before: 80, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border } },
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: pt(15), color: C.dark, font: "Calibri" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 80 },
    children: [new TextRun({ text, bold: true, size: pt(12.5), color: C.dark, font: "Calibri" })],
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, bold: true, size: pt(11), color: C.dark, font: "Calibri" })],
  });
}

function body(text, { before = 0, after = 80, italic = false } = {}) {
  return new Paragraph({
    spacing: { before, after },
    children: [new TextRun({ text, size: pt(11), color: C.dark, italics: italic, font: "Calibri" })],
  });
}

function callout(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: twip(0.25) },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: C.blue } },
    children: [new TextRun({ text, size: pt(10), color: C.mid, italics: true, font: "Calibri" })],
  });
}

function label(text) {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, bold: true, size: pt(9), color: C.mid, allCaps: true, font: "Calibri" })],
  });
}

// ── Table helpers ─────────────────────────────────────────────────────────────
function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
}
function thinBorder() {
  return { style: BorderStyle.SINGLE, size: 1, color: C.border };
}

function tcell(text, w, opts = {}) {
  const {
    bold = false, italic = false, color = C.dark, bg = "FFFFFF",
    align = AlignmentType.LEFT, vAlign = VerticalAlign.TOP,
    size = pt(10.5), note = null, mono = false,
  } = opts;
  const runs = [
    new TextRun({ text, bold, italics: italic, size, color, font: mono ? "Courier New" : "Calibri" }),
  ];
  if (note) {
    runs.push(new TextRun({ break: 1 }));
    runs.push(new TextRun({ text: note, size: pt(9.5), color: C.mid, font: "Calibri" }));
  }
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    verticalAlign: vAlign,
    shading: { type: ShadingType.CLEAR, fill: bg },
    borders: {
      top: thinBorder(), bottom: thinBorder(),
      left: noBorder(), right: noBorder(),
    },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ alignment: align, spacing: { before: 0, after: 0 }, children: runs })],
  });
}

function tPhaseHdr(label, cols) {
  const totalW = cols.reduce((a, b) => a + b, 0);
  return new TableRow({
    children: [new TableCell({
      columnSpan: cols.length,
      width: { size: totalW, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: C.hdrBg },
      borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: label, bold: true, size: pt(10), color: C.hdrText, allCaps: true, font: "Calibri" })],
      })],
    })],
  });
}

function tHdrRow(headers, widths) {
  return new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: "334155" },
      borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: h, bold: true, size: pt(10), color: C.hdrText, font: "Calibri" })],
      })],
    })),
  });
}

function tRow(cells) {
  // cells = array of { text, w, opts }
  return new TableRow({
    children: cells.map(c => tcell(c.text, c.w, c.opts || {})),
  });
}

function makeTable(headers, widths, rows) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    spacing: { before: 80, after: 120 },
    rows: [
      tHdrRow(headers, widths),
      ...rows,
    ],
  });
}

// Coverage tag helpers
function covTag(type) {
  const map = {
    native:  { text: "✓ Native",     bg: C.nativeBg,  color: C.native  },
    partial: { text: "~ Partial",    bg: C.partialBg, color: C.partial  },
    custom:  { text: "⚙ Custom",     bg: C.customBg,  color: C.custom  },
    app:     { text: "✗ App-layer",  bg: C.appBg,     color: C.app     },
  };
  return map[type] || { text: type, bg: "FFFFFF", color: C.dark };
}

function covCell(type, w) {
  const t = covTag(type);
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    shading: { type: ShadingType.CLEAR, fill: t.bg },
    borders: { top: thinBorder(), bottom: thinBorder(), left: noBorder(), right: noBorder() },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: t.text, bold: true, size: pt(10), color: t.color, font: "Calibri" })],
    })],
  });
}

// ── Assessment table builder (Rule | Desc | Mechanism | Coverage) ─────────────
const AC = { id: 700, desc: 2000, mech: 5480, cov: 1900 };  // sum = 10080

function asmtRow(id, desc, mech, cov, note = null) {
  return new TableRow({
    children: [
      tcell(id,   AC.id,   { bold: true, color: C.mid }),
      tcell(desc, AC.desc, {}),
      tcell(mech, AC.mech, { note }),
      covCell(cov, AC.cov),
    ],
  });
}

function asmtTable(rows) {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [AC.id, AC.desc, AC.mech, AC.cov],
    spacing: { before: 80, after: 120 },
    rows: [
      tHdrRow(["Rule", "Description", "Mechanism / Configuration Detail", "Coverage"], [AC.id, AC.desc, AC.mech, AC.cov]),
      ...rows,
    ],
  });
}

// ── Scorecard table ───────────────────────────────────────────────────────────
function scorecardTable(items) {
  // items = [{ count, label, bg, color }, ...]
  const w = Math.floor(CONTENT / items.length);
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: items.map(() => w),
    spacing: { before: 60, after: 140 },
    rows: [new TableRow({
      children: items.map(it => new TableCell({
        width: { size: w, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: it.bg },
        borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 20 },
            children: [new TextRun({ text: String(it.count), bold: true, size: pt(28), color: it.color, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [new TextRun({ text: it.label, size: pt(9.5), color: it.color, font: "Calibri" })],
          }),
        ],
      })),
    })],
  });
}

// ── Matching rules table (simple 4-col) ───────────────────────────────────────
const MC_W = [700, 1700, 3680, 2200, 1800];   // Rule | Field | Algo | Weight/notes | Confidence

// ══════════════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ══════════════════════════════════════════════════════════════════════════════

const children = [];
const push = (...items) => items.forEach(i => children.push(i));

// ─────────────────────────────────────────────────────────────────────────────
// COVER
// ─────────────────────────────────────────────────────────────────────────────
push(
  new Paragraph({
    spacing: { before: twip(1), after: 100 },
    children: [new TextRun({ text: "Business Team Golden Record", bold: true, size: pt(26), color: C.dark, font: "Calibri" })],
  }),
  new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: "Deduplication Playbook", size: pt(16), color: C.mid, font: "Calibri" })],
  }),
  new Paragraph({
    spacing: { before: 0, after: 400 },
    children: [new TextRun({ text: "PE Advisory & Wire-House Data Providers  ·  Broadridge · Discovery Data · Bloomberg", size: pt(11), color: C.mid, italics: true, font: "Calibri" })],
  }),
  hrule(),
  spacer(),
  body("This playbook defines the end-to-end pipeline for deduplicating business teams and their members received daily from multiple data providers, building a single authoritative Golden Record per team, and assessing which technology stack — Elasticsearch or Senzing — can natively handle each matching rule."),
  spacer(),
  body("The document is organized into four parts:"),
  body("  1.  Data architecture and test dataset"),
  body("  2.  Matching pipeline rules (normalization → deterministic → probabilistic → thresholds → member-level → negative blocking)"),
  body("  3.  Elasticsearch capability assessment"),
  body("  4.  Senzing capability assessment and implementation notes"),
);

// ─────────────────────────────────────────────────────────────────────────────
// PART 1 — DATA ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────
push(
  pageBreak(),
  h1("Part 1 — Data Architecture"),
  h2("1.1  Problem Statement"),
  body("PE advisory firms and wire-houses receive daily feeds from multiple third-party data providers, each describing the same financial advisory teams with slightly different names, addresses, member lists, and AUM figures. Without deduplication, the same team may appear dozens of times in operational systems under different identifiers, leading to duplicate outreach, inaccurate coverage maps, and data quality failures in downstream analytics."),
  body("The goal is to produce one canonical Golden Record per team, enriched from all sources, with a deterministic audit trail linking every source record to its Golden Record."),
  spacer(),

  h2("1.2  Data Sources"),
  makeTable(
    ["Source", "Coverage", "Identifier", "Strengths", "Known Issues"],
    [1100, 1000, 1100, 3000, 2880],
    [
      tRow([
        { text: "Broadridge",      w: 1100, opts: { bold: true } },
        { text: "~90%",            w: 1000 },
        { text: "CRD 92% present", w: 1100 },
        { text: "Best coverage, informal team names (e.g. 'Smith Wealth')", w: 3000 },
        { text: "OCR noise on scanned addresses; informal name abbreviations", w: 2880 },
      ]),
      tRow([
        { text: "Discovery Data",  w: 1100, opts: { bold: true } },
        { text: "~78%",            w: 1000 },
        { text: "CRD 60% present", w: 1100 },
        { text: "Strong phone and email coverage; mixed name formality", w: 3000 },
        { text: "CRD missing on ~40% of records; ZIP sometimes truncated", w: 2880 },
      ]),
      tRow([
        { text: "Bloomberg",       w: 1100, opts: { bold: true } },
        { text: "~64%",            w: 1000 },
        { text: "Bloomberg TID",   w: 1100 },
        { text: "Formal legal team names; reliable AUM figures", w: 3000 },
        { text: "AUM-biased sample (skews large teams); no CRD for most records", w: 2880 },
      ]),
    ]
  ),

  h2("1.3  Test Dataset Summary"),
  makeTable(
    ["Statistic", "Value"],
    [3500, 6580],
    [
      tRow([{ text: "Golden teams (ground truth)", w: 3500 }, { text: "5,000", w: 6580, opts: { bold: true } }]),
      tRow([{ text: "Total team records across 3 sources", w: 3500 }, { text: "~10,800 (avg 2.16 sources per team)", w: 6580 }]),
      tRow([{ text: "Team members (unique across all sources)", w: 3500 }, { text: "~20,283", w: 6580 }]),
      tRow([{ text: "Triple-source overlaps (same team in all 3 sources)", w: 3500 }, { text: "1,750 teams (35%)", w: 6580 }]),
      tRow([{ text: "Dual-source overlaps", w: 3500 }, { text: "2,452 teams (49%)", w: 6580 }]),
      tRow([{ text: "Single-source only", w: 3500 }, { text: "798 teams (16%)", w: 6580 }]),
      tRow([{ text: "Injected ghost / phantom members", w: 3500 }, { text: "507 (vendor anti-scraping artefacts)", w: 6580 }]),
      tRow([{ text: "Ground truth link tables", w: 3500 }, { text: "team_links.csv  +  member_links.csv", w: 6580 }]),
    ]
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// PART 2 — MATCHING PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
push(
  pageBreak(),
  h1("Part 2 — Matching Pipeline Rules"),
  body("Rules are applied in strict phase order. Phases 1–4 operate at the team level. Phase 5 operates at the member level (two passes). Phase 6 negative rules act as hard vetoes before any scoring."),
  spacer(),

  // ── Phase 1 ──
  h2("Phase 1 — Normalization"),
  body("All fields are standardized before any comparison. Normalization is idempotent — raw source values are always preserved separately."),
  spacer(),
  makeTable(
    ["Field", "Transformation", "Example"],
    [1400, 3800, 4880],
    [
      tRow([
        { text: "Names",      w: 1400, opts: { bold: true } },
        { text: "Lower-case, strip punctuation. Expand known aliases (Bill→William, Bob→Robert, Mike→Michael). Expand suffix abbreviations (Grp→Group, Mgmt→Management, Adv→Advisory, Priv→Private, Fin→Financial, Ptrs→Partners, Cap→Capital).", w: 3800 },
        { text: "\"Bill Smith's Wealth Mgmt Grp\"  →  \"william smith wealth management group\"", w: 4880, opts: { italic: true } },
      ]),
      tRow([
        { text: "Phone",      w: 1400, opts: { bold: true } },
        { text: "Strip all non-digits. Remove leading country code (+1). Discard extensions.", w: 3800 },
        { text: "\"(212) 555-1234 ext 99\"  →  \"2125551234\"", w: 4880, opts: { italic: true } },
      ]),
      tRow([
        { text: "Email",      w: 1400, opts: { bold: true } },
        { text: "Lower-case entire string.", w: 3800 },
        { text: "\"JSMITH@ML.COM\"  →  \"jsmith@ml.com\"", w: 4880, opts: { italic: true } },
      ]),
      tRow([
        { text: "ZIP code",   w: 1400, opts: { bold: true } },
        { text: "Keep first 5 digits only; discard ZIP+4 extension.", w: 3800 },
        { text: "\"10017-3456\"  →  \"10017\"", w: 4880, opts: { italic: true } },
      ]),
      tRow([
        { text: "CRD number", w: 1400, opts: { bold: true } },
        { text: "Strip leading zeros; store as string.", w: 3800 },
        { text: "\"0123456\"  →  \"123456\"", w: 4880, opts: { italic: true } },
      ]),
      tRow([
        { text: "AUM",        w: 1400, opts: { bold: true } },
        { text: "Convert to $M float. Bucket into $50M tiers for range comparisons.", w: 3800 },
        { text: "\"$1.2B\"  →  1200.0  (bucket: 1200)", w: 4880, opts: { italic: true } },
      ]),
      tRow([
        { text: "Firm name",  w: 1400, opts: { bold: true } },
        { text: "Remove generic stop-words: Financial, Services, Wealth, Management, Inc, LLC, Co, Corp, Group, Advisors.", w: 3800 },
        { text: "\"UBS Financial Services\"  →  \"ubs\"", w: 4880, opts: { italic: true } },
      ]),
    ]
  ),

  // ── Phase 2 ──
  h2("Phase 2 — Deterministic Rules"),
  body("Any single rule match auto-links the two records immediately. Probabilistic scoring is skipped."),
  spacer(),
  makeTable(
    ["Rule", "Field(s)", "Condition", "Confidence"],
    [700, 1800, 5080, 2500],
    [
      tRow([
        { text: "D-1", w: 700,  opts: { bold: true, color: C.green } },
        { text: "CRD number", w: 1800 },
        { text: "Exact match (normalized) AND firm canonical token matches", w: 5080 },
        { text: "100%", w: 2500, opts: { bold: true, color: C.green } },
      ]),
      tRow([
        { text: "D-2", w: 700,  opts: { bold: true, color: C.green } },
        { text: "Lead email", w: 1800 },
        { text: "Exact match (lower-cased)", w: 5080 },
        { text: "100%", w: 2500, opts: { bold: true, color: C.green } },
      ]),
      tRow([
        { text: "D-3", w: 700,  opts: { bold: true, color: C.green } },
        { text: "Lead phone", w: 1800 },
        { text: "Exact digits match AND ZIP prefix matches", w: 5080 },
        { text: "99%", w: 2500, opts: { bold: true, color: C.green } },
      ]),
      tRow([
        { text: "D-4", w: 700,  opts: { bold: true, color: C.green } },
        { text: "Vendor team ID", w: 1800 },
        { text: "Bloomberg TID, Broadridge Team ID, or Discovery ID — exact match", w: 5080 },
        { text: "100%", w: 2500, opts: { bold: true, color: C.green } },
      ]),
    ]
  ),

  // ── Phase 3 ──
  h2("Phase 3 — Probabilistic Scoring"),
  body("Applied to candidate pairs surfaced by the blocking step. Each field produces a score (0–1) multiplied by its weight and summed into a composite score. Weights are redistributed proportionally when a field is null in either record."),
  spacer(),
  makeTable(
    ["Rule", "Field", "Algorithm", "Weight", "Notes"],
    [700, 1400, 2000, 800, 5180],
    [
      tRow([
        { text: "P-1", w: 700,  opts: { bold: true, color: C.blue } },
        { text: "Team name",       w: 1400 },
        { text: "Jaro-Winkler",    w: 2000, opts: { mono: true } },
        { text: "0.25",            w: 800,  opts: { bold: true } },
        { text: "After suffix normalization. Prefix-weighted — catches 'The Smith Group' vs 'Smith Group'.", w: 5180 },
      ]),
      tRow([
        { text: "P-2", w: 700,  opts: { bold: true, color: C.blue } },
        { text: "Lead last name",  w: 1400 },
        { text: "Levenshtein ≤ 2", w: 2000, opts: { mono: true } },
        { text: "0.20",            w: 800,  opts: { bold: true } },
        { text: "Soundex fallback for OCR-corrupted names.", w: 5180 },
      ]),
      tRow([
        { text: "P-3", w: 700,  opts: { bold: true, color: C.blue } },
        { text: "Lead first name", w: 1400 },
        { text: "Alias lookup → exact", w: 2000, opts: { mono: true } },
        { text: "0.10",            w: 800,  opts: { bold: true } },
        { text: "Bill=William, Bob=Robert, Mike=Michael, Jim=James, etc.", w: 5180 },
      ]),
      tRow([
        { text: "P-4", w: 700,  opts: { bold: true, color: C.blue } },
        { text: "Firm name",       w: 1400 },
        { text: "Token set ratio", w: 2000, opts: { mono: true } },
        { text: "0.20",            w: 800,  opts: { bold: true } },
        { text: "Compares canonical firm tokens after generic stop-word removal.", w: 5180 },
      ]),
      tRow([
        { text: "P-5", w: 700,  opts: { bold: true, color: C.blue } },
        { text: "ZIP code",        w: 1400 },
        { text: "Exact (5-digit)", w: 2000, opts: { mono: true } },
        { text: "0.10",            w: 800,  opts: { bold: true } },
        { text: "Partial ZIP (first 3 digits only) = 0.5 score.", w: 5180 },
      ]),
      tRow([
        { text: "P-6", w: 700,  opts: { bold: true, color: C.blue } },
        { text: "AUM",             w: 1400 },
        { text: "|A−B| / max(A,B)", w: 2000, opts: { mono: true } },
        { text: "0.10",            w: 800,  opts: { bold: true } },
        { text: "≤10% diff = 1.0  ·  ≤25% = 0.5  ·  >25% = 0.0", w: 5180 },
      ]),
      tRow([
        { text: "P-7", w: 700,  opts: { bold: true, color: C.blue } },
        { text: "Member overlap",  w: 1400 },
        { text: "Jaccard similarity", w: 2000, opts: { mono: true } },
        { text: "0.05",            w: 800,  opts: { bold: true } },
        { text: "Tiebreaker only. Ghost/phantom members excluded from denominator. See Phase 5.", w: 5180 },
      ]),
    ]
  ),
  callout("Weights sum to 1.00. If a field is null in either record, its weight is redistributed proportionally among non-null fields so the composite score remains on a 0–1 scale."),

  // ── Phase 4 ──
  h2("Phase 4 — Decision Thresholds"),
  body("The composite probabilistic score determines the outcome for each candidate pair."),
  spacer(),
  makeTable(
    ["Score range", "Decision", "Action"],
    [1600, 2000, 6480],
    [
      tRow([
        { text: "≥ 0.90",      w: 1600, opts: { bold: true, color: C.green } },
        { text: "Auto-link",   w: 2000, opts: { bold: true, color: C.green } },
        { text: "Records are merged into the Golden Record immediately. No human review required.", w: 6480 },
      ]),
      tRow([
        { text: "0.70 – 0.89",    w: 1600, opts: { bold: true, color: C.amber } },
        { text: "Human review",   w: 2000, opts: { bold: true, color: C.amber } },
        { text: "Pair added to the review queue with field-level score breakdown. Reviewer confirms or rejects.", w: 6480 },
      ]),
      tRow([
        { text: "< 0.70",     w: 1600, opts: { bold: true, color: C.red } },
        { text: "Reject / new record", w: 2000, opts: { bold: true, color: C.red } },
        { text: "Records are treated as distinct entities. A new Golden Record is created if the incoming record has no match.", w: 6480 },
      ]),
    ]
  ),

  // ── Phase 5 ──
  h2("Phase 5 — Member-Level Matching"),
  body("Member matching runs in two passes to avoid the chicken-and-egg problem: team matching needs member overlap, but member overlap needs resolved team clusters."),
  spacer(),
  h3("Pass 1 — Pre-cluster members cross-source (before team matching)"),
  body("Match individual advisors across all sources independently of their team assignment. Stop at the first rule that fires."),
  spacer(),
  makeTable(
    ["Rule", "Field(s)", "Method", "Outcome"],
    [700, 1600, 2800, 5000],
    [
      tRow([
        { text: "M-1", w: 700,  opts: { bold: true, color: C.purple } },
        { text: "Email",              w: 1600 },
        { text: "Exact match (normalized)", w: 2800 },
        { text: "Auto-link",         w: 5000, opts: { bold: true, color: C.green } },
      ]),
      tRow([
        { text: "M-2", w: 700,  opts: { bold: true, color: C.purple } },
        { text: "Phone",              w: 1600 },
        { text: "Exact digits match", w: 2800 },
        { text: "Auto-link",         w: 5000, opts: { bold: true, color: C.green } },
      ]),
      tRow([
        { text: "M-3", w: 700,  opts: { bold: true, color: C.purple } },
        { text: "First + last name",  w: 1600 },
        { text: "Alias expand → Jaro-Winkler ≥ 0.88", w: 2800 },
        { text: "Auto-link",         w: 5000, opts: { bold: true, color: C.green } },
      ]),
      tRow([
        { text: "M-4", w: 700,  opts: { bold: true, color: C.purple } },
        { text: "Last name only",     w: 1600 },
        { text: "Exact + title match within same firm", w: 2800 },
        { text: "Review queue",      w: 5000, opts: { bold: true, color: C.amber } },
      ]),
      tRow([
        { text: "M-5", w: 700,  opts: { bold: true, color: C.purple } },
        { text: "No overlap",         w: 1600 },
        { text: "No counterpart found in any other source", w: 2800 },
        { text: "Flag as ghost — do not link", w: 5000, opts: { bold: true, color: C.red } },
      ]),
    ]
  ),

  h3("Pass 2 — Compute Jaccard overlap per candidate team pair"),
  body("After member pre-clustering, compute team-level member overlap using the corrected Jaccard formula that excludes ghost members:"),
  spacer(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    children: [new TextRun({
      text: "Jaccard  =  |matched members|  /  ( |A real| + |B real| − |matched members| )",
      bold: true, size: pt(11.5), color: C.dark, font: "Courier New",
    })],
  }),
  spacer(),
  body("A ghost member is any source member record with no pre-clustered counterpart in any other source. Including ghosts in the union inflates the denominator and artificially lowers Jaccard scores."),
  spacer(),
  makeTable(
    ["Matched / Total unique", "Jaccard", "Interpretation"],
    [2600, 1400, 6080],
    [
      tRow([{ text: "3 of 3", w: 2600 }, { text: "1.00", w: 1400, opts: { bold: true, color: C.green } }, { text: "Perfect overlap — very strong corroborating signal", w: 6080 }]),
      tRow([{ text: "3 of 4", w: 2600 }, { text: "0.75", w: 1400, opts: { bold: true, color: C.green } }, { text: "Strong — one source-only member (likely coverage gap)", w: 6080 }]),
      tRow([{ text: "3 of 5", w: 2600 }, { text: "0.60", w: 1400, opts: { bold: true, color: C.amber } }, { text: "Moderate — rely on name/firm scoring as primary signal", w: 6080 }]),
      tRow([{ text: "2 of 5", w: 2600 }, { text: "0.40", w: 1400, opts: { bold: true, color: C.amber } }, { text: "Weak tiebreaker — weight 0.05 applies", w: 6080 }]),
      tRow([{ text: "0 of any", w: 2600 }, { text: "0.00", w: 1400, opts: { bold: true, color: C.red  } }, { text: "No overlap — mild negative signal; reduces composite score slightly", w: 6080 }]),
    ]
  ),
  callout("Member overlap is a tiebreaker (weight 0.05), not a primary signal. Its most important role is as a blocking key: any two team records sharing at least one pre-clustered member are forced into the same candidate pair for scoring, regardless of name similarity."),

  // ── Phase 6 ──
  h2("Phase 6 — Negative / Blocking Rules"),
  body("These rules prevent incorrect links before scoring runs. A single match is a hard block — no composite score is computed for that pair."),
  spacer(),
  makeTable(
    ["Rule", "Condition"],
    [700, 9380],
    [
      tRow([{ text: "N-1", w: 700, opts: { bold: true, color: C.red } }, { text: "CRD numbers are both present but differ → hard block regardless of name similarity.", w: 9380 }]),
      tRow([{ text: "N-2", w: 700, opts: { bold: true, color: C.red } }, { text: "Firm names resolve to different firm families (e.g. Merrill Lynch vs. Morgan Stanley) → hard block.", w: 9380 }]),
      tRow([{ text: "N-3", w: 700, opts: { bold: true, color: C.red } }, { text: "ZIP codes differ by more than one USPS region AND AUM brackets differ by more than 25% → skip pair.", w: 9380 }]),
      tRow([{ text: "N-4", w: 700, opts: { bold: true, color: C.red } }, { text: "A source record ID is already linked to a different Golden Record → block duplicate link.", w: 9380 }]),
    ]
  ),

  // ── Survivorship ──
  h2("Survivorship Rules"),
  body("Once records are linked into a cluster, a single Golden Record is constructed field by field using the following rules."),
  spacer(),
  makeTable(
    ["Field", "Rule", "Source Priority / Rationale"],
    [1800, 2200, 6080],
    [
      tRow([{ text: "CRD / FINRA number", w: 1800, opts: { bold: true } }, { text: "Deterministic — exact match wins", w: 2200 }, { text: "Regulatory ID; highest trust. Conflicts flagged for human review.", w: 6080 }]),
      tRow([{ text: "Team name", w: 1800, opts: { bold: true } }, { text: "Most complete; source priority", w: 2200 }, { text: "Broadridge first, Bloomberg fallback. Longest non-abbreviated form preferred.", w: 6080 }]),
      tRow([{ text: "Firm name", w: 1800, opts: { bold: true } }, { text: "Source priority", w: 2200 }, { text: "Broadridge > Discovery Data > Bloomberg.", w: 6080 }]),
      tRow([{ text: "AUM", w: 1800, opts: { bold: true } }, { text: "Most recent non-null", w: 2200 }, { text: "Prefer file with latest as-of date. ±10% variance treated as same.", w: 6080 }]),
      tRow([{ text: "Lead email / phone", w: 1800, opts: { bold: true } }, { text: "Most recent; majority vote on conflict", w: 2200 }, { text: "Conflicts flagged for human review.", w: 6080 }]),
      tRow([{ text: "Address", w: 1800, opts: { bold: true } }, { text: "USPS-validated, most recent", w: 2200 }, { text: "Normalize format first (Ste vs Suite), then prefer freshest file date.", w: 6080 }]),
      tRow([{ text: "Team members", w: 1800, opts: { bold: true } }, { text: "Union across all sources (ghosts excluded)", w: 2200 }, { text: "Any source that sees a real member includes them in the Golden Record.", w: 6080 }]),
      tRow([{ text: "Member title", w: 1800, opts: { bold: true } }, { text: "Source priority on non-null", w: 2200 }, { text: "Broadridge preferred; Bloomberg fallback.", w: 6080 }]),
    ]
  ),

  // ── Evaluation ──
  h2("Evaluation Metrics"),
  body("Use the ground truth link tables (team_links.csv, member_links.csv) generated from the 5,000-team test dataset to measure pipeline performance."),
  spacer(),
  makeTable(
    ["Metric", "Formula", "Target"],
    [1800, 4200, 4080],
    [
      tRow([{ text: "Precision",      w: 1800, opts: { bold: true } }, { text: "Correctly linked pairs / all linked pairs", w: 4200 }, { text: "≥ 95%", w: 4080, opts: { bold: true, color: C.green } }]),
      tRow([{ text: "Recall",         w: 1800, opts: { bold: true } }, { text: "Correctly linked pairs / all true pairs in ground truth", w: 4200 }, { text: "≥ 90%", w: 4080, opts: { bold: true, color: C.green } }]),
      tRow([{ text: "F1 score",       w: 1800, opts: { bold: true } }, { text: "2 × Precision × Recall / (Precision + Recall)", w: 4200 }, { text: "≥ 92%", w: 4080, opts: { bold: true, color: C.green } }]),
      tRow([{ text: "Ghost FP rate",  w: 1800, opts: { bold: true } }, { text: "Ghost members incorrectly linked / total ghost members", w: 4200 }, { text: "≤ 2%", w: 4080, opts: { bold: true, color: C.green } }]),
    ]
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// PART 3 — ELASTICSEARCH ASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────
push(
  pageBreak(),
  h1("Part 3 — Elasticsearch Capability Assessment"),
  body("This section maps each matching rule to Elasticsearch's native capabilities. ES is assessed as a blocking/candidate-generation and scoring engine, not as an entity-resolution system — the final merge and survivorship logic lives in the application layer."),
  spacer(),

  label("Summary Scorecard — Elasticsearch"),
  scorecardTable([
    { count: 12, label: "Native ES queries / analyzers", bg: C.nativeBg, color: C.native  },
    { count: 4,  label: "Painless script required",      bg: C.partialBg, color: C.partial },
    { count: 2,  label: "App-layer only",                bg: C.appBg,    color: C.app    },
    { count: 1,  label: "Plugin required",               bg: C.customBg, color: C.custom  },
  ]),

  asmtTable([
    tPhaseHdr("Phase 2 — Deterministic Rules (D-1 → D-4)", [AC.id, AC.desc, AC.mech, AC.cov]),

    asmtRow("D-1", "Exact CRD match",
      "Index CRD as a keyword field. Term query in a bool/filter clause for zero-score exact match. Add firm token as a second filter clause.",
      "native",
      "Config: crd_number: { type: 'keyword' }. Query: bool { filter: [{ term: { crd_number: val } }, { term: { firm_token: val } }] }"),

    asmtRow("D-2", "Exact email match",
      "Index email as keyword (lower-cased via lowercase token filter in the normalizer). Term query returns exact match.",
      "native",
      "Normalizer: { type: 'custom', filter: ['lowercase'] }. Query: term { email: val }"),

    asmtRow("D-3", "Exact phone match",
      "Index phone as keyword after stripping all non-digits at ingest (Ingest Pipeline with gsub processor). Term query + ZIP term filter.",
      "native",
      "Ingest pipeline: gsub processor on phone field. Query: bool { filter: [{ term: { phone: val } }, { term: { zip: val[:3] } }] }"),

    asmtRow("D-4", "Vendor cross-IDs",
      "Index bloomberg_tid, broadridge_id, discovery_id as keyword fields. Term queries across all three in a bool/should clause.",
      "native",
      "Query: bool { should: [{ term: { bloomberg_tid: val } }, ...], minimum_should_match: 1 }"),

    tPhaseHdr("Phase 3 — Probabilistic Scoring (P-1 → P-7)", [AC.id, AC.desc, AC.mech, AC.cov]),

    asmtRow("P-1", "Team name similarity (Jaro-Winkler)",
      "Fuzzy match query for approximate string similarity. Synonym filter for PE/wire-house abbreviations (Mgmt↔Management, Ptrs↔Partners, Cap↔Capital). Token set ratio via Painless script in function_score.",
      "partial",
      "Synonym filter in the analyzer config handles abbreviation expansion. Jaro-Winkler itself requires a Painless script in a script_score query. ES fuzzy query is edit-distance based (Levenshtein), not Jaro-Winkler natively."),

    asmtRow("P-2", "Manager name similarity",
      "Phonetic plugin (analysis-phonetic) generates Soundex/Double Metaphone tokens for fuzzy name blocking. Fuzzy match query on normalized name field for Levenshtein ≤ 2.",
      "plugin",
      "Requires the elasticsearch-analysis-phonetic plugin. Config: { type: 'phonetic', encoder: 'double_metaphone' }. Fine-grained Jaro-Winkler scoring still needs a Painless script."),

    asmtRow("P-3", "Address / ZIP similarity",
      "ZIP indexed as keyword; term query for exact match, prefix query for first-3-digit partial. Address indexed with standard analyzer; match query with fuzziness:AUTO for street-level comparison.",
      "native",
      "Query: { bool: { should: [{ term: { zip: val } }, { prefix: { zip: val[:3] } }] } }. Address: { match: { address: { query: val, fuzziness: 'AUTO' } } }"),

    asmtRow("P-4", "Email domain match",
      "Extract domain at ingest using a Grok or Script processor in an Ingest Pipeline. Index as a separate keyword sub-field. Term query on domain for candidate generation.",
      "native",
      "Ingest pipeline: script processor — ctx.email_domain = ctx.email?.split('@')[1]. Query: term { email_domain: domain_val }"),

    asmtRow("P-5", "Firm family grouping",
      "Synonym token filter canonicalizes firm variants ('Merrill Lynch', 'ML' → 'merrill'). Match query on normalized firm field groups candidates by family.",
      "native",
      "Synonym filter entry example: 'merrill lynch, ml, merrill => merrill'. Applied at index time so queries against 'ML' match 'Merrill Lynch' records."),

    asmtRow("P-6", "AUM range scoring (± 20%)",
      "AUM indexed as float. Range query for candidate filtering (±25% band). Painless script in function_score computes |A−B| / max(A,B) and maps to 0–1 weight.",
      "partial",
      "Candidate filter: range { aum: { gte: val*0.75, lte: val*1.25 } }. Scoring script: Math.max(0, 1 - Math.abs(doc['aum'].value - params.aum) / Math.max(doc['aum'].value, params.aum))"),

    asmtRow("P-7", "Member set Jaccard overlap",
      "ES has no native cross-document set-overlap aggregation. Jaccard must be computed in the application layer: retrieve pre-clustered member IDs for each team candidate pair and compute the ratio externally.",
      "app",
      "Workaround: store member_ids as a keyword array. Use terms aggregation to find shared members, then compute Jaccard in app code. Full nested-doc scripting for Jaccard is too expensive in ES at scale."),

    tPhaseHdr("Phase 4 — Decision Thresholds", [AC.id, AC.desc, AC.mech, AC.cov]),

    asmtRow("THR", "Auto-link ≥ 0.90  /  Review 0.70–0.89  /  Reject < 0.70",
      "ES function_score query accumulates weighted field scores. min_score parameter filters out pairs below the reject threshold. The application layer reads the _score and routes to auto-link or review queue.",
      "native",
      "Query: function_score { query: {...}, functions: [{weight: 0.25, filter: {match: {team_name: val}}}, ...], min_score: 70 }. App-layer bins _score ≥ 90 → auto-link, 70–89 → review."),

    tPhaseHdr("Phase 5 — Member-Level Rules (M-1 → M-5)", [AC.id, AC.desc, AC.mech, AC.cov]),

    asmtRow("M-1", "Member email dedup",
      "Same as D-2 applied to a members index. Term query on normalized email keyword field.",
      "native", null),

    asmtRow("M-2", "Member phone dedup",
      "Same as D-3 applied to members index.",
      "native", null),

    asmtRow("M-3", "Member name fuzzy match",
      "Fuzzy match + phonetic plugin on members index. Same approach as P-2.",
      "partial",
      "Phonetic plugin required for Soundex blocking. Jaro-Winkler ≥ 0.88 threshold implemented via Painless script in script_score."),

    asmtRow("M-4 / M-5", "Ghost / phantom detection",
      "No native ghost detection in ES. Application layer must flag member records with no cross-source match after the clustering pass.",
      "app",
      "Approach: after cross-source member clustering, any member ID that appears in only one source and has no match cluster is flagged IS_GHOST=true in the member document via an update call."),

    tPhaseHdr("Phase 6 — Negative / Block Rules (N-1 → N-4)", [AC.id, AC.desc, AC.mech, AC.cov]),

    asmtRow("N-1", "CRD mismatch → hard block",
      "bool/must_not clause excludes any candidate whose crd_number is non-null and differs from the query record's CRD.",
      "native",
      "Query: bool { must_not: [{ bool: { must: [{ exists: { field: 'crd_number' } }, { term: { crd_number: different_val } }] } }] }"),

    asmtRow("N-2", "Firm family mismatch → block",
      "Synonym filter canonicalizes firm names. must_not clause on canonicalized firm_token field blocks cross-family candidates.",
      "native", null),

    asmtRow("N-3", "ZIP + AUM combined block",
      "Range query excludes ZIP-region mismatches; script_score returns 0 when AUM ratio > 1.25. Combined in bool/must_not or via min_score.",
      "native", null),

    asmtRow("N-4", "Already-linked records → no re-link",
      "Store linked_golden_id as a keyword field. must_not { term { linked_golden_id: existing_id } } prevents re-linking a record that already belongs to a different Golden Record.",
      "native", null),
  ]),
);

// ─────────────────────────────────────────────────────────────────────────────
// PART 4 — SENZING ASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────
push(
  pageBreak(),
  h1("Part 4 — Senzing Capability Assessment"),
  body("Senzing is assessed as a principle-based entity resolution engine (v3/v4). Unlike Elasticsearch, Senzing operates as a complete ER system — it handles blocking, comparison, and entity-graph management natively. Configuration is done primarily through g2config.json."),
  spacer(),

  label("Summary Scorecard — Senzing"),
  scorecardTable([
    { count: 10, label: "Native via g2config.json", bg: C.nativeBg,  color: C.native  },
    { count: 4,  label: "Partial / custom feature",  bg: C.partialBg, color: C.partial },
    { count: 3,  label: "Custom comparator plugin",  bg: C.customBg,  color: C.custom  },
    { count: 2,  label: "App-layer only",             bg: C.appBg,    color: C.app     },
  ]),

  asmtTable([
    tPhaseHdr("Phase 2 — Deterministic Rules (D-1 → D-4)", [AC.id, AC.desc, AC.mech, AC.cov]),

    asmtRow("D-1", "Exact CRD match",
      "Map CRD as a custom IDENTIFIER feature type (CRD_NUMBER) with EXCLUSIVE behavior (F1E). Senzing auto-links on matching exclusive IDs and hard-blocks when they differ.",
      "native",
      "Config: add feature type CRD_NUMBER, behavior F1E (frequency-1, exclusive), register under org/person entity type in g2config.json."),

    asmtRow("D-2", "Exact email match",
      "EMAIL_ADDRESS is a built-in Senzing feature with domain + local-part normalization. EXCLUSIVE behavior breaks on mismatch.",
      "native",
      "Zero config beyond mapping the source field name to the EMAIL_ADDRESS element in the data mapping JSON."),

    asmtRow("D-3", "Exact phone match",
      "PHONE_NUMBER is a built-in feature with full normalization (strips +1, dashes, parentheses). Toll-free generic numbers auto-suppressed.",
      "native",
      "Map source field to PHONE_NUMBER. Senzing's generic-value suppressor ignores numbers shared by hundreds of entities."),

    asmtRow("D-4", "Vendor cross-IDs",
      "Add two custom IDENTIFIER feature types: BLOOMBERG_TID and DISCOVERY_ID with EXCLUSIVE behavior. Exact cross-source ID match = resolution; mismatch = hard block.",
      "native",
      "Add feature definitions to g2config.json. No scoring logic needed — identifier match triggers resolution automatically."),

    tPhaseHdr("Phase 3 — Probabilistic Scoring (P-1 → P-7)", [AC.id, AC.desc, AC.mech, AC.cov]),

    asmtRow("P-1", "Team name similarity",
      "Maps to NAME_ORG feature. Senzing's org-name comparator natively handles abbreviations (Mgmt ↔ Management), ampersand forms, and common entity suffixes (LLC, LP).",
      "partial",
      "Partial gap: PE/wire-house financial shorthand ('Capital' ↔ 'Cap', 'Partners' ↔ 'Ptrs') must be added to the org-name comparator nickname table in g2config.json."),

    asmtRow("P-2", "Manager name similarity",
      "Maps to NAME_FULL / NAME_FIRST + NAME_LAST. World-class name comparator handles nicknames (Rob/Robert), phonetic variants, initials, and transpositions out of the box.",
      "native",
      "Finance-specific informal aliases ('Skip', 'Chip') can be added to the built-in nickname table in cfg_fnrec / cfg_lnrec."),

    asmtRow("P-3", "Address / ZIP similarity",
      "Maps to ADDR_FULL. Senzing address comparator normalizes suite/floor variations, directionals, abbreviations (St/Street), and scores same-building vs. same-city vs. same-ZIP.",
      "native",
      "ZIP-5 and ZIP-4 blocking keys are automatically generated for candidate selection — no extra config required."),

    asmtRow("P-4", "Email domain match",
      "Partially derivable from the EMAIL feature (Senzing assigns 'close' when domains match but locals differ). Explicit domain-only blocking requires a computed EMAIL_DOMAIN feature.",
      "partial",
      "Add a computed feature EMAIL_DOMAIN extracted from EMAIL using a Senzing expression feature (cfb_ftype entry in g2config.json)."),

    asmtRow("P-5", "Firm family grouping",
      "No built-in hierarchical org concept. Model the parent firm as a separate entity; link team records to it via DISCLOSED_RELATIONSHIP.",
      "partial",
      "Requires loading parent-firm entities as first-class records. DISCLOSED_RELATIONSHIP contributes 'possibly related' evidence but does not drive hard resolution/blocking by itself."),

    asmtRow("P-6", "AUM range scoring (± 20%)",
      "No native numeric-range comparator. Requires a custom comparator plugin (Python or Java) that computes |A−B| / max(A,B) and maps the ratio to Senzing score categories (same / close / likely / plausible / not_the_same).",
      "custom",
      "v4 embedding model replacement does not help here — AUM is a numeric domain, not semantic. One custom comparator plugin handles both P-6 (soft scoring) and N-4 (hard block) at different ratio thresholds."),

    asmtRow("P-7", "Member set Jaccard overlap",
      "Senzing resolves members as separate PERSON entities and links them to team ORG entities via DISCLOSED_RELATIONSHIP, but has no native concept of '% of member sets that overlap across two org candidates.'",
      "app",
      "Compute externally: query resolved member clusters per team candidate pair from the Senzing entity graph, compute Jaccard, pass back as a synthetic feature on re-ingested team record or use as a post-resolution tiebreaker."),

    tPhaseHdr("Decision Thresholds", [AC.id, AC.desc, AC.mech, AC.cov]),

    asmtRow("THR", "Auto-link ≥ 0.90  /  Review 0.70–0.89  /  Reject < 0.70",
      "Senzing uses categorical principle-based decisions (RESOLVED / POSSIBLY_SAME / POSSIBLY_RELATED / NOT_SAME), not a continuous 0–1 score. Map your threshold bands to these categories.",
      "partial",
      "Threshold tuning is done by adjusting which principles fire and what feature scores they require — not by changing numeric cutoffs. RESOLVED ≈ auto-link; POSSIBLY_SAME ≈ review; NOT_SAME ≈ reject."),

    tPhaseHdr("Phase 5 — Member-Level Rules (M-1 → M-5)", [AC.id, AC.desc, AC.mech, AC.cov]),

    asmtRow("M-1 / M-2", "Member name + email / phone dedup",
      "Members loaded as PERSON entity type. Name + email + phone resolution uses the same built-in comparators as team records. Member CRD maps to CRD_NUMBER identifier.",
      "native",
      "Same pipeline and config as team records, different entity type. No additional rules required."),

    asmtRow("M-3", "Ghost / phantom member detection",
      "Senzing's generic-value suppression handles high-frequency noise identifiers, but deliberately injected phantom members require upstream source-flagging — Senzing has no automated ghost detection.",
      "app",
      "Flag IS_GHOST=Y in source mapping. Load ghost records into a separate data source excluded from cross-source resolution, or strip them pre-ingest."),

    asmtRow("M-4", "Team ↔ member relationship linking",
      "DISCLOSED_RELATIONSHIP is the native construct. Load each membership as a relationship record linking the PERSON entity to its ORG team entity.",
      "native",
      "Senzing propagates relationship awareness: two team records sharing multiple resolved members surface as 'possibly related' in the entity graph."),

    asmtRow("M-5", "Two-pass member-first clustering",
      "Senzing naturally resolves PERSON entities independently as they are ingested. Team ORG resolution in pass 2 can reference already-resolved member entities. Ordering is controlled by load sequence.",
      "native",
      "Load all member records first, then team records. Senzing's real-time entity-centric learning loop handles incremental reevaluation automatically."),

    tPhaseHdr("Phase 6 — Negative / Block Rules (N-1 → N-4)", [AC.id, AC.desc, AC.mech, AC.cov]),

    asmtRow("N-1", "CRD mismatch → hard block",
      "EXCLUSIVE behavior on CRD_NUMBER does exactly this. Records with different non-null CRD values are never resolved (POSSIBLY_RELATED at most). This is the canonical use case for EXCLUSIVE identifiers in Senzing.",
      "native", null),

    asmtRow("N-2", "Firm family mismatch → block",
      "Add custom feature FIRM_FAMILY (normalized parent-firm token: 'FIDELITY', 'VANGUARD') with EXCLUSIVE behavior. Records with differing non-null tokens will not resolve.",
      "custom",
      "Requires normalizing firm-family names to a canonical token upstream before load. Add FIRM_FAMILY as an exclusive identifier feature type in g2config.json."),

    asmtRow("N-3", "Already-linked records → no re-link",
      "Senzing's entity-centric model prevents this structurally. Once two records belong to the same entity, contradictory new evidence triggers a SPLIT event — there is no re-link operation.",
      "native",
      "No configuration needed. Core property of the Senzing entity-centric graph architecture."),

    asmtRow("N-4", "AUM order-of-magnitude mismatch → block",
      "Reuses the custom AUM comparator from P-6. Configure it to return NOT_THE_SAME when the ratio exceeds a threshold (e.g. > 5×), then add a principle treating AUM NOT_THE_SAME as a hard veto.",
      "custom",
      "One comparator plugin handles both soft scoring (P-6) and hard block (N-4) by varying the score category returned at different ratio thresholds."),
  ]),

  spacer(),
  h2("Senzing Implementation Notes"),
  body("1.  Load order matters. Load all PERSON (member) records before loading ORG (team) records. Senzing resolves members independently in pass 1; team resolution in pass 2 can reference already-resolved member entities.", { after: 80 }),
  body("2.  AUM custom comparator. A single Python/Java plugin (~100 lines) handles both P-6 (soft scoring) and N-4 (hard block) by returning different Senzing score categories at different ratio thresholds. Register it in g2config.json as a custom comparator for the AUM feature type.", { after: 80 }),
  body("3.  Jaccard overlap (P-7). After Senzing resolves member entities, query the entity graph for member clusters per team candidate pair. Compute Jaccard externally and either: (a) persist it as a synthetic TEAM_OVERLAP_SCORE feature on a re-ingested team record, or (b) use it as a post-resolution confidence score to gate human review.", { after: 80 }),
  body("4.  Ghost members (M-3). The simplest approach: load ghost records into a separate Senzing data source that is excluded from cross-source resolution rules.", { after: 80 }),
  body("5.  Firm-family blocking (N-2). Normalize parent firm names to canonical tokens upstream (e.g. 'Fidelity Investments', 'FMR LLC' → 'FIDELITY'). Add FIRM_FAMILY as an EXCLUSIVE identifier feature in g2config.json.", { after: 80 }),
  body("6.  Financial nickname table (P-1). Extend the NAME_ORG comparator configuration with PE/wire-house shorthand: Capital ↔ Cap, Partners ↔ Ptrs, Management ↔ Mgmt, Advisors ↔ Adv, Asset Management ↔ Asset Mgmt.", { after: 80 }),
);

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────
push(
  spacer(),
  hrule(),
  new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 80, after: 0 },
    children: [new TextRun({
      text: `Apollo Advisors  ·  Golden Record Pipeline Playbook  ·  Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      size: pt(9), color: C.mid, italics: true, font: "Calibri",
    })],
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// PACK & WRITE
// ─────────────────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Apollo Advisors",
  title:   "Business Team Golden Record — Deduplication Playbook",
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log("Written:", OUT);
}).catch(err => { console.error(err.message); process.exit(1); });
