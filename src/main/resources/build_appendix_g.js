const { Document, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, WidthType, BorderStyle, AlignmentType, ShadingType, PageBreak } = require('docx');
const fs = require('fs');

const NAVY='1F3864', GOLD='B8860B', SLATE='404040', WHITE='FFFFFF',
      LGREY='F2F2F2', MGREY='D9D9D9', GREEN='375623', BLUE='2F5496',
      RED='C00000', AMBER='C55A11', PURPLE='7030A0';

const h1 = t => new Paragraph({ text:t, heading:HeadingLevel.HEADING_1, spacing:{before:480,after:160} });
const h2 = t => new Paragraph({ text:t, heading:HeadingLevel.HEADING_2, spacing:{before:320,after:120} });
const h3 = t => new Paragraph({
  spacing:{before:200,after:80},
  children:[new TextRun({text:t,size:24,bold:true,color:NAVY,font:'Calibri'})]
});
const body = t => new Paragraph({
  spacing:{before:0,after:120},
  children:[new TextRun({text:t,size:22,color:SLATE,font:'Calibri'})]
});
const bullet = t => new Paragraph({
  spacing:{before:0,after:80}, bullet:{level:0},
  children:[new TextRun({text:t,size:21,color:SLATE,font:'Calibri'})]
});
const bullet2 = t => new Paragraph({
  spacing:{before:0,after:60}, bullet:{level:1},
  children:[new TextRun({text:t,size:20,color:SLATE,font:'Calibri'})]
});
const spacer = () => new Paragraph({spacing:{before:0,after:160},children:[new TextRun('')]});
const pageBreak = () => new Paragraph({children:[new PageBreak()]});

const tblBorders = {
  top:   {style:BorderStyle.SINGLE,size:4,color:MGREY},
  bottom:{style:BorderStyle.SINGLE,size:4,color:MGREY},
  left:  {style:BorderStyle.SINGLE,size:4,color:MGREY},
  right: {style:BorderStyle.SINGLE,size:4,color:MGREY},
  insideH:{style:BorderStyle.SINGLE,size:4,color:MGREY},
  insideV:{style:BorderStyle.SINGLE,size:4,color:MGREY},
};

const hdr = (t,w) => new TableCell({
  width:{size:w,type:WidthType.PERCENTAGE},
  shading:{fill:NAVY,type:ShadingType.CLEAR,color:NAVY},
  margins:{top:60,bottom:60,left:80,right:80},
  children:[new Paragraph({alignment:AlignmentType.CENTER,
    children:[new TextRun({text:t,size:18,bold:true,color:WHITE,font:'Calibri'})]})]
});

const hdrCol = (t,w,fill=NAVY) => new TableCell({
  width:{size:w,type:WidthType.PERCENTAGE},
  shading:{fill,type:ShadingType.CLEAR,color:fill},
  margins:{top:60,bottom:60,left:80,right:80},
  children:[new Paragraph({
    children:[new TextRun({text:t,size:18,bold:true,color:WHITE,font:'Calibri'})]})]
});

const cell = (t,w) => new TableCell({
  width:{size:w,type:WidthType.PERCENTAGE},
  margins:{top:50,bottom:50,left:80,right:80},
  children:[new Paragraph({children:[new TextRun({text:t,size:19,color:SLATE,font:'Calibri'})]})]
});

const cellB = (t,w,color=NAVY) => new TableCell({
  width:{size:w,type:WidthType.PERCENTAGE},
  margins:{top:50,bottom:50,left:80,right:80},
  children:[new Paragraph({children:[new TextRun({text:t,size:19,bold:true,color,font:'Calibri'})]})]
});

const cellShade = (t,w,fill=LGREY,color=NAVY,bold=true) => new TableCell({
  width:{size:w,type:WidthType.PERCENTAGE},
  shading:{fill,type:ShadingType.CLEAR,color:fill},
  margins:{top:50,bottom:50,left:80,right:80},
  children:[new Paragraph({children:[new TextRun({text:t,size:19,bold,color,font:'Calibri'})]})]
});

// Multi-bullet cell helper
const cellBullets = (items, w) => new TableCell({
  width:{size:w,type:WidthType.PERCENTAGE},
  margins:{top:50,bottom:50,left:80,right:80},
  children: items.map(it => new Paragraph({
    spacing:{before:0,after:40},
    bullet:{level:0},
    children:[new TextRun({text:it,size:18,color:SLATE,font:'Calibri'})]
  }))
});

