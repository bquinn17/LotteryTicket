#!/usr/bin/env python3
from datetime import datetime, timedelta
import gzip
import json
import random
import re
import time
import urllib.request
import zlib
from pathlib import Path
from zoneinfo import ZoneInfo
import xml.etree.ElementTree as ET

from html_xpath import iter_xpath_text


REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-encoding": "gzip, deflate",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "max-age=0",
}
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
CURRENT_JACKPOTS_PATH = DATA_DIR / "current_jackpots.json"
MEGAMILLIONS_CSV_PATH = DATA_DIR / "past_megamillions_jackpots.csv"
POWERBALL_CSV_PATH = DATA_DIR / "past_powerball_jackpots.csv"
CSV_HEADER = "datetime,jackpot estimate,next drawing"

EASTERN = ZoneInfo("America/New_York")
MM_DRAWING_DAYS = {1, 4}       # Tuesday=1, Friday=4
MM_DRAWING_HOUR, MM_DRAWING_MINUTE = 23, 0
PB_DRAWING_DAYS = {0, 2, 5}    # Monday=0, Wednesday=2, Saturday=5
PB_DRAWING_HOUR, PB_DRAWING_MINUTE = 22, 59
MEGAMILLIONS_URL = "https://www.megamillions.com/"
MEGAMILLIONS_API_URL = "https://www.megamillions.com/cmspages/utilservice.asmx/GetLatestDrawData"
POWERBALL_URL = "https://www.powerball.com/"

# XPaths for the span containing the current jackpot estimate (format: "$118 Million")
POWERBALL_JACKPOT_XPATHS = [
    "/html/body/main/div/div/div[2]/div[2]/div/div/div[2]/span[2]",
    "//*[@id=\"next-drawing\"]/div/div/div[2]/span[2]"
]

JACKPOT_PATTERN = r"\$?(\d+(?:\.\d+)?)\s*(Million|Billion)"


def fetch_html(url):
    request = urllib.request.Request(url, headers=REQUEST_HEADERS)
    with urllib.request.urlopen(request, timeout=15) as response:
        raw = response.read()
        encoding = (response.headers.get("Content-Encoding") or "").lower()
        if encoding == "gzip":
            raw = gzip.decompress(raw)
        elif encoding == "deflate":
            raw = zlib.decompress(raw)

        charset = "utf-8"
        content_type = response.headers.get("Content-Type", "")
        if "charset=" in content_type:
            charset = content_type.split("charset=", 1)[1].split(";", 1)[0].strip() or "utf-8"

        return raw.decode(charset, errors="replace")


def normalize_jackpot(raw_text):
    cleaned = " ".join(raw_text.split())
    match = re.search(JACKPOT_PATTERN, cleaned, re.IGNORECASE)
    if not match:
        return 0.0

    value = float(match.group(1))
    unit = match.group(2).lower()
    if unit == "billion":
        return value * 1_000_000_000.0
    return value * 1_000_000.0


def extract_jackpot_from_xpath(html, xpaths):
    try:
        for text in iter_xpath_text(html, xpaths):
            normalized = normalize_jackpot(text)
            if normalized > 0.0:
                return normalized
    except Exception:
        pass

    return None


def next_drawing_dt(drawing_days, hour, minute):
    now = datetime.now(EASTERN)
    for days_ahead in range(7):
        candidate = now + timedelta(days=days_ahead)
        if candidate.weekday() in drawing_days:
            draw = candidate.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if draw > now:
                return draw
    return None


def fetch_megamillions():
    print("Fetching MegaMillions...")
    xml_payload = fetch_html(MEGAMILLIONS_API_URL)
    root = ET.fromstring(xml_payload)
    inner_json = (root.text or "").strip()
    if not inner_json:
        return 0.0

    data = json.loads(inner_json)
    next_prize_pool = data.get("Jackpot", {}).get("NextPrizePool")
    if next_prize_pool is None:
        return 0.0

    return float(next_prize_pool)


POWERBALL_MAX_RETRIES = 3
POWERBALL_RETRY_DELAY = 5


def fetch_powerball():
    print("Fetching Powerball...")
    for attempt in range(POWERBALL_MAX_RETRIES):
        try:
            html = fetch_html(POWERBALL_URL)
            with open("powerball.html", "w", encoding="utf-8") as f:
                f.write(html)
            xpath_value = extract_jackpot_from_xpath(html, POWERBALL_JACKPOT_XPATHS)
            if xpath_value:
                return xpath_value
            print(f"Powerball response unparsable on attempt {attempt + 1}")
        except Exception as ex:
            print(f"Powerball fetch failed on attempt {attempt + 1}: {ex}")

        if attempt < POWERBALL_MAX_RETRIES - 1:
            time.sleep(POWERBALL_RETRY_DELAY + random.uniform(0, 2))

    return 0.0


def get_jackpots():
    values = {"megamillions": 0.0, "powerball": 0.0}

    try:
        values["megamillions"] = fetch_megamillions()
    except Exception as ex:
        print("exception thrown by fetch_megamillions: ", ex)
        pass

    try:
        values["powerball"] = fetch_powerball()
    except Exception as ex:
        print("exception thrown by fetch_powerball: ", ex)
        pass

    return values


def ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def parse_latest_jackpot(csv_path):
    if not csv_path.exists():
        return None

    for line in csv_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.lower() == CSV_HEADER:
            continue
        parts = stripped.split(",", 2)
        if len(parts) >= 2:
            try:
                return float(parts[1].strip())
            except ValueError:
                return None
        try:
            return float(stripped)
        except ValueError:
            return None

    return None


def prepend_jackpot_if_changed(csv_path, jackpot_value, next_draw=None):
    jackpot_value = float(jackpot_value)
    latest = parse_latest_jackpot(csv_path)
    if latest is not None and abs(latest - jackpot_value) < 0.000001:
        return

    timestamp = datetime.now().isoformat(sep=" ", timespec="seconds")
    next_draw_str = next_draw.strftime("%Y-%m-%d %H:%M %Z") if next_draw else ""
    new_row = f"{timestamp},{jackpot_value:.2f},{next_draw_str}\n"
    existing_lines = []
    if csv_path.exists():
        existing_lines = csv_path.read_text(encoding="utf-8").splitlines()

    body_lines = []
    for line in existing_lines:
        stripped = line.strip()
        if not stripped or stripped.lower() == CSV_HEADER:
            continue
        body_lines.append(stripped)

    new_content = CSV_HEADER + "\n" + new_row + ("\n".join(body_lines) + "\n" if body_lines else "")
    csv_path.write_text(new_content, encoding="utf-8")


def update_history_files(values):
    mm_next = next_drawing_dt(MM_DRAWING_DAYS, MM_DRAWING_HOUR, MM_DRAWING_MINUTE)
    pb_next = next_drawing_dt(PB_DRAWING_DAYS, PB_DRAWING_HOUR, PB_DRAWING_MINUTE)
    prepend_jackpot_if_changed(MEGAMILLIONS_CSV_PATH, values["megamillions"], mm_next)
    prepend_jackpot_if_changed(POWERBALL_CSV_PATH, values["powerball"], pb_next)


def write_current_jackpots(values):
    CURRENT_JACKPOTS_PATH.write_text(
        json.dumps(values, indent=2) + "\n",
        encoding="utf-8",
    )


def main():
    ensure_data_dir()
    jackpots = get_jackpots()
    write_current_jackpots(jackpots)
    update_history_files(jackpots)
    print(json.dumps(jackpots, ensure_ascii=True))


if __name__ == "__main__":
    main()
