"""
Golden Record Test Data Generator
===================================
Generates 5,000 canonical (golden) business teams across 3 simulated data sources
(Broadridge, Discovery Data, Bloomberg) with realistic PE/wire-house naming patterns,
membership overlaps, field variations, and ground truth link tables.

Outputs (all CSV):
  golden_teams.csv            – 5,000 canonical team records
  golden_members.csv          – ~18,000 canonical member records
  source_a_broadridge.csv     – Source A team records (~4,500 teams)
  source_b_discovery.csv      – Source B team records (~3,900 teams)
  source_c_bloomberg.csv      – Source C team records (~3,200 teams, large-AUM biased)
  source_a_members.csv        – Source A member records
  source_b_members.csv        – Source B member records
  source_c_members.csv        – Source C member records
  ground_truth_team_links.csv – Maps each golden team → source record IDs
  ground_truth_member_links.csv – Maps each golden member → source record IDs
  summary_stats.txt           – Dataset statistics
"""

import csv
import random
import math
import os
import hashlib
from itertools import product as iproduct

random.seed(42)

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ─────────────────────────────────────────────
# Reference data
# ─────────────────────────────────────────────

FIRMS = [
    "Merrill Lynch", "Morgan Stanley", "UBS Financial Services",
    "Wells Fargo Advisors", "Raymond James", "Edward Jones",
    "LPL Financial", "RBC Wealth Management", "Ameriprise Financial",
    "Stifel Financial", "Baird", "Janney Montgomery Scott",
    "Piper Sandler", "Oppenheimer & Co", "Mesirow Financial",
    "Rockefeller Capital Management", "Hightower Advisors",
    "Steward Partners", "Dynasty Financial Partners", "HighTower",
]

FIRST_NAMES = [
    "James","John","Robert","Michael","William","David","Richard","Joseph",
    "Thomas","Charles","Christopher","Daniel","Matthew","Anthony","Mark",
    "Donald","Steven","Paul","Andrew","Joshua","Kenneth","Kevin","Brian",
    "George","Edward","Ronald","Timothy","Jason","Jeffrey","Ryan",
    "Mary","Patricia","Jennifer","Linda","Barbara","Susan","Jessica","Sarah",
    "Karen","Lisa","Nancy","Betty","Margaret","Sandra","Ashley","Dorothy",
    "Kimberly","Emily","Donna","Carol","Michelle","Amanda","Melissa","Deborah",
    "Stephanie","Rebecca","Sharon","Laura","Cynthia","Kathleen","Amy","Angela",
]

FIRST_NAME_ALIASES = {
    "William": ["Bill","Will","Billy","W."],
    "Robert":  ["Bob","Rob","Bobby","R."],
    "Michael": ["Mike","Mick","M."],
    "James":   ["Jim","Jimmy","J."],
    "Richard": ["Rich","Rick","Dick","R."],
    "Thomas":  ["Tom","Tommy","T."],
    "Christopher": ["Chris","C."],
    "Matthew": ["Matt","M."],
    "Kenneth": ["Ken","Kenny","K."],
    "Timothy": ["Tim","Timmy","T."],
    "Jeffrey": ["Jeff","J."],
    "Anthony": ["Tony","Ant","A."],
    "Edward":  ["Ed","Eddie","E."],
    "Joseph":  ["Joe","Joey","J."],
    "Daniel":  ["Dan","Danny","D."],
    "Patricia":["Pat","Patty","P."],
    "Jennifer":["Jen","Jenny","J."],
    "Barbara": ["Barb","Babs","B."],
    "Susan":   ["Sue","Susie","S."],
    "Jessica": ["Jess","J."],
    "Sandra":  ["Sandy","S."],
    "Dorothy": ["Dot","Dottie","D."],
    "Kimberly":["Kim","K."],
    "Stephanie":["Steph","S."],
    "Rebecca": ["Becky","Becca","R."],
    "Catherine":["Cathy","Cat","C."],
    "Kathleen":["Kathy","Kate","K."],
    "Elizabeth":["Liz","Beth","Ellie","E."],
    "Margaret":["Maggie","Meg","M."],
    "Michelle":["Shelly","M."],
    "Christine":["Chris","Chrissy","C."],
    "Amanda":  ["Mandy","A."],
    "Melissa": ["Mel","M."],
    "Andrew":  ["Andy","Drew","A."],
    "Joshua":  ["Josh","J."],
    "Brian":   ["Bryan","B."],
    "Kevin":   ["Kev","K."],
    "Steven":  ["Steve","Stevie","S."],
    "George":  ["Geo","G."],
    "Ryan":    ["Ry","R."],
    "Jason":   ["Jay","J."],
    "Mark":    ["Marc","M."],
    "Paul":    ["P."],
    "Charles": ["Charlie","Chuck","C."],
    "Donald":  ["Don","Donnie","D."],
    "David":   ["Dave","D."],
    "John":    ["Jon","Johnny","J."],
}

