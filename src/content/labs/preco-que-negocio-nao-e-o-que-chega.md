---
title: Economizamos 2% no custo de compra sem contratar ninguém, com essa IA
heroTitle: Economizamos <em>2%</em> no custo de compra<br/>sem contratar ninguém, com essa <span class="accent">IA</span>
description: Sabemos o custo real de cada insumo e qual fornecedor está mais barato, sem calcular nada. Minha equipe deixa de comprar no hábito e passa a comprar no melhor preço.
pubDate: Jun 28 2026
updatedDate: ''
heroAlt: ''
audio: /audio/preco-que-negocio-nao-e-o-que-chega.mp3
tags:
  - operacao
  - compras
  - ia
keywords:
  - custo real de insumo
  - preço de fornecedor
  - nota fiscal Receita Federal
  - comparar preço de fornecedor
  - controle de custos
  - CMV
  - IA para compras
---

<div class="case-summary">

**Desafio:** são mais de 130 insumos por loja, comprados toda semana. O preço negociado quase nunca é o que chega na nota (imposto, frete e valores fora do combinado entram na conta), e comparar fornecedor virava regra de 3 na mão.

**Solução:** um bot puxa as notas direto da Receita Federal, já com imposto e frete embutidos, e normaliza tudo por unidade real (por kg/un) pra comparar fornecedores. A intranet avisa no dia em que um insumo sobe.

**Resultados:** com o alerta na mão, o setor de compras negocia na hora com o fornecedor e usa o mesmo número pra pressionar os outros. No fim, 2% a menos no custo de compra, sem contratar ninguém.

</div>

## O preço combinado é uma ficção

O preço da negociação é uma promessa. O preço que importa é o que **bate no seu custo**, e esse só aparece depois, embutido na nota, misturado com tributo e frete. Quem controla custo pelo que combinou está controlando uma ficção.

E tem uma segunda armadilha, mais silenciosa: mesmo quando eu tinha o preço real, comparar fornecedor era **maçã com laranja.** O insumo de uma marca não vem no mesmo peso da outra. Pra saber quem estava mais barato de verdade, toda vez era uma regra de 3 na mão. Ninguém faz regra de 3 todo dia, então na prática ninguém compara. Você compra no hábito, não no melhor preço.

## Puxei o número da fonte, não do papel

O caminho óbvio seria resolver dentro do meu próprio sistema de pedidos, que também registra as compras. Mas **o sistema só enxerga o que alguém digita nele.** O preço que entra é o combinado, imposto e frete ficam de fora da conta, e cada fornecedor descreve o mesmo insumo com nome e peso diferentes. Eu estaria pagando alguém pra digitar a mesma ficção num lugar mais organizado, toda semana, pra mais de 130 insumos.

Resolvi indo na fonte de verdade: as minhas próprias notas fiscais, direto na Receita Federal. Um bot busca cada nota, já com imposto e frete embutidos, e **ajusta e categoriza todo item** num formato comparável. Preço por unidade real, normalizado, maçã com maçã.

Aí a regra de 3 morreu. O sistema já me diz quanto custa o mesmo insumo em cada fornecedor, no mesmo padrão, sem eu calcular nada.

## O custo virou algo que a equipe vê na hora

O pulo final foi tirar isso do meu colo e botar na [central da equipe](/labs/operacao-nao-depender-de-mim/). A seção de preços de insumos **avisa todo dia quando um item subiu.** O administrativo vê na hora, não no fechamento do mês, quando o estrago já passou.

Na prática, funciona assim: o alerta aparece na intranet com o insumo, o fornecedor e o tamanho do aumento. O setor de compras **entra em contato no mesmo dia**, com a nota na mão, e negocia o abatimento do que veio acima do combinado. E como o assunto já está na mesa, aproveita a mesma conversa pra travar o preço do próximo pedido. O aumento que antes passava batido virou negociação no dia em que aconteceu.

> Custo que você descobre no fim do mês é custo que você só constata. Custo que você vê no dia é custo que você negocia.

***

Tirar o custo real de dentro da nota, deixar tudo comparável e avisar a equipe no dia em que muda é exatamente o tipo de projeto que eu ajudo empresas a montar.

**Stack:** um bot que busca as notas fiscais direto na Receita Federal, extrai cada item já com imposto e frete, normaliza por unidade real pra deixar fornecedores comparáveis, e alimenta uma seção de preços de insumos na intranet que dispara um alerta diário quando algum item sobe.
