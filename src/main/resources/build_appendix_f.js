const { Document, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel,
        WidthType, BorderStyle, AlignmentType, ShadingType, PageBreak } = require('docx');
const fs = require('fs');

const NAVY  = '1F3864';
const SLATE = '404040';
const GOLD  = 'B8860B';
const LGREY = 'F2F2F2';
const MGREY = 'D9D9D9';
const WHITE = 'FFFFFF';
const RED   = 'C00000';
const GREEN = '375623';
const BLUE  = '2F5496';

const pt = n => n * 20;

const h1 = t => new Paragraph({
  text: t, heading: HeadingLevel.HEADING_1,
  spacing: { before: 480, after: 160 }
});
const h2 = t => new Paragraph({
  text: t, heading: HeadingLevel.HEADING_2,
  spacing: { before: 320, after: 120 }
});
const h3 = t => new Paragraph({
  spacing: { before: 200, after: 80 },
  children: [new TextRun({ text: t, size: 24, bold: true, color: NAVY, font: 'Calibri' })]
});
const body = t => new Paragraph({
  spacing: { before: 0, after: 120 },
  children: [new TextRun({ text: t, size: 22, color: SLATE, font: 'Calibri' })]
});
const bodyBold = (label, text) => new Paragraph({
  spacing: { before: 0, after: 100 },
  children: [
    new TextRun({ text: label, size: 22, bold: true, color: NAVY, font: 'Calibri' }),
    new TextRun({ text: text, size: 22, color: SLATE, font: 'Calibri' }),
  ]
});
const bullet = t => new Paragraph({
  spacing: { before: 0, after: 80 },
  bullet: { level: 0 },
  children: [new TextRun({ text: t, size: 21, color: SLATE, font: 'Calibri' })]
});
const bullet2 = t => new Paragraph({
  spacing: { before: 0, after: 60 },
  bullet: { level: 1 },
  children: [new TextRun({ text: t, size: 20, color: SLATE, font: 'Calibri' })]
});
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const spacer = () => new Paragraph({ spacing: { before: 0, after: 160 }, children: [new TextRun('')] });

// ── TABLE HELPERS ──────────────────────────────────────────────────────────
const hdrCell = (text, w, opts={}) => new TableCell({
  width: { size: w, type: WidthType.PERCENTAGE },
  shading: { fill: NAVY, type: ShadingType.CLEAR, color: NAVY },
  margins: { top: 60, bottom: 60, left: 80, right: 80 },
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, size: 18, bold: true, color: WHITE, font: 'Calibri' })]
  })],
  ...opts
});

const cell = (text, w, opts={}) => new TableCell({
  width: { size: w, type: WidthType.PERCENTAGE },
  margins: { top: 50, bottom: 50, left: 80, right: 80 },
  children: [new Paragraph({
    children: [new TextRun({ text, size: 19, color: SLATE, font: 'Calibri' })]
  })],
  ...opts
});

const cellBold = (text, w, color=NAVY) => new TableCell({
  width: { size: w, type: WidthType.PERCENTAGE },
  shading: { fill: LGREY, type: ShadingType.CLEAR, color: LGREY },
  margins: { top: 50, bottom: 50, left: 80, right: 80 },
  children: [new Paragraph({
    children: [new TextRun({ text, size: 19, bold: true, color, font: 'Calibri' })]
  })]
});

const cellShade = (text, w, fill=LGREY) => new TableCell({
  width: { size: w, type: WidthType.PERCENTAGE },
  shading: { fill, type: ShadingType.CLEAR, color: fill },
  margins: { top: 50, bottom: 50, left: 80, right: 80 },
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, size: 19, bold: true, color: NAVY, font: 'Calibri' })]
  })]
});

const tblBorders = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: MGREY },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: MGREY },
  left:   { style: BorderStyle.SINGLE, size: 4, color: MGREY },
  right:  { style: BorderStyle.SINGLE, size: 4, color: MGREY },
  insideH:{ style: BorderStyle.SINGLE, size: 4, color: MGREY },
  insideV:{ style: BorderStyle.SINGLE, size: 4, color: MGREY },
};

// ═══════════════════════════════════════════════════════════════════════
// CONTENT
// ═══════════════════════════════════════════════════════════════════════

const children = [];

