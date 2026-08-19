"use strict";

// Try skill preinstalled docx first, fall back to outputs node_modules
let docx;
try {
  docx = require("docx");
} catch (e) {
  try {
    docx = require("/sessions/inspiring-charming-pasteur/mnt/.claude/skills/docx/node_modules/docx");
  } catch (e2) {
    docx = require("/sessions/inspiring-charming-pasteur/mnt/outputs/node_modules/docx");
  }
}

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle,
  VerticalAlign, TableBorders, PageOrientation
} = docx;

const fs = require("fs");
const outPath = "/sessions/inspiring-charming-pasteur/mnt/outputs/senzing_assessment.docx";

// ── helpers ─────────────────────────────────────────────────────────────────
const pt = (n) => n * 2;   // half-points
const DXA = (n) => n;      // already in DXA — just for clarity

// Page & margin constants (US Letter)
const PAGE_W   = 12240;
const PAGE_H   = 15840;
const MARGIN   = 1080;  // 0.75" margins
const CONTENT  = PAGE_W - 2 * MARGIN; // 10080 DXA

// Column widths for the main rules table (must sum to CONTENT)
const COL = {
  id:   DXA(700),
  desc: DXA(2100),
  mech: DXA(5380),
  cov:  DXA(1900),
};
// Total = 10080 ✓

// Colors
const C = {
  headerBg:  "1E293B",  // slate-800
  phaseBg:   "334155",  // slate-700
  phaseText: "FFFFFF",
  native:    "DCFCE7",  // green-100
  nativeT:   "166534",  // green-800
  partial:   "DBEAFE",  // blue-100
  partialT:  "1D4ED8",  // blue-700
  custom:    "FEF3C7",  // amber-100
  customT:   "92400E",  // amber-800
  appLayer:  "FEE2E2",  // red-100
  appT:      "991B1B",  // red-800
  white:     "FFFFFF",
  bodyText:  "1E293B",
  mutedText: "64748B",
};

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
}

function allNoBorders() {
  return {
    top: noBorder(), bottom: noBorder(),
    left: noBorder(), right: noBorder(),
    insideHorizontal: noBorder(), insideVertical: noBorder(),
  };
}

function cell(text, w, opts = {}) {
  const {
    bold = false, size = 11, color = C.bodyText,
    bg = "FFFFFF", align = AlignmentType.LEFT,
    vAlign = VerticalAlign.TOP, note = null,
    italic = false,
  } = opts;

  const runs = [
    new TextRun({ text, bold, size: pt(size), color, font: "Calibri", italics: italic }),
  ];
  if (note) {
    runs.push(new TextRun({ text: "\n", break: 1 }));
    runs.push(new TextRun({ text: note, size: pt(9.5), color: C.mutedText, font: "Calibri" }));
  }

  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    verticalAlign: vAlign,
    shading: { type: ShadingType.CLEAR, fill: bg },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
      left:   noBorder(),
      right:  noBorder(),
    },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 40, after: 40 },
        children: runs,
      }),
    ],
  });
}

