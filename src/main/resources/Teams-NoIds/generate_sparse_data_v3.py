"""
generate_sparse_data_v3.py

Corrected field schema reflecting actual source constraints:
  team_name   — always present, variable quality
  firm_name   — always present
  lead_name   — sparse (~65% A / 55% B / 45% C)
  email       — sparse (~35% A / 25% B / 15% C)  team or lead email
  members     — sparse (~50% A / 40% B / 30% C)  pipe-delimited advisor names
  address     — sparse (~65% A / 45% B / 25% C)

NO: source_row_id, CRD, any numeric identifier

Lifecycle events (5 000 base teams):
  20%  RENAME         team_name changes; lead/email/members stable
   5%  MERGE          two teams collapse; survivor absorbs target members
   8%  SPLIT          parent splits member list into two child teams
  ~67% MEMBER_CHANGE  lead changes; partial member turnover; team name stable

Source recency:
  A = Broadridge  (T1 — most current)
  B = Discovery   (T0.5 — transitional, 50/50 for in-flight events)
  C = Bloomberg   (T0 — most stale)
"""

import csv, random, os, re

random.seed(42)

N_TEAMS  = 5_000
N_RENAME = int(N_TEAMS * 0.20)
N_MERGE  = int(N_TEAMS * 0.05)   # 250 → 125 pairs
N_SPLIT  = int(N_TEAMS * 0.08)   # 400 parents
OUT      = "/sessions/inspiring-charming-pasteur/mnt/outputs"

# ── Firms ─────────────────────────────────────────────────────────────────────
FIRMS = [
    ("Morgan Stanley Wealth Management",    "morgan_stanley",    "morganstanley.com",   True),
    ("UBS Financial Services",              "ubs",               "ubs.com",             True),
    ("Merrill Lynch Pierce Fenner & Smith", "merrill_lynch",     "ml.com",              True),
    ("Wells Fargo Advisors",                "wells_fargo",       "wellsfargoadv.com",   True),
    ("Raymond James Financial Services",    "raymond_james",     "raymondjames.com",    True),
    ("LPL Financial",                       "lpl_financial",     "lpl.com",             True),
    ("Edward Jones",                        "edward_jones",      "edwardjones.com",     True),
    ("Stifel Nicolaus & Company",           "stifel_nicolaus",   "stifel.com",          True),
    ("Robert W. Baird & Co.",               "rwbaird",           "rwbaird.com",         True),
    ("Janney Montgomery Scott",             "janney",            "janney.com",          True),
    ("Oppenheimer & Co.",                   "oppenheimer",       "opco.com",            True),
    ("Hilliard Lyons",                      "hilliard_lyons",    "hl.com",              True),
    ("DA Davidson & Co.",                   "da_davidson",       "dadavidson.com",      True),
    ("Cetera Financial Group",              "cetera",            "cetera.com",          True),
    ("Ameriprise Financial Services",       "ameriprise",        "ampf.com",            True),
    ("Commonwealth Financial Network",      "commonwealth",      "commonwealth.com",    True),
    ("Cambridge Investment Research",       "cambridge_inv",     "cambridgeinv.com",    True),
    ("Securities America",                  "securities_america","secam.com",           True),
    ("National Planning Holdings",          "nph",               "nph.com",             True),
    ("Woodbury Financial Services",         "woodbury",          "woodburyfs.com",      True),
    ("Kingsbridge Capital Advisors",        "kingsbridge",       "kingsbridgecap.com",  False),
    ("Ridgeway Wealth Management",          "ridgeway",          "ridgewaywm.com",      False),
    ("Harborview Private Wealth",           "harborview",        "harborviewpw.com",    False),
    ("Crestwood Family Office",             "crestwood",         "crestwoodfo.com",     False),
    ("Northgate Investment Partners",       "northgate",         "northgateinv.com",    False),
    ("Summit Peak Advisors",                "summit_peak",       "summitpeakadv.com",   False),
    ("Clearwater Capital Group",            "clearwater",        "clearwatercap.com",   False),
    ("Meridian Private Wealth",             "meridian_pw",       "meridianpw.com",      False),
    ("Highfield Asset Management",          "highfield",         "highfieldam.com",     False),
    ("Parkside Wealth Strategies",          "parkside",          "parksidewealth.com",  False),
]

