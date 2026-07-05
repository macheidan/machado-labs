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
- Ângulo recorrente: série *"como eu faço no meu negócio / na minha pizzaria"*.

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
- **Monólogo objetivo**: Fábio pensando alto, direto ao ponto. Sem subtítulo
  didático, sem lista de ganhos, sem pitch de fechamento explícito.
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

## 6. Frontmatter / SEO
- Campos: `title`, `heroTitle`, `description`, `pubDate`, `updatedDate`, `tags`,
  `keywords`.
- `heroTitle` segue o modelo da home e do hero do post: `<em>`, `.accent`, `<br/>`.

## 7. Linkagem interna
- **Todo post linka pelo menos outro post** do site.
- Âncora amigável, URL nunca exposta, sem "aqui/clique".

## 8. Guardrails de privacidade e narrativa
- **Nunca expor:** faturamento, diagnóstico de saúde, segredo de negócio, e **nenhum
  dado sensível pessoal** (nomes de terceiros, contatos, família, patrimônio,
  credenciais).
- Números de operação sempre **abstraídos/relativos**.
- **Sem sócio** (dono único). "Cortex Digital" para o segundo cérebro.

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
- Nomes próprios sem tradução (Lov Pizza, Dáme Pizza, Cortex Digital).

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
