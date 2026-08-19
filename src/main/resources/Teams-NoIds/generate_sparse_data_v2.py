"""
generate_sparse_data_v2.py

Sparse-mode sample data for Golden Record / entity-resolution research.
Source file fields: team_name, firm_name, lead_name, address  (NO identifiers)

Lifecycle event mix (applied to 5,000 base teams):
  20%  RENAME        - team_name changes between T0 and T1
   5%  MERGE         - two teams collapse into one survivor (125 pairs)
   8%  SPLIT         - one team spawns a named spinoff
  ~67% MEMBER_CHANGE - lead advisor changes

Source recency model:
  A = Broadridge  (most current,  T1 view)
  B = Discovery   (intermediate,  T0.5 — 50/50 for transitions)
  C = Bloomberg   (most stale,    T0 view)
"""

import csv, random, os

random.seed(42)

# ── Constants ─────────────────────────────────────────────────────────────────
N_TEAMS  = 5_000
N_RENAME = int(N_TEAMS * 0.20)   # 1 000
N_MERGE  = int(N_TEAMS * 0.05)   # 250  → 125 pairs
N_SPLIT  = int(N_TEAMS * 0.08)   # 400  → 400 spinoffs
# remainder → MEMBER_CHANGE

OUT = "/sessions/inspiring-charming-pasteur/mnt/outputs"

# ── Firm universe ─────────────────────────────────────────────────────────────
# (display_name, canonical, has_crd)
FIRMS = [
    # FINRA broker-dealers
    ("Morgan Stanley Wealth Management",       "morgan_stanley",      True),
    ("UBS Financial Services",                 "ubs",                 True),
    ("Merrill Lynch Pierce Fenner & Smith",    "merrill_lynch",       True),
    ("Wells Fargo Advisors",                   "wells_fargo",         True),
    ("Raymond James Financial Services",       "raymond_james",       True),
    ("LPL Financial",                          "lpl_financial",       True),
    ("Edward Jones",                           "edward_jones",        True),
    ("Stifel Nicolaus & Company",              "stifel_nicolaus",     True),
    ("Robert W. Baird & Co.",                  "rwbaird",             True),
    ("Janney Montgomery Scott",                "janney",              True),
    ("Oppenheimer & Co.",                      "oppenheimer",         True),
    ("Hilliard Lyons",                         "hilliard_lyons",      True),
    ("DA Davidson & Co.",                      "da_davidson",         True),
    ("Cetera Financial Group",                 "cetera",              True),
    ("Ameriprise Financial Services",          "ameriprise",          True),
    ("Commonwealth Financial Network",         "commonwealth",        True),
    ("Cambridge Investment Research",          "cambridge_inv",       True),
    ("Securities America",                     "securities_america",  True),
    ("National Planning Holdings",             "nph",                 True),
    ("Woodbury Financial Services",            "woodbury",            True),
    # RIA / boutique — no FINRA CRD
    ("Kingsbridge Capital Advisors",           "kingsbridge",         False),
    ("Ridgeway Wealth Management",             "ridgeway",            False),
    ("Harborview Private Wealth",              "harborview",          False),
    ("Crestwood Family Office",                "crestwood",           False),
    ("Northgate Investment Partners",          "northgate",           False),
    ("Summit Peak Advisors",                   "summit_peak",         False),
    ("Clearwater Capital Group",               "clearwater",          False),
    ("Meridian Private Wealth",                "meridian_pw",         False),
    ("Highfield Asset Management",             "highfield",           False),
    ("Parkside Wealth Strategies",             "parkside",            False),
]

