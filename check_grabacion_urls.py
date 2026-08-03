import json, urllib.request

url = 'https://sbopifiiyezmvsadwkpg.supabase.co/rest/v1/llamadas?select=grabacion_url,uniqueid,nombre,destino,fecha_hora&limit=10'
headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNib3BpZmlieWV6bXZzYWR3c3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzM0OTYsImV4cCI6MjEwMDMwOTQ5Nn0.ZI5y8lroFF529Xr-Otm1fcq6H2lhbh9e3s-WU9O6I7A',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNib3BpZmlieWV6bXZzYWR3c3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzM0OTYsImV4cCI6MjEwMDMwOTQ5Nn0.ZI5y8lroFF529Xr-Otm1fcq6H2lhbh9e3s-WU9O6I7A',
    'Accept': 'application/json'
}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=20) as resp:
    data = json.load(resp)
print(json.dumps(data, ensure_ascii=False, indent=2))