// ═══════════════════════════════════════════════════════════════════════
// PHASE DATA — activities + key participants + reporting + data objects
// ═══════════════════════════════════════════════════════════════════════
const PHASES = [
  {
    num:'G.1', phase:'Origination & Opportunity Management', color:AMBER,
    overview:'The lifecycle begins when a relationship manager identifies a prospective LP investor. The opportunity is logged in the CRM and tracked through a defined state machine until it reaches a terminal state (Won, Declined, or Withdrawn). Effective origination determines the quality of the LP base for the fund\'s lifetime.',
    activities:[
      'Prospect identification — sourcing via direct relationships, placement agents, capital introduction events, and third-party intermediaries',
      'Initial outreach and pitch — investor presentation, strategy overview, fund terms summary',
      'Soft circle — informal expression of interest; investor indicates a range but no binding commitment',
      'Indicative indication — investor provides a specific indicative amount in writing',
      'Docs Out — subscription documents, PPM, LPA, and side letter draft sent to investor',
      'Signed — investor returns executed subscription agreement and ancillary KYC/AML documents',
      'Won — investor admitted at a fund close; commitment formalised',
      'Terminal states — Withdrawn (investor self-withdraws), Declined (fund declines investor), OnHold (timing pause)',
    ],
    participants:['Relationship Manager (IR/BD)','Placement Agent (if applicable)','Legal Counsel','Compliance / KYC team','Fund CFO'],
    keyDataObjects:['pe:Opportunity','pe:OpportunityStateTransition','pe:CoverageAssignment','pe:Investor'],
    reporting:[
      'Pipeline summary — count and indicative AUM by stage',
      'Opportunity aging report — days in each state, SLA breach flags',
      'Win/loss analysis — conversion rate by investor type, strategy, and RM',
      'Relationship manager attribution and coverage report',
      'Soft circle vs. committed gap analysis per fund / close',
    ],
    dataFlow:'CRM / IR system → Opportunity entity → State machine transitions → Commitment entity on Won',
  },
  {
    num:'G.2', phase:'Fund Structuring & Launch', color:'1F5C2E',
    overview:'Legal counsel and the GP structure the fund hierarchy to accommodate US taxable, US tax-exempt, and non-US investors through separate feeder entities pooling into a master fund. The GP also establishes the economic terms (management fee, carry, preferred return) and the fund close structure.',
    activities:[
      'Legal entity formation — Master Fund (Cayman ELP), Domestic Feeder (Delaware LP), Offshore Feeder (Cayman ELP)',
      'LPA / PPM drafting — economic terms: management fee, carried interest, preferred return, clawback, key-person provision',
      'GP commitment documentation — GP co-invest alongside LPs, typically 1–2% of total commitments',
      'Regulatory registration — SEC Form D (Reg D exemption), Form ADV update, CIMA fund registration',
      'Fund close structure — number of closes, subscription deadlines, equalization mechanics for late closers',
      'Side letter framework — MFN clause, ERISA representations, transparency rights, fee discount triggers',
      'Service provider appointments — fund administrator, auditor, legal counsel, transfer agent, custodian',
      'Bank account opening — separate accounts per feeder and main fund for capital call and distribution wires',
    ],
    participants:['General Partner / Management Company','Legal Counsel','Fund Administrator','Tax Counsel','Placement Agent'],
    keyDataObjects:['pe:Fund','pe:Vehicle','pe:Feeder','pe:Offering','pe:FundClose'],
    reporting:[
      'Fund terms summary sheet — fee, carry, hurdle, hard cap, term by fund',
      'Legal entity org chart — Master / Feeder hierarchy with ownership %',
      'Regulatory filing tracker — Form D, CIMA, ADV status and deadlines',
      'Side letter obligation registry — investor-specific terms and triggered rights',
      'Service provider contract register',
    ],
    dataFlow:'Fund entity → Vehicle / Feeder entities → Offerings per vehicle → Fund closes defined',
  },
  {
    num:'G.3', phase:'Fundraising & Subscriptions', color:BLUE,
    overview:'With fund documents in place, the GP formally markets the fund to prospective LPs. Each investor must complete KYC/AML onboarding, execute a subscription agreement, and receive confirmation of admission at a fund close. Investor eligibility, ERISA status, and feeder routing are determined at this stage.',
    activities:[
      'Distribution of offering documents — PPM, subscription agreement, LP questionnaire, KYC forms',
      'Investor onboarding — KYC/AML screening, beneficial ownership verification, OFAC/sanctions screening',
      'Tax form collection — W-9 (US taxable), W-8BEN-E (foreign entity), W-8EXP (tax-exempt)',
      'FATCA / CRS classification — classify each investor as FFI, NFFE, US Person, or Exempt',
      'ERISA analysis — determine plan investor status; track 25% plan asset test per fund',
      'Side letter negotiation and execution — investor-specific concessions documented',
      'Subscription processing — subscription amount, feeder vehicle assignment, close allocation',
      'Investor admitted at fund close — commitment date = close date (pe:admittedAt)',
      'Equalization calculation for late closers — called % × committed × eq. rate × time fraction',
      'Capital account opening — transfer agent creates LP record, issues interest / unit allocation',
    ],
    participants:['IR / Business Development','Legal Counsel','Compliance / KYC','Transfer Agent','Fund Administrator'],
    keyDataObjects:['pe:Commitment','pe:FundClose','pe:Offering','pe:Investor (regulatory fields)'],
    reporting:[
      'Fundraising progress vs. target / hard cap (by fund, by close)',
      'Subscription pipeline by investor and close deadline',
      'KYC / AML status dashboard — approved, pending, refresh due, PEP flags',
      'ERISA plan asset utilization — % benefit plan investor per fund',
      'Close economics summary — investors admitted, aggregate commitments, equalization collected',
      'Placement agent fee accrual and payment schedule',
    ],
    dataFlow:'Opportunity (Won) → Commitment → FundClose admission → CapitalAccount created at Transfer Agent',
  },
  {
    num:'G.4', phase:'Capital Calls', color:NAVY,
    overview:'When the GP identifies an investment opportunity or needs to cover fund expenses, it issues a capital call. The call is pro-rated across all LP commitments in proportion to each LP\'s committed amount. Feeders aggregate their LP proceeds and remit to the Main Fund.',
    activities:[
      'Investment Committee (IC) approval of the capital deployment or expense requiring a call',
      'Calculate total call amount and pro-rata allocation per LP commitment (call % × committed amount)',
      'Issue capital call notice to each LP — due date typically T+10 business days',
      'Monitor incoming wires — reconcile expected vs. received amounts daily until settlement',
      'Follow up on late / missing payments — default notices if LP fails to fund by due date',
      'Feeder-level aggregation — each feeder sweeps LP proceeds into feeder account',
      'Feeder remittance to Main Fund — feeder wires aggregate proceeds to Main Fund account (T+1 after settlement)',
      'Unfunded commitment update — reduce each LP\'s remaining unfunded balance',
      'Management fee call — quarterly management fee billed via capital call or separately invoiced',
    ],
    participants:['Fund Administrator','Transfer Agent','Controller / CFO','Relationship Manager','Legal (default notices)'],
    keyDataObjects:['pe:CapitalCall','pe:CapitalCallNotice','pe:Commitment (unfunded balance)'],
    reporting:[
      'Capital call notice register — notice ID, investor, amount due, due date, payment status',
      'Outstanding / overdue notices — aging by days past due, default risk flags',
      'Cash flow forecast — expected wire receipts by settlement date',
      'Cumulative called % per fund and per LP (vs. commitment)',
      'Unfunded commitment schedule — remaining dry powder by fund and investor',
      'Failed payment / default tracking report',
    ],
    dataFlow:'CapitalCall (fund level) → CapitalCallNotice (per LP) → Wire receipt → Feeder remittance → Main Fund',
  },
  {
    num:'G.5', phase:'Fund Administration & Transfer Agent Processing', color:'4472C4',
    overview:'Post capital call, the fund administrator and transfer agent record all GL journal entries at both feeder and main fund levels. The transfer agent maintains the official register of LP interests, updates unit balances, and produces LP capital account statements. NAV is calculated quarterly.',
    activities:[
      'Feeder GL: DR Capital Call Receivable / CR Contributions Payable — on call date',
      'Feeder GL: DR Cash / CR Capital Call Receivable — on settlement date (wire received)',
      'Feeder GL: DR Investment in Main Fund / CR Cash — on remittance to Main Fund',
      'Main Fund GL: DR Cash / CR LP Capital Account — on receipt of feeder remittance',
      'Main Fund GL: DR Portfolio Investment — Cost / CR Cash — on portfolio deployment',
      'Transfer agent unit register update — LP interests recalculated post each call',
      'Equalization entries — redistribute equalization proceeds to existing LPs',
      'Quarterly NAV calculation — mark portfolio companies to fair value (Level 2 / Level 3)',
      'LP capital account statement production — per LP, per feeder, per quarter',
      'Management fee accrual and billing — calculated on committed or invested capital per LPA',
      'Expense allocation — fund expenses pro-rated to LPs per their ownership percentage',
      'Annual audit — GAAP / IFRS financial statements, schedule of investments, auditor sign-off',
    ],
    participants:['Fund Administrator (Citco, SS&C, etc.)','Transfer Agent (State Street, etc.)','Auditor','Controller / CFO'],
    keyDataObjects:['pe:Transaction (GL entries)','pe:CapitalCallNotice','pe:Commitment','pe:NAV'],
    reporting:[
      'GL trial balance — by fund entity (feeder and main fund), by period',
      'Cash reconciliation — expected vs. received wires, open items',
      'Unit / interest register — LP ownership %, units held, cost basis',
      'LP capital account statement — contributions, distributions, NAV, unrealised G/L',
      'Feeder-to-Main Fund remittance reconciliation',
      'Management fee accrual and billing report',
      'Expense allocation report — by fund, by LP pro-rata share',
      'Quarterly NAV report — by portfolio company, by fund, by LP',
      'Annual financial statements — Balance Sheet, P&L, Cash Flow Statement',
    ],
    dataFlow:'CapitalCallNotice → 5 GL entries per notice → NAV update → LP capital account statement',
  },
  {
    num:'G.6', phase:'Investment & Portfolio Deployment', color:GREEN,
    overview:'The Main Fund deploys the called capital into portfolio companies through acquisitions, co-investments, or credit facilities. Each investment is recorded at cost and subsequently marked to fair value each quarter. The GP\'s Investment Committee monitors pacing against the fund\'s commitment period.',
    activities:[
      'Source and evaluate investment opportunities — IC memo, due diligence, legal review',
      'Investment Committee approval — final approval with investment thesis, entry valuation, structure',
      'Legal execution — SPA / credit agreement / co-invest side letter signed',
      'Funding wire to portfolio company or borrower',
      'Cost basis recording — DR Portfolio Investment — Cost / CR Cash at Main Fund',
      'Purchase price allocation (PPA) — allocate purchase price to tangible and intangible assets',
      'Monitoring plan — board representation, information rights, quarterly reporting from portfolio company',
      'Add-on acquisitions — follow-on capital calls for bolt-on acquisitions or capital injections',
      'Co-investment management — allocate co-invest opportunities to eligible LPs or third parties',
    ],
    participants:['Investment / Deal Team','Investment Committee','Legal Counsel (external)','Portfolio Company Management'],
    keyDataObjects:['pe:PortfolioCompany','pe:Investment','pe:CoInvestment','pe:FundTransaction'],
    reporting:[
      'Investment pacing report — deployed vs. target, by period and by commitment period year',
      'Portfolio company acquisition summary — cost, structure, ownership %, deal type',
      'Commitment period utilization — % of commitments deployed vs. period-end deadline',
      'Co-investment allocation report — LP participation alongside main fund',
      'Deal sourcing and IC approval log',
      'Portfolio concentration report — by sector, geography, holding size',
    ],
    dataFlow:'IC approval → Wire → Portfolio Investment (cost) recorded → Quarterly fair value marks applied',
  },
  {
    num:'G.7', phase:'Portfolio Monitoring & Reporting', color:'2F5496',
    overview:'Throughout the fund\'s life the GP monitors each portfolio company, produces quarterly and annual LP reports, and marks investments to fair value. Performance metrics (IRR, TVPI, DPI, RVPI) are calculated at fund and portfolio company level. ILPA-standard reporting is delivered to all LPs.',
    activities:[
      'Quarterly valuation — Level 2 or Level 3 fair value assessment per portfolio company',
      'Performance attribution — gross IRR and MOIC per deal; net IRR, TVPI, DPI, RVPI at fund level',
      'GP quarterly letter — narrative update on portfolio, market conditions, pipeline',
      'ILPA-format quarterly report — financial statements, schedule of investments, capital account activity',
      'Annual audit — GAAP / IFRS financial statements; auditor issues signed opinion',
      'LP advisory committee (LPAC) meetings — approval of conflicts, extensions, valuation policies',
      'ESG / impact reporting — sustainability metrics for Article 8/9 funds or LP-mandated reporting',
      'Benchmark comparison — fund performance vs. Cambridge, Preqin, or custom peer group',
      'Bridge facility monitoring — subscription line drawdowns, repayment schedule, covenant compliance',
    ],
    participants:['Portfolio Management / Value Creation team','Finance / Accounting','IR','External Auditor','Valuation Specialist'],
    keyDataObjects:['pe:PortfolioCompany (FMV)','pe:FundNAV','pe:PerformanceMetrics','pe:LPReport'],
    reporting:[
      'ILPA quarterly report — schedule of investments, capital account activity, financial statements',
      'NAV per unit / LP interest — by feeder and main fund',
      'IRR / TVPI / DPI / RVPI — at fund, vintage, and portfolio company level',
      'LP capital account statement — YTD contributions, distributions, ending NAV',
      'Annual financial statements — full GAAP / IFRS package with auditor opinion',
      'Benchmark performance report — fund vs. Cambridge Associates / Preqin quartile',
      'ESG / impact metrics report — per SFDR or LP mandate',
      'Bridge facility utilisation — outstanding balance, available capacity, days outstanding',
    ],
    dataFlow:'Portfolio company financials → Fair value → Fund NAV → LP capital accounts → ILPA reports',
  },
  {
    num:'G.8', phase:'Fund Closes — Equalization', color:PURPLE,
    overview:'In a multi-close fund structure, LPs admitted at a later close must pay equalization so that all LPs are treated as if they invested at the first close. Equalization is calculated as the late LP\'s pro-rata share of prior called capital, plus a preferred return on that amount for the period between closes.',
    activities:[
      'Determine equalization amount per late LP: Eq = Committed × Prior Called% × Eq Rate × (Days / 365)',
      'Issue equalization notice alongside the first capital call notice to the late LP',
      'Collect equalization proceeds via wire on or before close date',
      'Redistribute equalization proceeds to existing LPs in proportion to their capital accounts',
      'Adjust all LP capital accounts to reflect equalization receipt and redistribution',
      'Transfer agent updates unit register — late LP receives units priced to reflect prior NAV plus equalization',
      'Produce revised close economics summary — total committed at each close, equalization collected, aggregate',
    ],
    participants:['Fund Administrator','Transfer Agent','Legal Counsel','Controller'],
    keyDataObjects:['pe:FundClose','pe:Commitment (equalization_amount)','pe:CapitalCallNotice'],
    reporting:[
      'Equalization calculation workpaper — per late-closing LP: called%, rate, time, amount',
      'Equalization redistribution report — existing LP shares of eq proceeds',
      'Revised LP capital account statements post-equalization',
      'Close economics summary — total committed, equalization collected, cumulative called per close',
    ],
    dataFlow:'FundClose → late LPs flagged → Equalization notice → Proceeds redistributed → Capital accounts adjusted',
  },
  {
    num:'G.9', phase:'Realization & Exit', color:RED,
    overview:'When a portfolio company is mature or the market conditions are favourable, the GP executes an exit — typically via trade sale, secondary sale, recapitalization, or IPO. Proceeds flow from the portfolio company through the Main Fund to feeders and ultimately to LPs.',
    activities:[
      'Exit decision — IC approval of exit strategy, timeline, and price expectation',
      'M&A / IPO process — engage investment bank, run sale process or IPO preparation',
      'Legal execution — SPA or underwriting agreement signed; conditions to close satisfied',
      'Proceeds received at Main Fund — DR Cash / CR Portfolio Investment (cost + gain)',
      'Realized gain / loss recorded — gross return vs. cost basis; carried interest trigger assessment',
      'Recapitalization — partial realisation; balance sheet restructuring distributes proceeds while retaining ownership',
      'Tax analysis — characterize gain (ordinary vs. capital, short vs. long-term) for each LP\'s jurisdiction',
      'Distribution notice calculation — proceeds allocated to each LP pro-rata; waterfall applied',
    ],
    participants:['Investment / Deal Team','Investment Bank (sell-side)','Legal Counsel','Tax Counsel','Finance'],
    keyDataObjects:['pe:Exit','pe:RealisedInvestment','pe:DistributionCalculation'],
    reporting:[
      'Realized investment summary — exit proceeds, cost basis, realized G/L, holding period',
      'MOIC and gross IRR per deal',
      'Exit proceeds allocation by feeder and LP',
      'Tax lot / holding period report for LP K-1 preparation',
      'Carry trigger analysis — has preferred return threshold been met?',
    ],
    dataFlow:'Exit proceeds → Main Fund cash → Distribution calculation → Feeder wires → LP distributions',
  },
  {
    num:'G.10', phase:'Distributions & Waterfall', color:GOLD,
    overview:'Distribution proceeds are allocated according to the waterfall defined in the LPA. The standard PE waterfall returns capital first, then pays the preferred return to LPs, then the GP catch-up, then carried interest. Each distribution requires a formal notice and wire to LP bank accounts.',
    activities:[
      'Waterfall calculation — apply distribution waterfall per LPA: (1) Return of Capital, (2) Preferred Return, (3) GP Catch-Up, (4) Carried Interest split',
      'Clawback assessment — calculate whether GP has over-received carry relative to final fund economics',
      'Distribution notice issuance — per LP amount, payment date, bank wire details, tax characterization',
      'Wire execution — fund administrator initiates wires from Main Fund → Feeders → LP bank accounts',
      'Transfer agent unit cancellation / NAV update — post-distribution LP interest balance reduced',
      'Tax characterization — ordinary income, short-term capital gain, long-term capital gain, return of capital',
      'DPI update — cumulative distributed / paid-in updated for all performance reporting',
    ],
    participants:['Controller / CFO','Fund Administrator','Transfer Agent','Tax Counsel','LP Relations'],
    keyDataObjects:['pe:Distribution','pe:WaterfallCalculation','pe:CarryAccrual','pe:ClawbackReserve'],
    reporting:[
      'Waterfall calculation workpaper — step-by-step with amounts at each tier',
      'Carry accrual and earned-to-date report',
      'Clawback exposure report — potential GP obligation if exits disappoint',
      'LP distribution notice — amount, wire details, tax characterization per LP',
      'Distribution history per LP — all distributions since inception by type',
      'DPI progression over fund life — cumulative distributed / paid-in',
      'Tax distribution report — ordinary income, capital gains, UBTI per LP',
    ],
    dataFlow:'Exit proceeds → Waterfall calculation → Distribution notices → LP wires → Tax reporting',
  },
  {
    num:'G.11', phase:'Fund Wind-Down & Dissolution', color:SLATE,
    overview:'After the commitment period expires and substantially all investments have been realised, the GP winds down the fund. This involves final audits, tax reporting, GP clawback true-up, and dissolution of all fund entities.',
    activities:[
      'Commitment period expiry — formal close of investment period; no new investments except approved follow-ons',
      'Fund term extensions — LP advisory committee vote for 1–2 year extensions if unrealised assets remain',
      'Final portfolio realization — sell remaining holdings; wind down any restructured positions',
      'Final audit — GAAP / IFRS financial statements; sign-off by independent auditor',
      'Final LP capital account reconciliation — confirm all LPs reach zero net funded balance after final distributions',
      'GP clawback true-up — if GP received excess carry over fund life, repay difference to LPs',
      'Final tax reporting — last-year Form 1065, K-1 to all LPs; PFIC final statements; state returns',
      'Fund entity dissolution — file dissolution / winding-up with Cayman Registry, Delaware SOS',
      'Regulatory de-registration — Form ADV update (remove fund), CIMA de-registration, AIFMD notification',
    ],
    participants:['GP / Managing Partner','Legal Counsel','Auditor','Tax Counsel','Fund Administrator','LP Advisory Committee'],
    keyDataObjects:['pe:Fund (status: WindingDown → Dissolved)','pe:FinalDistribution','pe:ClawbackSettlement'],
    reporting:[
      'Final portfolio realization summary — all exits, proceeds, G/L, holding periods',
      'Terminal fund performance report — final net IRR, TVPI, DPI (all 1.00x RVPI)',
      'GP clawback true-up calculation and settlement record',
      'Final LP capital account reconciliation — zero balance confirmation per LP',
      'Final tax package — Form 1065, K-1 per LP, PFIC statements',
      'Fund dissolution timeline and entity liquidation tracker',
      'Regulatory de-registration confirmation log',
    ],
    dataFlow:'Final exits → Clawback calculation → Final distributions → Entity dissolution → Regulatory de-registration',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// CROSS-CUTTING REPORTS
// ═══════════════════════════════════════════════════════════════════════
const CROSSCUT = [
  ['AUM Report','CFO / COO','Monthly','Committed, invested, and NAV-based AUM by strategy, fund, and vintage year'],
  ['Dry Powder Report','CFO / COO','Monthly','Unfunded commitments available to call across all active funds'],
  ['Vintage Year Performance Benchmarking','Investment / IR','Quarterly','Fund IRR, TVPI, DPI vs. Cambridge, Preqin, or custom peer set by vintage'],
  ['LP Relationship CRM Report','IR / BD','Monthly','Touchpoints, meetings, open commitments, side letter obligations per LP'],
  ['Fee & Carry Revenue Forecast','Finance','Quarterly','Management fee run-rate and carried interest pipeline; clawback reserve'],
  ['ERISA Plan Asset Dashboard','Compliance','Quarterly','% benefit plan investor per fund; proximity to 25% threshold'],
  ['FATCA / CRS Compliance Dashboard','Tax / Compliance','Annual / Event','Investor classifications, reporting status, W-8 expiry tracking'],
  ['Regulatory Filing Calendar','Compliance','Ongoing','All jurisdiction deadlines; filed / due / overdue status (see Appendix F)'],
  ['GP Commitment Pacing','Finance','Quarterly','GP co-invest funded vs. committed; pari passu treatment verification'],
  ['Bridge Facility Utilisation','Treasury / Finance','Weekly','Subscription line drawdowns, repayments, available capacity, covenant compliance'],
  ['ESG / Impact Dashboard','ESG / IR','Annual','PAI indicators, portfolio company ESG scores, SFDR Article 8/9 metrics'],
];

// ═══════════════════════════════════════════════════════════════════════
// LIFECYCLE SUMMARY TABLE (one row per phase)
// ═══════════════════════════════════════════════════════════════════════
const SUMMARY = [
  ['G.1','Origination','CRM / IR','Opportunity, Investor','Win/Loss, Pipeline Funnel','Prospect → Won / Declined'],
  ['G.2','Fund Structuring','Legal / Finance','Fund, Vehicle, Feeder, Offering','Terms Sheet, Entity Map','One-time at fund launch'],
  ['G.3','Fundraising','IR / Legal / KYC','Commitment, FundClose','Fundraising Progress, KYC Status','Per close; multi-close possible'],
  ['G.4','Capital Calls','Fund Admin / TA','CapitalCall, Notice','Call Schedule, Overdue Tracker','Per investment / expense need'],
  ['G.5','Fund Administration','Fund Admin / TA / Audit','Transaction (GL)','Trial Balance, LP Stmt, NAV','Continuous; quarterly NAV'],
  ['G.6','Deployment','Deal Team / IC','PortfolioInvestment','Pacing Report, Concentration','Per IC approval'],
  ['G.7','Portfolio Monitoring','Portfolio Mgmt / Finance','FundNAV, LPReport','ILPA Report, Benchmarks','Quarterly; annual audit'],
  ['G.8','Equalization','Fund Admin / TA','FundClose, Eq. Notice','Eq. Workpaper, Close Summary','Per later fund close'],
  ['G.9','Realization / Exit','Deal Team / Finance','Exit, RealisedInv.','Exit Summary, MOIC, IRR','Per portfolio company exit'],
  ['G.10','Distributions','Finance / TA','Distribution, Waterfall','Waterfall Calc., DPI Report','Per exit or periodic income'],
  ['G.11','Wind-Down','GP / Legal / Tax','Fund (Dissolved)','Final Audit, Clawback Calc.','Final phase of fund life'],
];

// ═══════════════════════════════════════════════════════════════════════
// BUILD CHILDREN
// ═══════════════════════════════════════════════════════════════════════
const children = [];

children.push(h1('Appendix G — Full PE Fund Lifecycle'));
children.push(body('This appendix documents the end-to-end operational lifecycle of a private equity fund from origination of LP investor relationships through final dissolution. For each of the eleven phases the appendix defines the key activities, participants, data objects, and reporting outputs. The lifecycle maps directly to the data model described in Appendices A–E and the regulatory obligations set out in Appendix F.'));
children.push(spacer());

// ── G.0 LIFECYCLE OVERVIEW TABLE ─────────────────────────────────────
children.push(h2('G.0  Lifecycle at a Glance'));
children.push(body('The table below summarises all eleven phases, the primary system of record, the key data objects created, the headline reports, and the cadence of each phase.'));
children.push(spacer());

children.push(new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  borders:tblBorders,
  rows:[
    new TableRow({tableHeader:true, children:[
      hdr('Phase',5), hdr('Name',13), hdr('Primary Owner',13),
      hdr('Key Data Objects',16), hdr('Headline Reports',25), hdr('Cadence',15)
    ]}),
    ...SUMMARY.map((r,i) => new TableRow({ children:[
      cellShade(r[0],5,'E8ECF4',NAVY,true),
      cellB(r[1],13),
      cell(r[2],13),
      cell(r[3],16),
      cell(r[4],25),
      cell(r[5],15),
    ]}))
  ]
}));
children.push(spacer());
children.push(pageBreak());

