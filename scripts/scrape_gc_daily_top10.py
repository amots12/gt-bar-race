import json
import os
import procyclingstats as pcs


# ============================
# Configuration
# ============================

OUTPUT_DIR = "data"
TOP_N = 10

RACE_MAP = {
    "tdf": "tour-de-france",
    "giro": "giro-d-italia",
    "vuelta": "vuelta-a-espana",
}


# ============================
# Helpers
# ============================

def parse_gap_to_seconds(gap: str) -> int:
    if not gap:
        return 0

    gap = gap.strip().lower()
    if "same" in gap:
        return 0

    gap = gap.lstrip("+")
    parts = gap.split(":")

    try:
        parts = [int(p) for p in parts]
    except ValueError:
        return 0

    if len(parts) == 2:  # mm:ss
        return parts[0] * 60 + parts[1]

    if len(parts) == 3:  # hh:mm:ss
        return parts[0] * 3600 + parts[1] * 60 + parts[2]

    return 0


def seconds_to_hms(seconds: int) -> str:
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


# ============================
# Core Logic
# ============================

def scrape_race_year(race_key: str, year: int):
    race_slug = RACE_MAP[race_key]
    race = pcs.Race(f"race/{race_slug}/{year}")

    stage_urls = race.stages("stage_url")

    for stage_number, stage_url in enumerate(stage_urls, start=1):
        stage = pcs.Stage(stage_url)

        # ---- Stage metadata ----
        stage_date = stage.date()
        stage_finish = stage.finish()
        stage_distance = stage.distance()     # km
        stage_profile = stage.profile()       # flat / mountain / itt etc.

        gc = stage.gc()
        if not gc:
            continue

        leader_time_str = gc[0].get("time")
        leader_time_seconds = parse_gap_to_seconds(leader_time_str)

        records = []

        for row in gc[:TOP_N]:
            gap_seconds = parse_gap_to_seconds(row.get("gap"))
            overall_seconds = leader_time_seconds + gap_seconds

            records.append({
                "race": race_key,
                "year": year,
                "stage": stage_number,

                # Stage metadata
                "stage_date": stage_date,
                "stage_finish": stage_finish,
                "stage_distance_km": stage_distance,
                "stage_profile": stage_profile,

                # Rider GC data
                "rank": int(row["rank"]),
                "rider": row["rider_name"],
                "team": row["team"],

                # Time data
                "gap_seconds": gap_seconds,
                "overall_time": seconds_to_hms(overall_seconds)
            })

        output_path = os.path.join(OUTPUT_DIR, race_key, str(year))
        ensure_dir(output_path)

        with open(
            os.path.join(output_path, f"stage_{stage_number:02d}.json"),
            "w",
            encoding="utf-8"
        ) as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        print(f"Saved stage {stage_number}")


if __name__ == "__main__":
    scrape_race_year("tdf", 2023)
