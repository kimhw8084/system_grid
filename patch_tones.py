
import re

files = ['frontend/src/components/External.tsx', 'frontend/src/components/MonitoringGrid.tsx', 'frontend/src/components/ServicesReal.tsx']

# Tones to cast
tones = ['neutral', 'info', 'success', 'warning', 'danger']

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    for tone in tones:
        content = content.replace(f"tone: '{tone}'", f"tone: '{tone}' as OperationalRowActionTone")
        
    with open(file_path, 'w') as f:
        f.write(content)
    print(f"Patched {file_path}")