FIRST_FORMAL = [
    "James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles",
    "Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew","Kenneth",
    "Sarah","Jennifer","Lisa","Karen","Nancy","Betty","Margaret","Sandra","Ashley","Dorothy",
    "Patricia","Linda","Barbara","Susan","Jessica","Helen","Emily","Rachel","Megan","Amanda",
]
FIRST_INFORMAL = {
    "James":"Jim","Robert":"Bob","William":"Bill","Michael":"Mike","Richard":"Rick",
    "Thomas":"Tom","Christopher":"Chris","Kenneth":"Ken","Andrew":"Andy","Matthew":"Matt",
    "Joseph":"Joe","Donald":"Don","Steven":"Steve","Anthony":"Tony","Daniel":"Dan",
}
LAST_NAMES = [
    "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Moore",
    "Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Thompson","Young","Allen",
    "King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson",
    "Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts","Gomez","Phillips","Evans",
    "Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes","Stewart","Morris","Morgan",
    "Patel","Khan","Lee","Chen","Zhang","Huang","Liu","Yang","Wang","Kim",
]
SUFFIXES_BD  = [
    "Wealth Management Group","Private Wealth Group","Investment Group","Advisory Group",
    "Wealth Partners","Capital Group","Asset Management Group","Financial Group",
    "Wealth Advisors","Portfolio Group","Institutional Group","Family Wealth Group",
]
SUFFIXES_RIA = [
    "Partners","Wealth","Capital","Advisors","Investment Partners","Private Wealth",
    "Family Office","Capital Partners","Asset Management","Wealth Management",
]
US_CITIES = [
    ("New York","NY","10001"),("New York","NY","10022"),("Los Angeles","CA","90001"),
    ("Chicago","IL","60601"),("Houston","TX","77001"),("Phoenix","AZ","85001"),
    ("Philadelphia","PA","19101"),("San Antonio","TX","78201"),("San Diego","CA","92101"),
    ("Dallas","TX","75201"),("San Jose","CA","95101"),("Austin","TX","78701"),
    ("Jacksonville","FL","32201"),("Fort Worth","TX","76101"),("Columbus","OH","43201"),
    ("Charlotte","NC","28201"),("Indianapolis","IN","46201"),("San Francisco","CA","94101"),
    ("Seattle","WA","98101"),("Denver","CO","80201"),("Nashville","TN","37201"),
    ("Oklahoma City","OK","73101"),("Washington","DC","20001"),("Louisville","KY","40201"),
    ("Las Vegas","NV","89101"),("Memphis","TN","38101"),("Baltimore","MD","21201"),
    ("Milwaukee","WI","53201"),("Atlanta","GA","30301"),("Kansas City","MO","64101"),
    ("Raleigh","NC","27601"),("Minneapolis","MN","55401"),("Miami","FL","33101"),
    ("Cleveland","OH","44101"),("Tampa","FL","33601"),("Boston","MA","02101"),
    ("Portland","OR","97201"),("Pittsburgh","PA","15201"),("St. Louis","MO","63101"),
    ("Richmond","VA","23219"),
]
STREET_TYPES  = ["St","Ave","Blvd","Dr","Rd","Pl","Ln","Way","Court","Pkwy"]
STREET_NAMES  = [
    "Main","Oak","Maple","Cedar","Elm","Washington","Park","Lake","Hill","River",
    "Spring","Willow","Lincoln","Madison","Jefferson","Commerce","Market",
    "Central","Highland","Broad","Church","Union","Liberty","Adams","Monroe",
]

def make_address():
    num  = random.randint(100, 9999)
    st   = f"{num} {random.choice(STREET_NAMES)} {random.choice(STREET_TYPES)}"
    city, state, zip_ = random.choice(US_CITIES)
    return st, city, state, zip_

def fmt_addr(street, city, state, zip_):
    return f"{street}, {city}, {state} {zip_}"

# ── OCR noise ─────────────────────────────────────────────────────────────────
OCR_MAP = {
    'o':'0','0':'o','l':'1','1':'l','i':'1','s':'5','5':'s',
    'e':'3','3':'e','a':'@','g':'9','b':'6','t':'+',
}
def ocr_corrupt(s, rate=0.03):
    out = []
    for c in s:
        if random.random() < rate and c.lower() in OCR_MAP:
            rep = OCR_MAP[c.lower()]
            out.append(rep.upper() if c.isupper() else rep)
        else:
            out.append(c)
    return ''.join(out)

def drop_chars(s, rate=0.02):
    return ''.join(c for c in s if random.random() > rate)

