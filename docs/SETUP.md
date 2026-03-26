# Guia de Instalação — CloudPlay

## Parte 1: Configurar o servidor na nuvem (Oracle Cloud grátis)

### 1.1 Criar conta Oracle Cloud
1. Acesse https://oracle.com/cloud/free
2. Crie uma conta gratuita (pede cartão mas não cobra)
3. Crie uma instância Ubuntu 22.04 (ARM, 4 CPUs, 24GB RAM — grátis)

### 1.2 Instalar dependências no servidor
Conecte no servidor via SSH e rode:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Wine (para rodar .exe)
sudo dpkg --add-architecture i386
sudo apt install -y wine wine32 wine64

# Instalar Xvfb (tela virtual)
sudo apt install -y xvfb

# Instalar FFmpeg (para transmitir o vídeo)
sudo apt install -y ffmpeg

# Instalar xdotool (para simular controles)
sudo apt install -y xdotool
```

### 1.3 Baixar e iniciar o servidor CloudPlay

```bash
# Clonar o projeto do GitHub
git clone https://github.com/SEU-USUARIO/cloudplay.git
cd cloudplay/server

# Instalar dependências Node
npm install

# Iniciar o servidor
node index.js
```

O servidor vai rodar na porta 3000.
Anote o IP público da sua instância Oracle — você vai precisar no app.

### 1.4 Abrir a porta no firewall Oracle
No painel Oracle Cloud:
1. Vá em Networking → Virtual Cloud Networks
2. Clique na sua VCN → Security Lists
3. Adicione uma regra de entrada: porta 3000, protocolo TCP

---

## Parte 2: Instalar o app Android

### Opção A: Compilar o APK (recomendado)
1. Instale o Android Studio: https://developer.android.com/studio
2. Abra a pasta `android/` do projeto
3. Clique em Build → Build APK
4. Instale o APK no seu celular

### Opção B: Usar via navegador Android
Abra o Chrome no Android e acesse:
```
http://SEU-IP:3000
```

---

## Parte 3: Usar o app

1. Abra o CloudPlay no celular
2. Digite o IP do servidor: `SEU-IP:3000`
3. Toque em **Conectar**
4. Vá em **Importar** → selecione o .exe do jogo
5. Aguarde o upload
6. Toque em **Play** para jogar

---

## Dúvidas comuns

**O upload está lento?**
Depende da sua internet. Um jogo de 10GB pode demorar horas. Use jogos menores primeiro para testar.

**O Wine suporta todos os jogos?**
Não todos. Jogos mais antigos (GTA SA, GTA IV, etc.) funcionam melhor que jogos novíssimos (GTA VI, etc.).

**Posso usar sem Oracle Cloud?**
Sim, qualquer PC com Linux na mesma rede Wi-Fi funciona como servidor.
