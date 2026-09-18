import csv, json, sys, os
sys.path.insert(0, os.path.abspath('.'))

csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'dataset', 'INVESTRA_Kolkata_Synthetic_Crime_Dataset.csv'))
with open(csv_path, encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

total_ev = 0
total_tl = 0
for r in rows:
    try:
        ev = json.loads(r.get('Evidence', '[]'))
        total_ev += len(ev)
        print(f"{r['Report Number']}: {len(ev)} evidence items: {[e['type'] for e in ev]}")
    except Exception as ex:
        print(f"{r['Report Number']}: Evidence parse error: {ex}")
    
    desc = r.get('Complete Description in Brief', '')
    if 'Chronological Timeline:' in desc:
        lines = desc.split('Chronological Timeline:')[1].strip().split('\n')
    else:
        lines = desc.strip().split('\n')
    import re
    pattern = re.compile(r'^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*\u2014\s*([^:]+):\s*(.*?)(?:\[Responsible:\s*([^\]]+)\])?$')
    count = sum(1 for l in lines if pattern.match(l.strip()))
    total_tl += count
    print(f"  Timeline events: {count}")

print()
print(f"Total dataset evidence records: {total_ev}")
print(f"Total cases: {len(rows)}")
print(f"Total timeline events (parsed): {total_tl}")
print(f"RAG docs: {len(rows)}")
print(f"All evidence in DB = dataset({total_ev}) + RAG({len(rows)}) = {total_ev + len(rows)}")
