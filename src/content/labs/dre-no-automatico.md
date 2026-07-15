---
title: 'Como coloquei o DRE no automático'
heroTitle: 'Como coloquei o <em>DRE</em><br/>no <span class="accent">automático</span>'
description: 'O fechamento vivia espalhado em seis fontes e me tomava um dia inteiro. Botei cada uma no automático, com a IA categorizando extrato e cartão no meu critério, e o mês passou a fechar cedo o bastante pra corrigir rota enquanto ainda dá.'
pubDate: 'Mar 24 2026'
tags: ['financeiro', 'dre', 'ia']
keywords: ['DRE automático', 'fechamento do mês', 'controladoria PME', 'categorizar despesas com IA', 'quanto sobrou no mês', 'IA para financeiro', 'IA para dono de empresa']
---

<div class="case-summary">

**Desafio:** o número do mês vivia espalhado em seis fontes (salão, iFood, banco, cartão, folha, conferências), cada uma no seu formato. Juntar e categorizar linha por linha tomava um dia inteiro, e o fechamento só ficava pronto lá pelo dia 10.

**Solução:** um coletor por fonte, que busca sozinho e joga no lugar certo do DRE, com a IA categorizando extrato e cartão no meu próprio critério, ancorada no histórico. Antes de gravar qualquer coisa, ela me mostra o resultado pra eu conferir.

**Resultados:** o dia perdido virou rodar e conferir, e o fechamento de duas empresas fica pronto no comecinho do mês seguinte, cedo o bastante pra corrigir rota enquanto ainda dá.

</div>

## O número do mês não mora num lugar só

Pergunta pra qualquer dono: quanto sobrou no mês passado, e por quê? A maioria não responde na hora. Pra mim, por muito tempo, esse número só ficava pronto lá pelo dia 10, depois de um dia inteiro juntando tudo na mão. **Fechamento que só fica pronto com o mês já encerrado não serve pra decidir nada.** Se deu ruim, você descobre quando não dá mais pra reagir.

E tem uma segunda armadilha: juntar nem é a pior parte. **O trabalho de verdade é categorizar.** Cada gasto do extrato e cada linha do cartão precisa virar uma categoria, senão o total não diz nada. "Saiu tanto" é inútil. "Saiu tanto com insumo, tanto com equipe, tanto com taxa de marketplace" é decisão. É essa classificação, linha por linha, que come a tarde.

## Botei a IA pra repetir o meu critério, não pra adivinhar

O caminho óbvio seria contratar alguém pra digitar isso todo mês, ou assinar um sistema de gestão que promete integrar tudo. Mas o primeiro é pagar por trabalho braçal que erra em silêncio, e o segundo esbarra no mesmo problema: as minhas seis fontes não falam a mesma língua, e nenhum sistema de prateleira sabe **o meu** critério de categorização.

Então cada fonte ganhou um coletor que busca sozinho e joga no lugar certo do DRE. O que vendeu, ele pega direto do PDV e do iFood. O que gastei, ele lê do extrato e das faturas do cartão. Ninguém digita nada.

E a parte que era o inferno, categorizar, é onde a IA entra: ela olha o meu histórico dos meses anteriores e a minha tabela de referência, e classifica cada lançamento do jeito que **eu já classificaria.** Não é ela adivinhando, é ela repetindo o meu critério, rápido.

## Parei de dirigir olhando pro retrovisor

Na prática, funciona assim: eu rodo, a IA categoriza tudo e **me mostra o resultado antes de gravar qualquer coisa.** Eu confio, mas confiro. Num número que vira decisão, IA que grava sozinha sem eu ver é convite pra erro caro. O dia perdido virou rodar e conferir.

Mas o tempo não é o que importa. O que mudou foi **quando** eu enxergo o mês: o fechamento de duas empresas fica pronto no comecinho do mês seguinte, cedo o bastante pra eu corrigir rota enquanto ainda dá. Três anos atrás isso começou pequeno, com eu subindo uma planilha solta pra IA e pedindo pra ela achar o que eu não via. [Contei aquele começo aqui](/labs/como-gpt-4-ajuda-rotina/).

> Número que fica pronto dia 10 é histórico. Número que fica pronto dia 2 é decisão.

***

Montar uma controladoria que junta as fontes e categoriza no seu critério, sem você perder o controle do número, é exatamente o tipo de projeto que eu ajudo empresas a montar.

**Stack:** um coletor por fonte (PDV e iFood puxados via navegador, extrato e cartão lidos direto dos arquivos do banco), categorização por IA ancorada no histórico e numa tabela de referência, tudo gravado numa planilha única de DRE, com um passo de conferência obrigatório antes de qualquer escrita.