LAST_NAMES = [
    "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
    "Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson",
    "Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson",
    "White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker",
    "Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
    "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell",
    "Carter","Roberts","Phillips","Evans","Turner","Parker","Collins","Edwards",
    "Stewart","Flores","Morris","Morgan","Reed","Cook","Bell","Murphy","Bailey",
    "Cooper","Richardson","Cox","Howard","Ward","Peterson","Gray","Ramirez",
    "Brooks","Kelly","Sanders","Price","Bennett","Wood","Barnes","Ross",
    "Henderson","Coleman","Jenkins","Perry","Powell","Long","Patterson","Hughes",
    "Flores","Washington","Butler","Simmons","Foster","Gonzales","Bryant","Alexander",
]

TEAM_SUFFIXES = [
    "Wealth Management Group",
    "Wealth Management Team",
    "Financial Advisory Group",
    "Private Wealth Group",
    "Investment Group",
    "Wealth Partners",
    "Capital Group",
    "Family Wealth Group",
    "Advisory Group",
    "Financial Group",
    "Wealth Advisors",
    "Private Client Group",
    "Asset Management Group",
    "Wealth Solutions Group",
]

TEAM_SUFFIX_ABBREVS = {
    "Wealth Management Group":  ["Wealth Mgmt Group","Wealth Mgmt Grp","WM Group","WMG"],
    "Wealth Management Team":   ["Wealth Mgmt Team","WM Team","WMT"],
    "Financial Advisory Group": ["Fin Advisory Group","Fin Adv Group","FAG","Fin Advisory Grp"],
    "Private Wealth Group":     ["Priv Wealth Group","PW Group","PWG","Private Wealth Grp"],
    "Investment Group":         ["Invest Group","Invest Grp","IG"],
    "Wealth Partners":          ["Wealth Part","WP","Wealth Ptrs"],
    "Capital Group":            ["Cap Group","Cap Grp","CG"],
    "Family Wealth Group":      ["Family Wealth Grp","Fam Wealth Group","FWG"],
    "Advisory Group":           ["Adv Group","Adv Grp","AG"],
    "Financial Group":          ["Fin Group","Fin Grp","FG"],
    "Wealth Advisors":          ["Wealth Advs","WA","Wealth Adv"],
    "Private Client Group":     ["Priv Client Group","PC Group","PCG"],
    "Asset Management Group":   ["Asset Mgmt Group","Asset Mgmt Grp","AMG"],
    "Wealth Solutions Group":   ["Wealth Sol Group","Wealth Solutions Grp","WSG"],
}

TEAM_PREFIXES = ["The ",""]   # Some teams use "The Smith Group"

