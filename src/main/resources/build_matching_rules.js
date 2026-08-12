const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle,
  VerticalAlign, PageNumber, NumberFormat, TableOfContents,
  convertInchesToTwip, LevelFormat, UnderlineType,
} = require("/sessions/inspiring-charming-pasteur/mnt/outputs/node_modules/docx");
const fs = require("fs");
const path = require("path");

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  black:      "1A1A1A",
  darkGray:   "3D3D3D",
  midGray:    "6B7280",
  lightGray:  "F3F4F6",
  border:     "D1D5DB",
  headerBg:   "1F2937",
  headerText: "FFFFFF",
  green:      "065F46",
  greenBg:    "D1FAE5",
  blue:       "1E40AF",
  blueBg:     "DBEAFE",
  purple:     "5B21B6",
  purpleBg:   "EDE9FE",
  amber:      "92400E",
  amberBg:    "FEF3C7",
  red:        "991B1B",
  redBg:      "FEE2E2",
  accent:     "1D4ED8",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const pt = (n) => n * 2;               // points → half-points
const twip = convertInchesToTwip;

function spacer(n = 1) {
  return Array.from({ length: n }, () =>
    new Paragraph({ text: "", spacing: { after: 0, before: 0 } })
  );
}

function rule() {
  return new Paragraph({
    text: "",
    spacing: { before: 80, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border } },
  });
}

function sectionHeading(text, phase) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
    children: [
      new TextRun({
        text: `Phase ${phase}  `,
        bold: true,
        size: pt(13),
        color: C.midGray,
      }),
      new TextRun({
        text,
        bold: true,
        size: pt(13),
        color: C.black,
      }),
    ],
  });
}

function subHeading(text) {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, bold: true, size: pt(11), color: C.darkGray })],
  });
}

function body(text, { before = 60, after = 60, italic = false } = {}) {
  return new Paragraph({
    spacing: { before, after },
    children: [new TextRun({ text, size: pt(10.5), color: C.darkGray, italics: italic })],
  });
}

function note(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: twip(0.25) },
    border: { left: { style: BorderStyle.SINGLE, size: 4, color: C.accent } },
    children: [new TextRun({ text, size: pt(10), color: C.midGray, italics: true })],
  });
}

// ── Table helpers ─────────────────────────────────────────────────────────────
function cell(text, {
  bold = false, bg = "FFFFFF", color = C.darkGray,
  width, align = AlignmentType.LEFT, vAlign = VerticalAlign.CENTER,
  size = pt(10), mono = false,
} = {}) {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill: bg },
    verticalAlign: vAlign,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text,
            bold,
            size,
            color,
            font: mono ? "Courier New" : undefined,
          }),
        ],
      }),
    ],
  });
}

function headerRow(labels, widths) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((lbl, i) =>
      cell(lbl, {
        bold: true,
        bg: C.headerBg,
        color: C.headerText,
        width: widths[i],
        size: pt(9.5),
      })
    ),
  });
}

function dataRow(values, widths, opts = []) {
  return new TableRow({
    children: values.map((v, i) =>
      cell(v, { width: widths[i], ...(opts[i] || {}) })
    ),
  });
}

function makeTable(headers, widths, rows, rowOpts = []) {
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    spacing: { before: 80, after: 120 },
    rows: [
      headerRow(headers, widths),
      ...rows.map((r, i) => dataRow(r, widths, rowOpts[i] || [])),
    ],
  });
}

// ── Badge-style inline span (rendered as shaded cell text) ───────────────────
function badge(text, bg, color) {
  return new TextRun({ text: ` ${text} `, bold: true, size: pt(9), color, highlight: undefined });
}

// ── Document build ────────────────────────────────────────────────────────────
const SKILL_DIR = path.join(
  "C:/Users/vmuddu/AppData/Roaming/Claude/local-agent-mode-sessions",
  "skills-plugin/e2981295-2332-4792-8844-72557d005b7d",
  "37851889-0797-48b1-ac76-b8a6581b72b5/skills/docx"
);

