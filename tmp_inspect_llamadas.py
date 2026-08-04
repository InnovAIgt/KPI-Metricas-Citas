import urllib.request
import json

url = 'https://api.red.com.sv/idata/api/v1/desaIssabel/getResumenLlamada?fechaInicial=2026-07-28&fechaFinal=2026-08-04'
req = urllib.request.Request(url, headers={'Accept': 'application/json'})
with urllib.request.urlopen(req, timeout=30) as resp:
    data = json.load(resp)

print(type(data).__name__)
print('keys=', list(data.keys()) if isinstance(data, dict) else 'not-dict')
print('ok=', data.get('ok') if isinstance(data, dict) else None)
info = data.get('info') if isinstance(data, dict) else None
print('info_type=', type(info).__name__ if info is not None else 'None')
print('info_len=', len(info) if isinstance(info, list) else 'not-list')
if isinstance(info, list) and info:
    item = info[0]
    print('sample_keys=', list(item.keys()))
    print('sample_snippet=', json.dumps(item, ensure_ascii=False)[:1000])