CITY_ZIPS = [
    ("New York", "NY", "10001"), ("New York", "NY", "10017"),
    ("Los Angeles", "CA", "90001"), ("Los Angeles", "CA", "90025"),
    ("Chicago", "IL", "60601"), ("Chicago", "IL", "60614"),
    ("Houston", "TX", "77001"), ("Dallas", "TX", "75201"),
    ("Boston", "MA", "02101"), ("Boston", "MA", "02134"),
    ("San Francisco", "CA", "94101"), ("Atlanta", "GA", "30301"),
    ("Miami", "FL", "33101"), ("Seattle", "WA", "98101"),
    ("Denver", "CO", "80201"), ("Phoenix", "AZ", "85001"),
    ("Philadelphia", "PA", "19101"), ("Charlotte", "NC", "28201"),
    ("Minneapolis", "MN", "55401"), ("Nashville", "TN", "37201"),
    ("St. Louis", "MO", "63101"), ("Cleveland", "OH", "44101"),
    ("Pittsburgh", "PA", "15201"), ("Tampa", "FL", "33601"),
    ("Orlando", "FL", "32801"), ("Detroit", "MI", "48201"),
    ("San Diego", "CA", "92101"), ("Portland", "OR", "97201"),
    ("Las Vegas", "NV", "89101"), ("Baltimore", "MD", "21201"),
    ("Kansas City", "MO", "64101"), ("Indianapolis", "IN", "46201"),
    ("Columbus", "OH", "43201"), ("Austin", "TX", "78701"),
    ("Richmond", "VA", "23220"), ("Hartford", "CT", "06101"),
    ("Memphis", "TN", "38101"), ("Salt Lake City", "UT", "84101"),
    ("Louisville", "KY", "40201"), ("Milwaukee", "WI", "53201"),
    ("Cincinnati", "OH", "45201"),
]

STREET_TYPES = ["St", "Ave", "Blvd", "Dr", "Ln", "Rd", "Way", "Pl", "Ct"]
STREET_NAMES = [
    "Main","Oak","Pine","Maple","Cedar","Elm","Washington","Park",
    "Lake","Hill","River","Sunset","Madison","Jefferson","Lincoln",
    "Broadway","Market","Commerce","Financial","Capital","Liberty",
]

TITLES = [
    "Senior Vice President", "Vice President", "Managing Director",
    "Senior Financial Advisor", "Financial Advisor", "Senior Wealth Advisor",
    "Wealth Advisor", "Portfolio Manager", "Senior Portfolio Manager",
    "Director", "Executive Director", "Assistant Vice President",
    "Associate", "Senior Associate",
]

# ─────────────────────────────────────────────
# Utility helpers
# ─────────────────────────────────────────────

def uid(prefix, n):
    return f"{prefix}{str(n).zfill(7)}"

def lognormal_aum():
    """Return AUM in $M – lognormal, range ~$25M–$15B"""
    val = math.exp(random.gauss(5.5, 1.2))  # ln(~$245M) mean
    return round(max(25, min(15000, val)), 1)

def corrupt_name(name, rate=0.05):
    """Introduce occasional character-level noise (OCR/typo simulation)."""
    if random.random() > rate:
        return name
    chars = list(name)
    idx = random.randint(0, len(chars)-1)
    op = random.choice(["swap","drop","dup"])
    if op == "drop" and len(chars) > 3:
        chars.pop(idx)
    elif op == "dup":
        chars.insert(idx, chars[idx])
    elif op == "swap" and idx < len(chars)-1:
        chars[idx], chars[idx+1] = chars[idx+1], chars[idx]
    return "".join(chars)

def vary_first_name(fname, source_style):
    """Return a source-appropriate variant of a first name."""
    aliases = FIRST_NAME_ALIASES.get(fname, [])
    if not aliases:
        return fname
    if source_style == "formal":       # Bloomberg: full names
        return fname
    elif source_style == "informal":   # Broadridge: nicknames
        return random.choice(aliases[:2]) if aliases else fname
    else:                              # Discovery: mix
        return random.choice([fname] + aliases[:1])

def vary_team_name(base_name, prefix, suffix, source_id):
    """Return a source-specific variant of the canonical team name."""
    alt_suffixes = TEAM_SUFFIX_ABBREVS.get(suffix, [suffix])
    if source_id == "A":
        # Broadridge: often drops "The", may abbreviate suffix
        name = base_name + " " + random.choice([suffix] + alt_suffixes[:2])
        return corrupt_name(name, 0.03)
    elif source_id == "B":
        # Discovery: keeps prefix, more abbreviations
        sfx = random.choice(alt_suffixes) if alt_suffixes else suffix
        return prefix + base_name + " " + sfx
    else:
        # Bloomberg: full formal name, occasional "& Associates"
        assoc = random.choice([suffix, suffix, suffix + " LLC", base_name + " & Associates"])
        return prefix + base_name + " " + assoc if "Associates" not in assoc else prefix + assoc

