'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, HeadingLevel, PageBreak
} = require('docx');

// Font sizes are in HALF-points (1pt = 2 units). Spacing/indent is in twips (1pt = 20 twips).
const NAVY='1B2A4A', SLATE='4A5568';
const GREEN_LIGHT='F0FFF4', GREEN_BDR='276749';
const BLUE_LIGHT='EBF8FF',  BLUE_BDR='2B6CB0';
const AMBER_LIGHT='FFFAF0', AMBER_BDR='C05621';
const RED_LIGHT='FFF5F5',   RED_BDR='C53030';
const PURPLE_LIGHT='FAF5FF',PURPLE_BDR='805AD5';

// Use heading styles from original doc (no size override in TextRun)
const h1 = t => new Paragraph({ text:t, heading:HeadingLevel.HEADING_1, spacing:{before:480,after:160} });
const h2 = t => new Paragraph({ text:t, heading:HeadingLevel.HEADING_2, spacing:{before:320,after:120} });
const h3 = t => new Paragraph({
  spacing:{before:200,after:80},
  children:[new TextRun({text:t, size:24, bold:true, color:NAVY, font:'Calibri'})]
});
const body = t => new Paragraph({
  spacing:{before:0,after:120},
  children:[new TextRun({text:t, size:22, color:SLATE, font:'Calibri'})]
});
const bullet = (t,lvl=0) => new Paragraph({
  bullet:{level:lvl},
  spacing:{before:0,after:80},
  children:[new TextRun({text:t, size:22, color:SLATE, font:'Calibri'})]
});
const spacer = (twips=120) => new Paragraph({ spacing:{before:0,after:twips}, children:[] });
const codeLine = t => new Paragraph({
  spacing:{before:0,after:0},
  children:[new TextRun({text:t, font:'Courier New', size:18, color:'1A365D'})]
});

function codeBlock(lines) {
  return new Table({
    width:{size:9200,type:WidthType.DXA},
    borders:{
      top:{style:BorderStyle.SINGLE,size:4,color:BLUE_BDR},
      bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE_BDR},
      left:{style:BorderStyle.SINGLE,size:12,color:BLUE_BDR},
      right:{style:BorderStyle.SINGLE,size:4,color:BLUE_BDR},
      insideH:{style:BorderStyle.NONE},insideV:{style:BorderStyle.NONE}
    },
    rows: lines.map(l => new TableRow({children:[new TableCell({
      shading:{type:ShadingType.CLEAR,color:'auto',fill:'EBF8FF'},
      margins:{top:60,bottom:0,left:180,right:180},
      borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE}},
      children:[codeLine(l)]
    })]}))
  });
}

function callout(title, bodyTxt, fill, border) {
  return new Table({
    width:{size:9200,type:WidthType.DXA},
    borders:{
      top:{style:BorderStyle.SINGLE,size:4,color:border},
      bottom:{style:BorderStyle.SINGLE,size:4,color:border},
      left:{style:BorderStyle.SINGLE,size:20,color:border},
      right:{style:BorderStyle.SINGLE,size:4,color:border},
      insideH:{style:BorderStyle.NONE},insideV:{style:BorderStyle.NONE}
    },
    rows:[new TableRow({children:[new TableCell({
      shading:{type:ShadingType.CLEAR,color:'auto',fill},
      margins:{top:80,bottom:80,left:200,right:200},
      children:[
        new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:title,size:22,bold:true,color:border,font:'Calibri'})]}),
        new Paragraph({spacing:{before:0,after:0},children:[new TextRun({text:bodyTxt,size:22,color:SLATE,font:'Calibri'})]})
      ]
    })]}) ]
  });
}

function tbl(headers, rows, colWidths) {
  const cell = (text, hdr, w) => new TableCell({
    width:{size:w,type:WidthType.DXA},
    shading:{type:ShadingType.CLEAR,color:'auto',fill:hdr?'EDF2F7':'FFFFFF'},
    margins:{top:60,bottom:60,left:120,right:120},
    children:[new Paragraph({children:[new TextRun({text:String(text),size:20,bold:hdr,color:hdr?NAVY:SLATE,font:'Calibri'})]})]
  });
  return new Table({
    width:{size:colWidths.reduce((a,b)=>a+b,0),type:WidthType.DXA},
    columnWidths:colWidths,
    borders:{
      top:{style:BorderStyle.SINGLE,size:4,color:'CBD5E0'},
      bottom:{style:BorderStyle.SINGLE,size:4,color:'CBD5E0'},
      left:{style:BorderStyle.SINGLE,size:4,color:'CBD5E0'},
      right:{style:BorderStyle.SINGLE,size:4,color:'CBD5E0'},
      insideH:{style:BorderStyle.SINGLE,size:2,color:'E2E8F0'},
      insideV:{style:BorderStyle.SINGLE,size:2,color:'E2E8F0'}
    },
    rows:[
      new TableRow({tableHeader:true, children:headers.map((h,i)=>cell(h,true,colWidths[i]))}),
      ...rows.map(r=>new TableRow({children:r.map((c,i)=>cell(c,false,colWidths[i]))}))
    ]
  });
}

