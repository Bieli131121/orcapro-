import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";

const CATS   = ["Elétrica","Hidráulica","Marcenaria","Pintura","Mecânica","Informática","Limpeza","Jardinagem","Climatização","Outro"];
const UNITS  = ["un","m","m²","m³","kg","l","serv","hr","dia","kit","cx","pc","vb"];
const PROFS  = ["Eletricista","Encanador","Pedreiro","Pintor","Mecânico","Marceneiro","Técnico em TI","Jardineiro","Climatizador","Outro"];
const PLANS  = { basico:{label:"Básico",color:"#64748B",max:20,price:29}, pro:{label:"Pro",color:"#818CF8",max:100,price:49}, premium:{label:"Premium",color:"#F59E0B",max:999,price:89} };
const THEMES = [
  {id:"violeta",  name:"Violeta",   primary:"#818CF8", secondary:"#6366F1", accent:"#22D3A0"},
  {id:"esmeralda",name:"Esmeralda", primary:"#10B981", secondary:"#059669", accent:"#60A5FA"},
  {id:"amber",    name:"Âmbar",     primary:"#F59E0B", secondary:"#D97706", accent:"#F87171"},
  {id:"azul",     name:"Azul",      primary:"#3B82F6", secondary:"#2563EB", accent:"#22D3A0"},
  {id:"rosa",     name:"Rosa",      primary:"#EC4899", secondary:"#DB2777", accent:"#818CF8"},
  {id:"ciano",    name:"Ciano",     primary:"#06B6D4", secondary:"#0891B2", accent:"#F59E0B"},
  {id:"laranja",  name:"Laranja",   primary:"#F97316", secondary:"#EA580C", accent:"#818CF8"},
  {id:"custom",   name:"Customizado",primary:"#818CF8",secondary:"#6366F1", accent:"#22D3A0"},
];
const STATUS = {
  rascunho:{label:"Rascunho",color:"#94A3B8",bg:"rgba(148,163,184,0.10)",dot:"#94A3B8",icon:"📝"},
  pendente: {label:"Pendente", color:"#F59E0B",bg:"rgba(245,158,11,0.12)", dot:"#F59E0B",icon:"⏳"},
  enviado:  {label:"Enviado",  color:"#60A5FA",bg:"rgba(96,165,250,0.12)", dot:"#60A5FA",icon:"📤"},
  aprovado: {label:"Aprovado", color:"#22D3A0",bg:"rgba(34,211,160,0.12)", dot:"#22D3A0",icon:"✅"},
  recusado: {label:"Recusado", color:"#F87171",bg:"rgba(248,113,113,0.12)",dot:"#F87171",icon:"❌"},
  expirado: {label:"Expirado", color:"#FB923C",bg:"rgba(251,146,60,0.12)", dot:"#FB923C",icon:"⚠️"},
};
const PAYMENT_METHODS = ["PIX","Dinheiro","Cartão de Crédito","Cartão de Débito","Boleto","Transferência","Cheque","A combinar"];

let ADMIN = {id:"admin-analua",name:"Analua",login:"analua",passwordHash:"",role:"admin"};
(async () => { if (!ADMIN.passwordHash) ADMIN = {...ADMIN, passwordHash: await hashPassword("ana0406")}; })();

const fmtBRL  = v => "R$\u00a0"+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2});
const fmtK    = v => v>=1000?`R$\u00a0${(v/1000).toFixed(1)}k`:fmtBRL(v);
const today   = () => new Date().toISOString().split("T")[0];
const uid     = () => typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2,10);

async function hashPassword(password){
  const salt=crypto.randomUUID();
  const data=new TextEncoder().encode(salt+password);
  const buf=await crypto.subtle.digest("SHA-256",data);
  const hex=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  return`${salt}:${hex}`;
}
async function checkPassword(password,stored){
  if(!stored)return false;
  if(!stored.includes(":"))return password===stored;
  const[salt,hash]=stored.split(":");
  const data=new TextEncoder().encode(salt+password);
  const buf=await crypto.subtle.digest("SHA-256",data);
  const hex=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  return hex===hash;
}
const strClr  = s=>["#6366F1","#8B5CF6","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444","#14B8A6"][[...s].reduce((h,c)=>h+c.charCodeAt(0),0)%8];
const calcSub = (items=[])=>items.reduce((t,i)=>t+(parseFloat(i.qty)||0)*(parseFloat(i.price)||0),0);
const calcTot = (items=[],disc=0,tax=0)=>{const s=calcSub(items);return s*(1-(parseFloat(disc)||0)/100)*(1+(parseFloat(tax)||0)/100);};
const daysLeft= (date,val)=>{const e=new Date(date);e.setDate(e.getDate()+(parseInt(val)||0));return Math.ceil((e-new Date())/86400000);};
const readFile= file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(file);});

const BLANK_PROFILE = {
  name:"",phone:"",email:"",city:"",state:"",crea:"",profession:"",
  logo:"",signOff:"Fico à disposição para qualquer dúvida! 😊",
  plan:"pro",themeId:"violeta",primaryColor:"#818CF8",secondaryColor:"#6366F1",accentColor:"#22D3A0",
  tagline:"",website:"",instagram:"",whatsappMsg:"",
  headerNote:"",footerNote:"",showLogo:true,
  pixKey:"",bank:"",cnpj:"",paymentTerms:"",defaultValidity:15,
};

const seedData = u0 => ({
  budgets:[],
  clients:[],
  templates:[],
  agendamentos:[],
  profile:{...BLANK_PROFILE},
  activity:[],
});

/* ═══ STORAGE ══════════════════════════════════════════════════════ */
function useStorage(key,fallback,shared=false){
  const[val,setVal]=useState(null);const[loading,setL]=useState(true);
  const valRef=useRef(val);
  // Keep valRef always in sync
  useEffect(()=>{valRef.current=val;},[val]);
  useEffect(()=>{
    try{const raw=localStorage.getItem(key);const parsed=raw?JSON.parse(raw):fallback;valRef.current=parsed;setVal(parsed);}
    catch{setVal(fallback);}
    setL(false);
  },[key]); //eslint-disable-line
  const save=useCallback(async nv=>{
    const v=typeof nv==="function"?nv(valRef.current):nv;
    valRef.current=v;          // update ref BEFORE setVal to avoid stale closure
    setVal(v);
    try{localStorage.setItem(key,JSON.stringify(v));}catch(e){console.error("storage:",key,e);}
  },[key]);
  return[val,save,loading];
}

/* ═══ ROOT ══════════════════════════════════════════════════════════ */
export default function Root(){
  const[users,setUsers,lu]=useStorage("orc6:users",[],true);
  const[session,setSession,ls]=useStorage("orc6:session",null,false);
  if(lu||ls)return<Splash/>;
  const isAdmin=session?.userId===ADMIN.id;
  const currentUser=isAdmin?ADMIN:(users||[]).find(u=>u.id===session?.userId);
  const login=async u=>setSession({userId:u.id,ts:Date.now()});
  const logout=async()=>setSession(null);
  if(!currentUser)return<React.Fragment><style>{GCSS}</style><LoginScreen users={users||[]} onLogin={login}/></React.Fragment>;
  if(isAdmin)return<React.Fragment><style>{GCSS}</style><AdminPanel users={users||[]} setUsers={setUsers} onLogout={logout}/></React.Fragment>;
  return<React.Fragment><style>{GCSS}</style><AppShell user={currentUser} users={users} setUsers={setUsers} onLogout={logout}/></React.Fragment>;
}