def vary_aum(aum, pct=0.08):
    """Each source reports AUM within ±pct of true value."""
    return round(aum * random.uniform(1-pct, 1+pct), 1)

def vary_zip(zip5):
    """Occasionally drop to 4 digits or append +4."""
    r = random.random()
    if r < 0.05:
        return zip5[:-1]              # truncated
    elif r < 0.15:
        ext = str(random.randint(1000, 9999))
        return f"{zip5}-{ext}"        # +4 extension
    return zip5

def vary_phone(phone):
    """Reformat phone number."""
    digits = phone.replace("-","").replace("(","").replace(")","").replace(" ","")
    fmt = random.choice([
        f"({digits[:3]}) {digits[3:6]}-{digits[6:]}",
        f"{digits[:3]}-{digits[3:6]}-{digits[6:]}",
        f"{digits[:3]}.{digits[3:6]}.{digits[6:]}",
        f"+1{digits}",
        digits,
    ])
    return fmt

def vary_email(email, fname, lname, firm_abbrev):
    """Sometimes use alternate email format."""
    formats = [
        email,
        f"{fname[0].lower()}{lname.lower()}@{firm_abbrev}.com",
        f"{fname.lower()}.{lname.lower()}@{firm_abbrev}.net",
        f"{lname.lower()}{fname[0].lower()}@{firm_abbrev}.com",
    ]
    return random.choice(formats)

def firm_abbrev(firm_name):
    tokens = firm_name.lower().split()
    skip = {"financial","services","wealth","management","&","co","inc","llc"}
    abbrev = "".join(t[:4] for t in tokens if t not in skip)[:10]
    return abbrev or "firm"

def make_phone():
    area = random.randint(200, 989)
    mid  = random.randint(200, 999)
    end  = random.randint(1000, 9999)
    return f"{area}-{mid}-{end}"

def make_address(city, state, zip5):
    num  = random.randint(1, 9999)
    st   = random.choice(STREET_NAMES)
    typ  = random.choice(STREET_TYPES)
    suite = f"Suite {random.randint(100, 4000)}" if random.random() < 0.6 else ""
    parts = [f"{num} {st} {typ}", suite, city, state, zip5]
    return ", ".join(p for p in parts if p)

def vary_address(addr, source_id):
    """Introduce address formatting differences per source."""
    if source_id == "A":
        return addr.replace("Suite", "Ste").replace("Street", "St").replace("Avenue", "Ave")
    elif source_id == "B":
        return addr.replace("Ste", "Suite").replace("St,", "Street,").replace("Ave,","Avenue,")
    else:
        return addr  # Bloomberg mostly clean

def null_maybe(val, rate):
    """Return None with probability rate, else val."""
    return None if random.random() < rate else val

# ─────────────────────────────────────────────
# STEP 1: Generate golden teams
# ─────────────────────────────────────────────
print("Generating 5,000 golden teams...")

golden_teams = []
for i in range(1, 5001):
    tid = uid("GT", i)
    fname = random.choice(FIRST_NAMES)
    lname = random.choice(LAST_NAMES)
    firm  = random.choice(FIRMS)
    suffix = random.choice(TEAM_SUFFIXES)
    prefix = random.choice(TEAM_PREFIXES)
    base_name = f"{lname}"              # e.g. "Smith"
    team_name = f"{prefix}{base_name} {suffix}"
    city, state, zip5 = random.choice(CITY_ZIPS)
    aum = lognormal_aum()
    crd = str(random.randint(1000000, 9999999))
    phone = make_phone()
    fabbr = firm_abbrev(firm)
    email = f"{fname[0].lower()}{lname.lower()}@{fabbr}.com"
    addr  = make_address(city, state, zip5)
    num_members = random.randint(2, 6)

    golden_teams.append({
        "golden_team_id":   tid,
        "team_name":        team_name,
        "_prefix":          prefix,
        "_base_name":       base_name,
        "_suffix":          suffix,
        "firm_name":        firm,
        "_firm_abbrev":     fabbr,
        "crd_number":       crd,
        "lead_first_name":  fname,
        "lead_last_name":   lname,
        "lead_email":       email,
        "lead_phone":       phone,
        "city":             city,
        "state":            state,
        "zip":              zip5,
        "address":          addr,
        "aum_millions":     aum,
        "num_members":      num_members,
    })