# ── Name styling ──────────────────────────────────────────────────────────────
def informal(first):
    return FIRST_INFORMAL.get(first, first)

def lead_a(first, last):   # Broadridge: informal
    inf = informal(first)
    return f"{inf} {last}" if random.random() < 0.7 else f"{last}, {inf}"

def lead_b(first, last):   # Discovery: mixed + OCR
    r = random.random()
    if r < 0.4:   name = f"{informal(first)} {last}"
    elif r < 0.7: name = f"{first} {last}"
    else:         name = f"{last}, {first}"
    return drop_chars(ocr_corrupt(name))

def lead_c(first, last):   # Bloomberg: formal
    return f"{first} {last}"

def team_name_a(name):     # Broadridge: abbreviated
    abbrevs = {
        "Management":"Mgmt","Financial":"Fin","Investment":"Inv","Advisors":"Adv",
        "Partners":"Ptnrs","Wealth":"Wlth","Capital":"Cap","Group":"Grp","Advisory":"Adv",
    }
    words = [abbrevs.get(w, w) for w in name.split()]
    if len(words) > 3 and random.random() < 0.3:
        words = words[1:]
    return ' '.join(words)

def team_name_b(name):     # Discovery: light OCR
    return drop_chars(ocr_corrupt(name, rate=0.015), rate=0.01)

def team_name_c(name):     # Bloomberg: verbatim
    return name

def firm_b(firm):
    if random.random() < 0.2:
        words = firm.split()
        return ' '.join(words[:2]) if len(words) > 2 else firm
    return firm

# ── Team dataclass ────────────────────────────────────────────────────────────
class Team:
    __slots__ = [
        'golden_id','firm_name','firm_canonical','has_crd',
        'first','last','team_name',
        'street','city','state','zip_',
        'event_type','event_detail',
    ]

def new_team(gid, firm_idx):
    t = Team()
    t.golden_id       = gid
    fname, fcan, hcrd = FIRMS[firm_idx]
    t.firm_name       = fname
    t.firm_canonical  = fcan
    t.has_crd         = hcrd
    t.first           = random.choice(FIRST_FORMAL)
    t.last            = random.choice(LAST_NAMES)
    suf               = SUFFIXES_BD if hcrd else SUFFIXES_RIA
    t.team_name       = f"{t.last} {random.choice(suf)}"
    t.street, t.city, t.state, t.zip_ = make_address()
    t.event_type      = "STABLE"
    t.event_detail    = {}
    return t

# ── Build base teams ──────────────────────────────────────────────────────────
teams = [new_team(i, random.randint(0, len(FIRMS)-1)) for i in range(N_TEAMS)]

# ── Assign lifecycle events ───────────────────────────────────────────────────
pool = list(range(N_TEAMS))
random.shuffle(pool)
ptr = 0

# ── RENAME (20%) ──────────────────────────────────────────────────────────────
rename_ids = set(pool[ptr : ptr + N_RENAME]);  ptr += N_RENAME
for gid in rename_ids:
    t = teams[gid]
    t.event_type = "RENAME"
    old = t.team_name
    suf = SUFFIXES_BD if t.has_crd else SUFFIXES_RIA
    r   = random.random()
    if r < 0.4:
        new_suf = random.choice([s for s in suf if s not in old] or suf)
        new_name = f"{t.last} {new_suf}"
    elif r < 0.7:
        new_name = f"{t.last} & Associates"
    else:
        partner = random.choice(LAST_NAMES)
        new_name = f"{t.last} & {partner} {random.choice(['Group','Partners','Advisors'])}"
    t.event_detail = {'old_name': old, 'new_name': new_name}

# ── MERGE (5%) → 125 pairs ────────────────────────────────────────────────────
merge_cands = pool[ptr : ptr + N_MERGE];  ptr += N_MERGE
merge_pairs = []          # [(survivor_gid, target_gid)]
merge_target_ids = set()
for i in range(0, len(merge_cands) - 1, 2):
    sv = merge_cands[i];  tg = merge_cands[i+1]
    merge_pairs.append((sv, tg))
    merge_target_ids.add(tg)
    teams[sv].event_type = "MERGE_SURVIVOR"
    teams[sv].event_detail = {'merged_from': tg}
    teams[tg].event_type = "MERGE_TARGET"
    teams[tg].event_detail = {'merged_into': sv}