// ── PHASE SECTIONS ────────────────────────────────────────────────────
for (const p of PHASES) {
  children.push(h2(`${p.num}  ${p.phase}`));
  children.push(body(p.overview));
  children.push(spacer());

  // Activities + Participants side-by-side table
  children.push(new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    borders:tblBorders,
    rows:[
      new TableRow({tableHeader:true, children:[
        hdrCol('Key Activities',65,p.color),
        hdrCol('Participants',20,SLATE),
        hdrCol('Data Objects',15,NAVY),
      ]}),
      new TableRow({ children:[
        cellBullets(p.activities, 65),
        cellBullets(p.participants, 20),
        cellBullets(p.keyDataObjects, 15),
      ]})
    ]
  }));
  children.push(spacer());

  // Reporting outputs
  children.push(h3('Reporting Outputs'));
  children.push(new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    borders:tblBorders,
    rows:[
      new TableRow({tableHeader:true, children:[
        hdr('Report / Output',50), hdr('Data Flow',50)
      ]}),
      new TableRow({ children:[
        cellBullets(p.reporting, 50),
        cell(p.dataFlow, 50),
      ]})
    ]
  }));
  children.push(spacer());
  children.push(pageBreak());
}

// ── G.12 CROSS-CUTTING REPORTS ────────────────────────────────────────
children.push(h2('G.12  Cross-Cutting Firm-Level Reports'));
children.push(body('The following reports span multiple lifecycle phases and are typically produced by the CFO or COO office. They aggregate data across all funds and strategies to give senior management a firm-wide view.'));
children.push(spacer());

