import sys
sys.path.insert(0, 'src')
from web import get_component

results = get_component('results')
biometrics = get_component('biometrics')
assembled = results.replace('{{BIOMETRICS}}', biometrics)

checks = [
    'coherency-chart',
    'coherency-empty',
    'coherency-score-val',
    'rhythm-bars',
    'rhythm-empty',
    'rhythm-variance-val',
    'saturation-gauge',
    'saturation-empty',
    'saturation-needle',
    'radar-poly',
    'summary-card',
]

print('=== Assembly Validation ===')
for check in checks:
    found = (f'id="{check}"' in assembled)
    status = 'OK' if found else 'MISSING'
    print(f'  [{status}] {check}')

radar_pos = assembled.find('id="forensic-radar"')
coherency_pos = assembled.find('id="coherency-chart"')
verdict_pos = assembled.find('id="summary-card"')
print('')
print('=== Order Check ===')
print(f'  Radar card at char:    {radar_pos}')
print(f'  Coherency card at:     {coherency_pos}')
print(f'  Verdict card at:       {verdict_pos}')
print(f'  Order correct:         {radar_pos < coherency_pos < verdict_pos}')