# ── SPLIT (8%) → 400 spinoffs ────────────────────────────────────────────────
split_parent_ids = set(pool[ptr : ptr + N_SPLIT]);  ptr += N_SPLIT
spinoffs = []
for gid in split_parent_ids:
    t     = teams[gid]
    t.event_type = "SPLIT_PARENT"
    child = new_team(N_TEAMS + len(spinoffs), t.firm_idx if hasattr(t,'firm_idx') else
                     next(i for i,(fn,_,__) in enumerate(FIRMS) if fn == t.firm_name))
    # Spinoff inherits same firm
    child.firm_name      = t.firm_name
    child.firm_canonical = t.firm_canonical
    child.has_crd        = t.has_crd
    child.golden_id      = N_TEAMS + len(spinoffs)
    child.event_type     = "SPLIT_CHILD"
    child.event_detail   = {'split_from': gid}
    t.event_detail       = {'spawned': child.golden_id}
    spinoffs.append(child)

# ── MEMBER_CHANGE (rest) ──────────────────────────────────────────────────────
for gid in pool[ptr:]:
    t = teams[gid]
    if t.event_type == "STABLE":
        t.event_type = "MEMBER_CHANGE"
        t.event_detail = {
            'old_first': t.first,  'old_last': t.last,
            'new_first': random.choice(FIRST_FORMAL),
            'new_last':  random.choice(LAST_NAMES),
        }

all_teams = teams + spinoffs

# ── Record factory ────────────────────────────────────────────────────────────
def make_rec(t, source, use_new=True):
    """Return a dict with source-styled fields for team t."""
    # Resolve team name
    if t.event_type == "RENAME":
        raw = t.event_detail['new_name'] if use_new else t.event_detail['old_name']
    else:
        raw = t.team_name

    # Resolve lead
    if t.event_type == "MEMBER_CHANGE":
        if use_new:
            first, last = t.event_detail['new_first'], t.event_detail['new_last']
        else:
            first, last = t.event_detail['old_first'], t.event_detail['old_last']
    else:
        first, last = t.first, t.last

    if source == 'A':
        tname = team_name_a(raw);  lead = lead_a(first, last);  fill = 0.65
    elif source == 'B':
        tname = team_name_b(raw);  lead = lead_b(first, last);  fill = 0.45
    else:
        tname = team_name_c(raw);  lead = lead_c(first, last);  fill = 0.25

    firm = t.firm_name
    if source == 'B':
        firm = firm_b(firm)

    addr = fmt_addr(t.street, t.city, t.state, t.zip_) if random.random() < fill else ""

    return {
        'team_name': tname, 'firm_name': firm,
        'lead_name': lead,  'address':   addr,
        '_gid': t.golden_id, '_etype': t.event_type,
    }

# ── Generate source rows ──────────────────────────────────────────────────────
rows_a, rows_b, rows_c = [], [], []
gt = []   # (source, row_idx, golden_id, label)

def add(rows, source, t, use_new=True, label=None):
    rows.append(make_rec(t, source, use_new))
    if label is None:
        label = t.event_type
    gt.append((source, len(rows)-1, t.golden_id, label))