children.push(new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  borders:tblBorders,
  rows:[
    new TableRow({tableHeader:true, children:[
      hdr('Report',28), hdr('Owner',16), hdr('Frequency',12), hdr('Content',44)
    ]}),
    ...CROSSCUT.map(r => new TableRow({ children:[
      cellB(r[0],28), cell(r[1],16), cell(r[2],12), cell(r[3],44)
    ]}))
  ]
}));
children.push(spacer());

// ── G.13 DATA MODEL LINKAGE ───────────────────────────────────────────
children.push(h2('G.13  Data Object Lifecycle Linkage'));
children.push(body('The diagram below shows how the core data objects created in each phase reference and depend on one another. Each arrow represents a foreign-key relationship or state transition in the underlying ontology.'));
children.push(spacer());

const linkageRows = [
  ['Investor','Created at origination','Referenced by Opportunity, Commitment, CapitalCallNotice, Distribution, Tax K-1'],
  ['Opportunity','Created at origination; transitions through 9 states','Resolved to Commitment on Won; archived on Declined/Withdrawn'],
  ['Fund','Created at fund structuring','Parent of Vehicle, FundClose, CapitalCall, Distribution, PortfolioInvestment'],
  ['Vehicle / Feeder','Created at fund structuring','Parent of Offering; referenced by Commitment and CapitalCallNotice'],
  ['Offering','Created at fund structuring','Referenced by Commitment; defines share class and economic terms'],
  ['FundClose','Created at fund structuring; dated on admission','Referenced by Commitment (admittedAt); triggers equalization calculation'],
  ['Commitment','Created on investor admission at FundClose','Source for CapitalCallNotice (pro-rata), Distribution, LP Capital Account'],
  ['CapitalCall','Created per fund-level call decision','Parent of CapitalCallNotice per LP commitment'],
  ['CapitalCallNotice','Created per (Commitment × CapitalCall)','Triggers 5 GL Transaction entries; updates Commitment.unfunded_balance'],
  ['Transaction','Created by fund admin per notice','Feeds GL trial balance, cash reconciliation, LP capital account statement'],
  ['PortfolioInvestment','Created on capital deployment','Holds cost basis; updated quarterly to FMV; resolved on Exit'],
  ['Exit / Distribution','Created on realisation','Triggers Waterfall calculation; parent of Distribution notices to LPs'],
];

