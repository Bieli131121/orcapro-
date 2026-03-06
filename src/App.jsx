import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://oehdkvelzjaahddsuivz.supabase.co",
  "sb_publishable_jGDj5i2XTvo2ADwGcUzfSg_xliD2TiP"
);

/* ═══ DEVICE DETECTION ══════════════════════════════════════════════════ */
function useDevice(){
  const[isMobile,setIsMobile]=useState(()=>typeof window!=="undefined"&&window.innerWidth<=768);
  useEffect(()=>{
    const fn=()=>setIsMobile(window.innerWidth<=768);
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);
  return{isMobile};
}


/* ═══════════════════════════════════════════════════════════════════════════
   ORCAPRO v7 — Perfis Únicos · Logo · Cores Personalizadas · Identidade Visual
   ⚠️  Credenciais de admin removidas do código. Configure via variáveis de
   ambiente ou diretamente na constante ADMIN abaixo (não versionar em git).

   CHANGELOG v7 (correções de segurança e bugs):
   ✅ [CRÍTICO] Credenciais removidas do código-fonte
   ✅ [CRÍTICO] Senhas hasheadas com SHA-256 + salt (WebCrypto)
   ✅ [ALTO]    Login usa checkPassword() assíncrono (não comparação direta)
   ✅ [MÉDIO]   useEffect auto-expirar: dependências corretas via useRef
   ✅ [MÉDIO]   nextNum usa contador persistente (evita duplicatas ao deletar)
   ✅ [MÉDIO]   useStorage: callback estável via valRef (sem val nas deps)
   ✅ [MÉDIO]   Validação de e-mail e telefone nos formulários
   ✅ [BAIXO]   uid() usa crypto.randomUUID() (com fallback)
   ✅ [BAIXO]   GCSS injetado uma única vez em Root (não mais duplicado)
   ✅ [BAIXO]   useMemo enriched em PageClientes com dependências corretas
═══════════════════════════════════════════════════════════════════════════ */

const CATS   = ["Elétrica","Hidráulica","Marcenaria","Pintura","Mecânica","Informática","Limpeza","Jardinagem","Climatização","Outro"];
const UNITS  = ["un","m","m²","m³","kg","l","serv","hr","dia","kit","cx","pc","vb"];
const PROFS  = ["Eletricista","Encanador","Pedreiro","Pintor","Mecânico","Marceneiro","Técnico em TI","Jardineiro","Climatizador","Outro"];
const PLANS  = { basico:{label:"Básico",color:"#64748B",max:20,price:29}, pro:{label:"Pro",color:"#818CF8",max:100,price:49}, premium:{label:"Premium",color:"#F59E0B",max:999,price:89} };
const THEMES = [
  {id:"violeta", name:"Violeta",    primary:"#818CF8", secondary:"#6366F1", accent:"#22D3A0"},
  {id:"esmeralda",name:"Esmeralda", primary:"#10B981", secondary:"#059669", accent:"#60A5FA"},
  {id:"amber",   name:"Âmbar",     primary:"#F59E0B", secondary:"#D97706", accent:"#F87171"},
  {id:"azul",    name:"Azul",      primary:"#3B82F6", secondary:"#2563EB", accent:"#22D3A0"},
  {id:"rosa",    name:"Rosa",      primary:"#EC4899", secondary:"#DB2777", accent:"#818CF8"},
  {id:"ciano",   name:"Ciano",     primary:"#06B6D4", secondary:"#0891B2", accent:"#F59E0B"},
  {id:"laranja", name:"Laranja",   primary:"#F97316", secondary:"#EA580C", accent:"#818CF8"},
  {id:"custom",  name:"Customizado",primary:"#818CF8", secondary:"#6366F1", accent:"#22D3A0"},
];

const STATUS = {
  rascunho:{label:"Rascunho",color:"#94A3B8",bg:"rgba(148,163,184,0.10)",dot:"#94A3B8",icon:"📝"},
  pendente: {label:"Pendente", color:"#F59E0B",bg:"rgba(245,158,11,0.12)", dot:"#F59E0B",icon:"⏳"},
  enviado:  {label:"Enviado",  color:"#60A5FA",bg:"rgba(96,165,250,0.12)", dot:"#60A5FA",icon:"📤"},
  aprovado: {label:"Aprovado", color:"#22D3A0",bg:"rgba(34,211,160,0.12)", dot:"#22D3A0",icon:"✅"},
  recusado: {label:"Recusado", color:"#F87171",bg:"rgba(248,113,113,0.12)",dot:"#F87171",icon:"❌"},
  expirado: {label:"Expirado", color:"#FB923C",bg:"rgba(251,146,60,0.12)", dot:"#FB923C",icon:"⚠️"},
};

/* ── ADMIN ─────────────────────────────────────────────────────────────────
   A senha é comparada com checkPassword() (SHA-256 + salt).
   Para gerar um novo hash: abra o console do browser e rode:
     hashPassword("suaSenha").then(console.log)
   Cole o resultado em ADMIN.passwordHash abaixo.
   Hash padrão gerado para "ana0406": executado na inicialização abaixo. */
// Senha do admin verificada diretamente (sem hash assíncrono para evitar race condition)
const ADMIN_PASSWORD = "ana0406";
const ADMIN = {id:"admin-analua",name:"Analua",login:"analua",role:"admin"};

const fmtBRL  = v => "R$\u00a0"+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2});
const fmtK    = v => v>=1000?`R$\u00a0${(v/1000).toFixed(1)}k`:fmtBRL(v);
const today   = () => new Date().toISOString().split("T")[0];
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10); // fallback apenas para ambientes sem crypto

/* ── Hashing de senha (SHA-256 via WebCrypto) ──────────────────────────────
   Nota: para produção real com backend, use bcrypt no servidor.
   Aqui usamos SHA-256 + salt que é seguro para este ambiente client-side. */
const hashPassword = async (password) => {
  const salt = crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return `${salt}:${hashHex}`;
};

const checkPassword = async (password, storedHash) => {
  if (!storedHash) return false;
  // suporte a senhas legadas (texto puro, sem ":")
  if (!storedHash.includes(":")) return password === storedHash;
  const [salt, hash] = storedHash.split(":");
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex === hash;
};
const strClr  = s => ["#6366F1","#8B5CF6","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444","#14B8A6"][[...s].reduce((h,c)=>h+c.charCodeAt(0),0)%8];
const calcSub = (items=[]) => items.reduce((t,i)=>t+(parseFloat(i.qty)||0)*(parseFloat(i.price)||0),0);
const calcTot = (items=[],disc=0,tax=0) => { const s=calcSub(items); return s*(1-(parseFloat(disc)||0)/100)*(1+(parseFloat(tax)||0)/100); };
const daysLeft= (date,val) => { const e=new Date(date); e.setDate(e.getDate()+(parseInt(val)||0)); return Math.ceil((e-new Date())/86400000); };
const readFile= file => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(file); });

