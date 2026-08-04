import urllib.request

url = 'https://api.red.com.sv/idata/api/v1/desaIssabel/getResumenLlamada?fechaInicial=2026-07-28&fechaFinal=2026-08-04'
headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=30) as resp:
    text = resp.read().decode('utf-8')
print(text[:5000])
