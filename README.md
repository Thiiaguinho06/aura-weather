# AURA WEATHER ☁️

Dashboard de previsão do tempo desenvolvido com **HTML, CSS e JavaScript puro**, com foco em experiência do usuário, responsividade e integração com APIs REST.

## Funcionalidades

- 🔍 Busca de cidades do mundo com a API de geocodificação
- 🌡️ Temperatura, sensação térmica, umidade, vento e índice UV
- 📈 Gráfico SVG de temperatura para as próximas 24 horas
- 🌦️ Previsão para os próximos 5 dias
- ⭐ Favoritos com `localStorage`
- 📍 Localização opcional, mediante permissão no navegador
- 🌙 Temas claro e escuro e alternância entre °C e °F
- 📱 Layout responsivo para celular, tablet e desktop
- ♿ Rótulos acessíveis, mensagens de carregamento e tratamento de erros

## Tecnologias e conceitos

**HTML5 · CSS3 · JavaScript (ES6+) · Fetch API · Async/Await · DOM · SVG · localStorage · API REST**

## Como executar

1. Baixe ou clone este repositório.
2. Abra `index.html` no navegador. Para testar de maneira mais fiel, use um servidor local (como Live Server do VS Code).
3. É necessário ter acesso à internet para consultar as previsões.

O projeto não precisa de instalação de dependências e não exige uma chave de API.

## Publicação gratuita com GitHub Pages

1. Crie um repositório público chamado `aura-weather`.
2. Envie os arquivos `index.html`, `styles.css`, `script.js`, `favicon.svg` e `README.md` para a raiz do repositório.
3. Em **Settings → Pages**, escolha **Deploy from a branch** → `main` → `/(root)` → **Save**.
4. Abra o link indicado no GitHub Pages, geralmente `https://SEU-USUARIO.github.io/aura-weather/`.

## Fontes dos dados e créditos

Dados climáticos e geocodificação por [Open-Meteo](https://open-meteo.com/) — API gratuita para fins não comerciais, sem chave. O uso está sujeito aos [termos do serviço](https://open-meteo.com/en/terms); é preciso atribuir os dados à fonte.

Ícones do clima vetoriais implementados no projeto. Fontes **DM Sans** e **Space Grotesk** carregadas pelo Google Fonts, com fontes locais de fallback.

> **Atenção:** é um projeto demonstrativo de portfólio, não um serviço oficial de alerta meteorológico ou de segurança.

## O que demonstrar em uma entrevista

- Como a busca transforma o nome de uma cidade em coordenadas geográficas.
- Como `fetch` e `async/await` consultam a API e tratam falhas de conexão.
- Como JavaScript atualiza o DOM e gera o gráfico SVG.
- Como o `localStorage` guarda favoritos e preferências.
- Como o CSS Grid e as media queries adaptam a interface para telas menores.

## Próximos passos para evoluir

- Implementar testes automatizados e caching das consultas.
- Melhorar a busca com sugestões durante a digitação.
- Criar comparação lado a lado entre duas cidades.
- Adicionar opção de idioma português/inglês.
