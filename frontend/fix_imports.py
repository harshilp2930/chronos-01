import os
import glob

directory = r'c:\Users\nujem\chronos-01\frontend\components'
files = glob.glob(directory + '/**/*.tsx', recursive=True)

count = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'NoisePatternCard' in content:
        new_content = content.replace('NoisePatternCard', 'PremiumCard')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
        count += 1

print(f"Successfully updated {count} files.")