FIRSTS = [
    "James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles",
    "Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew","Kenneth",
    "Sarah","Jennifer","Lisa","Karen","Nancy","Betty","Margaret","Sandra","Ashley","Dorothy",
    "Patricia","Linda","Barbara","Susan","Jessica","Helen","Emily","Rachel","Megan","Amanda",
    "Kevin","Brian","George","Edward","Ronald","Timothy","Jason","Jeffrey","Ryan","Jacob",
]
INFORMAL = {
    "James":"Jim","Robert":"Bob","William":"Bill","Michael":"Mike","Richard":"Rick",
    "Thomas":"Tom","Christopher":"Chris","Kenneth":"Ken","Andrew":"Andy","Matthew":"Matt",
    "Joseph":"Joe","Donald":"Don","Steven":"Steve","Anthony":"Tony","Daniel":"Dan",
    "Timothy":"Tim","Jeffrey":"Jeff","Edward":"Ed","Ronald":"Ron","Kevin":"Kev",
}
LASTS = [
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
    "Private Client Group","Retirement Solutions Group","Tax & Wealth Group",
]
SUFFIXES_RIA = [
    "Partners","Wealth","Capital","Advisors","Investment Partners","Private Wealth",
    "Family Office","Capital Partners","Asset Management","Wealth Management",
    "& Associates","Group","Financial Partners",
]
US_CITIES = [
    ("New York","NY","10001"),("New York","NY","10022"),("Los Angeles","CA","90001"),
    ("Chicago","IL","60601"),("Houston","TX","77001"),("Phoenix","AZ","85001"),
    ("Philadelphia","PA","19101"),("San Antonio","TX","78201"),("San Diego","CA","92101"),
    ("Dallas","TX","75201"),("San Jose","CA","95101"),("Austin","TX","78701"),
    ("Charlotte","NC","28201"),("Indianapolis","IN","46201"),("San Francisco","CA","94101"),
    ("Seattle","WA","98101"),("Denver","CO","80201"),("Nashville","TN","37201"),
    ("Washington","DC","20001"),("Las Vegas","NV","89101"),("Memphis","TN","38101"),
    ("Baltimore","MD","21201"),("Atlanta","GA","30301"),("Kansas City","MO","64101"),
    ("Raleigh","NC","27601"),("Minneapolis","MN","55401"),("Miami","FL","33101"),
    ("Boston","MA","02101"),("Portland","OR","97201"),("St. Louis","MO","63101"),
]
STREETS = ["Main","Oak","Maple","Cedar","Elm","Washington","Park","Lake","Hill","River",
            "Spring","Willow","Lincoln","Madison","Jefferson","Commerce","Market","Highland"]
STYPES  = ["St","Ave","Blvd","Dr","Rd","Pl","Ln","Way","Court","Pkwy"]

def rand_addr():
    n = random.randint(100, 9999)
    city, state, zip_ = random.choice(US_CITIES)
    return f"{n} {random.choice(STREETS)} {random.choice(STYPES)}, {city}, {state} {zip_}", zip_

# ── OCR / noise ───────────────────────────────────────────────────────────────
OCR = {'o':'0','l':'1','i':'1','s':'5','e':'3','a':'@','g':'9','b':'6'}
def ocr(s, r=0.025):
    return ''.join(OCR.get(c.lower(),c) if random.random()<r else c for c in s)
def drop(s, r=0.015):
    return ''.join(c for c in s if random.random()>r)

# ── Name styling ──────────────────────────────────────────────────────────────
def inf(f): return INFORMAL.get(f, f)

def style_lead(first, last, source):
    if source == 'A':
        i = inf(first)
        return f"{i} {last}" if random.random()<0.65 else f"{last}, {i}"
    elif source == 'B':
        r = random.random()
        raw = f"{inf(first)} {last}" if r<0.4 else f"{first} {last}" if r<0.7 else f"{last}, {first}"
        return drop(ocr(raw))
    else:  # C
        return f"{first} {last}"

def style_team(name, source):
    abbr = {"Management":"Mgmt","Financial":"Fin","Investment":"Inv","Advisors":"Adv",
            "Partners":"Ptnrs","Wealth":"Wlth","Capital":"Cap","Group":"Grp","Advisory":"Adv"}
    if source == 'A':
        words = [abbr.get(w,w) for w in name.split()]
        if len(words)>3 and random.random()<0.3: words=words[1:]
        return ' '.join(words)
    elif source == 'B':
        return drop(ocr(name, 0.015), 0.01)
    else:
        return name

