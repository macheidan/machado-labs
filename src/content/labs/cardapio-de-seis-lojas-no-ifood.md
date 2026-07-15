---
title: 'Como ajusto o cardápio de seis lojas no iFood de uma vez'
heroTitle: 'Como ajusto o <em>cardápio</em><br/>de seis lojas no <span class="accent">iFood</span>'
description: 'Ajustar um item parece um clique. Com seis lojas no iFood, vira dezenas de edições manuais, uma por loja, e uma diferença fica no ar por semanas. Botei o cardápio pra sair de uma fonte só, num passe.'
pubDate: 'Apr 12 2026'
tags: ['operacao', 'automacao', 'ia']
keywords: ['ajustar cardápio no iFood', 'sincronizar cardápio', 'cardápio multi-loja', 'gestão de cardápio no iFood', 'automação de tarefa repetitiva', 'gestão de várias lojas', 'IA para operação']
---

<div class="case-summary">

**Desafio:** são seis lojas no iFood, cada uma carregando o cardápio inteiro, mais de 2000 itens somados. Ajustar um item vira dezenas de edições manuais, uma por loja, e o que escapa fica cobrado errado por semanas sem ninguém perceber.

**Solução:** o cardápio passou a viver num lugar só, a minha fonte de verdade. Quando muda ali, uma automação abre cada loja no iFood e aplica o mesmo ajuste em todas, no mesmo passe, com preview do que vai mudar antes de gravar.

**Resultados:** mais de 2000 itens saindo de uma fonte só, nenhum item cobrado errado por descuido, e a meia tarde de trabalho braçal virou um passe conferido.

</div>

## Ajustar um item parece um clique

Parece a tarefa mais boba do mundo. Só que eu não tenho uma loja no iFood, tenho seis. E cada loja carrega o cardápio inteiro, item por item. Aí o clique vira outra coisa: **abrir as seis lojas, achar o mesmo item em cada uma, mudar, salvar, conferir.** Repetir pra cada item que mudou. O que parecia um minuto vira meia tarde, e é o tipo de trabalho que ninguém quer fazer, então fica pra depois.

E o problema nem é o tempo. É a diferença que fica no ar: trabalho manual e repetitivo **erra em silêncio.** Você ajusta dezenas de itens em seis lojas na mão e, em algum lugar, um valor sai diferente, um item fica com a versão velha, uma loja passa batida. Isso não grita. O cardápio fica desencontrado por semanas, até um cliente ou o fechamento do mês te avisar. Numa operação de várias lojas, vira regra, não exceção.

## Uma fonte de verdade, um passe

O caminho óbvio seria botar alguém pra fazer, ou criar uma rotina de conferência semanal loja por loja. Mas isso não resolve, só transfere: a pessoa vai errar em silêncio do mesmo jeito, e conferir 2000 itens na mão é mais trabalho braçal ainda, não menos. O erro não estava em quem digitava. **Estava em ter seis cardápios pra manter iguais.**

Resolvi virando o problema do avesso. Em vez de eu ir loja por loja no iFood, o cardápio passa a viver **num lugar só**, a minha fonte de verdade. Quando muda ali, uma automação abre cada loja e aplica o mesmo ajuste em todas, no mesmo passe.

Deixaram de existir seis cardápios pra manter iguais. Existe um, replicado.

## O braçal sai, o controle fica

Na prática, funciona assim: eu mudo o item na fonte, a automação me mostra **o preview do que vai mudar em cada loja**, eu confiro e ela grava. A meia tarde de clique virou um passe conferido.

Se somar, são mais de **2000 itens** saindo de um lugar só. Ganho tempo e ganho precisão: não existe mais item sendo cobrado errado porque escapou. Quando era feito na mão, sempre tinha algum.

> Tarefa repetitiva não te acorda de noite. Ela sangra devagar, e você só descobre no fechamento.

***

Tirar da frente do dono a tarefa chata e repetitiva que só gera erro, sem ele perder o controle do que muda, é o tipo de projeto que eu ajudo empresas a montar. Mesmo espírito de [colocar o fechamento do mês no automático](/labs/dre-no-automatico/): o trabalho braçal sai, o controle fica.

**Stack:** um cardápio único como fonte de verdade e uma automação de navegador que entra em cada loja no iFood e aplica o ajuste em lote, com um preview do que vai mudar em cada uma antes de gravar.