function phaseHeaderRow(label) {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 4,
        width: { size: CONTENT, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: C.phaseBg },
        borders: allNoBorders(),
        children: [
          new Paragraph({
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({
                text: label,
                bold: true,
                size: pt(10),
                color: C.phaseText,
                font: "Calibri",
                allCaps: true,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function tagBg(coverage) {
  switch (coverage) {
    case "native":  return C.native;
    case "partial": return C.partial;
    case "custom":  return C.custom;
    case "app":     return C.appLayer;
    default:        return "FFFFFF";
  }
}
function tagText(coverage) {
  switch (coverage) {
    case "native":  return "✓ Native";
    case "partial": return "~ Partial";
    case "custom":  return "⚙ Custom";
    case "app":     return "✗ App-layer";
    default:        return "";
  }
}
function tagColor(coverage) {
  switch (coverage) {
    case "native":  return C.nativeT;
    case "partial": return C.partialT;
    case "custom":  return C.customT;
    case "app":     return C.appT;
    default:        return C.bodyText;
  }
}

function ruleRow(id, desc, mech, coverage, note = null) {
  return new TableRow({
    children: [
      cell(id,   COL.id,   { bold: true, color: C.mutedText }),
      cell(desc, COL.desc, {}),
      cell(mech, COL.mech, { note }),
      new TableCell({
        width: { size: COL.cov, type: WidthType.DXA },
        verticalAlign: VerticalAlign.TOP,
        shading: { type: ShadingType.CLEAR, fill: tagBg(coverage) },
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
          left:   noBorder(),
          right:  noBorder(),
        },
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: tagText(coverage),
                bold: true,
                size: pt(10),
                color: tagColor(coverage),
                font: "Calibri",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function tableHeaderRow() {
  const hdr = (text, w) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: C.headerBg },
    borders: allNoBorders(),
    children: [
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({ text, bold: true, size: pt(10.5), color: C.white, font: "Calibri" }),
        ],
      }),
    ],
  });
  return new TableRow({
    tableHeader: true,
    children: [
      hdr("Rule",             COL.id),
      hdr("Description",      COL.desc),
      hdr("Senzing Mechanism / Config",  COL.mech),
      hdr("Coverage",         COL.cov),
    ],
  });
}

// ── build the main rules table ───────────────────────────────────────────────
const rulesTable = new Table({
  width: { size: CONTENT, type: WidthType.DXA },
  columnWidths: [COL.id, COL.desc, COL.mech, COL.cov],
  borders: allNoBorders(),
  rows: [
    tableHeaderRow(),

    // ── Phase 1: Deterministic ──
    phaseHeaderRow("Phase 1 — Deterministic Auto-Link  (D-1 → D-4)"),

    ruleRow("D-1", "Exact CRD match",
      "Map CRD as custom IDENTIFIER feature type (e.g. CRD_NUMBER) with EXCLUSIVE behavior (F1E). Senzing auto-links on matching exclusive IDs and blocks resolution when they differ.",
      "native",
      "Config: add feature type CRD_NUMBER, behavior F1E (frequency-1, exclusive), register under org/person entity type in g2config.json."),

    ruleRow("D-2", "Exact email match",
      "EMAIL_ADDRESS is a built-in Senzing feature. The out-of-the-box comparator handles domain + local-part normalization. EXCLUSIVE behavior breaks on mismatch.",
      "native",
      "Zero config needed beyond mapping your source field name to the EMAIL_ADDRESS element in the data mapping JSON."),

    ruleRow("D-3", "Exact phone match",
      "PHONE_NUMBER is a built-in feature with full normalization (strips +1, dashes, parentheses). Extension variants are handled by the phone comparator; toll-free generic numbers are auto-suppressed.",
      "native",
      "Map source field to PHONE_NUMBER. Senzing's generic-value suppressor automatically ignores numbers shared by hundreds of entities."),

    ruleRow("D-4", "Vendor cross-ID match (Bloomberg TID / Discovery ID)",
      "Add two custom IDENTIFIER feature types: BLOOMBERG_TID and DISCOVERY_ID with EXCLUSIVE behavior. Exact cross-source ID match triggers resolution; mismatch triggers hard block — no scoring logic needed.",
      "native",
      "Add feature definitions to g2config.json. Senzing treats exclusive-identifier matches as automatic resolution triggers."),

    // ── Phase 2: Probabilistic ──
    phaseHeaderRow("Phase 2 — Probabilistic Scoring  (P-1 → P-7)"),

    ruleRow("P-1", "Team name similarity (Jaro-Winkler / token-set ratio)",
      "Maps to NAME_ORG feature. Senzing's org-name comparator natively handles abbreviations (Mgmt ↔ Management), ampersand forms, and common entity suffixes (LLC, LP, Inc).",
      "partial",
      "Partial gap: PE/wire-house financial shorthand ('Capital' ↔ 'Cap', 'Partners' ↔ 'Ptrs') must be added to the org-name comparator nickname table in g2config.json."),

    ruleRow("P-2", "Manager name similarity (first + last)",
      "Maps to NAME_FULL / NAME_FIRST + NAME_LAST. Senzing's world-class name comparator handles nicknames (Rob/Robert), phonetic variants, initials, and transpositions out of the box.",
      "native",
      "Finance-specific informal name aliases ('Skip', 'Chip') can be added to the built-in nickname table in cfg_fnrec / cfg_lnrec tables."),

    ruleRow("P-3", "Office address / ZIP similarity",
      "Maps to ADDR_FULL. The Senzing address comparator normalizes suite/floor variations, directionals, abbreviations (St/Street, Ave/Avenue), and scores same-building vs. same-city vs. same-ZIP.",
      "native",
      "ZIP-5 and ZIP-4 blocking keys are automatically generated by Senzing for candidate selection — no extra config required."),

    ruleRow("P-4", "Email domain match (supporting signal)",
      "Partially derivable from the EMAIL feature. Senzing assigns a 'close' score when domains match but local-parts differ.",
      "partial",
      "For explicit domain-only candidate blocking, add a computed feature EMAIL_DOMAIN extracted from EMAIL using a Senzing expression feature (g2config.json cfb_ftype)."),

    ruleRow("P-5", "Firm family / parent firm grouping",
      "No built-in hierarchical org concept. Model the parent firm as a separate entity and link team records to it via DISCLOSED_RELATIONSHIP. Relationship evidence surfaces in 'possibly related' scoring.",
      "partial",
      "Requires loading parent-firm entities as first-class records. DISCLOSED_RELATIONSHIP contributes relationship-awareness but does not drive hard resolution/blocking by itself."),

    ruleRow("P-6", "AUM range scoring (± 20% tolerance)",
      "No native numeric-range comparator in Senzing. Requires a custom comparator plugin (Python or Java) that computes |A−B| / max(A,B) and maps the ratio to Senzing score categories: same / close / likely / plausible / not_the_same.",
      "custom",
      "v4 embedding model replacement does not help here — AUM is a numeric domain, not semantic. Custom comparator is the correct path. One comparator serves both P-6 and N-4."),

    ruleRow("P-7", "Member set Jaccard overlap",
      "Senzing resolves members as separate PERSON entities and links them to team ORG entities via DISCLOSED_RELATIONSHIP, but has no native concept of '% of member sets that overlap across two org candidates.'",
      "app",
      "Must be computed externally: query resolved member clusters for each team candidate pair from the Senzing entity graph, compute Jaccard, pass back as a synthetic pre-load feature or use as a post-resolution confidence tiebreaker."),

    // ── Thresholds ──
    phaseHeaderRow("Phase 3 — Decision Thresholds"),

    ruleRow("THR", "Auto-link ≥ 0.90  /  Review 0.70–0.89  /  Reject < 0.70",
      "Senzing uses principle-based categorical decisions (RESOLVED / POSSIBLY_SAME / POSSIBLY_RELATED / NOT_SAME) rather than a continuous 0–1 composite score. Map your threshold bands to these categories.",
      "partial",
      "Threshold tuning is done by adjusting which principles fire and what feature scores they require — not by changing numeric cutoffs. RESOLVED ≈ auto-link; POSSIBLY_SAME ≈ human review; POSSIBLY_RELATED / NOT_SAME ≈ reject."),

    // ── Member-level ──
    phaseHeaderRow("Phase 4 — Member-Level Rules  (M-1 → M-5)"),

    ruleRow("M-1", "Member name + email dedup across sources",
      "Members are loaded as PERSON entity type. Name + email resolution uses the same built-in comparators as team records. Member CRD (when available) maps to CRD_NUMBER identifier.",
      "native",
      "Same pipeline and config as team records, different entity type. No additional rules needed."),

    ruleRow("M-2", "Member phone + job title dedup",
      "PHONE_NUMBER is fully native. Job title / role has no built-in comparator — map to a custom JOB_TITLE attribute feature or a generic ATTRIBUTE feature with a keyword comparator.",
      "partial",
      "Title alone should not be a resolution trigger. Use as a supporting signal in a custom principle, not a standalone identifier."),

    ruleRow("M-3", "Ghost / phantom member detection",
      "Senzing's generic-value suppression handles high-frequency noise identifiers, but deliberately injected phantom members (a vendor anti-scraping technique) require upstream source-flagging — Senzing has no automated ghost detection.",
      "app",
      "Flag IS_GHOST=Y in your source mapping. Add a pre-load filter to strip or quarantine ghost records before Senzing ingest. Alternatively, load ghost records to a separate data source with no cross-source resolution configured."),

    ruleRow("M-4", "Team ↔ member relationship linking",
      "DISCLOSED_RELATIONSHIP is the native construct for this. Load each team membership as a relationship record linking the PERSON entity to its ORG team entity.",
      "native",
      "Senzing propagates relationship awareness: if two team records share multiple resolved member entities, that shared-member evidence surfaces in the entity graph's 'possibly related' category."),

    ruleRow("M-5", "Two-pass member-first clustering",
      "Senzing naturally resolves PERSON entities independently as they are ingested. Team ORG resolution can then query already-resolved member entities in pass 2. Ordering is controlled by your load sequence.",
      "native",
      "Load all member records first, then team records. Senzing's real-time entity-centric learning loop handles incremental reevaluation automatically."),

    // ── Negative / Block rules ──
    phaseHeaderRow("Phase 5 — Negative / Block Rules  (N-1 → N-4)"),

    ruleRow("N-1", "CRD mismatch → hard block",
      "EXCLUSIVE behavior on CRD_NUMBER does exactly this. If two records carry different non-null CRD values, Senzing will never resolve them — they are classified as POSSIBLY_RELATED at most.",
      "native",
      "This is the canonical use case for EXCLUSIVE identifiers in Senzing and requires zero extra configuration beyond the CRD_NUMBER feature definition from D-1."),

    ruleRow("N-2", "Firm family mismatch → block",
      "Add a custom feature FIRM_FAMILY (e.g. normalized parent-firm token: 'FIDELITY', 'VANGUARD') with EXCLUSIVE behavior. Records with differing non-null FIRM_FAMILY tokens will not resolve.",
      "custom",
      "Requires normalizing firm-family names to a canonical token upstream before load (e.g. 'Fidelity Investments', 'FMR LLC' → 'FIDELITY'). Add FIRM_FAMILY as an exclusive identifier feature type in g2config.json."),

    ruleRow("N-3", "Already-linked records → no re-link",
      "Senzing's entity-centric model prevents this structurally. Once two records belong to the same resolved entity, there is no re-link operation — contradictory new evidence triggers a SPLIT event instead.",
      "native",
      "No extra configuration needed. This is a core property of Senzing's entity-centric graph architecture."),

    ruleRow("N-4", "AUM order-of-magnitude mismatch → block",
      "Requires the same custom AUM comparator built for P-6. Configure that comparator to return NOT_THE_SAME when the ratio exceeds a threshold (e.g. > 5×), then add a principle that treats AUM NOT_THE_SAME as a hard resolution veto.",
      "custom",
      "Reuse the P-6 custom comparator. One comparator plugin handles both the soft scoring (P-6) and the hard block (N-4) by varying the score category returned at different ratio thresholds."),
  ],
});

// ── Summary scorecard table ──────────────────────────────────────────────────
function summaryCard(count, label, bg, textColor) {
  return new TableCell({
    width: { size: Math.floor(CONTENT / 4), type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: bg },
    borders: allNoBorders(),
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        spacing: { before: 100, after: 20 },
        children: [
          new TextRun({ text: String(count), bold: true, size: pt(26), color: textColor, font: "Calibri" }),
        ],
      }),
      new Paragraph({
        spacing: { before: 0, after: 100 },
        children: [
          new TextRun({ text: label, size: pt(9.5), color: textColor, font: "Calibri" }),
        ],
      }),
    ],
  });
}

const summaryTable = new Table({
  width: { size: CONTENT, type: WidthType.DXA },
  columnWidths: [
    Math.floor(CONTENT / 4),
    Math.floor(CONTENT / 4),
    Math.floor(CONTENT / 4),
    Math.floor(CONTENT / 4),
  ],
  borders: allNoBorders(),
  rows: [
    new TableRow({
      children: [
        summaryCard(10, "Native via g2config.json",        C.native,   C.nativeT),
        summaryCard(4,  "Partial / custom feature type",   C.partial,  C.partialT),
        summaryCard(3,  "Custom comparator required",      C.custom,   C.customT),
        summaryCard(2,  "App-layer only",                  C.appLayer, C.appT),
      ],
    }),
  ],
});

// ── Legend table ─────────────────────────────────────────────────────────────
function legendCell(symbol, label, bg, tc) {
  return new TableCell({
    width: { size: Math.floor(CONTENT / 4), type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: "FFFFFF" },
    borders: allNoBorders(),
    children: [
      new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({ text: symbol + " ", bold: true, size: pt(10), color: tc, font: "Calibri" }),
          new TextRun({ text: label, size: pt(10), color: C.bodyText, font: "Calibri" }),
        ],
      }),
    ],
  });
}