def make_email(first, last, domain):
    r = random.random()
    slug = re.sub(r'[^a-z0-9]','',last.lower())
    fi = first[0].lower()
    fl = inf(first).lower()
    if r < 0.35: return f"{fl}.{slug}@{domain}"
    elif r < 0.65: return f"{fi}{slug}@{domain}"
    else: return f"{slug}{fi}@{domain}"

def make_members(n, lead_first, lead_last):
    """n total members; lead is always first."""
    pool = [f"{lead_first} {lead_last}"]
    tries = 0
    while len(pool) < n and tries < 200:
        name = f"{random.choice(FIRSTS)} {random.choice(LASTS)}"
        if name not in pool:
            pool.append(name)
        tries += 1
    return pool

def fmt_members(lst, source):
    """Style member names for source; return pipe-delimited string."""
    out = []
    for name in lst:
        parts = name.split()
        if len(parts) < 2:
            out.append(name)
            continue
        f, l = parts[0], parts[-1]
        if source == 'A':
            styled = f"{inf(f)} {l}"
        elif source == 'B':
            styled = drop(ocr(f"{f} {l}", 0.01), 0.008)
        else:
            styled = f"{f} {l}"
        out.append(styled)
    return "|".join(out)

# ── Team object ───────────────────────────────────────────────────────────────
class Team:
    __slots__ = ['gid','firm_name','firm_can','domain','has_crd',
                 'first','last','team_name','address','zip_',
                 'email','members',  # canonical lists
                 'event_type','ed']  # event_detail

def new_team(gid, fidx):
    t = Team()
    t.gid = gid
    fn, fc, dom, hc = FIRMS[fidx]
    t.firm_name = fn; t.firm_can = fc; t.domain = dom; t.has_crd = hc
    t.first = random.choice(FIRSTS)
    t.last  = random.choice(LASTS)
    suf     = SUFFIXES_BD if hc else SUFFIXES_RIA
    t.team_name = f"{t.last} {random.choice(suf)}"
    t.address, t.zip_ = rand_addr()
    t.email   = make_email(t.first, t.last, dom)
    n_members = random.randint(2, 7)
    t.members = make_members(n_members, t.first, t.last)
    t.event_type = "STABLE"
    t.ed = {}
    return t

# ── Build base teams ──────────────────────────────────────────────────────────
teams = [new_team(i, random.randint(0, len(FIRMS)-1)) for i in range(N_TEAMS)]

# ── Assign lifecycle events ───────────────────────────────────────────────────
pool = list(range(N_TEAMS)); random.shuffle(pool); ptr = 0

# RENAME (20%) — team_name changes; lead/email/members stay
rename_ids = set(pool[ptr:ptr+N_RENAME]); ptr += N_RENAME
for gid in rename_ids:
    t = teams[gid]; t.event_type = "RENAME"
    old = t.team_name
    suf = SUFFIXES_BD if t.has_crd else SUFFIXES_RIA
    r = random.random()
    if r < 0.4:
        new_suf = random.choice([s for s in suf if s not in old] or suf)
        new_name = f"{t.last} {new_suf}"
    elif r < 0.7:
        new_name = f"{t.last} & Associates"
    else:
        p = random.choice(LASTS)
        new_name = f"{t.last} & {p} {random.choice(['Group','Partners','Advisors'])}"
    t.ed = {'old_name': old, 'new_name': new_name}

# MERGE (5%) — 125 pairs; survivor absorbs target member list
merge_cands = pool[ptr:ptr+N_MERGE]; ptr += N_MERGE
merge_pairs = []
merge_target_ids = set()
for i in range(0, len(merge_cands)-1, 2):
    sv, tg = merge_cands[i], merge_cands[i+1]
    merge_pairs.append((sv, tg)); merge_target_ids.add(tg)
    # Survivor absorbs target's members (with ~80% retention from each side)
    sv_members_post = [m for m in teams[sv].members if random.random() > 0.1]
    tg_members_post = [m for m in teams[tg].members if random.random() > 0.2]
    combined = sv_members_post[:]
    for m in tg_members_post:
        if m not in combined: combined.append(m)
    teams[sv].event_type = "MERGE_SURVIVOR"
    teams[sv].ed = {
        'merged_from': tg,
        'members_pre':  teams[sv].members[:],   # members before merge
        'members_post': combined,                # combined members after
    }
    teams[tg].event_type = "MERGE_TARGET"
    teams[tg].ed = {'merged_into': sv}

