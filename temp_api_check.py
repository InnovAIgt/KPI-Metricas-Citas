import urllib.request
import urllib.error
import json

urls = [
    ('leads', 'https://prospektia.red.com.sv/api/external/leads-calificados', {'X-API-Key': 'RedApi_2026_SuperSegura_9XK2'}),
    ('historiales', 'https://kpi.red.com.sv/api/historial-llamadas-ejecutivos', {'X-API-KEY': 'mso_papi_2026_7f2b9c4d8e6a1b3f5d7c9e0a2b4c6d8f'}),
    ('pbx', 'https://api.red.com.sv/idata/api/v1/desaIssabel/getResumenLlamada?fechaInicial=2026-08-03&fechaFinal=2026-08-03', {'Accept': 'application/json'}),
]

for name, url, headers in urls:
    print('===', name, url)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            text = resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.reason)
        print(e.read().decode('utf-8'))
        print('---')
        continue
    except Exception as e:
        print('ERROR', e)
        print('---')
        continue

    try:
        data = json.loads(text)
    except Exception as e:
        print('INVALID JSON:', e)
        print(text[:1000])
        print('---')
        continue

    print('TYPE', type(data))
    if isinstance(data, dict):
        print('keys', list(data.keys()))
        if 'leads' in data and isinstance(data['leads'], list):
            print('leads count', len(data['leads']))
        if 'data' in data and isinstance(data['data'], list):
            print('data count', len(data['data']))
        if 'info' in data and isinstance(data['info'], list):
            print('info count', len(data['info']))
    if isinstance(data, list):
        print('list count', len(data))
    print('sample', json.dumps(data if isinstance(data, list) else ({k: data[k] for k in list(data)[:5]} if isinstance(data, dict) else data), indent=2, ensure_ascii=False)[:2000])
    print('---')
