---
title: 'Como coloquei o DRE no automático'
heroTitle: 'Como coloquei o <em>DRE</em><br/>no <span class="accent">automático</span>'
description: 'O fechamento vivia espalhado em seis fontes e me tomava um dia inteiro. Botei cada uma no automático, com a IA categorizando extrato e cartão no meu critério, e o mês passou a fechar cedo o bastante pra corrigir rota enquanto ainda dá.'
pubDate: 'Mar 24 2026'
tags: ['financeiro', 'dre', 'ia']
keywords: ['DRE automático', 'fechamento do mês', 'controladoria PME', 'categorizar despesas com IA', 'quanto sobrou no mês', 'IA para financeiro', 'IA para dono de empresa']
---

Pergunta pra qualquer dono: quanto sobrou no mês passado, e por quê? A maioria não responde na hora. Eu também não respondia. O número existia, mas só ficava pronto lá pelo dia 10, depois de eu perder um dia inteiro juntando tudo na mão.

E dia 10 é tarde. Quando o fechamento fica pronto, o mês já acabou. Se deu ruim, você descobre quando não dá mais pra reagir.

## Por que fechar o mês é tão chato

O problema nem é preguiça. É que **o número não mora num lugar só**. Ele está espalhado: o que vendeu no salão, o que vendeu no iFood, o que saiu do banco, o que passou no cartão, a folha, as conferências. Seis lugares, seis formatos, cada um do seu jeito.

E juntar não é nem a pior parte.

> O trabalho de verdade é categorizar.

Cada gasto do extrato e cada linha do cartão precisa virar uma categoria, senão o total não diz nada. "Saiu tanto" é inútil. "Saiu tanto com insumo, tanto com equipe, tanto com taxa de marketplace" é decisão. É essa classificação, linha por linha, que come a tarde.

## Como resolvi

Cada fonte ganhou um coletor que busca sozinho e joga no lugar certo do DRE. O que vendeu, ele pega direto do PDV e do iFood. O que gastei, ele lê do extrato e das faturas do cartão.

A parte que era o inferno, categorizar extrato e cartão, é onde a IA entra. Ela olha o meu histórico dos meses anteriores e a minha tabela de referência, e classifica cada lançamento do jeito que **eu já classificaria**. Não é ela adivinhando: é ela repetindo o meu critério, rápido.

E tem uma trava que eu não abro mão: antes de gravar qualquer coisa, ele me mostra o resultado pra eu conferir. Eu confio, mas confiro. Num número que vira decisão, IA que grava sozinha sem eu ver é convite pra erro caro.

## O que mudou de verdade

O tempo caiu, óbvio. O dia perdido virou rodar e conferir.

Mas não é isso que importa. O que mudou foi **quando** eu enxergo o mês. Agora o fechamento fica pronto no comecinho do mês seguinte, cedo o bastante pra eu corrigir rota enquanto ainda dá. Parei de dirigir olhando só pro retrovisor.

Três anos atrás isso começou pequeno, com eu subindo uma planilha solta pra IA e pedindo pra ela achar o que eu não via. [Contei aquele começo aqui](/labs/como-gpt-4-ajuda-rotina/). Hoje é um sistema que fecha o mês de duas empresas quase sozinho.

***

Montar uma controladoria que junta as fontes e categoriza no seu critério, sem você perder o controle do número, é exatamente o tipo de projeto que eu ajudo empresas a montar.

**Stack:** um coletor por fonte (PDV e iFood puxados via navegador, extrato e cartão lidos direto dos arquivos do banco), categorização por IA ancorada no histórico e numa tabela de referência, tudo gravado numa planilha única de DRE, com um passo de conferência obrigatório antes de qualquer escrita.