# SPLIT (8%) — parent splits members into two groups; spinoff gets new name
split_parent_ids = set(pool[ptr:ptr+N_SPLIT]); ptr += N_SPLIT
spinoffs = []
for gid in split_parent_ids:
    t = teams[gid]; t.event_type = "SPLIT_PARENT"
    # Ensure parent has enough members to split
    while len(t.members) < 4:
        t.members.append(f"{random.choice(FIRSTS)} {random.choice(LASTS)}")
    mid = len(t.members) // 2
    parent_post_members = t.members[:mid]   # parent keeps first half
    child_members = t.members[mid:]          # child gets second half

    # Create spinoff
    c = Team()
    c.gid = N_TEAMS + len(spinoffs)
    c.firm_name = t.firm_name; c.firm_can = t.firm_can
    c.domain = t.domain; c.has_crd = t.has_crd
    # Child lead is first person in child_members
    child_lead_parts = child_members[0].split()
    c.first = child_lead_parts[0]; c.last = child_lead_parts[-1]
    suf = SUFFIXES_BD if t.has_crd else SUFFIXES_RIA
    c.team_name = f"{c.last} {random.choice(suf)}"
    c.address, c.zip_ = rand_addr()
    c.email   = make_email(c.first, c.last, c.domain)
    c.members = child_members
    c.event_type = "SPLIT_CHILD"
    c.ed = {'split_from': gid}

    t.ed = {
        'spawned': c.gid,
        'members_pre':  t.members[:],         # full pre-split list
        'members_post': parent_post_members,   # parent's post-split subset
    }
    t.members = parent_post_members            # update parent canonical list to post-split
    spinoffs.append(c)

# MEMBER_CHANGE (~67%) — lead changes; partial member turnover; team name stable
for gid in pool[ptr:]:
    t = teams[gid]
    if t.event_type != "STABLE": continue
    t.event_type = "MEMBER_CHANGE"
    new_first = random.choice(FIRSTS)
    new_last  = random.choice(LASTS)
    new_email = make_email(new_first, new_last, t.domain)
    # Keep 60-80% of non-lead members, swap lead, possibly add new members
    keep_rate = random.uniform(0.60, 0.85)
    other_members = [m for m in t.members[1:] if random.random() < keep_rate]
    n_add = random.randint(0, 2)
    for _ in range(n_add):
        name = f"{random.choice(FIRSTS)} {random.choice(LASTS)}"
        if name not in other_members: other_members.append(name)
    new_members = [f"{new_first} {new_last}"] + other_members
    t.ed = {
        'old_first': t.first, 'old_last': t.last, 'old_email': t.email,
        'old_members': t.members[:],
        'new_first': new_first, 'new_last': new_last, 'new_email': new_email,
        'new_members': new_members,
    }

all_teams = teams + spinoffs

# ── Record factory ────────────────────────────────────────────────────────────
# Sparsity fill rates by source
FILL = {
    'A': {'lead':0.65,'email':0.35,'members':0.50,'address':0.65},
    'B': {'lead':0.55,'email':0.25,'members':0.40,'address':0.45},
    'C': {'lead':0.45,'email':0.15,'members':0.30,'address':0.25},
}

def pick(val, rate): return val if random.random() < rate else ""

def make_rec(t, source, use_new=True):
    f = FILL[source]

    # ── Team name ────────────────────────────────────────────────────────────
    if t.event_type == "RENAME":
        raw = t.ed['new_name'] if use_new else t.ed['old_name']
    else:
        raw = t.team_name
    tname = style_team(raw, source)

    # ── Lead ─────────────────────────────────────────────────────────────────
    if t.event_type == "MEMBER_CHANGE":
        fn = t.ed['new_first'] if use_new else t.ed['old_first']
        ln = t.ed['new_last']  if use_new else t.ed['old_last']
        em = t.ed['new_email'] if use_new else t.ed['old_email']
        ml = t.ed['new_members'] if use_new else t.ed['old_members']
    elif t.event_type == "MERGE_SURVIVOR":
        fn, ln, em = t.first, t.last, t.email
        ml = t.ed['members_post'] if use_new else t.ed['members_pre']
    elif t.event_type == "SPLIT_PARENT":
        fn, ln, em = t.first, t.last, t.email
        ml = t.ed['members_post'] if use_new else t.ed['members_pre']
    else:
        fn, ln, em = t.first, t.last, t.email
        ml = t.members

    lead_str    = pick(style_lead(fn, ln, source), f['lead'])
    email_str   = pick(em, f['email'])
    members_str = pick(fmt_members(ml, source), f['members'])
    address_str = pick(t.address, f['address'])

    # Firm name: B sometimes shortens
    firm = t.firm_name
    if source == 'B' and random.random() < 0.20:
        words = firm.split(); firm = ' '.join(words[:2]) if len(words)>2 else firm

    return {
        'team_name': tname, 'firm_name': firm,
        'lead_name': lead_str, 'email': email_str,
        'members': members_str, 'address': address_str,
        '_gid': t.gid, '_etype': t.event_type,
    }

