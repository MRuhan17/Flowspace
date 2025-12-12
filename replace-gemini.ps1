# Script to replace Gemini with OpenAI across all AI files

Write-Host "Replacing Gemini API with OpenAI API in all files..." -ForegroundColor Green

# Files to update
$files = @(
    "backend\src\ai\themeGenerator.js",
    "backend\src\ai\workflowAssistant.js",
    "backend\src\ai\memory.js",
    "backend\src\ai\layoutAdvisor.js",
    "backend\src\ai\flowchart.js",
    "backend\src\ai\diagramValidator.js",
    "backend\src\ai\designAssistant.js"
)

foreach ($file in $files) {
    $fullPath = "c:\Users\M Ruhan\OneDrive\Desktop\Flowspace\$file"
    
    if (Test-Path $fullPath) {
        Write-Host "Processing $file..." -ForegroundColor Yellow
        
        $content = Get-Content $fullPath -Raw
        
        # Replace imports
        $content = $content -replace "import \{ GoogleGenerativeAI \} from '@google/generative-ai';", "import OpenAI from 'openai';"
        $content = $content -replace "import \{ GoogleGenerativeAI \} from \""@google/generative-ai\""", "import OpenAI from 'openai';"
        
        # Replace initialization
        $content = $content -replace "const genAI = new GoogleGenerativeAI\(process\.env\.GEMINI_API_KEY \|\| ''\);", "const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key' });"
        $content = $content -replace "const genAI = new GoogleGenerativeAI\(process\.env\.GEMINI_API_KEY \|\| \""YOUR_API_KEY\""\);", "const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key' });"
        
        # Replace API key checks
        $content = $content -replace "process\.env\.GEMINI_API_KEY", "process.env.OPENAI_API_KEY"
        $content = $content -replace "GEMINI_API_KEY", "OPENAI_API_KEY"
        
        # Replace model calls
        $content = $content -replace "const model = genAI\.getGenerativeModel\(\{ model: 'gemini-pro' \}\);", ""
        $content = $content -replace "const result = await model\.generateContent\(prompt\);", ""
        $content = $content -replace "const response = await result\.response;", ""
        $content = $content -replace "const text = response\.text\(\);", ""
        
        # Save
        Set-Content -Path $fullPath -Value $content
        
        Write-Host "✓ Updated $file" -ForegroundColor Green
    }
}

Write-Host "`nAll files updated! Please review the changes." -ForegroundColor Cyan
