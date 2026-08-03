import json
import urllib.request
import datetime

hoy = datetime.date.today()
hace7 = hoy - datetime.timedelta(days=7)
url = f'https://api.red.com.sv/idata/api/v1/desaIssabel/getResumenLlamada?fechaInicial={hace7}&fechaFinal={hoy}'
print('URL:', url)
req = urllib.request.Request(url, headers={
    'Accept': 'application/json',
    'User-Agent': 'python-urllib/3'
})
with urllib.request.urlopen(req, timeout=30) as resp:
    data = json.load(resp)
print(json.dumps(data, ensure_ascii=False, indent=2))