children.push(new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  borders:tblBorders,
  rows:[
    new TableRow({tableHeader:true, children:[hdr('Data Object',20), hdr('Lifecycle Phase Created',25), hdr('Downstream Dependencies / References',55)]}),
    ...linkageRows.map(r => new TableRow({ children:[cellB(r[0],20), cell(r[1],25), cell(r[2],55)] }))
  ]
}));
children.push(spacer());

// ── G.14 LIFECYCLE TIMELINE ───────────────────────────────────────────
children.push(h2('G.14  Indicative Fund Timeline'));
children.push(body('The table below shows the approximate timing of each lifecycle phase for a 10-year closed-end PE fund with a 5-year commitment period, assuming Fund Vintage Year = Year 1.'));
children.push(spacer());

const timelineRows = [
  ['G.1','Origination','Year -1 to Year 1','Ongoing through final close; peaks during fundraising period'],
  ['G.2','Fund Structuring','Year -1 to Month -3','Completed before first close; amendments possible through final close'],
  ['G.3','Fundraising / Subscriptions','Year 1 (First Close) to Year 1+6m (Final Close)','Multi-close process; late LPs pay equalization'],
  ['G.4','Capital Calls','Year 1 to Year 5–6 (commitment period)','Typically 4–8 calls over commitment period; management fee calls ongoing'],
  ['G.5','Fund Administration','Year 1 to Year 10+ (continuous)','Ongoing; quarterly NAV; annual audit; LP statements quarterly'],
  ['G.6','Deployment','Year 1 to Year 5 (commitment period)','Must deploy substantially all committed capital before period end'],
  ['G.7','Portfolio Monitoring','Year 1 to Year 8–10','Quarterly valuation; annual audit; ILPA reports every quarter'],
  ['G.8','Equalization','Year 1 to Final Close (Year 1+6m)','Applies only to LPs admitted after First Close'],
  ['G.9','Realization / Exit','Year 3 to Year 8–10','Exits begin after seasoning period; concentrated in Years 5–8'],
  ['G.10','Distributions','Year 4 to Year 10+','Distributions follow exits; DPI builds from Year 4 onwards'],
  ['G.11','Wind-Down / Dissolution','Year 8 to Year 10+','Can be extended by LPAC vote; final dissolution after last exit'],
];

children.push(new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  borders:tblBorders,
  rows:[
    new TableRow({tableHeader:true, children:[hdr('Phase',5), hdr('Name',18), hdr('Typical Timing',20), hdr('Notes',57)]}),
    ...timelineRows.map(r => new TableRow({ children:[
      cellShade(r[0],5,'E8ECF4',NAVY,true),
      cellB(r[1],18), cell(r[2],20), cell(r[3],57)
    ]}))
  ]
}));
children.push(spacer());

// ════════════════════════════════════════════════════════════════════════
// BUILD + WRITE
// ════════════════════════════════════════════════════════════════════════
const { Packer } = require('docx');
const doc = new Document({ sections:[{properties:{},children}] });
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/tmp/appendix_g.docx', buf);
  console.log('appendix_g.docx written — ' + buf.length.toLocaleString() + ' bytes');
});
