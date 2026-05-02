---
title: 'Criei um agente de IA que cuida do meu WhatsApp'
description: 'Tava perdendo coisa importante nos grupos toda semana. Coloquei um agente pra ler meu WhatsApp por mim, mandar o que precisa de resposta urgente no fim do dia, e um resumo de cada contato e cada grupo no domingo. Roda no PC de casa, custo zero, plugado no meu próprio número.'
pubDate: 'May 01 2026'
---

Tava gastando tempo demais no WhatsApp. Lendo grupo de fornecedor, repassando coisa pro gerente, respondendo cotação, lendo o grupo da família que eu já tinha deixado de ler dois dias antes. Toda noite a sensação de que tinha passado coisa importante e eu não sabia o quê. Algumas vezes era só sensação. Algumas vezes não era, descobria na segunda quando o fornecedor cobrava resposta que nunca chegou.

Eu já tava montando o [Meu Cortex Digital](https://fabiomachado.com.br/labs/segundo-cerebro-ia/) faz um tempo. Memória pronta, persona pronta, faltava a parte que eu chamei lá de "agência", o agente parar de só responder e começar a agir no meu mundo. Numa dessas noites caiu a ficha de que o WhatsApp era o lugar mais óbvio pra começar. É lá que minha atenção vaza primeiro.

Em vez de bot que fala com cliente, bot que me lê. Lê os grupos por mim, lê as conversas por mim, e me manda no fim do dia o que precisa de resposta urgente, e no fim da semana um resumo de cada contato relevante e de cada grupo importante. Tudo o que ele observa também volta pro Cortex, então toda outra ferramenta de IA que eu uso depois já sabe quem andou falando comigo, do que andou falando, e o que ficou pendente.

Montei numa noite. Tá rodando no PC que já fica ligado em casa. Plugado no meu próprio número. Ele fica olhando junto comigo, vê tudo que eu vejo, e não fala com ninguém.

Primeira semana já valeu. Domingo de noite chegou o resumo no meu celular e tinham dois assuntos que eu não tinha visto. Um fornecedor cobrando cotação que eu jurava ter respondido. Um lembrete da escola do meu filho que eu ia perder o prazo. Nenhum dos dois ia me quebrar. Os dois iam me dar dor de cabeça.

Ficou óbvio que o problema não era WhatsApp. Era atenção. WhatsApp só era o lugar onde ela vazava primeiro.

A parte que mais me interessou não foi nem o resumo dos grupos, foi o resumo dos contatos individuais. O bot olha as últimas semanas com cada pessoa relevante, escreve em duas linhas o que tá rolando no relacionamento, marca quando alguém sumiu. Eu lembrava de pessoas no automático, no susto, quando algo me cobrava. Agora tem alguém me empurrando isso pra cima toda semana antes de virar problema.

Outra coisa que ele faz é ler as **minhas próprias mensagens**. Domingo de noite ele compara o que eu falei na semana com o que ele já sabia sobre mim e atualiza meu perfil dentro do Cortex. Sem inventar, só o que dá pra observar do que eu mesmo escrevi. Aqui tem uma pegadinha que demorei pra entender. Esse é justamente o ponto onde um modelo solto inventa o universo. A primeira versão me devolveu romance. Traçou perfil psicológico de gente com quem troquei três mensagens. Deduziu intenção que ninguém disse. Pareceu profundo. Era invenção.

Reescrevi o prompt obrigando formato fixo e proibindo invenção. Se não tem o que dizer, não diz. A regra que ficou foi essa: prefiro nada do que errado. Esse bot escreve no Cortex. Se ele inventar, eu vou tomar decisão na próxima semana baseado em invenção dele. O custo de uma alucinação aqui não compensa a graça de um relatório mais "rico".

Pra não depender de um único modelo de IA, montei um plano B, C e D. Se o primeiro cair ou estourar quota, ele tenta o segundo. Se o segundo cair, vai pro terceiro. Não é luxo. Modelo é depreciado de uma semana pra outra, quota acaba, API cai num domingo de noite. O bot precisa rodar.

Custo até hoje: zero. Tudo cabe nos planos gratuitos pra escala de uma pessoa.

Tem uma coisa que ainda tô amassando, que é a **fase 2**. A fase 1 é leitura. A fase 2 é deixar ele responder coisa pequena por mim, dentro de regra clara. "Tô a caminho", "recebi sim", "que horas a gente combinou", confirmação de pagamento que o financeiro já tinha me passado. Nada de cliente final, nada de decisão. Só o agradecimento e a confirmação que comem o meu dia sem agregar nada.

Pra isso funcionar sem virar pesadelo, preciso de três coisas no lugar. Saber quem é cada contato (a fase 1 já tá construindo isso no Cortex). Regra clara do que ele pode responder sozinho, do que ele pode rascunhar pra eu aprovar com um clique, e do que ele nunca toca. E aprender o jeito que eu escrevo, que é pra coisa que ele responder por mim parecer comigo. Os três caminhos saem da mesma fonte: o agente lendo o que eu mesmo escrevo.

Por enquanto ele só lê. E só de ler já mudou a forma como eu chego em segunda de manhã.

## Stack

- Node rodando 24/7 no PC de casa.
- `@whiskeysockets/baileys` pra conexão direta com o WhatsApp via QR code, sem API oficial paga, sem número separado. O bot fica logado em paralelo ao celular.
- `@google/genai` (Gemini) pra análise, com fallback automático pra Groq, Cerebras e OpenRouter quando o Gemini cai ou estoura quota. Dentro do Gemini, fallback entre `gemini-2.5-flash`, `gemini-2.0-flash` e `gemini-2.0-flash-lite`.
- `node-cron` pra agendar: relatório diário às 20h, semanal domingo 20h, mensal dia 1.
- Estado em JSON puro num arquivo único (`.state.json`). Sem banco, sem ORM, sem container, sem fila.
- Janela de retenção: 30 dias pras DMs e pras minhas próprias mensagens, 7 dias pros grupos. Acima disso, descarta no momento de salvar. Estado nunca cresce sem limite.
- Áudio, figurinha, documento e broadcast: ignorados. Só texto (`conversation`, `extendedTextMessage`, legenda de imagem).
- Comandos via mensagem que eu mando pra mim mesmo começando com `/` (`/resumo`, `/resumo grupos`, `/resumo mensal`). O painel é o próprio WhatsApp.
- Os relatórios são salvos como markdown no Cortex (sincronizado pelo Drive) e mandados pra mim no WhatsApp.
- Prompts conservadores em todos os pontos onde o output vira insumo de decisão. Formato fixo, proibição explícita de inventar, instrução pra retornar "nada novo" quando não houver o que dizer.
- Custo até hoje: zero. Tier gratuito do Gemini cobre a escala de um usuário só.
