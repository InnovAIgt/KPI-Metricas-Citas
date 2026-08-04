import urllib.request
import urllib.error
import json

base = 'https://sbopifiiyezmvsadwkpg.supabase.co/rest/v1'
headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNib3BpZmlieWV6bXZzYWR3c3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzM0OTYsImV4cCI6MjEwMDMwOTQ5Nn0.ZI5y8lroFF529Xr-Otm1fcq6H2lhbh9e3s-WU9O6I7A',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNib3BpZmlieWV6bXZzYWR3c3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzM0OTYsImV4cCI6MjEwMDMwOTQ5Nn0.ZI5y8lroFF529Xr-Otm1fcq6H2lhbh9e3s-WU9O6I7A',
    'Accept': 'application/json'
}
start = '2026-08-03'

for tbl, datecol in [('leads', 'fecha_agendada'), ('llamadas', 'fecha'), ('historiales', 'fecha')]:
    q = f'{base}/{tbl}?select=*&{datecol}=eq.{start}'
    print('QUERY', tbl, q)
    req = urllib.request.Request(q, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            text = resp.read().decode('utf-8')
        data = json.loads(text)
        print(tbl, 'rows', len(data))
        if len(data) <= 10:
            print(json.dumps(data, ensure_ascii=False, indent=2))
        else:
            print('sample', json.dumps(data[:5], ensure_ascii=False, indent=2))
    except urllib.error.HTTPError as e:
        print(tbl, 'HTTP ERROR', e.code, e.reason)
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(tbl, 'ERROR', e)
    print('---')