// ── APPENDIX HEADING ──────────────────────────────────────────────────
children.push(h1('Appendix F — Regulatory Reporting Framework'));
children.push(body('This appendix catalogues the full regulatory reporting obligations for a global private equity fund manager operating master-feeder fund structures across US, EU, UK, and Cayman Islands jurisdictions. For each regime, the filing, frequency, content, and filing deadline are specified. Section F.7 consolidates all obligations into a single regulatory calendar.'));
children.push(spacer());

// ── F.1 US SEC ─────────────────────────────────────────────────────────
children.push(h2('F.1  United States — SEC & CFTC'));
children.push(body('US-registered investment advisers managing private equity funds are subject to the Investment Advisers Act of 1940, the Securities Act of 1933 (Regulation D), and, where applicable, the Commodity Exchange Act. The table below summarises each material filing obligation.'));
children.push(spacer());

const usSecRows = [
  ['Form ADV (Parts 1, 2A, 2B)', 'Annual + on material change', 'SEC IARD', 'Within 90 days of FY-end; interim amendment on material change', 'AUM, strategies, conflicts, disciplinary history, fee schedules, ownership structure'],
  ['Form PF', 'Annual (standard) / Quarterly (large: ≥$2B PE AUM)', 'SEC EDGAR', '120 days post FY-end (annual); 60 days post quarter-end (large filers)', 'Fund-level AUM, leverage, investor concentration, portfolio company financials, liquidity'],
  ['Form D (Reg D)', 'Per offering; annual amendment', 'SEC EDGAR', 'Within 15 days of first sale; annual amendment while open', 'Exempt offering notice: fund name, exemption relied upon, aggregate amount sold, investor count'],
  ['Form 13F', 'Quarterly', 'SEC EDGAR', 'Within 45 days of quarter-end', 'Long positions in Section 13(f) securities ≥$100M threshold'],
  ['Form 13D / 13G', 'Event-driven', 'SEC EDGAR', '13D: 10 days post acquisition; 13G: 45 days post calendar year-end', 'Beneficial ownership ≥5% of a public company\'s voting securities'],
  ['HSR Premerger Notification', 'Per qualifying transaction', 'FTC / DOJ', 'Before deal closing; default waiting period 30 days', 'Acquiring entity, target, transaction value, deal structure, market overlaps'],
  ['Form CPO-PQR / CTA-PR', 'Quarterly (Sch A); Annual (Sch B/C)', 'NFA', '60 days post quarter-end', 'Pool assets, leverage, counterparty exposure, risk metrics for registered CPOs'],
  ['FINRA Rule 5123', 'Per private placement', 'FINRA', 'Within 15 days of first sale', 'PPM, investor eligibility, offering terms for broker-dealer placement agents'],
];

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tblBorders,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        hdrCell('Filing', 18), hdrCell('Frequency', 14), hdrCell('Regulator', 10),
        hdrCell('Deadline', 18), hdrCell('Key Content', 40)
      ]
    }),
    ...usSecRows.map((r, i) => new TableRow({
      children: [
        cellBold(r[0], 18), cell(r[1], 14), cell(r[2], 10), cell(r[3], 18), cell(r[4], 40)
      ]
    }))
  ]
}));
children.push(spacer());

// ── F.2 EU / AIFMD ────────────────────────────────────────────────────
children.push(h2('F.2  European Union — AIFMD, SFDR & EMIR'));
children.push(body('Alternative Investment Fund Managers marketing or managing funds in the EU are subject to AIFMD (Directive 2011/61/EU), SFDR (Regulation (EU) 2019/2088), and where derivatives are used, EMIR (Regulation (EU) 648/2012). Non-EU AIFMs accessing EU capital via NPPR must comply with each host member state\'s national private placement regime.'));
children.push(spacer());