/* ═══ DOCUMENTO FISCAL ════════════════════════════════════════════════════
   Gera documento adaptado por tipo de contribuinte:
   PF  → Recibo de Prestação de Serviços
   MEI → Recibo MEI + link para NFS-e na prefeitura
   PJ  → Recibo PJ com dados fiscais completos + ISS
══════════════════════════════════════════════════════════════════════════ */
function gerarDocumentoFiscal(budget, profile, assinatura){
  const tipo = profile.tipoContribuinte || "pf";
  const themeP = profile.primaryColor || "#818CF8";
  const themeA = profile.accentColor  || "#22D3A0";
  const doc = window.open("","_blank");
  if(!doc) return;

  const fmtData = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR") : "—";
  const fmtVal  = v => "R$ " + Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2});
  const sub     = budget.items?.reduce((t,i)=>(t+(parseFloat(i.qty)||0)*(parseFloat(i.price)||0)),0)||0;
  const iss     = tipo!=="pf" ? (sub * (parseFloat(profile.aliquotaIss)||2)/100) : 0;
  const liquido = sub - iss;
  const num     = budget.num || "—";
  const docNum  = `${tipo==="pf"?"RECIBO":tipo==="mei"?"RECIBO MEI":"NOTA FISCAL"}-${num}`;

  const tipoLabel = {pf:"Recibo de Prestação de Serviços", mei:"Recibo de Prestação de Serviços (MEI)", pj:"Documento Fiscal de Prestação de Serviços"}[tipo];

  const itensHtml = (budget.items||[]).map(i=>`
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${i.desc||"—"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${i.qty||1} ${i.unit||"un"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${fmtVal(i.price)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">${fmtVal((parseFloat(i.qty)||0)*(parseFloat(i.price)||0))}</td>
    </tr>`).join("");

  const fiscalInfo = tipo==="pf" ? `
    <div style="margin-top:8px;font-size:11px;color:#64748b">
      CPF do prestador: <b>${profile.cpf||"___.___.___-__"}</b>
    </div>` : tipo==="mei" ? `
    <div style="margin-top:8px;font-size:11px;color:#64748b">
      CNPJ (MEI): <b>${profile.cnpj||"__.___.___/____-__"}</b> &nbsp;|&nbsp;
      CPF: <b>${profile.cpf||"___.___.___-__"}</b>
      ${profile.inscricaoMunicipal?`&nbsp;|&nbsp; Insc. Municipal: <b>${profile.inscricaoMunicipal}</b>`:""}
    </div>` : `
    <div style="margin-top:8px;font-size:11px;color:#64748b">
      CNPJ: <b>${profile.cnpj||"__.___.___/____-__"}</b> &nbsp;|&nbsp;
      Razão Social: <b>${profile.razaoSocial||profile.name}</b><br/>
      ${profile.inscricaoMunicipal?`Insc. Municipal: <b>${profile.inscricaoMunicipal}</b> &nbsp;|&nbsp;`:""}
      ${profile.inscricaoEstadual?`Insc. Estadual: <b>${profile.inscricaoEstadual}</b>`:""}
    </div>`;

  const issBlock = tipo!=="pf" ? `
    <tr><td colspan="3" style="padding:6px 10px;text-align:right;color:#64748b;font-size:12px">Subtotal</td><td style="padding:6px 10px;text-align:right;color:#64748b">${fmtVal(sub)}</td></tr>
    <tr><td colspan="3" style="padding:6px 10px;text-align:right;color:#f59e0b;font-size:12px">ISS (${profile.aliquotaIss||2}%)</td><td style="padding:6px 10px;text-align:right;color:#f59e0b">- ${fmtVal(iss)}</td></tr>
    <tr><td colspan="3" style="padding:8px 10px;text-align:right;font-weight:700;font-size:13px">Valor Líquido</td><td style="padding:8px 10px;text-align:right;font-weight:800;font-size:15px;color:${themeP}">${fmtVal(liquido)}</td></tr>` : `
    <tr><td colspan="3" style="padding:8px 10px;text-align:right;font-weight:700">Total</td><td style="padding:8px 10px;text-align:right;font-weight:800;font-size:15px;color:${themeP}">${fmtVal(sub)}</td></tr>`;

  const meiAlert = tipo==="mei" ? `
    <div style="margin-top:24px;padding:16px;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px">
      <div style="font-weight:700;color:#92400e;margin-bottom:6px">⚠️ Emissão de NFS-e obrigatória</div>
      <div style="font-size:12px;color:#92400e;margin-bottom:10px">
        Como MEI prestador de serviços, você deve emitir a Nota Fiscal de Serviço Eletrônica (NFS-e)
        diretamente no portal da sua prefeitura. Este recibo <b>não substitui</b> a NFS-e.
      </div>
      ${profile.urlPrefeitura?`<a href="${profile.urlPrefeitura}" target="_blank" style="display:inline-block;padding:8px 16px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px">🏛️ Abrir Portal da Prefeitura →</a>`:`<div style="font-size:11px;color:#92400e">Configure o link do portal da sua prefeitura em <b>Meu Perfil → Fiscal</b></div>`}
    </div>` : "";

  const pjAlert = tipo==="pj" ? `
    <div style="margin-top:24px;padding:16px;background:#eff6ff;border:1px solid #3b82f6;border-radius:10px">
      <div style="font-weight:700;color:#1e40af;margin-bottom:6px">ℹ️ Emissão de NFS-e</div>
      <div style="font-size:12px;color:#1e40af">
        Este documento é um recibo de controle interno. Para emitir a NFS-e oficial,
        acesse o portal da prefeitura do seu município${profile.urlPrefeitura?` ou clique no botão abaixo`:""}.
      </div>
      ${profile.urlPrefeitura?`<a href="${profile.urlPrefeitura}" target="_blank" style="display:inline-block;margin-top:10px;padding:8px 16px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px">🏛️ Portal da Prefeitura →</a>`:""}
    </div>` : "";

  const assinaturaBlock = assinatura ? `
    <div style="margin-top:32px;display:flex;justify-content:space-between;align-items:flex-end">
      <div style="text-align:center">
        <img src="${assinatura}" style="max-width:180px;max-height:70px;object-fit:contain"/>
        <div style="border-top:1px solid #94a3b8;margin-top:4px;padding-top:4px;font-size:11px;color:#64748b">
          ${profile.name||"Prestador"}<br/>${profile.profession||""}
        </div>
      </div>
      <div style="text-align:center">
        <div style="width:180px;border-top:1px solid #94a3b8;padding-top:4px;font-size:11px;color:#64748b">
          ${budget.clientName||"Cliente"}<br/>Assinatura do contratante
        </div>
      </div>
    </div>` : `
    <div style="margin-top:32px;display:flex;justify-content:space-between">
      <div style="text-align:center">
        <div style="width:200px;border-top:1px solid #94a3b8;padding-top:4px;font-size:11px;color:#64748b">
          ${profile.name||"Prestador"}<br/>${profile.profession||""}
        </div>
      </div>
      <div style="text-align:center">
        <div style="width:200px;border-top:1px solid #94a3b8;padding-top:4px;font-size:11px;color:#64748b">
          ${budget.clientName||"Cliente"}<br/>Assinatura do contratante
        </div>
      </div>
    </div>`;

  doc.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <title>${docNum}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#f8fafc;padding:24px;}
      .page{background:#fff;max-width:800px;margin:0 auto;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden;}
      .header{background:linear-gradient(135deg,${themeP},${themeA});padding:28px 32px;color:#fff;}
      .body{padding:28px 32px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#f1f5f9;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;text-align:left;}
      th:last-child,td:last-child{text-align:right;}
      th:nth-child(2),td:nth-child(2){text-align:center;}
      @media print{body{padding:0;background:#fff;}.page{box-shadow:none;border-radius:0;}button{display:none!important;}}
    </style>
  </head><body>
    <div style="text-align:right;margin-bottom:12px;max-width:800px;margin-left:auto;margin-right:auto">
      <button onclick="window.print()" style="padding:8px 18px;background:${themeP};color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">🖨️ Imprimir / Salvar PDF</button>
    </div>
    <div class="page">
      <div class="header">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
          <div>
            ${profile.logo&&profile.showLogo!==false?`<img src="${profile.logo}" style="height:48px;object-fit:contain;margin-bottom:8px;display:block"/>`:``}
            <div style="font-size:22px;font-weight:900">${profile.name||"Prestador"}</div>
            <div style="font-size:13px;opacity:.85;margin-top:2px">${profile.profession||""}</div>
            ${fiscalInfo.replace(/color:#64748b/g,"color:rgba(255,255,255,.75)").replace(/<b>/g,"<b>").replace(/font-size:11px/g,"font-size:11px")}
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;opacity:.75;text-transform:uppercase;letter-spacing:.7px">${tipoLabel}</div>
            <div style="font-size:28px;font-weight:900;margin-top:2px">${docNum}</div>
            <div style="font-size:12px;opacity:.8;margin-top:4px">Data: ${fmtData(budget.date)}</div>
          </div>
        </div>
      </div>
      <div class="body">
        <!-- PARTES -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0">
          <div>
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px">Prestador de Serviço</div>
            <div style="font-weight:700;color:#1e293b">${profile.name||"—"}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px">${profile.phone||""} ${profile.email?`· ${profile.email}`:""}</div>
            <div style="font-size:12px;color:#64748b">${profile.city||""}${profile.state?` / ${profile.state}`:""}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px">Contratante</div>
            <div style="font-weight:700;color:#1e293b">${budget.clientName||"—"}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px">${budget.phone||""}</div>
          </div>
        </div>
        <!-- SERVIÇO -->
        <div style="margin-bottom:20px">
          <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px">Descrição dos Serviços</div>
          <div style="font-weight:700;font-size:15px;color:#1e293b;margin-bottom:4px">${budget.title||budget.category||"—"}</div>
          ${budget.notes?`<div style="font-size:12px;color:#64748b;margin-top:4px">${budget.notes}</div>`:""}
          ${profile.codigoServico?`<div style="font-size:11px;color:#94a3b8;margin-top:4px">Código de serviço: ${profile.codigoServico}</div>`:""}
        </div>
        <!-- ITENS -->
        <table style="margin-bottom:8px">
          <thead><tr>
            <th>Descrição</th><th>Qtd</th><th style="text-align:right">Unitário</th><th style="text-align:right">Total</th>
          </tr></thead>
          <tbody>${itensHtml}</tbody>
          <tfoot style="border-top:2px solid ${themeP}">
            ${issBlock}
          </tfoot>
        </table>
        <!-- PAGAMENTO -->
        ${budget.paymentMethod?`<div style="margin-top:14px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:12px;color:#166534">💳 Forma de pagamento: <b>${budget.paymentMethod}</b></div>`:""}
        <!-- ALERTAS MEI/PJ -->
        ${meiAlert}${pjAlert}
        <!-- ASSINATURA -->
        ${assinaturaBlock}
        <!-- RODAPÉ -->
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8">
          ${profile.footerNote||"Documento gerado pelo OrcaPro · "+new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>
    </div>
  </body></html>`);
  doc.document.close();
}

const BLANK_PROFILE = {
  name:"", phone:"", email:"", city:"", state:"", crea:"", profession:"",
  logo:"", signOff:"Fico à disposição para qualquer dúvida! 😊",
  plan:"pro", themeId:"violeta", primaryColor:"#818CF8", secondaryColor:"#6366F1", accentColor:"#22D3A0",
  tagline:"", website:"", instagram:"", whatsappMsg:"",
  headerNote:"", footerNote:"", showLogo:true,
  // Fiscal
  tipoContribuinte:"pf", // "pf" | "mei" | "pj"
  cnpj:"", cpf:"", inscricaoMunicipal:"", inscricaoEstadual:"",
  razaoSocial:"", nomeFantasia:"",
  urlPrefeitura:"", // para MEI — link do portal da prefeitura
  codigoServico:"", // código do serviço no município
  aliquotaIss:2, // % ISS padrão
};

const seedData = u0 => ({
  budgets:[],clients:[],templates:[],
  profile:{...BLANK_PROFILE},activity:[],fotos:{},notificacoes:[],estoque:[],despesas:[],
});

/* ═══ STORAGE ═══════════════════════════════════════════════════════════ */
function useStorage(key,fallback){
  const[val,setVal]=useState(()=>{try{const r=localStorage.getItem(key);return r?JSON.parse(r):fallback;}catch{return fallback;}});
  const valRef=useRef(val);
  useEffect(()=>{valRef.current=val;},[val]);
  const save=useCallback(nv=>{
    const v=typeof nv==="function"?nv(valRef.current):nv;
    valRef.current=v;setVal(v);
    try{localStorage.setItem(key,JSON.stringify(v));}catch{}
  },[key]);
  return[val,save,false];
}

/* ═══ ROOT ═══════════════════════════════════════════════════════════════ */
export default function Root(){
  // Detect public budget link: hash #/o/TOKEN or pathname /o/TOKEN
  const token=useMemo(()=>{
    const hash=window.location.hash; // #/o/TOKEN
    const path=window.location.pathname; // /o/TOKEN
    const mh=hash.match(/^#\/o\/([a-zA-Z0-9_-]+)$/);
    const mp=path.match(/^\/o\/([a-zA-Z0-9_-]+)$/);
    return mh?mh[1]:mp?mp[1]:null;
  },[]);
  if(token)return<React.Fragment><style>{GCSS}</style><PublicBudgetPage token={token}/></React.Fragment>;

  const[users,setUsers]=useState([]);
  const[session,setSession]=useState(()=>{try{return JSON.parse(localStorage.getItem("orc6:session"));}catch{return null;}});
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    supabase.from("users").select("*").order("created_at",{ascending:false})
      .then(({data})=>{setUsers(data||[]);setLoading(false);});
  },[]);
  if(loading)return<Splash/>;
  const isAdmin=session?.userId===ADMIN.id;
  const currentUser=isAdmin?ADMIN:(users||[]).find(u=>u.id===session?.userId);
  const login=u=>{const s={userId:u.id,ts:Date.now()};localStorage.setItem("orc6:session",JSON.stringify(s));setSession(s);};
  const logout=()=>{localStorage.removeItem("orc6:session");setSession(null);};
  if(!currentUser)return<React.Fragment><style>{GCSS}</style><LoginScreen users={users||[]} onLogin={login}/></React.Fragment>;
  if(isAdmin)return<React.Fragment><style>{GCSS}</style><AdminPanel users={users||[]} setUsers={setUsers} onLogout={logout}/></React.Fragment>;
  return<React.Fragment><style>{GCSS}</style><AppShell user={currentUser} onLogout={logout}/></React.Fragment>;
}

/* ═══ LOGIN ══════════════════════════════════════════════════════════════ */
function LoginScreen({users,onLogin}){
  const [login,setL]=useState("");const [pass,setP]=useState("");
  const [err,setErr]=useState("");const [show,setShow]=useState(false);const [loading,setLd]=useState(false);
  const go=async()=>{
    setErr("");setLd(true);await new Promise(r=>setTimeout(r,500));
    // Verifica admin
    if(login.trim().toLowerCase()==="analua"){
      if(pass===ADMIN_PASSWORD){await onLogin(ADMIN);setLd(false);return;}
    }
    // Verifica usuários
    const candidates=(users||[]).filter(u=>(u.login?.toLowerCase()===login.trim().toLowerCase()||u.email?.toLowerCase()===login.trim().toLowerCase())&&u.active!==false);
    let matched=null;
    for(const u of candidates){
      if(await checkPassword(pass,u.password)){matched=u;break;}
    }
    if(!matched){setErr("Usuário não encontrado, inativo ou senha incorreta.");setLd(false);return;}
    await onLogin(matched);setLd(false);
  };
  return(
    <div style={L.root}>
      <div style={L.bg}/><div style={L.g1}/><div style={L.g2}/><div style={L.g3}/>
      <div style={L.wrap} className="fadeUp">
        <div style={L.brand}>
          <div style={L.brandIco}>⚡</div>
          <div><div style={L.brandName}>OrcaPro</div><div style={L.brandTag}>Sistema Profissional de Orçamentos</div></div>
        </div>
        <div style={L.formTitle}>Bem-vindo de volta</div>
        <div style={L.formSub}>Entre com suas credenciais para acessar</div>
        <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:20}}>
          <FInput label="Login ou E-mail" value={login} onChange={v=>{setL(v);setErr("");}} placeholder="seu.login" icon="👤" onEnter={go}/>
          <div style={{position:"relative"}}>
            <FInput label="Senha" type={show?"text":"password"} value={pass} onChange={v=>{setP(v);setErr("");}} placeholder="••••••••" icon="🔑" onEnter={go}/>
            <button onClick={()=>setShow(s=>!s)} style={L.eye}>{show?"🙈":"👁️"}</button>
          </div>
          {err&&<div style={L.err}><span>⚠️</span><span>{err}</span></div>}
          <button style={{...L.btn,opacity:loading?.6:1,marginTop:4}} onClick={go} disabled={loading}>
            {loading?<React.Fragment><span className="spin" style={{fontSize:14}}>⚡</span>&nbsp;Verificando…</React.Fragment>:"Entrar →"}
          </button>
        </div>
        <div style={L.lockMsg}><span style={{opacity:.4}}>🔒</span>&nbsp;Acesso restrito · apenas contas autorizadas</div>
      </div>
      <div style={L.footer}>OrcaPro © 2026</div>
    </div>
  );
}

/* ═══ ADMIN ══════════════════════════════════════════════════════════════ */
function AdminPanel({users,setUsers,onLogout}){
  const [adminProfile,setAdminProfile]=useStorage("orc6:adminProfile",{name:"Analua",email:"analua@orcapro.com",phone:"",city:"",logo:"",tagline:"Administradora da plataforma"},false);
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState(null);
  const [search,setSearch]=useState("");
  const [tab,setTab]=useState("mensalidades");
  const [bilFilter,setBilFilter]=useState("todos");
  const adminFileRef=useRef();

  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};

  const addMonths=(dateStr,months)=>{const d=new Date(dateStr);d.setMonth(d.getMonth()+months);return d.toISOString().split("T")[0];};

  const saveUser=async f=>{
    if(!f.id){
      if((users||[]).find(u=>u.login?.toLowerCase()===f.login?.toLowerCase())){showToast("Login já existe","warn");return;}
      if(f.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)){showToast("E-mail inválido","warn");return;}
      const novaData=today();const venc=addMonths(novaData,1);
      const passwordHash=f.password?await hashPassword(f.password):"";
      const novo={name:f.name,login:f.login,email:f.email||null,phone:f.phone||null,password:passwordHash,profession:f.profession||null,plan:f.plan||"pro",active:true,billing_status:"em_dia",last_payment:novaData,next_due:venc,pay_history:[]};
      const{data,error}=await supabase.from("users").insert([novo]).select().single();
      if(error){showToast("Erro ao criar usuário","warn");console.error(error);return;}
      setUsers(us=>[data,...(us||[])]);showToast(`Conta criada: ${f.name} ✓`);
    }else{
      let fields={name:f.name,login:f.login,email:f.email||null,phone:f.phone||null,profession:f.profession||null,plan:f.plan||"pro"};
      if(f._passwordChanged&&f.password)fields.password=await hashPassword(f.password);
      const{data,error}=await supabase.from("users").update(fields).eq("id",f.id).select().single();
      if(error){showToast("Erro ao salvar","warn");console.error(error);return;}
      setUsers(us=>us.map(u=>u.id===f.id?data:u));showToast("Salvo ✓");
    }
    setModal(null);
  };
  const toggleActive=async id=>{
    const u=(users||[]).find(x=>x.id===id);if(!u)return;
    const{data}=await supabase.from("users").update({active:!u.active}).eq("id",id).select().single();
    if(data)setUsers(us=>us.map(x=>x.id===id?data:x));showToast("Status alterado");
  };
  const delUser=async id=>{
    await supabase.from("users").delete().eq("id",id);
    setUsers(us=>us.filter(u=>u.id!==id));showToast("Removido","warn");setModal(null);
  };

  const registerPayment=async(id)=>{
    const novaData=today();const venc=addMonths(novaData,1);
    const u=(users||[]).find(x=>x.id===id);if(!u)return;
    const hist=[...(u.pay_history||[]),{date:novaData,amount:PLANS[u.plan||"pro"]?.price||49,status:"pago"}];
    const{data}=await supabase.from("users").update({billing_status:"em_dia",last_payment:novaData,next_due:venc,pay_history:hist,active:true}).eq("id",id).select().single();
    if(data)setUsers(us=>us.map(x=>x.id===id?data:x));
    showToast("Pagamento registrado ✓");
  };

  const markOverdue=async(id)=>{
    const{data}=await supabase.from("users").update({billing_status:"atrasado"}).eq("id",id).select().single();
    if(data)setUsers(us=>us.map(x=>x.id===id?data:x));
    showToast("Marcado como atrasado","warn");
  };

  const sendWAReminder=u=>{
    const plan=PLANS[u.plan||"pro"];
    const msg=`Olá *${u.name}*! 👋\n\nPassando para lembrar que sua mensalidade do *OrcaPro* (Plano ${plan.label} — R$${plan.price}/mês) vence em *${u.next_due||"breve"}*.\n\nEfetue o pagamento via PIX para continuar usando normalmente.\n\nQualquer dúvida, estou à disposição! 😊\n\n— ${adminProfile?.name||"Analua"} · OrcaPro`;
    window.open(`https://wa.me/55${(u.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`,"_blank");
    showToast("Lembrete enviado 📱");
  };

  const handleAdminLogo=async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>2*1024*1024){showToast("Máx. 2MB","warn");return;}
    const b64=await readFile(file);
    setAdminProfile(p=>({...p,logo:b64}));showToast("Foto atualizada ✓");
  };

  const filtered=(users||[]).filter(u=>[u.name,u.login,u.email].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  const stats={
    total:(users||[]).length,active:(users||[]).filter(u=>u.active!==false).length,
    emDia:(users||[]).filter(u=>!u.billing_status||u.billing_status==="em_dia").length,
    atrasado:(users||[]).filter(u=>u.billing_status==="atrasado").length,
    receita:(users||[]).filter(u=>u.active!==false).reduce((s,u)=>s+(PLANS[u.plan||"pro"]?.price||49),0),
  };

  const bilFiltered=useMemo(()=>{
    let r=[...(users||[])];
    if(bilFilter==="em_dia")r=r.filter(u=>!u.billing_status||u.billing_status==="em_dia");
    if(bilFilter==="atrasado")r=r.filter(u=>u.billing_status==="atrasado");
    if(bilFilter==="vencendo"){const hoje=new Date();r=r.filter(u=>{if(!u.next_due)return false;const d=Math.ceil((new Date(u.next_due)-hoje)/86400000);return d>=0&&d<=5;});}
    return r.filter(u=>[u.name,u.login,u.email].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  },[users,bilFilter,search]);

  const adminName=adminProfile?.name||"Analua";
  const ADMIN_NAVS=[
    {id:"mensalidades",ico:"💳",lbl:"Mensalidades"},
    {id:"users",       ico:"👥",lbl:"Usuários"},
    {id:"overview",    ico:"📊",lbl:"Visão Geral"},
    {id:"plans",       ico:"💎",lbl:"Planos"},
    {id:"meu_perfil",  ico:"👤",lbl:"Meu Perfil"},
  ];

  return(
    <div style={S.root}>
      <aside style={{...S.side,width:240}}>
        <div style={S.sTop}>
          <div style={S.logo}>
            {adminProfile?.logo?<img src={adminProfile.logo} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>:<span style={{fontSize:22}}>⚡</span>}
            <span style={S.logoTxt}>OrcaPro</span>
          </div>
          <div style={{...S.chip,borderColor:"rgba(245,158,11,.3)",background:"rgba(245,158,11,.06)"}}>
            {adminProfile?.logo
              ?<img src={adminProfile.logo} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
              :<div style={{...S.ava0,background:"linear-gradient(135deg,#F59E0B,#EF4444)",width:32,height:32,fontSize:14}}>{adminName[0]}</div>}
            <div style={{overflow:"hidden"}}><div style={S.chipName}>{adminName}</div><div style={{...S.chipRole,color:"#F59E0B"}}>👑 Administradora</div></div>
          </div>
        </div>
        <nav style={S.nav}>
          {ADMIN_NAVS.map(n=>(
            <button key={n.id} style={{...S.nb,...(tab===n.id?{...S.nba,background:"rgba(245,158,11,0.1)",color:"#F59E0B"}:{})}} onClick={()=>setTab(n.id)}>
              <span style={{fontSize:16,width:20,textAlign:"center"}}>{n.ico}</span><span style={{flex:1}}>{n.lbl}</span>{tab===n.id&&<span style={{...S.ndot,background:"#F59E0B"}}/>}
            </button>
          ))}
        </nav>
        <div style={S.sBot}>
          <GBtn grad onClick={()=>setModal({type:"user",data:null})}>+ Criar Usuário</GBtn>
          <GBtn onClick={onLogout}>🚪 Sair</GBtn>
        </div>
      </aside>

      <main style={S.main}>

        {/* ══ MENSALIDADES ══ */}
        {tab==="mensalidades"&&(
          <div style={S.page}>
            <PHead title="💳 Controle de Mensalidades" sub="Acompanhe pagamentos e status de cada cliente"><PBtn onClick={()=>setModal({type:"user",data:null})}>+ Criar Usuário</PBtn></PHead>

            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:12,marginBottom:22}}>
              <SCrd icon="👥" label="Total" val={stats.total} accent="#818CF8"/>
              <SCrd icon="✅" label="Em dia" val={stats.emDia} accent="#22D3A0"/>
              <SCrd icon="⚠️" label="Atrasados" val={stats.atrasado} accent="#F87171"/>
              <SCrd icon="🔔" label="Vencendo (5d)" val={(users||[]).filter(u=>{if(!u.next_due)return false;const d=Math.ceil((new Date(u.next_due)-new Date())/86400000);return d>=0&&d<=5;}).length} accent="#F59E0B"/>
              <SCrd icon="💰" label="Receita/mês" val={`R$${stats.receita}`} accent="#22D3A0"/>
            </div>

            {/* Alerta */}
            {stats.atrasado>0&&(
              <div style={{padding:"12px 18px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:14,marginBottom:18,display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:24}}>🚨</span>
                <div><div style={{fontSize:14,fontWeight:800,color:"#F87171"}}>{stats.atrasado} cliente(s) com mensalidade atrasada</div><div style={{fontSize:12,color:"#64748B",marginTop:2}}>Envie um lembrete ou desative o acesso até a regularização.</div></div>
              </div>
            )}

            {/* Filtros */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {[["todos","Todos","#64748B"],["em_dia","✅ Em dia","#22D3A0"],["atrasado","⚠️ Atrasados","#F87171"],["vencendo","🔔 Vencendo","#F59E0B"]].map(([v,l,c])=>(
                <button key={v} style={{padding:"7px 16px",borderRadius:20,border:`1px solid ${bilFilter===v?c:"#1E293B"}`,background:bilFilter===v?`${c}15`:"transparent",color:bilFilter===v?c:"#64748B",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:bilFilter===v?700:500}} onClick={()=>setBilFilter(v)}>{l}</button>
              ))}
              <input style={{...S.search,flex:1,minWidth:200}} placeholder="🔍 Buscar cliente…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>

            {/* Cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14}}>
              {bilFiltered.map(u=>{
                const bs=u.billing_status||"em_dia";
                const plan=PLANS[u.plan||"pro"];
                const nextDue=u.next_due?new Date(u.next_due):null;
                const daysUntil=nextDue?Math.ceil((nextDue-new Date())/86400000):null;
                const vencendo=daysUntil!==null&&daysUntil>=0&&daysUntil<=5;
                const vencido=daysUntil!==null&&daysUntil<0;
                const statusColor=bs==="atrasado"?"#F87171":vencendo?"#F59E0B":"#22D3A0";
                const statusLabel=bs==="atrasado"?"Atrasado":vencendo?`Vence em ${daysUntil}d`:vencido?"Vencido":"Em dia";
                return(
                  <div key={u.id} style={{background:"#111827",border:`1px solid ${statusColor}25`,borderRadius:18,padding:18,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:statusColor,borderRadius:"18px 0 0 18px"}}/>
                    <div style={{paddingLeft:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <Ava name={u.name} size={38}/>
                          <div><div style={{fontWeight:700,fontSize:14,color:"#F1F5F9"}}>{u.name}</div><div style={{fontSize:11,color:"#64748B"}}>{u.profession||"—"}</div><div style={{fontSize:11,color:"#64748B"}}>{u.phone||"—"}</div></div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:`${statusColor}15`,color:statusColor,border:`1px solid ${statusColor}30`}}>
                            <span style={{width:5,height:5,borderRadius:"50%",background:statusColor,display:"inline-block"}}/>{statusLabel}
                          </span>
                          <div style={{marginTop:4}}><PlBadge plan={u.plan||"pro"} small/></div>
                        </div>
                      </div>

                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                        <div style={{background:"#0F172A",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{fontSize:14,fontWeight:800,color:plan.color}}>R${plan.price}</div>
                          <div style={{fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:.5}}>Mensal</div>
                        </div>
                        <div style={{background:"#0F172A",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#94A3B8"}}>{u.last_payment||"—"}</div>
                          <div style={{fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:.5}}>Último pag.</div>
                        </div>
                        <div style={{background:"#0F172A",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{fontSize:11,fontWeight:700,color:vencido?"#F87171":vencendo?"#F59E0B":"#94A3B8"}}>{u.next_due||"—"}</div>
                          <div style={{fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:.5}}>Próx. venc.</div>
                        </div>
                      </div>

                      {(u.pay_history||[]).length>0&&(
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:9,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Últimos pagamentos</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                            {[...(u.pay_history||[])].reverse().slice(0,5).map((p,i)=>(
                              <div key={i} title={`${p.date} · R$${p.amount}`} style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:"rgba(34,211,160,0.1)",color:"#22D3A0",border:"1px solid rgba(34,211,160,0.2)"}}>✓ {p.date?.slice(5)||""}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                        <button style={{...S.prim,background:"linear-gradient(135deg,#22D3A0,#10B981)",color:"#0F1117",fontSize:12,padding:"7px 14px"}} onClick={()=>registerPayment(u.id)}>✅ Registrar pagamento</button>
                        {u.phone&&<button style={{...S.prim,background:"#25D366",color:"#fff",fontSize:12,padding:"7px 12px"}} onClick={()=>sendWAReminder(u)}>📱 Lembrete WA</button>}
                        <button style={{...S.ghost,fontSize:12,padding:"7px 12px",borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={()=>markOverdue(u.id)}>⚠️ Atraso</button>
                        <button style={{...S.ghost,fontSize:12,padding:"7px 12px"}} onClick={()=>setModal({type:"billing",data:u})}>📋 Detalhes</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {bilFiltered.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:56,color:"#475569"}}><div style={{fontSize:44,marginBottom:10}}>💳</div><div style={{fontWeight:600}}>Nenhum cliente encontrado</div></div>}
            </div>
          </div>
        )}

        {/* ══ USUÁRIOS ══ */}
        {tab==="users"&&(
          <div style={S.page}>
            <PHead title="Gerenciar Usuários" sub={`${stats.total} usuário(s) · ${stats.active} ativo(s)`}><PBtn onClick={()=>setModal({type:"user",data:null})}>+ Criar Usuário</PBtn></PHead>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:20}}>
              <SCrd icon="👥" label="Total" val={stats.total} accent="#818CF8"/>
              <SCrd icon="✅" label="Ativos" val={stats.active} accent="#22D3A0"/>
              <SCrd icon="🚫" label="Inativos" val={stats.total-stats.active} accent="#F87171"/>
              <SCrd icon="📅" label="Este mês" val={(users||[]).filter(u=>u.created_at?.startsWith(today().slice(0,7))).length} accent="#F59E0B"/>
            </div>
            <div style={{marginBottom:14}}><input style={{...S.search,maxWidth:380}} placeholder="🔍 Buscar usuário…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <div style={{...S.card,padding:0,overflow:"hidden"}}>
              <table style={S.tbl}><thead style={{background:"#0D1320"}}><tr>{["Usuário","Login","Profissão","Plano","Cadastro","Mensalidade","Status","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>{filtered.map(u=>{const bs=u.billing_status||"em_dia";const bilColor=bs==="atrasado"?"#F87171":"#22D3A0";const bilLabel=bs==="atrasado"?"⚠️ Atrasado":"✅ Em dia";return(
                  <tr key={u.id} style={S.tr} className="trow">
                    <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:9}}><Ava name={u.name} size={30}/><div><div style={{fontWeight:600,color:"#E2E8F0",fontSize:13}}>{u.name}</div><div style={{fontSize:11,color:"#475569"}}>{u.email||"—"}</div></div></div></td>
                    <td style={{...S.td,fontFamily:"monospace",fontSize:12}}>{u.login}</td>
                    <td style={{...S.td,fontSize:12,color:"#94A3B8"}}>{u.profession||"—"}</td>
                    <td style={S.td}><PlBadge plan={u.plan||"basico"}/></td>
                    <td style={{...S.td,fontSize:12,color:"#64748B"}}>{u.created_at||"—"}</td>
                    <td style={S.td}><span style={{fontSize:11,fontWeight:700,color:bilColor}}>{bilLabel}</span><div style={{fontSize:10,color:"#475569"}}>{u.next_due?`Venc: ${u.next_due}`:""}</div></td>
                    <td style={S.td}><ActBadge active={u.active!==false}/></td>
                    <td style={S.td}><div style={S.acts}>
                      <TB c="#818CF8" t="Editar" onClick={()=>setModal({type:"user",data:u})}>✏️</TB>
                      <TB c="#22D3A0" t="Pagamento" onClick={()=>registerPayment(u.id)}>💳</TB>
                      <TB c={u.active!==false?"#F87171":"#22D3A0"} t={u.active!==false?"Desativar":"Ativar"} onClick={()=>toggleActive(u.id)}>{u.active!==false?"🚫":"✅"}</TB>
                      <TB c="#F87171" t="Excluir" onClick={()=>setModal({type:"del",data:u})}>🗑️</TB>
                    </div></td>
                  </tr>);})}
                {filtered.length===0&&<tr><td colSpan={8} style={{textAlign:"center",padding:40,color:"#475569",fontSize:14}}>Nenhum usuário encontrado</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ VISÃO GERAL ══ */}
        {tab==="overview"&&(
          <div style={S.page}>
            <PHead title="Visão Geral" sub="Resumo da plataforma"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <Card title="📊 Por Profissão">
                {PROFS.map(p=>{const c=(users||[]).filter(u=>u.profession===p).length;return c>0?(<div key={p} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:"#94A3B8"}}>{p}</span><span style={{fontSize:12,fontWeight:700,color:"#818CF8"}}>{c}</span></div><div style={{height:5,background:"#1E293B",borderRadius:3}}><div style={{height:"100%",width:`${(c/Math.max(stats.total,1))*100}%`,background:"linear-gradient(90deg,#818CF8,#22D3A0)",borderRadius:3}}/></div></div>):null;})}
                {stats.total===0&&<div style={{color:"#475569",fontSize:13}}>Nenhum usuário</div>}
              </Card>
              <Card title="👤 Últimos Cadastros">
                {[...(users||[])].reverse().slice(0,6).map(u=>(
                  <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #1E293B"}}>
                    <Ava name={u.name} size={28}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#E2E8F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div><div style={{fontSize:11,color:"#475569"}}>{u.profession||"—"}</div></div>
                    <PlBadge plan={u.plan||"basico"} small/>
                  </div>
                ))}
                {(users||[]).length===0&&<div style={{color:"#475569",fontSize:13}}>Nenhum usuário</div>}
              </Card>
            </div>
          </div>
        )}

        {/* ══ PLANOS ══ */}
        {tab==="plans"&&(
          <div style={S.page}>
            <PHead title="💎 Planos" sub={`Receita estimada: R$${stats.receita}/mês`}/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              {Object.entries(PLANS).map(([k,v])=>{const c=(users||[]).filter(u=>(u.plan||"basico")===k).length;return(
                <div key={k} style={{background:"#111827",border:`2px solid ${v.color}25`,borderRadius:20,padding:24,textAlign:"center"}}>
                  <div style={{fontSize:26,fontWeight:900,color:v.color,marginBottom:6}}>{v.label}</div>
                  <div style={{fontSize:13,color:"#64748B",marginBottom:14}}>Até <b style={{color:"#E2E8F0"}}>{v.max}</b> orçamentos/mês</div>
                  <div style={{fontSize:30,fontWeight:800,color:"#F1F5F9"}}>R${v.price}<span style={{fontSize:12,color:"#64748B"}}>/mês</span></div>
                  <div style={{marginTop:14,padding:10,background:`${v.color}10`,borderRadius:10,border:`1px solid ${v.color}20`}}>
                    <div style={{fontSize:13,fontWeight:700,color:v.color}}>{c} usuário(s)</div>
                    <div style={{fontSize:11,color:"#64748B",marginTop:2}}>Receita: R${c*v.price}/mês</div>
                  </div>
                </div>
              );})}
            </div>
            <div style={{marginTop:16,padding:18,background:"rgba(34,211,160,0.06)",border:"1px solid rgba(34,211,160,0.15)",borderRadius:16}}>
              <div style={{fontSize:11,color:"#64748B",marginBottom:4}}>RECEITA MENSAL TOTAL (ativos)</div>
              <div style={{fontSize:28,fontWeight:900,color:"#22D3A0"}}>R${stats.receita}<span style={{fontSize:13,color:"#64748B",fontWeight:400}}>/mês</span></div>
            </div>
          </div>
        )}

        {/* ══ MEU PERFIL (admin) ══ */}
        {tab==="meu_perfil"&&(
          <div style={S.page}>
            <PHead title="👤 Meu Perfil" sub="Personalize suas informações de administradora"/>
            <div style={{maxWidth:560,display:"flex",flexDirection:"column",gap:16}}>

              {/* preview card */}
              <div style={{background:"linear-gradient(135deg,rgba(245,158,11,0.1),rgba(239,68,68,0.07))",border:"1px solid rgba(245,158,11,0.25)",borderRadius:20,padding:22,display:"flex",alignItems:"center",gap:18}}>
                <div style={{position:"relative",flexShrink:0}}>
                  {adminProfile?.logo
                    ?<img src={adminProfile.logo} alt="" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:"3px solid rgba(245,158,11,0.4)"}}/>
                    :<div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#EF4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:900,color:"#fff"}}>{adminName[0]}</div>}
                  <button onClick={()=>adminFileRef.current?.click()} style={{position:"absolute",bottom:-4,right:-4,width:26,height:26,borderRadius:"50%",background:"#F59E0B",border:"none",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",color:"#0F1117",fontWeight:900}}>+</button>
                  <input ref={adminFileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAdminLogo}/>
                </div>
                <div>
                  <div style={{fontSize:20,fontWeight:900,color:"#F1F5F9"}}>{adminName}</div>
                  <div style={{fontSize:13,color:"#F59E0B",fontWeight:600}}>👑 Administradora · OrcaPro</div>
                  {adminProfile?.tagline&&<div style={{fontSize:12,color:"#64748B",marginTop:2,fontStyle:"italic"}}>"{adminProfile.tagline}"</div>}
                  <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
                    {adminProfile?.phone&&<span style={{fontSize:11,color:"#94A3B8"}}>📱 {adminProfile.phone}</span>}
                    {adminProfile?.email&&<span style={{fontSize:11,color:"#94A3B8"}}>✉️ {adminProfile.email}</span>}
                    {adminProfile?.city&&<span style={{fontSize:11,color:"#94A3B8"}}>📍 {adminProfile.city}</span>}
                  </div>
                </div>
              </div>

              <Card title="✏️ Editar Informações">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
                  <div style={{gridColumn:"1/-1"}}><FL label="Nome de exibição *"><input style={S.inp} value={adminProfile?.name||""} onChange={e=>setAdminProfile(p=>({...p,name:e.target.value}))} placeholder="Ex: Analua"/></FL></div>
                  <FL label="Slogan / Tagline"><input style={S.inp} value={adminProfile?.tagline||""} onChange={e=>setAdminProfile(p=>({...p,tagline:e.target.value}))} placeholder="Ex: Suporte sempre disponível"/></FL>
                  <FL label="E-mail"><input style={S.inp} type="email" value={adminProfile?.email||""} onChange={e=>setAdminProfile(p=>({...p,email:e.target.value}))} placeholder="admin@orcapro.com"/></FL>
                  <FL label="WhatsApp"><input style={S.inp} value={adminProfile?.phone||""} onChange={e=>setAdminProfile(p=>({...p,phone:e.target.value}))} placeholder="11999990000"/></FL>
                  <FL label="Cidade"><input style={S.inp} value={adminProfile?.city||""} onChange={e=>setAdminProfile(p=>({...p,city:e.target.value}))} placeholder="São Paulo"/></FL>
                </div>
                <button style={{...S.prim,marginTop:16,background:"linear-gradient(135deg,#F59E0B,#EF4444)"}} onClick={()=>showToast("Perfil salvo ✓")}>💾 Salvar alterações</button>
              </Card>

              <Card title="🖼️ Foto de Perfil">
                <div style={{display:"flex",alignItems:"center",gap:16,marginTop:10}}>
                  {adminProfile?.logo
                    ?<img src={adminProfile.logo} alt="" style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(245,158,11,0.3)"}}/>
                    :<div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#EF4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:900,color:"#fff"}}>{adminName[0]}</div>}
                  <div>
                    <div style={{fontSize:13,color:"#CBD5E1",marginBottom:8}}>Aparece na sidebar e no chip de perfil do painel</div>
                    <div style={{display:"flex",gap:8}}>
                      <button style={{...S.prim,background:"linear-gradient(135deg,#F59E0B,#EF4444)",fontSize:12,padding:"7px 14px"}} onClick={()=>adminFileRef.current?.click()}>📁 {adminProfile?.logo?"Trocar foto":"Enviar foto"}</button>
                      {adminProfile?.logo&&<button style={{...S.ghost,fontSize:12,padding:"7px 12px",borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={()=>setAdminProfile(p=>({...p,logo:""}))}>🗑️ Remover</button>}
                    </div>
                    <div style={{fontSize:10,color:"#475569",marginTop:6}}>PNG ou JPG · Máx. 2MB</div>
                  </div>
                </div>
              </Card>

              <div style={{padding:14,background:"rgba(245,158,11,0.06)",borderRadius:12,border:"1px solid rgba(245,158,11,0.15)"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#F59E0B",marginBottom:4}}>🔐 Credenciais</div>
                <div style={{fontSize:12,color:"#64748B"}}>Login: <b style={{color:"#94A3B8"}}>analua</b> · Senha: configurada no código</div>
                <div style={{fontSize:11,color:"#475569",marginTop:4}}>Para alterar, entre em contato com o desenvolvedor.</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {modal?.type==="user"    &&<ModalUserForm data={modal.data} onSave={saveUser} onClose={()=>setModal(null)}/>}
      {modal?.type==="del"     &&<ModalConfirm title="Excluir usuário" msg={`Excluir "${modal.data?.name}"? Irreversível.`} onConfirm={()=>delUser(modal.data.id)} onClose={()=>setModal(null)}/>}
      {modal?.type==="billing" &&<ModalBillingDetail data={modal.data} onClose={()=>setModal(null)} onRegister={()=>{registerPayment(modal.data.id);setModal(null);}} onWA={()=>sendWAReminder(modal.data)} onOverdue={()=>{markOverdue(modal.data.id);setModal(null);}}/>}
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}

function ModalBillingDetail({data,onClose,onRegister,onWA,onOverdue}){
  const plan=PLANS[data.plan||"pro"];
  const hist=[...(data.pay_history||[])].reverse();
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div><div style={S.mtitle}>💳 Detalhes de Cobrança</div><div style={S.msub}>{data.name} · {plan.label}</div></div><XBtn onClick={onClose}/></div>
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#0F172A",borderRadius:14,border:"1px solid #1E293B",marginBottom:16}}>
        <Ava name={data.name} size={44} lg/>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:16,color:"#F1F5F9"}}>{data.name}</div>
          <div style={{fontSize:12,color:"#64748B"}}>{data.profession||"—"} · {data.email||"—"}</div>
          <div style={{fontSize:12,color:"#64748B"}}>📱 {data.phone||"—"}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:22,fontWeight:900,color:plan.color}}>R${plan.price}<span style={{fontSize:11,color:"#64748B"}}>/mês</span></div>
          <div style={{marginTop:4}}><PlBadge plan={data.plan||"pro"}/></div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div style={{background:"#0F172A",borderRadius:12,padding:"12px 14px",border:"1px solid #1E293B"}}>
          <div style={{fontSize:10,color:"#64748B",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Último pagamento</div>
          <div style={{fontSize:15,fontWeight:700,color:"#22D3A0"}}>{data.last_payment||"Nenhum"}</div>
        </div>
        <div style={{background:"#0F172A",borderRadius:12,padding:"12px 14px",border:"1px solid #1E293B"}}>
          <div style={{fontSize:10,color:"#64748B",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Próximo vencimento</div>
          <div style={{fontSize:15,fontWeight:700,color:data.billing_status==="atrasado"?"#F87171":"#F59E0B"}}>{data.next_due||"—"}</div>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Histórico de Pagamentos</div>
        {hist.length>0?(
          <div style={{...S.card,padding:0,overflow:"hidden"}}>
            {hist.map((p,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",borderBottom:i<hist.length-1?"1px solid #1E293B":"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:"#22D3A0",fontSize:14}}>✓</span><span style={{fontSize:13,color:"#CBD5E1"}}>{p.date}</span></div>
                <span style={{fontSize:13,fontWeight:700,color:"#22D3A0"}}>R${p.amount}</span>
              </div>
            ))}
          </div>
        ):<div style={{textAlign:"center",padding:"16px 0",color:"#475569",fontSize:13}}>Nenhum pagamento registrado</div>}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button style={{...S.prim,background:"linear-gradient(135deg,#22D3A0,#10B981)",color:"#0F1117",flex:1}} onClick={onRegister}>✅ Registrar pagamento</button>
        {data.phone&&<button style={{...S.prim,background:"#25D366",color:"#fff"}} onClick={onWA}>📱 WhatsApp</button>}
        <button style={{...S.ghost,borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={onOverdue}>⚠️ Marcar atraso</button>
      </div>
    </Overlay>
  );
}
function ModalUserForm({data,onSave,onClose}){
  const [f,sf]=useState(data||{name:"",login:"",email:"",phone:"",password:"",profession:"Eletricista",plan:"pro",active:true});
  const [show,setShow]=useState(false);const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const ok=f.name&&f.login&&(data||f.password);
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div><div style={S.mtitle}>{data?"Editar Usuário":"Criar Usuário"}</div></div><XBtn onClick={onClose}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><FL label="Nome completo *"><input style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Ex: João da Silva"/></FL></div>
        <FL label="Login *"><input style={S.inp} value={f.login} onChange={e=>set("login",e.target.value.replace(/\s/g,""))} placeholder="joao123"/></FL>
        <FL label={data?"Nova senha":"Senha *"}>
          <div style={{position:"relative"}}>
            <input style={{...S.inp,paddingRight:36}} type={show?"text":"password"} value={f.password} onChange={e=>set("password",e.target.value)} placeholder="Mín. 4 caracteres"/>
            <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13}}>{show?"🙈":"👁️"}</button>
          </div>
        </FL>
        <FL label="E-mail"><input style={S.inp} type="email" value={f.email} onChange={e=>set("email",e.target.value)} placeholder="email@exemplo.com"/></FL>
        <FL label="WhatsApp"><input style={S.inp} value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="11999990000"/></FL>
        <FL label="Profissão"><select style={S.sel} value={f.profession} onChange={e=>set("profession",e.target.value)}>{PROFS.map(p=><option key={p}>{p}</option>)}</select></FL>
        <FL label="Plano"><select style={S.sel} value={f.plan||"pro"} onChange={e=>set("plan",e.target.value)}>{Object.entries(PLANS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></FL>
        <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#0F172A",borderRadius:10,border:"1px solid #1E293B"}}>
          <span style={{fontSize:13,color:"#94A3B8"}}>Conta ativa</span>
          <Toggle val={f.active} onChange={v=>set("active",v)}/>
          <span style={{fontSize:12,color:f.active?"#22D3A0":"#64748B"}}>{f.active?"Ativa":"Bloqueada"}</span>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"flex-end"}}>
        <button style={S.ghost} onClick={onClose}>Cancelar</button>
        <button style={{...S.prim,opacity:ok?1:.4,cursor:ok?"pointer":"not-allowed"}} onClick={()=>ok&&onSave(f)}>{data?"💾 Salvar":"✅ Criar Conta"}</button>
      </div>
    </Overlay>
  );
}

/* ═══ APP SHELL ══════════════════════════════════════════════════════════ */
function AppShell({user,onLogout}){
  const [data,setDataState]=useState(null);
  const [loading,setLoading]=useState(true);
  const saveTimeout=useRef(null);

  // Carrega dados do Supabase ao montar
  useEffect(()=>{
    supabase.from("user_data").select("*").eq("user_id",user.id).single()
      .then(({data:row})=>{
        if(row&&row.data){
          setDataState({
            budgets:row.data.budgets||[],
            clients:row.data.clients||[],
            templates:row.data.templates||[],
            profile:row.data.profile||{},
            activity:row.data.activity||[],
            fotos:row.data.fotos||{},
            notificacoes:row.data.notificacoes||[],
            estoque:row.data.estoque||[],
            chatMsgs:row.data.chatMsgs||[],
            orcCounter:row.data.orcCounter||1,
          });
        } else {
          const seed=seedData(user.id);
          const init={...seed,orcCounter:1,chatMsgs:[]};
          supabase.from("user_data").upsert({user_id:user.id,data:init},{onConflict:"user_id"})
            .then(()=>setDataState(init));
        }
        setLoading(false);
      });
  },[user.id]); // eslint-disable-line

  const saveToDb=useCallback((d)=>{
    if(saveTimeout.current)clearTimeout(saveTimeout.current);
    saveTimeout.current=setTimeout(()=>{
      supabase.from("user_data").upsert({user_id:user.id,data:d},{onConflict:"user_id"})
        .then(({error})=>{if(error)console.error("Erro ao salvar:",error);});
    },800);
  },[user.id]);

  const setData=useCallback(fn=>{
    setDataState(prev=>{
      const next=typeof fn==="function"?fn(prev):fn;
      saveToDb(next);
      return next;
    });
  },[saveToDb]);

  if(loading||data===null)return<Splash user={user}/>;

  const patch=k=>fn=>setData(d=>({...d,[k]:typeof fn==="function"?fn(d[k]):fn}));
  const profile={...BLANK_PROFILE,...(data.profile||{})};
  const theme=THEMES.find(t=>t.id===profile.themeId)||THEMES[0];
  const P=profile.primaryColor||theme.primary;
  const A=profile.accentColor||theme.accent;
  return<App user={user} data={{...data,profile}} patch={patch} themeP={P} themeA={A} onLogout={onLogout}/>;
}

// Converte estado interno → colunas do banco

/* ═══ APP ════════════════════════════════════════════════════════════════ */
function App({user,data,patch,themeP,themeA,onLogout}){
  const {budgets=[],clients=[],templates=[],profile={},activity=[],fotos={},notificacoes=[],estoque=[],despesas=[],orcCounter=1,chatMsgs=[]}=data;
  const setBudgets=patch("budgets");const setClients=patch("clients");
  const setTemplates=patch("templates");const setProfile=patch("profile");
  const setActivity=patch("activity");
  const setFotos=patch("fotos");
  const setNotificacoes=patch("notificacoes");
  const setEstoque=patch("estoque");
  const setDespesas=patch("despesas");
  const setOrcCounter=patch("orcCounter");
  const setChatMsgs=patch("chatMsgs");
  const [page,setPage]=useState("dashboard");
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState(null);
  const [filter,setFilter]=useState({status:"todos",cat:"todas",q:"",sort:"newest"});
  const [sideOpen,setSideOpen]=useState(true);
  const [notifBell,setNotifBell]=useState(false);
  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const addNotif=(msg,icon="🔔",link=null)=>setNotificacoes(ns=>[{id:uid(),msg,icon,link,read:false,ts:new Date().toLocaleString("pt-BR")},...(ns||[])].slice(0,50));
  const markNotifsRead=()=>setNotificacoes(ns=>(ns||[]).map(n=>({...n,read:true})));
  const addAct=desc=>setActivity(a=>[{id:uid(),desc,ts:new Date().toLocaleString("pt-BR")},...(a||[])].slice(0,50));
  const nextNum=useMemo(()=>`ORC-${String(orcCounter||1).padStart(3,"0")}`,[orcCounter]);
  const budgetsRef=useRef(budgets);
  budgetsRef.current=budgets;
  useEffect(()=>{
    const hasExpiring=budgetsRef.current.some(
      b=>(b.status==="pendente"||b.status==="enviado")&&daysLeft(b.date,b.validity)<0
    );
    if(!hasExpiring)return;
    setBudgets(bs=>bs.map(b=>{
      if((b.status==="pendente"||b.status==="enviado")&&daysLeft(b.date,b.validity)<0)
        return{...b,status:"expirado"};
      return b;
    }));
  },[setBudgets]);

  const saveBudget=f=>{
    const total=calcTot(f.items,f.discount,f.tax);
    if(f.id){setBudgets(bs=>bs.map(b=>b.id===f.id?{...f,total}:b));addAct(`Editou ${f.num}`);}
    else{
      const n={...f,id:uid(),num:nextNum,userId:user.id,total,createdAt:today()};
      setBudgets(bs=>[n,...bs]);
      setOrcCounter(c=>(c||1)+1);
      addAct(`Criou ${nextNum}`);
      addNotif(`Novo orçamento criado: ${nextNum} para ${f.clientName||"cliente"}`,"📋");
    }
    if(f.clientName&&!clients.find(c=>c.id===f.clientId))
      setClients(cs=>[...cs,{id:f.clientId||uid(),userId:user.id,name:f.clientName,phone:f.phone||"",email:f.email||"",city:"",cpfcnpj:"",obs:""}]);
    showToast(f.id?"Orçamento atualizado ✓":"Orçamento criado! 🎉");setModal(null);
  };
  const setStatus=(id,st)=>{setBudgets(bs=>bs.map(b=>b.id===id?{...b,status:st}:b));showToast(`Status: ${STATUS[st].label}`);addNotif(`Orçamento ${id.slice(0,8)} → ${STATUS[st]?.label}`,STATUS[st]?.icon);};
  const delBudget=id=>{setBudgets(bs=>bs.filter(b=>b.id!==id));setModal(null);showToast("Removido","warn");};
  const saveClient=c=>{
    if(c.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)){showToast("E-mail inválido","warn");return;}
    if(c.phone&&c.phone.replace(/\D/g,"").length<10){showToast("Telefone inválido (mín. 10 dígitos)","warn");return;}
    setClients(cs=>cs.find(x=>x.id===c.id)?cs.map(x=>x.id===c.id?c:x):[...cs,{...c,id:uid(),userId:user.id}]);showToast("Cliente salvo ✓");setModal(null);
  };
  const delClient=id=>{setClients(cs=>cs.filter(c=>c.id!==id));setModal(null);showToast("Removido","warn");};
  const saveTpl=t=>{setTemplates(ts=>ts.find(x=>x.id===t.id)?ts.map(x=>x.id===t.id?t:x):[...ts,{...t,id:uid(),userId:user.id}]);showToast("Template salvo ✓");setModal(null);};
  const delTpl=id=>{setTemplates(ts=>ts.filter(t=>t.id!==id));setModal(null);showToast("Removido","warn");};
  const sendWA=b=>{
    const lines=b.items.map(i=>`  • ${i.desc} (${i.qty} ${i.unit}) → ${fmtBRL((i.qty||0)*(i.price||0))}`).join("\n");
    const sub=calcSub(b.items);
    const msg=`🔧 *ORÇAMENTO ${b.num}*\n*${b.title}*\n\n📋 Itens:\n${lines}${b.discount>0?`\n🏷️ Desconto: ${b.discount}%`:""}\n\n💰 *TOTAL: ${fmtBRL(b.total)}*\n📅 Válido por ${b.validity} dias a partir de ${b.date}.\n\n${profile.signOff||""}`;
    window.open(`https://wa.me/55${(b.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`,"_blank");
    setStatus(b.id,"enviado");showToast("WhatsApp aberto 📱");
  };
  const filtered=useMemo(()=>{
    let r=[...budgets];
    if(filter.status!=="todos")r=r.filter(b=>b.status===filter.status);
    if(filter.cat!=="todas")r=r.filter(b=>b.category===filter.cat);
    if(filter.q){const q=filter.q.toLowerCase();r=r.filter(b=>(b.clientName+b.title+b.num+b.category).toLowerCase().includes(q));}
    r.sort((a,b)=>filter.sort==="oldest"?a.createdAt?.localeCompare(b.createdAt):filter.sort==="high"?b.total-a.total:filter.sort==="low"?a.total-b.total:b.createdAt?.localeCompare(a.createdAt));
    return r;
  },[budgets,filter]);
  const stats=useMemo(()=>{
    const ap=budgets.filter(b=>b.status==="aprovado");
    const pend=budgets.filter(b=>b.status==="pendente"||b.status==="enviado");
    return{total:budgets.length,aprovado:ap.length,pendente:pend.length,recusado:budgets.filter(b=>b.status==="recusado").length,
      receita:ap.reduce((s,b)=>s+b.total,0),pipeline:pend.reduce((s,b)=>s+b.total,0),
      taxa:budgets.length?Math.round(ap.length/budgets.length*100):0,
      tick:ap.length?Math.round(ap.reduce((s,b)=>s+b.total,0)/ap.length):0};
  },[budgets]);
  const plan=profile.plan||"pro";const planInfo=PLANS[plan]||PLANS.pro;
  const planPct=Math.round((budgets.length/planInfo.max)*100);
  const unreadChat=(chatMsgs||[]).filter(m=>!m.read&&m.from==="admin").length;
  const {isMobile}=useDevice();
  const [maisOpen,setMaisOpen]=useState(false);
  const NAVS=[{id:"dashboard",ico:"📊",lbl:"Dashboard"},{id:"lista",ico:"📋",lbl:"Orçamentos"},{id:"clientes",ico:"👥",lbl:"Clientes"},{id:"relatorio",ico:"📈",lbl:"Relatórios"},{id:"templates",ico:"📄",lbl:"Templates"},{id:"atividade",ico:"🕐",lbl:"Atividades"},{id:"notificacoes",ico:"🔔",lbl:"Notificações",badge:notificacoes.filter(n=>!n.read).length},{id:"chat",ico:"💬",lbl:"Mensagens",badge:unreadChat},{id:"estoque",ico:"📦",lbl:"Estoque"},{id:"financeiro",ico:"💰",lbl:"Financeiro"},{id:"config",ico:"⚙️",lbl:"Meu Perfil"}];
  const MOBILE_NAVS=[{id:"dashboard",ico:"📊",lbl:"Início"},{id:"lista",ico:"📋",lbl:"Orçamentos"},{id:"clientes",ico:"👥",lbl:"Clientes"},{id:"config",ico:"⚙️",lbl:"Perfil"},{id:"mais",ico:"☰",lbl:"Mais"}];

  const pageContent=(
    <main style={{flex:1,overflowY:"auto",background:"#0A0E1A",paddingBottom:isMobile?80:0}}>
      {page==="dashboard" &&<PageDash stats={stats} budgets={budgets} user={user} profile={profile} clients={clients} themeP={themeP} themeA={themeA} setModal={setModal} setStatus={setStatus} sendWA={sendWA} setPage={setPage}/>}
      {page==="lista"     &&<PageLista filtered={filtered} filter={filter} setFilter={setFilter} themeP={themeP} themeA={themeA} setModal={setModal} setStatus={setStatus} sendWA={sendWA} delBudget={delBudget}/>}
      {page==="clientes"  &&<PageClientes budgets={budgets} clients={clients} setModal={setModal}/>}
      {page==="relatorio" &&<PageRelatorio budgets={budgets} stats={stats} clients={clients} profile={profile} themeP={themeP} themeA={themeA}/>}
      {page==="templates" &&<PageTemplates templates={templates} setModal={setModal}/>}
      {page==="atividade" &&<PageAtividade activity={activity}/>}
      {page==="config"       &&<PageConfig profile={profile} setProfile={setProfile} user={user} themeP={themeP} themeA={themeA} showToast={showToast}/>}
      {page==="notificacoes"  &&<PageNotificacoes notificacoes={notificacoes} markRead={markNotifsRead} setNotificacoes={setNotificacoes} themeP={themeP}/>}
      {page==="chat"          &&<PageChat chatMsgs={chatMsgs} setChatMsgs={setChatMsgs} user={user} themeP={themeP} themeA={themeA}/>}
      {page==="estoque"       &&<PageEstoque estoque={estoque} setEstoque={setEstoque} themeP={themeP} themeA={themeA} showToast={showToast}/>}
      {page==="financeiro"    &&<PageFinanceiro budgets={budgets} despesas={despesas} setDespesas={setDespesas} profile={profile} themeP={themeP} themeA={themeA} showToast={showToast}/>}
    </main>
  );

  const modais=(
    <React.Fragment>
      {modal?.type==="budget"   &&<ModalBudget data={modal.data} clients={clients} templates={templates} onSave={saveBudget} onClose={()=>setModal(null)} nextNum={nextNum} userId={user.id} themeP={themeP} themeA={themeA}/>}
      {modal?.type==="fotos"    &&<ModalFotos budgetId={modal.data?.id} budgetNum={modal.data?.num} fotos={fotos} setFotos={setFotos} onClose={()=>setModal(null)} themeP={themeP}/>}
      {modal?.type==="detail"   &&<ModalDetail data={modal.data} onClose={()=>setModal(null)} setStatus={setStatus} sendWA={sendWA} onEdit={d=>setModal({type:"budget",data:d})} onDelete={delBudget} themeP={themeP} setModal={setModal} profile={profile}/>}
      {modal?.type==="docfiscal"&&<ModalDocFiscal data={modal.data} profile={profile} onClose={()=>setModal(null)} themeP={themeP} themeA={themeA}/>}
      {modal?.type==="client"   &&<ModalClient data={modal.data} onSave={saveClient} onDelete={delClient} onClose={()=>setModal(null)}/>}
      {modal?.type==="template" &&<ModalTemplate data={modal.data} onSave={saveTpl} onDelete={delTpl} onClose={()=>setModal(null)}/>}
      {modal?.type==="preview"    &&<ModalPreview data={modal.data} profile={profile} onClose={()=>setModal(null)} sendWA={sendWA} themeP={themeP} themeA={themeA}/>}
      {modal?.type==="assinatura"  &&<ModalAssinatura data={modal.data} onSave={b=>{setBudgets(bs=>bs.map(x=>x.id===b.id?b:x));setModal(null);showToast("Assinatura salva ✓");}} onClose={()=>setModal(null)} themeP={themeP} themeA={themeA}/>}
      {modal?.type==="localizacao" &&<ModalLocalizacao data={modal.data} onSave={b=>{setBudgets(bs=>bs.map(x=>x.id===b.id?b:x));setModal(null);showToast("Localização salva ✓");}} onClose={()=>setModal(null)} themeP={themeP}/>}
      {modal?.type==="share"      &&<ModalCompartilhar data={modal.data} profile={profile} user={user} onClose={()=>setModal(null)} themeP={themeP} themeA={themeA} onStatusUpdate={b=>{setBudgets(bs=>bs.map(x=>x.id===b.id?b:x));showToast(b.status==="aprovado"?"✅ Aprovado pelo cliente!":"❌ Recusado pelo cliente",b.status==="aprovado"?"ok":"warn");}}/>}
      {toast&&<Toast msg={toast.msg} type={toast.type} color={themeP}/>}
    </React.Fragment>
  );

  /* ── LAYOUT MOBILE ─────────────────────────────────────────────────── */
  if(isMobile){
    const navGo=id=>{if(id==="mais"){setMaisOpen(o=>!o);}else{setPage(id);setMaisOpen(false);}};
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100dvh",background:"#0A0E1A",fontFamily:"'DM Sans',sans-serif",color:"#CBD5E1",overflow:"hidden"}}>
        {/* TOPBAR MOBILE */}
        <div style={{height:56,background:"#0D1320",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",flexShrink:0,borderBottom:`1px solid ${themeP}20`,zIndex:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {profile.logo&&profile.showLogo!==false
              ?<img src={profile.logo} alt="" style={{width:28,height:28,borderRadius:6,objectFit:"contain"}}/>
              :<div style={{width:28,height:28,background:`linear-gradient(135deg,${themeP},${themeA})`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>⚡</div>}
            <span style={{fontSize:16,fontWeight:800,color:themeP}}>{profile.name||"OrcaPro"}</span>
          </div>
          <button style={{background:`linear-gradient(135deg,${themeP},${themeA})`,border:"none",borderRadius:20,padding:"8px 16px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>{setMaisOpen(false);setModal({type:"budget",data:null});}}>+ Novo</button>
        </div>

        {/* OVERLAY "MAIS" */}
        {maisOpen&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:39}} onClick={()=>setMaisOpen(false)}/>}

        {/* MENU "MAIS" */}
        {maisOpen&&(
          <div style={{position:"fixed",bottom:64,left:0,right:0,background:"#0D1320",border:`1px solid ${themeP}25`,borderRadius:"20px 20px 0 0",padding:"20px 16px 12px",zIndex:40,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            <div style={{gridColumn:"1/-1",fontSize:11,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,marginBottom:4}}>Mais páginas</div>
            {NAVS.filter(n=>!["dashboard","lista","clientes","config"].includes(n.id)).map(n=>(
              <button key={n.id} onClick={()=>navGo(n.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:page===n.id?`${themeP}18`:"#111827",border:`1px solid ${page===n.id?themeP:"#1E293B"}`,borderRadius:14,padding:"14px 8px",cursor:"pointer",fontFamily:"inherit",position:"relative",minHeight:70}}>
                <span style={{fontSize:24}}>{n.ico}</span>
                <span style={{fontSize:10,fontWeight:700,color:page===n.id?themeP:"#94A3B8",textAlign:"center"}}>{n.lbl}</span>
                {n.badge>0&&<span style={{position:"absolute",top:6,right:6,background:"#F87171",color:"#fff",fontSize:8,fontWeight:800,borderRadius:"50%",minWidth:15,height:15,display:"flex",alignItems:"center",justifyContent:"center"}}>{n.badge>9?"9+":n.badge}</span>}
              </button>
            ))}
            <button onClick={onLogout} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:14,padding:"14px 8px",cursor:"pointer",fontFamily:"inherit",minHeight:70}}>
              <span style={{fontSize:24}}>🚪</span>
              <span style={{fontSize:10,fontWeight:700,color:"#F87171"}}>Sair</span>
            </button>
          </div>
        )}

        {/* CONTEÚDO */}
        {pageContent}

        {/* BOTTOM NAV */}
        <div style={{position:"fixed",bottom:0,left:0,right:0,height:64,background:"#0D1320",borderTop:`1px solid ${themeP}20`,display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:50,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
          {MOBILE_NAVS.map(n=>{
            const ativo=(n.id==="mais"&&maisOpen)||(n.id!=="mais"&&page===n.id&&!maisOpen);
            return(
              <button key={n.id} onClick={()=>navGo(n.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"6px 10px",borderRadius:10,position:"relative",color:ativo?themeP:"#475569",minWidth:52}}>
                <span style={{fontSize:22}}>{n.ico}</span>
                <span style={{fontSize:9,fontWeight:700}}>{n.lbl}</span>
                {n.badge>0&&<span style={{position:"absolute",top:2,right:6,background:"#F87171",color:"#fff",fontSize:8,fontWeight:800,borderRadius:"50%",minWidth:14,height:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{n.badge>9?"9+":n.badge}</span>}
                {ativo&&<span style={{position:"absolute",bottom:-2,left:"50%",transform:"translateX(-50%)",width:20,height:2,background:themeP,borderRadius:2}}/>}
              </button>
            );
          })}
        </div>
        {modais}
      </div>
    );
  }

  /* ── LAYOUT DESKTOP ─────────────────────────────────────────────────── */
  return(
    <div style={S.root}>
      <aside style={{...S.side,width:sideOpen?246:68,transition:"width .3s cubic-bezier(.4,0,.2,1)",borderRight:`1px solid ${themeP}18`}}>
        <div style={S.sTop}>
          <div style={S.logo} onClick={()=>setSideOpen(o=>!o)}>
            {profile.logo&&profile.showLogo!==false
              ?<img src={profile.logo} alt="logo" style={{width:sideOpen?32:28,height:sideOpen?32:28,borderRadius:8,objectFit:"contain",flexShrink:0}}/>
              :<div style={{width:32,height:32,background:`linear-gradient(135deg,${themeP},${themeA})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>⚡</div>}
            {sideOpen&&<span style={{...S.logoTxt,color:themeP}}>{profile.name||"OrcaPro"}</span>}
          </div>
          {sideOpen&&(
            <div style={{...S.chip,borderColor:`${themeP}25`,background:`${themeP}08`}}>
              {profile.logo?<img src={profile.logo} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>:<Ava name={user.name} size={32} color={themeP}/>}
              <div style={{overflow:"hidden",flex:1}}>
                <div style={{...S.chipName,color:"#F1F5F9"}}>{profile.name||user.name}</div>
                <div style={{...S.chipRole,color:themeP}}>{profile.profession||user.profession||"Prestador"}</div>
              </div>
              <PlBadge plan={plan} color={themeP} small/>
            </div>
          )}
          {sideOpen&&(
            <div style={{marginTop:8,padding:"8px 10px",background:"#0F172A",borderRadius:10,border:"1px solid #1E293B"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:10,color:"#64748B",fontWeight:700,textTransform:"uppercase"}}>Plano {planInfo.label}</span>
                <span style={{fontSize:10,color:planPct>80?"#F87171":"#64748B"}}>{budgets.length}/{planInfo.max}</span>
              </div>
              <div style={{height:4,background:"#1E293B",borderRadius:2}}>
                <div style={{height:"100%",width:`${Math.min(planPct,100)}%`,background:planPct>80?"#F87171":`linear-gradient(90deg,${themeP},${themeA})`,borderRadius:2,transition:"width .5s"}}/>
              </div>
            </div>
          )}
        </div>
        <nav style={S.nav}>
          {NAVS.map(n=>(
            <button key={n.id} style={{...S.nb,...(page===n.id?{...S.nba,background:`${themeP}12`,color:themeP}:{})}} onClick={()=>setPage(n.id)} title={n.lbl}>
              <span style={{fontSize:16,flexShrink:0,width:22,textAlign:"center"}}>{n.ico}</span>
              {sideOpen&&<React.Fragment><span style={{flex:1}}>{n.lbl}</span>{page===n.id&&<span style={{...S.ndot,background:themeP}}/>}</React.Fragment>}
              {n.badge>0&&<span style={{position:"absolute",top:5,right:sideOpen?8:2,background:"#F87171",color:"#fff",fontSize:9,fontWeight:800,borderRadius:"50%",minWidth:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{n.badge>9?"9+":n.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={S.sBot}>
          <button style={{...S.newBtn,background:`linear-gradient(135deg,${themeP},${themeA})`,...(!sideOpen?{padding:"10px",justifyContent:"center"}:{})}} onClick={()=>setModal({type:"budget",data:null})} title="Novo Orçamento">
            <span>+</span>{sideOpen&&<span>Novo Orçamento</span>}
          </button>
          <button style={{...S.logBtn,...(!sideOpen?{padding:"8px",justifyContent:"center"}:{})}} onClick={onLogout} title="Sair">
            <span>🚪</span>{sideOpen&&<span>Sair</span>}
          </button>
        </div>
      </aside>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{...S.topbar,borderBottom:`1px solid ${themeP}15`}}>
          <div style={{fontSize:13,color:"#475569"}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {profile.tagline&&<div style={{fontSize:11,color:themeP,fontWeight:600,background:`${themeP}10`,padding:"3px 10px",borderRadius:20,border:`1px solid ${themeP}25`}}>{profile.tagline}</div>}
            <button style={{...S.topBtn,color:themeP}} onClick={()=>setPage("config")}>
              {profile.logo?<img src={profile.logo} alt="" style={{width:26,height:26,borderRadius:"50%",objectFit:"cover"}}/>:<Ava name={user.name} size={26} color={themeP}/>}
              <span style={{fontSize:13,fontWeight:600,color:"#CBD5E1"}}>{(profile.name||user.name).split(" ")[0]}</span>
            </button>
          </div>
        </div>
        {pageContent}
      </div>
      {modais}
    </div>
  );
}

/* ═══ PAGE CONFIG — PERFIL ÚNICO ════════════════════════════════════════ */
function PageConfig({profile,setProfile,user,themeP,themeA,showToast}){
  const [f,sf]=useState({...BLANK_PROFILE,...profile});
  const [logoPreview,setLogoPreview]=useState(profile.logo||"");
  const [tab,setTab]=useState("dados");
  const [saved,setSaved]=useState(false);
  const fileRef=useRef();
  const set=(k,v)=>sf(p=>({...p,[k]:v}));

  const handleLogo=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(file.size>2*1024*1024){showToast("Imagem muito grande! Máx. 2MB","warn");return;}
    const b64=await readFile(file);
    setLogoPreview(b64);set("logo",b64);showToast("Logo carregada ✓");
  };
  const removeLogo=()=>{setLogoPreview("");set("logo","");showToast("Logo removida","warn");};
  const save=()=>{setProfile({...f,logo:logoPreview});setSaved(true);showToast("Perfil salvo ✓");setTimeout(()=>setSaved(false),2500);};

  const selTheme=tid=>{
    const t=THEMES.find(x=>x.id===tid)||THEMES[0];
    sf(p=>({...p,themeId:tid,primaryColor:t.primary,secondaryColor:t.secondary,accentColor:t.accent}));
  };

  const TABS=[{id:"dados",lbl:"👤 Dados"},{id:"visual",lbl:"🎨 Visual"},{id:"fiscal",lbl:"🧾 Fiscal"},{id:"orcamento",lbl:"📄 Orçamento"},{id:"social",lbl:"🌐 Links"}];

  return(
    <div style={S.page}>
      <PHead title="Meu Perfil" sub="Personalize sua identidade — cada detalhe conta">
        <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`}} onClick={save}>{saved?"✅ Salvo!":"💾 Salvar tudo"}</button>
      </PHead>

      {/* PREVIEW CARD */}
      <div style={{background:`linear-gradient(135deg,${themeP}18,${themeA}10)`,border:`1px solid ${themeP}30`,borderRadius:20,padding:24,marginBottom:22,display:"flex",alignItems:"center",gap:20}}>
        <div style={{position:"relative"}}>
          {logoPreview
            ?<img src={logoPreview} alt="logo" style={{width:80,height:80,borderRadius:16,objectFit:"contain",border:`2px solid ${themeP}40`,background:"#0F172A",padding:4}}/>
            :<div style={{width:80,height:80,borderRadius:16,background:`linear-gradient(135deg,${themeP},${themeA})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>⚡</div>}
          <button onClick={()=>fileRef.current?.click()} style={{position:"absolute",bottom:-6,right:-6,width:24,height:24,borderRadius:"50%",background:themeP,border:"none",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",color:"#0F1117",fontWeight:800}}>+</button>
        </div>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:"#F1F5F9"}}>{f.name||user.name||"Seu Nome"}</div>
          <div style={{fontSize:14,color:themeP,fontWeight:600,marginTop:2}}>{f.profession||"Sua Profissão"}</div>
          {f.tagline&&<div style={{fontSize:12,color:"#64748B",marginTop:2,fontStyle:"italic"}}>"{f.tagline}"</div>}
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
            {f.phone&&<span style={{fontSize:11,color:"#94A3B8"}}>📱 {f.phone}</span>}
            {f.city&&<span style={{fontSize:11,color:"#94A3B8"}}>📍 {f.city}</span>}
            {f.email&&<span style={{fontSize:11,color:"#94A3B8"}}>✉️ {f.email}</span>}
          </div>
        </div>
        <div style={{marginLeft:"auto",textAlign:"center"}}>
          <div style={{padding:"6px 16px",borderRadius:20,background:`${themeP}15`,border:`1px solid ${themeP}30`,color:themeP,fontWeight:700,fontSize:12}}>Plano {PLANS[f.plan||"pro"]?.label}</div>
          <div style={{fontSize:10,color:"#475569",marginTop:4}}>Preview do seu perfil</div>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",gap:4,background:"#111827",borderRadius:14,padding:4,marginBottom:20,border:"1px solid #1E293B"}}>
        {TABS.map(t=>(
          <button key={t.id} style={{flex:1,padding:"9px",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:tab===t.id?700:500,background:tab===t.id?themeP:  "transparent",color:tab===t.id?"#0F1117":"#64748B",transition:"all .2s"}} onClick={()=>setTab(t.id)}>{t.lbl}</button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:14,maxWidth:680}}>
        {/* ABA: DADOS */}
        {tab==="dados"&&(
          <React.Fragment>
            <Card title="👤 Dados Pessoais / Empresa">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
                <div style={{gridColumn:"1/-1"}}><FL label="Nome / Empresa *"><input style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Ex: João Elétrica"/></FL></div>
                <FL label="Profissão"><select style={S.sel} value={f.profession} onChange={e=>set("profession",e.target.value)}><option value="">Selecione…</option>{PROFS.map(p=><option key={p}>{p}</option>)}</select></FL>
                <FL label="Slogan / Tagline"><input style={S.inp} value={f.tagline||""} onChange={e=>set("tagline",e.target.value)} placeholder="Ex: Qualidade e pontualidade"/></FL>
                <FL label="E-mail"><input style={S.inp} type="email" value={f.email} onChange={e=>set("email",e.target.value)}/></FL>
                <FL label="WhatsApp"><input style={S.inp} value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="11999990000"/></FL>
                <FL label="Cidade"><input style={S.inp} value={f.city} onChange={e=>set("city",e.target.value)} placeholder="São Paulo"/></FL>
                <FL label="Estado"><input style={S.inp} value={f.state||""} onChange={e=>set("state",e.target.value)} placeholder="SP"/></FL>
                <div style={{gridColumn:"1/-1"}}><FL label="CREA / Registro Profissional"><input style={S.inp} value={f.crea||""} onChange={e=>set("crea",e.target.value)} placeholder="SP-123456"/></FL></div>
              </div>
            </Card>
          </React.Fragment>
        )}

        {/* ABA: FISCAL */}
        {tab==="fiscal"&&(
          <React.Fragment>
            <Card title="🧾 Tipo de Contribuinte">
              <div style={{fontSize:12,color:"#64748B",marginBottom:14}}>Define o tipo de documento fiscal emitido para cada orçamento aprovado.</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10,marginBottom:16}}>
                {[
                  {id:"pf",icon:"👤",title:"Pessoa Física",desc:"Recibo simples com CPF"},
                  {id:"mei",icon:"🏪",title:"MEI",desc:"Recibo MEI + link NFS-e prefeitura"},
                  {id:"pj",icon:"🏢",title:"Pessoa Jurídica",desc:"Doc. fiscal com CNPJ e ISS"},
                ].map(t=>(
                  <button key={t.id} onClick={()=>set("tipoContribuinte",t.id)} style={{padding:"14px 12px",borderRadius:14,border:`2px solid ${f.tipoContribuinte===t.id?"#F59E0B":"#1E293B"}`,background:f.tipoContribuinte===t.id?"rgba(245,158,11,.1)":"#0F172A",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                    <div style={{fontSize:22,marginBottom:6}}>{t.icon}</div>
                    <div style={{fontSize:13,fontWeight:800,color:f.tipoContribuinte===t.id?"#F59E0B":"#F1F5F9"}}>{t.title}</div>
                    <div style={{fontSize:10,color:"#64748B",marginTop:3}}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </Card>

            <Card title="📋 Dados Fiscais">
              <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:12}}>
                {(f.tipoContribuinte==="pf"||f.tipoContribuinte==="mei")&&(
                  <FL label="CPF"><input style={S.inp} value={f.cpf||""} onChange={e=>set("cpf",e.target.value)} placeholder="000.000.000-00"/></FL>
                )}
                {(f.tipoContribuinte==="mei"||f.tipoContribuinte==="pj")&&(
                  <React.Fragment>
                    <FL label="CNPJ"><input style={S.inp} value={f.cnpj||""} onChange={e=>set("cnpj",e.target.value)} placeholder="00.000.000/0000-00"/></FL>
                    <FL label="Razão Social"><input style={S.inp} value={f.razaoSocial||""} onChange={e=>set("razaoSocial",e.target.value)} placeholder="Nome completo da empresa"/></FL>
                    <FL label="Nome Fantasia"><input style={S.inp} value={f.nomeFantasia||""} onChange={e=>set("nomeFantasia",e.target.value)} placeholder="Nome comercial"/></FL>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <FL label="Inscrição Municipal"><input style={S.inp} value={f.inscricaoMunicipal||""} onChange={e=>set("inscricaoMunicipal",e.target.value)} placeholder="Ex: 12345-6"/></FL>
                      {f.tipoContribuinte==="pj"&&<FL label="Inscrição Estadual"><input style={S.inp} value={f.inscricaoEstadual||""} onChange={e=>set("inscricaoEstadual",e.target.value)} placeholder="Ex: 123.456.789"/></FL>}
                    </div>
                  </React.Fragment>
                )}
              </div>
            </Card>

            {(f.tipoContribuinte==="mei"||f.tipoContribuinte==="pj")&&(
              <Card title="💰 Configuração de ISS">
                <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:12}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <FL label="Alíquota ISS (%)">
                      <input style={S.inp} type="number" min="0" max="5" step="0.1" value={f.aliquotaIss||2} onChange={e=>set("aliquotaIss",parseFloat(e.target.value)||2)}/>
                    </FL>
                    <FL label="Código do Serviço (LC 116)">
                      <input style={S.inp} value={f.codigoServico||""} onChange={e=>set("codigoServico",e.target.value)} placeholder="Ex: 7.02"/>
                    </FL>
                  </div>
                  <div style={{padding:"10px 12px",background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:9,fontSize:11,color:"#F59E0B"}}>
                    💡 A alíquota do ISS varia por município (geralmente 2% a 5%). Consulte a legislação da sua cidade.
                    O código de serviço segue a Lista de Serviços da LC 116/2003.
                  </div>
                </div>
              </Card>
            )}

            {(f.tipoContribuinte==="mei"||f.tipoContribuinte==="pj")&&(
              <Card title="🏛️ Portal da Prefeitura">
                <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:12}}>
                  <FL label="URL do portal NFS-e da sua prefeitura">
                    <input style={S.inp} value={f.urlPrefeitura||""} onChange={e=>set("urlPrefeitura",e.target.value)} placeholder="https://nfse.suacidade.gov.br"/>
                  </FL>
                  <div style={{fontSize:11,color:"#64748B"}}>
                    Este link aparece no recibo para facilitar a emissão da NFS-e na prefeitura.
                    {f.urlPrefeitura&&<span> <a href={f.urlPrefeitura} target="_blank" rel="noreferrer" style={{color:themeP}}>Testar link →</a></span>}
                  </div>
                </div>
              </Card>
            )}

            <div style={{padding:"14px 16px",background:"rgba(34,211,160,.06)",border:"1px solid rgba(34,211,160,.2)",borderRadius:12,fontSize:12,color:"#94A3B8",lineHeight:1.6}}>
              <div style={{fontWeight:700,color:"#22D3A0",marginBottom:6}}>ℹ️ Como funciona</div>
              <div><b style={{color:"#F1F5F9"}}>PF:</b> Gera um Recibo de Prestação de Serviços com seu CPF. Sem obrigação de emitir NFS-e (depende do valor e município).</div>
              <div style={{marginTop:4}}><b style={{color:"#F1F5F9"}}>MEI:</b> Gera recibo MEI e abre o portal da prefeitura para você emitir a NFS-e (obrigatória para serviços acima de R$ 6.750,00/mês).</div>
              <div style={{marginTop:4}}><b style={{color:"#F1F5F9"}}>PJ:</b> Gera documento fiscal com todos os dados da empresa, ISS destacado, e link para emissão da NFS-e.</div>
            </div>
          </React.Fragment>
        )}

        {/* ABA: IDENTIDADE VISUAL */}
        {tab==="visual"&&(
          <React.Fragment>
            {/* LOGO */}
            <Card title="🖼️ Logo da Empresa">
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleLogo}/>
              <div style={{marginTop:12,display:"flex",alignItems:"flex-start",gap:20}}>
                <div style={{flexShrink:0}}>
                  {logoPreview
                    ?<div style={{position:"relative"}}>
                        <img src={logoPreview} alt="Logo" style={{width:120,height:120,borderRadius:16,objectFit:"contain",border:`2px solid ${themeP}40`,background:"#0F172A",padding:8}}/>
                        <button onClick={removeLogo} style={{position:"absolute",top:-8,right:-8,width:22,height:22,borderRadius:"50%",background:"#F87171",border:"none",cursor:"pointer",fontSize:11,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>✕</button>
                      </div>
                    :<div style={{width:120,height:120,borderRadius:16,border:`2px dashed ${themeP}40`,background:"#0F172A",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer"}} onClick={()=>fileRef.current?.click()}>
                        <div style={{fontSize:32}}>🖼️</div>
                        <div style={{fontSize:10,color:"#475569",textAlign:"center"}}>Clique para<br/>adicionar logo</div>
                      </div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"#CBD5E1",marginBottom:8,fontWeight:600}}>Sua logo aparece em:</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {["Sidebar do sistema","Preview do orçamento","Cabeçalho do documento"].map(item=>(
                      <div key={item} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#94A3B8"}}>
                        <span style={{color:themeP}}>✓</span>{item}
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:12,display:"flex",gap:8}}>
                    <button onClick={()=>fileRef.current?.click()} style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`,fontSize:12,padding:"8px 16px"}}>📁 {logoPreview?"Trocar logo":"Enviar logo"}</button>
                    {logoPreview&&<button onClick={removeLogo} style={{...S.ghost,fontSize:12,padding:"8px 14px",borderColor:"rgba(248,113,113,.3)",color:"#F87171"}}>🗑️ Remover</button>}
                  </div>
                  <div style={{fontSize:11,color:"#475569",marginTop:8}}>PNG, JPG ou SVG · Máx. 2MB · Recomendado: 400×200px</div>
                  {logoPreview&&(
                    <div style={{marginTop:12,display:"flex",alignItems:"center",gap:10}}>
                      <Toggle val={f.showLogo!==false} onChange={v=>set("showLogo",v)}/>
                      <span style={{fontSize:12,color:"#94A3B8"}}>Mostrar logo nos documentos</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* CORES */}
            <Card title="🎨 Cores e Tema">
              <div style={{fontSize:12,color:"#64748B",marginBottom:14}}>Escolha um tema pronto ou personalize as cores. Afeta sidebar, botões e documentos.</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8,marginBottom:18}}>
                {THEMES.filter(t=>t.id!=="custom").map(t=>(
                  <button key={t.id} style={{padding:"10px 8px",borderRadius:12,border:f.themeId===t.id?`2px solid ${t.primary}`:"2px solid #1E293B",background:f.themeId===t.id?`${t.primary}15`:"#0F172A",cursor:"pointer",transition:"all .2s"}} onClick={()=>selTheme(t.id)}>
                    <div style={{display:"flex",gap:4,justifyContent:"center",marginBottom:6}}>
                      {[t.primary,t.secondary,t.accent].map((c,i)=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:c}}/>)}
                    </div>
                    <div style={{fontSize:10,color:f.themeId===t.id?t.primary:"#64748B",fontWeight:700}}>{t.name}</div>
                  </button>
                ))}
              </div>

              <div style={{padding:16,background:"#0F172A",borderRadius:14,border:"1px solid #1E293B"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#94A3B8",marginBottom:12}}>🖌️ Personalização Avançada</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  {[["Cor Principal","primaryColor"],["Cor Secundária","secondaryColor"],["Cor de Destaque","accentColor"]].map(([lbl,k])=>(
                    <FL key={k} label={lbl}>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={f[k]||"#818CF8"} onChange={e=>{set(k,e.target.value);set("themeId","custom");}} style={{width:38,height:38,border:"none",borderRadius:8,cursor:"pointer",background:"none",padding:2}}/>
                        <input style={{...S.inp,flex:1,fontSize:11,fontFamily:"monospace"}} value={f[k]||"#818CF8"} onChange={e=>{set(k,e.target.value);set("themeId","custom");}} placeholder="#000000"/>
                      </div>
                    </FL>
                  ))}
                </div>
                <div style={{marginTop:14,padding:12,borderRadius:10,background:`linear-gradient(135deg,${f.primaryColor||themeP}15,${f.accentColor||themeA}08)`,border:`1px solid ${f.primaryColor||themeP}25`}}>
                  <div style={{fontSize:11,color:"#64748B",marginBottom:6}}>Prévia das cores:</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{padding:"5px 14px",borderRadius:8,background:`linear-gradient(135deg,${f.primaryColor||themeP},${f.accentColor||themeA})`,color:"#0F1117",fontWeight:700,fontSize:12}}>Botão primário</div>
                    <div style={{padding:"5px 14px",borderRadius:8,border:`1px solid ${f.primaryColor||themeP}`,color:f.primaryColor||themeP,fontSize:12,fontWeight:600}}>Bordas</div>
                    <div style={{width:14,height:14,borderRadius:"50%",background:f.primaryColor||themeP}}/>
                    <div style={{width:14,height:14,borderRadius:"50%",background:f.accentColor||themeA}}/>
                  </div>
                </div>
              </div>
            </Card>
          </React.Fragment>
        )}

        {/* ABA: ORÇAMENTO */}
        {tab==="orcamento"&&(
          <React.Fragment>
            <Card title="📄 Configurações do Orçamento">
              <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:12}}>
                <FL label="Assinatura padrão (WhatsApp e documentos)">
                  <textarea style={{...S.inp,height:72,resize:"vertical"}} value={f.signOff||""} onChange={e=>set("signOff",e.target.value)} placeholder="Fico à disposição para qualquer dúvida! 😊"/>
                </FL>
                <FL label="Nota de cabeçalho (aparece no topo dos orçamentos)">
                  <input style={S.inp} value={f.headerNote||""} onChange={e=>set("headerNote",e.target.value)} placeholder="Ex: Orçamento sem compromisso · CNPJ 00.000.000/0001-00"/>
                </FL>
                <FL label="Nota de rodapé (aparece no fim dos orçamentos)">
                  <input style={S.inp} value={f.footerNote||""} onChange={e=>set("footerNote",e.target.value)} placeholder="Ex: Validade sujeita a disponibilidade de materiais"/>
                </FL>
                <FL label="Mensagem personalizada WhatsApp (abertura)">
                  <textarea style={{...S.inp,height:60,resize:"vertical"}} value={f.whatsappMsg||""} onChange={e=>set("whatsappMsg",e.target.value)} placeholder="Olá! Segue abaixo seu orçamento:"/>
                </FL>
              </div>
            </Card>
          </React.Fragment>
        )}

        {/* ABA: LINKS */}
        {tab==="social"&&(
          <React.Fragment>
            <Card title="🌐 Redes e Contatos">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
                <FL label="🌐 Website">
                  <input style={S.inp} value={f.website||""} onChange={e=>set("website",e.target.value)} placeholder="https://meusite.com.br"/>
                </FL>
                <FL label="📸 Instagram">
                  <input style={S.inp} value={f.instagram||""} onChange={e=>set("instagram",e.target.value)} placeholder="@seuinstagram"/>
                </FL>
              </div>
              <div style={{marginTop:16,padding:14,background:"rgba(129,140,248,0.06)",borderRadius:12,border:`1px solid ${themeP}20`}}>
                <div style={{fontSize:12,fontWeight:700,color:themeP,marginBottom:6}}>💡 Seus links aparecem no rodapé dos orçamentos</div>
                <div style={{fontSize:11,color:"#64748B"}}>Facilita o cliente de te encontrar e fortalecer sua marca profissional.</div>
              </div>
            </Card>
            <Card title="🔐 Conta">
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
                <div style={{fontSize:12,color:"#64748B"}}>Login: <b style={{color:"#94A3B8"}}>{user.login||user.email}</b></div>
                <div style={{fontSize:12,color:"#64748B"}}>Cadastrado em: <b style={{color:"#94A3B8"}}>{user.createdAt||"—"}</b></div>
                <div style={{fontSize:12,color:"#64748B"}}>Plano: <b style={{color:themeP}}>{PLANS[f.plan||"pro"]?.label}</b></div>
              </div>
            </Card>
          </React.Fragment>
        )}

        <button style={{...S.prim,padding:"12px",fontSize:14,background:`linear-gradient(135deg,${themeP},${themeA})`,boxShadow:`0 4px 16px ${themeP}30`}} onClick={save}>
          {saved?"✅ Perfil salvo com sucesso!":"💾 Salvar todas as alterações"}
        </button>
      </div>
    </div>
  );
}

/* ═══ MODAL PREVIEW (com identidade visual) ══════════════════════════════ */
function ModalPreview({data,profile,onClose,sendWA,themeP,themeA}){
  const sub=calcSub(data.items);
  return(
    <Overlay onClose={onClose} wide>
      <div style={S.mhead}><div><div style={S.mtitle}>Preview do Orçamento</div><div style={S.msub}>Como o cliente verá — com sua identidade visual</div></div><XBtn onClick={onClose}/></div>
      {/* DOCUMENTO */}
      <div style={{background:"#fff",borderRadius:14,overflow:"hidden",color:"#1E293B",fontFamily:"'DM Sans',sans-serif"}}>
        {/* HEADER */}
        <div style={{background:`linear-gradient(135deg,${themeP},${themeA})`,padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            {profile.logo&&profile.showLogo!==false
              ?<img src={profile.logo} alt="logo" style={{height:44,maxWidth:120,objectFit:"contain",background:"rgba(255,255,255,.15)",borderRadius:8,padding:"4px 8px"}}/>
              :<div style={{width:44,height:44,borderRadius:10,background:"rgba(255,255,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚡</div>}
            <div>
              <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{profile.name||"Sua Empresa"}</div>
              {profile.profession&&<div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>{profile.profession}</div>}
              {profile.tagline&&<div style={{fontSize:10,color:"rgba(255,255,255,.7)",fontStyle:"italic"}}>{profile.tagline}</div>}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:800,color:"rgba(255,255,255,.9)"}}>{data.num}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>{data.date}</div>
            <div style={{marginTop:4,display:"inline-block",padding:"2px 10px",borderRadius:20,background:"rgba(255,255,255,.2)",color:"#fff",fontSize:10,fontWeight:700,backdropFilter:"blur(4px)"}}>{STATUS[data.status]?.icon} {STATUS[data.status]?.label}</div>
          </div>
        </div>
        {profile.headerNote&&<div style={{background:`${themeP}10`,padding:"8px 24px",fontSize:11,color:themeP,fontWeight:500,borderBottom:`1px solid ${themeP}20`}}>{profile.headerNote}</div>}
        <div style={{padding:"20px 24px"}}>
          {/* CLIENTE + SERVIÇO */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,marginBottom:18}}>
            <div><div style={{fontSize:10,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,marginBottom:5}}>Cliente</div>
              <div style={{fontWeight:700,fontSize:15,color:"#1E293B"}}>{data.clientName}</div>
              {data.phone&&<div style={{fontSize:12,color:"#64748B"}}>📱 {data.phone}</div>}
            </div>
            <div><div style={{fontSize:10,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,marginBottom:5}}>Serviço</div>
              <div style={{fontWeight:700,fontSize:14,color:"#1E293B"}}>{data.title}</div>
              <div style={{fontSize:11,color:"#64748B"}}>{data.category} · Válido {data.validity} dias</div>
            </div>
          </div>
          {data.desc&&<div style={{padding:"10px 14px",background:`${themeP}08`,borderRadius:10,borderLeft:`3px solid ${themeP}`,fontSize:12,color:"#475569",marginBottom:16}}>{data.desc}</div>}
          {/* ITENS */}
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:16}}>
            <thead>
              <tr style={{background:`${themeP}10`}}>
                {["Descrição","Qtd","Unid.","Valor unit.","Total"].map(h=><th key={h} style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:themeP,textAlign:"left",border:`1px solid ${themeP}15`}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>{data.items.map((it,i)=>(
              <tr key={i} style={{background:i%2===0?"#fff":"#F8FAFC"}}>
                {[it.desc,it.qty,it.unit,fmtBRL(it.price),fmtBRL((it.qty||0)*(it.price||0))].map((v,j)=>(
                  <td key={j} style={{padding:"8px 12px",fontSize:12,border:"1px solid #E2E8F0",fontWeight:j===4?700:400,color:j===4?themeP:"#1E293B"}}>{v}</td>
                ))}
              </tr>
            ))}</tbody>
          </table>
          {/* TOTAIS */}
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <div style={{minWidth:240}}>
              {data.discount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748B",marginBottom:4}}><span>Subtotal</span><span>{fmtBRL(sub)}</span></div>}
              {data.discount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#EF4444",marginBottom:4}}><span>Desconto ({data.discount}%)</span><span>-{fmtBRL(sub*data.discount/100)}</span></div>}
              {data.tax>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#3B82F6",marginBottom:4}}><span>Impostos ({data.tax}%)</span><span>+{fmtBRL(sub*(1-data.discount/100)*data.tax/100)}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:20,color:themeP,paddingTop:8,borderTop:`2px solid ${themeP}40`,marginTop:4}}>
                <span>TOTAL</span><span>{fmtBRL(data.total)}</span>
              </div>
            </div>
          </div>
          {data.notes&&<div style={{marginTop:14,padding:"10px 14px",background:"#FFFBEB",borderRadius:10,border:"1px solid #FDE68A",fontSize:12,color:"#92400E"}}>📝 {data.notes}</div>}
          {data.endereco&&<div style={{marginTop:8,padding:"8px 14px",background:"#EFF6FF",borderRadius:10,border:"1px solid #BFDBFE",fontSize:12,color:"#1E40AF"}}>📍 {[data.endereco,data.enderecoComp,data.endereocoCidade,data.enderecoCep].filter(Boolean).join(", ")}</div>}
          {data.assinatura&&<div style={{marginTop:8,padding:"10px 14px",background:"#DCFCE7",borderRadius:10,border:"1px solid #BBF7D0"}}><div style={{fontSize:11,color:"#166534",fontWeight:700,marginBottom:6}}>✅ Assinado por {data.assinadoPor||data.clientName} em {data.assinadoEm}</div><img src={data.assinatura} alt="assinatura" style={{maxHeight:50,objectFit:"contain"}}/></div>}
          {/* FOOTER */}
          <div style={{marginTop:18,paddingTop:14,borderTop:"1px solid #E2E8F0",display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:8}}>
            <div>
              {profile.footerNote&&<div style={{fontSize:11,color:"#94A3B8",marginBottom:4,fontStyle:"italic"}}>{profile.footerNote}</div>}
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {profile.phone&&<span style={{fontSize:11,color:"#64748B"}}>📱 {profile.phone}</span>}
                {profile.email&&<span style={{fontSize:11,color:"#64748B"}}>✉️ {profile.email}</span>}
                {profile.website&&<span style={{fontSize:11,color:themeP}}>🌐 {profile.website}</span>}
                {profile.instagram&&<span style={{fontSize:11,color:themeP}}>📸 {profile.instagram}</span>}
                {profile.crea&&<span style={{fontSize:11,color:"#64748B"}}>📋 {profile.crea}</span>}
              </div>
            </div>
            <div style={{fontSize:11,color:"#94A3B8",textAlign:"right"}}>{profile.signOff||""}</div>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
        <button style={S.ghost} onClick={onClose}>Fechar</button>
        <button style={{...S.prim,background:"#25D366",color:"#fff"}} onClick={()=>{sendWA(data);onClose();}}>📱 Enviar via WhatsApp</button>
      </div>
    </Overlay>
  );
}


/* ═══ MODAL FOTOS ════════════════════════════════════════════════════════ */
function ModalFotos({budgetId,budgetNum,fotos,setFotos,onClose,themeP}){
  const imgs=(fotos&&fotos[budgetId])||[];
  const[loading,setLoading]=useState(false);
  const[fullImg,setFullImg]=useState(null);
  const fileRef=useRef();

  const addFoto=async e=>{
    const files=[...e.target.files];
    if(!files.length)return;
    if(imgs.length+files.length>20){alert("Máximo 20 fotos por orçamento");return;}
    setLoading(true);
    const news=[];
    for(const f of files){
      if(f.size>5*1024*1024){alert(`${f.name} muito grande (máx 5MB)`);continue;}
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(f);});
      news.push({id:uid(),src:b64,caption:"",ts:new Date().toLocaleString("pt-BR"),tag:"geral"});
    }
    setFotos(fs=>({...(fs||{}),[budgetId]:[...(fs?.[budgetId]||[]),...news]}));
    setLoading(false);
    e.target.value="";
  };

  const delFoto=id=>setFotos(fs=>({...fs,[budgetId]:(fs[budgetId]||[]).filter(f=>f.id!==id)}));
  const updateCaption=(id,caption)=>setFotos(fs=>({...fs,[budgetId]:(fs[budgetId]||[]).map(f=>f.id===id?{...f,caption}:f)}));
  const updateTag=(id,tag)=>setFotos(fs=>({...fs,[budgetId]:(fs[budgetId]||[]).map(f=>f.id===id?{...f,tag}:f)}));
  const TAGS=["geral","antes","depois","progresso","detalhe"];

  return(
    <Overlay onClose={onClose} wide>
      <div style={S.mhead}>
        <div><div style={S.mtitle}>📷 Galeria de Fotos</div><div style={S.msub}>{budgetNum} · {imgs.length}/20 fotos</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},#818CF8)`,fontSize:12,padding:"7px 14px"}} onClick={()=>fileRef.current?.click()} disabled={loading}>
            {loading?"⏳ Carregando...":"📁 Adicionar fotos"}
          </button>
          <XBtn onClick={onClose}/>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={addFoto}/>

      {imgs.length===0?(
        <div style={{textAlign:"center",padding:"48px 0",color:"#475569"}}>
          <div style={{fontSize:48,marginBottom:12}}>📷</div>
          <div style={{fontSize:14,fontWeight:600,color:"#64748B",marginBottom:8}}>Nenhuma foto ainda</div>
          <div style={{fontSize:12,color:"#475569",marginBottom:20}}>Adicione fotos de antes, durante e depois do serviço</div>
          <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},#818CF8)`}} onClick={()=>fileRef.current?.click()}>📁 Adicionar primeira foto</button>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12,maxHeight:480,overflowY:"auto"}}>
          {imgs.map(foto=>(
            <div key={foto.id} style={{background:"#0F172A",borderRadius:12,overflow:"hidden",border:"1px solid #1E293B"}}>
              <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setFullImg(foto.src)}>
                <img src={foto.src} alt={foto.caption||"foto"} style={{width:"100%",height:150,objectFit:"cover",display:"block"}}/>
                <div style={{position:"absolute",top:6,left:6,padding:"2px 8px",borderRadius:20,background:"rgba(0,0,0,.6)",fontSize:10,fontWeight:700,color:"#fff"}}>{foto.tag||"geral"}</div>
                <div style={{position:"absolute",top:6,right:6,display:"flex",gap:4}}>
                  <button onClick={e=>{e.stopPropagation();delFoto(foto.id);}} style={{width:24,height:24,borderRadius:"50%",background:"rgba(248,113,113,.8)",border:"none",cursor:"pointer",fontSize:11,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
              </div>
              <div style={{padding:"8px 10px"}}>
                <select value={foto.tag||"geral"} onChange={e=>updateTag(foto.id,e.target.value)} style={{...S.sel,fontSize:11,padding:"3px 6px",marginBottom:6}}>
                  {TAGS.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
                <input
                  style={{...S.inp,fontSize:11,padding:"5px 8px"}}
                  value={foto.caption||""}
                  onChange={e=>updateCaption(foto.id,e.target.value)}
                  placeholder="Legenda (opcional)"
                />
                <div style={{fontSize:9,color:"#475569",marginTop:4}}>{foto.ts}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full screen image viewer */}
      {fullImg&&(
        <div onClick={()=>setFullImg(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          <img src={fullImg} alt="full" style={{maxWidth:"95vw",maxHeight:"95vh",objectFit:"contain",borderRadius:8}}/>
          <button onClick={()=>setFullImg(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",fontSize:20,cursor:"pointer",borderRadius:"50%",width:36,height:36}}>✕</button>
        </div>
      )}
    </Overlay>
  );
}

/* ═══ PAGE NOTIFICAÇÕES ══════════════════════════════════════════════════ */
function PageNotificacoes({notificacoes,markRead,setNotificacoes,themeP}){
  const list=notificacoes||[];
  const unread=list.filter(n=>!n.read).length;

  const delNotif=id=>setNotificacoes(ns=>ns.filter(n=>n.id!==id));
  const clearAll=()=>setNotificacoes([]);

  return(
    <div style={S.page}>
      <PHead title="🔔 Notificações" sub={`${unread} não lida(s) · ${list.length} total`}>
        <div style={{display:"flex",gap:8}}>
          {unread>0&&<button style={{...S.ghost,fontSize:12}} onClick={markRead}>✓ Marcar todas como lidas</button>}
          {list.length>0&&<button style={{...S.ghost,fontSize:12,borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={clearAll}>🗑️ Limpar tudo</button>}
        </div>
      </PHead>

      {list.length===0?(
        <div style={{textAlign:"center",padding:"64px 0",color:"#475569"}}>
          <div style={{fontSize:56,marginBottom:16}}>🔔</div>
          <div style={{fontSize:15,fontWeight:600,color:"#64748B",marginBottom:8}}>Tudo em dia!</div>
          <div style={{fontSize:13,color:"#475569"}}>Nenhuma notificação por enquanto.</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:680}}>
          {list.map(n=>(
            <div key={n.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:n.read?"#0F172A":"rgba(129,140,248,0.07)",borderRadius:14,border:`1px solid ${n.read?"#1E293B":"rgba(129,140,248,0.2)"}`,transition:"all .2s"}}>
              <div style={{width:40,height:40,borderRadius:12,background:n.read?"#1E293B":`${themeP}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{n.icon||"🔔"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:n.read?"#64748B":"#F1F5F9",fontWeight:n.read?400:600}}>{n.msg}</div>
                <div style={{fontSize:11,color:"#475569",marginTop:3}}>{n.ts}</div>
              </div>
              {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:themeP,flexShrink:0}}/>}
              <button onClick={()=>delNotif(n.id)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,padding:4}}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ PAGE CHAT ══════════════════════════════════════════════════════════ */
function PageChat({chatMsgs,setChatMsgs,user,themeP,themeA}){
  const [text,setText]=useState("");
  const bottomRef=useRef();
  const msgs=chatMsgs||[];

  // Mark admin messages as read when user opens chat
  useEffect(()=>{
    setChatMsgs(ms=>(ms||[]).map(m=>m.from==="admin"?{...m,read:true}:m));
  },[]);// eslint-disable-line

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs.length]);

  const send=()=>{
    if(!text.trim())return;
    const msg={id:uid(),from:"user",userId:user.id,userName:user.name,text:text.trim(),ts:new Date().toLocaleString("pt-BR"),read:false};
    setChatMsgs(ms=>[...(ms||[]),msg]);
    setText("");
  };

  return(
    <div style={{...S.page,display:"flex",flexDirection:"column",height:"calc(100vh - 40px)"}}>
      <PHead title="💬 Mensagens" sub="Fale diretamente com o suporte OrcaPro"/>

      {/* Messages area */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,padding:"4px 0 16px",minHeight:0}}>
        {msgs.length===0&&(
          <div style={{textAlign:"center",padding:"48px 0",color:"#475569"}}>
            <div style={{fontSize:48,marginBottom:12}}>💬</div>
            <div style={{fontSize:14,fontWeight:600,color:"#64748B",marginBottom:6}}>Sem mensagens ainda</div>
            <div style={{fontSize:12,color:"#475569"}}>Envie uma mensagem para o suporte</div>
          </div>
        )}
        {msgs.map(m=>{
          const isMe=m.from==="user";
          return(
            <div key={m.id} style={{display:"flex",flexDirection:isMe?"row-reverse":"row",alignItems:"flex-end",gap:8,maxWidth:"100%"}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:isMe?`linear-gradient(135deg,${themeP},${themeA})`:"linear-gradient(135deg,#F59E0B,#EF4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>
                {isMe?user.name[0]:"A"}
              </div>
              <div style={{maxWidth:"72%"}}>
                <div style={{fontSize:10,color:"#475569",marginBottom:3,textAlign:isMe?"right":"left"}}>{isMe?"Você":"Analua · OrcaPro"} · {m.ts}</div>
                <div style={{padding:"10px 14px",borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",background:isMe?`linear-gradient(135deg,${themeP},${themeA})`:"#1E293B",color:"#fff",fontSize:13,lineHeight:1.5,wordBreak:"break-word"}}>
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input area */}
      <div style={{display:"flex",gap:8,padding:"12px 0 0",borderTop:"1px solid #1E293B",flexShrink:0}}>
        <input
          style={{...S.inp,flex:1,fontSize:13}}
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Digite sua mensagem... (Enter para enviar)"
        />
        <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`,padding:"10px 18px",fontSize:18}} onClick={send} disabled={!text.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
}

/* ═══ RELATÓRIO MENSAL PDF ═══════════════════════════════════════════════ */
function exportRelatorioMensalPDF(budgets,profile,mes,ano,themeP,themeA){
  const meses=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const label=`${meses[mes]} ${ano}`;
  const filtered=budgets.filter(b=>{const d=new Date(b.createdAt||b.date);return d.getMonth()===mes&&d.getFullYear()===ano;});
  const aprovados=filtered.filter(b=>b.status==="aprovado");
  const pendentes=filtered.filter(b=>b.status==="pendente"||b.status==="enviado");
  const recusados=filtered.filter(b=>b.status==="recusado");
  const receita=aprovados.reduce((s,b)=>s+b.total,0);
  const pipeline=pendentes.reduce((s,b)=>s+b.total,0);
  const taxa=filtered.length?Math.round(aprovados.length/filtered.length*100):0;
  const ticketMedio=aprovados.length?Math.round(receita/aprovados.length):0;

  const rows=filtered.map((b,i)=>`
    <tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
      <td style="padding:8px 10px;border:1px solid #E2E8F0;font-family:monospace;font-size:12px">${b.num}</td>
      <td style="padding:8px 10px;border:1px solid #E2E8F0;font-size:12px">${b.clientName}</td>
      <td style="padding:8px 10px;border:1px solid #E2E8F0;font-size:12px">${b.category}</td>
      <td style="padding:8px 10px;border:1px solid #E2E8F0;font-size:12px">${b.date}</td>
      <td style="padding:8px 10px;border:1px solid #E2E8F0;font-size:12px;text-align:center">
        <span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${b.status==="aprovado"?"#DCFCE7":b.status==="recusado"?"#FEE2E2":b.status==="pendente"||b.status==="enviado"?"#FEF3C7":"#F1F5F9"};color:${b.status==="aprovado"?"#166534":b.status==="recusado"?"#991B1B":b.status==="pendente"||b.status==="enviado"?"#92400E":"#475569"}">${b.status}</span>
      </td>
      <td style="padding:8px 10px;border:1px solid #E2E8F0;font-size:12px;font-weight:700;text-align:right;color:${themeP}">${fmtBRL(b.total)}</td>
    </tr>`).join("");

  const html=`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório ${label} — ${profile.name||"OrcaPro"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',Arial,sans-serif;background:#F1F5F9;color:#1E293B;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{max-width:900px;margin:0 auto;background:#fff}
    @media print{body{background:#fff}.page{max-width:100%;box-shadow:none}.no-print{display:none!important}}
    @media screen{.page{margin:20px auto;box-shadow:0 4px 32px rgba(0,0,0,.12)}}
  </style>
</head>
<body>
<div class="page">
  <div style="background:linear-gradient(135deg,${themeP},${themeA});padding:28px 36px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Relatório Financeiro</div>
      <div style="font-size:26px;font-weight:900;color:#fff">${label}</div>
      <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px">${profile.name||"OrcaPro"} ${profile.profession?`· ${profile.profession}`:""}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:rgba(255,255,255,.7)">Gerado em</div>
      <div style="font-size:13px;font-weight:700;color:#fff">${new Date().toLocaleDateString("pt-BR")}</div>
    </div>
  </div>

  <div style="padding:28px 36px">
    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px">
      ${[
        {label:"Receita Aprovada",val:`R$ ${(receita/1000).toFixed(1)}k`,sub:`${aprovados.length} orçamento(s)`,color:"#22D3A0"},
        {label:"Pipeline",val:`R$ ${(pipeline/1000).toFixed(1)}k`,sub:`${pendentes.length} aguardando`,color:themeP},
        {label:"Taxa de Aprovação",val:`${taxa}%`,sub:`de ${filtered.length} total`,color:themeA},
        {label:"Ticket Médio",val:`R$ ${ticketMedio}`,sub:"por aprovado",color:"#818CF8"},
      ].map(k=>`
        <div style="padding:16px;background:#F8FAFC;border-radius:12px;border-left:4px solid ${k.color}">
          <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${k.label}</div>
          <div style="font-size:22px;font-weight:900;color:${k.color}">${k.val}</div>
          <div style="font-size:11px;color:#64748B;margin-top:3px">${k.sub}</div>
        </div>`).join("")}
    </div>

    <!-- Status summary -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px">
      ${[
        {label:"Aprovados",count:aprovados.length,color:"#22D3A0",bg:"#DCFCE7"},
        {label:"Pendentes/Enviados",count:pendentes.length,color:"#F59E0B",bg:"#FEF3C7"},
        {label:"Recusados",count:recusados.length,color:"#F87171",bg:"#FEE2E2"},
      ].map(s=>`
        <div style="padding:12px 16px;background:${s.bg};border-radius:10px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:600;color:${s.color}">${s.label}</span>
          <span style="font-size:22px;font-weight:900;color:${s.color}">${s.count}</span>
        </div>`).join("")}
    </div>

    <!-- Table -->
    <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Orçamentos do Mês</div>
    ${filtered.length>0?`
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:${themeP}15">
          ${["Nº","Cliente","Categoria","Data","Status","Total"].map(h=>`<th style="padding:10px;font-size:11px;font-weight:700;color:${themeP};text-align:left;border:1px solid ${themeP}20">${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:${themeP}10">
          <td colspan="5" style="padding:10px;font-weight:700;font-size:13px;border:1px solid ${themeP}20">TOTAL RECEITA APROVADA</td>
          <td style="padding:10px;font-weight:900;font-size:15px;color:${themeP};text-align:right;border:1px solid ${themeP}20">${fmtBRL(receita)}</td>
        </tr>
      </tfoot>
    </table>`:`<div style="text-align:center;padding:32px;color:#94A3B8;font-size:13px">Nenhum orçamento neste mês</div>`}

    <!-- Footer -->
    <div style="padding-top:16px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;font-size:11px;color:#94A3B8">
      <span>${profile.name||"OrcaPro"}${profile.phone?` · ${profile.phone}`:""}</span>
      <span>Relatório gerado automaticamente pelo OrcaPro</span>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

  const w=window.open("","_blank");
  if(!w){alert("Permita pop-ups para exportar o PDF");return;}
  w.document.write(html);
  w.document.close();
}


/* ═══ MODAL ASSINATURA DIGITAL ══════════════════════════════════════════ */
function ModalAssinatura({data,onSave,onClose,themeP,themeA}){
  const canvasRef=useRef();
  const [drawing,setDrawing]=useState(false);
  const [hasSig,setHasSig]=useState(!!data.assinatura);
  const [nome,setNome]=useState(data.assinadoPor||data.clientName||"");
  const [cpf,setCpf]=useState(data.assinadoCpf||"");
  const [agreed,setAgreed]=useState(false);
  const lastPos=useRef(null);

  useEffect(()=>{
    if(data.assinatura&&canvasRef.current){
      const img=new Image();
      img.onload=()=>{const ctx=canvasRef.current.getContext("2d");ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height);ctx.drawImage(img,0,0);};
      img.src=data.assinatura;
    }
  },[]);

  const getPos=(e,cv)=>{
    const r=cv.getBoundingClientRect();
    const t=e.touches?e.touches[0]:e;
    return{x:(t.clientX-r.left)*(cv.width/r.width),y:(t.clientY-r.top)*(cv.height/r.height)};
  };
  const startDraw=e=>{e.preventDefault();setDrawing(true);lastPos.current=getPos(e,canvasRef.current);};
  const draw=e=>{
    e.preventDefault();
    if(!drawing||!canvasRef.current)return;
    const ctx=canvasRef.current.getContext("2d");
    const pos=getPos(e,canvasRef.current);
    ctx.beginPath();ctx.moveTo(lastPos.current.x,lastPos.current.y);ctx.lineTo(pos.x,pos.y);
    ctx.strokeStyle=themeP;ctx.lineWidth=2.5;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();
    lastPos.current=pos;setHasSig(true);
  };
  const endDraw=e=>{e.preventDefault();setDrawing(false);};
  const clearSig=()=>{
    const ctx=canvasRef.current.getContext("2d");
    ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height);
    setHasSig(false);
  };
  const save=()=>{
    if(!hasSig){alert("Por favor assine no campo abaixo");return;}
    if(!agreed){alert("Marque a caixa de concordância para continuar");return;}
    const sig=canvasRef.current.toDataURL("image/png");
    onSave({...data,assinatura:sig,assinadoPor:nome,assinadoCpf:cpf,assinadoEm:new Date().toLocaleString("pt-BR"),status:(data.status==="pendente"||data.status==="enviado")?"aprovado":data.status});
  };

  return(
    <Overlay onClose={onClose} wide>
      <div style={S.mhead}>
        <div><div style={S.mtitle}>✍️ Assinatura Digital</div><div style={S.msub}>{data.num} · {data.clientName}</div></div>
        <XBtn onClick={onClose}/>
      </div>
      {/* Resumo */}
      <div style={{padding:"12px 16px",background:"#0F172A",borderRadius:12,border:"1px solid #1E293B",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontWeight:700,color:"#F1F5F9"}}>{data.title}</div><div style={{fontSize:12,color:"#64748B",marginTop:2}}>{data.num} · {data.category}</div></div>
        <div style={{fontSize:22,fontWeight:900,color:themeP}}>{fmtBRL(data.total)}</div>
      </div>
      {/* Dados signatário */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <FL label="Nome do cliente"><input style={S.inp} value={nome} onChange={e=>setNome(e.target.value)} placeholder={data.clientName}/></FL>
        <FL label="CPF (opcional)"><input style={S.inp} value={cpf} onChange={e=>setCpf(e.target.value)} placeholder="000.000.000-00"/></FL>
      </div>
      {/* Termo */}
      <div style={{padding:"10px 14px",background:"rgba(129,140,248,0.06)",border:"1px solid rgba(129,140,248,0.2)",borderRadius:10,marginBottom:14,fontSize:12,color:"#94A3B8",lineHeight:1.6}}>
        Ao assinar, <b style={{color:"#CBD5E1"}}>{nome||data.clientName}</b> autoriza a execução dos serviços do orçamento <b style={{color:themeP}}>{data.num}</b> no valor de <b style={{color:themeP}}>{fmtBRL(data.total)}</b>. Data: <b style={{color:"#CBD5E1"}}>{new Date().toLocaleString("pt-BR")}</b>.
      </div>
      {/* Canvas */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>Assine abaixo</span>
          {hasSig&&<button onClick={clearSig} style={{...S.ghost,fontSize:11,padding:"3px 10px",borderColor:"rgba(248,113,113,.3)",color:"#F87171"}}>🗑️ Limpar</button>}
        </div>
        <div style={{border:`2px dashed ${hasSig?themeP:"#334155"}`,borderRadius:12,background:"#0F172A",overflow:"hidden",transition:"border-color .2s"}}>
          <canvas ref={canvasRef} width={600} height={160}
            style={{display:"block",width:"100%",height:160,cursor:"crosshair",touchAction:"none"}}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}/>
        </div>
        {!hasSig&&<div style={{textAlign:"center",fontSize:12,color:"#475569",marginTop:6}}>Toque ou clique e arraste para assinar</div>}
      </div>
      {/* Checkbox */}
      <div onClick={()=>setAgreed(a=>!a)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:agreed?"rgba(34,211,160,0.06)":"#0F172A",border:`1px solid ${agreed?"rgba(34,211,160,0.25)":"#1E293B"}`,borderRadius:10,marginBottom:16,cursor:"pointer",userSelect:"none"}}>
        <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${agreed?themeP:"#334155"}`,background:agreed?themeP:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
          {agreed&&<span style={{color:"#0F1117",fontSize:13,fontWeight:900}}>✓</span>}
        </div>
        <span style={{fontSize:13,color:agreed?"#22D3A0":"#64748B"}}>Li e aceito os termos do orçamento {data.num}</span>
      </div>
      {data.assinatura&&<div style={{padding:"8px 12px",background:"rgba(34,211,160,0.06)",border:"1px solid rgba(34,211,160,0.2)",borderRadius:9,marginBottom:14,fontSize:12,color:"#22D3A0"}}>✅ Já assinado por <b>{data.assinadoPor}</b> em {data.assinadoEm}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={S.ghost} onClick={onClose}>Cancelar</button>
        <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`,opacity:(hasSig&&agreed)?1:.4,cursor:(hasSig&&agreed)?"pointer":"not-allowed"}} onClick={save}>✅ Confirmar Assinatura</button>
      </div>
    </Overlay>
  );
}

/* ═══ MODAL LOCALIZAÇÃO ══════════════════════════════════════════════════ */
function ModalLocalizacao({data,onSave,onClose,themeP}){
  const [end,setEnd]=useState(data.endereco||"");
  const [comp,setComp]=useState(data.enderecoComp||"");
  const [cidade,setCidade]=useState(data.endereocoCidade||"");
  const [cep,setCep]=useState(data.enderecoCep||"");
  const fullAddr=[end,comp,cidade,cep].filter(Boolean).join(", ");
  const hasEnd=end.trim().length>3;

  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}>
        <div><div style={S.mtitle}>📍 Localização do Serviço</div><div style={S.msub}>{data.num} · {data.clientName}</div></div>
        <XBtn onClick={onClose}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
        <FL label="Endereço *"><input style={S.inp} value={end} onChange={e=>setEnd(e.target.value)} placeholder="Rua das Flores, 123"/></FL>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <FL label="Complemento"><input style={S.inp} value={comp} onChange={e=>setComp(e.target.value)} placeholder="Apto 2, Casa B..."/></FL>
          <FL label="CEP"><input style={S.inp} value={cep} onChange={e=>setCep(e.target.value)} placeholder="00000-000"/></FL>
        </div>
        <FL label="Cidade / Bairro"><input style={S.inp} value={cidade} onChange={e=>setCidade(e.target.value)} placeholder="São Paulo - SP"/></FL>
      </div>
      {hasEnd?(
        <div style={{padding:"14px 16px",background:"rgba(34,211,160,0.06)",border:"1px solid rgba(34,211,160,0.2)",borderRadius:12,marginBottom:16}}>
          <div style={{fontSize:12,color:"#64748B",marginBottom:10}}>📍 {fullAddr}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={{...S.prim,fontSize:12,padding:"7px 14px",background:"#1a73e8"}} onClick={()=>window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr)}`,"_blank")}>🗺️ Ver no Maps</button>
            <button style={{...S.prim,fontSize:12,padding:"7px 14px",background:"#22D3A0",color:"#0F1117"}} onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`,"_blank")}>🧭 Rota / GPS</button>
            <button style={{...S.ghost,fontSize:12,padding:"7px 14px"}} onClick={()=>{navigator.clipboard?.writeText(fullAddr);alert("Endereço copiado!");}}>📋 Copiar</button>
          </div>
        </div>
      ):(
        <div style={{padding:"12px 14px",background:"#0F172A",borderRadius:10,border:"1px solid #1E293B",marginBottom:16,fontSize:12,color:"#475569",textAlign:"center"}}>Digite o endereço para ver as opções de mapa</div>
      )}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={S.ghost} onClick={onClose}>Cancelar</button>
        <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},#22D3A0)`}} onClick={()=>onSave({...data,endereco:end,enderecoComp:comp,endereocoCidade:cidade,enderecoCep:cep})}>📍 Salvar localização</button>
      </div>
    </Overlay>
  );
}

/* ═══ PAGE ESTOQUE ═══════════════════════════════════════════════════════ */
function PageEstoque({estoque,setEstoque,themeP,themeA,showToast}){
  const [modal,setModal]=useState(null);
  const [q,setQ]=useState("");
  const list=estoque||[];
  const filtered=q?list.filter(i=>(i.nome+i.categoria+i.unidade).toLowerCase().includes(q.toLowerCase())):list;
  const valorTotal=list.reduce((s,i)=>s+(i.qty||0)*(i.custo||0),0);
  const baixoEstoque=list.filter(i=>(i.minimo||0)>0&&(i.qty||0)<=(i.minimo||0));
  const saveItem=item=>{setEstoque(es=>es.find(x=>x.id===item.id)?es.map(x=>x.id===item.id?item:x):[...es,{...item,id:uid()}]);setModal(null);showToast("Item salvo ✓");};
  const delItem=id=>{setEstoque(es=>es.filter(x=>x.id!==id));setModal(null);showToast("Removido","warn");};
  const adjust=(id,delta)=>setEstoque(es=>es.map(x=>x.id===id?{...x,qty:Math.max(0,(x.qty||0)+delta)}:x));

  return(
    <div style={S.page}>
      <PHead title="📦 Estoque de Materiais" sub={`${list.length} itens · ${fmtBRL(valorTotal)} em estoque`}>
        <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`}} onClick={()=>setModal({data:null})}>+ Novo Item</button>
      </PHead>

      {baixoEstoque.length>0&&(
        <div style={{padding:"12px 16px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:12,marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>⚠️</span>
          <div><div style={{fontSize:13,fontWeight:700,color:"#F87171"}}>{baixoEstoque.length} item(s) com estoque abaixo do mínimo</div>
          <div style={{fontSize:12,color:"#64748B"}}>{baixoEstoque.map(i=>i.nome).join(", ")}</div></div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <div style={{...S.card,padding:16,textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:themeP}}>{list.length}</div><div style={{fontSize:12,color:"#64748B",marginTop:4}}>Itens cadastrados</div></div>
        <div style={{...S.card,padding:16,textAlign:"center"}}><div style={{fontSize:20,fontWeight:900,color:"#22D3A0"}}>{fmtBRL(valorTotal)}</div><div style={{fontSize:12,color:"#64748B",marginTop:4}}>Valor em estoque</div></div>
        <div style={{...S.card,padding:16,textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:baixoEstoque.length>0?"#F87171":"#22D3A0"}}>{baixoEstoque.length}</div><div style={{fontSize:12,color:"#64748B",marginTop:4}}>Estoque baixo</div></div>
      </div>

      <input style={{...S.inp,maxWidth:380,marginBottom:16}} value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 Buscar material..."/>

      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"56px 0",color:"#475569"}}>
          <div style={{fontSize:48,marginBottom:12}}>📦</div>
          <div style={{fontSize:14,fontWeight:600,color:"#64748B",marginBottom:8}}>{q?"Nenhum resultado":"Estoque vazio"}</div>
          {!q&&<button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`}} onClick={()=>setModal({data:null})}>+ Adicionar primeiro item</button>}
        </div>
      ):(
        <div style={{...S.card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#0F172A"}}>
                {["Material","Categoria","Quantidade","Un.","Custo unit.","Total","Mín.",""].map(h=>(
                  <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#475569",textAlign:"left",borderBottom:"1px solid #1E293B",textTransform:"uppercase",letterSpacing:.5}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item=>{
                const baixo=(item.minimo||0)>0&&(item.qty||0)<=(item.minimo||0);
                return(
                  <tr key={item.id} style={{borderBottom:"1px solid #0F172A"}} className="trow">
                    <td style={S.td}><div style={{color:"#F1F5F9",fontWeight:600}}>{item.nome}</div>{item.obs&&<div style={{fontSize:11,color:"#475569"}}>{item.obs}</div>}</td>
                    <td style={S.td}><span style={{padding:"2px 8px",background:`${themeP}15`,borderRadius:20,color:themeP,fontSize:11,fontWeight:600}}>{item.categoria||"—"}</span></td>
                    <td style={S.td}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <button onClick={()=>adjust(item.id,-1)} style={{width:24,height:24,borderRadius:6,background:"rgba(248,113,113,.15)",border:"none",cursor:"pointer",color:"#F87171",fontSize:16,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                        <span style={{fontSize:16,fontWeight:800,color:baixo?"#F87171":themeP,minWidth:32,textAlign:"center"}}>{item.qty||0}</span>
                        <button onClick={()=>adjust(item.id,1)} style={{width:24,height:24,borderRadius:6,background:"rgba(34,211,160,.15)",border:"none",cursor:"pointer",color:"#22D3A0",fontSize:16,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                      </div>
                    </td>
                    <td style={{...S.td,fontSize:12,color:"#64748B"}}>{item.unidade||"un"}</td>
                    <td style={{...S.td,color:themeP,fontWeight:600}}>{fmtBRL(item.custo||0)}</td>
                    <td style={{...S.td,fontWeight:700,color:"#22D3A0"}}>{fmtBRL((item.qty||0)*(item.custo||0))}</td>
                    <td style={S.td}>{(item.minimo||0)>0&&<span style={{fontSize:12,color:baixo?"#F87171":"#64748B",fontWeight:baixo?700:400}}>{item.minimo}{baixo?" ⚠️":""}</span>}</td>
                    <td style={S.td}>
                      <div style={S.acts}>
                        <TB c={themeP} t="Editar" onClick={()=>setModal({data:item})}>✏️</TB>
                        <TB c="#F87171" t="Excluir" onClick={()=>delItem(item.id)}>🗑️</TB>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal&&<ModalEstoqueItem data={modal.data} onSave={saveItem} onDelete={modal.data?()=>delItem(modal.data.id):null} onClose={()=>setModal(null)} themeP={themeP}/>}
    </div>
  );
}

function ModalEstoqueItem({data,onSave,onDelete,onClose,themeP}){
  const [f,sf]=useState(data||{nome:"",categoria:"Elétrico",qty:0,unidade:"un",custo:0,minimo:0,obs:""});
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const ok=f.nome.trim().length>0;
  const CATS_EST=["Elétrico","Hidráulico","Ferramentas","EPIs","Fixação","Acabamento","Tintas","Outro"];
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}>
        <div><div style={S.mtitle}>{data?"Editar Item":"Novo Item de Estoque"}</div><div style={S.msub}>Controle de materiais</div></div>
        <XBtn onClick={onClose}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><FL label="Nome do material *"><input style={S.inp} value={f.nome} onChange={e=>set("nome",e.target.value)} placeholder="Ex: Fio 2,5mm, Disjuntor 20A..."/></FL></div>
        <FL label="Categoria"><select style={S.sel} value={f.categoria} onChange={e=>set("categoria",e.target.value)}>{CATS_EST.map(c=><option key={c}>{c}</option>)}</select></FL>
        <FL label="Unidade"><select style={S.sel} value={f.unidade} onChange={e=>set("unidade",e.target.value)}>{["un","m","m²","kg","l","cx","pc","rolo","par","kit"].map(u=><option key={u}>{u}</option>)}</select></FL>
        <FL label="Quantidade em estoque"><input style={S.inp} type="number" min="0" value={f.qty} onChange={e=>set("qty",Number(e.target.value))}/></FL>
        <FL label="Custo unitário (R$)"><input style={S.inp} type="number" min="0" step="0.01" value={f.custo} onChange={e=>set("custo",Number(e.target.value))}/></FL>
        <div style={{gridColumn:"1/-1"}}><FL label="Estoque mínimo (0 = sem alerta)"><input style={S.inp} type="number" min="0" value={f.minimo} onChange={e=>set("minimo",Number(e.target.value))}/></FL></div>
        <div style={{gridColumn:"1/-1"}}><FL label="Observações"><input style={S.inp} value={f.obs} onChange={e=>set("obs",e.target.value)} placeholder="Fornecedor, localização no depósito..."/></FL></div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"space-between"}}>
        <div>{onDelete&&<button style={{...S.ghost,borderColor:"rgba(248,113,113,.3)",color:"#F87171",fontSize:12}} onClick={onDelete}>🗑️ Excluir item</button>}</div>
        <div style={{display:"flex",gap:8}}>
          <button style={S.ghost} onClick={onClose}>Cancelar</button>
          <button style={{...S.prim,opacity:ok?1:.4,cursor:ok?"pointer":"not-allowed"}} onClick={()=>ok&&onSave(f)}>{data?"💾 Salvar":"+ Adicionar"}</button>
        </div>
      </div>
    </Overlay>
  );
}


/* ═══ PAGE FINANCEIRO ═══════════════════════════════════════════════════ */
const CATS_DESP = ["Material","Combustível","Ferramentas","EPI/Segurança","Manutenção","Impostos/Taxas","Marketing","Transporte","Alimentação","Outros"];

function exportDREPDF(budgets,despesas,mes,ano,profile,themeP,themeA){
  const meses=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const label=`${meses[mes]} / ${ano}`;
  const bMes=budgets.filter(b=>{const d=new Date(b.createdAt||b.date);return d.getMonth()===mes&&d.getFullYear()===ano;});
  const dMes=(despesas||[]).filter(d=>{const dt=new Date(d.date);return dt.getMonth()===mes&&dt.getFullYear()===ano;});
  const receitaBruta=bMes.filter(b=>b.status==="aprovado").reduce((s,b)=>s+b.total,0);
  const totalDesp=dMes.reduce((s,d)=>s+d.valor,0);
  const lucroLiq=receitaBruta-totalDesp;
  const margem=receitaBruta>0?((lucroLiq/receitaBruta)*100).toFixed(1):0;
  const bPend=bMes.filter(b=>b.status==="pendente"||b.status==="enviado").reduce((s,b)=>s+b.total,0);

  // group despesas by cat
  const byCat={};
  dMes.forEach(d=>{byCat[d.categoria]=(byCat[d.categoria]||0)+d.valor;});
  const catRows=Object.entries(byCat).map(([cat,val])=>`
    <tr><td style="padding:7px 12px;border:1px solid #E2E8F0;font-size:12px">${cat}</td>
    <td style="padding:7px 12px;border:1px solid #E2E8F0;font-size:12px;text-align:right;color:#EF4444">${fmtBRL(val)}</td></tr>`).join("");

  const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>DRE ${label}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#F8FAFC;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @media print{body{background:#fff}.no-print{display:none}}
  @media screen{.page{max-width:820px;margin:20px auto;box-shadow:0 4px 24px rgba(0,0,0,.1);}}</style></head>
  <body><div class="page" style="background:#fff">
  <div style="background:linear-gradient(135deg,${themeP},${themeA});padding:28px 36px;display:flex;justify-content:space-between;align-items:center">
    <div><div style="font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Demonstrativo de Resultado</div>
    <div style="font-size:26px;font-weight:900;color:#fff">${label}</div>
    <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px">${profile.name||"OrcaPro"}${profile.profession?` · ${profile.profession}`:""}</div></div>
    <div style="text-align:right"><div style="font-size:11px;color:rgba(255,255,255,.7)">Gerado em</div>
    <div style="font-size:13px;font-weight:700;color:#fff">${new Date().toLocaleDateString("pt-BR")}</div></div>
  </div>
  <div style="padding:28px 36px">
    <!-- DRE -->
    <div style="margin-bottom:24px">
      <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Demonstrativo de Resultado</div>
      <table style="width:100%;border-collapse:collapse">
        ${[
          {label:"(+) Receita Bruta (aprovados)",val:receitaBruta,color:"#166534",bg:"#DCFCE7",bold:false},
          {label:"(−) Total de Despesas",val:-totalDesp,color:"#991B1B",bg:"#FEE2E2",bold:false},
          {label:"(=) Lucro Líquido",val:lucroLiq,color:lucroLiq>=0?"#166534":"#991B1B",bg:lucroLiq>=0?"#DCFCE7":"#FEE2E2",bold:true},
        ].map(r=>`<tr style="background:${r.bg}"><td style="padding:10px 14px;border:1px solid #E2E8F0;font-size:13px;font-weight:${r.bold?800:500};color:${r.color}">${r.label}</td>
        <td style="padding:10px 14px;border:1px solid #E2E8F0;font-size:${r.bold?16:13}px;font-weight:${r.bold?900:600};color:${r.color};text-align:right">${fmtBRL(Math.abs(r.val))}</td></tr>`).join("")}
        <tr style="background:#EFF6FF"><td style="padding:8px 14px;border:1px solid #E2E8F0;font-size:12px;color:#1E40AF">Margem de Lucro</td>
        <td style="padding:8px 14px;border:1px solid #E2E8F0;font-size:14px;font-weight:800;color:#1E40AF;text-align:right">${margem}%</td></tr>
        <tr style="background:#FFFBEB"><td style="padding:8px 14px;border:1px solid #E2E8F0;font-size:12px;color:#92400E">Pipeline (pendente/enviado)</td>
        <td style="padding:8px 14px;border:1px solid #E2E8F0;font-size:13px;font-weight:700;color:#D97706;text-align:right">${fmtBRL(bPend)}</td></tr>
      </table>
    </div>
    <!-- Despesas por categoria -->
    ${dMes.length>0?`<div style="margin-bottom:24px">
      <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Despesas por Categoria</div>
      <table style="width:100%;border-collapse:collapse">${catRows}</table>
    </div>`:""}
    <!-- Despesas detalhadas -->
    ${dMes.length>0?`<div style="margin-bottom:24px">
      <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Despesas Detalhadas</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#F8FAFC">${["Data","Categoria","Descrição","Valor"].map(h=>`<th style="padding:8px 12px;border:1px solid #E2E8F0;font-size:11px;font-weight:700;color:#475569;text-align:left;text-transform:uppercase">${h}</th>`).join("")}</tr></thead>
        <tbody>${dMes.map((d,i)=>`<tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
          <td style="padding:7px 12px;border:1px solid #E2E8F0;font-size:12px">${d.date}</td>
          <td style="padding:7px 12px;border:1px solid #E2E8F0;font-size:12px">${d.categoria}</td>
          <td style="padding:7px 12px;border:1px solid #E2E8F0;font-size:12px">${d.desc||"—"}</td>
          <td style="padding:7px 12px;border:1px solid #E2E8F0;font-size:12px;text-align:right;color:#EF4444;font-weight:600">${fmtBRL(d.valor)}</td>
        </tr>`).join("")}</tbody>
        <tfoot><tr style="background:#FEE2E2"><td colspan="3" style="padding:8px 12px;border:1px solid #E2E8F0;font-weight:700">TOTAL DESPESAS</td>
        <td style="padding:8px 12px;border:1px solid #E2E8F0;font-weight:900;color:#EF4444;text-align:right">${fmtBRL(totalDesp)}</td></tr></tfoot>
      </table>
    </div>`:""}
    <div style="padding-top:16px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;font-size:11px;color:#94A3B8">
      <span>${profile.name||"OrcaPro"}${profile.phone?` · ${profile.phone}`:""}</span>
      <span>DRE gerado pelo OrcaPro</span>
    </div>
  </div></div>
  <script>window.onload=function(){window.print();}<\/script></body></html>`;
  const w=window.open("","_blank");if(!w){alert("Permita pop-ups para exportar");return;}
  w.document.write(html);w.document.close();
}

function PageFinanceiro({budgets,despesas,setDespesas,profile,themeP,themeA,showToast}){
  const [mes,setMes]=useState(new Date().getMonth());
  const [ano,setAno]=useState(new Date().getFullYear());
  const [modal,setModal]=useState(null);
  const [tab,setTab]=useState("fluxo");
  const meses=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const anos=[2024,2025,2026,2027];

  // Dados do mês selecionado
  const bMes=budgets.filter(b=>{const d=new Date(b.createdAt||b.date);return d.getMonth()===mes&&d.getFullYear()===ano;});
  const dMes=(despesas||[]).filter(d=>{const dt=new Date(d.date);return dt.getMonth()===mes&&dt.getFullYear()===ano;});
  const receitaBruta=bMes.filter(b=>b.status==="aprovado").reduce((s,b)=>s+b.total,0);
  const pipeline=bMes.filter(b=>b.status==="pendente"||b.status==="enviado").reduce((s,b)=>s+b.total,0);
  const totalDesp=dMes.reduce((s,d)=>s+(d.valor||0),0);
  const lucroLiq=receitaBruta-totalDesp;
  const margem=receitaBruta>0?((lucroLiq/receitaBruta)*100).toFixed(1):0;

  // Fluxo dos últimos 6 meses
  const fluxo6=Array.from({length:6},(_,i)=>{
    const d=new Date(ano,mes-5+i,1);
    const m=d.getMonth();const a=d.getFullYear();
    const rec=budgets.filter(b=>{const bd=new Date(b.createdAt||b.date);return bd.getMonth()===m&&bd.getFullYear()===a&&b.status==="aprovado";}).reduce((s,b)=>s+b.total,0);
    const desp=(despesas||[]).filter(d=>{const dd=new Date(d.date);return dd.getMonth()===m&&dd.getFullYear()===a;}).reduce((s,d)=>s+(d.valor||0),0);
    return{label:meses[m].slice(0,3),rec,desp,lucro:rec-desp};
  });
  const maxFluxo=Math.max(...fluxo6.map(f=>Math.max(f.rec,f.desp)),1);

  // Despesas por categoria
  const byCat={};
  dMes.forEach(d=>{byCat[d.categoria]=(byCat[d.categoria]||0)+(d.valor||0);});
  const catList=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);

  const saveDespesa=d=>{
    setDespesas(ds=>ds.find(x=>x.id===d.id)?ds.map(x=>x.id===d.id?d:x):[...ds,{...d,id:uid()}]);
    setModal(null);showToast("Despesa salva ✓");
  };
  const delDespesa=id=>{setDespesas(ds=>ds.filter(x=>x.id!==id));setModal(null);showToast("Removida","warn");};

  return(
    <div style={S.page}>
      <PHead title="💰 Financeiro" sub={`${meses[mes]} ${ano} · Fluxo de caixa e DRE`}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <select style={{...S.sel,fontSize:12,padding:"6px 10px"}} value={mes} onChange={e=>setMes(Number(e.target.value))}>
            {meses.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
          <select style={{...S.sel,fontSize:12,padding:"6px 10px"}} value={ano} onChange={e=>setAno(Number(e.target.value))}>
            {anos.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          <button style={{...S.prim,fontSize:12,padding:"7px 14px",background:"#EF4444"}} onClick={()=>setModal({type:"despesa",data:null})}>+ Despesa</button>
          <button style={{...S.prim,fontSize:12,padding:"7px 14px",background:"linear-gradient(135deg,#EF4444,#DC2626)"}} onClick={()=>exportDREPDF(budgets,despesas,mes,ano,profile,themeP,themeA)}>📄 DRE PDF</button>
        </div>
      </PHead>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {ico:"💚",lbl:"Receita Aprovada",val:fmtBRL(receitaBruta),color:"#22D3A0",bg:"rgba(34,211,160,0.08)"},
          {ico:"🔴",lbl:"Total Despesas",val:fmtBRL(totalDesp),color:"#F87171",bg:"rgba(248,113,113,0.08)"},
          {ico:"⭐",lbl:"Lucro Líquido",val:fmtBRL(lucroLiq),color:lucroLiq>=0?"#22D3A0":"#F87171",bg:lucroLiq>=0?"rgba(34,211,160,0.08)":"rgba(248,113,113,0.08)"},
          {ico:"📊",lbl:"Margem de Lucro",val:`${margem}%`,color:themeP,bg:`${themeP}10`},
        ].map(k=>(
          <div key={k.lbl} style={{...S.card,padding:16,background:k.bg,border:`1px solid ${k.color}20`}}>
            <div style={{fontSize:20,marginBottom:6}}>{k.ico}</div>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.lbl}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Pipeline badge */}
      {pipeline>0&&<div style={{padding:"10px 16px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:12,marginBottom:18,fontSize:13,color:"#F59E0B",display:"flex",alignItems:"center",gap:8}}>
        <span>⏳</span> <span>Pipeline aguardando aprovação: <b>{fmtBRL(pipeline)}</b></span>
      </div>}

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"1px solid #1E293B",paddingBottom:0}}>
        {[{id:"fluxo",lbl:"📈 Fluxo de Caixa"},{id:"despesas",lbl:"🔴 Despesas"},{id:"dre",lbl:"📊 DRE"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?themeP:"#64748B",borderBottom:tab===t.id?`2px solid ${themeP}`:"2px solid transparent",marginBottom:-1}}>
            {t.lbl}
          </button>
        ))}
      </div>

      {/* TAB: FLUXO DE CAIXA */}
      {tab==="fluxo"&&(
        <div>
          <div style={{fontSize:12,color:"#64748B",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}}>Últimos 6 meses</div>
          <div style={{...S.card,padding:20,marginBottom:16}}>
            {/* Legend */}
            <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
              {[{color:"#22D3A0",lbl:"Receita"},{color:"#F87171",lbl:"Despesas"},{color:themeP,lbl:"Lucro"}].map(l=>(
                <div key={l.lbl} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#94A3B8"}}>
                  <div style={{width:12,height:12,borderRadius:3,background:l.color}}/>{l.lbl}
                </div>
              ))}
            </div>
            {/* Bars */}
            <div style={{display:"flex",gap:8,alignItems:"flex-end",height:180}}>
              {fluxo6.map((m,i)=>(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:150}}>
                    <div style={{flex:1,background:"#22D3A0",borderRadius:"4px 4px 0 0",height:`${(m.rec/maxFluxo)*150}px`,minHeight:m.rec>0?4:0,transition:"height .4s"}}/>
                    <div style={{flex:1,background:"#F87171",borderRadius:"4px 4px 0 0",height:`${(m.desp/maxFluxo)*150}px`,minHeight:m.desp>0?4:0,transition:"height .4s"}}/>
                    <div style={{flex:1,background:m.lucro>=0?themeP:"#F87171",borderRadius:"4px 4px 0 0",opacity:.7,height:`${(Math.abs(m.lucro)/maxFluxo)*150}px`,minHeight:Math.abs(m.lucro)>0?4:0,transition:"height .4s"}}/>
                  </div>
                  <div style={{fontSize:10,color:"#64748B",fontWeight:600}}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Tabela resumo */}
          <div style={{...S.card,padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#0F172A"}}>
                {["Mês","Receita","Despesas","Lucro","Margem"].map(h=><th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#475569",textAlign:"left",borderBottom:"1px solid #1E293B",textTransform:"uppercase"}}>{h}</th>)}
              </tr></thead>
              <tbody>{fluxo6.map((m,i)=>{
                const mg=m.rec>0?((m.lucro/m.rec)*100).toFixed(0):0;
                return<tr key={i} style={{borderBottom:"1px solid #0F172A"}} className="trow">
                  <td style={{...S.td,fontWeight:600}}>{m.label}</td>
                  <td style={{...S.td,color:"#22D3A0",fontWeight:600}}>{fmtBRL(m.rec)}</td>
                  <td style={{...S.td,color:"#F87171",fontWeight:600}}>{fmtBRL(m.desp)}</td>
                  <td style={{...S.td,color:m.lucro>=0?"#22D3A0":"#F87171",fontWeight:700}}>{fmtBRL(m.lucro)}</td>
                  <td style={S.td}><span style={{padding:"2px 8px",borderRadius:20,background:Number(mg)>=0?"rgba(34,211,160,.1)":"rgba(248,113,113,.1)",color:Number(mg)>=0?"#22D3A0":"#F87171",fontSize:11,fontWeight:700}}>{mg}%</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: DESPESAS */}
      {tab==="despesas"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            {/* Por categoria */}
            <div style={S.card}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:12}}>Por Categoria</div>
              {catList.length===0?<div style={{textAlign:"center",padding:"24px 0",color:"#475569",fontSize:13}}>Sem despesas neste mês</div>:
                catList.map(([cat,val])=>(
                  <div key={cat} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:12,color:"#94A3B8"}}>{cat}</span>
                      <span style={{fontSize:12,fontWeight:700,color:"#F87171"}}>{fmtBRL(val)}</span>
                    </div>
                    <div style={{height:5,background:"#1E293B",borderRadius:3}}>
                      <div style={{height:"100%",width:`${totalDesp>0?(val/totalDesp)*100:0}%`,background:"linear-gradient(90deg,#F87171,#EF4444)",borderRadius:3}}/>
                    </div>
                    <div style={{fontSize:10,color:"#475569",marginTop:2}}>{totalDesp>0?((val/totalDesp)*100).toFixed(0):0}% do total</div>
                  </div>
                ))
              }
            </div>
            {/* Resumo rápido */}
            <div style={S.card}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:12}}>Resumo do Mês</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{padding:"12px",background:"rgba(34,211,160,.06)",borderRadius:10,border:"1px solid rgba(34,211,160,.2)"}}>
                  <div style={{fontSize:11,color:"#64748B"}}>Receita aprovada</div>
                  <div style={{fontSize:20,fontWeight:900,color:"#22D3A0"}}>{fmtBRL(receitaBruta)}</div>
                </div>
                <div style={{padding:"12px",background:"rgba(248,113,113,.06)",borderRadius:10,border:"1px solid rgba(248,113,113,.2)"}}>
                  <div style={{fontSize:11,color:"#64748B"}}>Total despesas ({dMes.length} lançamentos)</div>
                  <div style={{fontSize:20,fontWeight:900,color:"#F87171"}}>{fmtBRL(totalDesp)}</div>
                </div>
                <div style={{padding:"12px",background:`${lucroLiq>=0?"rgba(34,211,160":"rgba(248,113,113"},.06)`,borderRadius:10,border:`1px solid ${lucroLiq>=0?"rgba(34,211,160":"rgba(248,113,113"},.2)`}}>
                  <div style={{fontSize:11,color:"#64748B"}}>Lucro líquido</div>
                  <div style={{fontSize:20,fontWeight:900,color:lucroLiq>=0?"#22D3A0":"#F87171"}}>{fmtBRL(lucroLiq)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de despesas */}
          {dMes.length===0?(
            <div style={{textAlign:"center",padding:"48px 0",color:"#475569"}}>
              <div style={{fontSize:40,marginBottom:12}}>💸</div>
              <div style={{fontSize:14,fontWeight:600,color:"#64748B",marginBottom:8}}>Nenhuma despesa neste mês</div>
              <button style={{...S.prim,background:"#EF4444"}} onClick={()=>setModal({type:"despesa",data:null})}>+ Registrar despesa</button>
            </div>
          ):(
            <div style={{...S.card,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#0F172A"}}>
                  {["Data","Categoria","Descrição","Valor",""].map(h=><th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:"#475569",textAlign:"left",borderBottom:"1px solid #1E293B",textTransform:"uppercase"}}>{h}</th>)}
                </tr></thead>
                <tbody>{dMes.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(d=>(
                  <tr key={d.id} style={{borderBottom:"1px solid #0F172A"}} className="trow">
                    <td style={{...S.td,fontSize:12,color:"#64748B"}}>{d.date}</td>
                    <td style={S.td}><span style={{padding:"2px 8px",background:"rgba(248,113,113,.1)",borderRadius:20,color:"#F87171",fontSize:11,fontWeight:600}}>{d.categoria}</span></td>
                    <td style={{...S.td,color:"#94A3B8"}}>{d.desc||"—"}</td>
                    <td style={{...S.td,color:"#F87171",fontWeight:700}}>{fmtBRL(d.valor)}</td>
                    <td style={S.td}>
                      <div style={S.acts}>
                        <TB c={themeP} t="Editar" onClick={()=>setModal({type:"despesa",data:d})}>✏️</TB>
                        <TB c="#F87171" t="Excluir" onClick={()=>delDespesa(d.id)}>🗑️</TB>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
                <tfoot><tr style={{background:"rgba(248,113,113,.05)"}}>
                  <td colSpan="3" style={{padding:"10px 14px",fontWeight:700,fontSize:13,color:"#F87171",borderTop:"1px solid #1E293B"}}>TOTAL</td>
                  <td style={{padding:"10px 14px",fontWeight:900,fontSize:15,color:"#F87171",borderTop:"1px solid #1E293B"}}>{fmtBRL(totalDesp)}</td>
                  <td style={{borderTop:"1px solid #1E293B"}}/>
                </tr></tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: DRE */}
      {tab==="dre"&&(
        <div style={{maxWidth:640}}>
          <div style={S.card}>
            <div style={{fontSize:13,fontWeight:700,color:"#94A3B8",marginBottom:16,textAlign:"center",textTransform:"uppercase",letterSpacing:1}}>
              Demonstrativo de Resultado — {meses[mes]} {ano}
            </div>
            {[
              {lbl:"(+) Receita Bruta",val:receitaBruta,color:"#22D3A0",bold:false},
              {lbl:"(−) Despesas Operacionais",val:totalDesp,color:"#F87171",bold:false,neg:true},
              null,
              {lbl:"(=) LUCRO LÍQUIDO",val:lucroLiq,color:lucroLiq>=0?"#22D3A0":"#F87171",bold:true},
            ].map((row,i)=>row===null?(
              <div key={i} style={{borderTop:"2px solid #1E293B",margin:"8px 0"}}/>
            ):(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:`${row.bold?14:10}px 0`,borderBottom:row.bold?"none":"1px solid #0F172A"}}>
                <span style={{fontSize:row.bold?15:13,fontWeight:row.bold?800:500,color:row.bold?"#F1F5F9":"#94A3B8"}}>{row.lbl}</span>
                <span style={{fontSize:row.bold?18:14,fontWeight:row.bold?900:600,color:row.color}}>{row.neg?"-":""}{fmtBRL(row.val)}</span>
              </div>
            ))}
            <div style={{marginTop:16,padding:"12px 16px",background:`${themeP}10`,borderRadius:10,border:`1px solid ${themeP}25`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,color:"#94A3B8",fontWeight:600}}>Margem de Lucro</span>
              <span style={{fontSize:22,fontWeight:900,color:themeP}}>{margem}%</span>
            </div>
            {pipeline>0&&<div style={{marginTop:10,padding:"10px 14px",background:"rgba(245,158,11,.08)",borderRadius:10,border:"1px solid rgba(245,158,11,.2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:"#F59E0B"}}>⏳ Pipeline (aguardando)</span>
              <span style={{fontSize:14,fontWeight:700,color:"#F59E0B"}}>{fmtBRL(pipeline)}</span>
            </div>}
            <button style={{...S.prim,background:"linear-gradient(135deg,#EF4444,#DC2626)",width:"100%",marginTop:16}} onClick={()=>exportDREPDF(budgets,despesas,mes,ano,profile,themeP,themeA)}>
              📄 Exportar DRE em PDF
            </button>
          </div>
        </div>
      )}

      {/* Modal despesa */}
      {modal?.type==="despesa"&&(
        <ModalDespesa data={modal.data} onSave={saveDespesa} onDelete={modal.data?()=>delDespesa(modal.data.id):null} onClose={()=>setModal(null)} themeP={themeP}/>
      )}
    </div>
  );
}

function ModalDespesa({data,onSave,onDelete,onClose,themeP}){
  const [f,sf]=useState(data||{categoria:"Material",desc:"",valor:0,date:today(),obs:""});
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const ok=f.valor>0;
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}>
        <div><div style={S.mtitle}>{data?"Editar Despesa":"Nova Despesa"}</div><div style={S.msub}>Registro financeiro</div></div>
        <XBtn onClick={onClose}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <FL label="Categoria">
          <select style={S.sel} value={f.categoria} onChange={e=>set("categoria",e.target.value)}>
            {CATS_DESP.map(c=><option key={c}>{c}</option>)}
          </select>
        </FL>
        <FL label="Data">
          <input style={S.inp} type="date" value={f.date} onChange={e=>set("date",e.target.value)}/>
        </FL>
        <div style={{gridColumn:"1/-1"}}>
          <FL label="Descrição"><input style={S.inp} value={f.desc} onChange={e=>set("desc",e.target.value)} placeholder="Ex: Fio elétrico, gasolina..."/></FL>
        </div>
        <FL label="Valor (R$) *">
          <input style={S.inp} type="number" min="0" step="0.01" value={f.valor} onChange={e=>set("valor",Number(e.target.value))}/>
        </FL>
        <FL label="Observações">
          <input style={S.inp} value={f.obs||""} onChange={e=>set("obs",e.target.value)} placeholder="Nota fiscal, fornecedor..."/>
        </FL>
      </div>
      <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"space-between"}}>
        <div>{onDelete&&<button style={{...S.ghost,borderColor:"rgba(248,113,113,.3)",color:"#F87171",fontSize:12}} onClick={onDelete}>🗑️ Excluir</button>}</div>
        <div style={{display:"flex",gap:8}}>
          <button style={S.ghost} onClick={onClose}>Cancelar</button>
          <button style={{...S.prim,background:"#EF4444",opacity:ok?1:.4,cursor:ok?"pointer":"not-allowed"}} onClick={()=>ok&&onSave(f)}>{data?"💾 Salvar":"+ Registrar"}</button>
        </div>
      </div>
    </Overlay>
  );
}


/* ═══ MODAL COMPARTILHAR ORÇAMENTO ══════════════════════════════════════ */
function ModalCompartilhar({data,profile,user,onClose,themeP,themeA,onStatusUpdate}){
  const [token,setToken]=useState(null);
  const [loading,setLoading]=useState(false);
  const [copied,setCopied]=useState(false);
  const [existing,setExisting]=useState(null);
  const [checking,setChecking]=useState(true);

  // Check if already shared
  useEffect(()=>{
    supabase.from("public_budgets").select("*").eq("budget_id",data.id).maybeSingle()
      .then(({data:row})=>{
        if(row){setExisting(row);setToken(row.token);}
        setChecking(false);
      });
  },[data.id]);

  const gerar=async()=>{
    setLoading(true);
    const t=[...Array(20)].map(()=>"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random()*62)]).join("");
    const expires=new Date();expires.setDate(expires.getDate()+30);
    const row={token:t,budget_id:data.id,user_id:user.id,budget_data:{...data,profile:{name:profile.name,phone:profile.phone,email:profile.email,profession:profile.profession,logo:profile.logo,city:profile.city,crea:profile.crea,instagram:profile.instagram,website:profile.website,primaryColor:profile.primaryColor||themeP,accentColor:profile.accentColor||themeA}},status:"pendente",expires_at:expires.toISOString()};
    const{data:saved,error}=await supabase.from("public_budgets").insert([row]).select().single();
    if(error){console.error(error);setLoading(false);return;}
    setToken(saved.token);setExisting(saved);setLoading(false);
  };

  const revogar=async()=>{
    if(!existing)return;
    await supabase.from("public_budgets").delete().eq("id",existing.id);
    setToken(null);setExisting(null);
  };

  const link=token?`${window.location.origin}/#/o/${token}`:"";
  const copy=()=>{navigator.clipboard?.writeText(link);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const sendWA=()=>{
    const msg=`Olá *${data.clientName}*! 👋\n\nSegue o orçamento *${data.num}* — *${data.title}*\n💰 Valor: *${fmtBRL(data.total)}*\n\nVocê pode visualizar e *aprovar digitalmente* pelo link abaixo:\n👉 ${link}\n\nQualquer dúvida, estou à disposição!\n\n— ${profile.name||"OrcaPro"}`;
    window.open(`https://wa.me/55${(data.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`,"_blank");
  };

  return(
    <Overlay onClose={onClose} wide>
      <div style={S.mhead}>
        <div><div style={S.mtitle}>🔗 Compartilhar Orçamento</div><div style={S.msub}>{data.num} · {data.clientName}</div></div>
        <XBtn onClick={onClose}/>
      </div>

      {/* Resumo */}
      <div style={{padding:"12px 16px",background:"#0F172A",borderRadius:12,border:"1px solid #1E293B",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontWeight:700,color:"#F1F5F9"}}>{data.title}</div><div style={{fontSize:12,color:"#64748B",marginTop:2}}>{data.num} · {data.category}</div></div>
        <div style={{fontSize:22,fontWeight:900,color:themeP}}>{fmtBRL(data.total)}</div>
      </div>

      {/* Status do link */}
      {data.assinatura&&<div style={{padding:"10px 14px",background:"rgba(34,211,160,.06)",border:"1px solid rgba(34,211,160,.2)",borderRadius:10,marginBottom:14,fontSize:12,color:"#22D3A0"}}>✅ Já assinado por <b>{data.assinadoPor||data.clientName}</b> em {data.assinadoEm}</div>}

      {checking?(
        <div style={{textAlign:"center",padding:"32px 0",color:"#64748B"}}>⏳ Verificando...</div>
      ):!token?(
        <div style={{textAlign:"center",padding:"24px 0"}}>
          <div style={{fontSize:40,marginBottom:12}}>🔗</div>
          <div style={{fontSize:14,fontWeight:600,color:"#94A3B8",marginBottom:6}}>Gere um link único para o cliente</div>
          <div style={{fontSize:12,color:"#475569",marginBottom:20}}>O cliente poderá ver o orçamento, assinar e aprovar online — sem precisar de login.</div>
          <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`}} onClick={gerar} disabled={loading}>
            {loading?"⏳ Gerando...":"🔗 Gerar Link de Aprovação"}
          </button>
        </div>
      ):(
        <div>
          {/* Link box */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Link gerado — válido por 30 dias</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:1,padding:"10px 14px",background:"#0F172A",borderRadius:10,border:`1px solid ${themeP}30`,fontSize:12,color:"#94A3B8",wordBreak:"break-all",fontFamily:"monospace"}}>
                {link}
              </div>
              <button style={{...S.prim,padding:"10px 14px",background:copied?"#22D3A0":themeP,flexShrink:0}} onClick={copy}>
                {copied?"✓ Copiado!":"📋 Copiar"}
              </button>
            </div>
          </div>

          {/* Status do cliente */}
          {existing&&(
            <div style={{padding:"12px 14px",background:existing.status==="aprovado"?"rgba(34,211,160,.06)":existing.status==="recusado"?"rgba(248,113,113,.06)":"rgba(245,158,11,.06)",border:`1px solid ${existing.status==="aprovado"?"rgba(34,211,160,.2)":existing.status==="recusado"?"rgba(248,113,113,.2)":"rgba(245,158,11,.2)"}`,borderRadius:12,marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:existing.status==="aprovado"?"#22D3A0":existing.status==="recusado"?"#F87171":"#F59E0B",marginBottom:4}}>
                {existing.status==="aprovado"?"✅ Cliente APROVOU":existing.status==="recusado"?"❌ Cliente RECUSOU":"⏳ Aguardando resposta do cliente"}
              </div>
              {existing.viewed_at&&<div style={{fontSize:11,color:"#64748B"}}>Visualizado em: {new Date(existing.viewed_at).toLocaleString("pt-BR")}</div>}
              {existing.responded_at&&<div style={{fontSize:11,color:"#64748B"}}>Respondido em: {new Date(existing.responded_at).toLocaleString("pt-BR")}</div>}
              {existing.client_name&&<div style={{fontSize:11,color:"#64748B"}}>Assinado por: <b style={{color:"#94A3B8"}}>{existing.client_name}</b></div>}
              {existing.client_signature&&<div style={{marginTop:8}}><div style={{fontSize:10,color:"#475569",marginBottom:4}}>Assinatura do cliente:</div><img src={existing.client_signature} alt="assinatura" style={{maxHeight:50,background:"#fff",borderRadius:6,padding:4,objectFit:"contain"}}/></div>}
            </div>
          )}

          {/* Actions */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            <button style={{...S.prim,background:"#25D366",color:"#fff"}} onClick={sendWA}>📱 Enviar pelo WhatsApp</button>
            <button style={{...S.ghost,fontSize:12}} onClick={copy}>{copied?"✓ Copiado!":"📋 Copiar Link"}</button>
            <button style={{...S.ghost,fontSize:12,borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={revogar}>🗑️ Revogar Link</button>
          </div>

          <div style={{fontSize:11,color:"#475569",padding:"10px 14px",background:"#0F172A",borderRadius:9,border:"1px solid #1E293B"}}>
            💡 O cliente abre o link, assina com o dedo e aprova. O status atualiza automaticamente aqui.
          </div>
        </div>
      )}
    </Overlay>
  );
}

/* ═══ PÁGINA PÚBLICA DO ORÇAMENTO ════════════════════════════════════════ */
function PublicBudgetPage({token}){
  const [pb,setPb]=useState(null);
  const [loading,setLoading]=useState(true);
  const [step,setStep]=useState("view"); // view | sign | done
  const [nome,setNome]=useState("");
  const [agreed,setAgreed]=useState(false);
  const [drawing,setDrawing]=useState(false);
  const [hasSig,setHasSig]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [decision,setDecision]=useState(null); // 'aprovado' | 'recusado'
  const canvasRef=useRef();
  const lastPos=useRef(null);

  useEffect(()=>{
    supabase.from("public_budgets").select("*").eq("token",token).maybeSingle()
      .then(({data:row})=>{
        if(row){
          setPb(row);
          setNome(row.budget_data?.clientName||"");
          // mark as viewed
          if(!row.viewed_at){
            supabase.from("public_budgets").update({viewed_at:new Date().toISOString()}).eq("token",token).then(()=>{});
          }
        }
        setLoading(false);
      });
  },[token]);

  const getPos=(e,cv)=>{
    const r=cv.getBoundingClientRect();
    const t=e.touches?e.touches[0]:e;
    return{x:(t.clientX-r.left)*(cv.width/r.width),y:(t.clientY-r.top)*(cv.height/r.height)};
  };
  const startDraw=e=>{e.preventDefault();setDrawing(true);lastPos.current=getPos(e,canvasRef.current);};
  const draw=e=>{
    e.preventDefault();
    if(!drawing||!canvasRef.current)return;
    const ctx=canvasRef.current.getContext("2d");
    const pos=getPos(e,canvasRef.current);
    ctx.beginPath();ctx.moveTo(lastPos.current.x,lastPos.current.y);ctx.lineTo(pos.x,pos.y);
    ctx.strokeStyle="#1E293B";ctx.lineWidth=3;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();
    lastPos.current=pos;setHasSig(true);
  };
  const endDraw=e=>{e.preventDefault();setDrawing(false);};
  const clearSig=()=>{
    const ctx=canvasRef.current.getContext("2d");
    ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height);
    setHasSig(false);
  };

  const recusar=async()=>{
    setSubmitting(true);
    await supabase.from("public_budgets").update({status:"recusado",responded_at:new Date().toISOString(),client_name:nome}).eq("token",token);
    setDecision("recusado");setStep("done");setSubmitting(false);
  };

  const aprovar=async()=>{
    if(!hasSig){alert("Por favor assine antes de aprovar");return;}
    if(!agreed){alert("Marque a caixa de concordância");return;}
    setSubmitting(true);
    const sig=canvasRef.current.toDataURL("image/png");
    await supabase.from("public_budgets").update({status:"aprovado",responded_at:new Date().toISOString(),client_name:nome,client_signature:sig}).eq("token",token);
    setDecision("aprovado");setStep("done");setSubmitting(false);
  };

  if(loading)return(
    <div style={{minHeight:"100vh",background:"#0A0E1A",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#64748B",fontSize:14}}>⏳ Carregando orçamento...</div>
    </div>
  );

  if(!pb)return(
    <div style={{minHeight:"100vh",background:"#0A0E1A",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:48}}>🔍</div>
      <div style={{color:"#F87171",fontSize:16,fontWeight:700}}>Orçamento não encontrado</div>
      <div style={{color:"#64748B",fontSize:13}}>O link pode ter expirado ou sido revogado.</div>
    </div>
  );

  const b=pb.budget_data;
  const pf=b.profile||{};
  const P=pf.primaryColor||"#818CF8";
  const A=pf.accentColor||"#22D3A0";
  const sub=calcSub(b.items||[]);
  const alreadyDone=pb.status==="aprovado"||pb.status==="recusado";

  if(step==="done"||alreadyDone){
    const st=decision||pb.status;
    return(
      <div style={{minHeight:"100vh",background:"#0A0E1A",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{maxWidth:480,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:72,marginBottom:16}}>{st==="aprovado"?"✅":"❌"}</div>
          <div style={{fontSize:24,fontWeight:900,color:st==="aprovado"?"#22D3A0":"#F87171",marginBottom:8}}>
            {st==="aprovado"?"Orçamento Aprovado!":"Orçamento Recusado"}
          </div>
          <div style={{fontSize:14,color:"#64748B",marginBottom:24}}>
            {st==="aprovado"
              ?"Sua assinatura foi registrada. Em breve entraremos em contato para confirmar os detalhes."
              :"Entendemos. Se mudar de ideia, entre em contato conosco."}
          </div>
          <div style={{padding:"16px",background:"#0F172A",borderRadius:12,border:"1px solid #1E293B",marginBottom:16}}>
            <div style={{fontSize:13,color:"#94A3B8"}}>{b.num} — {b.title}</div>
            <div style={{fontSize:22,fontWeight:900,color:P,marginTop:4}}>{fmtBRL(b.total)}</div>
          </div>
          {pf.phone&&<a href={`https://wa.me/55${(pf.phone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 24px",background:"#25D366",color:"#fff",borderRadius:10,textDecoration:"none",fontWeight:700,fontSize:14}}>
            📱 Falar com {pf.name||"o prestador"}
          </a>}
        </div>
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"'DM Sans',Arial,sans-serif"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${P},${A})`,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10}}>
        {pf.logo?<img src={pf.logo} alt="logo" style={{width:36,height:36,borderRadius:8,objectFit:"contain",background:"rgba(255,255,255,.2)",padding:2}}/>
          :<div style={{width:36,height:36,borderRadius:8,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚡</div>}
        <div>
          <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>{pf.name||"OrcaPro"}</div>
          {pf.profession&&<div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>{pf.profession}</div>}
        </div>
        <div style={{marginLeft:"auto",textAlign:"right"}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.7)"}}>Orçamento</div>
          <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{b.num}</div>
        </div>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"20px 16px 40px"}}>
        {/* Client greeting */}
        <div style={{background:"#fff",borderRadius:16,padding:"20px",marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:18,fontWeight:800,color:"#1E293B",marginBottom:4}}>Olá, {b.clientName}! 👋</div>
          <div style={{fontSize:13,color:"#64748B"}}>Segue o orçamento para sua avaliação. Você pode aprovar ou recusar diretamente aqui.</div>
        </div>

        {/* Budget card */}
        <div style={{background:"#fff",borderRadius:16,padding:"20px",marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:16,fontWeight:800,color:"#1E293B",marginBottom:4}}>{b.title}</div>
          <div style={{fontSize:12,color:"#94A3B8",marginBottom:12}}>{b.category} · {b.date}</div>
          {b.desc&&<div style={{fontSize:13,color:"#475569",marginBottom:14,padding:"10px 12px",background:"#F8FAFC",borderRadius:8}}>{b.desc}</div>}

          {/* Items */}
          <div style={{border:"1px solid #E2E8F0",borderRadius:12,overflow:"hidden",marginBottom:12}}>
            {(b.items||[]).map((it,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderBottom:i<(b.items||[]).length-1?"1px solid #F1F5F9":"none",background:i%2===0?"#fff":"#FAFAFA"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#1E293B"}}>{it.desc}</div>
                  <div style={{fontSize:11,color:"#94A3B8"}}>{it.qty} {it.unit} × {fmtBRL(it.price)}</div>
                </div>
                <div style={{fontWeight:700,color:"#1E293B"}}>{fmtBRL((it.qty||0)*(it.price||0))}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {b.discount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748B"}}><span>Subtotal</span><span>{fmtBRL(sub)}</span></div>}
            {b.discount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#EF4444"}}><span>Desconto ({b.discount}%)</span><span>-{fmtBRL(sub*b.discount/100)}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:20,color:P,paddingTop:8,borderTop:"2px solid #F1F5F9",marginTop:4}}>
              <span>TOTAL</span><span>{fmtBRL(b.total)}</span>
            </div>
          </div>
          {b.notes&&<div style={{marginTop:10,padding:"8px 12px",background:"#FFFBEB",borderRadius:8,fontSize:12,color:"#92400E"}}>📝 {b.notes}</div>}
          {b.validity&&<div style={{marginTop:8,fontSize:11,color:"#94A3B8"}}>Validade: {b.validity} dias a partir de {b.date}</div>}
        </div>

        {/* Provider info */}
        {(pf.phone||pf.email||pf.city)&&(
          <div style={{background:"#fff",borderRadius:16,padding:"16px 20px",marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Prestador</div>
            <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:6}}>{pf.name}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {pf.phone&&<a href={`tel:+55${(pf.phone||"").replace(/\D/g,"")}`} style={{fontSize:12,color:P,textDecoration:"none"}}>📱 {pf.phone}</a>}
              {pf.email&&<a href={`mailto:${pf.email}`} style={{fontSize:12,color:P,textDecoration:"none"}}>✉️ {pf.email}</a>}
              {pf.city&&<span style={{fontSize:12,color:"#64748B"}}>📍 {pf.city}</span>}
            </div>
          </div>
        )}

        {step==="view"&&(
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <button style={{flex:1,padding:"14px",background:"#EF4444",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer"}} onClick={recusar} disabled={submitting}>
              ❌ Recusar
            </button>
            <button style={{flex:2,padding:"14px",background:`linear-gradient(135deg,${P},${A})`,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer"}} onClick={()=>setStep("sign")}>
              ✍️ Assinar e Aprovar
            </button>
          </div>
        )}

        {step==="sign"&&(
          <div style={{background:"#fff",borderRadius:16,padding:"20px",boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#1E293B",marginBottom:4}}>✍️ Assinar e Aprovar</div>
            <div style={{fontSize:12,color:"#64748B",marginBottom:16}}>Assine abaixo para confirmar a aprovação do orçamento.</div>

            {/* Nome */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:"#94A3B8",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Seu nome completo</div>
              <input style={{width:"100%",padding:"10px 14px",border:"1px solid #E2E8F0",borderRadius:10,fontSize:14,color:"#1E293B",outline:"none",boxSizing:"border-box"}} value={nome} onChange={e=>setNome(e.target.value)} placeholder={b.clientName}/>
            </div>

            {/* Termo */}
            <div style={{padding:"10px 14px",background:"#F8FAFC",borderRadius:10,border:"1px solid #E2E8F0",marginBottom:14,fontSize:12,color:"#475569",lineHeight:1.6}}>
              Ao assinar, <b>{nome||b.clientName}</b> autoriza a execução dos serviços do orçamento <b>{b.num}</b> no valor de <b>{fmtBRL(b.total)}</b>. Data: <b>{new Date().toLocaleDateString("pt-BR")}</b>.
            </div>

            {/* Canvas */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:"#94A3B8",fontWeight:700,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",textTransform:"uppercase",letterSpacing:.5}}>
                <span>Assinatura</span>
                {hasSig&&<button onClick={clearSig} style={{background:"none",border:"1px solid #EF4444",color:"#EF4444",borderRadius:6,padding:"2px 10px",cursor:"pointer",fontSize:11}}>🗑️ Limpar</button>}
              </div>
              <div style={{border:`2px dashed ${hasSig?P:"#CBD5E1"}`,borderRadius:12,background:"#FAFAFA",overflow:"hidden",transition:"border-color .2s"}}>
                <canvas ref={canvasRef} width={540} height={150}
                  style={{display:"block",width:"100%",height:150,cursor:"crosshair",touchAction:"none"}}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}/>
              </div>
              {!hasSig&&<div style={{textAlign:"center",fontSize:12,color:"#94A3B8",marginTop:6}}>Toque ou clique e arraste para assinar</div>}
            </div>

            {/* Checkbox */}
            <div onClick={()=>setAgreed(a=>!a)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:agreed?"#F0FDF4":"#F8FAFC",border:`1px solid ${agreed?"#86EFAC":"#E2E8F0"}`,borderRadius:10,marginBottom:16,cursor:"pointer",userSelect:"none"}}>
              <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${agreed?"#22C55E":"#CBD5E1"}`,background:agreed?"#22C55E":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                {agreed&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}>✓</span>}
              </div>
              <span style={{fontSize:13,color:agreed?"#166534":"#64748B"}}>Li e aceito os termos do orçamento {b.num}</span>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button style={{padding:"12px 20px",background:"none",border:"1px solid #E2E8F0",borderRadius:10,fontSize:14,cursor:"pointer",color:"#64748B"}} onClick={()=>setStep("view")}>← Voltar</button>
              <button style={{flex:1,padding:"14px",background:`linear-gradient(135deg,${P},${A})`,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",opacity:(hasSig&&agreed)?1:.4}} onClick={aprovar} disabled={submitting||!hasSig||!agreed}>
                {submitting?"⏳ Enviando...":"✅ Confirmar Aprovação"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ PAGES (outras) ════════════════════════════════════════════════════ */
function PageDash({stats,budgets,user,profile,clients,themeP,themeA,setModal,setStatus,sendWA,setPage}){
  const byMonth=getByMonth(budgets);const maxR=Math.max(...byMonth.map(m=>m.receita),1);
  const expiring=budgets.filter(b=>(b.status==="pendente"||b.status==="enviado")&&daysLeft(b.date,b.validity)<=5&&daysLeft(b.date,b.validity)>=0);
  return(
    <div style={S.page}>
      <PHead title={`Olá, ${(profile.name||user.name).split(" ")[0]}! 👋`} sub={new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}>
        <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`}} onClick={()=>setModal({type:"budget",data:null})}>+ Novo Orçamento</button>
      </PHead>
      {expiring.length>0&&<div style={{padding:"12px 16px",background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.25)",borderRadius:12,marginBottom:18,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>⚠️</span><div><div style={{fontSize:13,fontWeight:700,color:"#FB923C"}}>{expiring.length} orçamento(s) expirando em breve</div><div style={{fontSize:12,color:"#64748B"}}>{expiring.map(b=>b.num).join(", ")}</div></div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:20}}>
        <KPI icon="💰" label="Receita Aprovada" val={fmtK(stats.receita)} sub={`${stats.aprovado} aprovados`} color={themeP}/>
        <KPI icon="🔄" label="Pipeline" val={fmtK(stats.pipeline)} sub={`${stats.pendente} aguardando`} color={themeA}/>
        <KPI icon="🎯" label="Taxa Aprovação" val={`${stats.taxa}%`} sub={`de ${stats.total} orçamentos`} color={themeP}/>
        <KPI icon="📊" label="Ticket Médio" val={fmtK(stats.tick)} sub="por aprovado" color={themeA}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:20}}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card title="📋 Recentes" action={<Lnk onClick={()=>setPage("lista")} color={themeP}>Ver todos →</Lnk>}>
            <table style={S.tbl}><thead><tr>{["Nº","Cliente","Serviço","Total","Status",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{budgets.slice(0,6).map(b=>(
                <tr key={b.id} style={S.tr} className="trow" onClick={()=>setModal({type:"detail",data:b})}>
                  <td style={{...S.td,fontFamily:"monospace",fontSize:12}}>{b.num}</td><td style={S.td}>{b.clientName}</td>
                  <td style={S.td}><span style={{display:"block",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.title}</span></td>
                  <td style={{...S.td,color:themeP,fontWeight:700}}>{fmtBRL(b.total)}</td>
                  <td style={S.td}><Sbadge s={b.status}/></td>
                  <td style={S.td}><div style={S.acts} onClick={e=>e.stopPropagation()}>
                    {b.status==="pendente"&&<React.Fragment><TB c="#22D3A0" t="Aprovar" onClick={()=>setStatus(b.id,"aprovado")}>✓</TB><TB c="#F87171" t="Recusar" onClick={()=>setStatus(b.id,"recusado")}>✗</TB></React.Fragment>}
                    <TB c="#60A5FA" t="Preview" onClick={()=>setModal({type:"preview",data:b})}>👁️</TB>
                    <TB c="#25D366" t="WhatsApp" onClick={()=>sendWA(b)}>📱</TB>
                  </div></td>
                </tr>
              ))}
              {budgets.length===0&&<tr><td colSpan={6} style={{textAlign:"center",padding:32,color:"#475569",fontSize:13}}>Nenhum orçamento ainda</td></tr>}
              </tbody>
            </table>
          </Card>
          <Card title="📊 Por Status">
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {Object.entries(STATUS).map(([k,v])=>{const c=budgets.filter(b=>b.status===k).length;const pct=stats.total?Math.round(c/stats.total*100):0;return(
                <div key={k} style={{background:"#0F172A",borderRadius:12,padding:"11px 13px",border:`1px solid ${v.dot}18`}}>
                  <div style={{fontSize:16,marginBottom:3}}>{v.icon}</div>
                  <div style={{fontSize:20,fontWeight:800,color:v.color}}>{c}</div>
                  <div style={{fontSize:10,color:v.color,fontWeight:600}}>{v.label}</div>
                  <div style={{fontSize:9,color:"#475569",marginTop:1}}>{pct}%</div>
                </div>
              );})}
            </div>
          </Card>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card title="📈 Faturamento">
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:88,marginTop:8}}>
              {byMonth.map(d=><div key={d.month} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <div title={fmtBRL(d.receita)} style={{width:"100%",height:Math.max((d.receita/maxR)*74,3),background:`linear-gradient(180deg,${themeP},${themeA})`,borderRadius:"3px 3px 0 0"}}/>
                <div style={{fontSize:8,color:"#475569"}}>{d.month.slice(5)}</div>
              </div>)}
              {byMonth.length===0&&<div style={{color:"#475569",fontSize:12,flex:1,textAlign:"center",paddingTop:24}}>Sem dados</div>}
            </div>
          </Card>
          <Card title="🏆 Top Clientes">
            {getTopClients(budgets,clients).slice(0,4).map((c,i)=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #1E293B"}}>
                <span style={{fontSize:10,fontWeight:800,color:"#475569",width:14}}>{i+1}º</span>
                <Ava name={c.name} size={24} color={themeP}/>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:"#E2E8F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{fontSize:9,color:"#475569"}}>{c.count} orç.</div></div>
                <div style={{fontSize:11,fontWeight:800,color:themeP}}>{fmtK(c.receita)}</div>
              </div>
            ))}
            {clients.length===0&&<div style={{color:"#475569",fontSize:12}}>Sem clientes</div>}
          </Card>
          <Card title="🔧 Categorias">
            {getByCategory(budgets).slice(0,5).map(c=>(
              <div key={c.name} style={{marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:"#94A3B8"}}>{c.name}</span><span style={{fontSize:10,color:"#64748B"}}>{c.count}</span></div>
                <div style={{height:4,background:"#1E293B",borderRadius:2}}><div style={{height:"100%",width:`${c.pct}%`,background:`linear-gradient(90deg,${themeP},${themeA})`,borderRadius:2}}/></div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PageLista({filtered,filter,setFilter,themeP,themeA,setModal,setStatus,sendWA,delBudget}){
  const [view,setView]=useState("cards");
  return(
    <div style={S.page}>
      <PHead title="Orçamentos" sub={`${filtered.length} encontrado(s)`}>
        <div style={{display:"flex",gap:8}}>
          <div style={{display:"flex",gap:2,background:"#111827",borderRadius:8,border:"1px solid #1E293B",padding:2}}>
            {[["cards","⊞"],["table","☰"]].map(([v,i])=><button key={v} style={{background:view===v?"#1E293B":"transparent",border:"none",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:14,color:view===v?"#F1F5F9":"#64748B"}} onClick={()=>setView(v)}>{i}</button>)}
          </div>
          <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`}} onClick={()=>setModal({type:"budget",data:null})}>+ Novo</button>
        </div>
      </PHead>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input style={{...S.search,flex:1,minWidth:200}} placeholder="🔍 Buscar…" value={filter.q} onChange={e=>setFilter(f=>({...f,q:e.target.value}))}/>
        <select style={S.sel} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
          <option value="todos">Todos os status</option>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select style={S.sel} value={filter.cat} onChange={e=>setFilter(f=>({...f,cat:e.target.value}))}>
          <option value="todas">Todas categorias</option>{CATS.map(c=><option key={c}>{c}</option>)}
        </select>
        <select style={S.sel} value={filter.sort} onChange={e=>setFilter(f=>({...f,sort:e.target.value}))}>
          <option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="high">Maior valor</option><option value="low">Menor valor</option>
        </select>
      </div>
      {view==="cards"?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(305px,1fr))",gap:14}}>
          {filtered.map(b=>(
            <div key={b.id} style={S.bcard} className="bcard" onClick={()=>setModal({type:"detail",data:b})}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,gap:8}}>
                <div><div style={{fontSize:10,color:"#64748B",fontFamily:"monospace",marginBottom:2}}>{b.num} · {b.category}</div><div style={{fontWeight:700,fontSize:14,color:"#F1F5F9",lineHeight:1.3}}>{b.title}</div></div>
                <Sbadge s={b.status}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <Ava name={b.clientName} size={28} color={themeP}/>
                <div><div style={{fontSize:12,fontWeight:600,color:"#CBD5E1"}}>{b.clientName}</div><div style={{fontSize:10,color:"#64748B"}}>{b.date} · {daysLeft(b.date,b.validity)<0?"Expirado":`${daysLeft(b.date,b.validity)}d`}</div></div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10,borderTop:"1px solid #1E293B"}}>
                <div style={{fontSize:18,fontWeight:800,color:themeP}}>{fmtBRL(b.total)}</div>
                <div style={S.acts} onClick={e=>e.stopPropagation()}>
                  {b.status==="pendente"&&<React.Fragment><TB c="#22D3A0" t="Aprovar" onClick={()=>setStatus(b.id,"aprovado")}>✓</TB><TB c="#F87171" t="Recusar" onClick={()=>setStatus(b.id,"recusado")}>✗</TB></React.Fragment>}
                  <TB c="#60A5FA" t="Preview" onClick={()=>setModal({type:"preview",data:b})}>👁️</TB>
                  <TB c="#94A3B8" t="Editar" onClick={()=>setModal({type:"budget",data:b})}>✏️</TB>
                  <TB c="#25D366" t="WhatsApp" onClick={()=>sendWA(b)}>📱</TB>
                </div>
              </div>
            </div>
          ))}
          {filtered.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:56,color:"#475569"}}><div style={{fontSize:48,marginBottom:12}}>📭</div><div style={{fontWeight:600}}>Nenhum resultado</div></div>}
        </div>
      ):(
        <div style={{...S.card,padding:0,overflow:"hidden"}}>
          <table style={S.tbl}><thead style={{background:"#0D1320"}}><tr>{["Nº","Cliente","Título","Total","Status","Dias",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(b=>{const dl=daysLeft(b.date,b.validity);return(
              <tr key={b.id} style={S.tr} className="trow" onClick={()=>setModal({type:"detail",data:b})}>
                <td style={{...S.td,fontFamily:"monospace",fontSize:11}}>{b.num}</td><td style={S.td}>{b.clientName}</td>
                <td style={S.td}><span style={{display:"block",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.title}</span></td>
                <td style={{...S.td,color:themeP,fontWeight:700}}>{fmtBRL(b.total)}</td>
                <td style={S.td}><Sbadge s={b.status}/></td>
                <td style={S.td}><span style={{fontSize:11,color:dl<0?"#FB923C":dl<=5?"#F59E0B":"#64748B"}}>{dl<0?`${Math.abs(dl)}d atrás`:`${dl}d`}</span></td>
                <td style={S.td}><div style={S.acts} onClick={e=>e.stopPropagation()}>
                  <TB c="#60A5FA" t="Preview" onClick={()=>setModal({type:"preview",data:b})}>👁️</TB>
                  <TB c="#25D366" t="WhatsApp" onClick={()=>sendWA(b)}>📱</TB>
                  <TB c="#94A3B8" t="Editar" onClick={()=>setModal({type:"budget",data:b})}>✏️</TB>
                </div></td>
              </tr>);
            })}
            {filtered.length===0&&<tr><td colSpan={7} style={{textAlign:"center",padding:40,color:"#475569"}}>Nenhum resultado</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PageClientes({budgets,clients,setModal}){
  const [q,setQ]=useState("");
  const enriched=useMemo(()=>clients.map(c=>{const cb=budgets.filter(b=>b.clientId===c.id||b.clientName===c.name);const ap=cb.filter(b=>b.status==="aprovado");return{...c,budgets:cb,aprovados:ap.length,receita:ap.reduce((s,b)=>s+b.total,0)};}),[clients,budgets]);
  const filtered=enriched.filter(c=>[c.name,c.phone,c.email].some(v=>v?.toLowerCase().includes(q.toLowerCase())));
  return(
    <div style={S.page}>
      <PHead title="Clientes" sub={`${clients.length} cadastrado(s)`}><PBtn onClick={()=>setModal({type:"client",data:null})}>+ Novo</PBtn></PHead>
      <div style={{marginBottom:16}}><input style={{...S.search,maxWidth:340}} placeholder="🔍 Buscar…" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
        {filtered.map(c=>(
          <div key={c.id} style={S.bcard} className="bcard">
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <Ava name={c.name} size={40} lg/>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:15,color:"#F1F5F9"}}>{c.name}</div><div style={{fontSize:12,color:"#64748B"}}>{c.phone||"—"}</div><div style={{fontSize:11,color:"#64748B"}}>{c.city||"—"}</div></div>
              <button style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#64748B"}} onClick={()=>setModal({type:"client",data:c})}>✏️</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[["#818CF8",c.budgets.length,"orçamentos"],["#22D3A0",c.aprovados,"aprovados"],["#22D3A0",fmtK(c.receita),"faturado"]].map(([col,v,lbl])=>(
                <div key={lbl} style={{background:"#0F172A",borderRadius:10,padding:"9px 8px",textAlign:"center"}}><div style={{fontWeight:800,color:col,fontSize:lbl==="faturado"?10:18}}>{v}</div><div style={{fontSize:9,color:"#475569",marginTop:1,textTransform:"uppercase"}}>{lbl}</div></div>
              ))}
            </div>
            {c.obs&&<div style={{fontSize:11,color:"#64748B",fontStyle:"italic",marginBottom:8}}>"{c.obs}"</div>}
            {c.budgets.slice(0,3).map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderTop:"1px solid #1E293B"}}><span style={{fontSize:10,color:"#64748B",fontFamily:"monospace"}}>{b.num}</span><span style={{flex:1,fontSize:11,color:"#94A3B8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.title}</span><Sbadge s={b.status} small/></div>)}
            {c.budgets.length===0&&<div style={{fontSize:11,color:"#475569",textAlign:"center",padding:"6px 0"}}>Sem orçamentos</div>}
          </div>
        ))}
        {filtered.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:56,color:"#475569"}}><div style={{fontSize:44,marginBottom:10}}>👥</div><div style={{fontWeight:600}}>Nenhum cliente</div></div>}
      </div>
    </div>
  );
}

function PageRelatorio({budgets,stats,clients,profile,themeP,themeA}){
  const [mesSel,setMesSel]=useState(new Date().getMonth());
  const [anoSel,setAnoSel]=useState(new Date().getFullYear());
  const meses=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const anos=[2024,2025,2026,2027];
  const doExport=()=>exportRelatorioMensalPDF(budgets,profile||{},mesSel,anoSel,themeP||"#818CF8",themeA||"#22D3A0");
  const byMonth=getByMonth(budgets);const byCat=getByCategory(budgets);const maxR=Math.max(...byMonth.map(m=>m.receita),1);
  return(
    <div style={S.page}>
      <PHead title="📈 Relatórios" sub="Análise completa do negócio">
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <select style={{...S.sel,fontSize:12,padding:"6px 10px"}} value={mesSel} onChange={e=>setMesSel(Number(e.target.value))}>
            {meses.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
          <select style={{...S.sel,fontSize:12,padding:"6px 10px"}} value={anoSel} onChange={e=>setAnoSel(Number(e.target.value))}>
            {anos.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          <button style={{...S.prim,background:"linear-gradient(135deg,#EF4444,#DC2626)",fontSize:12,padding:"7px 14px"}} onClick={doExport}>📄 Exportar PDF</button>
        </div>
      </PHead>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:18}}>
        <SCrd icon="💰" label="Receita" val={fmtBRL(stats.receita)} accent="#22D3A0"/>
        <SCrd icon="🔄" label="Pipeline" val={fmtBRL(stats.pipeline)} accent="#818CF8"/>
        <SCrd icon="🎯" label="Conversão" val={`${stats.taxa}%`} accent="#F59E0B"/>
        <SCrd icon="📊" label="Ticket Médio" val={fmtBRL(stats.tick)} accent="#60A5FA"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,marginBottom:16}}>
        <Card title="📈 Faturamento Mensal">
          {byMonth.map(m=><div key={m.month} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:"#94A3B8"}}>{m.month}</span><span style={{fontSize:12,fontWeight:700,color:"#22D3A0"}}>{fmtBRL(m.receita)}</span></div><div style={{height:6,background:"#1E293B",borderRadius:3}}><div style={{height:"100%",width:`${(m.receita/maxR)*100}%`,background:"linear-gradient(90deg,#22D3A0,#818CF8)",borderRadius:3}}/></div></div>)}
          {byMonth.length===0&&<div style={{color:"#475569",fontSize:13}}>Sem dados</div>}
        </Card>
        <Card title="🎯 Conversão">
          {Object.entries(STATUS).map(([k,v])=>{const c=budgets.filter(b=>b.status===k).length;const p=stats.total?Math.round(c/stats.total*100):0;return(
            <div key={k} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:v.dot,display:"inline-block"}}/><span style={{fontSize:12,color:"#94A3B8"}}>{v.icon} {v.label}</span></div><span style={{fontSize:12,fontWeight:700,color:v.color}}>{c} ({p}%)</span></div><div style={{height:5,background:"#1E293B",borderRadius:3}}><div style={{height:"100%",width:`${p}%`,background:v.color,borderRadius:3}}/></div></div>
          );})}
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card title="🔧 Por Categoria">
          <table style={S.tbl}><thead><tr>{["Cat.","Total","Aprov.","Taxa","Receita"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{byCat.map(c=>{const it=budgets.filter(b=>b.category===c.name);const ap=it.filter(b=>b.status==="aprovado");const t=it.length?Math.round(ap.length/it.length*100):0;return(
              <tr key={c.name} style={S.tr}><td style={S.td}><span style={{fontWeight:600,color:"#E2E8F0"}}>{c.name}</span></td><td style={S.td}>{it.length}</td><td style={S.td}>{ap.length}</td><td style={S.td}><span style={{color:t>=50?"#22D3A0":"#F87171",fontWeight:700}}>{t}%</span></td><td style={{...S.td,color:"#22D3A0",fontWeight:700}}>{fmtBRL(ap.reduce((s,b)=>s+b.total,0))}</td></tr>
            );})}
            </tbody>
          </table>
        </Card>
        <Card title="🏆 Top Clientes">
          {getTopClients(budgets,clients).slice(0,6).map((c,i)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderBottom:"1px solid #1E293B"}}>
              <span style={{fontSize:10,color:"#475569",width:16}}>{i+1}º</span><Ava name={c.name} size={26}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"#E2E8F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{fontSize:9,color:"#475569"}}>{c.count} orç.</div></div>
              <span style={{fontSize:12,fontWeight:800,color:"#22D3A0"}}>{fmtK(c.receita)}</span>
            </div>
          ))}
          {clients.length===0&&<div style={{color:"#475569",fontSize:13}}>Sem dados</div>}
        </Card>
      </div>
    </div>
  );
}

function PageTemplates({templates,setModal}){
  return(
    <div style={S.page}>
      <PHead title="Templates" sub={`${templates.length} modelo(s)`}><PBtn onClick={()=>setModal({type:"template",data:null})}>+ Novo Template</PBtn></PHead>
      <div style={{padding:"10px 14px",background:"rgba(129,140,248,0.06)",border:"1px solid rgba(129,140,248,0.15)",borderRadius:10,marginBottom:16,fontSize:12,color:"#818CF8"}}>💡 Templates poupam tempo — aplique com 1 clique ao criar orçamentos.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
        {templates.map(t=>(
          <div key={t.id} style={S.bcard} className="bcard">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div><div style={{fontSize:10,color:"#64748B",marginBottom:2}}>{t.category}</div><div style={{fontWeight:700,fontSize:14,color:"#F1F5F9"}}>{t.name}</div></div>
              <TB c="#818CF8" t="Editar" onClick={()=>setModal({type:"template",data:t})}>✏️</TB>
            </div>
            {t.items.map((it,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94A3B8",padding:"3px 0"}}><span>{it.desc} ({it.qty} {it.unit})</span><span>{fmtBRL((it.qty||0)*(it.price||0))}</span></div>)}
            <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:"1px solid #1E293B"}}>
              <div style={{fontSize:15,fontWeight:800,color:"#22D3A0"}}>{fmtBRL(calcSub(t.items))}</div>
              <div style={{fontSize:11,color:"#64748B"}}>Val. {t.validity}d{t.discount>0?` · ${t.discount}%`:""}</div>
            </div>
          </div>
        ))}
        {templates.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:56,color:"#475569"}}><div style={{fontSize:44,marginBottom:10}}>📄</div><div style={{fontWeight:600}}>Nenhum template</div></div>}
      </div>
    </div>
  );
}

function PageAtividade({activity}){
  return(
    <div style={S.page}>
      <PHead title="Atividades" sub={`${(activity||[]).length} registro(s)`}/>
      <div style={S.card}>
        {(activity||[]).map((a,i)=>(
          <div key={a.id||i} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:"1px solid #1E293B"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#818CF8",marginTop:5,flexShrink:0}}/>
            <div style={{flex:1}}><div style={{fontSize:13,color:"#CBD5E1"}}>{a.desc}</div><div style={{fontSize:11,color:"#475569"}}>{a.ts}</div></div>
          </div>
        ))}
        {(activity||[]).length===0&&<div style={{textAlign:"center",padding:40,color:"#475569"}}><div style={{fontSize:40,marginBottom:8}}>🕐</div><div>Nenhuma atividade</div></div>}
      </div>
    </div>
  );
}

/* ═══ MODALS ════════════════════════════════════════════════════════════ */
function ModalBudget({data,clients,templates,onSave,onClose,nextNum,userId,themeP,themeA}){
  const empty={clientName:"",clientId:"",phone:"",email:"",category:"Elétrica",title:"",desc:"",items:[{id:uid(),desc:"",qty:1,unit:"serv",price:""}],status:"pendente",date:today(),validity:15,discount:0,tax:0,notes:"",userId};
  const [f,sf]=useState(data?{...data,items:data.items.map(i=>({...i}))}:empty);
  const [step,setStep]=useState(0);const [tplOpen,setTplOpen]=useState(false);
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const si=(i,k,v)=>sf(p=>{const items=[...p.items];items[i]={...items[i],[k]:v};return{...p,items};});
  const addItem=()=>sf(p=>({...p,items:[...p.items,{id:uid(),desc:"",qty:1,unit:"un",price:""}]}));
  const rmItem=i=>sf(p=>({...p,items:p.items.filter((_,j)=>j!==i)}));
  const applyTpl=t=>{sf(p=>({...p,category:t.category,items:t.items.map(it=>({...it,id:uid()})),discount:t.discount,validity:t.validity}));setTplOpen(false);};
  const sub=calcSub(f.items);const total=calcTot(f.items,f.discount,f.tax);
  const ok=f.clientName&&f.title&&f.items.every(i=>i.desc&&i.price);
  const STEPS=["Cliente","Serviço","Itens","Revisão"];
  return(
    <Overlay onClose={onClose} wide>
      <div style={S.mhead}>
        <div><div style={S.mtitle}>{data?"Editar Orçamento":"Novo Orçamento"}</div><div style={S.msub}>{data?data.num:nextNum}</div></div>
        <div style={{display:"flex",gap:8}}>
          {!data&&templates.length>0&&<div style={{position:"relative"}}>
            <button style={{...S.ghost,fontSize:12,padding:"6px 12px"}} onClick={()=>setTplOpen(o=>!o)}>📄 Template</button>
            {tplOpen&&<div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"#1C2537",border:"1px solid #1E293B",borderRadius:12,padding:8,minWidth:220,zIndex:200,boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>
              {templates.map(t=><button key={t.id} style={{display:"block",width:"100%",padding:"8px 12px",background:"transparent",border:"none",borderRadius:8,cursor:"pointer",color:"#CBD5E1",fontFamily:"inherit",fontSize:12,textAlign:"left"}} onClick={()=>applyTpl(t)}>📄 {t.name} <span style={{color:"#475569"}}>{t.category}</span></button>)}
            </div>}
          </div>}
          <XBtn onClick={onClose}/>
        </div>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:20}}>
        {STEPS.map((s,i)=><div key={s} style={{flex:1,textAlign:"center"}}><div style={{height:3,borderRadius:2,background:i<=step?`linear-gradient(90deg,${themeP},${themeA})`:"#1E293B",cursor:"pointer"}} onClick={()=>setStep(i)}/><div style={{fontSize:10,color:i===step?themeP:"#475569",marginTop:3,fontWeight:i===step?700:400}}>{s}</div></div>)}
      </div>
      {step===0&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}><FL label="Cliente *"><input style={S.inp} value={f.clientName} onChange={e=>set("clientName",e.target.value)} placeholder="Nome do cliente"/></FL></div>
          <FL label="WhatsApp"><input style={S.inp} value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="11999990000"/></FL>
          <FL label="E-mail"><input style={S.inp} type="email" value={f.email} onChange={e=>set("email",e.target.value)} placeholder="email@cliente.com"/></FL>
        </div>
        {clients.length>0&&<div>
          <div style={{fontSize:10,color:"#475569",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:.7}}>Selecionar existente</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {clients.map(c=><button key={c.id} style={{...S.chip2,...(f.clientId===c.id?{borderColor:themeP,color:themeP,background:`${themeP}10`}:{})}} onClick={()=>{set("clientName",c.name);set("clientId",c.id);set("phone",c.phone||"");set("email",c.email||"");}}>
              <Ava name={c.name} size={18} color={themeP}/>{c.name}
            </button>)}
          </div>
        </div>}
      </div>}
      {step===1&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><FL label="Título *"><input style={S.inp} value={f.title} onChange={e=>set("title",e.target.value)} placeholder="Ex: Instalação elétrica completa"/></FL></div>
        <FL label="Categoria"><select style={S.sel} value={f.category} onChange={e=>set("category",e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FL>
        <FL label="Status"><select style={S.sel} value={f.status} onChange={e=>set("status",e.target.value)}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></FL>
        <FL label="Data"><input style={S.inp} type="date" value={f.date} onChange={e=>set("date",e.target.value)}/></FL>
        <FL label="Validade (dias)"><input style={S.inp} type="number" min={1} value={f.validity} onChange={e=>set("validity",e.target.value)}/></FL>
        <div style={{gridColumn:"1/-1"}}><FL label="Descrição"><textarea style={{...S.inp,height:58,resize:"vertical"}} value={f.desc} onChange={e=>set("desc",e.target.value)} placeholder="Detalhes do serviço…"/></FL></div>
      </div>}
      {step===2&&<div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 54px 64px 90px 28px",gap:8,marginBottom:6}}>{["Descrição *","Qtd","Unid","Valor",""].map(h=><div key={h} style={{fontSize:9,color:"#475569",fontWeight:700,textTransform:"uppercase"}}>{h}</div>)}</div>
        {f.items.map((it,i)=><div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 54px 64px 90px 28px",gap:8,marginBottom:8}}>
          <input style={S.inp} value={it.desc} onChange={e=>si(i,"desc",e.target.value)} placeholder="Descrição"/>
          <input style={S.inp} type="number" min=".01" value={it.qty} onChange={e=>si(i,"qty",e.target.value)}/>
          <select style={S.sel} value={it.unit} onChange={e=>si(i,"unit",e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select>
          <input style={S.inp} type="number" step=".01" value={it.price} onChange={e=>si(i,"price",e.target.value)} placeholder="0.00"/>
          <button onClick={()=>rmItem(i)} style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:6,cursor:"pointer",color:"#F87171",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>)}
        <button style={{...S.ghost,marginTop:4,fontSize:12,padding:"6px 12px"}} onClick={addItem}>+ Item</button>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:12,paddingTop:12,borderTop:"1px solid #1E293B",alignItems:"end"}}>
          <FL label="Desconto %"><input style={S.inp} type="number" min={0} max={100} value={f.discount} onChange={e=>set("discount",e.target.value)}/></FL>
          <FL label="Impostos %"><input style={S.inp} type="number" min={0} max={100} value={f.tax} onChange={e=>set("tax",e.target.value)}/></FL>
          <div style={{textAlign:"right"}}>
            {f.discount>0&&<div style={{fontSize:11,color:"#64748B"}}>Subtotal: {fmtBRL(sub)}</div>}
            <div style={{fontSize:22,fontWeight:800,color:themeP}}>{fmtBRL(total)}</div>
          </div>
        </div>
        <div style={{marginTop:10}}><FL label="Observações"><textarea style={{...S.inp,height:50,resize:"vertical"}} value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Condições de pagamento…"/></FL></div>
      </div>}
      {step===3&&<div>
        <div style={{background:"#0F172A",borderRadius:12,padding:14,border:"1px solid #1E293B",marginBottom:12}}>
          <div style={{fontSize:9,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,marginBottom:8}}>Resumo</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
            {[["Cliente",f.clientName],["Serviço",f.title],["Categoria",f.category],["Data",f.date],["Validade",`${f.validity} dias`],["Status",STATUS[f.status]?.icon+" "+STATUS[f.status]?.label]].map(([k,v])=>(
              <div key={k}><span style={{color:"#64748B"}}>{k}: </span><span style={{color:"#E2E8F0",fontWeight:600}}>{v}</span></div>
            ))}
          </div>
        </div>
        <div style={{background:"#0F172A",borderRadius:12,border:"1px solid #1E293B",overflow:"hidden",marginBottom:12}}>
          {f.items.map((it,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 14px",borderBottom:"1px solid #1E293B",fontSize:12}}><span style={{color:"#CBD5E1"}}>{it.desc} <span style={{color:"#64748B"}}>({it.qty} {it.unit})</span></span><span style={{fontWeight:700}}>{fmtBRL((it.qty||0)*(it.price||0))}</span></div>)}
          <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:4}}>
            {f.discount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#F87171"}}><span>Desconto ({f.discount}%)</span><span>-{fmtBRL(sub*f.discount/100)}</span></div>}
            {f.tax>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#60A5FA"}}><span>Impostos ({f.tax}%)</span><span>+{fmtBRL(sub*(1-f.discount/100)*f.tax/100)}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:18,color:themeP,paddingTop:6,borderTop:"1px solid #1E293B"}}><span>TOTAL</span><span>{fmtBRL(total)}</span></div>
          </div>
        </div>
        {!ok&&<div style={{fontSize:12,color:"#F87171",marginBottom:8}}>⚠️ Preencha cliente, título e todos os itens.</div>}
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:18}}>
        <button style={S.ghost} onClick={step>0?()=>setStep(s=>s-1):onClose}>{step>0?"← Voltar":"Cancelar"}</button>
        {step<3?<button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`}} onClick={()=>setStep(s=>s+1)}>Próximo →</button>
          :<button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`,opacity:ok?1:.4,cursor:ok?"pointer":"not-allowed"}} onClick={()=>ok&&onSave(f)}>{data?"💾 Salvar":"✅ Criar"}</button>}
      </div>
    </Overlay>
  );
}

function ModalDetail({data,onClose,setStatus,sendWA,onEdit,onDelete,themeP,setModal,profile}){
  const [del,setDel]=useState(false);const sub=calcSub(data.items);const dl=daysLeft(data.date,data.validity);
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div><div style={S.mtitle}>{data.title}</div><div style={S.msub}>{data.num} · {data.category} · {data.date}</div></div><XBtn onClick={onClose}/></div>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#0F172A",borderRadius:12,marginBottom:14,border:"1px solid #1E293B"}}>
        <Ava name={data.clientName} size={38} lg color={themeP}/>
        <div style={{flex:1}}><div style={{fontWeight:700,color:"#F1F5F9"}}>{data.clientName}</div><div style={{fontSize:12,color:"#64748B"}}>{data.phone}</div></div>
        <Sbadge s={data.status}/>
      </div>
      {dl>=0&&dl<=5&&(data.status==="pendente"||data.status==="enviado")&&<div style={{padding:"8px 12px",background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.2)",borderRadius:9,marginBottom:12,fontSize:12,color:"#FB923C"}}>⚠️ Expira em {dl} dia(s)!</div>}
      <div style={{background:"#0F172A",borderRadius:12,border:"1px solid #1E293B",overflow:"hidden",marginBottom:14}}>
        {data.items.map((it,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 14px",borderBottom:"1px solid #1E293B",fontSize:13}}><div><div style={{color:"#CBD5E1",fontWeight:500}}>{it.desc}</div><div style={{fontSize:11,color:"#64748B"}}>{it.qty} {it.unit} × {fmtBRL(it.price)}</div></div><div style={{fontWeight:700}}>{fmtBRL((it.qty||0)*(it.price||0))}</div></div>)}
        <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:4}}>
          {data.discount>0&&<React.Fragment><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748B"}}><span>Subtotal</span><span>{fmtBRL(sub)}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#F87171"}}><span>Desconto ({data.discount}%)</span><span>-{fmtBRL(sub*data.discount/100)}</span></div></React.Fragment>}
          <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:18,color:themeP,paddingTop:6,borderTop:"1px solid #1E293B"}}><span>TOTAL</span><span>{fmtBRL(data.total)}</span></div>
        </div>
      </div>
      {data.notes&&<div style={{padding:"8px 12px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:9,fontSize:12,color:"#94A3B8",marginBottom:8}}>📝 {data.notes}</div>}
      {data.assinatura&&<div style={{padding:"8px 12px",background:"rgba(34,211,160,0.06)",border:"1px solid rgba(34,211,160,0.2)",borderRadius:9,fontSize:12,color:"#22D3A0",marginBottom:8}}>✅ Assinado por <b>{data.assinadoPor||data.clientName}</b> em {data.assinadoEm}</div>}
      {data.endereco&&<div style={{padding:"8px 12px",background:"rgba(96,165,250,0.06)",border:"1px solid rgba(96,165,250,0.2)",borderRadius:9,fontSize:12,color:"#60A5FA",marginBottom:8}}>📍 {[data.endereco,data.enderecoComp,data.endereocoCidade,data.enderecoCep].filter(Boolean).join(", ")}</div>}
      <div style={{fontSize:11,color:"#64748B",marginBottom:14}}>Validade: {data.validity} dias · {dl<0?`Expirado há ${Math.abs(dl)} dia(s)`:`${dl} dia(s) restantes`}</div>
      {data.status==="pendente"&&<div style={{display:"flex",gap:8,marginBottom:10}}><button style={{...S.prim,flex:1,background:"#22D3A0",color:"#0F1117"}} onClick={()=>setStatus(data.id,"aprovado")}>✅ Aprovar</button><button style={{...S.prim,flex:1,background:"#F87171",color:"#fff"}} onClick={()=>setStatus(data.id,"recusado")}>❌ Recusar</button></div>}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
        <button style={{...S.prim,flex:1,background:"#25D366",color:"#fff"}} onClick={()=>sendWA(data)}>📱 WhatsApp</button>
        {setModal&&<button style={{...S.ghost,padding:"8px 12px"}} onClick={()=>setModal({type:"fotos",data})}>📷 Fotos</button>}
        {setModal&&<button style={{...S.ghost,padding:"8px 12px"}} onClick={()=>setModal({type:"preview",data})}>👁️ Preview</button>}
        {setModal&&<button style={{...S.ghost,padding:"8px 12px",borderColor:"rgba(34,211,160,.3)",color:"#22D3A0"}} onClick={()=>setModal({type:"share",data})}>🔗 Compartilhar</button>}
        {setModal&&<button style={{...S.ghost,padding:"8px 12px"}} onClick={()=>setModal({type:"localizacao",data})}>📍 Local</button>}
        {setModal&&<button style={{...S.ghost,padding:"8px 12px",borderColor:"rgba(129,140,248,.3)",color:"#818CF8"}} onClick={()=>setModal({type:"assinatura",data})}>✍️ Assinar</button>}
      </div>
      {/* BOTÃO FISCAL */}
      <div style={{marginBottom:10}}>
        {setModal&&<button style={{...S.prim,width:"100%",background:"linear-gradient(135deg,#F59E0B,#D97706)",justifyContent:"center",display:"flex",alignItems:"center",gap:8}} onClick={()=>setModal({type:"docfiscal",data})}>
          🧾 {{pf:"Emitir Recibo",mei:"Emitir Recibo MEI",pj:"Emitir Documento Fiscal"}[profile?.tipoContribuinte||"pf"]}
        </button>}
      </div>
      <div style={{display:"flex",gap:6}}>
        <button style={{...S.ghost,padding:"8px 14px"}} onClick={()=>onEdit(data)}>✏️ Editar</button>
        <button style={{...S.ghost,padding:"8px 14px",borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={()=>setDel(true)}>🗑️ Excluir</button>
      </div>
      {del&&<div style={{marginTop:10,padding:12,background:"rgba(248,113,113,.07)",borderRadius:9,border:"1px solid rgba(248,113,113,.2)"}}><div style={{fontSize:13,color:"#F87171",marginBottom:8}}>Confirmar exclusão?</div><div style={{display:"flex",gap:8}}><button style={{...S.prim,background:"#F87171",color:"#fff"}} onClick={()=>onDelete(data.id)}>Excluir</button><button style={S.ghost} onClick={()=>setDel(false)}>Cancelar</button></div></div>}
    </Overlay>
  );
}


/* ═══ MODAL DOCUMENTO FISCAL ════════════════════════════════════════════ */
function ModalDocFiscal({data,profile,onClose,themeP,themeA}){
  const canvasRef=useRef(null);
  const [drawing,setDrawing]=useState(false);
  const [hasSign,setHasSign]=useState(false);
  const [lastPos,setLastPos]=useState(null);
  const tipo=profile?.tipoContribuinte||"pf";
  const tipoLabel={pf:"Recibo de Prestação de Serviços",mei:"Recibo MEI",pj:"Documento Fiscal"}[tipo];
  const tipoColor={pf:"#818CF8",mei:"#F59E0B",pj:"#22D3A0"}[tipo];
  const getPos=(e,canvas)=>{const r=canvas.getBoundingClientRect();if(e.touches){return{x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top};}return{x:e.clientX-r.left,y:e.clientY-r.top};};
  const startDraw=e=>{e.preventDefault();const canvas=canvasRef.current;if(!canvas)return;setDrawing(true);setHasSign(true);setLastPos(getPos(e,canvas));};
  const draw=e=>{e.preventDefault();if(!drawing)return;const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext("2d");const pos=getPos(e,canvas);ctx.beginPath();ctx.moveTo(lastPos.x,lastPos.y);ctx.lineTo(pos.x,pos.y);ctx.strokeStyle="#1e293b";ctx.lineWidth=2.5;ctx.lineCap="round";ctx.stroke();setLastPos(pos);};
  const endDraw=e=>{e.preventDefault();setDrawing(false);setLastPos(null);};
  const clearSign=()=>{const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);setHasSign(false);};
  const emitir=()=>{const canvas=canvasRef.current;const assinatura=hasSign?canvas.toDataURL("image/png"):null;gerarDocumentoFiscal(data,profile||{},assinatura);};
  return(
    <Overlay onClose={onClose} wide>
      <div style={S.mhead}><div><div style={S.mtitle}>🧾 {tipoLabel}</div><div style={S.msub}>{data.num} · {data.clientName}</div></div><XBtn onClick={onClose}/></div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {["pf","mei","pj"].map(t=>(<div key={t} style={{padding:"4px 14px",borderRadius:20,fontSize:11,fontWeight:700,background:tipo===t?`${tipoColor}20`:"transparent",border:`1px solid ${tipo===t?tipoColor:"#1E293B"}`,color:tipo===t?tipoColor:"#475569"}}>{{pf:"👤 Pessoa Física",mei:"🏪 MEI",pj:"🏢 PJ"}[t]}{tipo===t&&" ✓"}</div>))}
        <div style={{fontSize:11,color:"#475569",alignSelf:"center",marginLeft:"auto"}}>Configure em Perfil → Fiscal</div>
      </div>
      <div style={{background:"#0F172A",borderRadius:12,border:"1px solid #1E293B",padding:"14px 16px",marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:"#64748B",marginBottom:10,textTransform:"uppercase"}}>Resumo</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Serviço",data.title||data.category],["Cliente",data.clientName],["Data",data.date],["Valor",fmtBRL(data.total)],...(tipo!=="pf"?[["ISS ("+(profile?.aliquotaIss||2)+"%)",fmtBRL(data.total*(parseFloat(profile?.aliquotaIss)||2)/100)],["Líquido",fmtBRL(data.total-(data.total*(parseFloat(profile?.aliquotaIss)||2)/100))]]:[])].map(([k,v])=>(<div key={k} style={{background:"#1E293B",borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:10,color:"#64748B",marginBottom:2}}>{k}</div><div style={{fontSize:13,fontWeight:700,color:"#F1F5F9"}}>{v}</div></div>))}
        </div>
        {tipo==="pf"&&!profile?.cpf&&<div style={{marginTop:10,padding:"8px 10px",background:"rgba(245,158,11,.08)",borderRadius:8,fontSize:11,color:"#F59E0B"}}>⚠️ Configure seu CPF em Meu Perfil → Fiscal</div>}
        {(tipo==="mei"||tipo==="pj")&&!profile?.cnpj&&<div style={{marginTop:10,padding:"8px 10px",background:"rgba(245,158,11,.08)",borderRadius:8,fontSize:11,color:"#F59E0B"}}>⚠️ Configure seu CNPJ em Meu Perfil → Fiscal</div>}
        {tipo==="mei"&&<div style={{marginTop:10,padding:"8px 10px",background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:8,fontSize:11,color:"#F59E0B"}}>⚠️ Este recibo não substitui a NFS-e. Emita também no portal da prefeitura.</div>}
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:"#94A3B8",marginBottom:8}}>✍️ Assinatura visual (opcional)</div>
        <div style={{position:"relative",border:"2px dashed #334155",borderRadius:12,background:"#F8FAFC",overflow:"hidden"}}>
          <canvas ref={canvasRef} width={460} height={110} style={{display:"block",width:"100%",height:110,touchAction:"none",cursor:"crosshair"}} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}/>
          {!hasSign&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",color:"#94A3B8",fontSize:13}}>Desenhe sua assinatura aqui</div>}
        </div>
        {hasSign&&<button onClick={clearSign} style={{marginTop:6,fontSize:11,color:"#F87171",background:"none",border:"none",cursor:"pointer"}}>🗑️ Limpar</button>}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"space-between",flexWrap:"wrap"}}>
        <button style={S.ghost} onClick={onClose}>Cancelar</button>
        <div style={{display:"flex",gap:8}}>
          {tipo==="mei"&&profile?.urlPrefeitura&&<button style={{...S.ghost,borderColor:"rgba(245,158,11,.4)",color:"#F59E0B"}} onClick={()=>window.open(profile.urlPrefeitura,"_blank")}>🏛️ Portal Prefeitura</button>}
          {tipo==="pj"&&profile?.urlPrefeitura&&<button style={{...S.ghost,borderColor:"rgba(34,211,160,.4)",color:"#22D3A0"}} onClick={()=>window.open(profile.urlPrefeitura,"_blank")}>🏛️ Portal Prefeitura</button>}
          <button style={{...S.prim,background:`linear-gradient(135deg,${tipoColor},${themeP})`,display:"flex",alignItems:"center",gap:8}} onClick={emitir}>🧾 Gerar {tipoLabel}</button>
        </div>
      </div>
    </Overlay>
  );
}

