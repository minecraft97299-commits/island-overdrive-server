# Island Overdrive — servidor multiplayer

Servidor WebSocket para salas privadas de até 4 jogadores.

## Publicar/executar
Node.js 18+:
```bash
npm install
npm start
```
A porta é `3000` localmente ou a variável `PORT` fornecida pela hospedagem.
O endpoint `/health` confirma que o servidor está online.

## Conectar o jogo
No menu **Sala Privada**, preencha o endereço WebSocket:
- `ws://localhost:3000` para testes na mesma máquina;
- `wss://SEU-ENDERECO-PUBLICADO` depois de hospedar com HTTPS.

Depois toque em **Criar sala** ou digite o código para entrar. O endereço fica salvo no aparelho.
