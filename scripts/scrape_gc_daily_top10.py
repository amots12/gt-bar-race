import os
import json
import requests
from bs4 import BeautifulSoup

# ============================
# CONFIGURATION
# ============================

OUTPUT_DIR = "data"
TOP_N = 10

RACE_MAP = {
    "tdf": "tour-de-france",
    "giro": "giro-d-italia",
    "vuelta": "vuelta-a-espana",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# ============================
# UTILITIES
# ============================

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def gap_to_seconds(gap: str) -> int:
    if not gap or "same" in gap.lower():
        return 0

    gap = gap.replace("+", "").strip()
    parts = gap.split(":")

    try:
        parts = [int(p) for p in parts]
    except ValueError:
        return 0

    if len(parts) == 2:   # mm:ss
        return parts[0] * 60 + parts[1]

    if len(parts) == 3:   # hh:mm:ss
        return parts[0] * 3600 + parts[1] * 60 + parts[2]

    return 0


# ============================
# STAGE DISCOVERY
# ============================

def get_stage_urls(race_slug: str, year: int):
    """
    Extract stage URLs from the stage dropdown.
    """
    url = f"https://www.procyclingstats.com/race/{race_slug}/{year}"
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")

    stage_urls = []

    for option in soup.find_all("option"):
        value = option.get("value")
        if value and value.startswith(f"race/{race_slug}/{year}/stage-"):
            stage_urls.append(value)

    stage_urls = sorted(
        set(stage_urls),
        key=lambda x: int(x.split("stage-")[1])
    )

    return stage_urls


# ============================
# STAGE METADATA
# ============================

def scrape_stage_metadata(stage_url: str):
    """
    Scrape finish town, distance and stage profile.
    """
    full_url = f"https://www.procyclingstats.com/{stage_url}"
    r = requests.get(full_url, headers=HEADERS, timeout=30)
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")

    meta = {
        "stage_finish": None,
        "stage_distance_km": None,
        "stage_profile": None,
    }

    title = soup.select_one(".title-line2")
    if title:
        reds = title.select("font.red")
        if len(reds) >= 2:
            meta["stage_finish"] = reds[0].get_text(strip=True)
            dist_txt = reds[1].get_text(strip=True)
            dist_txt = dist_txt.replace("(", "").replace("km)", "")
            try:
                meta["stage_distance_km"] = float(dist_txt)
            except ValueError:
                pass

    for li in soup.select("ul.list li"):
        txt = li.get_text(strip=True)
        if txt.startswith("Type"):
            meta["stage_profile"] = txt.replace("Type", "").strip()

    return meta


# ============================
# GC SCRAPING
# ============================

def scrape_gc_top10(stage_url: str, is_final: bool, race_slug: str, year: int):
    """
    Scrape TOP 10 GC.
    - stages 1–20 → stage-X-gc
    - stage 21    → /race/<race>/<year>/gc
    """

    if is_final:
        gc_path = f"race/{race_slug}/{year}/gc"
    else:
        gc_path = stage_url + "-gc"

    full_url = f"https://www.procyclingstats.com/{gc_path}"
    r = requests.get(full_url, headers=HEADERS, timeout=30)
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")

    rows = soup.select(
        "#resultsCont div.general table.results tbody tr"
    )

    gc = []

    for row in rows[:TOP_N]:
        cells = row.find_all("td")
        if len(cells) < 13:
            continue

        rank = int(cells[0].get_text(strip=True))
        gap = cells[2].get_text(strip=True)

        rider = cells[7].get_text(" ", strip=True)
        team = cells[8].get_text(" ", strip=True)

        time_span = cells[12].select_one("span.hide")
        overall_time = (
            time_span.get_text(strip=True)
            if time_span
            else cells[12].get_text(strip=True)
        )

        gc.append({
            "rank": rank,
            "rider": rider,
            "team": team,
            "gap": gap,
            "gap_seconds": gap_to_seconds(gap),
            "overall_time": overall_time
        })

    return gc


# ============================
# ORCHESTRATION
# ============================

def scrape_race_year(race_key: str, year: int):
    """
    Scrape a full Grand Tour (21 stages).
    """
    race_slug = RACE_MAP[race_key]

    stage_urls = get_stage_urls(race_slug, year)
    total_stages = len(stage_urls)

    if total_stages != 21:
        print(f"WARNING: expected 21 stages, found {total_stages}")

    for stage_index, stage_url in enumerate(stage_urls, start=1):

        print(f"Stage {stage_index}")

        is_final_stage = (stage_index == total_stages)

        meta = scrape_stage_metadata(stage_url)
        gc_rows = scrape_gc_top10(
            stage_url=stage_url,
            is_final=is_final_stage,
            race_slug=race_slug,
            year=year
        )

        if not gc_rows:
            print("  No GC data found, skipping")
            continue

        output = []

        for row in gc_rows:
            output.append({
                "race": race_key,
                "year": year,
                "stage": stage_index,

                # stage metadata
                "stage_finish": meta["stage_finish"],
                "stage_distance_km": meta["stage_distance_km"],
                "stage_profile": meta["stage_profile"],

                # GC data
                "rank": row["rank"],
                "rider": row["rider"],
                "team": row["team"],
                "gap": row["gap"],
                "gap_seconds": row["gap_seconds"],
                "overall_time": row["overall_time"],
            })

        out_dir = os.path.join(OUTPUT_DIR, race_key, str(year))
        ensure_dir(out_dir)

        out_file = os.path.join(out_dir, f"stage_{stage_index:02d}.json")
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"  Saved {out_file}")


# ============================
# ENTRY POINT
# ============================

if __name__ == "__main__":
    scrape_race_year("tdf", 2023)
    # scrape_race_year("giro", 2023)
    # scrape_race_year("vuelta", 2023)
