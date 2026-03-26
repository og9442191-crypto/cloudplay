# CloudPlay 🎮

Rode jogos de PC no seu Android usando processamento híbrido — seu celular armazena o jogo, a nuvem processa tudo e transmite o vídeo para sua tela.

## Como funciona

```
Celular Android                     Servidor na Nuvem
───────────────                     ─────────────────
1. Você importa o .exe         →    2. Nuvem recebe o arquivo
3. Toca em Jogar               →    4. Wine roda o .exe
6. Você vê o vídeo na tela     ←    5. FFmpeg transmite o vídeo
7. Você usa os controles touch →    8. Nuvem recebe os inputs
```

## Requisitos

- Celular Android 8.0 ou superior
- Internet 15 Mbps ou mais
- Servidor Linux (Oracle Cloud gratuito funciona)

## Estrutura do projeto

```
cloudplay/
├── android/          → App Android
├── server/           → Servidor na nuvem
└── docs/             → Guias de instalação
```

## Instalação rápida

Veja o guia completo em [docs/SETUP.md](docs/SETUP.md)
