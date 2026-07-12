---
title: 'Economizamos 2% no custo de compra sem contratar ninguém, com essa IA'
heroTitle: 'Economizamos <em>2%</em> no custo de compra<br/>sem contratar ninguém, com essa <span class="accent">IA</span>'
description: 'Sabemos o custo real de cada insumo e qual fornecedor está mais barato, sem calcular nada. Minha equipe deixa de comprar no hábito e passa a comprar no melhor preço.'
pubDate: 'Jun 28 2026'
tags: ['operacao', 'compras', 'ia']
keywords: ['custo real de insumo', 'preço de fornecedor', 'nota fiscal Receita Federal', 'comparar preço de fornecedor', 'controle de custos', 'CMV', 'IA para compras']
---

**Desafio:** são mais de 130 insumos por loja, comprados toda semana. O preço negociado quase nunca é o que chega na nota (imposto, frete e valores fora do combinado entram na conta), e comparar fornecedor virava regra de 3 na mão.

**Solução:** um bot puxa as notas direto da Receita Federal, já com imposto e frete embutidos, e normaliza tudo por unidade real (preço por kg ou unidade) pra comparar fornecedor maçã com maçã. A intranet avisa no dia em que um insumo sobe.

**Resultados:** com o alerta na mão, o setor de compras negocia na hora com o fornecedor e usa o mesmo número pra pressionar os outros. No fim, 2% a menos no custo de compra, sem contratar ninguém.

***

Você senta com o fornecedor, negocia um preço, aperta a mão. Depois a nota chega e o número é outro. Imposto, frete, um valor que veio diferente do combinado, e de repente o custo real do insumo não é o que você anotou. Eu tocava a operação decidindo em cima de um preço que **não existia de verdade.**

## O preço combinado é uma ficção

O preço da negociação é uma promessa. O preço que importa é o que **bate no seu custo**, e esse só aparece depois, embutido na nota, misturado com tributo e frete. Quem controla custo pelo que combinou está controlando uma ficção.

E tem uma segunda armadilha, mais silenciosa: mesmo quando eu tinha o preço real, comparar fornecedor era **maçã com laranja.** O insumo de uma marca não vem no mesmo peso da outra. Pra saber quem estava mais barato de verdade, toda vez era uma regra de 3 na mão. Ninguém faz regra de 3 todo dia, então na prática ninguém compara. Você compra no hábito, não no melhor preço.

## Puxei o número da fonte, não do papel

Resolvi indo na fonte de verdade: as minhas próprias notas fiscais, direto na Receita Federal. Um bot busca cada nota, já com imposto e frete embutidos, e **ajusta e categoriza todo item** num formato comparável. Preço por unidade real, normalizado, maçã com maçã.

Aí a regra de 3 morreu. O sistema já me diz quanto custa o mesmo insumo em cada fornecedor, no mesmo padrão, sem eu calcular nada.

## O custo virou algo que a equipe vê na hora

O pulo final foi tirar isso do meu colo e botar na [central da equipe](/labs/operacao-nao-depender-de-mim/). A seção de preços de insumos **avisa todo dia quando um item subiu.** O administrativo vê na hora, não no fechamento do mês, quando o estrago já passou.

> Custo que você descobre no fim do mês é custo que você só constata. Custo que você vê no dia é custo que você negocia.

***

Tirar o custo real de dentro da nota, deixar tudo comparável e avisar a equipe no dia em que muda é exatamente o tipo de projeto que eu ajudo empresas a montar.

**Stack:** um bot que busca as notas fiscais direto na Receita Federal, extrai cada item já com imposto e frete, normaliza por unidade real pra deixar fornecedores comparáveis, e alimenta uma seção de preços de insumos na intranet que dispara um alerta diário quando algum item sobe.