# ─────────────────────────────────────────────
# STEP 2: Generate golden members
# ─────────────────────────────────────────────
print("Generating golden members...")

golden_members = []
team_member_map = {}   # golden_team_id → [golden_member_id, ...]

member_counter = 1
for team in golden_teams:
    tid  = team["golden_team_id"]
    firm = team["firm_name"]
    fabbr = team["_firm_abbrev"]
    city, state, zip5 = team["city"], team["state"], team["zip"]
    members = []

    # First member = team lead
    lead_mid = uid("GM", member_counter)
    member_counter += 1
    golden_members.append({
        "golden_member_id": lead_mid,
        "golden_team_id":   tid,
        "is_lead":          True,
        "first_name":       team["lead_first_name"],
        "last_name":        team["lead_last_name"],
        "email":            team["lead_email"],
        "phone":            team["lead_phone"],
        "title":            random.choice(["Managing Director","Senior Vice President","Executive Director","Vice President"]),
        "firm_name":        firm,
        "city":             city,
        "state":            state,
    })
    members.append(lead_mid)

    # Additional members
    for _ in range(team["num_members"] - 1):
        mfname = random.choice(FIRST_NAMES)
        mlname = random.choice(LAST_NAMES)
        mid    = uid("GM", member_counter)
        member_counter += 1
        memail = f"{mfname[0].lower()}{mlname.lower()}@{fabbr}.com"
        golden_members.append({
            "golden_member_id": mid,
            "golden_team_id":   tid,
            "is_lead":          False,
            "first_name":       mfname,
            "last_name":        mlname,
            "email":            memail,
            "phone":            make_phone(),
            "title":            random.choice(TITLES),
            "firm_name":        firm,
            "city":             city,
            "state":            state,
        })
        members.append(mid)

    team_member_map[tid] = members

print(f"  → {len(golden_members):,} golden members across {len(golden_teams):,} teams")

# ─────────────────────────────────────────────
# STEP 3: Source configuration
# ─────────────────────────────────────────────
# Source A: Broadridge  – 90% team coverage, informal names, CRD mostly present
# Source B: Discovery   – 78% coverage, mixed format, CRD 60% present
# Source C: Bloomberg   – 64% coverage but biased to large AUM (>$200M = 90%)

SOURCE_CONFIG = {
    "A": {
        "name":         "Broadridge",
        "prefix":       "SRA",
        "member_prefix":"SRA_M",
        "team_rate":    0.90,   # overall coverage
        "aum_bias":     None,   # no bias
        "crd_rate":     0.92,   # % of records with CRD
        "first_style":  "informal",
        "member_coverage": (0.80, 1.00),  # min/max % of team members shown
        "ghost_member_rate": 0.04,        # % chance of extra phantom member
        "null_rates": {"lead_email":0.05, "lead_phone":0.08, "address":0.10, "aum":0.03},
    },
    "B": {
        "name":         "Discovery",
        "prefix":       "SRB",
        "member_prefix":"SRB_M",
        "team_rate":    0.78,
        "aum_bias":     None,
        "crd_rate":     0.60,
        "first_style":  "mixed",
        "member_coverage": (0.70, 0.95),
        "ghost_member_rate": 0.06,
        "null_rates": {"lead_email":0.12, "lead_phone":0.15, "address":0.18, "aum":0.08, "crd":0.40},
    },
    "C": {
        "name":         "Bloomberg",
        "prefix":       "SRC",
        "member_prefix":"SRC_M",
        "team_rate":    0.64,
        "aum_bias":     200,    # teams <$200M included at only 35% rate
        "crd_rate":     0.75,
        "first_style":  "formal",
        "member_coverage": (0.60, 0.90),
        "ghost_member_rate": 0.03,
        "null_rates": {"lead_email":0.08, "lead_phone":0.10, "address":0.05, "aum":0.05},
    },
}

# ─────────────────────────────────────────────
# STEP 4: Generate source records
# ─────────────────────────────────────────────

