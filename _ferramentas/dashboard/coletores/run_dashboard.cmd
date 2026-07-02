@echo off
REM Coleta diaria do dashboard (chamado pelo Task Scheduler as 03h).
REM Roda os coletores, consolida em dashboard-data.json e envia via FTPS.
cd /d "C:\claude_project\machado-labs\_ferramentas\dashboard\coletores"
echo. >> "..\data\runner.log"
echo ===== %DATE% %TIME% ===== >> "..\data\runner.log"
REM --headless: Saipos sem janela (login automatico funciona; mais leve e nao
REM depende de desktop interativo as 03h, que e onde o browser travava).
"C:\Python314\python.exe" runner.py --headless >> "..\data\runner.log" 2>&1
