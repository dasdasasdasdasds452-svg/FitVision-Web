import os
import re

files = [
    r"C:\fit\fitvision-next\src\app\page.tsx",
    r"C:\fit\fitvision-next\src\app\chat\page.tsx",
    r"C:\fit\fitvision-next\src\app\history\page.tsx",
    r"C:\fit\fitvision-next\src\app\history\detail\page.tsx",
    r"C:\fit\fitvision-next\src\app\settings\page.tsx",
    r"C:\fit\fitvision-next\src\app\summary\page.tsx",
    r"C:\fit\fitvision-next\src\app\tutorial\page.tsx"
]

for file_path in files:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Remove anime calls
        # We find anime({ ... }) spanning multiple lines
        # This regex looks for 'anime({' and then anything until '});' or '})'
        content = re.sub(r"anime\(\{[\s\S]*?\}\);?", "", content)
        
        # In chat/page.tsx, there's `useEffect(() => { if (...) { ... } }, []);` which might become empty.
        # It's fine if there's an empty useEffect or if(...) statement, but tsc won't complain about empty blocks.
        
        # Remove opacity-0
        content = content.replace(" opacity-0", "")
        content = content.replace("opacity-0 ", "")
        
        # Actually in some places it's 'animate-fade-in-up opacity-0', so we handle the leftovers.
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Processed {file_path}")
    except Exception as e:
        print(f"Failed {file_path}: {e}")

print("Done all")