const doc = new Document({
  creator: "Apollo Advisors",
  title:   "Business Team Golden Record — Matching Rules",
  description: "Entity resolution matching rules for deduplicating business teams across multiple data providers",
  numbering: {
    config: [
      {
        reference: "bullet-list",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: twip(0.35), hanging: twip(0.2) } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },   // US Letter
        margin: { top: twip(1), bottom: twip(1), left: twip(1.1), right: twip(1.1) },
      },
    },
    children: [

      // ── Cover / title ────────────────────────────────────────────────────
      new Paragraph({
        heading: HeadingLevel.TITLE,
        spacing: { before: twip(1.2), after: 120 },
        children: [
          new TextRun({
            text: "Business Team Golden Record",
            bold: true, size: pt(24), color: C.black,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({ text: "Matching & Deduplication Rules", size: pt(16), color: C.midGray }),
        ],
      }),
      new Paragraph({
        spacing: { before: 0, after: 400 },
        children: [
          new TextRun({ text: "PE Advisory & Wire-House Data Providers", size: pt(11), color: C.midGray, italics: true }),
        ],
      }),

      rule(),
      ...spacer(1),

      // ── Introduction ────────────────────────────────────────────────────
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: "Overview", bold: true, size: pt(14), color: C.black })],
      }),
      body(
        "This document defines the six-phase pipeline used to deduplicate business teams and their members " +
        "received daily from multiple data providers (Broadridge, Discovery Data, Bloomberg, and others), " +
        "and to construct a single authoritative Golden Record per team. " +
        "Rules are applied in order: normalization → deterministic linking → probabilistic scoring → " +
        "threshold decisions → member-level matching → negative blocking."
      ),
      ...spacer(1),

      // ── Phase 1: Normalization ───────────────────────────────────────────
      sectionHeading("Normalization", 1),
      body("All fields are standardized before any comparison. Normalization is idempotent and reversible — raw source values are always preserved separately."),
      ...spacer(1),

      makeTable(
        ["Field", "Transformation", "Example"],
        [1400, 3600, 2800],
        [
          ["Names",       "Lower-case, strip punctuation. Expand known aliases (Bill→William, Bob→Robert, Mike→Michael). Expand suffix abbreviations (Grp→Group, Mgmt→Management, Adv→Advisory, Priv→Private, Fin→Financial).", "\"Bill Smith's Wealth Mgmt Grp\" → \"william smith wealth management group\""],
          ["Phone",       "Strip all non-digits. Remove leading country code (+1).",                        "\"(212) 555-1234\" → \"2125551234\""],
          ["Email",       "Lower-case entire string.",                                                      "\"JSMITH@ML.COM\" → \"jsmith@ml.com\""],
          ["ZIP code",    "Keep first 5 digits only; discard +4 extension.",                                "\"10017-3456\" → \"10017\""],
          ["CRD number",  "Strip leading zeros; store as string.",                                          "\"0123456\" → \"123456\""],
          ["AUM",         "Convert to $M float. Bucket into $50M tiers for range comparisons.",            "\"$1.2B\" → 1200.0"],
          ["Firm name",   "Remove generic tokens: Financial, Services, Wealth, Management, Inc, LLC, Co.", "\"UBS Financial Services\" → \"ubs\""],
        ]
      ),

      // ── Phase 2: Deterministic ───────────────────────────────────────────
      sectionHeading("Deterministic Rules", 2),
      body("Any single rule match auto-links the two records immediately. Probabilistic scoring is skipped."),
      ...spacer(1),

      makeTable(
        ["Rule", "Field(s)", "Condition", "Confidence"],
        [600, 1800, 3200, 1200],
        [
          ["D-1", "CRD number",                    "Exact match (normalized) AND firm token matches",               "100%"],
          ["D-2", "Lead email",                    "Exact match (lower-cased)",                                     "100%"],
          ["D-3", "Lead phone",                    "Exact match (digits only) AND ZIP prefix matches",              "99%"],
          ["D-4", "Vendor-assigned team ID",       "Bloomberg TID, Broadridge Team ID, or Discovery ID exact match","100%"],
        ],
        [
          [{ bold: true, color: C.green }, {}, {}, { bold: true, color: C.green }],
          [{ bold: true, color: C.green }, {}, {}, { bold: true, color: C.green }],
          [{ bold: true, color: C.green }, {}, {}, { bold: true, color: C.green }],
          [{ bold: true, color: C.green }, {}, {}, { bold: true, color: C.green }],
        ]
      ),

      // ── Phase 3: Probabilistic ───────────────────────────────────────────
      sectionHeading("Probabilistic Scoring", 3),
      body("Applied to candidate pairs surfaced by the blocking step. Each field produces a similarity score (0–1) that is multiplied by its weight and summed into a composite score."),
      ...spacer(1),

      makeTable(
        ["Rule", "Field", "Algorithm", "Weight", "Notes"],
        [600, 1400, 1800, 700, 2300],
        [
          ["P-1", "Team name",       "Jaro-Winkler",           "0.25", "After suffix normalization. Prefix-weighted — catches 'The Smith Group' vs 'Smith Group'."],
          ["P-2", "Lead last name",  "Levenshtein ≤ 2",        "0.20", "Soundex fallback for OCR-corrupted names."],
          ["P-3", "Lead first name", "Alias lookup → exact",   "0.10", "Bill=William, Bob=Robert, Mike=Michael, etc."],
          ["P-4", "Firm name",       "Token set ratio",        "0.20", "Compares canonical firm tokens after generic-word removal."],
          ["P-5", "ZIP code",        "Exact (5-digit)",        "0.10", "Partial ZIP (first 3 digits only) = 0.5 score."],
          ["P-6", "AUM",             "|ΔA − ΔB| / ΔA",        "0.10", "≤10% diff = 1.0 · ≤25% = 0.5 · >25% = 0."],
          ["P-7", "Member overlap",  "Jaccard similarity",     "0.05", "Tiebreaker only. Ghost/phantom members excluded. See Phase 5."],
        ]
      ),

      note("Weights sum to 1.00. If a field is null in either record, its weight is redistributed proportionally among non-null fields so the composite score remains on a 0–1 scale."),

      // ── Phase 4: Thresholds ──────────────────────────────────────────────
      sectionHeading("Decision Thresholds", 4),
      body("The composite probabilistic score determines the outcome for each candidate pair."),
      ...spacer(1),

      makeTable(
        ["Score range", "Decision", "Action"],
        [1600, 2000, 3200],
        [
          ["≥ 0.90", "Auto-link",        "Records are merged into the Golden Record immediately. No human review required."],
          ["0.70 – 0.89", "Human review", "Pair is added to the review queue with the top-scoring field breakdown displayed. A reviewer confirms or rejects."],
          ["< 0.70",  "Reject / new",    "Records are treated as distinct entities. A new Golden Record is created if the record has no existing match."],
        ],
        [
          [{ bold: true, color: C.green  }, { bold: true, color: C.green  }, {}],
          [{ bold: true, color: C.amber  }, { bold: true, color: C.amber  }, {}],
          [{ bold: true, color: C.red    }, { bold: true, color: C.red    }, {}],
        ]
      ),

      // ── Phase 5: Member-level ────────────────────────────────────────────
      sectionHeading("Member-Level Matching", 5),
      body(
        "Member matching runs in two passes to avoid the chicken-and-egg problem (you need team links to " +
        "match members, but member overlap helps match teams)."
      ),
      ...spacer(1),

      subHeading("Pass 1 — Pre-cluster members cross-source (before team matching)"),
      body("Match individual advisors across all sources independently of their team assignment, using the hierarchy below. Stop at the first hit."),
      ...spacer(1),

      makeTable(
        ["Rule", "Field(s)", "Method", "Outcome"],
        [600, 1600, 2200, 2400],
        [
          ["M-1", "Email",                  "Exact match (normalized)",                           "Auto-link"],
          ["M-2", "Phone",                  "Exact digits match",                                  "Auto-link"],
          ["M-3", "First + last name",      "Alias expand → Jaro-Winkler ≥ 0.88",                 "Auto-link"],
          ["M-4", "Last name only",         "Exact + title match within same firm",                "Review queue"],
          ["M-5", "No overlap on any field","Ghost candidate — no counterpart found",              "Flag as unmatched (do not link)"],
        ],
        [
          [{ bold: true, color: C.purple }, {}, {}, { bold: true, color: C.green }],
          [{ bold: true, color: C.purple }, {}, {}, { bold: true, color: C.green }],
          [{ bold: true, color: C.purple }, {}, {}, { bold: true, color: C.green }],
          [{ bold: true, color: C.purple }, {}, {}, { bold: true, color: C.amber }],
          [{ bold: true, color: C.purple }, {}, {}, { bold: true, color: C.red   }],
        ]
      ),

      subHeading("Pass 2 — Compute Jaccard overlap per candidate team pair"),
      body("After member pre-clustering, compute team-level member set overlap using the corrected Jaccard formula that excludes ghost members:"),
      ...spacer(1),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text: "Jaccard  =  |matched members|  /  (|A real| + |B real| − |matched members|)",
            bold: true, size: pt(11), color: C.black, font: "Courier New",
          }),
        ],
      }),

      ...spacer(1),
      body("A ghost member is any source member record with no pre-clustered counterpart in any other source. Including ghosts in the union inflates the denominator and artificially lowers scores."),
      ...spacer(1),

      makeTable(
        ["Matched / Total unique members", "Jaccard score", "Interpretation"],
        [2800, 1600, 2400],
        [
          ["3 of 3",  "1.00", "Perfect overlap — very strong corroborating signal"],
          ["3 of 4",  "0.75", "Strong — one source-only member (likely coverage gap)"],
          ["3 of 5",  "0.60", "Moderate — worth checking with other signals"],
          ["2 of 5",  "0.40", "Weak tiebreaker — rely primarily on name/firm scoring"],
          ["0 of any","0.00", "No overlap — negative signal; reduce composite score"],
        ],
        [
          [{}, { bold: true, color: C.green }, {}],
          [{}, { bold: true, color: C.green }, {}],
          [{}, { bold: true, color: C.amber }, {}],
          [{}, { bold: true, color: C.amber }, {}],
          [{}, { bold: true, color: C.red   }, {}],
        ]
      ),

      note(
        "Member overlap is a tiebreaker (weight 0.05), not a primary signal. " +
        "Its strongest role is as a blocking key: any two team records that share at least one " +
        "pre-clustered member are forced into the same candidate pair for scoring, regardless of name similarity."
      ),

      // ── Phase 6: Negative rules ──────────────────────────────────────────
      sectionHeading("Negative / Blocking Rules", 6),
      body("These rules prevent incorrect links before scoring runs. A single hit is a hard block — no composite score is computed."),
      ...spacer(1),

      makeTable(
        ["Rule", "Condition"],
        [700, 6100],
        [
          ["N-1", "CRD numbers are both present but differ → hard block regardless of name similarity."],
          ["N-2", "Firm names resolve to different firm families (e.g. Merrill Lynch vs. Morgan Stanley) → hard block."],
          ["N-3", "ZIP codes differ by more than one USPS region AND AUM brackets differ by more than 25% → skip pair."],
          ["N-4", "A source record ID is already linked to a different Golden Record → block duplicate link."],
        ],
        [
          [{ bold: true, color: C.red }, {}],
          [{ bold: true, color: C.red }, {}],
          [{ bold: true, color: C.red }, {}],
          [{ bold: true, color: C.red }, {}],
        ]
      ),

      // ── Survivorship ─────────────────────────────────────────────────────
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 80 },
        children: [new TextRun({ text: "Survivorship Rules", bold: true, size: pt(14), color: C.black })],
      }),
      body("Once records are linked into a cluster, a single Golden Record is constructed field by field using the following survivorship rules."),
      ...spacer(1),

      makeTable(
        ["Field", "Rule", "Source priority / rationale"],
        [1600, 2000, 3200],
        [
          ["CRD / FINRA number",   "Deterministic — exact match wins",                         "Regulatory ID; highest trust. Conflicts flagged for review."],
          ["Team name",            "Most complete value; source priority",                      "Broadridge first, Bloomberg fallback. Longest non-abbreviated form preferred."],
          ["Firm name",            "Source priority",                                           "Broadridge > Discovery > Bloomberg."],
          ["AUM",                  "Most recent non-null value",                                "Prefer file with latest as-of date. ±10% variance treated as same."],
          ["Lead email / phone",   "Most recent non-null; majority vote on conflict",           "Conflicts flagged for human review."],
          ["Address",              "USPS-validated, most recent",                               "Normalize format first (Ste vs Suite). Then prefer freshest file date."],
          ["Team members",         "Union across all sources (ghosts excluded)",                "Any source that sees a real member includes them in the Golden Record."],
          ["Member title",         "Source priority on non-null",                               "Broadridge preferred; Bloomberg fallback."],
        ]
      ),

      // ── Evaluation ───────────────────────────────────────────────────────
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 80 },
        children: [new TextRun({ text: "Evaluation Metrics", bold: true, size: pt(14), color: C.black })],
      }),
      body("Use the ground truth link tables generated from the test dataset to measure pipeline performance."),
      ...spacer(1),

      makeTable(
        ["Metric", "Formula", "Target"],
        [1400, 3400, 1800],
        [
          ["Precision", "Correctly linked pairs  /  all linked pairs",                "≥ 95%"],
          ["Recall",    "Correctly linked pairs  /  all true pairs in ground truth",  "≥ 90%"],
          ["F1 score",  "2 × Precision × Recall  /  (Precision + Recall)",            "≥ 92%"],
          ["Ghost FP rate", "Ghost members incorrectly linked  /  total ghost members","≤ 2%"],
        ]
      ),

      note(
        "The test dataset contains 5,000 golden teams across 3 sources with 1,750 triple-source overlaps, " +
        "2,452 dual-source overlaps, 748 single-source records, and 507 injected ghost members. " +
        "Triple-source pairs are the strongest positive test cases; ghost members test false-positive suppression."
      ),

      ...spacer(2),
      rule(),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 80, after: 0 },
        children: [
          new TextRun({
            text: `Apollo Advisors  ·  Golden Record Pipeline  ·  Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
            size: pt(9), color: C.midGray, italics: true,
          }),
        ],
      }),
    ],
  }],
});

const outPath = "/sessions/inspiring-charming-pasteur/mnt/outputs/matching_rules.docx";

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("Written:", outPath);
}).catch(console.error);