source_teams   = {k: [] for k in SOURCE_CONFIG}
source_members = {k: [] for k in SOURCE_CONFIG}
gt_team_links  = []   # golden_team_id → {src_A_id, src_B_id, src_C_id}
gt_member_links= []   # golden_member_id → {src_A_id, src_B_id, src_C_id}

# Member link tracking: golden_member_id → {src: src_member_id}
member_link_map = {m["golden_member_id"]: {} for m in golden_members}

src_team_counters   = {k: 1 for k in SOURCE_CONFIG}
src_member_counters = {k: 1 for k in SOURCE_CONFIG}

print("Generating source records...")

for team in golden_teams:
    tid     = team["golden_team_id"]
    aum     = team["aum_millions"]
    members = team_member_map[tid]
    link_row = {"golden_team_id": tid, "src_a_id": None, "src_b_id": None, "src_c_id": None}

    for src_key, cfg in SOURCE_CONFIG.items():
        # Determine if this team appears in this source
        include = False
        if cfg["aum_bias"] and aum < cfg["aum_bias"]:
            include = random.random() < 0.35
        else:
            include = random.random() < cfg["team_rate"]

        if not include:
            continue

        # Generate source team record
        rec_id  = uid(cfg["prefix"], src_team_counters[src_key])
        src_team_counters[src_key] += 1

        style   = cfg["first_style"]
        null_r  = cfg["null_rates"]

        varied_fname = vary_first_name(team["lead_first_name"], style)
        varied_lname = corrupt_name(team["lead_last_name"], 0.04)
        varied_tname = vary_team_name(team["_base_name"], team["_prefix"], team["_suffix"], src_key)
        varied_firm  = corrupt_name(team["firm_name"], 0.02)
        varied_email = null_maybe(vary_email(team["lead_email"], varied_fname, varied_lname, team["_firm_abbrev"]), null_r.get("lead_email", 0))
        varied_phone = null_maybe(vary_phone(team["lead_phone"]), null_r.get("lead_phone", 0))
        varied_addr  = null_maybe(vary_address(team["address"], src_key), null_r.get("address", 0))
        varied_aum   = null_maybe(vary_aum(aum), null_r.get("aum", 0))
        varied_crd   = team["crd_number"] if random.random() < cfg["crd_rate"] else None
        varied_zip   = vary_zip(team["zip"])

        source_teams[src_key].append({
            "src_team_id":      rec_id,
            "golden_team_id":   tid,          # kept for reference, NOT in final source file
            "source":           cfg["name"],
            "team_name":        varied_tname,
            "firm_name":        varied_firm,
            "crd_number":       varied_crd,
            "lead_first_name":  varied_fname,
            "lead_last_name":   varied_lname,
            "lead_email":       varied_email,
            "lead_phone":       varied_phone,
            "address":          varied_addr,
            "city":             team["city"],
            "state":            team["state"],
            "zip":              varied_zip,
            "aum_millions":     varied_aum,
        })

        link_row[f"src_{src_key.lower()}_id"] = rec_id

        # Generate source member records for this team in this source
        min_cov, max_cov = cfg["member_coverage"]
        coverage = random.uniform(min_cov, max_cov)
        shown_members = [m for m in members if random.random() < coverage]
        if not shown_members:
            shown_members = [members[0]]  # always show at least lead

        for gm_id in shown_members:
            gm = next(m for m in golden_members if m["golden_member_id"] == gm_id)
            sm_id = uid(cfg["member_prefix"], src_member_counters[src_key])
            src_member_counters[src_key] += 1

            mfname = vary_first_name(gm["first_name"], style)
            mlname = corrupt_name(gm["last_name"], 0.04)
            memail = null_maybe(vary_email(gm["email"], mfname, mlname, team["_firm_abbrev"]), null_r.get("lead_email", 0) * 0.8)
            mphone = null_maybe(vary_phone(gm["phone"]), null_r.get("lead_phone", 0) * 0.8)

            source_members[src_key].append({
                "src_member_id":    sm_id,
                "golden_member_id": gm_id,   # reference only
                "src_team_id":      rec_id,
                "source":           cfg["name"],
                "first_name":       mfname,
                "last_name":        mlname,
                "email":            memail,
                "phone":            mphone,
                "title":            gm["title"],
                "is_lead":          gm["is_lead"],
                "firm_name":        varied_firm,
                "city":             team["city"],
                "state":            team["state"],
            })
            member_link_map[gm_id][src_key] = sm_id

        # Ghost members (data errors)
        if random.random() < cfg["ghost_member_rate"]:
            ghost_id = uid(cfg["member_prefix"], src_member_counters[src_key])
            src_member_counters[src_key] += 1
            gfname = random.choice(FIRST_NAMES)
            glname = random.choice(LAST_NAMES)
            source_members[src_key].append({
                "src_member_id":    ghost_id,
                "golden_member_id": "GHOST",    # no real match
                "src_team_id":      rec_id,
                "source":           cfg["name"],
                "first_name":       gfname,
                "last_name":        glname,
                "email":            f"{gfname[0].lower()}{glname.lower()}@{team['_firm_abbrev']}.com",
                "phone":            make_phone(),
                "title":            random.choice(TITLES),
                "is_lead":          False,
                "firm_name":        varied_firm,
                "city":             team["city"],
                "state":            team["state"],
            })

    gt_team_links.append(link_row)

