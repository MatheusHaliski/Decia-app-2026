"""Coleta pública reprodutível, sem API de IA, credenciais ou execução de conteúdo remoto."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
import hashlib, json, re, urllib.request

class Texto(HTMLParser):
    def __init__(self):
        super().__init__(); self.skip=0; self.parts=[]
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style','noscript'): self.skip+=1
    def handle_endtag(self,tag):
        if tag in ('script','style','noscript'): self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if not self.skip: self.parts.append(data)

def coletar(item):
    name,url,terms=item
    record={'nome':name,'url':url,'consultadoEm':datetime.now(timezone.utc).isoformat()}
    try:
        request=urllib.request.Request(url,headers={'User-Agent':'WorkStationResearch/1.0 (public documentation review)'})
        with urllib.request.urlopen(request,timeout=25) as response:
            raw=response.read(3_000_001)
            if len(raw)>3_000_000: raise ValueError('Página excede limite de 3 MB')
            record.update(status=response.status,urlFinal=response.url,sha256=hashlib.sha256(raw).hexdigest())
        html=raw.decode('utf-8',errors='replace'); parser=Texto();parser.feed(html)
        text=re.sub(r'\s+',' ',' '.join(parser.parts)).strip()
        title=re.search(r'<title[^>]*>(.*?)</title>',html,re.S|re.I)
        record['titulo']=re.sub('<[^>]+>','',title.group(1)).strip() if title else name
        record['caracteresTexto']=len(text);record['trechos']=[]
        for term in terms:
            match=re.search(re.escape(term),text,re.I)
            if match:
                record['trechos'].append({'termo':term,'texto':text[max(0,match.start()-90):match.end()+180]})
        record['resultado']='texto_obtido' if len(text)>400 else 'conteudo_insuficiente'
        record['termosNaoLocalizados']=[t for t in terms if not any(x['termo']==t for x in record['trechos'])]
    except Exception as error:
        record.update(resultado='falha',erro=f'{type(error).__name__}: {error}')
    return record

def executar(sources,output):
    with ThreadPoolExecutor(max_workers=4) as pool: records=list(pool.map(coletar,sources))
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps({'executadoEm':datetime.now(timezone.utc).isoformat(),'metodo':'HTTP público com TLS verificado, extração HTML e localização literal; sem inferência de IA','limite':'Termo encontrado não prova semântica nem implementação; falhas e termos ausentes preservados.','fontes':records},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'arquivo':str(output),'fontes':len(records),'textoObtido':sum(r['resultado']=='texto_obtido' for r in records),'falhas':sum(r['resultado']=='falha' for r in records)},ensure_ascii=False))
    return records

ROOT=Path(__file__).resolve().parents[2]