const euRows = [
  ['AIFMD Annex IV', 'Semi-annual (large AIFM); Annual (small)', 'National Competent Authority (NCA)', '30 days post period-end (large); 60 days (small)', 'AUM, NAV, leverage, liquidity, risk profile, investor domicile, top 5 instruments, portfolio concentration'],
  ['Marketing Notification (Art. 31/32)', 'Pre-marketing; per fund per jurisdiction', 'Home NCA + host NCA', 'Prior to commencement of marketing', 'Fund prospectus, offering documents, KIID/KID, distribution arrangements'],
  ['SFDR Art. 3 / 4 Entity Disclosure', 'Annual', 'Published on firm website', 'By 30 June each year', 'PAI statement: 18 mandatory + 2 optional adverse sustainability indicators across portfolio'],
  ['SFDR Art. 8/9 Product Disclosure', 'Pre-contractual + Annual periodic report', 'NCA + fund documents', 'Pre-contractual: before subscription; Periodic: within 4 months of FY-end', 'ESG characteristics, sustainable investment objectives, PAI metrics, taxonomy alignment %'],
  ['PRIIPs KID', 'Annual + on material change', 'Distributed to retail investors', '1 January each year; update within 35 business days of material change', 'Risk indicator (1–7), performance scenarios, costs (RIY), recommended holding period'],
  ['EMIR Trade Reporting', 'Per trade (T+1)', 'Registered Trade Repository (DTCC, ICE TR)', 'By end of next business day following execution', 'Counterparty details, contract type, notional, maturity, collateral, valuation for OTC derivatives'],
  ['AIFMD Remuneration Disclosure', 'Annual', 'Published in annual report / website', 'With publication of annual report', 'Aggregate fixed and variable remuneration for senior management, risk-takers, and control functions'],
];

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tblBorders,
  rows: [
    new TableRow({ tableHeader: true, children: [hdrCell('Filing', 18), hdrCell('Frequency', 14), hdrCell('Regulator', 14), hdrCell('Deadline', 14), hdrCell('Key Content', 40)] }),
    ...euRows.map(r => new TableRow({ children: [cellBold(r[0],18), cell(r[1],14), cell(r[2],14), cell(r[3],14), cell(r[4],40)] }))
  ]
}));
children.push(spacer());

// ── F.3 UK ────────────────────────────────────────────────────────────
children.push(h2('F.3  United Kingdom — FCA'));
children.push(body('Post-Brexit, UK AIFMs are regulated under the UK AIFMD (as onshored into UK law). FCA-authorised firms file via RegData (formerly GABRIEL). UK managers marketing into the EU must use the National Private Placement Regime (NPPR) in each EU member state on a jurisdiction-by-jurisdiction basis.'));
children.push(spacer());

const ukRows = [
  ['UK AIFMD Annex IV', 'Semi-annual (large) / Annual (small)', 'FCA via RegData', '30 / 60 days post period-end', 'AUM, leverage, liquidity, risk profile — mirrors EU Annex IV structure'],
  ['FCA Annual Financial Return (AFR)', 'Annual', 'FCA', 'Within 4 months of FY-end', 'Balance sheet, income statement, capital resources, large exposures'],
  ['FCA Capital Adequacy Return', 'Quarterly', 'FCA', '20 business days post quarter-end', 'Own funds, fixed overheads, capital requirement (MIFIDPRU for CPMI firms)'],
  ['UK PRIIPs / Consumer Duty', 'Annual + event-driven', 'FCA', 'Annual; within 35 days of material change', 'Consumer outcomes, fair value assessments, product governance reviews'],
  ['NPPR Notification (per EU member state)', 'Per fund per jurisdiction', 'Each EU NCA', 'Prior to marketing; annual renewal in some states', 'Fund documentation, AIFM authorisation evidence, local regulatory form'],
  ['UK Transaction Reporting (MiFIR / UK MiFIR)', 'Per trade (T+1)', 'FCA via ARM', 'By end of next business day', 'Financial instrument, quantity, price, buyer/seller identifiers (LEI) for in-scope instruments'],
];

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tblBorders,
  rows: [
    new TableRow({ tableHeader: true, children: [hdrCell('Filing', 20), hdrCell('Frequency', 14), hdrCell('Regulator', 12), hdrCell('Deadline', 14), hdrCell('Key Content', 40)] }),
    ...ukRows.map(r => new TableRow({ children: [cellBold(r[0],20), cell(r[1],14), cell(r[2],12), cell(r[3],14), cell(r[4],40)] }))
  ]
}));
children.push(spacer());

// ── F.4 Cayman ───────────────────────────────────────────────────────
children.push(h2('F.4  Cayman Islands — CIMA, Economic Substance & FATCA / CRS'));
children.push(body('Cayman Islands funds (master and feeder entities) are registered with CIMA and subject to annual filing requirements. Cayman is a leading CRS-participating jurisdiction and requires all Cayman Financial Institutions to comply with FATCA (via the US-Cayman IGA) and the OECD Common Reporting Standard.'));
children.push(spacer());

