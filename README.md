# QR Studio

Webapp minimalista de geração e personalização avançada de QR Codes, 100% estático e pronto para **GitHub Pages** (sem backend e sem dependências externas de runtime — todos os dados permanecem localmente no navegador).

## Recursos

### 16 Tipos Específicos de QR Code
- **Essenciais**: Link/URL, Rede Wi-Fi (WPA/WPA2/WPA3, WEP, aberta e rede oculta), **PIX estático (BR Code EMVCo com CRC-16)**, Contato completo (vCard 3.0), WhatsApp e Texto Livre.
- **Comunicação**: E-mail (`mailto:`), Telefone (`tel:`), SMS (`SMSTO:`) e Redes Sociais (Instagram, LinkedIn, GitHub, X, TikTok, YouTube, Telegram, Threads, Behance e Spotify).
- **Contatos, Eventos & Locais**: Contato compacto (MeCard), Evento de calendário (iCalendar `VEVENT`), Localização GPS (Google Maps ou `geo:` com geolocalização do navegador) e Reunião Online (Zoom, Google Meet, Teams).
- **Pagamentos & Apps**: Criptomoeda (Bitcoin, Ethereum, Solana, Litecoin) e Loja de Apps (Google Play, App Store ou link universal).

### Dois Modos de Uso
- **Modo Simples**: interface enxuta com seleção rápida de tipo, estilos prontos, cores principais e upload de logo em 1 clique.
- **Modo Completo**: controle total dividido em 5 abas:
  - **Padrão & Cantos**: 8 formatos de módulos (`square`, `rounded`, `dots`, `extra-rounded`, `fluid`, `classy`, `classy-rounded`, `diamond`), controle de densidade, 5 estilos de moldura externa dos cantos e 5 estilos de ponto interno.
  - **Cores**: preenchimento sólido ou gradiente linear/radial (2 ou 3 cores com ângulo), fundo sólido/gradiente/transparente e cores independentes para os cantos.
  - **Logo**: upload por clique, arrastar e soltar ou `Ctrl+V`, 14 ícones minimalistas prontos, tamanho, margem, opacidade, formato de base e limpeza automática dos módulos atrás do logo.
  - **Moldura**: 6 estilos de moldura com texto CTA personalizável, cores e arredondamento.
  - **Técnico**: correção de erro (`L`, `M`, `Q`, `H`), *quiet zone*, versão mínima, resolução de exportação até `4096px`, inspetor de payload bruto e exportar/importar JSON.

### Exportação, Persistência & Compartilhamento de Presets
- Verificação automática de contraste e legibilidade em tempo real.
- Exportação em **PNG**, **SVG vetorial**, **WebP**, **JPEG**, cópia direta para área de transferência e impressão limpa.
- **Persistência automática em `localStorage`**: tipo ativo, campos preenchidos, customizações, presets salvos, histórico, modo e tema são preservados localmente no navegador.
- **Compartilhamento de presets em Base64URL (`QR1.`)**: codificação compacta por delta com suporte a links diretos (`#preset=QR1....`), compartilhamento opcional do conteúdo do QR e importação com pré-visualização instantânea.
- Tema claro/escuro e interface otimizada para desktop e mobile (com barra flutuante de acesso rápido no celular).

## Como publicar no GitHub Pages

1. Faça push deste repositório para o GitHub (branch `main`).
2. Acesse **Settings → Pages** no repositório.
3. Em **Build and deployment → Source**, selecione **GitHub Actions** (o workflow `.github/workflows/pages.yml` já está incluído) — ou selecione **Deploy from a branch** (`main` / `root`).
4. Aguarde alguns segundos e acesse `https://<seu-usuario>.github.io/<nome-do-repo>/`.