# ── Generate source rows ──────────────────────────────────────────────────────
rows_a, rows_b, rows_c = [], [], []
gt = []   # (source, row_idx, gid, label)

def add(rows, src, t, use_new=True, label=None):
    rows.append(make_rec(t, src, use_new))
    gt.append((src, len(rows)-1, t.gid, label or t.event_type))

for t in teams:
    e = t.event_type

    if e == "STABLE":
        add(rows_a,'A',t); add(rows_b,'B',t); add(rows_c,'C',t)

    elif e == "RENAME":
        add(rows_a,'A',t,True,  'RENAME_NEW')
        nb = random.random()<0.5
        add(rows_b,'B',t,nb,   'RENAME_NEW' if nb else 'RENAME_OLD')
        add(rows_c,'C',t,False, 'RENAME_OLD')

    elif e == "MERGE_SURVIVOR":
        # A: post-merge members; B: post-merge; C: pre-merge members
        add(rows_a,'A',t,True,  'MERGE_SURVIVOR_POST')
        add(rows_b,'B',t,True,  'MERGE_SURVIVOR_POST')
        add(rows_c,'C',t,False, 'MERGE_SURVIVOR_PRE')

    elif e == "MERGE_TARGET":
        # A: absent; B: 50% still present (transitional); C: present
        if random.random() < 0.5:
            add(rows_b,'B',t,True,'MERGE_TARGET_TRANSITIONAL')
        add(rows_c,'C',t,True,'MERGE_TARGET')

    elif e == "SPLIT_PARENT":
        # A: post-split (smaller member list); B: 50/50; C: pre-split (full list)
        add(rows_a,'A',t,True,  'SPLIT_PARENT_POST')
        nb = random.random()<0.5
        add(rows_b,'B',t,nb,   'SPLIT_PARENT_POST' if nb else 'SPLIT_PARENT_PRE')
        add(rows_c,'C',t,False, 'SPLIT_PARENT_PRE')

    elif e == "MEMBER_CHANGE":
        add(rows_a,'A',t,True,  'MEMBER_CHANGE_NEW')
        nb = random.random()<0.5
        add(rows_b,'B',t,nb,   'MEMBER_CHANGE_NEW' if nb else 'MEMBER_CHANGE_OLD')
        add(rows_c,'C',t,False, 'MEMBER_CHANGE_OLD')

# Spinoff children
for t in spinoffs:
    add(rows_a,'A',t,True,'SPLIT_CHILD')
    if random.random()<0.5:
        add(rows_b,'B',t,True,'SPLIT_CHILD_TRANSITIONAL')
    # C: absent (pre-split)

# ── Write source files ────────────────────────────────────────────────────────
SRC_FIELDS = ['team_name','firm_name','lead_name','email','members','address']

def write_src(rows, fname):
    p = os.path.join(OUT, fname)
    with open(p,'w',newline='',encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=SRC_FIELDS)
        w.writeheader()
        for r in rows: w.writerow({k:r[k] for k in SRC_FIELDS})
    return len(rows)

na = write_src(rows_a,'source_a_broadridge.csv')
nb = write_src(rows_b,'source_b_discovery.csv')
nc = write_src(rows_c,'source_c_bloomberg.csv')

# ── Golden record master ──────────────────────────────────────────────────────
GR_FIELDS = ['golden_id','event_type','firm_name','firm_canonical','has_crd',
             'lead_first','lead_last','team_name_current','team_name_prior',
             'email','members_count','address','zip_']
with open(os.path.join(OUT,'golden_teams_sparse.csv'),'w',newline='',encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=GR_FIELDS)
    w.writeheader()
    for t in all_teams:
        curr  = t.ed.get('new_name',t.team_name) if t.event_type=="RENAME" else t.team_name
        prior = t.ed.get('old_name',t.team_name) if t.event_type=="RENAME" else t.team_name
        fn = t.ed.get('new_first',t.first); ln = t.ed.get('new_last',t.last)
        ml = t.ed.get('new_members',t.members) if t.event_type=="MEMBER_CHANGE" else t.members
        w.writerow({'golden_id':t.gid,'event_type':t.event_type,
                    'firm_name':t.firm_name,'firm_canonical':t.firm_can,'has_crd':t.has_crd,
                    'lead_first':fn,'lead_last':ln,
                    'team_name_current':curr,'team_name_prior':prior,
                    'email':t.email,'members_count':len(ml),
                    'address':t.address,'zip_':t.zip_})

