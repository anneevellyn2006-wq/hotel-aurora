# Hotel Aurora

Protótipo de site de reservas de um hotel boutique, desenvolvido com HTML, CSS e JavaScript usando Programação Orientada a Objetos (POO), com foco em acessibilidade e proteção de dados (LGPD).

> Projeto acadêmico desenvolvido por [Anne Evellyn dos Sntos Silva] para a disciplina [Programação].

🔗 **Site online:** https://anneevellyn2006-wq.github.io/hotel-aurora/
📁 **Repositório:** https://github.com/anneevellyn2006-wq/hotel-aurora

---

## Sobre o projeto

O Hotel Aurora apresenta a hospedagem, os quartos e os serviços do hotel e permite que o visitante faça uma reserva online. A identidade visual é inspirada em hotelaria boutique de luxo, com paleta em tons de dourado e areia e as fontes **Cormorant Garamond** e **DM Sans**.

## Tecnologias

- **HTML5** com marcação semântica
- **CSS3** (variáveis CSS, layout responsivo)
- **JavaScript (ES6+)** com classes (POO)
- **VLibras** (tradução para Libras)
- **GitHub Pages** (hospedagem)

## Estrutura do projeto

```
hotel-aurora/
├── index.html    # estrutura e conteúdo da página
├── style.css     # identidade visual e responsividade
├── script.js     # lógica do site (classes em POO)
└── README.md     # documentação
```

## Programação Orientada a Objetos

A lógica do site está organizada em **classes**, cada uma com uma responsabilidade. Um exemplo é a classe `Accessibility`, que controla o painel de acessibilidade:

- **Atributos:** preferências da pessoa (tamanho do texto, contraste, links, fonte, animações) e o objeto `store`, que guarda essas escolhas.
- **Métodos:** `init()` (monta o painel), `toggle()` (abre e fecha), `change()` (altera uma preferência) e `apply()` (aplica as preferências na página).
- **Encapsulamento:** as preferências ficam dentro do objeto e só mudam pelo método `change()`.


## Acessibilidade (W3C)

O site busca seguir as diretrizes de acessibilidade da **WCAG**, para que qualquer pessoa consiga **ler, usar e entender** o conteúdo:

- **Painel de acessibilidade** com:
  - aumento e diminuição do texto
  - alto contraste
  - fonte mais legível
  - links sublinhados
  - redução de animações
  - botão para restaurar o padrão
- **Libras:** integração com o **VLibras**, que traduz o conteúdo do site para a Língua Brasileira de Sinais.
- **Navegação por teclado:** a tecla `Esc` fecha o painel e o foco retorna ao botão de acesso.
- **Atributos ARIA:** `aria-label`, `aria-expanded`, `aria-pressed` e `aria-live` nos controles do painel.
- **Idioma da página declarado** (`lang="pt-BR"`).
- **Layout responsivo**, para uso em computador e celular.

## Idiomas

O site está disponível em **português** e **inglês**, e o visitante escolhe o idioma da interface.

## LGPD (Lei nº 13.709/2018)

O site foi pensado segundo os princípios da Lei Geral de Proteção de Dados:

| Princípio | Como é aplicado |
|---|---|
| Finalidade | Os dados do formulário são usados apenas para a reserva |
| Necessidade | Solicita apenas as informações essenciais para reservar |
| Transparência | Informa de forma clara como os dados são tratados |
| Direitos do titular | Permite solicitar acesso, correção e exclusão dos dados |
| Segurança | Em produção, os dados trafegariam por servidor seguro (HTTPS) |

> Este é um protótipo acadêmico: nenhum dado real de hóspedes é coletado ou armazenado.

## Arquitetura da informação

O conteúdo foi organizado para que o visitante encontre rapidamente o que procura:

```
Início
├── Quartos
├── Serviços
├── Reservar
└── Contato
```

- Menu de navegação igual em todas as seções
- Botão **Reservar** sempre em destaque
- Poucos passos entre a chegada ao site e a reserva

## Como executar localmente

1. Baixe ou clone o repositório:
   ```bash
   git clone https://github.com/anneevellyn2006-wq/hotel-aurora.git
   ```
2. Abra a pasta no VS Code.
3. Execute o `index.html` com a extensão **Live Server** (recomendado, pois o VLibras precisa de um endereço `http://` para funcionar).

## Hospedagem

O site é publicado com o **GitHub Pages**, a partir da branch `main`, e fica acessível por um link, sem necessidade de instalação.

## Autoria

Desenvolvido por **[Seu nome]**.