for t in teams:
    e = t.event_type

    if e == "STABLE":
        add(rows_a,'A',t); add(rows_b,'B',t); add(rows_c,'C',t)

    elif e == "RENAME":
        add(rows_a,'A',t,True,  'RENAME_NEW')
        new_b = random.random() < 0.5
        add(rows_b,'B',t,new_b, 'RENAME_NEW' if new_b else 'RENAME_OLD')
        add(rows_c,'C',t,False, 'RENAME_OLD')

    elif e == "MERGE_SURVIVOR":
        add(rows_a,'A',t); add(rows_b,'B',t); add(rows_c,'C',t)

    elif e == "MERGE_TARGET":
        # A: absent (merged away)
        if random.random() < 0.5:
            add(rows_b,'B',t,True,'MERGE_TARGET_TRANSITIONAL')
        add(rows_c,'C',t,True,'MERGE_TARGET')   # C: pre-merge, both teams exist

    elif e == "SPLIT_PARENT":
        add(rows_a,'A',t); add(rows_b,'B',t); add(rows_c,'C',t)

    elif e == "MEMBER_CHANGE":
        add(rows_a,'A',t,True,  'MEMBER_CHANGE_NEW')
        new_b = random.random() < 0.5
        add(rows_b,'B',t,new_b, 'MEMBER_CHANGE_NEW' if new_b else 'MEMBER_CHANGE_OLD')
        add(rows_c,'C',t,False, 'MEMBER_CHANGE_OLD')

# Spinoff children
for t in spinoffs:
    add(rows_a,'A',t,True,'SPLIT_CHILD')           # A: present
    if random.random() < 0.5:
        add(rows_b,'B',t,True,'SPLIT_CHILD_TRANSITIONAL')  # B: 50%
    # C: absent (spinoff doesn't exist yet in stale view)

# ── Write source CSVs (NO identifiers) ───────────────────────────────────────
SRC_FIELDS = ['team_name','firm_name','lead_name','address']