# Ground truth
with open(os.path.join(OUT,'ground_truth_links_sparse.csv'),'w',newline='',encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['source','source_row_idx','golden_id','event_label'])
    w.writeheader()
    for src,idx,gid,lbl in gt:
        w.writerow({'source':src,'source_row_idx':idx,'golden_id':gid,'event_label':lbl})

# Merge pairs
with open(os.path.join(OUT,'merge_pairs_sparse.csv'),'w',newline='',encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['survivor_gid','target_gid'])
    w.writeheader()
    for sv,tg in merge_pairs: w.writerow({'survivor_gid':sv,'target_gid':tg})

# Split pairs
with open(os.path.join(OUT,'split_pairs_sparse.csv'),'w',newline='',encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['parent_gid','child_gid'])
    w.writeheader()
    for t in spinoffs: w.writerow({'parent_gid':t.ed['split_from'],'child_gid':t.gid})

# Summary
counts = {}
for t in teams: counts[t.event_type] = counts.get(t.event_type,0)+1
with open(os.path.join(OUT,'summary_stats_sparse.txt'),'w') as f:
    f.write(f"""=== Sparse Sample Data v3 ===

Source field schema (6 fields, NO identifiers):
  team_name | firm_name | lead_name | email | members | address

  Sparsity (% records with non-empty field):
  Field        | Source A (Broadridge) | Source B (Discovery) | Source C (Bloomberg)
  lead_name    |        ~65%           |        ~55%          |        ~45%
  email        |        ~35%           |        ~25%          |        ~15%
  members      |        ~50%           |        ~40%          |        ~30%
  address      |        ~65%           |        ~45%          |        ~25%
  team_name    |        100%           |        100%          |        100%
  firm_name    |        100%           |        100%          |        100%

Lifecycle events ({N_TEAMS:,} base teams):
  RENAME         : {counts.get('RENAME',0):>5,}  ({100*counts.get('RENAME',0)/N_TEAMS:.1f}%)
  MERGE_SURVIVOR : {counts.get('MERGE_SURVIVOR',0):>5,}  ({100*counts.get('MERGE_SURVIVOR',0)/N_TEAMS:.1f}%)
  MERGE_TARGET   : {counts.get('MERGE_TARGET',0):>5,}  ({100*counts.get('MERGE_TARGET',0)/N_TEAMS:.1f}%)
  SPLIT_PARENT   : {counts.get('SPLIT_PARENT',0):>5,}  ({100*counts.get('SPLIT_PARENT',0)/N_TEAMS:.1f}%)
  MEMBER_CHANGE  : {counts.get('MEMBER_CHANGE',0):>5,}  ({100*counts.get('MEMBER_CHANGE',0)/N_TEAMS:.1f}%)
  Spinoff children: {len(spinoffs):,}
  Total golden records: {len(all_teams):,}

Source file row counts:
  source_a_broadridge.csv : {na:,}
  source_b_discovery.csv  : {nb:,}
  source_c_bloomberg.csv  : {nc:,}
  ground_truth_links      : {len(gt):,}

Merge event detail:
  {len(merge_pairs):,} pairs; survivor's members list in Source A = union of both pre-merge lists
  Source C: both teams present with separate member lists
  Source B: target present 50% of the time (transitional)

Split event detail:
  {len(spinoffs):,} spinoffs; parent's member list in Source A = first-half of pre-split list
  Source A: child team appears with second-half member list
  Source C: only parent visible with full pre-split member list
""")

print("Done.")
print(f"  source_a_broadridge.csv      : {na:,}")
print(f"  source_b_discovery.csv       : {nb:,}")
print(f"  source_c_bloomberg.csv       : {nc:,}")
print(f"  golden_teams_sparse.csv      : {len(all_teams):,}")
print(f"  ground_truth_links_sparse.csv: {len(gt):,}")
print(f"  merge_pairs_sparse.csv       : {len(merge_pairs):,}")
print(f"  split_pairs_sparse.csv       : {len(spinoffs):,}")