const legendTable = new Table({
  width: { size: CONTENT, type: WidthType.DXA },
  columnWidths: [
    Math.floor(CONTENT / 4),
    Math.floor(CONTENT / 4),
    Math.floor(CONTENT / 4),
    Math.floor(CONTENT / 4),
  ],
  borders: allNoBorders(),
  rows: [
    new TableRow({
      children: [
        legendCell("✓ Native",    "g2config.json only",         C.native,   C.nativeT),
        legendCell("~ Partial",   "Needs custom feature/config", C.partial,  C.partialT),
        legendCell("⚙ Custom",    "Custom comparator plugin",   C.custom,   C.customT),
        legendCell("✗ App-layer", "Outside Senzing entirely",   C.appLayer, C.appT),
      ],
    }),
  ],
});

// ── Build document ────────────────────────────────────────────────────────────
const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      },
    },
    children: [

      // Title
      new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({
            text: "Senzing Coverage Assessment",
            bold: true,
            size: pt(22),
            color: C.headerBg,
            font: "Calibri",
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 0, after: 120 },
        children: [
          new TextRun({
            text: "PE / Wire-House Team Golden Record Pipeline  ·  19 Rules across 5 Phases",
            size: pt(12),
            color: C.mutedText,
            font: "Calibri",
          }),
        ],
      }),

      // Intro paragraph
      new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({
            text: "This document maps each of the 19 matching rules in the Team Golden Record pipeline to Senzing's native engine capabilities. Rules are assessed against Senzing v3/v4 using the principle-based entity resolution model and g2config.json configuration. Coverage is classified into four tiers:",
            size: pt(11),
            color: C.bodyText,
            font: "Calibri",
          }),
        ],
      }),

      // Legend
      legendTable,

      new Paragraph({ spacing: { before: 120, after: 80 }, children: [] }),

      // Summary scorecard label
      new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({
            text: "SUMMARY SCORECARD",
            bold: true,
            size: pt(10),
            color: C.mutedText,
            font: "Calibri",
            allCaps: true,
          }),
        ],
      }),

      // Scorecard
      summaryTable,

      new Paragraph({ spacing: { before: 200, after: 80 }, children: [] }),

      // Rules table label
      new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({
            text: "RULE-BY-RULE ASSESSMENT",
            bold: true,
            size: pt(10),
            color: C.mutedText,
            font: "Calibri",
            allCaps: true,
          }),
        ],
      }),

      // Main rules table
      rulesTable,

      new Paragraph({ spacing: { before: 240, after: 80 }, children: [] }),

      // Implementation notes heading
      new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({
            text: "IMPLEMENTATION NOTES",
            bold: true,
            size: pt(10),
            color: C.mutedText,
            font: "Calibri",
            allCaps: true,
          }),
        ],
      }),

      // Notes
      ...[
        "1.  Load order matters. Load all PERSON (member) records before loading ORG (team) records. Senzing resolves members independently in pass 1; team resolution in pass 2 can reference already-resolved member entities.",
        "2.  AUM custom comparator. A single Python/Java plugin (~100 lines) handles both P-6 (soft scoring) and N-4 (hard block) by returning different Senzing score categories at different ratio thresholds. Register it in g2config.json as a custom comparator for the AUM feature type.",
        "3.  Jaccard overlap (P-7). After Senzing resolves member entities, query the entity graph for member clusters per team candidate pair. Compute Jaccard externally and either: (a) persist it as a synthetic TEAM_OVERLAP_SCORE feature on a re-ingested team record, or (b) use it as a post-resolution confidence score to gate human review.",
        "4.  Ghost members (M-3). Flag phantom records in source data before ingest. The simplest approach: load ghost records into a separate Senzing data source that is excluded from cross-source resolution rules.",
        "5.  Firm-family blocking (N-2). Normalize parent firm names to canonical tokens upstream (e.g. 'Fidelity Investments', 'FMR LLC' → 'FIDELITY'). Add FIRM_FAMILY as an EXCLUSIVE identifier feature in g2config.json.",
        "6.  Financial nickname table (P-1). Extend the NAME_ORG comparator configuration with PE/wire-house shorthand: Capital ↔ Cap, Partners ↔ Ptrs, Management ↔ Mgmt, Advisors ↔ Advisors / Adv, Asset Management ↔ Asset Mgmt.",
      ].map(note => new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({ text: note, size: pt(11), color: C.bodyText, font: "Calibri" }),
        ],
      })),

    ],
  }],
});

// ── Write file ────────────────────────────────────────────────────────────────
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Written:", outPath);
}).catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
