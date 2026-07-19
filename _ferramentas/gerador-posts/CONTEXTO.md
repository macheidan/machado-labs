# Contexto do gerador de posts — machado-labs

> Fonte única do **contexto que toda geração de post consulta**. Ajustar aqui, não
> espalhar regras em outros lugares. Idioma do doc: pt-BR.

Cada post nasce de um projeto real (prova viva) e transforma o trabalho feito em
conteúdo de autoridade. "Capturado > produzido": cada coisa real vira 1 artefato.

---

## 1. Enquadramento estratégico
- O site `fabiomachado.com.br` é **hub de autoridade** que alimenta o high-ticket.
  O post é motor de **profundidade** (pouco e fundo), não de volume.
- **Herói = resultado da operação/gestão**, não a jornada de dev do Fábio.
- **Vender por dor/resultado, nunca por "IA".** Pizzaria como laboratório, não rótulo.
- **Altitude do narrador:** o Fábio escreve como **operador AI-first com visão grande** (construindo
  sistema/método, reorganizando a operação inteira em torno de IA, um passo à frente do mercado), e
  **não** como pequeno empreendedor sofrendo. A dor de "pequeno/PME" é do **leitor** (tópico 2); o
  Fábio é quem já resolveu e leva pra fora. A pizzaria prova o método na marra, não é a identidade.
- Ângulo recorrente: série *"como fazemos no nosso negócio / na nossa operação"*.

## 2. Público
- **Empresários / donos de empresa em geral** (amplo — não só food-service; food é
  a origem da prova, não o teto).
- Todo post entrega **ganho real: tempo, dinheiro ou decisão**.
- Fala com quem administra o negócio, não com dev.

## 3. Matéria-prima do projeto (a fonte factual)
- `README.md` + `CLAUDE.md` do projeto + `context.md` no vault.
- `git log` filtrado: marcos/feat; ignora chore, refactor, deps, bumps.
- O **número/resultado real** do case (tempo economizado, % de margem, nº de lojas
  ou sabores, etc.), abstraído quando sensível.

## 4. Voz e tom
- **Primeira pessoa do plural ("fazíamos", "montamos", "resolvemos")**: o trabalho é
  narrado como de uma **equipe**, não de um cara sozinho no monólogo. Direta ou
  indiretamente, o texto deixa claro que há uma **equipe administrativa** por trás da
  operação. Segue direto ao ponto, sem subtítulo didático, sem lista de ganhos, sem
  pitch de fechamento explícito.
- **Plural = equipe, nunca sócio.** "Nós" é o time/operação, não um sócio (ver tópico 8:
  dono único). A autoridade/assinatura continua sendo o Fábio; o que muda é que ele fala
  como quem **lidera um time**, não como quem faz tudo na mão. Vale igual no EN:
  "we / our team", não "I alone".
- **Sensação-alvo: "estou um passo à frente de quem está lendo".** O texto transmite
  conhecimento, autoridade e inteligência em **"AI first"** pela substância, nunca
  por auto-elogio.
- **Intuito:** que o leitor sinta que quer **contratar o Fábio ou pedir ajuda** pra
  fazer o mesmo projeto. Isso vem do enquadramento (problema difícil resolvido por
  quem já passou por ele), não de uma chamada de venda.
- **Sempre pt-BR e EN** (as duas versões, toda vez — ver tópico 10).
- Nunca travessão (em-dash).

## 5. Estrutura do texto
- **Arco narrativo padrão:** de onde e por que veio a ideia → quais problemas eu
  encontrei → como resolvi → onde isso me deixou (um passo à frente).
- Corpo em linguagem leiga, sem jargão, com **ritmo visual**: negrito, blockquote,
  subheads, quebras.
- **Não listar estrutura de pastas / diretórios.** Não citar jargão de arquivo
  (`.md`, markdown, YAML, frontmatter) no corpo — isso é técnico demais pro
  empresário.
- **Bloco "stack" técnico no fim, no máximo 1 parágrafo** (único lugar onde ferramenta
  concreta é nomeada; ainda assim sem detalhe de formato de arquivo).
- **Léxico de infraestrutura:** nunca "PC de casa", "computador de casa" nem "máquina de
  casa". A infra é sempre o **Servidor** (EN: "our server"). Reforça operação séria, não
  gambiarra doméstica.

