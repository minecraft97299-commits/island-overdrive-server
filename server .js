const http = require("http");
const { WebSocketServer, WebSocket } = require("ws");
const crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 4;
const rooms = new Map();
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function code() {
  let value;
  do { value = Array.from({length:5},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join(""); }
  while (rooms.has(value));
  return value;
}
function send(ws,type,data={}) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type,...data}));
}
function info(room) {
  return {code:room.code,maxPlayers:MAX_PLAYERS,started:room.started,
    players:[...room.players.values()].map(p=>({id:p.id,name:p.name,host:p.host}))};
}
function broadcast(room,type,data={}) {
  const packet=JSON.stringify({type,...data});
  for(const p of room.players.values()) if(p.ws.readyState===WebSocket.OPEN)p.ws.send(packet);
}
function leave(p) {
  if(!p.roomCode)return;
  const room=rooms.get(p.roomCode); p.roomCode=null;
  if(!room)return;
  room.players.delete(p.id);
  if(!room.players.size){rooms.delete(room.code);return;}
  if(![...room.players.values()].some(x=>x.host))room.players.values().next().value.host=true;
  broadcast(room,"room_update",{room:info(room)});
}
const server=http.createServer((req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  if(req.url==="/health"){res.writeHead(200,{"Content-Type":"application/json"});return res.end(JSON.stringify({ok:true,service:"Island Overdrive",rooms:rooms.size}));}
  res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8"});res.end("Island Overdrive multiplayer server online.");
});
const wss=new WebSocketServer({server});
wss.on("connection",ws=>{
  const p={id:crypto.randomUUID(),ws,name:"Jogador",roomCode:null,host:false};
  send(ws,"connected",{playerId:p.id,maxPlayers:MAX_PLAYERS});
  ws.on("message",raw=>{
    let m;try{m=JSON.parse(raw.toString())}catch{return send(ws,"error",{message:"Mensagem inválida."})}
    if(m.type==="create_room"){
      leave(p);const r={code:code(),players:new Map(),started:false};
      p.name=String(m.name||"Anfitrião").slice(0,18);p.host=true;p.roomCode=r.code;r.players.set(p.id,p);rooms.set(r.code,r);
      return send(ws,"room_created",{room:info(r),playerId:p.id});
    }
    if(m.type==="join_room"){
      const r=rooms.get(String(m.code||"").toUpperCase());
      if(!r)return send(ws,"error",{message:"Sala não encontrada. Confira o código."});
      if(r.started)return send(ws,"error",{message:"A corrida já começou."});
      if(r.players.size>=MAX_PLAYERS)return send(ws,"error",{message:"A sala está cheia."});
      leave(p);p.name=String(m.name||"Jogador").slice(0,18);p.host=false;p.roomCode=r.code;r.players.set(p.id,p);
      send(ws,"room_joined",{room:info(r),playerId:p.id});broadcast(r,"room_update",{room:info(r)});return;
    }
    const r=p.roomCode&&rooms.get(p.roomCode);
    if(!r)return send(ws,"error",{message:"Entre em uma sala primeiro."});
    if(m.type==="player_state"){
      const s=m.state||{};
      const state={distance:Number(s.distance)||0,lane:Number(s.lane)||0,speed:Number(s.speed)||0,lap:Number(s.lap)||0};
      for(const other of r.players.values())if(other.id!==p.id)send(other.ws,"player_state",{playerId:p.id,name:p.name,state});
    } else if(m.type==="start_race"){
      if(!p.host)return send(ws,"error",{message:"Somente o anfitrião pode iniciar."});
      r.started=true;broadcast(r,"race_started",{room:info(r),startedAt:Date.now()});
    } else if(m.type==="leave_room"){leave(p);send(ws,"left_room");}
  });
  ws.on("close",()=>leave(p));ws.on("error",()=>leave(p));
});
server.listen(PORT,"0.0.0.0",()=>console.log(`Island Overdrive server listening on ${PORT}`));
