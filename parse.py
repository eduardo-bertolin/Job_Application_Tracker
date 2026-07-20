import json
from pathlib import Path
try:
    data = Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-16le')
    Path('graphify-out/.graphify_detect.json').write_text(data, encoding='utf-8')
except UnicodeError:
    data = Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8-sig')

parsed = json.loads(data)
print(f"Corpus: {parsed['total_files']} files, ~{parsed['total_words']} words")
for k, v in parsed['files'].items():
    if len(v) > 0:
        print(f"  {k}: {len(v)} files")