const children = [
  new Paragraph({children:[new PageBreak()]}),

  h1('Appendix E  —  Opportunity Pipeline and Fund Assignment'),
  body('This appendix documents the full lifecycle of a fundraising opportunity: from initial prospect identification through the pipeline state machine, to the three conversion routes that admit an investor into the fund hierarchy as a committed LP. It covers data model properties and the SHACL constraints that make the pipeline auditable and attribution-safe.'),
  spacer(120),

  h2('E.1  What Is an Opportunity?'),
  body('An Opportunity is a pipeline object — an investor, an indicative amount, and a target strategy. It sits beside the Product→Fund hierarchy rather than inside it. Because it is pre-award, it must create nothing in the fund data model until the investor is formally admitted at a FundClose. If Opportunities were permitted to create Vehicles or Offerings, every abandoned prospect would leave a permanent stub in the hierarchy.'),
  spacer(80),
  callout('Key Principle — Beside the Hierarchy, Not Inside It','Opportunities reference the hierarchy through typed links (pe:targetProduct, pe:targetFund, pe:targetOffering, pe:targetClose). They never own or contain hierarchy objects. Creation of new hierarchy objects happens only on Routes B and C, and only when the mandate or co-invest allocation is formally approved.',BLUE_LIGHT,BLUE_BDR),
  spacer(200),

  h2('E.2  Opportunity State Machine'),
  body('Every Opportunity moves through a defined state machine. States are mutually exclusive and represent distinct operational gates.'),
  spacer(80),
  tbl(
    ['State','pe:opportunityStatus','Operational meaning','Key gate'],
    [
      ['Prospect','ref:Prospect','Investor identified. No written indication.','Coverage assignment confirmed'],
      ['Soft circle','ref:SoftCircle','Verbal indication of interest. Amount tentative.','RM records verbal confirmation'],
      ['Indicated','ref:Indicated','Written IOI received. Amount confirmed. KYC started.','Written IOI on file; route A/B/C determined'],
      ['Docs out','ref:DocsOut','Subscription documents issued. LP reviewing.','Offering and target FundClose locked'],
      ['Signed','ref:Signed','Sub docs signed by LP. Awaiting admission at FundClose.','Executed sub docs on file'],
      ['Won','ref:Won','LP admitted at a FundClose. pe:Commitment created.','commitmentDate = FundClose.closeDate'],
      ['Withdrawn','ref:Withdrawn','LP withdrew before admission.','Terminal state — record retained'],
      ['Declined','ref:Declined','Process terminated; LP or GP declined.','Terminal state — record retained'],
      ['On hold','ref:OnHold','Process paused. Not terminal.','Resume date recorded'],
    ],
    [1200,1400,3000,2600]
  ),
  spacer(80),
  callout('Warning — Signed ≠ Committed','A signed subscription document does not create a Commitment. Nothing exists in the fund data until the investor is admitted at a FundClose. pe:subscriptionDate is the signature date; pe:commitmentDate is the admission date. These are routinely 2–6 weeks apart. Conflating them causes capital accounts and close records to reflect different moments in time.',AMBER_LIGHT,AMBER_BDR),
  spacer(200),

  h2('E.3  Three Conversion Routes'),
  body('All Opportunities convert to Commitments through one of three routes. The route is determined at the Indicated stage and governs how much of the hierarchy must be built before subscription documents can be issued.'),
  spacer(120),

  h3('Route A — Reuse (subscribe into an existing share class)'),
  body('Applicable when the LP subscribes to an Offering that already exists on an existing Vehicle of an existing Fund. No new hierarchy objects are created. Fastest path — typical elapsed time from Docs Out to admission is 10–14 days.'),
  bullet('pe:targetProduct, pe:targetFund, pe:targetOffering all already exist in the model'),
  bullet('Sub docs issued referencing the exact existing Offering'),
  bullet('LP signs → awaits next FundClose → admitted → pe:Commitment created'),
  spacer(120),

  h3('Route B — Mint (new co-investment vehicle)'),
  body('Applicable when the GP offers LP(s) co-investment alongside the main fund. A new CoInvestmentFund is created as a sibling under the same Product. Median elapsed time from Indicated to admission: ~12 days.'),
  bullet('New Fund + Vehicle + Offering minted before sub docs can be issued'),
  bullet('pe:coInvestsIn links the new Fund to the named PortfolioCompany asset'),
  bullet('pe:coInvestsAlongside links the new Fund to the main Fund'),
  bullet('Election window typically 5–10 business days; lapses are irrevocable'),
  spacer(80),
  callout('Route B Load-Bearing Constraint','pe:coInvestsIn (the named asset) must also appear in pe:holdsInvestment on the alongside Fund. A co-investment vehicle naming an asset the main fund does not hold is not co-investing — it is a standalone fund with the wrong governance, wrong fee schedule, and wrong carried interest basis.',RED_LIGHT,RED_BDR),
  spacer(120),

  h3('Route C — Mint (new SMA or bespoke fund)'),
  body('Applicable when an LP issues a mandate or RFP requesting a dedicated separately managed account. A new SeparatelyManagedAccount is created as a sibling under the same Product. Median elapsed time from Indicated to admission: ~47 days.'),
  bullet('Mandate terms negotiated (typically weeks to months) before Fund is minted'),
  bullet('pe:fundInitiatedBy = the LP that issued the mandate'),
  bullet('No portfolio company asset is named at inception'),
  spacer(80),
  callout('Route C Constraint — Exactly One Investor','pe:maxInvestorCount = 1 is enforced on every SeparatelyManagedAccount. A second investor transforms the vehicle into a commingled fund with different regulatory treatment, fee disclosure obligations, and governance. This is a definitional rule enforced via SHACL sh:maxCount 1 on pe:commitment scoped to the SMA class.',PURPLE_LIGHT,PURPLE_BDR),
  spacer(200),

  h2('E.4  Product and Fund Assignment Along the Pipeline'),
  body('Assignment of hierarchy objects to an Opportunity happens in two steps at different stages. The Product is assigned early; Fund and Offering are confirmed only when the route is determined.'),
  spacer(80),
  tbl(
    ['Stage','Field assigned','Object assigned','Mutable after?'],
    [
      ['Prospect','pe:targetProduct','pe:Product — strategy family','Rarely; requires manager approval'],
      ['Soft circle','pe:indicativeAmount','xsd:decimal — soft, not binding','Yes — updated freely'],
      ['Indicated','pe:targetFund','pe:Fund — vintage, term, commitment period','Locked; for B/C the Fund is created here'],
      ['Docs out','pe:targetOffering','pe:Offering — share class, currency, minimum','Locked; sub docs reference the exact Offering'],
      ['Docs out','pe:targetClose','pe:FundClose — which close LP is targeting','Can move to a later close'],
      ['Won','pe:committedAmount','xsd:decimal on pe:Commitment — legal amount','Immutable — LPA-bound'],
      ['Won','pe:admittedAt','pe:FundClose — actual close that admitted LP','Immutable — historical fact'],
    ],
    [1400,1700,3000,2100]
  ),
  spacer(200),

  h2('E.5  Close / Won — The Admission Event'),
  body('An Opportunity is Won at the moment the investor is admitted at a FundClose. This is the only event that creates a pe:Commitment record in the fund data model.'),
  spacer(80),
  tbl(
    ['Step','Event','Record created / updated','Opp state'],
    [
      ['1','LP signs subscription documents','pe:SubscriptionAgreement; side letters attached','Signed'],
      ['2','KYC / AML clearance obtained','Compliance sign-off; no fund record yet','Signed'],
      ['3','Fund close held; LP admitted by GP','pe:FundClose.closeDate set','Signed (pending)'],
      ['4','pe:Commitment created','commitmentDate = closeDate; pe:admittedAt set','Won (at this moment)'],
      ['5','Capital account opened in GL','Dr Investment in Fund / Cr Capital Account LP','Won'],
      ['6','Opportunity marked Won','pe:wonDate set; pe:convertedTo → Commitment','Won · Converted'],
      ['7','First capital call issued','Capital call notice; LP wires committed %','Won (ops phase)'],
    ],
    [500,2300,2800,1600]
  ),
  spacer(80),
  callout('Late-Close Admission — Equalization Triggered','When an LP is admitted at the Second or Final Close, admission triggers equalization. Example: $100M commitment, 30% already called, 6-month gap, 8% rate — catch-up principal $30,000,000 + equalization interest $1,200,000 = total wire $31,200,000. See Appendix C for full mechanics.',GREEN_LIGHT,GREEN_BDR),
  spacer(120),

  h3('Date precision rules'),
  tbl(
    ['Field','Set when','Constraint'],
    [
      ['pe:raisedDate','Prospect','Owner (pe:raisedBy) must be an active employee on this date — the attribution anchor'],
      ['pe:subscriptionDate','Signed','Must precede or equal pe:commitmentDate'],
      ['pe:targetCloseDate','Docs out','Must match pe:closeDate on a pe:FundClose in the target Fund\'s close series'],
      ['pe:commitmentDate','Won (admission)','Must equal pe:admittedAt.closeDate — no gap admissions permitted'],
      ['pe:wonDate','Won (post-admission)','= pe:commitmentDate — same event, two systems'],
    ],
    [1800,1500,4000]
  ),
  spacer(200),

  h2('E.6  Coverage Attribution'),
  body('The owner of each Opportunity is the RM who covered the investor on pe:raisedDate, not the current RM. This is enforced by requiring pe:raisedBy to reference a Person with a valid pe:CoverageAssignment whose validity interval contains pe:raisedDate.'),
  spacer(80),
  callout('Why This Constraint Matters','An Opportunity owned by a person not employed on the raise date is the signature of pipeline attributed to departed colleagues — a common source of attribution disputes during performance reviews and carried interest calculations. This is undetectable with a plain string owner field; it requires CoverageAssignment to be reified as a node with a typed validity period.',BLUE_LIGHT,BLUE_BDR),
  spacer(80),
  body('Reference dataset results (750 Opportunities, 390 Investors):'),
  bullet('696 of 750 (92.8%): owner = covering RM — clean'),
  bullet('52 of 750 (6.9%): owner differs — specialist-sourced deals (advisory flag only)'),
  bullet('57 investors appeared under 2+ owners — all resolved via dated CoverageAssignment validity periods'),
  bullet('0 opportunities with pe:raisedBy referencing a person not employed on pe:raisedDate'),
  spacer(200),

  h2('E.7  Data Model — Properties and Constraints'),

  h3('pe:Opportunity properties'),
  codeBlock([
    'pe:Opportunity',
    '  pe:investor          → pe:Investor          # who the opportunity is with',
    '  pe:targetProduct     → pe:Product           # set at Prospect stage',
    '  pe:targetFund        → pe:Fund              # set at Indicated (created here for B/C)',
    '  pe:targetOffering    → pe:Offering          # set at Docs Out',
    '  pe:targetClose       → pe:FundClose         # which close the LP is targeting',
    '  pe:indicativeAmount  → xsd:decimal          # soft — forecast only, not binding',
    '  pe:opportunityStatus → ref:Prospect | ref:SoftCircle | ref:Indicated |',
    '                           ref:DocsOut | ref:Signed | ref:Won |',
    '                           ref:Withdrawn | ref:Declined | ref:OnHold',
    '  pe:raisedDate        → xsd:date             # attribution anchor',
    '  pe:raisedBy          → pe:Person            # derived from CoverageAssignment',
    '  pe:conversionRoute   → ref:RouteA | ref:RouteB | ref:RouteC',
    '  pe:convertedTo       → pe:Commitment        # set when Won',
  ]),
  spacer(120),

  h3('pe:Commitment properties (post-admission)'),
  codeBlock([
    'pe:Commitment',
    '  pe:investor          → pe:Investor',
    '  pe:inOffering        → pe:Offering          # Offering → Vehicle → Fund → Product',
    '  pe:committedAmount   → xsd:decimal          # legal amount, LPA-bound',
    '  pe:commitmentDate    → xsd:date             # = admittedAt.closeDate (SHACL-enforced)',
    '  pe:admittedAt        → pe:FundClose         # links into the fund\'s close series',
    '  pe:fromOpportunity   → pe:Opportunity       # back-link to pipeline record',
    '  pe:fromSubscription  → pe:SubscriptionAgreement',
  ]),
  spacer(120),

  h3('SHACL constraints'),
  tbl(
    ['Constraint','Severity','What it catches'],
    [
      ['pe:commitmentDate = pe:admittedAt.closeDate','Violation','Commitments dated between closes — gap admissions are legally impossible'],
      ['pe:subscriptionDate ≤ pe:commitmentDate','Violation','LPs admitted before they signed subscription documents'],
      ['pe:raisedBy employed on pe:raisedDate','Violation','Pipeline attributed to persons who had left the firm'],
      ['Route B: pe:coInvestsIn held by pe:coInvestsAlongside Fund','Violation','Co-invest vehicle naming an asset the main fund does not hold'],
      ['Route C: maxInvestorCount = 1 on SMA','Violation','SMA with two or more investors — should be commingled fund'],
      ['pe:targetFund.product = pe:targetProduct','Violation','Opp targeting a Fund under a different Product than declared'],
      ['Won opp must have pe:convertedTo','Violation','Opportunity marked Won with no Commitment back-link — ghost win'],
      ['pe:raisedBy ≠ current pe:coveringRM','Advisory','Specialist-sourced deal — valid but flagged for attribution review'],
    ],
    [3200,900,3100]
  ),
  spacer(240),
];

(async () => {
  const doc = new Document({
    sections:[{children}],
    styles:{default:{document:{run:{font:'Calibri',size:22,color:SLATE}}}}
  });
  const buf = await Packer.toBuffer(doc);
  require('fs').writeFileSync('/tmp/appendix_e.docx', buf);
  console.log('Done: /tmp/appendix_e.docx');
})();