def write_src(rows, fname):
    path = os.path.join(OUT, fname)
    with open(path,'w',newline='',encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=SRC_FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow({k: r[k] for k in SRC_FIELDS})
    return len(rows)

n_a = write_src(rows_a, 'source_a_broadridge.csv')
n_b = write_src(rows_b, 'source_b_discovery.csv')
n_c = write_src(rows_c, 'source_c_bloomberg.csv')

# ── Golden record master (eval only, not a source file) ───────────────────────
GR_FIELDS = [
    'golden_id','event_type','firm_name','firm_canonical','has_crd',
    'lead_first','lead_last','team_name_current','team_name_prior',
    'street','city','state','zip_',
]
with open(os.path.join(OUT,'golden_teams_sparse.csv'),'w',newline='',encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=GR_FIELDS)
    w.writeheader()
    for t in all_teams:
        if t.event_type == "RENAME":
            curr = t.event_detail['new_name']
            prior = t.event_detail['old_name']
        elif t.event_type == "MEMBER_CHANGE":
            curr  = t.team_name
            prior = t.team_name   # name unchanged; lead changed
        else:
            curr = prior = t.team_name
        first = t.event_detail.get('new_first', t.first)
        last  = t.event_detail.get('new_last',  t.last)
        w.writerow({
            'golden_id': t.golden_id, 'event_type': t.event_type,
            'firm_name': t.firm_name, 'firm_canonical': t.firm_canonical,
            'has_crd': t.has_crd,
            'lead_first': first, 'lead_last': last,
            'team_name_current': curr, 'team_name_prior': prior,
            'street': t.street, 'city': t.city, 'state': t.state, 'zip_': t.zip_,
        })

# ── Ground truth links ────────────────────────────────────────────────────────
GT_FIELDS = ['source','source_row_idx','golden_id','event_label']
with open(os.path.join(OUT,'ground_truth_links_sparse.csv'),'w',newline='',encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=GT_FIELDS)
    w.writeheader()
    for src, idx, gid, label in gt:
        w.writerow({'source':src,'source_row_idx':idx,'golden_id':gid,'event_label':label})

# ── Merge pairs ───────────────────────────────────────────────────────────────
with open(os.path.join(OUT,'merge_pairs_sparse.csv'),'w',newline='',encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['survivor_golden_id','target_golden_id'])
    w.writeheader()
    for sv, tg in merge_pairs:
        w.writerow({'survivor_golden_id':sv,'target_golden_id':tg})

# ── Split pairs ───────────────────────────────────────────────────────────────
with open(os.path.join(OUT,'split_pairs_sparse.csv'),'w',newline='',encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['parent_golden_id','child_golden_id'])
    w.writeheader()
    for t in spinoffs:
        w.writerow({'parent_golden_id': t.event_detail['split_from'], 'child_golden_id': t.golden_id})

# ── Summary stats ─────────────────────────────────────────────────────────────
counts = {}
for t in teams:
    counts[t.event_type] = counts.get(t.event_type, 0) + 1

stat_path = os.path.join(OUT,'summary_stats_sparse.txt')
with open(stat_path,'w') as f:
    f.write(f"""=== Sparse Sample Data v2 ===

Source field schema (identical across all 3 files):
  team_name | firm_name | lead_name | address
  (NO identifiers: no source_row_id, no CRD, no email, no phone)

Base teams:              {N_TEAMS:,}
Spinoff teams (splits):  {len(spinoffs):,}
Total golden records:    {len(all_teams):,}

Lifecycle event distribution (base teams):
  RENAME         : {counts.get('RENAME',0):>5,}  ({100*counts.get('RENAME',0)/N_TEAMS:.1f}%)  — team_name changes
  MERGE_SURVIVOR : {counts.get('MERGE_SURVIVOR',0):>5,}  ({100*counts.get('MERGE_SURVIVOR',0)/N_TEAMS:.1f}%)  — absorbs partner team
  MERGE_TARGET   : {counts.get('MERGE_TARGET',0):>5,}  ({100*counts.get('MERGE_TARGET',0)/N_TEAMS:.1f}%)  — disappears into survivor
  SPLIT_PARENT   : {counts.get('SPLIT_PARENT',0):>5,}  ({100*counts.get('SPLIT_PARENT',0)/N_TEAMS:.1f}%)  — spawns a spinoff
  MEMBER_CHANGE  : {counts.get('MEMBER_CHANGE',0):>5,}  ({100*counts.get('MEMBER_CHANGE',0)/N_TEAMS:.1f}%)  — lead advisor changes

Merge pairs: {len(merge_pairs):,}
  Source A (T1): survivor only — target has merged away
  Source B (T0.5): 50% still show target as separate entity
  Source C (T0): both pre-merge teams visible

Split events: {len(spinoffs):,} spinoffs
  Source A (T1): parent + spinoff both visible
  Source B (T0.5): spinoff visible 50% of the time
  Source C (T0): only parent visible (spinoff not yet formed)

Rename events: {counts.get('RENAME',0):,}
  Source A (T1): new team name
  Source B (T0.5): 50% new / 50% old
  Source C (T0): old team name

Member-change events: {counts.get('MEMBER_CHANGE',0):,}
  Source A (T1): new lead advisor
  Source B (T0.5): 50% new / 50% old lead
  Source C (T0): old lead advisor

Source record counts:
  Source A — Broadridge  : {n_a:,} rows  (addr fill ~65%, informal names, abbreviated team names)
  Source B — Discovery   : {n_b:,} rows  (addr fill ~45%, mixed names, light OCR noise)
  Source C — Bloomberg   : {n_c:,} rows  (addr fill ~25%, formal names, verbatim team names)
  Ground truth links     : {len(gt):,} rows

Evaluation files (NOT source inputs):
  golden_teams_sparse.csv   — {len(all_teams):,} canonical records with event_type
  ground_truth_links_sparse.csv — source row → golden_id + event_label
  merge_pairs_sparse.csv    — {len(merge_pairs):,} survivor/target pairs
  split_pairs_sparse.csv    — {len(spinoffs):,} parent/child pairs
""")

# ── Print summary ─────────────────────────────────────────────────────────────
print("Done.")
print(f"  source_a_broadridge.csv      : {n_a:,}")
print(f"  source_b_discovery.csv       : {n_b:,}")
print(f"  source_c_bloomberg.csv       : {n_c:,}")
print(f"  golden_teams_sparse.csv      : {len(all_teams):,}")
print(f"  ground_truth_links_sparse.csv: {len(gt):,}")
print(f"  merge_pairs_sparse.csv       : {len(merge_pairs):,}")
print(f"  split_pairs_sparse.csv       : {len(spinoffs):,}")
