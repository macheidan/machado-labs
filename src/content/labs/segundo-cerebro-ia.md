---
title: 'Como estou construindo o Meu Cortex Digital'
heroTitle: 'Como estou<br/>construindo o <em>Meu</em><br/><span class="accent">Cortex Digital</span>'
description: 'Todo empresário reexplica o próprio negócio pra cada IA, do zero. Montei um sistema que dá à inteligência artificial memória permanente do negócio e de como eu decido, e parei de começar do zero toda vez.'
pubDate: 'Apr 26 2026'
updatedDate: 'Jul 5 2026'
tags: ['cortex', 'agentes', 'ia-first']
keywords: ['segundo cérebro', 'memória de IA', 'agentes de IA', 'contexto para IA', 'IA com memória da empresa', 'dar contexto pro ChatGPT', 'IA first', 'IA para empresários']
---

Toco várias frentes ao mesmo tempo, e por muito tempo repeti o mesmo desperdício: toda vez que eu abria uma IA pra ajudar, ela **começava do zero**. Não sabia dos meus negócios, não sabia como eu penso, não lembrava de nada da conversa anterior. Eu gastava metade do tempo reexplicando o contexto antes de conseguir qualquer coisa útil.

Demorei a entender que o problema não era a IA. Era que **o meu contexto não morava em lugar nenhum**. Estava espalhado na minha cabeça, em conversas soltas, em anotações perdidas. Nenhuma ferramenta tinha como saber o que nunca foi escrito.

Daí veio a ideia: construir um cérebro externo, fora de qualquer ferramenta, que fosse a **fonte única de verdade sobre mim e sobre as empresas**. Qualquer IA que eu abrir lê isso primeiro e já chega sabendo. Chamei de **Meu Cortex Digital**.

## Por que não amarrei numa ferramenta

O erro óbvio seria construir isso dentro do produto da moda. E produto de IA muda toda semana.

> Ferramenta morre. O contexto sobrevive.

A IA virou commodity: troca de nome, de dono, de preço. O que não pode trocar é o contexto do meu negócio. Por isso ele é **meu**, num formato simples que qualquer modelo consegue ler, hoje e daqui a cinco anos. É isso que eu chamo de pensar **AI first**: não é escolher a melhor IA, é organizar o negócio pra que qualquer IA consiga trabalhar dentro dele.

## Os problemas que apareceram no caminho

Montar isso não foi jogar informação num canto. Cada camada trouxe um problema real:

- **A IA é bajuladora.** Ela inventa pra parecer útil, e num negócio decidir com dado inventado é pior do que decidir sem dado nenhum.
- **Eu não decido como acho que decido.** Quando fui descrever meu processo, o que eu *achava* não batia com o que eu *fazia*.
- **A automação que alimenta o sistema erra.** Se ela reescreve por cima ou anota o que não observou, contamina a base inteira.

Cada um desses virou uma regra do sistema.

## Como resolvi

Montei em quatro camadas, e cada uma só entra quando a de baixo está firme:

1. **Memória.** Juntei todo o contexto espalhado num lugar só, organizado por negócio. Nunca apaguei nada original sem aprovar antes.
2. **Persona.** Capturei como eu *realmente* decido, não como eu gostaria de decidir. É descritivo, não aspiracional. Com isso a IA me **alerta quando percebe que tô no modo errado** pra uma decisão importante. Uma IA que só concorda não vale nada; essa me corrige.
3. **Agência.** Aqui os agentes param de aconselhar e passam a agir. O primeiro foi o do WhatsApp, que roda sozinho e devolve pro sistema só o que for **genuinamente novo**. Contei o passo a passo em [Criei um agente de IA que cuida do meu WhatsApp](/labs/bot-whatsapp-inteligencia-pessoal/).
4. **Gatilhos.** O próximo passo: ações que disparam sozinhas, sem eu pedir.

O princípio que segura tudo é a desconfiança:

> Melhor não anotar nada do que anotar errado.

## Onde isso me deixou

Hoje qualquer IA que eu abro já trabalha sabendo do meu negócio e de como eu penso. Parei de começar do zero, e num dia de sobrecarga o sistema **conhece meu contexto melhor do que eu mesmo naquele momento**.

Levei meses descobrindo o que quebra pra chegar aqui. Hoje é a base de tudo que eu faço com IA, e é exatamente esse tipo de projeto que eu ajudo outras empresas a montar.

**Stack:** arquivos de texto simples versionados no Git e sincronizados no Google Drive, abertos no Obsidian; e uma cascata de modelos (Claude, GPT, Gemini) que lê e realimenta a base, com os números apurados em código e a IA só redigindo.