const caymanRows = [
  ['CIMA Fund Registration & Annual Return', 'Annual', 'CIMA', 'Within 6 months of FY-end; annual fee due 15 January', 'Audited financial statements, NAV, investor count, changes to offering documents or directors'],
  ['Economic Substance Return', 'Annual', 'Dept for International Tax Cooperation (DITC)', 'Within 12 months of FY-end', 'Whether fund conducts relevant activities (fund management, holding co.); income, employees, premises, outsourcing'],
  ['FATCA Filing (US IGA Model 1)', 'Annual', 'DITC → IRS', 'By 31 July (data as of 31 Dec prior year)', 'US reportable accounts: investor name, TIN, account balance, income paid. Registered as FFI with GIIN'],
  ['CRS Filing', 'Annual', 'DITC → OECD Partner Jurisdictions', 'By 31 July', 'Tax residency-based reporting: account balance, interest, dividends, gross proceeds per non-resident investor'],
  ['Beneficial Ownership Register', 'Ongoing (updated within 15 days of change)', 'CIMA / Registrar', 'Within 15 days of change in UBO', 'UBOs with ≥25% ownership: name, DOB, nationality, address, nature of interest'],
  ['CIMA Director Registration', 'Per appointment', 'CIMA', 'Within 21 days of appointment', 'Director details, disqualification history, consent to act'],
];

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tblBorders,
  rows: [
    new TableRow({ tableHeader: true, children: [hdrCell('Filing', 22), hdrCell('Frequency', 12), hdrCell('Regulator', 14), hdrCell('Deadline', 16), hdrCell('Key Content', 36)] }),
    ...caymanRows.map(r => new TableRow({ children: [cellBold(r[0],22), cell(r[1],12), cell(r[2],14), cell(r[3],16), cell(r[4],36)] }))
  ]
}));
children.push(spacer());
children.push(pageBreak());

// ── F.5 Tax ────────────────────────────────────────────────────────────
children.push(h2('F.5  US Tax Reporting'));
children.push(body('US-domiciled fund entities (domestic feeders, GP entities) are taxed as partnerships and must file annual partnership tax returns. Key obligations arise from partnership allocations to LPs and the treatment of non-US investors, tax-exempt investors, and UBTI-generating portfolio companies.'));
children.push(spacer());

const taxRows = [
  ['Form 1065 — US Partnership Return', 'Annual', 'IRS', '15 March (15 September with extension)', 'Income, deductions, credits, and each partner\'s distributive share. Required for every US partnership with US tax filing obligation'],
  ['Schedule K-1 (per LP)', 'Annual', 'IRS (distributed to each LP)', 'Same as Form 1065 deadline', 'Each LP\'s share of: ordinary income/loss, capital gains (short/long), dividends, interest, foreign tax credits, UBTI, Section 199A'],
  ['PFIC Annual Information Statement', 'Annual (per PFIC holding)', 'Distributed to US LP investors', 'With Schedule K-1', 'Required where fund holds passive foreign investment companies; enables US LPs to make QEF or mark-to-market elections'],
  ['Form 8865 (Foreign Partnership)', 'Annual', 'IRS', 'With Form 1065', 'US persons with ≥10% interest in foreign partnerships (e.g., offshore feeder); transfer reporting'],
  ['State & Local Partnership Returns', 'Annual (per state with nexus)', 'State revenue departments', 'Varies by state; typically April / September', 'Apportioned income, composite returns for non-resident LPs, withholding remittances where required'],
  ['UBTI Schedule', 'Annual', 'Distributed to tax-exempt LPs', 'With Schedule K-1', 'Unrelated Business Taxable Income from leveraged buyouts, active portfolio company operations, or debt-financed income'],
  ['Form 8990 (Business Interest Limitation)', 'Annual', 'IRS', 'With Form 1065', 'Section 163(j) limitation on deductibility of business interest expense at fund and portfolio company level'],
  ['Form 1042 / 1042-S (Withholding)', 'Annual', 'IRS', '15 March', 'Withholding on US-source fixed/determinable income paid to non-US investors (dividends, interest, FDAP income)'],
];

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tblBorders,
  rows: [
    new TableRow({ tableHeader: true, children: [hdrCell('Filing', 24), hdrCell('Frequency', 10), hdrCell('Authority', 10), hdrCell('Deadline', 14), hdrCell('Key Content', 42)] }),
    ...taxRows.map(r => new TableRow({ children: [cellBold(r[0],24), cell(r[1],10), cell(r[2],10), cell(r[3],14), cell(r[4],42)] }))
  ]
}));
children.push(spacer());