## 6. Frontmatter / SEO
- Campos: `title`, `heroTitle`, `description`, `pubDate`, `updatedDate`, `tags`,
  `keywords`.
- `heroTitle` segue o modelo da home e do hero do post: `<em>`, `.accent`, `<br/>`.
- **`description` (subtítulo do hero) nunca repete a primeira frase do corpo.** Complementa por
  outro ângulo (o problema, o número, o ganho), não ecoa a abertura.

## 7. Linkagem interna
- **Todo post linka pelo menos outro post** do site.
- Âncora amigável, URL nunca exposta, sem "aqui/clique".

## 8. Guardrails de privacidade e narrativa
- **Nunca expor:** faturamento, diagnóstico de saúde, segredo de negócio, e **nenhum
  dado sensível pessoal** (nomes de terceiros, contatos, família, patrimônio,
  credenciais).
- Números de operação sempre **abstraídos/relativos**.
- **Sem sócio** (dono único).

## 9. Escopo elegível (que projeto pode virar post)
- **Provas vivas de gestão/operação de PME em geral** (não só food): DRE/controladoria,
  CMV, dashboard, intranet, WhatsApp bot (só a engenharia, nunca o que ele lê),
  correção de preços, gerador de conteúdo, molina, Revelador, Cortex Digital como método.
- **Fora:** o puramente pessoal/sensível — danilingo/game (filho), investimentos
  pessoais, machadodesk, monitoramento privado de pessoas.

## 10. Idioma (pt-BR + EN sempre)
- Gerar as **duas** versões em todo post: `src/content/labs/<slug>.md` (pt-BR) e
  `src/content/labs-en/<slug>.md` (EN), mesmo `id`/slug.
- Traduzir `title` e `description` no frontmatter. Manter voz/tom do original.
- Nomes próprios sem tradução (Lov Pizza, Dáme Pizza).

## 11. SEO e indexação
- Otimizar cada post para busca: `keywords`/`description` com **termos de dor real**,
  headings hierárquicos, título e slug com intenção de busca, link interno.
- Após publicar, confirmar entrada no `sitemap` e disparo do **IndexNow** (já existe
  no workflow de deploy).

---

## Fluxo (resumo)
1. **Nascimento:** lê matéria-prima (tópico 3) → escreve pt-BR + EN nas regras acima
   → gera OG → registra `lastCommit` processado.
2. **Update:** `git log <lastCommit>..HEAD` → filtra relevante → monta candidato de
   atualização (bloco "Atualizações" datado + bump de `updatedDate`).
3. **Curadoria humana:** o robô **captura candidatos**; publicar poucos e fundos é
   escolha do Fábio (coerente com "pouco e fundo > muito e raso").

---

## Checklist de publicação (todo post)

Público-alvo:
- [ ] Escreve pra **dono, diretor ou gestor de PME** (dono-operador que administra o
  negócio), amplo e não só food-service. Nunca pra dev.

Estrutura:
- [ ] `heroTitle` com `<em>`, `.accent`, `<br/>` (mesmo modelo da home e do hero).
- [ ] `description` não repete a 1ª frase do corpo.
- [ ] Arco: origem da ideia → problemas → como resolvi → um passo à frente.
- [ ] Corpo em linguagem leiga, com ritmo visual (negrito, blockquote, subhead, quebras).
- [ ] Bloco "stack" só no fim, no máximo 1 parágrafo.

Voz:
- [ ] Primeira pessoa do **plural** ("fazíamos"), passando ideia de **equipe** (nunca sócio).
- [ ] Sem subtítulo didático, sem lista de ganhos, sem pitch de fechamento.
- [ ] Infra chamada de **Servidor**, nunca "PC de casa".
- [ ] Ganho real (tempo, dinheiro ou decisão) pra dono/diretor.

Links e léxico:
- [ ] Pelo menos 1 link interno pra outro post, com âncora amigável (sem URL crua, sem "aqui/clique").

Privacidade:
- [ ] Sem faturamento, saúde, segredo de negócio nem dado pessoal de terceiros. Números abstraídos.

Global:
- [ ] Zero travessão (em-dash).
- [ ] Versão pt-BR **e** EN no mesmo commit, mesmo slug.
- [ ] Commit + push direto após a mudança.
