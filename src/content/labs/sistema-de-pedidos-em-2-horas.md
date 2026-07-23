---
title: 'O sistema caiu em duas sextas seguidas. Criamos o nosso em 2 horas'
heroTitle: 'O sistema caiu em <em>duas sextas seguidas</em>.<br/>Criamos o nosso em <span class="accent">2 horas</span>'
description: 'Duas sextas seguidas com o sistema de pedidos fora do ar, na noite mais forte da pizzaria. Mandamos pra IA uma foto do cardápio e a tabela de taxas de entrega. Duas horas depois, tínhamos o nosso próprio sistema, que até calcula a taxa pelo raio.'
pubDate: 'Jul 23 2026'
tags: ['operacao', 'automacao', 'ia']
keywords: ['sistema de pedidos fora do ar', 'sistema de pedidos próprio', 'plano B para delivery', 'taxa de entrega por raio', 'PDV para pizzaria', 'criar sistema com IA', 'IA para operação']
---

<div class="case-summary">

**Desafio:** duas sextas-feiras seguidas com o sistema de pedidos fora do ar, na noite mais forte da pizzaria. O sistema é bom, mas quando cai não existe botão nosso pra apertar: telefone tocando, balcão cheio e a operação inteira esperando ele voltar.

**Solução:** criamos o nosso próprio sistema de pedidos. Mandamos pra IA uma foto do cardápio e a tabela de taxas de entrega, e ela montou o resto: cadastro de cliente pelo telefone, regras reais do cardápio, taxa de entrega calculada pelo raio e cupom saindo na impressora térmica.

**Resultados:** 2 horas da ideia ao sistema rodando na loja, R$ 0 de mensalidade, e a noite de sexta que não para mais quando o sistema principal cai.

</div>

## Duas sextas seguidas, a mesma cena

Sexta é o dia que paga a semana de uma pizzaria. E foram duas sextas seguidas com o sistema de pedidos fora do ar: telefone tocando, balcão cheio, e a equipe atualizando a página esperando ele voltar. O sistema é bom, usamos e seguimos usando. Mas quando ele cai, viramos reféns. Não existe botão nosso pra apertar, não tem quem ligar que resolva na hora. Só espera.

E tem uma armadilha mais silenciosa que a venda perdida da noite. A operação inteira mora dentro de um sistema que não é nosso: o cadastro dos clientes, os preços, a impressão do cupom, tudo do lado de lá. Quando ele fecha a porta, ficamos do lado de fora sem alcançar nem os nossos próprios dados. Percebemos que não tínhamos um plano B. Tínhamos uma torcida.

## Uma foto do cardápio, duas horas depois

O caminho óbvio seria assinar um segundo sistema, de outra empresa, só de reserva. Mas isso é pagar mais uma mensalidade pra continuar dependendo da infraestrutura dos outros, e ainda treinar a equipe numa segunda tela que ela quase nunca usa. Plano B que custa todo mês e ninguém lembra como funciona não é plano B, é boleto.

Resolvemos criar o nosso. Mandamos pra IA uma foto do cardápio e a tabela de taxas de entrega, e descrevemos como a gente atende no telefone e no balcão. Duas horas depois, o sistema estava rodando no computador da própria loja. Sem mensalidade, sem contrato, sem depender da infraestrutura de ninguém: se a internet cair, ele continua tirando pedido.

E não saiu uma planilha disfarçada de sistema. Saiu um sistema com as regras reais da casa: quantos sabores cada tamanho aceita, meio a meio, bordas, bebidas, preço igual ao do site. A parte que mais nos surpreendeu foi a taxa de entrega: ele mede o raio da loja até a casa do cliente e já marca a faixa certa sozinho, sem ninguém decorar mapa de bairro.

## Na prática, a noite não para mais

Na prática, funciona assim: a atendente digita o telefone e, se o cliente já pediu antes, nome e endereço preenchem sozinhos. Monta a pizza, começa a digitar a rua e o sistema sugere o bairro, mede a distância e seleciona a taxa de entrega certa. Ao finalizar, mostra o cupom pra conferir e imprime direto na térmica. Custo do projeto: **2 horas** de um dia e **R$ 0 de mensalidade** pra sempre.

Na sexta seguinte, o sistema principal podia cair de novo que o pedido continuava saindo. É a mesma lógica de quando colocamos o [cardápio das seis lojas pra sair de uma fonte só](/labs/cardapio-de-seis-lojas-no-ifood/): a informação é nossa, e é ela que tem que morar na nossa mão.

> Depender de um sistema bom não é o problema. O problema é não ter porta de saída quando ele fecha a dele.

***

Montar em horas um plano B que segura a operação quando o sistema principal cai é exatamente o tipo de projeto que eu ajudo empresas a montar.

**Stack:** um sistema local que roda no computador da própria loja, com cadastro de cliente pelo telefone (nome e endereço preenchem sozinhos), cardápio com as regras reais da casa (sabores por tamanho, meio a meio, bordas e bebidas), sugestão de rua e bairro enquanto digita, taxa de entrega calculada pelo raio entre a loja e a casa do cliente, conferência do cupom antes de imprimir, impressão em até duas impressoras térmicas ao mesmo tempo, reimpressão de qualquer pedido, duas marcas rodando lado a lado com numeração própria, senha de acesso protegendo os dados dos clientes, histórico completo de pedidos e backup automático.
