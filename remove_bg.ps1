# PowerShell script to remove animated background HTML from all HTML files

$files = Get-ChildItem -Path "C:\Users\kultp\Downloads\Papa-master" -Filter "*.html" -Recurse

$removeCode = @"
<div class="area" >
            <ul class="circles">
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
            </ul>
    </div >
"@

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace "(?s)<body>\s*$removeCode\s*", "<body>`n"
    Set-Content $file.FullName $content
}