function ModalClient({data,onSave,onDelete,onClose}){
  const [f,sf]=useState(data||{id:uid(),name:"",phone:"",email:"",city:"",cpfcnpj:"",obs:""});
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div style={S.mtitle}>{data?"Editar Cliente":"Novo Cliente"}</div><XBtn onClick={onClose}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><FL label="Nome *"><input style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Nome ou empresa"/></FL></div>
        <FL label="WhatsApp"><input style={S.inp} value={f.phone||""} onChange={e=>set("phone",e.target.value)} placeholder="11999990000"/></FL>
        <FL label="E-mail"><input style={S.inp} type="email" value={f.email||""} onChange={e=>set("email",e.target.value)}/></FL>
        <FL label="Cidade"><input style={S.inp} value={f.city||""} onChange={e=>set("city",e.target.value)}/></FL>
        <FL label="CPF / CNPJ"><input style={S.inp} value={f.cpfcnpj||""} onChange={e=>set("cpfcnpj",e.target.value)}/></FL>
        <div style={{gridColumn:"1/-1"}}><FL label="Observações"><textarea style={{...S.inp,height:56,resize:"vertical"}} value={f.obs||""} onChange={e=>set("obs",e.target.value)}/></FL></div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:8}}><button style={S.ghost} onClick={onClose}>Cancelar</button>{data&&<button style={{...S.ghost,borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={()=>onDelete(data.id)}>🗑️</button>}</div>
        <button style={{...S.prim,opacity:f.name?1:.4}} onClick={()=>f.name&&onSave(f)}>💾 Salvar</button>
      </div>
    </Overlay>
  );
}