// ── F.6 AML ───────────────────────────────────────────────────────────
children.push(h2('F.6  AML, KYC & Sanctions Compliance'));
children.push(body('Anti-money laundering and sanctions compliance obligations are process-driven rather than periodic filings. The table below details the key programme components, the triggering events, and the records that must be maintained.'));
children.push(spacer());

const amlRows = [
  ['AML / BSA Written Programme', 'Maintain and update annually', 'FinCEN', 'Ongoing', 'Risk-based AML policies, CIP procedures, customer due diligence, suspicious activity escalation procedures, independent testing'],
  ['Customer Identification Programme (CIP)', 'At each new investor onboarding', 'FinCEN / Internal', 'Before investment', 'Name, address, DOB / formation date, TIN / EIN / passport; verification via documentary or non-documentary means'],
  ['Beneficial Ownership (CDD Rule)', 'At onboarding; update on change', 'FinCEN', 'Before investment / within 30 days of change', 'Legal entity customers: identify natural persons owning ≥25% and one control person; collect and verify information'],
  ['OFAC Sanctions Screening', 'At onboarding + periodic (at least annual)', 'OFAC', 'Before investment; ongoing', 'Screen all investors, UBOs, portfolio companies, and counterparties against SDN, Sectoral, and consolidated lists'],
  ['Suspicious Activity Report (SAR)', 'Event-driven (where required)', 'FinCEN', 'Within 30 days of detection (60 days if no suspect identified)', 'Transaction amount, parties, suspicious activity description, no tipping-off restriction applies to non-covered institutions'],
  ['PEP (Politically Exposed Person) Review', 'At onboarding + trigger-based', 'Internal / Compliance', 'Before investment', 'Enhanced due diligence for PEPs and their immediate family / close associates; senior management approval required'],
  ['W-8BEN / W-8BEN-E / W-9 Collection', 'At onboarding; renew every 3 years for W-8', 'IRS', 'Before first payment / capital call', 'US or non-US tax status certification; FATCA status classification; withholding determination'],
  ['Annual AML Training', 'Annual', 'Internal / FinCEN', 'Annually', 'All staff and relevant service providers trained on AML/CFT policies, red flags, escalation procedures'],
];

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tblBorders,
  rows: [
    new TableRow({ tableHeader: true, children: [hdrCell('Control / Filing', 22), hdrCell('Trigger', 14), hdrCell('Authority', 12), hdrCell('Timing', 14), hdrCell('Key Content', 38)] }),
    ...amlRows.map(r => new TableRow({ children: [cellBold(r[0],22), cell(r[1],14), cell(r[2],12), cell(r[3],14), cell(r[4],38)] }))
  ]
}));
children.push(spacer());
children.push(pageBreak());

// ── F.7 REGULATORY CALENDAR ────────────────────────────────────────────
children.push(h2('F.7  Master Regulatory Filing Calendar'));
children.push(body('The calendar below consolidates all recurring regulatory filings across jurisdictions, sorted by frequency and typical deadline. Dates assume a 31 December fiscal year-end. Specific deadlines vary by regulator and may shift for weekends or local public holidays.'));
children.push(spacer());

