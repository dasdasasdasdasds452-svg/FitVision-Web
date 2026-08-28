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

def remove_anime_calls(content):
    while True:
        idx = content.find("anime({")
        if idx == -1:
            break
        
        # find matching closing brace/paren
        stack = 0
        end_idx = idx
        for i in range(idx, len(content)):
            if content[i] == '{':
                stack += 1
            elif content[i] == '}':
                stack -= 1
                if stack == 0:
                    end_idx = i
                    break
        
        # also need to remove the trailing `);`
        if content[end_idx+1:end_idx+3] == ");":
            end_idx += 2
        elif content[end_idx+1:end_idx+2] == ")":
            end_idx += 1
            
        content = content[:idx] + content[end_idx+1:]
    return content

for file_path in files:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # re-apply DOMPurify for chat/page.tsx
        if "chat" in file_path:
            content = content.replace('import { marked } from "marked";', 'import { marked } from "marked";\nimport DOMPurify from "dompurify";')
            content = content.replace('const renderMarkdown = (text: string): string => marked(text) as string;', '''const renderMarkdown = (text: string): string => {
        const raw = marked(text) as string;
        return DOMPurify.sanitize(raw, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'code', 'pre', 'a', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
            ALLOW_DATA_ATTR: false,
        });
    };''')

        # apply anime fixes
        content = content.replace('import anime from "animejs";\n', '')
        content = content.replace('import anime from "animejs";', '')
        
        content = remove_anime_calls(content)
        
        # remove leftover opacity-0
        content = content.replace(" animate-fade-in-up opacity-0", " animate-fade-in-up")
        content = content.replace(" opacity-0", "")
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Processed {file_path}")
    except Exception as e:
        print(f"Failed {file_path}: {e}")

print("Done all")