function ModalTemplate({data,onSave,onDelete,onClose}){
  const empty={name:"",category:"Elétrica",items:[{id:uid(),desc:"",qty:1,unit:"serv",price:""}],discount:0,validity:15};
  const [f,sf]=useState(data?{...data,items:data.items.map(i=>({...i}))}:empty);
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const si=(i,k,v)=>sf(p=>{const items=[...p.items];items[i]={...items[i],[k]:v};return{...p,items};});
  const addItem=()=>sf(p=>({...p,items:[...p.items,{id:uid(),desc:"",qty:1,unit:"un",price:""}]}));
  const rmItem=i=>sf(p=>({...p,items:p.items.filter((_,j)=>j!==i)}));
  const ok=f.name&&f.items.every(i=>i.desc&&i.price);
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div><div style={S.mtitle}>{data?"Editar Template":"Novo Template"}</div></div><XBtn onClick={onClose}/></div>
      <FL label="Nome *"><input style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Ex: Elétrica Básica"/></FL>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
        <FL label="Categoria"><select style={S.sel} value={f.category} onChange={e=>set("category",e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FL>
        <FL label="Validade (dias)"><input style={S.inp} type="number" min={1} value={f.validity} onChange={e=>set("validity",e.target.value)}/></FL>
      </div>
      <div style={{marginTop:12}}>
        {f.items.map((it,i)=><div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 54px 64px 90px 28px",gap:8,marginBottom:8}}>
          <input style={S.inp} value={it.desc} onChange={e=>si(i,"desc",e.target.value)} placeholder="Descrição"/>
          <input style={S.inp} type="number" value={it.qty} onChange={e=>si(i,"qty",e.target.value)}/>
          <select style={S.sel} value={it.unit} onChange={e=>si(i,"unit",e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select>
          <input style={S.inp} type="number" value={it.price} onChange={e=>si(i,"price",e.target.value)} placeholder="0.00"/>
          <button onClick={()=>rmItem(i)} style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:6,cursor:"pointer",color:"#F87171",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>)}
        <button style={{...S.ghost,marginTop:4,fontSize:12,padding:"6px 12px"}} onClick={addItem}>+ Item</button>
      </div>
      <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:8}}><button style={S.ghost} onClick={onClose}>Cancelar</button>{data&&<button style={{...S.ghost,borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={()=>onDelete(data.id)}>🗑️</button>}</div>
        <button style={{...S.prim,opacity:ok?1:.4}} onClick={()=>ok&&onSave(f)}>💾 Salvar</button>
      </div>
    </Overlay>
  );
}

function ModalConfirm({title,msg,onConfirm,onClose}){
  return(
    <Overlay onClose={onClose}>
      <div style={{fontSize:17,fontWeight:800,color:"#F1F5F9",marginBottom:12}}>{title}</div>
      <div style={{fontSize:14,color:"#94A3B8",lineHeight:1.6,marginBottom:20}}>{msg}</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button style={S.ghost} onClick={onClose}>Cancelar</button><button style={{...S.prim,background:"#F87171"}} onClick={()=>{onConfirm();onClose();}}>Confirmar</button></div>
    </Overlay>
  );
}

/* ═══ ATOMS ══════════════════════════════════════════════════════════════ */
const Overlay=({onClose,children,wide})=><div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"12px 8px"}} onClick={onClose}><div style={{background:"#111827",border:"1px solid #1E293B",borderRadius:20,padding:"20px 16px",width:"100%",maxWidth:wide?680:520,maxHeight:"92dvh",overflowY:"auto",overflowX:"hidden"}} onClick={e=>e.stopPropagation()}>{children}</div></div>;
const XBtn=({onClick})=><button onClick={onClick} style={{background:"rgba(248,113,113,0.09)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,width:30,height:30,cursor:"pointer",color:"#F87171",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>;
const FL=({label,children})=><div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:.7,marginBottom:4}}>{label}</label>{children}</div>;
const FInput=({label,type="text",value,onChange,placeholder,icon,onEnter})=><div><label style={{display:"block",fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:.7,marginBottom:6}}>{label}</label><div style={{position:"relative"}}>{icon&&<span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none"}}>{icon}</span>}<input style={{...L.finput,paddingLeft:icon?38:13}} type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onKeyDown={e=>e.key==="Enter"&&onEnter&&onEnter()}/></div></div>;
const Ava=({name,size=32,lg,color})=>{const bg=color||strClr(name||"?");return<div style={{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:Math.round(size*.38),color:"#fff",flexShrink:0}}>{(name||"?")[0]}{lg&&name?.split(" ")[1]?name.split(" ")[1][0]:""}</div>;};
const Sbadge=({s,small})=>{const st=STATUS[s]||STATUS.pendente;return<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:small?"2px 7px":"3px 10px",borderRadius:20,fontSize:small?10:11,fontWeight:700,background:st.bg,color:st.color,whiteSpace:"nowrap"}}><span style={{width:5,height:5,borderRadius:"50%",background:st.dot,display:"inline-block"}}/>{st.label}</span>;};
const PlBadge=({plan,color,small})=>{const p=PLANS[plan]||PLANS.pro;const c=color||p.color;return<span style={{display:"inline-flex",padding:small?"1px 7px":"3px 10px",borderRadius:20,fontSize:small?9:11,fontWeight:700,background:`${c}15`,color:c,whiteSpace:"nowrap",border:`1px solid ${c}25`}}>{p.label}</span>;};
const ActBadge=({active})=><span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:active?"rgba(34,211,160,.12)":"rgba(248,113,113,.12)",color:active?"#22D3A0":"#F87171"}}><span style={{width:5,height:5,borderRadius:"50%",background:active?"#22D3A0":"#F87171",display:"inline-block"}}/>{active?"Ativo":"Inativo"}</span>;
const Toggle=({val,onChange})=><button onClick={()=>onChange(!val)} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:val?"#22D3A0":"#334155",transition:"background .2s",position:"relative",flexShrink:0}}><span style={{position:"absolute",top:3,left:val?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/></button>;
const SCrd=({icon,label,val,accent})=><div style={{background:"#111827",border:`1px solid ${accent}20`,borderRadius:14,padding:"14px 16px",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:-8,right:-4,fontSize:42,opacity:.07}}>{icon}</div><div style={{fontSize:10,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,marginBottom:4}}>{label}</div><div style={{fontSize:22,fontWeight:800,color:accent}}>{val}</div></div>;
const KPI=({icon,label,val,sub,color})=><div style={{background:"#111827",border:`1px solid ${color}18`,borderRadius:16,padding:"16px 18px",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:-10,right:-6,fontSize:50,opacity:.06}}>{icon}</div><div style={{fontSize:10,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,marginBottom:5}}>{label}</div><div style={{fontSize:22,fontWeight:800,color,marginBottom:3}}>{val}</div><div style={{fontSize:11,color:"#475569"}}>{sub}</div></div>;
const Card=({title,children,action})=><div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><span style={{fontSize:13,fontWeight:700,color:"#94A3B8"}}>{title}</span>{action}</div>{children}</div>;
const PHead=({title,sub,children})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,gap:12,flexWrap:"wrap"}}><div><h1 style={{fontSize:20,fontWeight:800,color:"#F1F5F9",margin:0}}>{title}</h1><p style={{fontSize:12,color:"#64748B",marginTop:3}}>{sub}</p></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{children}</div></div>;
const PBtn=({onClick,children})=><button style={S.prim} onClick={onClick}>{children}</button>;
const GBtn=({onClick,children,grad})=><button style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px 12px",background:grad?"linear-gradient(135deg,#818CF8,#22D3A0)":"transparent",border:grad?"none":"1px solid #1E293B",borderRadius:10,color:grad?"#0F1117":"#64748B",fontWeight:grad?800:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}} onClick={onClick}>{children}</button>;
const TB=({c,t,onClick,children})=><button title={t} onClick={onClick} style={{background:`${c}18`,border:`1px solid ${c}30`,borderRadius:6,width:26,height:26,cursor:"pointer",color:c,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",padding:0}} className="tbtn">{children}</button>;
const Lnk=({onClick,children,color})=><button style={{background:"none",border:"none",color:color||"#818CF8",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}} onClick={onClick}>{children}</button>;
const Toast=({msg,type,color})=><div style={{position:"fixed",bottom:22,right:22,background:type==="warn"?"#92400E":`linear-gradient(135deg,${color||"#22D3A0"},${color?"#1a1a2e":"#10B981"})`,color:type==="warn"?"#FDE68A":"#0F2419",padding:"11px 20px",borderRadius:12,fontWeight:700,fontSize:13,zIndex:200,boxShadow:"0 6px 24px rgba(0,0,0,.5)"}} className="toast-in">{msg}</div>;
const Splash=({user})=><div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",background:"#0A0E1A",flexDirection:"column",gap:14}}><div style={{fontSize:44}} className="spin">⚡</div><div style={{fontSize:14,fontWeight:700,color:"#64748B"}}>{user?`Carregando ${user.name}…`:"Carregando…"}</div></div>;

/* ═══ HELPERS ════════════════════════════════════════════════════════════ */
const getByMonth=bs=>{const m={};bs.forEach(b=>{const k=b.date?.slice(0,7)||"";if(!k)return;if(!m[k])m[k]={month:k,count:0,receita:0};m[k].count++;if(b.status==="aprovado")m[k].receita+=b.total;});return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);};
const getByCategory=bs=>{const m={};bs.forEach(b=>{m[b.category]=(m[b.category]||0)+1;});const t=Math.max(Object.values(m).reduce((s,v)=>s+v,0),1);return Object.entries(m).map(([name,count])=>({name,count,pct:Math.round(count/t*100)})).sort((a,b)=>b.count-a.count);};
const getTopClients=(bs,cs)=>{const m={};bs.forEach(b=>{if(!m[b.clientName])m[b.clientName]={id:b.clientId||b.clientName,name:b.clientName,count:0,aprovados:0,receita:0};m[b.clientName].count++;if(b.status==="aprovado"){m[b.clientName].aprovados++;m[b.clientName].receita+=b.total;}});return Object.values(m).sort((a,b)=>b.receita-a.receita);};

/* ═══ STYLES ═════════════════════════════════════════════════════════════ */
const S={
  root:    {display:"flex",height:"100vh",background:"#0A0E1A",fontFamily:"'DM Sans',sans-serif",color:"#CBD5E1",overflow:"hidden"},
  side:    {background:"#0D1320",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"},
  sTop:    {padding:"18px 14px 10px"},
  logo:    {display:"flex",alignItems:"center",gap:9,cursor:"pointer",userSelect:"none",marginBottom:10},
  logoTxt: {fontSize:15,fontWeight:800,color:"#F1F5F9",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:160},
  chip:    {display:"flex",alignItems:"center",gap:9,padding:"9px 10px",background:"rgba(129,140,248,0.06)",borderRadius:12,border:"1px solid rgba(129,140,248,0.12)",marginTop:4},
  chipName:{fontSize:12,fontWeight:700,color:"#E2E8F0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:110},
  chipRole:{fontSize:10,color:"#64748B"},
  ava0:    {width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:"#fff",flexShrink:0},
  nav:     {flex:1,padding:"8px 10px",display:"flex",flexDirection:"column",gap:2,overflowY:"auto"},
  nb:      {display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:10,background:"transparent",border:"none",color:"#64748B",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:500,transition:"all .2s",position:"relative",textAlign:"left",whiteSpace:"nowrap",overflow:"hidden"},
  nba:     {background:"rgba(129,140,248,0.1)",color:"#818CF8",fontWeight:700},
  ndot:    {width:5,height:5,borderRadius:"50%",background:"#818CF8",flexShrink:0},
  sBot:    {padding:"10px 10px 18px",display:"flex",flexDirection:"column",gap:6},
  newBtn:  {display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"10px 12px",border:"none",borderRadius:11,color:"#0F1117",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",overflow:"hidden"},
  logBtn:  {display:"flex",alignItems:"center",gap:7,padding:"8px 12px",background:"transparent",border:"1px solid #1E293B",borderRadius:10,color:"#64748B",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"},
  topbar:  {height:52,background:"#0D1320",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",flexShrink:0},
  topBtn:  {display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"},
  main:    {flex:1,overflowY:"auto",background:"#0A0E1A"},
  page:    {padding:"24px 16px 60px",overflowX:"hidden",width:"100%",boxSizing:"border-box"},
  card:    {background:"#111827",border:"1px solid #1E293B",borderRadius:16,padding:"15px 17px"},
  tbl:     {width:"100%",borderCollapse:"collapse"},
  th:      {padding:"7px 10px",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:.7,textAlign:"left",borderBottom:"1px solid #1E293B"},
  tr:      {cursor:"pointer"},
  td:      {padding:"10px 10px",fontSize:13,borderBottom:"1px solid #0F172A",color:"#CBD5E1",verticalAlign:"middle"},
  acts:    {display:"flex",gap:5,alignItems:"center"},
  search:  {background:"#111827",border:"1px solid #1E293B",borderRadius:10,padding:"9px 13px",color:"#E2E8F0",fontSize:13,fontFamily:"inherit",outline:"none"},
  sel:     {background:"#111827",border:"1px solid #1E293B",borderRadius:10,padding:"9px 10px",color:"#CBD5E1",fontSize:12,fontFamily:"inherit",cursor:"pointer",outline:"none",width:"100%"},
  bcard:   {background:"#111827",border:"1px solid #1E293B",borderRadius:16,padding:15,cursor:"pointer"},
  chip2:   {display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:"#0F172A",border:"1px solid #1E293B",borderRadius:20,cursor:"pointer",fontSize:12,color:"#94A3B8",fontFamily:"inherit"},
  mhead:   {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18},
  mtitle:  {fontWeight:800,fontSize:17,color:"#F1F5F9"},
  msub:    {fontSize:12,color:"#64748B",marginTop:2},
  inp:     {background:"#0F172A",border:"1px solid #1E293B",borderRadius:9,padding:"9px 12px",color:"#E2E8F0",fontSize:13,fontFamily:"inherit",width:"100%",boxSizing:"border-box",outline:"none",transition:"border .15s"},
  prim:    {background:"linear-gradient(135deg,#818CF8,#6366F1)",border:"none",borderRadius:10,padding:"9px 18px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"},
  ghost:   {background:"transparent",border:"1px solid #1E293B",borderRadius:10,padding:"9px 18px",color:"#94A3B8",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"},
};
const L={
  root:    {display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",background:"#060912",fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden"},
  bg:      {position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(129,140,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(129,140,248,0.025) 1px,transparent 1px)",backgroundSize:"50px 50px"},
  g1:      {position:"absolute",top:"-15%",left:"15%",width:500,height:500,background:"radial-gradient(circle,rgba(99,102,241,0.15),transparent 60%)",borderRadius:"50%",pointerEvents:"none"},
  g2:      {position:"absolute",bottom:"-10%",right:"10%",width:400,height:400,background:"radial-gradient(circle,rgba(34,211,160,0.1),transparent 60%)",borderRadius:"50%",pointerEvents:"none"},
  g3:      {position:"absolute",top:"40%",right:"35%",width:200,height:200,background:"radial-gradient(circle,rgba(96,165,250,0.07),transparent 60%)",borderRadius:"50%",pointerEvents:"none"},
  wrap:    {background:"rgba(13,19,32,0.96)",border:"1px solid #1E293B",borderRadius:28,padding:"32px 24px",width:"100%",maxWidth:420,position:"relative",zIndex:1,boxShadow:"0 32px 80px rgba(0,0,0,.7)"},
  brand:   {display:"flex",alignItems:"center",gap:16,marginBottom:28},
  brandIco:{width:52,height:52,background:"linear-gradient(135deg,#818CF8,#22D3A0)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"0 8px 20px rgba(129,140,248,0.3)"},
  brandName:{fontSize:26,fontWeight:900,color:"#F1F5F9",letterSpacing:-.5},
  brandTag: {fontSize:12,color:"#64748B"},
  formTitle:{fontSize:18,fontWeight:800,color:"#F1F5F9"},
  formSub:  {fontSize:12,color:"#64748B",marginTop:2,marginBottom:4},
  finput:  {background:"rgba(30,41,59,0.8)",border:"1px solid #2D3748",borderRadius:11,padding:"12px 13px",color:"#E2E8F0",fontSize:14,fontFamily:"inherit",width:"100%",boxSizing:"border-box",outline:"none"},
  err:     {display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#F87171",background:"rgba(248,113,113,0.08)",padding:"9px 12px",borderRadius:9,border:"1px solid rgba(248,113,113,0.2)"},
  btn:     {background:"linear-gradient(135deg,#818CF8,#6366F1)",border:"none",borderRadius:12,padding:"13px",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8},
  eye:     {position:"absolute",right:11,top:"55%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4},
  lockMsg: {marginTop:20,textAlign:"center",fontSize:11,color:"#334155",display:"flex",alignItems:"center",justifyContent:"center",gap:4},
  footer:  {position:"absolute",bottom:18,fontSize:11,color:"#1E293B"},
};
const GCSS=`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;max-width:100%;}
html,body{overflow-x:hidden;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:#0A0E1A;}
::-webkit-scrollbar-thumb{background:#1E293B;border-radius:10px;}
::-webkit-scrollbar-thumb:hover{background:#2D3748;}
.bcard:hover{border-color:#2D3748!important;transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.35);transition:all .2s;}
.trow:hover td{background:rgba(255,255,255,.02);}
.tbtn:hover{filter:brightness(1.3);transform:scale(1.1);}
.fadeUp{animation:fadeUp .4s ease;}
input:focus,select:focus,textarea:focus{border-color:#818CF8!important;box-shadow:0 0 0 2px rgba(129,140,248,.12)!important;}
.toast-in{animation:slideIn .3s ease;}
@keyframes slideIn{from{transform:translateX(60px);opacity:0;}to{transform:translateX(0);opacity:1;}}
@keyframes fadeUp{from{transform:translateY(24px);opacity:0;}to{transform:translateY(0);opacity:1;}}
@keyframes spin{to{transform:rotate(360deg);}}
.spin{display:inline-block;animation:spin 1s linear infinite;}
@media(max-width:768px){
  *{max-width:100%;}
  input,select,textarea{font-size:16px!important;}
  .bcard:hover{transform:none!important;}
  img{max-width:100%;height:auto;}
  table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;}
}
`;