const calRows = [
  // frequency, filing, jurisdiction, regulator, typical deadline, notes
  ['Per Trade (T+1)', 'EMIR Trade Reporting', 'EU', 'ESMA / Trade Repository', 'Next business day', 'All OTC derivatives'],
  ['Per Trade (T+1)', 'UK MiFIR Transaction Reporting', 'UK', 'FCA via ARM', 'Next business day', 'In-scope financial instruments'],
  ['Per Transaction', 'OFAC Sanctions Screen', 'Global', 'OFAC', 'Pre-investment', 'All investors, UBOs, portfolio cos.'],
  ['Per Event', 'Form D (Reg D)', 'US', 'SEC', 'T+15 days of first sale', 'Per fund / offering'],
  ['Per Event', 'HSR Premerger Notification', 'US', 'FTC / DOJ', 'Before deal close', 'Qualifying acquisitions only'],
  ['Per Event', 'Form 13D / 13G', 'US', 'SEC', '10 / 45 days', '≥5% public company ownership'],
  ['Per Event', 'CIMA Director Registration', 'Cayman', 'CIMA', 'T+21 days', 'New director appointments'],
  ['Per Event', 'Beneficial Ownership Register Update', 'Cayman / UK', 'CIMA / Registrar', 'T+15 days of change', 'UBO changes ≥25%'],
  ['Per Event', 'AIFMD Marketing Notification', 'EU', 'NCA (home + host)', 'Prior to marketing', 'Per fund per member state'],
  ['Per Event', 'SAR Filing', 'US', 'FinCEN', 'T+30 days of detection', 'Where required'],
  ['Quarterly', 'Form PF (large PE adviser)', 'US', 'SEC', 'T+60 days post quarter', '≥$2B PE AUM filers'],
  ['Quarterly', 'Form 13F', 'US', 'SEC', 'T+45 days post quarter', '≥$100M Section 13(f) securities'],
  ['Quarterly', 'Form CPO-PQR Schedule A', 'US', 'NFA', 'T+60 days post quarter', 'Registered CPOs'],
  ['Quarterly', 'FCA Capital Adequacy Return', 'UK', 'FCA RegData', 'T+20 business days', 'Authorised firms'],
  ['Semi-Annual', 'AIFMD Annex IV (large AIFM)', 'EU', 'NCA', 'T+30 days post period', 'AUM > AIFMD thresholds'],
  ['Semi-Annual', 'UK AIFMD Annex IV (large)', 'UK', 'FCA RegData', 'T+30 days post period', ''],
  ['Annual', 'Form ADV (Parts 1, 2A, 2B)', 'US', 'SEC IARD', '31 March (90 days post 31 Dec FY)', 'Material changes trigger interim amendment'],
  ['Annual', 'Form PF (standard)', 'US', 'SEC', '30 April (120 days post 31 Dec FY)', 'All registered PE advisers'],
  ['Annual', 'Form 1065 + K-1s', 'US', 'IRS', '15 March (15 Sept with extension)', 'US partnership tax return'],
  ['Annual', 'Form 1042 / 1042-S', 'US', 'IRS', '15 March', 'Withholding on US-source income'],
  ['Annual', 'AIFMD Annex IV (small AIFM)', 'EU', 'NCA', 'T+60 days post FY-end', ''],
  ['Annual', 'SFDR Art. 3/4 PAI Statement', 'EU', 'Website / NCA', '30 June', 'Entity-level sustainability disclosures'],
  ['Annual', 'SFDR Art. 8/9 Periodic Report', 'EU', 'Fund documents / NCA', 'T+4 months post FY-end', 'Product-level ESG report'],
  ['Annual', 'UK AIFMD Annex IV (small)', 'UK', 'FCA RegData', 'T+60 days post FY-end', ''],
  ['Annual', 'FCA Annual Financial Return', 'UK', 'FCA RegData', 'T+4 months post FY-end', ''],
  ['Annual', 'CIMA Annual Return + Audited Accounts', 'Cayman', 'CIMA', '30 June (6 months post 31 Dec FY)', 'Annual fee due 15 January'],
  ['Annual', 'Economic Substance Return', 'Cayman', 'DITC', 'T+12 months post FY-end', '31 December deadline'],
  ['Annual', 'FATCA Filing (IGA Model 1)', 'Cayman / Global', 'DITC → IRS', '31 July', 'US reportable accounts as of 31 Dec'],
  ['Annual', 'CRS Filing', 'Cayman / Global', 'DITC → OECD', '31 July', 'All non-US tax resident accounts'],
  ['Annual', 'Form CPO-PQR Schedules B & C', 'US', 'NFA', 'T+60 days post FY-end', 'Large CPO filers'],
  ['Annual', 'State Partnership Returns', 'US (state)', 'State Revenue Depts', 'Varies (typically April)', 'Nexus states only'],
  ['Annual', 'AML Programme Review + Staff Training', 'Global', 'Internal / FinCEN', 'Annually', 'Board sign-off recommended'],
  ['Annual', 'PRIIPs KID Update', 'EU / UK', 'Distributed to retail investors', '1 January / T+35 days material change', ''],
  ['Annual', 'W-8 Form Renewal', 'US', 'IRS', 'Every 3 years (or on status change)', 'Non-US investor tax certifications'],
];

