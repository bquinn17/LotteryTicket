#!/usr/bin/env python3
from datetime import datetime
import json
import re
import urllib.request
from pathlib import Path
import xml.etree.ElementTree as ET
from html.parser import HTMLParser


REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "max-age=0",
}
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
CURRENT_JACKPOTS_PATH = DATA_DIR / "current_jackpots.json"
MEGAMILLIONS_CSV_PATH = DATA_DIR / "past_megamillions_jackpots.csv"
POWERBALL_CSV_PATH = DATA_DIR / "past_powerball_jackpots.csv"
CSV_HEADER = "datetime,jackpot estimate"
MEGAMILLIONS_URL = "https://www.megamillions.com/"
MEGAMILLIONS_API_URL = "https://www.megamillions.com/cmspages/utilservice.asmx/GetLatestDrawData"
POWERBALL_URL = "https://www.powerball.com/"

# XPaths for the span containing the current jackpot estimate (format: "$118 Million")
POWERBALL_JACKPOT_XPATHS = [
    "/html/body/main/div/div/div[2]/div[2]/div/div/div[2]/span[2]",
    "//*[@id=\"next-drawing\"]/div/div/div[2]/span[2]"
]

VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input",
             "link", "meta", "source", "track", "wbr"}
_XPATH_SEGMENT_RE = re.compile(r"^(\w+)(?:\[(\d+)\])?$")
_XPATH_ID_PREFIX_RE = re.compile(r'^//\*\[@id="([^"]+)"\](.*)$')


def fetch_html(url):
    request = urllib.request.Request(url, headers=REQUEST_HEADERS)
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.read().decode("utf-8")


def normalize_jackpot(raw_text):
    cleaned = " ".join(raw_text.split())
    match = re.search(r"(\d+(?:\.\d+)?)\s*(Million|Billion)", cleaned, re.IGNORECASE)
    if not match:
        return 0.0

    value = float(match.group(1))
    unit = match.group(2).lower()
    if unit == "billion":
        return value * 1_000_000_000.0
    return value * 1_000_000.0


class _Node:
    def __init__(self, tag, attrs=None, parent=None):
        self.tag = tag
        self.attrs = attrs or {}
        self.parent = parent
        self.children = []
        self.text_parts = []

    def text_content(self):
        parts = []
        stack = [self]
        while stack:
            node = stack.pop(0)
            parts.extend(node.text_parts)
            stack = list(node.children) + stack
        return " ".join(p for p in parts if p.strip())


class _DomBuilder(HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = _Node("__root__")
        self.current = self.root

    def handle_starttag(self, tag, attrs):
        node = _Node(tag, dict(attrs), self.current)
        self.current.children.append(node)
        if tag not in VOID_TAGS:
            self.current = node

    def handle_endtag(self, tag):
        node = self.current
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root:
            self.current = node.parent

    def handle_startendtag(self, tag, attrs):
        node = _Node(tag, dict(attrs), self.current)
        self.current.children.append(node)

    def handle_data(self, data):
        self.current.text_parts.append(data)


def _find_by_id(node, target_id):
    if node.attrs.get("id") == target_id:
        return node
    for child in node.children:
        result = _find_by_id(child, target_id)
        if result is not None:
            return result
    return None


def _navigate_from(start, path):
    current = [start]
    for segment in (s for s in path.split("/") if s):
        match = _XPATH_SEGMENT_RE.match(segment)
        if not match:
            return []
        tag = match.group(1)
        index = int(match.group(2)) if match.group(2) else 1
        next_nodes = []
        for node in current:
            matching = [c for c in node.children if c.tag == tag]
            if len(matching) >= index:
                next_nodes.append(matching[index - 1])
        current = next_nodes
        if not current:
            return []
    return current


def _xpath_select(root, xpath):
    id_match = _XPATH_ID_PREFIX_RE.match(xpath)
    if id_match:
        target_id = id_match.group(1)
        remainder = id_match.group(2)
        start = _find_by_id(root, target_id)
        if start is None:
            return []
        return _navigate_from(start, remainder)
    if xpath.startswith("/"):
        return _navigate_from(root, xpath)
    return []


def extract_jackpot_from_xpath(html, xpaths):
    try:
        builder = _DomBuilder()
        builder.feed(html)

        for xpath in xpaths:
            for node in _xpath_select(builder.root, xpath):
                normalized = normalize_jackpot(node.text_content())
                if normalized > 0.0:
                    return normalized
    except Exception:
        pass

    return None


def fetch_megamillions():
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


def fetch_powerball():
    print("Fetching Powerball...")
    html = fetch_html(POWERBALL_URL)
    with open("powerball.html", "w", encoding="utf-8") as f:
        f.write(html)
    xpath_value = extract_jackpot_from_xpath(html, POWERBALL_JACKPOT_XPATHS)
    print("xpath value: ", xpath_value)
    if xpath_value:
        return xpath_value
    return 0.0


def get_jackpots():
    values = {"megamillions": 0.0, "powerball": 0.0}

    try:
        # TODO: Remove this once the API is working again
        values["megamillions"] = 150000000.0 # fetch_megamillions()
    except Exception:
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
        parts = stripped.split(",", 1)
        if len(parts) == 2:
            try:
                return float(parts[1].strip())
            except ValueError:
                return None
        try:
            return float(stripped)
        except ValueError:
            return None

    return None


def prepend_jackpot_if_changed(csv_path, jackpot_value):
    jackpot_value = float(jackpot_value)
    latest = parse_latest_jackpot(csv_path)
    if latest is not None and abs(latest - jackpot_value) < 0.000001:
        return

    timestamp = datetime.now().isoformat(sep=" ", timespec="seconds")
    new_row = f"{timestamp},{jackpot_value:.2f}\n"
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
    prepend_jackpot_if_changed(MEGAMILLIONS_CSV_PATH, values["megamillions"])
    prepend_jackpot_if_changed(POWERBALL_CSV_PATH, values["powerball"])


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