# Build member ground truth
for gm in golden_members:
    gm_id = gm["golden_member_id"]
    links = member_link_map.get(gm_id, {})
    gt_member_links.append({
        "golden_member_id": gm_id,
        "golden_team_id":   gm["golden_team_id"],
        "src_a_member_id":  links.get("A"),
        "src_b_member_id":  links.get("B"),
        "src_c_member_id":  links.get("C"),
    })

# ─────────────────────────────────────────────
# STEP 5: Write CSVs
# ─────────────────────────────────────────────
print("Writing CSVs...")

def write_csv(path, rows, exclude_cols=None):
    if not rows:
        return
    exclude_cols = exclude_cols or []
    fieldnames = [k for k in rows[0].keys() if k not in exclude_cols]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    print(f"  ✓ {os.path.basename(path):45s} {len(rows):>7,} rows")

PRIVATE_COLS_TEAM   = ["_prefix","_base_name","_suffix","_firm_abbrev","golden_team_id"]
PRIVATE_COLS_MEMBER = ["golden_member_id","golden_team_id"]

# Golden files (include everything)
write_csv(os.path.join(OUTPUT_DIR, "golden_teams.csv"),   golden_teams,   exclude_cols=["_prefix","_base_name","_suffix","_firm_abbrev"])
write_csv(os.path.join(OUTPUT_DIR, "golden_members.csv"), golden_members)

# Source files (strip golden IDs – simulates raw vendor files)
write_csv(os.path.join(OUTPUT_DIR, "source_a_broadridge.csv"), source_teams["A"],   exclude_cols=["golden_team_id"])
write_csv(os.path.join(OUTPUT_DIR, "source_b_discovery.csv"),  source_teams["B"],   exclude_cols=["golden_team_id"])
write_csv(os.path.join(OUTPUT_DIR, "source_c_bloomberg.csv"),  source_teams["C"],   exclude_cols=["golden_team_id"])

write_csv(os.path.join(OUTPUT_DIR, "source_a_members.csv"), source_members["A"], exclude_cols=["golden_member_id"])
write_csv(os.path.join(OUTPUT_DIR, "source_b_members.csv"), source_members["B"], exclude_cols=["golden_member_id"])
write_csv(os.path.join(OUTPUT_DIR, "source_c_members.csv"), source_members["C"], exclude_cols=["golden_member_id"])

# Ground truth files (the answer key)
write_csv(os.path.join(OUTPUT_DIR, "ground_truth_team_links.csv"),   gt_team_links)
write_csv(os.path.join(OUTPUT_DIR, "ground_truth_member_links.csv"), gt_member_links)

# ─────────────────────────────────────────────
# STEP 6: Summary stats
# ─────────────────────────────────────────────
def count_present(links, key):
    return sum(1 for r in links if r.get(key) is not None)

