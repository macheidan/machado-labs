@echo off
REM Watcher de vendas sob demanda. Atende o botao "atualizar vendas" do
REM dashboard (18h-24h): quando chega um pedido, coleta o Saipos do dia e
REM republica o JSON. Agende no Task Scheduler:
REM   - opcao A (recomendada): gatilho a cada 1 min, 18:00-23:59, rodando
REM     este .cmd com o argumento  --once
REM   - opcao B: iniciar 18:00 e parar 00:00, rodando sem argumento (loop)
cd /d "C:\claude_project\machado-labs\_ferramentas\dashboard\coletores"
echo. >> "..\data\vendas_watch.log"
echo ===== %DATE% %TIME% ===== >> "..\data\vendas_watch.log"
"C:\Python314\python.exe" vendas_watch.py %* >> "..\data\vendas_watch.log" 2>&1