// Group by frequency
const freqOrder = ['Per Trade (T+1)','Per Transaction','Per Event','Quarterly','Semi-Annual','Annual'];
const freqColor = {
  'Per Trade (T+1)': 'C00000',
  'Per Transaction': 'C00000',
  'Per Event': 'C55A11',
  'Quarterly': '375623',
  'Semi-Annual': '2F5496',
  'Annual': '1F3864',
};

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tblBorders,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        hdrCell('Frequency', 12), hdrCell('Filing / Obligation', 26),
        hdrCell('Jurisdiction', 10), hdrCell('Regulator', 14),
        hdrCell('Deadline', 14), hdrCell('Notes', 24)
      ]
    }),
    ...calRows.map(r => new TableRow({
      children: [
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: LGREY, type: ShadingType.CLEAR, color: LGREY },
          margins: { top: 50, bottom: 50, left: 80, right: 80 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: r[0], size: 18, bold: true, color: freqColor[r[0]] || NAVY, font: 'Calibri' })]
          })]
        }),
        cellBold(r[1], 26),
        cell(r[2], 10),
        cell(r[3], 14),
        cell(r[4], 14),
        cell(r[5], 24),
      ]
    }))
  ]
}));
children.push(spacer());

// ── F.8 DATA MODEL FIELDS ─────────────────────────────────────────────
children.push(h2('F.8  Regulatory Data Model — Key Fields'));
children.push(body('The following fields should be captured in the data model to support automated regulatory filing and audit trail requirements. These extend the core Investor, Commitment, and Transaction entities defined in Appendix E.'));
children.push(spacer());

children.push(h3('Investor Entity — Regulatory Extensions'));
const invRegFields = [
  ['fatca_status', 'String', 'FFI / NFFE / US Person / Exempt', 'FATCA / 1042-S'],
  ['crs_tax_residency', 'String[]', 'ISO 3166-1 country codes (can be multiple)', 'CRS filing'],
  ['giin', 'String', 'Global Intermediary ID number (for FFI investors)', 'FATCA IGA'],
  ['tin_us', 'String', 'US Tax ID (SSN / EIN / ITIN)', 'Form 1065 / K-1'],
  ['tin_foreign', 'String', 'Non-US Tax Identification Number', 'CRS'],
  ['w8_w9_form_type', 'String', 'W-9 / W-8BEN / W-8BEN-E / W-8IMY', 'IRS withholding'],
  ['w8_expiry_date', 'Date', 'W-8 certification expires 3 years after execution', 'IRS'],
  ['erisa_plan_investor', 'Boolean', 'Is this investor an ERISA benefit plan investor?', 'ERISA 25% test'],
  ['erisa_participation_pct', 'Decimal', 'LP\'s % of fund that triggers plan asset counting', 'Form 5500'],
  ['pep_flag', 'Boolean', 'Is investor / UBO a Politically Exposed Person?', 'AML / CDD'],
  ['ofac_screen_date', 'Date', 'Last OFAC sanctions screening date', 'AML programme'],
  ['ofac_screen_result', 'String', 'Clear / Hit / Escalated', 'AML programme'],
  ['kyc_approved_date', 'Date', 'Date KYC approval completed', 'CIP / CDD Rule'],
  ['kyc_refresh_due_date', 'Date', 'Next scheduled KYC refresh', 'AML programme'],
  ['ubo_verified', 'Boolean', 'Beneficial ownership verified per CDD Rule', 'FinCEN CDD Rule'],
  ['lei', 'String', 'Legal Entity Identifier (20-char ISO 17442)', 'EMIR / MiFIR'],
  ['aifmd_investor_type', 'String', 'Professional / Semi-Professional / Retail (EU classification)', 'AIFMD marketing'],
];

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tblBorders,
  rows: [
    new TableRow({ tableHeader: true, children: [hdrCell('Field', 25), hdrCell('Type', 12), hdrCell('Description', 43), hdrCell('Supports', 20)] }),
    ...invRegFields.map(r => new TableRow({ children: [cellBold(r[0],25), cell(r[1],12), cell(r[2],43), cell(r[3],20)] }))
  ]
}));
children.push(spacer());