in_all_3  = sum(1 for r in gt_team_links if r["src_a_id"] and r["src_b_id"] and r["src_c_id"])
in_any_2  = sum(1 for r in gt_team_links if sum(bool(r[k]) for k in ["src_a_id","src_b_id","src_c_id"]) == 2)
in_only_1 = sum(1 for r in gt_team_links if sum(bool(r[k]) for k in ["src_a_id","src_b_id","src_c_id"]) == 1)
in_none   = sum(1 for r in gt_team_links if not any(r[k] for k in ["src_a_id","src_b_id","src_c_id"]))

ghost_count = sum(1 for s in source_members.values() for m in s if m.get("golden_member_id") == "GHOST")
member_in_all3 = sum(1 for r in gt_member_links if r["src_a_member_id"] and r["src_b_member_id"] and r["src_c_member_id"])

stats = f"""
GOLDEN RECORD TEST DATASET — SUMMARY STATISTICS
================================================
Generated: 5,000 golden teams | {len(golden_members):,} golden members

TEAM COVERAGE
  Source A (Broadridge):   {len(source_teams['A']):>6,} records  ({len(source_teams['A'])/50:.1f}% of golden)
  Source B (Discovery):    {len(source_teams['B']):>6,} records  ({len(source_teams['B'])/50:.1f}% of golden)
  Source C (Bloomberg):    {len(source_teams['C']):>6,} records  ({len(source_teams['C'])/50:.1f}% of golden)
  Total source records:    {len(source_teams['A'])+len(source_teams['B'])+len(source_teams['C']):>6,}

TEAM OVERLAP (golden teams present in N sources)
  All 3 sources:           {in_all_3:>6,}  ({in_all_3/50:.1f}%)
  Exactly 2 sources:       {in_any_2:>6,}  ({in_any_2/50:.1f}%)
  Exactly 1 source:        {in_only_1:>6,}  ({in_only_1/50:.1f}%)
  No source (dark):        {in_none:>6,}  ({in_none/50:.1f}%)

MEMBER RECORDS
  Source A members:        {len(source_members['A']):>6,}
  Source B members:        {len(source_members['B']):>6,}
  Source C members:        {len(source_members['C']):>6,}
  Ghost/phantom members:   {ghost_count:>6,}  (no golden match, injected errors)
  Members in all 3 srcs:  {member_in_all3:>6,}

DELIBERATE VARIATIONS INTRODUCED
  Name aliases (Bill/Bob/Mike…)    per source style (informal / mixed / formal)
  Team name abbreviations          Grp / Mgmt / Adv / Priv / Fin
  Suffix randomization             "LLC", "& Associates" (Source C)
  Character-level noise            ~3-5% OCR/typo corruption rate
  Phone formats                    5 formats (dashes, dots, parens, +1, raw)
  Email format variants            4 patterns per member
  Address formatting               Ste vs Suite, St vs Street (by source)
  ZIP variations                   +4 extension (15%), truncated (5%)
  AUM jitter                       ±8% per source
  CRD null rate                    A:8%  B:40%  C:25%
  Email null rate                  A:5%  B:12%  C:8%
  Phone null rate                  A:8%  B:15%  C:10%
  Address null rate                A:10% B:18%  C:5%

FILES
  golden_teams.csv                 Canonical team records (5,000)
  golden_members.csv               Canonical member records
  source_a_broadridge.csv          Raw vendor file, no golden IDs
  source_b_discovery.csv           Raw vendor file, no golden IDs
  source_c_bloomberg.csv           Raw vendor file, no golden IDs
  source_a/b/c_members.csv         Raw member files per source
  ground_truth_team_links.csv      Answer key: golden_team_id → src IDs
  ground_truth_member_links.csv    Answer key: golden_member_id → src member IDs

EVALUATION HINTS
  Precision = correctly linked pairs / all linked pairs
  Recall    = correctly linked pairs / all true pairs in ground truth
  F1        = 2 * P * R / (P + R)
  Expect ~{in_all_3} triple-match pairs for strong positive test cases.
  Ghost members test false-positive suppression.
"""

stats_path = os.path.join(OUTPUT_DIR, "summary_stats.txt")
with open(stats_path, "w") as f:
    f.write(stats)
print(stats)
print("Done. All files written to:", OUTPUT_DIR)
