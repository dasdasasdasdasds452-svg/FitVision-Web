$content = Get-Content 'src/app/history/detail/page.tsx' -Raw
$content = $content -replace "timestamp: data.time,", "timestamp: data.time, language: language,"
$content = $content -replace '}, \[\]\);', '}, [language]);'
Set-Content 'src/app/history/detail/page.tsx' $content
