#!/usr/bin/env bash
# Gera "vida de producao" no ambiente AWS (US-F3-11/12): clientes, veiculos e OS
# percorrendo o ciclo completo (atribuir -> diagnostico -> aprovar/rejeitar ->
# executar -> entregar), leituras de usuarios e status publico. Alimenta os
# dashboards do Datadog para a demo. Uso: scripts/demo-trafego.sh [minutos=45]
# com algumas rejeicoes, leituras e status publico. Roda por DURACAO_MIN minutos.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH" AWS_PROFILE="${AWS_PROFILE:-oficina}" AWS_DEFAULT_REGION=us-east-1
DURACAO_MIN="${1:-45}"; R=guilhermeqmaia/soat-fiap-oficina-mecanica-app
GW=$(gh variable get GATEWAY_URL -R $R); CT='content-type: application/json'
tok() { curl -s -X POST $GW/auth -H "$CT" -d "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))"; }
ADM=$(tok '{"cpf":"52998224725","senha":"admin123"}'); MEC=$(tok '{"cpf":"16899535009","senha":"mecanico123"}'); ATD=$(tok '{"cpf":"24830145773","senha":"atendente123"}')
MID=$(echo $MEC | cut -d. -f2 | python3 -c "import sys,base64,json; s=sys.stdin.read().strip(); s+='='*(-len(s)%4); print(json.loads(base64.urlsafe_b64decode(s))['sub'])")
SERV=5e111111-1111-4111-8111-111111111111; PROD=9d111111-1111-4111-8111-111111111111
req() { local m="$1" path="$2" t="$3" body="$4"; [ -n "$body" ] || body='{}'; local c; c=$(curl -s -o /tmp/demo-resp.json -w '%{http_code}' -X "$m" "$GW$path" -H "Authorization: Bearer $t" -H "$CT" -d "$body"); [ "${c:0:1}" = 2 ] || echo "   ! $m $path -> $c $(python3 -c "import json; d=json.load(open('/tmp/demo-resp.json')); print(d.get('message') or d)" 2>/dev/null | cut -c1-140)" >&2; echo "$c"; }
post() { req POST "$@"; }
patch() { req PATCH "$@"; }
jid() { python3 -c "import json; print(json.load(open('/tmp/demo-resp.json')).get('id',''))"; }
cpf() { python3 -c "
import random
n=[random.randint(0,9) for _ in range(9)]
def dv(ns,w): s=sum(a*b for a,b in zip(ns,w)); r=11-s%11; return 0 if r>9 else r
d1=dv(n,range(10,1,-1)); d2=dv(n+[d1],range(11,1,-1)); print(''.join(map(str,n+[d1,d2])))"; }
placa() { python3 -c "import random,string as s; L=s.ascii_uppercase; print(''.join(random.choices(L,k=3))+str(random.randint(0,9))+random.choice(L)+str(random.randint(10,99)))"; }
NOMES=("Ana Souza" "Bruno Lima" "Carla Mendes" "Diego Rocha" "Elaine Prado" "Fabio Nunes" "Gisele Alves" "Heitor Ramos" "Iris Castro" "Joel Farias" "Karen Dias" "Luan Teixeira")
MODELOS=("Fiat Argo" "VW Polo" "Chevrolet Onix" "Hyundai HB20" "Toyota Corolla" "Honda Civic" "Renault Kwid" "Jeep Renegade")
FIM=$(( $(date +%s) + DURACAO_MIN*60 )); n=0; ok=0
while [ $(date +%s) -lt $FIM ]; do
  n=$((n+1)); NOME="${NOMES[$((RANDOM % ${#NOMES[@]}))]} $n"; C=$(cpf); M="${MODELOS[$((RANDOM % ${#MODELOS[@]}))]}"
  c=$(post /clientes $ADM "{\"nome\":\"$NOME\",\"cpfCnpj\":\"$C\",\"email\":\"cliente$n@demo.oficina\",\"telefone\":\"11 9$((RANDOM%9000+1000))-$((RANDOM%9000+1000))\"}"); CID=$(jid)
  [ -n "$CID" ] || { echo "[$n] cliente falhou ($c): $(cut -c1-120 /tmp/demo-resp.json)"; sleep 5; continue; }
  c=$(post /veiculos $ADM "{\"placa\":\"$(placa)\",\"marca\":\"${M% *}\",\"modelo\":\"${M#* }\",\"ano\":$((RANDOM%8+2016)),\"clienteId\":\"$CID\"}"); VID=$(jid)
  c=$(post /ordens-servico $ATD "{\"clienteId\":\"$CID\",\"veiculoId\":\"$VID\",\"descricaoInicial\":\"Revisao $M — cliente relata ruido ao frear\",\"servicos\":[{\"servicoId\":\"$SERV\",\"quantidade\":1}]}"); OS=$(jid)
  [ -n "$OS" ] || { echo "[$n] OS falhou ($c): $(cut -c1-120 /tmp/demo-resp.json)"; sleep 5; continue; }
  sleep $((RANDOM%20+5));  a=$(post /ordens-servico/$OS/atribuir-mecanico $MEC "{\"usuarioId\":\"$MID\"}")
  sleep $((RANDOM%25+10)); d=$(post /ordens-servico/$OS/completar-diagnostico $MEC '{"diagnostico":"Pastilhas e discos com desgaste acima do limite; troca recomendada."}')
  # 1 em 5 o cliente rejeita o orcamento
  if [ $((RANDOM%5)) -eq 0 ]; then sleep $((RANDOM%15+5)); c=$(post /ordens-servico/$OS/rejeitar-orcamento $ADM '{"motivo":"Valor acima do esperado"}'); echo "[$n] OS ${OS:0:8} atribuir=$a diag=$d REJEITADA=$c"; else
    sleep $((RANDOM%20+5)); ap=$(post /ordens-servico/$OS/aprovar-orcamento $ADM)
    sleep $((RANDOM%10+3));  i=$(patch /ordens-servico/$OS/servicos/$SERV/iniciar $MEC)
    sleep $((RANDOM%30+10)); co=$(patch /ordens-servico/$OS/servicos/$SERV/concluir $MEC '{"horasTrabalhadas":1.5}')  # ultimo servico concluido => FINALIZADA (policy)
    sleep $((RANDOM%10+3));  e=$(post /ordens-servico/$OS/entregar $ATD); echo "[$n] OS ${OS:0:8} atribuir=$a diag=$d aprovar=$ap iniciar=$i concluir=$co ENTREGUE=$e"; fi
  ok=$((ok+1))
  # leituras "de usuarios": lista, detalhe, status publico, OS do cliente
  curl -s -o /dev/null "$GW/ordens-servico?limit=20" -H "Authorization: Bearer $ADM"; curl -s -o /dev/null "$GW/ordens-servico/$OS" -H "Authorization: Bearer $ADM"
  NUM=$(curl -s "$GW/ordens-servico/$OS" -H "Authorization: Bearer $ADM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('cabecalho',{}).get('numero',''))" 2>/dev/null); [ -n "$NUM" ] && curl -s -o /dev/null "$GW/ordens-servico/numero/$NUM/status"
  CLI=$(tok "{\"cpf\":\"$C\"}"); [ -n "$CLI" ] && curl -s -o /dev/null "$GW/clientes/$C/ordens-servico" -H "Authorization: Bearer $CLI"
  curl -s -o /dev/null "$GW/ordens-servico/metricas/tempo-medio" -H "Authorization: Bearer $ADM"
done
echo "[$(date -u +%H:%M)] fim: $ok OS processadas em $DURACAO_MIN min"
