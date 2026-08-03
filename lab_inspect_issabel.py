import json
import urllib.request
import urllib.error
import sys

URL_TEMPLATE = "https://api.red.com.sv/idata/api/v1/desaIssabel/getResumenLlamada?fechaInicial={start}&fechaFinal={end}"

FIELDS_TO_CHECK = [
    "grabacion",
    "grabacion_url",
    "url_grabacion",
    "recording",
    "recording_url",
    "audio",
    "audio_url",
    "link_audio",
    "listen_url",
    "voice_url",
    "url_audio",
]


def fetch_url(url: str) -> str:
    headers = {"Accept": "application/json"}
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as resp:
        return resp.read().decode("utf-8")


def inspect_response(text: str):
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        print("ERROR: Response is not valid JSON:", exc)
        print(text)
        return

    if isinstance(data, dict):
        print("Top-level keys:", list(data.keys()))
        if "info" in data and isinstance(data["info"], list):
            items = data["info"]
            print("info length:", len(items))
            if items:
                sample = items[0]
                print("Sample item keys:", list(sample.keys()))
                print("Candidate recording fields:")
                for key in FIELDS_TO_CHECK:
                    if key in sample:
                        print("  -", key, "=>", sample.get(key))
                print("Fields matching regex /grabac|record|audio|link/i:")
                for key in sample:
                    if any(token in key.lower() for token in ["grabac", "record", "audio", "link"]):
                        print("  -", key)
        else:
            print("Response does not contain 'info' array.")
    else:
        print("Response is not a JSON object.")
        print(type(data))


if __name__ == "__main__":
    if len(sys.argv) not in (1, 3):
        print("Usage: python lab_inspect_issabel.py [fechaInicial fechaFinal]")
        sys.exit(1)

    if len(sys.argv) == 1:
        start = "2026-07-20"
        end = "2026-07-20"
    else:
        start, end = sys.argv[1], sys.argv[2]

    url = URL_TEMPLATE.format(start=start, end=end)
    print("Fetching:", url)
    try:
        text = fetch_url(url)
        inspect_response(text)
    except urllib.error.HTTPError as err:
        print("HTTP Error:", err.code, err.reason)
        print(err.read().decode("utf-8"))
    except Exception as err:
        print("Fetch failed:", err)