/* ═══ LOGIN ══════════════════════════════════════════════════════════ */
function LoginScreen({users,onLogin}){
  const[login,setL]=useState("");const[pass,setP]=useState("");
  const[err,setErr]=useState("");const[show,setShow]=useState(false);const[loading,setLd]=useState(false);
  const go=async()=>{
    setErr("");setLd(true);await new Promise(r=>setTimeout(r,500));
    if(login.trim().toLowerCase()==="analua"){
      const ok=await checkPassword(pass,ADMIN.passwordHash);
      if(ok){await onLogin(ADMIN);setLd(false);return;}
    }
    const candidates=(users||[]).filter(u=>(u.login?.toLowerCase()===login.trim().toLowerCase()||u.email?.toLowerCase()===login.trim().toLowerCase())&&u.active!==false);
    let matched=null;
    for(const u of candidates){if(await checkPassword(pass,u.password)){matched=u;break;}}
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

/* ═══ ADMIN ══════════════════════════════════════════════════════════ */
function AdminPanel({users,setUsers,onLogout}){
  const[adminProfile,setAdminProfile]=useStorage("orc6:adminProfile",{name:"Analua",email:"analua@orcapro.com",phone:"",city:"",logo:"",tagline:"Administradora da plataforma"},false);
  const[modal,setModal]=useState(null);const[toast,setToast]=useState(null);
  const[search,setSearch]=useState("");const[tab,setTab]=useState("mensalidades");
  const[bilFilter,setBilFilter]=useState("todos");const adminFileRef=useRef();
  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};
  const addMonths=(d,m)=>{const dt=new Date(d);dt.setMonth(dt.getMonth()+m);return dt.toISOString().split("T")[0];};
  const saveUser=async f=>{
    if(!f.id){
      if((users||[]).find(u=>u.login?.toLowerCase()===f.login?.toLowerCase())){showToast("Login já existe","warn");return;}
      if(f.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)){showToast("E-mail inválido","warn");return;}
      const novaData=today();const venc=addMonths(novaData,1);
      const passwordHash=f.password?await hashPassword(f.password):"";
      await setUsers(us=>[...(us||[]),{...f,id:uid(),password:passwordHash,createdAt:novaData,active:true,billingStatus:"em_dia",lastPayment:novaData,nextDue:venc,payHistory:[]}]);
      showToast(`Conta criada: ${f.name} ✓`);
    }else{
      let upd={...f};
      if(f._passwordChanged&&f.password){upd={...f,password:await hashPassword(f.password),_passwordChanged:undefined};}
      await setUsers(us=>us.map(u=>u.id===f.id?upd:u));showToast("Salvo ✓");
    }
    setModal(null);
  };
  const toggleActive=async id=>{await setUsers(us=>us.map(u=>u.id===id?{...u,active:!u.active}:u));showToast("Status alterado");};
  const delUser=async id=>{await setUsers(us=>us.filter(u=>u.id!==id));showToast("Removido","warn");setModal(null);};
  const registerPayment=async id=>{
    const nd=today();const venc=addMonths(nd,1);
    await setUsers(us=>us.map(u=>{
      if(u.id!==id)return u;
      const hist=[...(u.payHistory||[]),{date:nd,amount:PLANS[u.plan||"pro"]?.price||49,status:"pago"}];
      return{...u,billingStatus:"em_dia",lastPayment:nd,nextDue:venc,payHistory:hist,active:true};
    }));showToast("Pagamento registrado ✓");
  };
  const markOverdue=async id=>{await setUsers(us=>us.map(u=>u.id===id?{...u,billingStatus:"atrasado"}:u));showToast("Marcado como atrasado","warn");};
  const sendWAReminder=u=>{
    const plan=PLANS[u.plan||"pro"];
    const msg=`Olá *${u.name}*! 👋\n\nPassando para lembrar que sua mensalidade do *OrcaPro* (Plano ${plan.label} — R$${plan.price}/mês) vence em *${u.nextDue||"breve"}*.\n\nEfetue o pagamento via PIX para continuar usando normalmente.\n\nQualquer dúvida, estou à disposição! 😊\n\n— ${adminProfile?.name||"Analua"} · OrcaPro`;
    window.open(`https://wa.me/55${(u.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`,"_blank");
    showToast("Lembrete enviado 📱");
  };
  const handleAdminLogo=async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2*1024*1024){showToast("Máx. 2MB","warn");return;}const b64=await readFile(file);setAdminProfile(p=>({...p,logo:b64}));showToast("Foto atualizada ✓");};
  const filtered=(users||[]).filter(u=>[u.name,u.login,u.email].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  const stats={total:(users||[]).length,active:(users||[]).filter(u=>u.active!==false).length,emDia:(users||[]).filter(u=>!u.billingStatus||u.billingStatus==="em_dia").length,atrasado:(users||[]).filter(u=>u.billingStatus==="atrasado").length,receita:(users||[]).filter(u=>u.active!==false).reduce((s,u)=>s+(PLANS[u.plan||"pro"]?.price||49),0)};
  const bilFiltered=useMemo(()=>{
    let r=[...(users||[])];
    if(bilFilter==="em_dia")r=r.filter(u=>!u.billingStatus||u.billingStatus==="em_dia");
    if(bilFilter==="atrasado")r=r.filter(u=>u.billingStatus==="atrasado");
    if(bilFilter==="vencendo"){const h=new Date();r=r.filter(u=>{if(!u.nextDue)return false;const d=Math.ceil((new Date(u.nextDue)-h)/86400000);return d>=0&&d<=5;});}
    return r.filter(u=>[u.name,u.login,u.email].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  },[users,bilFilter,search]);
  const adminName=adminProfile?.name||"Analua";
  const ADMIN_NAVS=[{id:"mensalidades",ico:"💳",lbl:"Mensalidades"},{id:"users",ico:"👥",lbl:"Usuários"},{id:"overview",ico:"📊",lbl:"Visão Geral"},{id:"plans",ico:"💎",lbl:"Planos"},{id:"meu_perfil",ico:"👤",lbl:"Meu Perfil"}];
  return(
    <div style={S.root}>
      <aside style={{...S.side,width:240}}>
        <div style={S.sTop}>
          <div style={S.logo}>
            {adminProfile?.logo?<img src={adminProfile.logo} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>:<span style={{fontSize:22}}>⚡</span>}
            <span style={S.logoTxt}>OrcaPro</span>
          </div>
          <div style={{...S.chip,borderColor:"rgba(245,158,11,.3)",background:"rgba(245,158,11,.06)"}}>
            {adminProfile?.logo?<img src={adminProfile.logo} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>:<div style={{...S.ava0,background:"linear-gradient(135deg,#F59E0B,#EF4444)",width:32,height:32,fontSize:14}}>{adminName[0]}</div>}
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
        {tab==="mensalidades"&&(
          <div style={S.page}>
            <PHead title="💳 Controle de Mensalidades" sub="Acompanhe pagamentos e status de cada cliente"><PBtn onClick={()=>setModal({type:"user",data:null})}>+ Criar Usuário</PBtn></PHead>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:22}}>
              <SCrd icon="👥" label="Total" val={stats.total} accent="#818CF8"/>
              <SCrd icon="✅" label="Em dia" val={stats.emDia} accent="#22D3A0"/>
              <SCrd icon="⚠️" label="Atrasados" val={stats.atrasado} accent="#F87171"/>
              <SCrd icon="🔔" label="Vencendo (5d)" val={(users||[]).filter(u=>{if(!u.nextDue)return false;const d=Math.ceil((new Date(u.nextDue)-new Date())/86400000);return d>=0&&d<=5;}).length} accent="#F59E0B"/>
              <SCrd icon="💰" label="Receita/mês" val={`R$${stats.receita}`} accent="#22D3A0"/>
            </div>
            {stats.atrasado>0&&<div style={{padding:"12px 18px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:14,marginBottom:18,display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:24}}>🚨</span><div><div style={{fontSize:14,fontWeight:800,color:"#F87171"}}>{stats.atrasado} cliente(s) com mensalidade atrasada</div><div style={{fontSize:12,color:"#64748B",marginTop:2}}>Envie um lembrete ou desative o acesso até a regularização.</div></div></div>}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {[["todos","Todos","#64748B"],["em_dia","✅ Em dia","#22D3A0"],["atrasado","⚠️ Atrasados","#F87171"],["vencendo","🔔 Vencendo","#F59E0B"]].map(([v,l,c])=>(
                <button key={v} style={{padding:"7px 16px",borderRadius:20,border:`1px solid ${bilFilter===v?c:"#1E293B"}`,background:bilFilter===v?`${c}15`:"transparent",color:bilFilter===v?c:"#64748B",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:bilFilter===v?700:500}} onClick={()=>setBilFilter(v)}>{l}</button>
              ))}
              <input style={{...S.search,flex:1,minWidth:200}} placeholder="🔍 Buscar cliente…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14}}>
              {bilFiltered.map(u=>{
                const bs=u.billingStatus||"em_dia";const plan=PLANS[u.plan||"pro"];
                const nextDue=u.nextDue?new Date(u.nextDue):null;
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
                          <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:`${statusColor}15`,color:statusColor,border:`1px solid ${statusColor}30`}}><span style={{width:5,height:5,borderRadius:"50%",background:statusColor,display:"inline-block"}}/>{statusLabel}</span>
                          <div style={{marginTop:4}}><PlBadge plan={u.plan||"pro"} small/></div>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                        <div style={{background:"#0F172A",borderRadius:10,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:plan.color}}>R${plan.price}</div><div style={{fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:.5}}>Mensal</div></div>
                        <div style={{background:"#0F172A",borderRadius:10,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:11,fontWeight:700,color:"#94A3B8"}}>{u.lastPayment||"—"}</div><div style={{fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:.5}}>Último pag.</div></div>
                        <div style={{background:"#0F172A",borderRadius:10,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:11,fontWeight:700,color:vencido?"#F87171":vencendo?"#F59E0B":"#94A3B8"}}>{u.nextDue||"—"}</div><div style={{fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:.5}}>Próx. venc.</div></div>
                      </div>
                      {(u.payHistory||[]).length>0&&<div style={{marginBottom:12}}><div style={{fontSize:9,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Últimos pagamentos</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{[...(u.payHistory||[])].reverse().slice(0,5).map((p,i)=><div key={i} title={`${p.date} · R$${p.amount}`} style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:"rgba(34,211,160,0.1)",color:"#22D3A0",border:"1px solid rgba(34,211,160,0.2)"}}>✓ {p.date?.slice(5)||""}</div>)}</div></div>}
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
        {tab==="users"&&(
          <div style={S.page}>
            <PHead title="Gerenciar Usuários" sub={`${stats.total} usuário(s) · ${stats.active} ativo(s)`}><PBtn onClick={()=>setModal({type:"user",data:null})}>+ Criar Usuário</PBtn></PHead>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              <SCrd icon="👥" label="Total" val={stats.total} accent="#818CF8"/>
              <SCrd icon="✅" label="Ativos" val={stats.active} accent="#22D3A0"/>
              <SCrd icon="🚫" label="Inativos" val={stats.total-stats.active} accent="#F87171"/>
              <SCrd icon="📅" label="Este mês" val={(users||[]).filter(u=>u.createdAt?.startsWith(today().slice(0,7))).length} accent="#F59E0B"/>
            </div>
            <div style={{marginBottom:14}}><input style={{...S.search,maxWidth:380}} placeholder="🔍 Buscar usuário…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <div style={{...S.card,padding:0,overflow:"hidden"}}>
              <table style={S.tbl}><thead style={{background:"#0D1320"}}><tr>{["Usuário","Login","Profissão","Plano","Cadastro","Mensalidade","Status","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>{filtered.map(u=>{const bs=u.billingStatus||"em_dia";const bilColor=bs==="atrasado"?"#F87171":"#22D3A0";const bilLabel=bs==="atrasado"?"⚠️ Atrasado":"✅ Em dia";return(
                  <tr key={u.id} style={S.tr} className="trow">
                    <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:9}}><Ava name={u.name} size={30}/><div><div style={{fontWeight:600,color:"#E2E8F0",fontSize:13}}>{u.name}</div><div style={{fontSize:11,color:"#475569"}}>{u.email||"—"}</div></div></div></td>
                    <td style={{...S.td,fontFamily:"monospace",fontSize:12}}>{u.login}</td>
                    <td style={{...S.td,fontSize:12,color:"#94A3B8"}}>{u.profession||"—"}</td>
                    <td style={S.td}><PlBadge plan={u.plan||"basico"}/></td>
                    <td style={{...S.td,fontSize:12,color:"#64748B"}}>{u.createdAt||"—"}</td>
                    <td style={S.td}><span style={{fontSize:11,fontWeight:700,color:bilColor}}>{bilLabel}</span><div style={{fontSize:10,color:"#475569"}}>{u.nextDue?`Venc: ${u.nextDue}`:""}</div></td>
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
        {tab==="overview"&&(
          <div style={S.page}>
            <PHead title="Visão Geral" sub="Resumo da plataforma"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <Card title="📊 Por Profissão">{PROFS.map(p=>{const c=(users||[]).filter(u=>u.profession===p).length;return c>0?(<div key={p} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:"#94A3B8"}}>{p}</span><span style={{fontSize:12,fontWeight:700,color:"#818CF8"}}>{c}</span></div><div style={{height:5,background:"#1E293B",borderRadius:3}}><div style={{height:"100%",width:`${(c/Math.max(stats.total,1))*100}%`,background:"linear-gradient(90deg,#818CF8,#22D3A0)",borderRadius:3}}/></div></div>):null;})}{stats.total===0&&<div style={{color:"#475569",fontSize:13}}>Nenhum usuário</div>}</Card>
              <Card title="👤 Últimos Cadastros">{[...(users||[])].reverse().slice(0,6).map(u=>(<div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #1E293B"}}><Ava name={u.name} size={28}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#E2E8F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div><div style={{fontSize:11,color:"#475569"}}>{u.profession||"—"}</div></div><PlBadge plan={u.plan||"basico"} small/></div>))}{(users||[]).length===0&&<div style={{color:"#475569",fontSize:13}}>Nenhum usuário</div>}</Card>
            </div>
          </div>
        )}
        {tab==="plans"&&(
          <div style={S.page}>
            <PHead title="💎 Planos" sub={`Receita estimada: R$${stats.receita}/mês`}/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              {Object.entries(PLANS).map(([k,v])=>{const c=(users||[]).filter(u=>(u.plan||"basico")===k).length;return(<div key={k} style={{background:"#111827",border:`2px solid ${v.color}25`,borderRadius:20,padding:24,textAlign:"center"}}><div style={{fontSize:26,fontWeight:900,color:v.color,marginBottom:6}}>{v.label}</div><div style={{fontSize:13,color:"#64748B",marginBottom:14}}>Até <b style={{color:"#E2E8F0"}}>{v.max}</b> orçamentos/mês</div><div style={{fontSize:30,fontWeight:800,color:"#F1F5F9"}}>R${v.price}<span style={{fontSize:12,color:"#64748B"}}>/mês</span></div><div style={{marginTop:14,padding:10,background:`${v.color}10`,borderRadius:10,border:`1px solid ${v.color}20`}}><div style={{fontSize:13,fontWeight:700,color:v.color}}>{c} usuário(s)</div><div style={{fontSize:11,color:"#64748B",marginTop:2}}>Receita: R${c*v.price}/mês</div></div></div>);})}
            </div>
            <div style={{marginTop:16,padding:18,background:"rgba(34,211,160,0.06)",border:"1px solid rgba(34,211,160,0.15)",borderRadius:16}}><div style={{fontSize:11,color:"#64748B",marginBottom:4}}>RECEITA MENSAL TOTAL (ativos)</div><div style={{fontSize:28,fontWeight:900,color:"#22D3A0"}}>R${stats.receita}<span style={{fontSize:13,color:"#64748B",fontWeight:400}}>/mês</span></div></div>
          </div>
        )}
        {tab==="meu_perfil"&&(
          <div style={S.page}>
            <PHead title="👤 Meu Perfil" sub="Personalize suas informações de administradora"/>
            <div style={{maxWidth:560,display:"flex",flexDirection:"column",gap:16}}>
              <div style={{background:"linear-gradient(135deg,rgba(245,158,11,0.1),rgba(239,68,68,0.07))",border:"1px solid rgba(245,158,11,0.25)",borderRadius:20,padding:22,display:"flex",alignItems:"center",gap:18}}>
                <div style={{position:"relative",flexShrink:0}}>
                  {adminProfile?.logo?<img src={adminProfile.logo} alt="" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:"3px solid rgba(245,158,11,0.4)"}}/>:<div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#EF4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:900,color:"#fff"}}>{adminName[0]}</div>}
                  <button onClick={()=>adminFileRef.current?.click()} style={{position:"absolute",bottom:-4,right:-4,width:26,height:26,borderRadius:"50%",background:"#F59E0B",border:"none",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",color:"#0F1117",fontWeight:900}}>+</button>
                  <input ref={adminFileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAdminLogo}/>
                </div>
                <div><div style={{fontSize:20,fontWeight:900,color:"#F1F5F9"}}>{adminName}</div><div style={{fontSize:13,color:"#F59E0B",fontWeight:600}}>👑 Administradora · OrcaPro</div>{adminProfile?.tagline&&<div style={{fontSize:12,color:"#64748B",marginTop:2,fontStyle:"italic"}}>"{adminProfile.tagline}"</div>}<div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>{adminProfile?.phone&&<span style={{fontSize:11,color:"#94A3B8"}}>📱 {adminProfile.phone}</span>}{adminProfile?.email&&<span style={{fontSize:11,color:"#94A3B8"}}>✉️ {adminProfile.email}</span>}{adminProfile?.city&&<span style={{fontSize:11,color:"#94A3B8"}}>📍 {adminProfile.city}</span>}</div></div>
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
              <div style={{padding:14,background:"rgba(245,158,11,0.06)",borderRadius:12,border:"1px solid rgba(245,158,11,0.15)"}}><div style={{fontSize:12,fontWeight:700,color:"#F59E0B",marginBottom:4}}>🔐 Credenciais</div><div style={{fontSize:12,color:"#64748B"}}>Login: <b style={{color:"#94A3B8"}}>analua</b> · Senha: configurada no código</div><div style={{fontSize:11,color:"#475569",marginTop:4}}>Para alterar, entre em contato com o desenvolvedor.</div></div>
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
  const plan=PLANS[data.plan||"pro"];const hist=[...(data.payHistory||[])].reverse();
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div><div style={S.mtitle}>💳 Detalhes de Cobrança</div><div style={S.msub}>{data.name} · {plan.label}</div></div><XBtn onClick={onClose}/></div>
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#0F172A",borderRadius:14,border:"1px solid #1E293B",marginBottom:16}}>
        <Ava name={data.name} size={44} lg/><div style={{flex:1}}><div style={{fontWeight:700,fontSize:16,color:"#F1F5F9"}}>{data.name}</div><div style={{fontSize:12,color:"#64748B"}}>{data.profession||"—"} · {data.email||"—"}</div><div style={{fontSize:12,color:"#64748B"}}>📱 {data.phone||"—"}</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:900,color:plan.color}}>R${plan.price}<span style={{fontSize:11,color:"#64748B"}}>/mês</span></div><div style={{marginTop:4}}><PlBadge plan={data.plan||"pro"}/></div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div style={{background:"#0F172A",borderRadius:12,padding:"12px 14px",border:"1px solid #1E293B"}}><div style={{fontSize:10,color:"#64748B",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Último pagamento</div><div style={{fontSize:15,fontWeight:700,color:"#22D3A0"}}>{data.lastPayment||"Nenhum"}</div></div>
        <div style={{background:"#0F172A",borderRadius:12,padding:"12px 14px",border:"1px solid #1E293B"}}><div style={{fontSize:10,color:"#64748B",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Próximo vencimento</div><div style={{fontSize:15,fontWeight:700,color:data.billingStatus==="atrasado"?"#F87171":"#F59E0B"}}>{data.nextDue||"—"}</div></div>
      </div>
      <div style={{marginBottom:16}}><div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Histórico de Pagamentos</div>{hist.length>0?(<div style={{...S.card,padding:0,overflow:"hidden"}}>{hist.map((p,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",borderBottom:i<hist.length-1?"1px solid #1E293B":"none"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:"#22D3A0",fontSize:14}}>✓</span><span style={{fontSize:13,color:"#CBD5E1"}}>{p.date}</span></div><span style={{fontSize:13,fontWeight:700,color:"#22D3A0"}}>R${p.amount}</span></div>))}</div>):<div style={{textAlign:"center",padding:"16px 0",color:"#475569",fontSize:13}}>Nenhum pagamento registrado</div>}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={{...S.prim,background:"linear-gradient(135deg,#22D3A0,#10B981)",color:"#0F1117",flex:1}} onClick={onRegister}>✅ Registrar pagamento</button>{data.phone&&<button style={{...S.prim,background:"#25D366",color:"#fff"}} onClick={onWA}>📱 WhatsApp</button>}<button style={{...S.ghost,borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={onOverdue}>⚠️ Marcar atraso</button></div>
    </Overlay>
  );
}

function ModalUserForm({data,onSave,onClose}){
  const[f,sf]=useState(data||{name:"",login:"",email:"",phone:"",password:"",profession:"Eletricista",plan:"pro",active:true});
  const[show,setShow]=useState(false);const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const ok=f.name&&f.login&&(data||f.password);
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div><div style={S.mtitle}>{data?"Editar Usuário":"Criar Usuário"}</div></div><XBtn onClick={onClose}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><FL label="Nome completo *"><input style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Ex: João da Silva"/></FL></div>
        <FL label="Login *"><input style={S.inp} value={f.login} onChange={e=>set("login",e.target.value.replace(/\s/g,""))} placeholder="joao123"/></FL>
        <FL label={data?"Nova senha":"Senha *"}><div style={{position:"relative"}}><input style={{...S.inp,paddingRight:36}} type={show?"text":"password"} value={f.password} onChange={e=>set("password",e.target.value)} placeholder="Mín. 4 caracteres"/><button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13}}>{show?"🙈":"👁️"}</button></div></FL>
        <FL label="E-mail"><input style={S.inp} type="email" value={f.email} onChange={e=>set("email",e.target.value)} placeholder="email@exemplo.com"/></FL>
        <FL label="WhatsApp"><input style={S.inp} value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="11999990000"/></FL>
        <FL label="Profissão"><select style={S.sel} value={f.profession} onChange={e=>set("profession",e.target.value)}>{PROFS.map(p=><option key={p}>{p}</option>)}</select></FL>
        <FL label="Plano"><select style={S.sel} value={f.plan||"pro"} onChange={e=>set("plan",e.target.value)}>{Object.entries(PLANS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></FL>
        <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#0F172A",borderRadius:10,border:"1px solid #1E293B"}}><span style={{fontSize:13,color:"#94A3B8"}}>Conta ativa</span><Toggle val={f.active} onChange={v=>set("active",v)}/><span style={{fontSize:12,color:f.active?"#22D3A0":"#64748B"}}>{f.active?"Ativa":"Bloqueada"}</span></div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"flex-end"}}><button style={S.ghost} onClick={onClose}>Cancelar</button><button style={{...S.prim,opacity:ok?1:.4,cursor:ok?"pointer":"not-allowed"}} onClick={()=>ok&&onSave(f)}>{data?"💾 Salvar":"✅ Criar Conta"}</button></div>
    </Overlay>
  );
}

/* ═══ APP SHELL ══════════════════════════════════════════════════ */
function AppShell({user,onLogout}){
  const[data,setData,loadD]=useStorage(`orc6:data:${user.id}`,null,false);
  const seeded=useRef(false);
  useEffect(()=>{
    if(!loadD&&(data===null||data===undefined)&&!seeded.current){
      seeded.current=true;
      setData(seedData(user.id));
    }
  },[loadD,data,setData,user.id]);

  // patch is stable: useCallback with setData dep only
  const patch=useCallback(k=>fn=>setData(d=>{
    const base=d||(seedData(user.id));
    return{...base,[k]:typeof fn==="function"?fn(base[k]):fn};
  }),[setData,user.id]);

  if(loadD||data===null||data===undefined)return<Splash user={user}/>;
  const profile={...BLANK_PROFILE,...(data.profile||{})};
  const theme=THEMES.find(t=>t.id===profile.themeId)||THEMES[0];
  const P=profile.primaryColor||theme.primary;const A=profile.accentColor||theme.accent;
  return<App user={user} data={{...data,profile}} patch={patch} themeP={P} themeA={A} onLogout={onLogout}/>;
}

/* ═══ APP ══════════════════════════════════════════════════════════ */
function App({user,data,patch,themeP,themeA,onLogout}){
  const{budgets=[],clients=[],templates=[],profile={},activity=[],agendamentos=[]}=data;
  // Memoize each setter so they're stable across renders
  const setBudgets  =useMemo(()=>patch("budgets"),   [patch]);
  const setClients  =useMemo(()=>patch("clients"),   [patch]);
  const setTemplates=useMemo(()=>patch("templates"), [patch]);
  const setProfile  =useMemo(()=>patch("profile"),   [patch]);
  const setActivity =useMemo(()=>patch("activity"),  [patch]);
  const setAgendamentos=useMemo(()=>patch("agendamentos"),[patch]);
  const[page,setPage]=useState("dashboard");
  const[modal,setModal]=useState(null);const[toast,setToast]=useState(null);
  const[filter,setFilter]=useState({status:"todos",cat:"todas",q:"",sort:"newest"});
  const[sideOpen,setSideOpen]=useState(true);
  const[orcCounter,setOrcCounter]=useStorage(`orc6:counter:${user.id}`,1,false);
  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const setActivityRef=useRef(setActivity);setActivityRef.current=setActivity;
  const addAct=useCallback(desc=>setActivityRef.current(a=>[{id:uid(),desc,ts:new Date().toLocaleString("pt-BR")},...(a||[])].slice(0,50)),[]);
  const nextNum=useMemo(()=>`ORC-${String(orcCounter||1).padStart(3,"0")}`,[orcCounter]);
  const budgetsRef=useRef(budgets);budgetsRef.current=budgets;
  const setBudgetsRef=useRef(setBudgets);setBudgetsRef.current=setBudgets;
  useEffect(()=>{
    // Run once on mount and whenever budgets change length
    const has=budgetsRef.current.some(b=>(b.status==="pendente"||b.status==="enviado")&&daysLeft(b.date,b.validity)<0);
    if(!has)return;
    setBudgetsRef.current(bs=>bs.map(b=>(b.status==="pendente"||b.status==="enviado")&&daysLeft(b.date,b.validity)<0?{...b,status:"expirado"}:b));
  },[budgets.length]); // only re-check when number of budgets changes

  const saveBudget=f=>{
    const total=calcTot(f.items,f.discount,f.tax);
    const counter=orcCounter||1;
    const num=`ORC-${String(counter).padStart(3,"0")}`;
    if(f.id){
      setBudgets(bs=>bs.map(b=>b.id===f.id?{...f,total}:b));
      addAct(`Editou ${f.num}`);
    } else {
      const n={...f,id:uid(),num,userId:user.id,total,createdAt:today(),status:f.status||"pendente"};
      setBudgets(bs=>[n,...(bs||[])]);
      setOrcCounter(c=>(c||1)+1);
      addAct(`Criou ${num}`);
    }
    if(f.clientName&&!clients.find(c=>c.id===f.clientId))
      setClients(cs=>[...cs,{id:f.clientId||uid(),userId:user.id,name:f.clientName,phone:f.phone||"",email:f.email||"",city:"",cpfcnpj:"",obs:""}]);
    showToast(f.id?"Orçamento atualizado ✓":"Orçamento criado! 🎉");
    setModal(null);
  };
  const setStatus=(id,st)=>{setBudgets(bs=>bs.map(b=>b.id===id?{...b,status:st}:b));showToast(`Status: ${STATUS[st].label}`);};
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
    const pagamento=b.paymentMethod?`\n💳 *Pagamento:* ${b.paymentMethod}`:"";
    const garantia=b.warrantyDays>0?`\n🛡️ *Garantia:* ${b.warrantyDays} dias`:"";
    const urgente=b.urgent?"\n🚨 *Serviço urgente*":"";
    const msg=`${profile.whatsappMsg||"Olá! Segue seu orçamento:"}\n\n`+
      `🔧 *ORÇAMENTO ${b.num}*\n📋 *${b.title}*${b.urgent?" 🚨":""}\n\n`+
      `📝 *Itens:*\n${lines}`+
      (b.discount>0?`\n🏷️ Desconto: ${b.discount}%`:"")+
      `\n\n💰 *TOTAL: ${fmtBRL(b.total)}*`+pagamento+garantia+urgente+
      `\n📅 Válido por ${b.validity} dias a partir de ${b.date}.`+
      (b.notes?`\n\n📝 ${b.notes}`:"")+
      `\n\n${profile.signOff||"Fico à disposição! 😊"}`;
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
    const ap=budgets.filter(b=>b.status==="aprovado");const pend=budgets.filter(b=>b.status==="pendente"||b.status==="enviado");
    return{total:budgets.length,aprovado:ap.length,pendente:pend.length,recusado:budgets.filter(b=>b.status==="recusado").length,
      receita:ap.reduce((s,b)=>s+b.total,0),pipeline:pend.reduce((s,b)=>s+b.total,0),
      taxa:budgets.length?Math.round(ap.length/budgets.length*100):0,
      tick:ap.length?Math.round(ap.reduce((s,b)=>s+b.total,0)/ap.length):0};
  },[budgets]);

  const plan=profile.plan||"pro";const planInfo=PLANS[plan]||PLANS.pro;const planPct=Math.round((budgets.length/planInfo.max)*100);
  const NAVS=[
    {id:"dashboard",ico:"📊",lbl:"Dashboard"},{id:"lista",ico:"📋",lbl:"Orçamentos"},
    {id:"clientes",ico:"👥",lbl:"Clientes"},{id:"agenda",ico:"📅",lbl:"Agenda"},
    {id:"relatorio",ico:"📈",lbl:"Relatórios"},{id:"templates",ico:"📄",lbl:"Templates"},
    {id:"atividade",ico:"🕐",lbl:"Atividades"},{id:"config",ico:"⚙️",lbl:"Meu Perfil"},
  ];

  return(
    <div style={S.root}>
      <aside style={{...S.side,width:sideOpen?246:68,transition:"width .3s cubic-bezier(.4,0,.2,1)",borderRight:`1px solid ${themeP}18`}}>
        <div style={S.sTop}>
          <div style={S.logo} onClick={()=>setSideOpen(o=>!o)}>
            {profile.logo&&profile.showLogo!==false?<img src={profile.logo} alt="logo" style={{width:sideOpen?32:28,height:sideOpen?32:28,borderRadius:8,objectFit:"contain",flexShrink:0}}/>:<div style={{width:32,height:32,background:`linear-gradient(135deg,${themeP},${themeA})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>⚡</div>}
            {sideOpen&&<span style={{...S.logoTxt,color:themeP}}>{profile.name||"OrcaPro"}</span>}
          </div>
          {sideOpen&&(<div style={{...S.chip,borderColor:`${themeP}25`,background:`${themeP}08`}}>{profile.logo?<img src={profile.logo} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>:<Ava name={user.name} size={32} color={themeP}/>}<div style={{overflow:"hidden",flex:1}}><div style={{...S.chipName,color:"#F1F5F9"}}>{profile.name||user.name}</div><div style={{...S.chipRole,color:themeP}}>{profile.profession||user.profession||"Prestador"}</div></div><PlBadge plan={plan} color={themeP} small/></div>)}
          {sideOpen&&(<div style={{marginTop:8,padding:"8px 10px",background:"#0F172A",borderRadius:10,border:"1px solid #1E293B"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,color:"#64748B",fontWeight:700,textTransform:"uppercase"}}>Plano {planInfo.label}</span><span style={{fontSize:10,color:planPct>80?"#F87171":"#64748B"}}>{budgets.length}/{planInfo.max}</span></div><div style={{height:4,background:"#1E293B",borderRadius:2}}><div style={{height:"100%",width:`${Math.min(planPct,100)}%`,background:planPct>80?"#F87171":`linear-gradient(90deg,${themeP},${themeA})`,borderRadius:2,transition:"width .5s"}}/></div></div>)}
        </div>
        <nav style={S.nav}>
          {NAVS.map(n=>(<button key={n.id} style={{...S.nb,...(page===n.id?{...S.nba,background:`${themeP}12`,color:themeP}:{})}} onClick={()=>setPage(n.id)} title={n.lbl}><span style={{fontSize:16,flexShrink:0,width:22,textAlign:"center"}}>{n.ico}</span>{sideOpen&&<React.Fragment><span style={{flex:1}}>{n.lbl}</span>{page===n.id&&<span style={{...S.ndot,background:themeP}}/>}</React.Fragment>}</button>))}
        </nav>
        <div style={S.sBot}>
          <button style={{...S.newBtn,background:`linear-gradient(135deg,${themeP},${themeA})`,...(!sideOpen?{padding:"10px",justifyContent:"center"}:{})}} onClick={()=>setModal({type:"budget",data:null})} title="Novo Orçamento"><span>+</span>{sideOpen&&<span>Novo Orçamento</span>}</button>
          <button style={{...S.logBtn,...(!sideOpen?{padding:"8px",justifyContent:"center"}:{})}} onClick={onLogout} title="Sair"><span>🚪</span>{sideOpen&&<span>Sair</span>}</button>
        </div>
      </aside>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{...S.topbar,borderBottom:`1px solid ${themeP}15`}}>
          <div style={{fontSize:13,color:"#475569"}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {profile.tagline&&<div style={{fontSize:11,color:themeP,fontWeight:600,background:`${themeP}10`,padding:"3px 10px",borderRadius:20,border:`1px solid ${themeP}25`}}>{profile.tagline}</div>}
            <button style={{...S.topBtn,color:themeP}} onClick={()=>setPage("config")}>{profile.logo?<img src={profile.logo} alt="" style={{width:26,height:26,borderRadius:"50%",objectFit:"cover"}}/>:<Ava name={user.name} size={26} color={themeP}/>}<span style={{fontSize:13,fontWeight:600,color:"#CBD5E1"}}>{(profile.name||user.name).split(" ")[0]}</span></button>
          </div>
        </div>
        <main style={{flex:1,overflowY:"auto",background:"#0A0E1A"}}>
          {page==="dashboard"&&<PageDash stats={stats} budgets={budgets} user={user} profile={profile} clients={clients} agendamentos={agendamentos} themeP={themeP} themeA={themeA} setModal={setModal} setStatus={setStatus} sendWA={sendWA} setPage={setPage}/>}
          {page==="lista"    &&<PageLista filtered={filtered} filter={filter} setFilter={setFilter} themeP={themeP} themeA={themeA} setModal={setModal} setStatus={setStatus} sendWA={sendWA} delBudget={delBudget}/>}
          {page==="clientes" &&<PageClientes budgets={budgets} clients={clients} setModal={setModal}/>}
          {page==="agenda"   &&<PageAgenda agendamentos={agendamentos} setAgendamentos={setAgendamentos} setModal={setModal} themeP={themeP} themeA={themeA}/>}
          {page==="relatorio"&&<PageRelatorio budgets={budgets} stats={stats} clients={clients}/>}
          {page==="templates"&&<PageTemplates templates={templates} setModal={setModal}/>}
          {page==="atividade"&&<PageAtividade activity={activity}/>}
          {page==="config"   &&<PageConfig profile={profile} setProfile={setProfile} user={user} themeP={themeP} themeA={themeA} showToast={showToast}/>}
        </main>
      </div>
      {modal?.type==="budget"      &&<ModalBudget data={modal.data} clients={clients} templates={templates} onSave={saveBudget} onClose={()=>setModal(null)} nextNum={nextNum} userId={user.id} themeP={themeP} themeA={themeA}/>}
      {modal?.type==="detail"      &&<ModalDetail data={modal.data} onClose={()=>setModal(null)} setStatus={setStatus} sendWA={sendWA} onEdit={d=>setModal({type:"budget",data:d})} onDelete={delBudget} themeP={themeP} setModal={setModal}/>}
      {modal?.type==="client"      &&<ModalClient data={modal.data} onSave={saveClient} onDelete={delClient} onClose={()=>setModal(null)}/>}
      {modal?.type==="template"    &&<ModalTemplate data={modal.data} onSave={saveTpl} onDelete={delTpl} onClose={()=>setModal(null)}/>}
      {modal?.type==="preview"     &&<ModalPreview data={modal.data} profile={profile} onClose={()=>setModal(null)} sendWA={sendWA} themeP={themeP} themeA={themeA}/>}
      {modal?.type==="recibo"      &&<ModalRecibo data={modal.data} profile={profile} onClose={()=>setModal(null)} themeP={themeP} themeA={themeA}/>}
      {modal?.type==="rating"      &&<ModalRating data={modal.data} onSave={r=>setBudgets(bs=>bs.map(b=>b.id===modal.data.id?{...b,rating:r}:b))} onClose={()=>setModal(null)} themeP={themeP}/>}
      {modal?.type==="agendamento" &&<ModalAgendamento data={modal.data} onSave={a=>setAgendamentos(ag=>[...(ag||[]),a])} onClose={()=>setModal(null)} themeP={themeP}/>}
      {toast&&<Toast msg={toast.msg} type={toast.type} color={themeP}/>}
    </div>
  );
}

/* ═══ PAGE CONFIG ═══════════════════════════════════════════════ */
function PageConfig({profile,setProfile,user,themeP,themeA,showToast}){
  const[f,sf]=useState({...BLANK_PROFILE,...profile});
  const[logoPreview,setLogoPreview]=useState(profile.logo||"");
  const[tab,setTab]=useState("dados");const[saved,setSaved]=useState(false);const fileRef=useRef();
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const handleLogo=async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2*1024*1024){showToast("Imagem muito grande! Máx. 2MB","warn");return;}const b64=await readFile(file);setLogoPreview(b64);set("logo",b64);showToast("Logo carregada ✓");};
  const removeLogo=()=>{setLogoPreview("");set("logo","");showToast("Logo removida","warn");};
  const save=()=>{setProfile({...f,logo:logoPreview});setSaved(true);showToast("Perfil salvo ✓");setTimeout(()=>setSaved(false),2500);};
  const selTheme=tid=>{const t=THEMES.find(x=>x.id===tid)||THEMES[0];sf(p=>({...p,themeId:tid,primaryColor:t.primary,secondaryColor:t.secondary,accentColor:t.accent}));};
  const TABS=[{id:"dados",lbl:"👤 Dados"},{id:"visual",lbl:"🎨 Visual"},{id:"orcamento",lbl:"📄 Orçamento"},{id:"pagamento",lbl:"💳 Pagamento"},{id:"social",lbl:"🌐 Links"}];
  return(
    <div style={S.page}>
      <PHead title="Meu Perfil" sub="Personalize sua identidade — cada detalhe conta"><button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`}} onClick={save}>{saved?"✅ Salvo!":"💾 Salvar tudo"}</button></PHead>
      <div style={{background:`linear-gradient(135deg,${themeP}18,${themeA}10)`,border:`1px solid ${themeP}30`,borderRadius:20,padding:24,marginBottom:22,display:"flex",alignItems:"center",gap:20}}>
        <div style={{position:"relative"}}>
          {logoPreview?<img src={logoPreview} alt="logo" style={{width:80,height:80,borderRadius:16,objectFit:"contain",border:`2px solid ${themeP}40`,background:"#0F172A",padding:4}}/>:<div style={{width:80,height:80,borderRadius:16,background:`linear-gradient(135deg,${themeP},${themeA})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>⚡</div>}
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
        <div style={{marginLeft:"auto",textAlign:"center"}}><div style={{padding:"6px 16px",borderRadius:20,background:`${themeP}15`,border:`1px solid ${themeP}30`,color:themeP,fontWeight:700,fontSize:12}}>Plano {PLANS[f.plan||"pro"]?.label}</div><div style={{fontSize:10,color:"#475569",marginTop:4}}>Preview do perfil</div></div>
      </div>
      <div style={{display:"flex",gap:4,background:"#111827",borderRadius:14,padding:4,marginBottom:20,border:"1px solid #1E293B"}}>
        {TABS.map(t=>(<button key={t.id} style={{flex:1,padding:"9px",border:"none",borderRadius:10,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:tab===t.id?700:500,background:tab===t.id?themeP:"transparent",color:tab===t.id?"#0F1117":"#64748B",transition:"all .2s"}} onClick={()=>setTab(t.id)}>{t.lbl}</button>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:14,maxWidth:680}}>
        {tab==="dados"&&(
          <Card title="👤 Dados Pessoais / Empresa">
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleLogo}/>
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
        )}
        {tab==="visual"&&(
          <React.Fragment>
            <Card title="🖼️ Logo da Empresa">
              <div style={{marginTop:12,display:"flex",alignItems:"flex-start",gap:20}}>
                <div style={{flexShrink:0}}>
                  {logoPreview?<div style={{position:"relative"}}><img src={logoPreview} alt="Logo" style={{width:120,height:120,borderRadius:16,objectFit:"contain",border:`2px solid ${themeP}40`,background:"#0F172A",padding:8}}/><button onClick={removeLogo} style={{position:"absolute",top:-8,right:-8,width:22,height:22,borderRadius:"50%",background:"#F87171",border:"none",cursor:"pointer",fontSize:11,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>✕</button></div>:<div style={{width:120,height:120,borderRadius:16,border:`2px dashed ${themeP}40`,background:"#0F172A",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer"}} onClick={()=>fileRef.current?.click()}><div style={{fontSize:32}}>🖼️</div><div style={{fontSize:10,color:"#475569",textAlign:"center"}}>Clique para<br/>adicionar logo</div></div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"#CBD5E1",marginBottom:8,fontWeight:600}}>Sua logo aparece em:</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>{["Sidebar do sistema","Preview do orçamento","Cabeçalho do documento","Recibos de serviço"].map(item=>(<div key={item} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#94A3B8"}}><span style={{color:themeP}}>✓</span>{item}</div>))}</div>
                  <div style={{marginTop:12,display:"flex",gap:8}}><button onClick={()=>fileRef.current?.click()} style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`,fontSize:12,padding:"8px 16px"}}>📁 {logoPreview?"Trocar logo":"Enviar logo"}</button>{logoPreview&&<button onClick={removeLogo} style={{...S.ghost,fontSize:12,padding:"8px 14px",borderColor:"rgba(248,113,113,.3)",color:"#F87171"}}>🗑️ Remover</button>}</div>
                  <div style={{fontSize:11,color:"#475569",marginTop:8}}>PNG, JPG ou SVG · Máx. 2MB · Recomendado: 400×200px</div>
                  {logoPreview&&<div style={{marginTop:12,display:"flex",alignItems:"center",gap:10}}><Toggle val={f.showLogo!==false} onChange={v=>set("showLogo",v)}/><span style={{fontSize:12,color:"#94A3B8"}}>Mostrar logo nos documentos</span></div>}
                </div>
              </div>
            </Card>
            <Card title="🎨 Cores e Tema">
              <div style={{fontSize:12,color:"#64748B",marginBottom:14}}>Escolha um tema pronto ou personalize as cores.</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
                {THEMES.filter(t=>t.id!=="custom").map(t=>(<button key={t.id} style={{padding:"10px 8px",borderRadius:12,border:f.themeId===t.id?`2px solid ${t.primary}`:"2px solid #1E293B",background:f.themeId===t.id?`${t.primary}15`:"#0F172A",cursor:"pointer",transition:"all .2s"}} onClick={()=>selTheme(t.id)}><div style={{display:"flex",gap:4,justifyContent:"center",marginBottom:6}}>{[t.primary,t.secondary,t.accent].map((c,i)=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:c}}/>)}</div><div style={{fontSize:10,color:f.themeId===t.id?t.primary:"#64748B",fontWeight:700}}>{t.name}</div></button>))}
              </div>
              <div style={{padding:16,background:"#0F172A",borderRadius:14,border:"1px solid #1E293B"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#94A3B8",marginBottom:12}}>🖌️ Personalização Avançada</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  {[["Cor Principal","primaryColor"],["Cor Secundária","secondaryColor"],["Cor de Destaque","accentColor"]].map(([lbl,k])=>(<FL key={k} label={lbl}><div style={{display:"flex",gap:8,alignItems:"center"}}><input type="color" value={f[k]||"#818CF8"} onChange={e=>{set(k,e.target.value);set("themeId","custom");}} style={{width:38,height:38,border:"none",borderRadius:8,cursor:"pointer",background:"none",padding:2}}/><input style={{...S.inp,flex:1,fontSize:11,fontFamily:"monospace"}} value={f[k]||"#818CF8"} onChange={e=>{set(k,e.target.value);set("themeId","custom");}} placeholder="#000000"/></div></FL>))}
                </div>
              </div>
            </Card>
          </React.Fragment>
        )}
        {tab==="orcamento"&&(
          <Card title="📄 Configurações do Orçamento">
            <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:12}}>
              <FL label="Validade padrão (dias)"><input style={S.inp} type="number" min={1} value={f.defaultValidity||15} onChange={e=>set("defaultValidity",Number(e.target.value))} placeholder="15"/></FL>
              <FL label="Assinatura padrão (WhatsApp e documentos)"><textarea style={{...S.inp,height:72,resize:"vertical"}} value={f.signOff||""} onChange={e=>set("signOff",e.target.value)} placeholder="Fico à disposição para qualquer dúvida! 😊"/></FL>
              <FL label="Nota de cabeçalho"><input style={S.inp} value={f.headerNote||""} onChange={e=>set("headerNote",e.target.value)} placeholder="Ex: Orçamento sem compromisso · CNPJ 00.000.000/0001-00"/></FL>
              <FL label="Nota de rodapé"><input style={S.inp} value={f.footerNote||""} onChange={e=>set("footerNote",e.target.value)} placeholder="Ex: Validade sujeita a disponibilidade de materiais"/></FL>
              <FL label="Mensagem personalizada WhatsApp"><textarea style={{...S.inp,height:60,resize:"vertical"}} value={f.whatsappMsg||""} onChange={e=>set("whatsappMsg",e.target.value)} placeholder="Olá! Segue abaixo seu orçamento:"/></FL>
            </div>
          </Card>
        )}
        {tab==="pagamento"&&(
          <Card title="💳 Dados de Pagamento">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
              <FL label="Chave PIX"><input style={S.inp} value={f.pixKey||""} onChange={e=>set("pixKey",e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória"/></FL>
              <FL label="Banco"><input style={S.inp} value={f.bank||""} onChange={e=>set("bank",e.target.value)} placeholder="Ex: Nubank, Itaú, Caixa"/></FL>
              <FL label="CPF / CNPJ"><input style={S.inp} value={f.cnpj||""} onChange={e=>set("cnpj",e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0001-00"/></FL>
              <div style={{gridColumn:"1/-1"}}><FL label="Condições de pagamento padrão"><input style={S.inp} value={f.paymentTerms||""} onChange={e=>set("paymentTerms",e.target.value)} placeholder="Ex: 50% na aprovação, 50% na conclusão"/></FL></div>
            </div>
            <div style={{marginTop:14,padding:12,background:`${themeP}08`,borderRadius:10,border:`1px solid ${themeP}20`,fontSize:12,color:"#64748B"}}><span style={{color:themeP,fontWeight:700}}>💡 Dica:</span> Esses dados aparecem nos recibos de serviço e facilitam o pagamento dos clientes.</div>
          </Card>
        )}
        {tab==="social"&&(
          <React.Fragment>
            <Card title="🌐 Redes e Contatos">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
                <FL label="🌐 Website"><input style={S.inp} value={f.website||""} onChange={e=>set("website",e.target.value)} placeholder="https://meusite.com.br"/></FL>
                <FL label="📸 Instagram"><input style={S.inp} value={f.instagram||""} onChange={e=>set("instagram",e.target.value)} placeholder="@seuinstagram"/></FL>
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
        <button style={{...S.prim,padding:"12px",fontSize:14,background:`linear-gradient(135deg,${themeP},${themeA})`,boxShadow:`0 4px 16px ${themeP}30`}} onClick={save}>{saved?"✅ Perfil salvo com sucesso!":"💾 Salvar todas as alterações"}</button>
      </div>
    </div>
  );
}

/* ═══ MODAL PREVIEW ════════════════════════════════════════════ */
function ModalPreview({data,profile,onClose,sendWA,themeP,themeA}){
  const sub=calcSub(data.items);
  return(
    <Overlay onClose={onClose} wide>
      <div style={S.mhead}><div><div style={S.mtitle}>Preview do Orçamento</div><div style={S.msub}>Como o cliente verá — com sua identidade visual</div></div><XBtn onClick={onClose}/></div>
      <div style={{background:"#fff",borderRadius:14,overflow:"hidden",color:"#1E293B",fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{background:`linear-gradient(135deg,${themeP},${themeA})`,padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            {profile.logo&&profile.showLogo!==false?<img src={profile.logo} alt="logo" style={{height:44,maxWidth:120,objectFit:"contain",background:"rgba(255,255,255,.15)",borderRadius:8,padding:"4px 8px"}}/>:<div style={{width:44,height:44,borderRadius:10,background:"rgba(255,255,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚡</div>}
            <div><div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{profile.name||"Sua Empresa"}</div>{profile.profession&&<div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>{profile.profession}</div>}{profile.tagline&&<div style={{fontSize:10,color:"rgba(255,255,255,.7)",fontStyle:"italic"}}>{profile.tagline}</div>}</div>
          </div>
          <div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:800,color:"rgba(255,255,255,.9)"}}>{data.num}</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>{data.date}</div><div style={{marginTop:4,display:"inline-block",padding:"2px 10px",borderRadius:20,background:"rgba(255,255,255,.2)",color:"#fff",fontSize:10,fontWeight:700}}>{STATUS[data.status]?.icon} {STATUS[data.status]?.label}</div></div>
        </div>
        {profile.headerNote&&<div style={{background:`${themeP}10`,padding:"8px 24px",fontSize:11,color:themeP,fontWeight:500,borderBottom:`1px solid ${themeP}20`}}>{profile.headerNote}</div>}
        <div style={{padding:"20px 24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18}}>
            <div><div style={{fontSize:10,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,marginBottom:5}}>Cliente</div><div style={{fontWeight:700,fontSize:15,color:"#1E293B"}}>{data.clientName}</div>{data.phone&&<div style={{fontSize:12,color:"#64748B"}}>📱 {data.phone}</div>}</div>
            <div><div style={{fontSize:10,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,marginBottom:5}}>Serviço</div><div style={{fontWeight:700,fontSize:14,color:"#1E293B"}}>{data.title}{data.urgent&&" 🚨"}</div><div style={{fontSize:11,color:"#64748B"}}>{data.category} · Válido {data.validity} dias</div>{data.warrantyDays>0&&<div style={{fontSize:11,color:"#059669",marginTop:2}}>🛡️ Garantia: {data.warrantyDays} dias</div>}</div>
          </div>
          {data.desc&&<div style={{padding:"10px 14px",background:`${themeP}08`,borderRadius:10,borderLeft:`3px solid ${themeP}`,fontSize:12,color:"#475569",marginBottom:16}}>{data.desc}</div>}
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:16}}>
            <thead><tr style={{background:`${themeP}10`}}>{["Descrição","Qtd","Unid.","Valor unit.","Total"].map(h=><th key={h} style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:themeP,textAlign:"left",border:`1px solid ${themeP}15`}}>{h}</th>)}</tr></thead>
            <tbody>{data.items.map((it,i)=>(<tr key={i} style={{background:i%2===0?"#fff":"#F8FAFC"}}>{[it.desc,it.qty,it.unit,fmtBRL(it.price),fmtBRL((it.qty||0)*(it.price||0))].map((v,j)=>(<td key={j} style={{padding:"8px 12px",fontSize:12,border:"1px solid #E2E8F0",fontWeight:j===4?700:400,color:j===4?themeP:"#1E293B"}}>{v}</td>))}</tr>))}</tbody>
          </table>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <div style={{minWidth:240}}>
              {data.discount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748B",marginBottom:4}}><span>Subtotal</span><span>{fmtBRL(sub)}</span></div>}
              {data.discount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#EF4444",marginBottom:4}}><span>Desconto ({data.discount}%)</span><span>-{fmtBRL(sub*data.discount/100)}</span></div>}
              {data.tax>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#3B82F6",marginBottom:4}}><span>Impostos ({data.tax}%)</span><span>+{fmtBRL(sub*(1-data.discount/100)*data.tax/100)}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:20,color:themeP,paddingTop:8,borderTop:`2px solid ${themeP}40`,marginTop:4}}><span>TOTAL</span><span>{fmtBRL(data.total)}</span></div>
              {data.paymentMethod&&<div style={{fontSize:11,color:"#64748B",textAlign:"right",marginTop:4}}>via {data.paymentMethod}</div>}
            </div>
          </div>
          {data.notes&&<div style={{marginTop:14,padding:"10px 14px",background:"#FFFBEB",borderRadius:10,border:"1px solid #FDE68A",fontSize:12,color:"#92400E"}}>📝 {data.notes}</div>}
          {profile.paymentTerms&&<div style={{marginTop:10,padding:"8px 14px",background:"#F0FDF4",borderRadius:10,border:"1px solid #BBF7D0",fontSize:12,color:"#166534"}}>💳 {profile.paymentTerms}</div>}
          <div style={{marginTop:18,paddingTop:14,borderTop:"1px solid #E2E8F0",display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:8}}>
            <div>{profile.footerNote&&<div style={{fontSize:11,color:"#94A3B8",marginBottom:4,fontStyle:"italic"}}>{profile.footerNote}</div>}<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{profile.phone&&<span style={{fontSize:11,color:"#64748B"}}>📱 {profile.phone}</span>}{profile.email&&<span style={{fontSize:11,color:"#64748B"}}>✉️ {profile.email}</span>}{profile.pixKey&&<span style={{fontSize:11,color:"#64748B"}}>PIX: {profile.pixKey}</span>}{profile.website&&<span style={{fontSize:11,color:themeP}}>🌐 {profile.website}</span>}{profile.instagram&&<span style={{fontSize:11,color:themeP}}>📸 {profile.instagram}</span>}{profile.crea&&<span style={{fontSize:11,color:"#64748B"}}>📋 {profile.crea}</span>}</div></div>
            <div style={{fontSize:11,color:"#94A3B8",textAlign:"right"}}>{profile.signOff||""}</div>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}><button style={S.ghost} onClick={onClose}>Fechar</button><button style={{...S.prim,background:"#25D366",color:"#fff"}} onClick={()=>{sendWA(data);onClose();}}>📱 Enviar via WhatsApp</button></div>
    </Overlay>
  );
}

/* ═══ MODAL RECIBO ══════════════════════════════════════════════ */
function ModalRecibo({data,profile,onClose,themeP,themeA}){
  const reciboNum=`REC-${data.num?.replace("ORC-","")}`;
  return(
    <Overlay onClose={onClose} wide>
      <div style={S.mhead}><div><div style={S.mtitle}>🧾 Recibo de Serviço</div><div style={S.msub}>{reciboNum}</div></div><div style={{display:"flex",gap:8}}><button style={{...S.ghost,fontSize:12}} onClick={()=>window.print()}>🖨️ Imprimir</button><XBtn onClick={onClose}/></div></div>
      <div style={{background:"#fff",borderRadius:14,padding:28,color:"#1E293B"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,paddingBottom:16,borderBottom:"2px solid #E2E8F0"}}>
          <div>{profile.logo&&<img src={profile.logo} alt="logo" style={{height:40,marginBottom:8,objectFit:"contain"}}/>}<div style={{fontSize:16,fontWeight:800}}>{profile.name||"Prestador"}</div><div style={{fontSize:12,color:"#64748B"}}>{profile.profession}</div>{profile.crea&&<div style={{fontSize:11,color:"#64748B"}}>{profile.crea}</div>}{profile.phone&&<div style={{fontSize:11,color:"#64748B"}}>📱 {profile.phone}</div>}{profile.cnpj&&<div style={{fontSize:11,color:"#64748B"}}>CPF/CNPJ: {profile.cnpj}</div>}</div>
          <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:900,color:themeP}}>RECIBO</div><div style={{fontSize:14,fontWeight:700}}>{reciboNum}</div><div style={{fontSize:12,color:"#64748B"}}>Data: {today()}</div><div style={{marginTop:8,padding:"4px 12px",background:"#22D3A020",borderRadius:20,fontSize:12,fontWeight:700,color:"#059669",display:"inline-block"}}>✅ PAGO</div></div>
        </div>
        <div style={{marginBottom:16}}><div style={{fontSize:10,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Recebemos de</div><div style={{fontSize:16,fontWeight:700}}>{data.clientName}</div>{data.phone&&<div style={{fontSize:12,color:"#64748B"}}>📱 {data.phone}</div>}</div>
        <div style={{marginBottom:16,padding:"12px 16px",background:"#F8FAFC",borderRadius:10}}><div style={{fontSize:10,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Referente a</div><div style={{fontSize:14,fontWeight:600}}>{data.title}</div><div style={{fontSize:12,color:"#64748B"}}>{data.category} · Orçamento {data.num}</div>{data.warrantyDays>0&&<div style={{fontSize:11,color:"#059669",marginTop:4}}>🛡️ Garantia: {data.warrantyDays} dias</div>}</div>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}>
          <div style={{minWidth:220}}><div style={{display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:22,color:themeP,paddingTop:8,borderTop:`2px solid ${themeP}40`}}><span>TOTAL PAGO</span><span>{fmtBRL(data.total)}</span></div>{data.paymentMethod&&<div style={{fontSize:12,color:"#64748B",textAlign:"right",marginTop:4}}>via {data.paymentMethod}</div>}</div>
        </div>
        <div style={{borderTop:"1px solid #E2E8F0",paddingTop:16,display:"flex",justifyContent:"space-between",fontSize:11,color:"#94A3B8"}}>
          <div><div style={{fontWeight:600,color:"#475569",marginBottom:2}}>{profile.name}</div>{profile.pixKey&&<div>PIX: {profile.pixKey}</div>}{profile.bank&&<div>Banco: {profile.bank}</div>}{profile.cnpj&&<div>CPF/CNPJ: {profile.cnpj}</div>}</div>
          <div style={{textAlign:"right"}}><div style={{height:40,width:140,borderTop:"1px solid #CBD5E1",paddingTop:4,marginTop:20}}>Assinatura</div></div>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══ MODAL AVALIAÇÃO ══════════════════════════════════════════ */
function ModalRating({data,onSave,onClose,themeP}){
  const[rating,setRating]=useState(5);const[comment,setComment]=useState("");
  const labels=["","Ruim 😞","Regular 😐","Bom 🙂","Ótimo 😊","Excelente! 🤩"];
  const sendWARating=()=>{
    const msg=`Olá ${data.clientName}! 😊\n\nFicamos felizes em ter te atendido!\n\nVocê poderia nos dar uma avaliação do serviço *${data.title}*?\n\nResponda com uma nota de 1 a 5! ⭐\n\nObrigado!`;
    window.open(`https://wa.me/55${(data.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`,"_blank");
  };
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div style={S.mtitle}>⭐ Avaliação do Cliente</div><XBtn onClick={onClose}/></div>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:13,color:"#64748B",marginBottom:12}}>Como o cliente avaliou: <b style={{color:"#CBD5E1"}}>{data.title}</b></div>
        <div style={{display:"flex",justifyContent:"center",gap:8}}>
          {[1,2,3,4,5].map(n=>(<button key={n} onClick={()=>setRating(n)} style={{background:"none",border:"none",cursor:"pointer",fontSize:36,opacity:n<=rating?1:0.3,transition:"all .15s",transform:n<=rating?"scale(1.1)":"scale(1)"}}>⭐</button>))}
        </div>
        <div style={{fontSize:14,fontWeight:700,color:themeP,marginTop:8}}>{labels[rating]}</div>
      </div>
      <div style={{marginBottom:16}}><FL label="Comentário (opcional)"><textarea style={{...S.inp,height:70,resize:"vertical"}} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Ex: Serviço excelente, prazo cumprido!"/></FL></div>
      <div style={{display:"flex",gap:8}}>
        {data.phone&&<button style={{...S.prim,background:"#25D366",color:"#fff"}} onClick={sendWARating}>📱 Pedir via WhatsApp</button>}
        <button style={{...S.prim,flex:1,background:`linear-gradient(135deg,${themeP},#6366F1)`}} onClick={()=>{onSave({rating,comment,date:today()});onClose();}}>💾 Registrar avaliação</button>
      </div>
    </Overlay>
  );
}

/* ═══ MODAL AGENDAMENTO ════════════════════════════════════════ */
function ModalAgendamento({data,onSave,onClose,themeP}){
  const[f,sf]=useState({date:today(),time:"08:00",duration:"2h",address:"",notes:""});
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const sendAgenda=()=>{
    const msg=`📅 *AGENDAMENTO CONFIRMADO*\n\n*Serviço:* ${data.title}\n*Data:* ${f.date} às ${f.time}\n*Duração estimada:* ${f.duration}\n${f.address?`*Local:* ${f.address}\n`:""}${f.notes?`*Obs:* ${f.notes}`:""}`.trim();
    window.open(`https://wa.me/55${(data.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`,"_blank");
    onSave({...f,budgetId:data.id,clientName:data.clientName,title:data.title});onClose();
  };
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div style={S.mtitle}>📅 Agendar Visita/Serviço</div><XBtn onClick={onClose}/></div>
      <div style={{marginBottom:14,padding:"10px 14px",background:"#0F172A",borderRadius:10,border:"1px solid #1E293B",fontSize:13,color:"#CBD5E1"}}>👤 {data.clientName} · {data.title}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <FL label="Data *"><input style={S.inp} type="date" value={f.date} onChange={e=>set("date",e.target.value)}/></FL>
        <FL label="Horário *"><input style={S.inp} type="time" value={f.time} onChange={e=>set("time",e.target.value)}/></FL>
        <FL label="Duração estimada"><select style={S.sel} value={f.duration} onChange={e=>set("duration",e.target.value)}>{["30min","1h","2h","3h","4h","6h","8h","1 dia","2 dias","3 dias","1 semana"].map(d=><option key={d}>{d}</option>)}</select></FL>
        <FL label="Endereço"><input style={S.inp} value={f.address} onChange={e=>set("address",e.target.value)} placeholder="Rua, número, bairro"/></FL>
        <div style={{gridColumn:"1/-1"}}><FL label="Observações"><textarea style={{...S.inp,height:56,resize:"vertical"}} value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Levar ferramentas específicas, chave do portão…"/></FL></div>
      </div>
      <div style={{display:"flex",gap:8}}>
        {data.phone&&<button style={{...S.prim,flex:1,background:"#25D366",color:"#fff"}} onClick={sendAgenda}>📱 Confirmar via WhatsApp</button>}
        <button style={{...S.prim,flex:1,background:`linear-gradient(135deg,${themeP},#6366F1)`}} onClick={()=>{onSave({...f,budgetId:data.id,clientName:data.clientName,title:data.title});onClose();}}>💾 Salvar agendamento</button>
      </div>
    </Overlay>
  );
}

/* ═══ MODAL MARGEM ══════════════════════════════════════════════ */
function ModalMargem({items,total,onClose,themeP,themeA}){
  const[laborPct,setLaborPct]=useState(60);const[overhead,setOverhead]=useState(15);const[margin,setMargin]=useState(20);
  const mat=total*(1-laborPct/100);const lab=total*(laborPct/100);
  const over=total*(overhead/100);const profit=total*(margin/100);
  const suggested=mat+lab+over+profit;
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div><div style={S.mtitle}>💡 Calculadora de Margem</div><div style={S.msub}>Baseado no total atual: {fmtBRL(total)}</div></div><XBtn onClick={onClose}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[["Mão de obra %",laborPct,setLaborPct],["Overhead %",overhead,setOverhead],["Margem desejada %",margin,setMargin]].map(([label,val,setter])=>(
          <div key={label}><label style={{fontSize:10,color:"#475569",fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label><input type="number" min={0} max={100} style={{...S.inp}} value={val} onChange={e=>setter(Number(e.target.value))}/></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {[["🔧 Material",mat,"#60A5FA"],["👷 Mão de obra",lab,"#818CF8"],["🏢 Overhead",over,"#F59E0B"],["💰 Lucro",profit,"#22D3A0"]].map(([label,val,color])=>(
          <div key={label} style={{background:"#0F172A",borderRadius:10,padding:"10px 12px",border:`1px solid ${color}20`}}><div style={{fontSize:11,color:"#64748B",marginBottom:3}}>{label}</div><div style={{fontSize:16,fontWeight:700,color}}>{fmtBRL(val)}</div></div>
        ))}
      </div>
      <div style={{padding:"12px 16px",background:`${themeP}10`,borderRadius:12,border:`1px solid ${themeP}30`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94A3B8"}}>Preço sugerido com {margin}% de margem:</span>
        <span style={{fontSize:20,fontWeight:900,color:themeP}}>{fmtBRL(suggested)}</span>
      </div>
      <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}><button style={S.ghost} onClick={onClose}>Fechar</button></div>
    </Overlay>
  );
}

/* ═══ PAGES ════════════════════════════════════════════════════ */
function MetaCard({budgets,themeP,themeA}){
  const[meta,setMeta]=useStorage("orc6:meta",5000,false);
  const[editMeta,setEditMeta]=useState(false);const[tempMeta,setTempMeta]=useState(meta||5000);
  const mesAtual=today().slice(0,7);
  const receitaMes=budgets.filter(b=>b.status==="aprovado"&&b.createdAt?.startsWith(mesAtual)).reduce((s,b)=>s+b.total,0);
  const pct=Math.min(Math.round((receitaMes/Math.max(meta||1,1))*100),100);
  const faltam=Math.max((meta||0)-receitaMes,0);
  return(
    <div style={{background:"#111827",border:`1px solid ${themeP}20`,borderRadius:16,padding:"15px 17px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:13,fontWeight:700,color:"#94A3B8"}}>🎯 Meta do Mês</span><button onClick={()=>setEditMeta(e=>!e)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:themeP}}>✏️ Editar</button></div>
      {editMeta&&<div style={{display:"flex",gap:8,marginBottom:10}}><input type="number" style={{...S.inp,flex:1}} value={tempMeta} onChange={e=>setTempMeta(Number(e.target.value))} placeholder="Ex: 5000"/><button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`,padding:"8px 14px"}} onClick={()=>{setMeta(tempMeta);setEditMeta(false);}}>✓</button></div>}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:700,color:"#22D3A0"}}>{fmtBRL(receitaMes)}</span><span style={{fontSize:12,color:"#64748B"}}>meta: {fmtBRL(meta||0)}</span></div>
      <div style={{height:8,background:"#1E293B",borderRadius:4,marginBottom:8}}><div style={{height:"100%",width:`${pct}%`,background:pct>=100?"#22D3A0":`linear-gradient(90deg,${themeP},${themeA})`,borderRadius:4,transition:"width .6s"}}/></div>
      <div style={{fontSize:11,color:"#64748B"}}>{pct>=100?"🎉 Meta batida! Parabéns!":`Faltam ${fmtBRL(faltam)} para bater a meta (${pct}%)`}</div>
    </div>
  );
}

function PageDash({stats,budgets,user,profile,clients,agendamentos,themeP,themeA,setModal,setStatus,sendWA,setPage}){
  const byMonth=getByMonth(budgets);const maxR=Math.max(...byMonth.map(m=>m.receita),1);
  const expiring=budgets.filter(b=>(b.status==="pendente"||b.status==="enviado")&&daysLeft(b.date,b.validity)<=5&&daysLeft(b.date,b.validity)>=0);
  const hoje=today();
  const agendaHoje=(agendamentos||[]).filter(a=>a.date===hoje);
  const proximosAgendamentos=(agendamentos||[]).filter(a=>a.date>=hoje).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  return(
    <div style={S.page}>
      <PHead title={`Olá, ${(profile.name||user.name).split(" ")[0]}! 👋`} sub={new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}>
        <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`}} onClick={()=>setModal({type:"budget",data:null})}>+ Novo Orçamento</button>
      </PHead>
      {agendaHoje.length>0&&<div style={{padding:"12px 16px",background:`${themeP}08`,border:`1px solid ${themeP}25`,borderRadius:12,marginBottom:14,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>📅</span><div><div style={{fontSize:13,fontWeight:700,color:themeP}}>{agendaHoje.length} serviço(s) agendado(s) para hoje!</div><div style={{fontSize:12,color:"#64748B"}}>{agendaHoje.map(a=>`${a.clientName} às ${a.time}`).join(" · ")}</div></div></div>}
      {expiring.length>0&&<div style={{padding:"12px 16px",background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.25)",borderRadius:12,marginBottom:18,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>⚠️</span><div><div style={{fontSize:13,fontWeight:700,color:"#FB923C"}}>{expiring.length} orçamento(s) expirando em breve</div><div style={{fontSize:12,color:"#64748B"}}>{expiring.map(b=>b.num).join(", ")}</div></div></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="💰" label="Receita Aprovada" val={fmtK(stats.receita)} sub={`${stats.aprovado} aprovados`} color={themeP}/>
        <KPI icon="🔄" label="Pipeline" val={fmtK(stats.pipeline)} sub={`${stats.pendente} aguardando`} color={themeA}/>
        <KPI icon="🎯" label="Taxa Aprovação" val={`${stats.taxa}%`} sub={`de ${stats.total} orçamentos`} color={themeP}/>
        <KPI icon="📊" label="Ticket Médio" val={fmtK(stats.tick)} sub="por aprovado" color={themeA}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20}}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card title="📋 Recentes" action={<Lnk onClick={()=>setPage("lista")} color={themeP}>Ver todos →</Lnk>}>
            <table style={S.tbl}><thead><tr>{["Nº","Cliente","Serviço","Total","Status",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{budgets.slice(0,6).map(b=>(
                <tr key={b.id} style={S.tr} className="trow" onClick={()=>setModal({type:"detail",data:b})}>
                  <td style={{...S.td,fontFamily:"monospace",fontSize:12}}>{b.num}</td><td style={S.td}>{b.clientName}</td>
                  <td style={S.td}><span style={{display:"block",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.title}{b.urgent&&" 🚨"}</span></td>
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
              {Object.entries(STATUS).map(([k,v])=>{const c=budgets.filter(b=>b.status===k).length;const pct=stats.total?Math.round(c/stats.total*100):0;return(<div key={k} style={{background:"#0F172A",borderRadius:12,padding:"11px 13px",border:`1px solid ${v.dot}18`}}><div style={{fontSize:16,marginBottom:3}}>{v.icon}</div><div style={{fontSize:20,fontWeight:800,color:v.color}}>{c}</div><div style={{fontSize:10,color:v.color,fontWeight:600}}>{v.label}</div><div style={{fontSize:9,color:"#475569",marginTop:1}}>{pct}%</div></div>);})}
            </div>
          </Card>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <MetaCard budgets={budgets} themeP={themeP} themeA={themeA}/>
          <Card title="📈 Faturamento">
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:88,marginTop:8}}>
              {byMonth.map(d=><div key={d.month} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><div title={fmtBRL(d.receita)} style={{width:"100%",height:Math.max((d.receita/maxR)*74,3),background:`linear-gradient(180deg,${themeP},${themeA})`,borderRadius:"3px 3px 0 0"}}/><div style={{fontSize:8,color:"#475569"}}>{d.month.slice(5)}</div></div>)}
              {byMonth.length===0&&<div style={{color:"#475569",fontSize:12,flex:1,textAlign:"center",paddingTop:24}}>Sem dados</div>}
            </div>
          </Card>
          {proximosAgendamentos.length>0&&<Card title="📅 Próximos Serviços">
            {proximosAgendamentos.map((a,i)=>{
              const isHoje=a.date===hoje;
              return(<div key={i} style={{display:"flex",gap:8,padding:"7px 0",borderBottom:"1px solid #1E293B",alignItems:"center"}}>
                <div style={{minWidth:42,textAlign:"center",padding:"4px 6px",background:isHoje?`${themeP}15`:"#0F172A",borderRadius:8,border:`1px solid ${isHoje?themeP:"#1E293B"}`}}><div style={{fontSize:9,fontWeight:700,color:isHoje?themeP:"#64748B"}}>{isHoje?"HOJE":a.date.slice(5)}</div><div style={{fontSize:12,fontWeight:700,color:"#F1F5F9"}}>{a.time}</div></div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"#E2E8F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.clientName}</div>{a.address&&<div style={{fontSize:10,color:"#64748B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📍 {a.address}</div>}</div>
              </div>);
            })}
            <button style={{...S.ghost,width:"100%",marginTop:8,fontSize:12,padding:"6px"}} onClick={()=>{}}>Ver agenda completa →</button>
          </Card>}
          <Card title="🏆 Top Clientes">
            {getTopClients(budgets,clients).slice(0,4).map((c,i)=>(<div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #1E293B"}}><span style={{fontSize:10,fontWeight:800,color:"#475569",width:14}}>{i+1}º</span><Ava name={c.name} size={24} color={themeP}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:"#E2E8F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{fontSize:9,color:"#475569"}}>{c.count} orç.{c.rating?` · ${c.rating}⭐`:""}</div></div><div style={{fontSize:11,fontWeight:800,color:themeP}}>{fmtK(c.receita)}</div></div>))}
            {clients.length===0&&<div style={{color:"#475569",fontSize:12}}>Sem clientes</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PageLista({filtered,filter,setFilter,themeP,themeA,setModal,setStatus,sendWA,delBudget}){
  const[view,setView]=useState("cards");
  return(
    <div style={S.page}>
      <PHead title="Orçamentos" sub={`${filtered.length} encontrado(s)`}>
        <div style={{display:"flex",gap:8}}>
          <div style={{display:"flex",gap:2,background:"#111827",borderRadius:8,border:"1px solid #1E293B",padding:2}}>{[["cards","⊞"],["table","☰"]].map(([v,i])=><button key={v} style={{background:view===v?"#1E293B":"transparent",border:"none",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:14,color:view===v?"#F1F5F9":"#64748B"}} onClick={()=>setView(v)}>{i}</button>)}</div>
          <button style={{...S.prim,background:`linear-gradient(135deg,${themeP},${themeA})`}} onClick={()=>setModal({type:"budget",data:null})}>+ Novo</button>
        </div>
      </PHead>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input style={{...S.search,flex:1,minWidth:200}} placeholder="🔍 Buscar…" value={filter.q} onChange={e=>setFilter(f=>({...f,q:e.target.value}))}/>
        <select style={S.sel} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}><option value="todos">Todos os status</option>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select>
        <select style={S.sel} value={filter.cat} onChange={e=>setFilter(f=>({...f,cat:e.target.value}))}><option value="todas">Todas categorias</option>{CATS.map(c=><option key={c}>{c}</option>)}</select>
        <select style={S.sel} value={filter.sort} onChange={e=>setFilter(f=>({...f,sort:e.target.value}))}><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="high">Maior valor</option><option value="low">Menor valor</option></select>
      </div>
      {view==="cards"?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(305px,1fr))",gap:14}}>
          {filtered.map(b=>(
            <div key={b.id} style={{...S.bcard,...(b.urgent?{borderColor:"rgba(245,158,11,0.3)"}:{})}} className="bcard" onClick={()=>setModal({type:"detail",data:b})}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,gap:8}}>
                <div><div style={{fontSize:10,color:"#64748B",fontFamily:"monospace",marginBottom:2}}>{b.num} · {b.category}{b.urgent&&" 🚨"}</div><div style={{fontWeight:700,fontSize:14,color:"#F1F5F9",lineHeight:1.3}}>{b.title}</div></div>
                <Sbadge s={b.status}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <Ava name={b.clientName} size={28} color={themeP}/>
                <div><div style={{fontSize:12,fontWeight:600,color:"#CBD5E1"}}>{b.clientName}</div><div style={{fontSize:10,color:"#64748B"}}>{b.date} · {daysLeft(b.date,b.validity)<0?"Expirado":`${daysLeft(b.date,b.validity)}d`}</div></div>
              </div>
              {(b.paymentMethod||b.warrantyDays>0)&&<div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                {b.paymentMethod&&<span style={{fontSize:10,color:"#64748B",background:"#0F172A",padding:"2px 8px",borderRadius:20,border:"1px solid #1E293B"}}>💳 {b.paymentMethod}</span>}
                {b.warrantyDays>0&&<span style={{fontSize:10,color:"#22D3A0",background:"rgba(34,211,160,0.08)",padding:"2px 8px",borderRadius:20,border:"1px solid rgba(34,211,160,0.2)"}}>🛡️ {b.warrantyDays}d garantia</span>}
                {b.rating&&<span style={{fontSize:10,color:"#F59E0B",background:"rgba(245,158,11,0.08)",padding:"2px 8px",borderRadius:20,border:"1px solid rgba(245,158,11,0.2)"}}>{"⭐".repeat(b.rating.rating)}</span>}
              </div>}
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
          <table style={S.tbl}><thead style={{background:"#0D1320"}}><tr>{["Nº","Cliente","Título","Total","Status","Pagto","Dias",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(b=>{const dl=daysLeft(b.date,b.validity);return(
              <tr key={b.id} style={S.tr} className="trow" onClick={()=>setModal({type:"detail",data:b})}>
                <td style={{...S.td,fontFamily:"monospace",fontSize:11}}>{b.num}</td><td style={S.td}>{b.clientName}</td>
                <td style={S.td}><span style={{display:"block",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.title}{b.urgent&&" 🚨"}</span></td>
                <td style={{...S.td,color:themeP,fontWeight:700}}>{fmtBRL(b.total)}</td>
                <td style={S.td}><Sbadge s={b.status}/></td>
                <td style={{...S.td,fontSize:11,color:"#64748B"}}>{b.paymentMethod||"—"}</td>
                <td style={S.td}><span style={{fontSize:11,color:dl<0?"#FB923C":dl<=5?"#F59E0B":"#64748B"}}>{dl<0?`${Math.abs(dl)}d atrás`:`${dl}d`}</span></td>
                <td style={S.td}><div style={S.acts} onClick={e=>e.stopPropagation()}>
                  <TB c="#60A5FA" t="Preview" onClick={()=>setModal({type:"preview",data:b})}>👁️</TB>
                  <TB c="#25D366" t="WhatsApp" onClick={()=>sendWA(b)}>📱</TB>
                  <TB c="#94A3B8" t="Editar" onClick={()=>setModal({type:"budget",data:b})}>✏️</TB>
                </div></td>
              </tr>);})}
            {filtered.length===0&&<tr><td colSpan={8} style={{textAlign:"center",padding:40,color:"#475569"}}>Nenhum resultado</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PageClientes({budgets,clients,setModal}){
  const[q,setQ]=useState("");
  const enriched=useMemo(()=>clients.map(c=>{const cb=budgets.filter(b=>b.clientId===c.id||b.clientName===c.name);const ap=cb.filter(b=>b.status==="aprovado");const ratings=cb.filter(b=>b.rating?.rating).map(b=>b.rating.rating);const avgRating=ratings.length?Math.round(ratings.reduce((s,r)=>s+r,0)/ratings.length):null;return{...c,budgets:cb,aprovados:ap.length,receita:ap.reduce((s,b)=>s+b.total,0),avgRating};}), [clients,budgets]);
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
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:15,color:"#F1F5F9"}}>{c.name}</div><div style={{fontSize:12,color:"#64748B"}}>{c.phone||"—"}</div><div style={{fontSize:11,color:"#64748B"}}>{c.city||"—"}</div>{c.avgRating&&<div style={{fontSize:11,color:"#F59E0B",marginTop:2}}>{"⭐".repeat(c.avgRating)} {c.avgRating}/5</div>}</div>
              <button style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#64748B"}} onClick={()=>setModal({type:"client",data:c})}>✏️</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[["#818CF8",c.budgets.length,"orçamentos"],["#22D3A0",c.aprovados,"aprovados"],["#22D3A0",fmtK(c.receita),"faturado"]].map(([col,v,lbl])=>(<div key={lbl} style={{background:"#0F172A",borderRadius:10,padding:"9px 8px",textAlign:"center"}}><div style={{fontWeight:800,color:col,fontSize:lbl==="faturado"?10:18}}>{v}</div><div style={{fontSize:9,color:"#475569",marginTop:1,textTransform:"uppercase"}}>{lbl}</div></div>))}
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

function PageAgenda({agendamentos,setAgendamentos,setModal,themeP,themeA}){
  const hoje=today();
  const amanha=new Date(Date.now()+86400000).toISOString().split("T")[0];
  const futuros=(agendamentos||[]).filter(a=>a.date>=hoje).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const passados=(agendamentos||[]).filter(a=>a.date<hoje).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  return(
    <div style={S.page}>
      <PHead title="📅 Agenda" sub={`${futuros.length} serviço(s) próximo(s)`}/>
      {futuros.length===0&&<div style={{textAlign:"center",padding:56,color:"#475569"}}><div style={{fontSize:48,marginBottom:12}}>📅</div><div style={{fontWeight:600,fontSize:15}}>Nenhum agendamento futuro</div><div style={{fontSize:13,marginTop:6}}>Agende serviços diretamente nos orçamentos — clique em um orçamento e use o botão 📅 Agendar</div></div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {futuros.map((a,i)=>{
          const isHoje=a.date===hoje;const isAmanha=a.date===amanha;
          const label=isHoje?"🔴 HOJE":isAmanha?"🟡 AMANHÃ":a.date;
          const borderColor=isHoje?"#F87171":isAmanha?"#F59E0B":themeP;
          return(
            <div key={i} style={{background:"#111827",border:`1px solid ${borderColor}25`,borderRadius:14,padding:14,display:"flex",gap:14,alignItems:"center"}}>
              <div style={{textAlign:"center",minWidth:68,padding:"8px 10px",background:"#0F172A",borderRadius:10,border:`1px solid ${borderColor}20`,flexShrink:0}}>
                <div style={{fontSize:10,fontWeight:800,color:borderColor}}>{label}</div>
                <div style={{fontSize:20,fontWeight:900,color:"#F1F5F9",marginTop:2}}>{a.time}</div>
                <div style={{fontSize:10,color:"#64748B"}}>{a.duration}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:"#F1F5F9"}}>{a.clientName}</div>
                {a.title&&<div style={{fontSize:12,color:"#64748B",marginTop:1}}>{a.title}</div>}
                {a.address&&<div style={{fontSize:12,color:"#64748B"}}>📍 {a.address}</div>}
                {a.notes&&<div style={{fontSize:11,color:"#475569",fontStyle:"italic",marginTop:2}}>"{a.notes}"</div>}
              </div>
              <button onClick={()=>setAgendamentos(ag=>ag.filter((_,j)=>j!==i))} style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,padding:"6px 10px",color:"#F87171",cursor:"pointer",fontSize:12,fontFamily:"inherit",flexShrink:0}}>🗑️</button>
            </div>
          );
        })}
      </div>
      {passados.length>0&&<div style={{marginTop:24}}>
        <div style={{fontSize:12,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,marginBottom:10}}>Realizados</div>
        {passados.map((a,i)=>(<div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid #1E293B",opacity:.6}}><span style={{fontSize:12,color:"#64748B",minWidth:90}}>{a.date} {a.time}</span><span style={{fontSize:12,color:"#94A3B8",fontWeight:600}}>{a.clientName}</span>{a.address&&<span style={{fontSize:11,color:"#475569"}}>· 📍 {a.address}</span>}</div>))}
      </div>}
    </div>
  );
}

function PageRelatorio({budgets,stats,clients}){
  const byMonth=getByMonth(budgets);const byCat=getByCategory(budgets);const maxR=Math.max(...byMonth.map(m=>m.receita),1);
  const avgRating=useMemo(()=>{const rated=budgets.filter(b=>b.rating?.rating);if(!rated.length)return null;return(rated.reduce((s,b)=>s+b.rating.rating,0)/rated.length).toFixed(1);},[budgets]);
  return(
    <div style={S.page}>
      <PHead title="Relatórios" sub="Análise completa do negócio"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:18}}>
        <SCrd icon="💰" label="Receita" val={fmtBRL(stats.receita)} accent="#22D3A0"/>
        <SCrd icon="🔄" label="Pipeline" val={fmtBRL(stats.pipeline)} accent="#818CF8"/>
        <SCrd icon="🎯" label="Conversão" val={`${stats.taxa}%`} accent="#F59E0B"/>
        <SCrd icon="📊" label="Ticket Médio" val={fmtBRL(stats.tick)} accent="#60A5FA"/>
        <SCrd icon="⭐" label="Avaliação Média" val={avgRating?`${avgRating}/5`:"—"} accent="#F59E0B"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <Card title="📈 Faturamento Mensal">
          {byMonth.map(m=><div key={m.month} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:"#94A3B8"}}>{m.month}</span><span style={{fontSize:12,fontWeight:700,color:"#22D3A0"}}>{fmtBRL(m.receita)}</span></div><div style={{height:6,background:"#1E293B",borderRadius:3}}><div style={{height:"100%",width:`${(m.receita/maxR)*100}%`,background:"linear-gradient(90deg,#22D3A0,#818CF8)",borderRadius:3}}/></div></div>)}
          {byMonth.length===0&&<div style={{color:"#475569",fontSize:13}}>Sem dados</div>}
        </Card>
        <Card title="🎯 Conversão">
          {Object.entries(STATUS).map(([k,v])=>{const c=budgets.filter(b=>b.status===k).length;const p=stats.total?Math.round(c/stats.total*100):0;return(<div key={k} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:v.dot,display:"inline-block"}}/><span style={{fontSize:12,color:"#94A3B8"}}>{v.icon} {v.label}</span></div><span style={{fontSize:12,fontWeight:700,color:v.color}}>{c} ({p}%)</span></div><div style={{height:5,background:"#1E293B",borderRadius:3}}><div style={{height:"100%",width:`${p}%`,background:v.color,borderRadius:3}}/></div></div>);})}
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card title="🔧 Por Categoria">
          <table style={S.tbl}><thead><tr>{["Cat.","Total","Aprov.","Taxa","Receita"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{byCat.map(c=>{const it=budgets.filter(b=>b.category===c.name);const ap=it.filter(b=>b.status==="aprovado");const t=it.length?Math.round(ap.length/it.length*100):0;return(<tr key={c.name} style={S.tr}><td style={S.td}><span style={{fontWeight:600,color:"#E2E8F0"}}>{c.name}</span></td><td style={S.td}>{it.length}</td><td style={S.td}>{ap.length}</td><td style={S.td}><span style={{color:t>=50?"#22D3A0":"#F87171",fontWeight:700}}>{t}%</span></td><td style={{...S.td,color:"#22D3A0",fontWeight:700}}>{fmtBRL(ap.reduce((s,b)=>s+b.total,0))}</td></tr>);})}
            </tbody>
          </table>
        </Card>
        <Card title="🏆 Top Clientes">
          {getTopClients(budgets,clients).slice(0,6).map((c,i)=>(<div key={c.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderBottom:"1px solid #1E293B"}}><span style={{fontSize:10,color:"#475569",width:16}}>{i+1}º</span><Ava name={c.name} size={26}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"#E2E8F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{fontSize:9,color:"#475569"}}>{c.count} orç.</div></div><span style={{fontSize:12,fontWeight:800,color:"#22D3A0"}}>{fmtK(c.receita)}</span></div>))}
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
        {templates.map(t=>(<div key={t.id} style={S.bcard} className="bcard"><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div><div style={{fontSize:10,color:"#64748B",marginBottom:2}}>{t.category}</div><div style={{fontWeight:700,fontSize:14,color:"#F1F5F9"}}>{t.name}</div></div><TB c="#818CF8" t="Editar" onClick={()=>setModal({type:"template",data:t})}>✏️</TB></div>{t.items.map((it,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94A3B8",padding:"3px 0"}}><span>{it.desc} ({it.qty} {it.unit})</span><span>{fmtBRL((it.qty||0)*(it.price||0))}</span></div>)}<div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:"1px solid #1E293B"}}><div style={{fontSize:15,fontWeight:800,color:"#22D3A0"}}>{fmtBRL(calcSub(t.items))}</div><div style={{fontSize:11,color:"#64748B"}}>Val. {t.validity}d{t.discount>0?` · ${t.discount}%`:""}</div></div></div>))}
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
        {(activity||[]).map((a,i)=>(<div key={a.id||i} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:"1px solid #1E293B"}}><div style={{width:7,height:7,borderRadius:"50%",background:"#818CF8",marginTop:5,flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:13,color:"#CBD5E1"}}>{a.desc}</div><div style={{fontSize:11,color:"#475569"}}>{a.ts}</div></div></div>))}
        {(activity||[]).length===0&&<div style={{textAlign:"center",padding:40,color:"#475569"}}><div style={{fontSize:40,marginBottom:8}}>🕐</div><div>Nenhuma atividade</div></div>}
      </div>
    </div>
  );
}

/* ═══ MODALS ═══════════════════════════════════════════════════ */
function ModalBudget({data,clients,templates,onSave,onClose,nextNum,userId,themeP,themeA}){
  const empty={clientName:"",clientId:"",phone:"",email:"",category:"Elétrica",title:"",desc:"",items:[{id:uid(),desc:"",qty:1,unit:"serv",price:""}],status:"pendente",date:today(),validity:15,discount:0,tax:0,notes:"",userId,paymentMethod:"PIX",warrantyDays:90,urgent:false};
  const[f,sf]=useState(data?{...data,items:data.items.map(i=>({...i}))}:empty);
  const[step,setStep]=useState(0);const[tplOpen,setTplOpen]=useState(false);const[showMargem,setShowMargem]=useState(false);
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
          {!data&&templates.length>0&&<div style={{position:"relative"}}><button style={{...S.ghost,fontSize:12,padding:"6px 12px"}} onClick={()=>setTplOpen(o=>!o)}>📄 Template</button>{tplOpen&&<div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"#1C2537",border:"1px solid #1E293B",borderRadius:12,padding:8,minWidth:220,zIndex:200,boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>{templates.map(t=><button key={t.id} style={{display:"block",width:"100%",padding:"8px 12px",background:"transparent",border:"none",borderRadius:8,cursor:"pointer",color:"#CBD5E1",fontFamily:"inherit",fontSize:12,textAlign:"left"}} onClick={()=>applyTpl(t)}>📄 {t.name} <span style={{color:"#475569"}}>{t.category}</span></button>)}</div>}</div>}
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
        {clients.length>0&&<div><div style={{fontSize:10,color:"#475569",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:.7}}>Selecionar existente</div><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{clients.map(c=><button key={c.id} style={{...S.chip2,...(f.clientId===c.id?{borderColor:themeP,color:themeP,background:`${themeP}10`}:{})}} onClick={()=>{set("clientName",c.name);set("clientId",c.id);set("phone",c.phone||"");set("email",c.email||"");}}><Ava name={c.name} size={18} color={themeP}/>{c.name}</button>)}</div></div>}
      </div>}
      {step===1&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{gridColumn:"1/-1"}}><FL label="Título *"><input style={S.inp} value={f.title} onChange={e=>set("title",e.target.value)} placeholder="Ex: Instalação elétrica completa"/></FL></div>
        <FL label="Categoria"><select style={S.sel} value={f.category} onChange={e=>set("category",e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></FL>
        <FL label="Status"><select style={S.sel} value={f.status} onChange={e=>set("status",e.target.value)}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></FL>
        <FL label="Data"><input style={S.inp} type="date" value={f.date} onChange={e=>set("date",e.target.value)}/></FL>
        <FL label="Validade (dias)"><input style={S.inp} type="number" min={1} value={f.validity} onChange={e=>set("validity",e.target.value)}/></FL>
        <FL label="Forma de pagamento"><select style={S.sel} value={f.paymentMethod||"PIX"} onChange={e=>set("paymentMethod",e.target.value)}>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select></FL>
        <FL label="Garantia (dias)"><input style={S.inp} type="number" min={0} value={f.warrantyDays??90} onChange={e=>set("warrantyDays",Number(e.target.value))} placeholder="90"/></FL>
        <div style={{gridColumn:"1/-1"}}><FL label="Descrição"><textarea style={{...S.inp,height:58,resize:"vertical"}} value={f.desc} onChange={e=>set("desc",e.target.value)} placeholder="Detalhes do serviço…"/></FL></div>
        <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#0F172A",borderRadius:10,border:"1px solid #1E293B"}}><Toggle val={f.urgent||false} onChange={v=>set("urgent",v)}/><span style={{fontSize:13,color:"#94A3B8"}}>🚨 Serviço urgente</span>{f.urgent&&<span style={{fontSize:11,color:"#F59E0B",marginLeft:"auto"}}>Considere +20% no valor</span>}</div>
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
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button style={{...S.ghost,fontSize:12,padding:"6px 12px"}} onClick={addItem}>+ Item</button>
          {total>0&&<button style={{...S.ghost,fontSize:12,padding:"6px 12px",color:"#818CF8",borderColor:"rgba(129,140,248,0.3)"}} onClick={()=>setShowMargem(true)}>💡 Calcular margem</button>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:12,paddingTop:12,borderTop:"1px solid #1E293B",alignItems:"end"}}>
          <FL label="Desconto %"><input style={S.inp} type="number" min={0} max={100} value={f.discount} onChange={e=>set("discount",e.target.value)}/></FL>
          <FL label="Impostos %"><input style={S.inp} type="number" min={0} max={100} value={f.tax} onChange={e=>set("tax",e.target.value)}/></FL>
          <div style={{textAlign:"right"}}>{f.discount>0&&<div style={{fontSize:11,color:"#64748B"}}>Subtotal: {fmtBRL(sub)}</div>}<div style={{fontSize:22,fontWeight:800,color:themeP}}>{fmtBRL(total)}</div></div>
        </div>
        <div style={{marginTop:10}}><FL label="Observações"><textarea style={{...S.inp,height:50,resize:"vertical"}} value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Condições de pagamento…"/></FL></div>
        {showMargem&&<ModalMargem items={f.items} total={total} onClose={()=>setShowMargem(false)} themeP={themeP} themeA={themeA}/>}
      </div>}
      {step===3&&<div>
        <div style={{background:"#0F172A",borderRadius:12,padding:14,border:"1px solid #1E293B",marginBottom:12}}>
          <div style={{fontSize:9,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,marginBottom:8}}>Resumo</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
            {[["Cliente",f.clientName],["Serviço",f.title],["Categoria",f.category],["Data",f.date],["Validade",`${f.validity} dias`],["Status",STATUS[f.status]?.icon+" "+STATUS[f.status]?.label],["Pagamento",f.paymentMethod||"—"],["Garantia",`${f.warrantyDays||0} dias`]].map(([k,v])=>(<div key={k}><span style={{color:"#64748B"}}>{k}: </span><span style={{color:"#E2E8F0",fontWeight:600}}>{v}</span></div>))}
          </div>
          {f.urgent&&<div style={{marginTop:8,padding:"4px 10px",background:"rgba(245,158,11,0.1)",borderRadius:6,fontSize:12,color:"#F59E0B",display:"inline-block"}}>🚨 Serviço urgente</div>}
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

function ModalDetail({data,onClose,setStatus,sendWA,onEdit,onDelete,themeP,setModal}){
  const[del,setDel]=useState(false);const sub=calcSub(data.items);const dl=daysLeft(data.date,data.validity);
  return(
    <Overlay onClose={onClose}>
      <div style={S.mhead}><div><div style={S.mtitle}>{data.title}{data.urgent&&" 🚨"}</div><div style={S.msub}>{data.num} · {data.category} · {data.date}</div></div><XBtn onClick={onClose}/></div>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#0F172A",borderRadius:12,marginBottom:14,border:"1px solid #1E293B"}}>
        <Ava name={data.clientName} size={38} lg color={themeP}/><div style={{flex:1}}><div style={{fontWeight:700,color:"#F1F5F9"}}>{data.clientName}</div><div style={{fontSize:12,color:"#64748B"}}>{data.phone}</div></div><Sbadge s={data.status}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {data.paymentMethod&&<span style={{fontSize:11,color:"#64748B",background:"#0F172A",padding:"3px 10px",borderRadius:20,border:"1px solid #1E293B"}}>💳 {data.paymentMethod}</span>}
        {data.warrantyDays>0&&<span style={{fontSize:11,color:"#22D3A0",background:"rgba(34,211,160,0.08)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(34,211,160,0.2)"}}>🛡️ Garantia: {data.warrantyDays} dias</span>}
        {data.rating&&<span style={{fontSize:11,color:"#F59E0B",background:"rgba(245,158,11,0.08)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(245,158,11,0.2)"}}>{"⭐".repeat(data.rating.rating)} {data.rating.comment&&`"${data.rating.comment}"`}</span>}
        {data.urgent&&<span style={{fontSize:11,color:"#F59E0B",background:"rgba(245,158,11,0.08)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(245,158,11,0.2)"}}>🚨 Urgente</span>}
      </div>
      {dl>=0&&dl<=5&&(data.status==="pendente"||data.status==="enviado")&&<div style={{padding:"8px 12px",background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.2)",borderRadius:9,marginBottom:12,fontSize:12,color:"#FB923C"}}>⚠️ Expira em {dl} dia(s)!</div>}
      <div style={{background:"#0F172A",borderRadius:12,border:"1px solid #1E293B",overflow:"hidden",marginBottom:14}}>
        {data.items.map((it,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 14px",borderBottom:"1px solid #1E293B",fontSize:13}}><div><div style={{color:"#CBD5E1",fontWeight:500}}>{it.desc}</div><div style={{fontSize:11,color:"#64748B"}}>{it.qty} {it.unit} × {fmtBRL(it.price)}</div></div><div style={{fontWeight:700}}>{fmtBRL((it.qty||0)*(it.price||0))}</div></div>)}
        <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:4}}>
          {data.discount>0&&<React.Fragment><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748B"}}><span>Subtotal</span><span>{fmtBRL(sub)}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#F87171"}}><span>Desconto ({data.discount}%)</span><span>-{fmtBRL(sub*data.discount/100)}</span></div></React.Fragment>}
          <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:18,color:themeP,paddingTop:6,borderTop:"1px solid #1E293B"}}><span>TOTAL</span><span>{fmtBRL(data.total)}</span></div>
        </div>
      </div>
      {data.notes&&<div style={{padding:"8px 12px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:9,fontSize:12,color:"#94A3B8",marginBottom:12}}>📝 {data.notes}</div>}
      <div style={{fontSize:11,color:"#64748B",marginBottom:14}}>Validade: {data.validity} dias · {dl<0?`Expirado há ${Math.abs(dl)} dia(s)`:`${dl} dia(s) restantes`}</div>
      {data.status==="pendente"&&<div style={{display:"flex",gap:8,marginBottom:10}}><button style={{...S.prim,flex:1,background:"#22D3A0",color:"#0F1117"}} onClick={()=>setStatus(data.id,"aprovado")}>✅ Aprovar</button><button style={{...S.prim,flex:1,background:"#F87171",color:"#fff"}} onClick={()=>setStatus(data.id,"recusado")}>❌ Recusar</button></div>}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
        <button style={{...S.prim,flex:1,background:"#25D366",color:"#fff"}} onClick={()=>sendWA(data)}>📱 WhatsApp</button>
        <button style={{...S.ghost,padding:"8px 12px"}} onClick={()=>setModal({type:"preview",data})}>👁️ Preview</button>
        <button style={{...S.ghost,padding:"8px 12px"}} onClick={()=>setModal({type:"agendamento",data})}>📅 Agendar</button>
        {data.status==="aprovado"&&<React.Fragment>
          <button style={{...S.ghost,padding:"8px 12px"}} onClick={()=>setModal({type:"recibo",data})}>🧾 Recibo</button>
          <button style={{...S.ghost,padding:"8px 12px"}} onClick={()=>setModal({type:"rating",data})}>⭐ Avaliação</button>
        </React.Fragment>}
      </div>
      <div style={{display:"flex",gap:6}}>
        <button style={{...S.ghost,padding:"8px 14px"}} onClick={()=>onEdit(data)}>✏️ Editar</button>
        <button style={{...S.ghost,padding:"8px 14px",borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={()=>setDel(true)}>🗑️ Excluir</button>
      </div>
      {del&&<div style={{marginTop:10,padding:12,background:"rgba(248,113,113,.07)",borderRadius:9,border:"1px solid rgba(248,113,113,.2)"}}><div style={{fontSize:13,color:"#F87171",marginBottom:8}}>Confirmar exclusão?</div><div style={{display:"flex",gap:8}}><button style={{...S.prim,background:"#F87171",color:"#fff"}} onClick={()=>onDelete(data.id)}>Excluir</button><button style={S.ghost} onClick={()=>setDel(false)}>Cancelar</button></div></div>}
    </Overlay>
  );
}

function ModalClient({data,onSave,onDelete,onClose}){
  const[f,sf]=useState(data||{id:uid(),name:"",phone:"",email:"",city:"",cpfcnpj:"",obs:""});
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
      <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"space-between"}}><div style={{display:"flex",gap:8}}><button style={S.ghost} onClick={onClose}>Cancelar</button>{data&&<button style={{...S.ghost,borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={()=>onDelete(data.id)}>🗑️</button>}</div><button style={{...S.prim,opacity:f.name?1:.4}} onClick={()=>f.name&&onSave(f)}>💾 Salvar</button></div>
    </Overlay>
  );
}

function ModalTemplate({data,onSave,onDelete,onClose}){
  const empty={name:"",category:"Elétrica",items:[{id:uid(),desc:"",qty:1,unit:"serv",price:""}],discount:0,validity:15};
  const[f,sf]=useState(data?{...data,items:data.items.map(i=>({...i}))}:empty);
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
      <div style={{marginTop:12}}>{f.items.map((it,i)=><div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 54px 64px 90px 28px",gap:8,marginBottom:8}}><input style={S.inp} value={it.desc} onChange={e=>si(i,"desc",e.target.value)} placeholder="Descrição"/><input style={S.inp} type="number" value={it.qty} onChange={e=>si(i,"qty",e.target.value)}/><select style={S.sel} value={it.unit} onChange={e=>si(i,"unit",e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select><input style={S.inp} type="number" value={it.price} onChange={e=>si(i,"price",e.target.value)} placeholder="0.00"/><button onClick={()=>rmItem(i)} style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:6,cursor:"pointer",color:"#F87171",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>)}<button style={{...S.ghost,marginTop:4,fontSize:12,padding:"6px 12px"}} onClick={addItem}>+ Item</button></div>
      <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"space-between"}}><div style={{display:"flex",gap:8}}><button style={S.ghost} onClick={onClose}>Cancelar</button>{data&&<button style={{...S.ghost,borderColor:"rgba(248,113,113,.3)",color:"#F87171"}} onClick={()=>onDelete(data.id)}>🗑️</button>}</div><button style={{...S.prim,opacity:ok?1:.4}} onClick={()=>ok&&onSave(f)}>💾 Salvar</button></div>
    </Overlay>
  );
}

function ModalConfirm({title,msg,onConfirm,onClose}){
  return(<Overlay onClose={onClose}><div style={{fontSize:17,fontWeight:800,color:"#F1F5F9",marginBottom:12}}>{title}</div><div style={{fontSize:14,color:"#94A3B8",lineHeight:1.6,marginBottom:20}}>{msg}</div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button style={S.ghost} onClick={onClose}>Cancelar</button><button style={{...S.prim,background:"#F87171"}} onClick={()=>{onConfirm();onClose();}}>Confirmar</button></div></Overlay>);
}

/* ═══ ATOMS ════════════════════════════════════════════════════ */
const Overlay=({onClose,children,wide})=><div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}} onClick={onClose}><div style={{background:"#111827",border:"1px solid #1E293B",borderRadius:20,padding:26,width:"100%",maxWidth:wide?680:520,maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>{children}</div></div>;
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
const PHead=({title,sub,children})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}><div><h1 style={{fontSize:22,fontWeight:800,color:"#F1F5F9",margin:0}}>{title}</h1><p style={{fontSize:13,color:"#64748B",marginTop:3}}>{sub}</p></div><div style={{display:"flex",gap:8,alignItems:"center"}}>{children}</div></div>;
const PBtn=({onClick,children})=><button style={S.prim} onClick={onClick}>{children}</button>;
const GBtn=({onClick,children,grad})=><button style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px 12px",background:grad?"linear-gradient(135deg,#818CF8,#22D3A0)":"transparent",border:grad?"none":"1px solid #1E293B",borderRadius:10,color:grad?"#0F1117":"#64748B",fontWeight:grad?800:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}} onClick={onClick}>{children}</button>;
const TB=({c,t,onClick,children})=><button title={t} onClick={onClick} style={{background:`${c}18`,border:`1px solid ${c}30`,borderRadius:6,width:26,height:26,cursor:"pointer",color:c,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",padding:0}} className="tbtn">{children}</button>;
const Lnk=({onClick,children,color})=><button style={{background:"none",border:"none",color:color||"#818CF8",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}} onClick={onClick}>{children}</button>;
const Toast=({msg,type,color})=><div style={{position:"fixed",bottom:22,right:22,background:type==="warn"?"#92400E":`linear-gradient(135deg,${color||"#22D3A0"},${color?"#1a1a2e":"#10B981"})`,color:type==="warn"?"#FDE68A":"#0F2419",padding:"11px 20px",borderRadius:12,fontWeight:700,fontSize:13,zIndex:200,boxShadow:"0 6px 24px rgba(0,0,0,.5)"}} className="toast-in">{msg}</div>;
const Splash=({user})=><div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",background:"#0A0E1A",flexDirection:"column",gap:14}}><div style={{fontSize:44}} className="spin">⚡</div><div style={{fontSize:14,fontWeight:700,color:"#64748B"}}>{user?`Carregando ${user.name}…`:"Carregando…"}</div></div>;

/* ═══ HELPERS ══════════════════════════════════════════════════ */
const getByMonth=bs=>{const m={};bs.forEach(b=>{const k=b.date?.slice(0,7)||"";if(!k)return;if(!m[k])m[k]={month:k,count:0,receita:0};m[k].count++;if(b.status==="aprovado")m[k].receita+=b.total;});return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);};
const getByCategory=bs=>{const m={};bs.forEach(b=>{m[b.category]=(m[b.category]||0)+1;});const t=Math.max(Object.values(m).reduce((s,v)=>s+v,0),1);return Object.entries(m).map(([name,count])=>({name,count,pct:Math.round(count/t*100)})).sort((a,b)=>b.count-a.count);};
const getTopClients=(bs,cs)=>{const m={};bs.forEach(b=>{if(!m[b.clientName])m[b.clientName]={id:b.clientId||b.clientName,name:b.clientName,count:0,aprovados:0,receita:0};m[b.clientName].count++;if(b.status==="aprovado"){m[b.clientName].aprovados++;m[b.clientName].receita+=b.total;}});return Object.values(m).sort((a,b)=>b.receita-a.receita);};

/* ═══ STYLES ════════════════════════════════════════════════════ */
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
  page:    {padding:"24px 24px 60px"},
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
  wrap:    {background:"rgba(13,19,32,0.96)",border:"1px solid #1E293B",borderRadius:28,padding:40,width:"100%",maxWidth:420,position:"relative",zIndex:1,boxShadow:"0 32px 80px rgba(0,0,0,.7)"},
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
*{box-sizing:border-box;margin:0;padding:0;}
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
@media print{aside,header,.topbar{display:none!important;}main{overflow:visible!important;}body{background:#fff!important;}}
`;