import os

files = [
    r"C:\fit\fitvision-next\src\app\page.tsx",
    r"C:\fit\fitvision-next\src\app\chat\page.tsx",
    r"C:\fit\fitvision-next\src\app\history\page.tsx",
    r"C:\fit\fitvision-next\src\app\history\detail\page.tsx",
    r"C:\fit\fitvision-next\src\app\settings\page.tsx",
    r"C:\fit\fitvision-next\src\app\summary\page.tsx",
    r"C:\fit\fitvision-next\src\app\tutorial\page.tsx"
]

anime_effect = """    useEffect(() => {
        // Entrance animation
        anime({
            targets: '.animate-fade-in-up',
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 800,
            easing: 'easeOutExpo',
            delay: anime.stagger(150, { start: 100 })
        });
    }, []);"""

import re

for file_path in files:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        content = content.replace('import anime from "animejs";\n', '')
        content = content.replace('import anime from "animejs";', '')
        
        # Replace exact useEffect block if matches
        content = content.replace(anime_effect + "\n", "")
        content = content.replace(anime_effect, "")
        
        # Try finding the useEffect block using regex in case indentation differs
        pattern = r"    useEffect\(\(\) => \{\n\s*// Entrance animation\n\s*anime\(\{\n\s*targets: '\.animate-fade-in-up',\n\s*opacity: \[0, 1\],\n\s*translateY: \[30, 0\],\n\s*duration: 800,\n\s*easing: 'easeOutExpo',\n\s*delay: anime\.stagger\(150, \{ start: 100 \}\)\n\s*\}\);\n\s*\}, \[\]\);\n?"
        content = re.sub(pattern, "", content)
        
        # Another pattern if there's no comment
        pattern2 = r"    useEffect\(\(\) => \{\n\s*anime\(\{\n\s*targets: '\.animate-fade-in-up',\n\s*opacity: \[0, 1\],\n\s*translateY: \[30, 0\],\n\s*duration: 800,\n\s*easing: 'easeOutExpo',\n\s*delay: anime\.stagger\(150, \{ start: 100 \}\)\n\s*\}\);\n\s*\}, \[\]\);\n?"
        content = re.sub(pattern2, "", content)
        
        content = content.replace("animate-fade-in-up opacity-0", "animate-fade-in-up")
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Processed {file_path}")
    except Exception as e:
        print(f"Failed {file_path}: {e}")

print("Done all")