children.push(h3('Fund Entity — Regulatory Extensions'));
const fundRegFields = [
  ['sec_file_number', 'String', 'SEC adviser registration number (801-XXXXXX)', 'Form ADV'],
  ['cftc_registration_status', 'String', 'Registered CPO / Exempt (4.13(a)(3)) / Not applicable', 'Form CPO-PQR'],
  ['aifmd_status', 'String', 'EU AIFM / Non-EU AIFM-NPPR / Sub-threshold', 'AIFMD Annex IV'],
  ['aifmd_home_nca', 'String', 'Home National Competent Authority (e.g., FCA, BaFin, AMF)', 'AIFMD Annex IV'],
  ['sfdr_article_classification', 'String', 'Article 6 / Article 8 / Article 9', 'SFDR product disclosure'],
  ['form_pf_fund_type', 'String', 'Private Equity Fund / Hedge Fund / Liquidity Fund', 'Form PF'],
  ['cima_registration_number', 'String', 'Cayman Islands Monetary Authority registration ID', 'CIMA annual return'],
  ['economic_substance_relevant', 'Boolean', 'Is fund conducting a relevant activity under ES rules?', 'ES Return'],
  ['erisa_plan_asset_pct', 'Decimal', 'Current % of fund AUM attributable to ERISA benefit plan investors', 'ERISA 25% test'],
  ['fatca_giin', 'String', 'Fund\'s own GIIN if registered as FFI', 'FATCA IGA filing'],
];

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tblBorders,
  rows: [
    new TableRow({ tableHeader: true, children: [hdrCell('Field', 25), hdrCell('Type', 12), hdrCell('Description', 43), hdrCell('Supports', 20)] }),
    ...fundRegFields.map(r => new TableRow({ children: [cellBold(r[0],25), cell(r[1],12), cell(r[2],43), cell(r[3],20)] }))
  ]
}));
children.push(spacer());

// ── F.9 CALLOUT ─────────────────────────────────────────────────────
children.push(h2('F.9  Key Compliance Principles'));
const principles = [
  ['Substance over form', 'Regulatory obligations attach to the economic and legal reality of fund operations, not just their documented structure. A Cayman master fund with a US-only investor base may nonetheless trigger Form PF, ERISA plan asset, and FATCA obligations.'],
  ['Jurisdiction layering', 'A single capital call may trigger filing obligations in multiple jurisdictions simultaneously: US (Form PF data, K-1 input), Cayman (FATCA/CRS account reporting), and EU (AIFMD investor concentration data). The data model must capture jurisdiction-tagged fields to support parallel extraction.'],
  ['Deadline clustering', 'The window between 31 March and 31 July is the most intensive regulatory period: Form ADV (March), Form 1065/K-1s (March), Form PF annual (April), CIMA audited accounts (June), FATCA/CRS (July). Fund administrators typically require LP data inputs by February to meet this schedule.'],
  ['Investor classification as a prerequisite', 'FATCA status, CRS tax residency, ERISA plan investor status, and AIFMD investor type must all be resolved at onboarding — before the first capital call — because errors cascade into regulatory filings, withholding rates, and plan asset tests.'],
  ['AML as continuous obligation', 'Unlike periodic filings, AML/KYC is a continuous control. Investor records must be flagged for periodic refresh (typically every 1–3 years depending on risk rating) and on trigger events such as change of UBO, change of jurisdiction, or adverse news screening hits.'],
];

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tblBorders,
  rows: [
    new TableRow({ tableHeader: true, children: [hdrCell('Principle', 22), hdrCell('Implication for Data Model and Operations', 78)] }),
    ...principles.map(r => new TableRow({ children: [cellBold(r[0],22), cell(r[1],78)] }))
  ]
}));
children.push(spacer());

// ═══════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════════════════════════════════
const doc = new Document({
  sections: [{
    properties: {},
    children,
  }]
});

const { Packer } = require('docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/tmp/appendix_f.docx', buf);
  console.log('appendix_f.docx written');
});
