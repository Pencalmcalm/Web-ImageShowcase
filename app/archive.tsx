"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Grid2X2, Home, ImagePlus, LayoutList, LockKeyhole, Maximize2, Plus, Settings2, Trash2, Upload, X } from "lucide-react";

type Picture = { id:string; title:string; caption:string; collection:string; chapter:string; date:string; position:number; originalName:string; width:number; height:number; bytes:number; createdAt:string; src:string; thumbnail:string; original:string };
type Settings = {title:string; subtitle:string; collectionA:string; collectionB:string; descriptionA:string; descriptionB:string};
type Data = {settings:Settings; images:Picture[]; isOwner:boolean; signedIn:boolean; locked:boolean; passwordEnabled:boolean};
type Route = {page:string; value:string};
type QueueItem = {id:string; file:File; url:string; title:string; status:"ready"|"uploading"|"done"|"error"; error?:string};
const initial:Settings = {title:"Image archive", subtitle:"A collection of images, arranged in time.", collectionA:"Collection A",collectionB:"Collection B",descriptionA:"A place for the first thread. Images, studies, and things worth keeping.",descriptionB:"Another point of view. A second thread, with its own rhythm."};
function today() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function formatDate(value:string) { return new Date(value+"T12:00:00").toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}); }
function go(page:string,value="") { window.location.hash = page+(value?"/"+encodeURIComponent(value):""); }
async function api<T = {ok?:boolean;error?:string}>(url:string, options?:RequestInit):Promise<T> {
  const response = await fetch(url,options);
  const data = await response.json() as T & {error?:string};
  if (!response.ok) throw new Error(data.error || "The request did not complete. Please try again.");
  return data;
}
function json(method:string,data:unknown):RequestInit { return {method,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}; }

export default function Archive() {
  const [data,setData] = useState<Data>({settings:initial,images:[],isOwner:false,signedIn:false,locked:false,passwordEnabled:false});
  const [loaded,setLoaded] = useState(false), [error,setError] = useState(""), [route,setRoute] = useState<Route>({page:"entrance",value:""});
  const [collection,setCollection] = useState("A"), [chapter,setChapter] = useState(""), [date,setDate] = useState(""), [query,setQuery] = useState("");
  const [layout,setLayout] = useState("grid"), [password,setPassword] = useState(""), [entering,setEntering] = useState(false);
  const [notice,setNotice] = useState(""), [zoom,setZoom] = useState(false);
  const load = useCallback(async () => {
    try { setData(await api<Data>("/api/archive")); setError(""); setLoaded(true); }
    catch(e) { setError((e as Error).message); setLoaded(true); }
  },[]);
  useEffect(() => { load(); },[load]);
  useEffect(() => {
    const update = () => {
      const [page="entrance",rawValue=""] = window.location.hash.slice(1).split("/");
      const [value,search=""] = rawValue.split("?");
      let decoded = ""; try { decoded = decodeURIComponent(value); } catch {}
      setRoute({page:["entrance","collections","collection","gallery","image","manage"].includes(page)?page:"entrance",value:decoded});
      if (["collection","gallery"].includes(page) && ["A","B"].includes(decoded)) {
        setCollection(decoded); setChapter(new URLSearchParams(search).get("chapter")??""); setDate(""); setQuery("");
      }
      setZoom(false); window.scrollTo(0,0);
    };
    update(); window.addEventListener("hashchange",update); return () => window.removeEventListener("hashchange",update);
  },[]);
  useEffect(() => { if (!notice) return; const timer=setTimeout(()=>setNotice(""),5000); return ()=>clearTimeout(timer); },[notice]);
  const pictures = useMemo(() => data.images.filter(image => image.collection === collection),[data.images,collection]);
  const chapters = useMemo(() => Array.from(new Set(pictures.map(image=>image.chapter))).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),[pictures]);
  const filtered = useMemo(() => pictures.filter(image => (!chapter || image.chapter===chapter) && (!date || image.date===date) && (!query || `${image.title} ${image.caption} ${image.chapter}`.toLowerCase().includes(query.toLowerCase()))),[pictures,chapter,date,query]);
  const selected = data.images.find(image => image.id===route.value);
  const viewerImages = selected ? data.images.filter(image=>image.collection===selected.collection && image.chapter===selected.chapter) : [];
  const selectedIndex = viewerImages.findIndex(image=>image.id===selected?.id);
  const adjacent = useCallback((direction:number) => { const image=viewerImages[selectedIndex+direction]; if(image) go("image",image.id); },[viewerImages,selectedIndex]);
  useEffect(() => {
    if(route.page!=="image") return;
    const key = (event:KeyboardEvent) => {
      if(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if(event.key==="ArrowLeft") adjacent(-1);
      if(event.key==="ArrowRight") adjacent(1);
      if(event.key==="Escape") { if(zoom) setZoom(false); else go("gallery",selected?.collection??collection); }
    };
    window.addEventListener("keydown",key); return ()=>window.removeEventListener("keydown",key);
  },[route.page,adjacent,zoom,collection,selected]);
  const enter = async (event:FormEvent) => {
    event.preventDefault(); setEntering(true); setError("");
    try { if(data.locked) { await api("/api/unlock",json("POST",{password})); await load(); setPassword(""); } go("collections"); }
    catch(e) { setError((e as Error).message); } finally { setEntering(false); }
  };
  const title = data.settings[`collection${collection}` as keyof Settings];
  const activePage = data.locked ? "entrance" : route.page;
  return <div className="archive-app">
    <header className="site-header">
      <a href="#entrance" className="wordmark" aria-label="Archive entrance"><span className="brand-dot"/> A / B <span className="brand-label">IMAGE ARCHIVE</span></a>
      <nav aria-label="Main navigation">
        <a href="#collections" className={activePage==="collections"?"active":""}>Collections</a>
        {data.isOwner ? <a href="#manage" className={activePage==="manage"?"active":""}><Settings2 size={13}/> Manage</a> : <a href="/signin-with-chatgpt?return_to=/%23manage" target="_top"><LockKeyhole size={13}/> Owner sign in</a>}
      </nav>
    </header>
    {notice && <div role="status" className="toast"><Check size={15}/>{notice}</div>}
    {error && <div role="alert" className="error-banner">{error}<button onClick={()=>load()}>Retry</button><button aria-label="Dismiss message" onClick={()=>setError("")}><X size={15}/></button></div>}
    {activePage==="entrance" ? <main className="entrance">
      <div className="entrance-coordinate">00 — ENTRANCE</div>
      <div className="entrance-content">
        <p className="eyebrow">A PERSONAL VISUAL COLLECTION</p>
        <h1>{data.settings.title}<span className="tiny-star">✳</span></h1>
        <p className="entrance-description">{data.settings.subtitle}</p>
        <form onSubmit={enter} className="entry-form">
          {data.locked && <label className="password-label"><span className="sr-only">Archive password</span><LockKeyhole size={16}/><input type="password" placeholder="Enter password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required maxLength={200}/></label>}
          <button className="enter-button" disabled={!loaded || entering}>{!loaded?"Opening archive…":entering?"Checking…":data.locked?"Confirm":"Enter archive"}<ArrowRight size={18}/></button>
        </form>
        {data.locked && <p className="small muted">This collection is password protected.</p>}
      </div>
      <div className="entrance-footer"><span>IMAGES / STUDIES / MOMENTS</span><span>SCROLL THROUGH TIME ↗</span></div>
    </main> : <main className="workspace">
      <div className="window-bar"><div className="window-controls"><button onClick={()=>go("collections")} aria-label="Go to collections" title="Collections"><Home size={9}/></button><button onClick={()=>{if(activePage==="image") go("gallery",selected?.collection??collection); else if(["gallery","collection"].includes(activePage)) go("collections"); else go("entrance");}} aria-label="Go back" title="Back"><ArrowLeft size={9}/></button><button onClick={()=>go("gallery",selected?.collection??collection)} aria-label="Open image grid" title="Image grid"><Grid2X2 size={9}/></button></div>
        <span>{activePage==="manage"?"Archive manager":activePage==="collections"?"Collections":activePage==="image"?selected?.title??"Image":title}</span><span className="window-label">A / B</span>
      </div>
      {activePage==="collections" && <section className="collections-page">
        <div className="section-heading"><div><p className="eyebrow">01 — COLLECTIONS</p><h1>Two threads.<br/><span className="muted">One archive.</span></h1></div><p className="heading-aside">Choose a collection.<br/>Follow it through time.</p></div>
        <div className="collection-grid">{["A","B"].map(letter=>{
          const images=data.images.filter(image=>image.collection===letter);
          return <a href={`#collection/${letter}`} className="collection-card" key={letter}>
            <div className={`collection-cover cover-${letter}`}>{images.length ? <img src={images[0].thumbnail} alt={images[0].title}/> : <><span className="cover-grid"/><span className="cover-letter">{letter}</span><span className="cover-note">YOUR IMAGES GO HERE</span></>}</div>
            <div className="collection-caption"><div><p className="eyebrow">COLLECTION {letter} / {String(images.length).padStart(2,"0")} IMAGES</p><h2>{data.settings[`collection${letter}` as keyof Settings]}</h2></div><ArrowRight size={24}/></div>
          </a>;
        })}</div>
        <div className="page-bottom"><span>SELECT A THREAD TO EXPLORE</span><span>{String(data.images.length).padStart(2,"0")} IMAGES IN THE ARCHIVE</span></div>
      </section>}
      {activePage==="collection" && <section className="collection-detail">
        <div className="collection-intro"><p className="eyebrow">02 — COLLECTION {collection}</p><h1>{title}</h1><p className="intro-copy">{data.settings[`description${collection}` as keyof Settings]}</p><button className="button light" onClick={()=>go("gallery",collection)}>Explore images <ArrowRight size={16}/></button></div>
        <div className="collection-preview">{pictures.length ? <button onClick={()=>go("image",pictures[0].id)}><img src={pictures[0].src} alt={pictures[0].title}/><span>{pictures[0].title} <ArrowRight size={16}/></span></button> : <div className={`collection-cover cover-${collection}`}><span className="cover-grid"/><span className="cover-letter">{collection}</span><span className="cover-note">AN OPEN SPACE FOR YOUR FIRST IMAGE</span></div>}</div>
        <div className="chapter-list"><div className="section-line"><span>CHAPTERS</span><span>{chapters.length}</span></div>{chapters.length ? chapters.map((name,index)=><button key={name} onClick={()=>{window.location.hash="gallery/"+collection+"?chapter="+encodeURIComponent(name);}}><span className="muted small">{String(index+1).padStart(2,"0")}</span><h2>{name}</h2><span className="small muted">{pictures.filter(image=>image.chapter===name).length} images</span><ArrowRight size={17}/></button>) : <div className="empty-inline"><p>Your first chapter starts with an image.</p>{data.isOwner && <button className="text-button" onClick={()=>go("manage")}><Plus size={14}/> Add images</button>}</div>}</div>
      </section>}
      {activePage==="gallery" && <div className="gallery-layout">
        <aside className="gallery-sidebar"><p className="eyebrow">COLLECTION</p><div className="collection-tabs">{["A","B"].map(letter=><button key={letter} className={collection===letter?"selected":""} onClick={()=>go("gallery",letter)}>{letter}</button>)}</div><div className="section-line"><span>CHAPTERS</span></div><button className={`chapter-button ${!chapter?"selected":""}`} onClick={()=>setChapter("")}>All images <span>{pictures.length}</span></button>{chapters.map(name=><button key={name} className={`chapter-button ${chapter===name?"selected":""}`} onClick={()=>setChapter(name)}>{name}<span>{pictures.filter(i=>i.chapter===name).length}</span></button>)}
          <Calendar dates={pictures.filter(image=>!chapter || image.chapter===chapter).map(image=>image.date)} selected={date} onSelect={setDate}/>
          {date && <button className="text-button small" onClick={()=>setDate("")}>Clear date filter <X size={12}/></button>}
          <div className="sidebar-foot"><span className="status-dot"/> {pictures.length} images preserved</div>
        </aside>
        <section className="gallery-main"><div className="gallery-heading"><div><p className="eyebrow">03 — THE IMAGE INDEX</p><h1>{chapter || title}</h1><p className="small muted">{date?formatDate(date):"All moments"} <span className="separator">/</span> {filtered.length} images</p></div><div className="view-toggle"><button aria-label="Grid view" aria-pressed={layout==="grid"} onClick={()=>setLayout("grid")}><Grid2X2 size={16}/></button><button aria-label="List view" aria-pressed={layout==="list"} onClick={()=>setLayout("list")}><LayoutList size={16}/></button></div></div>
          <div className="gallery-tools"><input aria-label="Search images" type="search" placeholder="Search images…" value={query} onChange={e=>setQuery(e.target.value)}/>{data.isOwner && <button className="text-button" onClick={()=>go("manage")}><Plus size={14}/> Add images</button>}</div>
          {filtered.length ? <div className={`image-grid ${layout==="list"?"list-view":""}`}>{filtered.map((image,index)=><a key={image.id} href={`#image/${image.id}`} className="image-card"><div className="image-surface"><img src={image.thumbnail} alt={image.title} loading="lazy"/><span className="image-number">{String(index+1).padStart(2,"0")}</span><span className="image-open"><Maximize2 size={15}/></span></div><div className="image-caption"><h2>{image.title}</h2><p>{image.chapter} <span>/</span> {formatDate(image.date)}</p></div></a>)}</div> : <Empty owner={data.isOwner} filtered={Boolean(date||query||chapter)} reset={()=>{setDate("");setQuery("");setChapter("");}}/>}
        </section>
      </div>}
      {activePage==="image" && (selected ? <div className="viewer-layout"><aside className="viewer-sidebar"><a href={`#gallery/${selected.collection}`} className="text-button"><ArrowLeft size={14}/> Collection {selected.collection}</a><p className="eyebrow">{selected.chapter}</p><div className="viewer-thumbnails">{viewerImages.map((image,index)=><a href={`#image/${image.id}`} key={image.id} className={image.id===selected.id?"selected":""}><img src={image.thumbnail} alt=""/><span>{String(index+1).padStart(2,"0")}</span><span>{image.title}</span></a>)}</div></aside>
        <section className="viewer-main"><div className="viewer-tools"><span className="small muted">{String(selectedIndex+1).padStart(2,"0")} / {String(viewerImages.length).padStart(2,"0")}</span><div><a href={selected.original} className="icon-button" aria-label="Download original image" title="Download original"><Download size={17}/></a><button className="icon-button" aria-label={zoom?"Fit image":"Enlarge image"} onClick={()=>setZoom(!zoom)}><Maximize2 size={17}/></button><a className="icon-button" href={`#gallery/${selected.collection}`} aria-label="Close image"><X size={18}/></a></div></div>
          <div className={`viewer-stage ${zoom?"zoomed":""}`}><img src={selected.src} alt={selected.caption || selected.title}/></div><div className="viewer-description"><div><p className="eyebrow">{selected.chapter} / {formatDate(selected.date)}</p><h1>{selected.title}</h1>{selected.caption && <p className="caption-copy">{selected.caption}</p>}<p className="small muted">{selected.width} × {selected.height} <span className="separator">/</span> Original available to download</p></div><div className="viewer-arrows"><button className="icon-button" onClick={()=>adjacent(-1)} disabled={selectedIndex<=0} aria-label="Previous image"><ArrowLeft size={20}/></button><button className="icon-button" onClick={()=>adjacent(1)} disabled={selectedIndex>=viewerImages.length-1} aria-label="Next image"><ArrowRight size={20}/></button></div></div>
        </section></div> : <div className="empty-state"><h1>Image not found</h1><p>This image may have been removed.</p><a href="#collections" className="button">Back to collections <ArrowLeft size={15}/></a></div>)}
      {activePage==="manage" && (data.isOwner ? <Manager data={data} refresh={load} notify={setNotice}/> : <div className="empty-state"><LockKeyhole size={32}/><h1>Your archive, your controls.</h1><p>Sign in as the owner to upload and organize images.</p><a className="button light" href="/signin-with-chatgpt?return_to=/%23manage" target="_top">Owner sign in <ArrowRight size={15}/></a></div>)}
    </main>}
    {activePage!=="entrance" && <footer className="site-footer"><a href="#entrance">A / B — {data.settings.title}</a><span>AN ARCHIVE IN PROGRESS</span></footer>}
  </div>;
}

function Empty({owner,filtered,reset,add}:{owner:boolean;filtered:boolean;reset:()=>void;add?:()=>void}) {
  return <div className="empty-state"><ImagePlus size={35} strokeWidth={1}/><h2>{filtered?"No images in this view.":"Every archive starts somewhere."}</h2><p>{filtered?"Try another date, chapter, or search.":"This collection is ready for its first image."}</p>{filtered?<button className="button" onClick={reset}>Show all images</button>:owner?add?<button onClick={add} className="button light"><Plus size={16}/> Add your first images</button>:<a href="#manage" className="button light"><Plus size={16}/> Add your first images</a>:null}</div>;
}
function Calendar({dates,selected,onSelect}:{dates:string[];selected:string;onSelect:(v:string)=>void}) {
  const [expanded,setExpanded] = useState(false);
  const [month,setMonth] = useState(()=>new Date((dates[0]??today()).slice(0,7)+"-01T12:00:00"));
  useEffect(()=>{if(dates[0])setMonth(new Date(dates[0].slice(0,7)+"-01T12:00:00"));},[dates[0]]);
  const y=month.getFullYear(), m=month.getMonth(), count=new Date(y,m+1,0).getDate(), offset=(new Date(y,m,1).getDay()+6)%7;
  return <div className={`calendar ${expanded?"expanded":""}`}><button className="mobile-calendar-toggle" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>Filter by date <span>{selected?formatDate(selected):month.toLocaleDateString(undefined,{month:"short",year:"numeric"})}</span><ChevronDown size={13}/></button><div className="calendar-heading"><span>{month.toLocaleDateString(undefined,{month:"short",year:"numeric"})}</span><div><button onClick={()=>setMonth(new Date(y,m-1,1))} aria-label="Previous month"><ChevronLeft size={13}/></button><button onClick={()=>setMonth(new Date(y,m+1,1))} aria-label="Next month"><ChevronRight size={13}/></button></div></div><div className="calendar-grid">{["M","T","W","T","F","S","S"].map((day,i)=><span className="weekday" key={i}>{day}</span>)}{Array.from({length:offset},(_,i)=><span key={`empty${i}`}/>)}{Array.from({length:count},(_,i)=>{
    const value=`${y}-${String(m+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`, available=dates.includes(value);
    return <button key={i} disabled={!available} aria-label={`${formatDate(value)}${available?", images available":", no images"}`} aria-pressed={selected===value} className={available?"has-images":""} onClick={()=>onSelect(value===selected?"":value)}>{i+1}{available&&<i/>}</button>;
  })}</div><p className="calendar-legend"><span className="status-dot"/> Dates with images</p></div>;
}

function Manager({data,refresh,notify}:{data:Data;refresh:()=>Promise<void>;notify:(text:string)=>void}) {
  const [tab,setTab] = useState("upload"), [queue,setQueue] = useState<QueueItem[]>([]), [collection,setCollection] = useState("A"), [chapter,setChapter] = useState("T1.1"), [date,setDate] = useState(today);
  const [busy,setBusy] = useState(false), [error,setError] = useState(""), [dragging,setDragging] = useState(false), [edit,setEdit] = useState<Picture|null>(null), [remove,setRemove] = useState<Picture|null>(null);
  const [settings,setSettings] = useState(data.settings), [changePassword,setChangePassword] = useState(false), [newPassword,setNewPassword] = useState("");
  const input = useRef<HTMLInputElement>(null), queueRef=useRef(queue), dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{queueRef.current=queue;},[queue]);
  useEffect(()=>()=>queueRef.current.forEach(item=>URL.revokeObjectURL(item.url)),[]);
  useEffect(()=>{setSettings(data.settings);},[data.settings]);
  useEffect(()=>{if(edit||remove)dialog.current?.showModal();else dialog.current?.close();},[edit,remove]);
  const accept = (files:FileList|File[]) => {
    setError(""); const items:QueueItem[]=[]; const rejected:string[]=[];
    for(const file of Array.from(files)) {
      if(!["image/jpeg","image/png","image/webp","image/avif"].includes(file.type) || file.size>25*1024*1024 || !file.size) { rejected.push(file.name); continue; }
      items.push({id:crypto.randomUUID(),file,url:URL.createObjectURL(file),title:file.name.replace(/\.[^.]+$/,"").replace(/[-_]/g," "),status:"ready"});
    }
    setQueue(current=>[...current,...items]); if(rejected.length)setError(`${rejected.join(", ")} could not be added. Use JPG, PNG, WebP, or AVIF files up to 25 MB.`);
  };
  const upload = async (event:FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); let successes=0;
    for(const item of queue.filter(item=>item.status==="ready"||item.status==="error")) {
      setQueue(current=>current.map(q=>q.id===item.id?{...q,status:"uploading",error:undefined}:q));
      try {
        const bitmap = await createImageBitmap(item.file);
        const width=bitmap.width,height=bitmap.height;
        const optimize = async (edge:number,quality:number) => {
          const ratio=Math.min(1,edge/Math.max(width,height)); const canvas=document.createElement("canvas"); canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
          canvas.getContext("2d")!.drawImage(bitmap,0,0,canvas.width,canvas.height);
          return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not prepare this image.")),"image/webp",quality));
        };
        let display:Blob,thumbnail:Blob;
        try { display=await optimize(2400,.88); thumbnail=await optimize(700,.8); } finally { bitmap.close(); }
        const form=new FormData();form.set("original",item.file);form.set("display",display,"display.webp");form.set("thumbnail",thumbnail,"thumbnail.webp");
        for(const [key,value] of Object.entries({title:item.title.trim()||item.file.name,caption:"",collection,chapter,date,width:String(width),height:String(height)}))form.set(key,value);
        await api("/api/images",{method:"POST",body:form}); successes++;
        setQueue(current=>current.map(q=>q.id===item.id?{...q,status:"done"}:q));
      } catch(e) {setQueue(current=>current.map(q=>q.id===item.id?{...q,status:"error",error:(e as Error).message}:q));}
    }
    await refresh(); setBusy(false); if(successes)notify(`${successes} image${successes===1?"":"s"} added to collection ${collection}.`);
  };
  const saveEdit = async (event:FormEvent) => {
    event.preventDefault();if(!edit)return;setBusy(true);setError("");
    try {await api(`/api/images/${edit.id}`,json("PATCH",edit));await refresh();setEdit(null);notify("Image details saved.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  const deleteImage = async () => {
    if(!remove)return;setBusy(true);setError("");
    try{await api(`/api/images/${remove.id}`,{method:"DELETE"});await refresh();setRemove(null);notify("Image removed from the archive.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  const reorder = async (id:string,direction:number) => {
    const images=[...data.images].sort((a,b)=>a.position-b.position), index=images.findIndex(i=>i.id===id);
    // Only move within the same date and chapter; gallery chronology stays stable.
    const siblings=images.filter(i=>i.collection===images[index].collection && i.chapter===images[index].chapter && i.date===images[index].date);
    const next=siblings[siblings.findIndex(i=>i.id===id)+direction];if(!next)return;
    const target=images.findIndex(i=>i.id===next.id);[images[index],images[target]]=[images[target],images[index]];
    setBusy(true);setError("");try{await api("/api/reorder",json("POST",{ids:images.map(i=>i.id)}));await refresh();notify("Image order saved.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  const saveSettings = async (event:FormEvent) => {
    event.preventDefault();setBusy(true);setError("");
    try{await api("/api/settings",json("PATCH",{...settings,...(changePassword?{password:newPassword}:{})}));await refresh();setChangePassword(false);setNewPassword("");notify("Archive settings saved.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  const exportManifest = () => {
    const blob=new Blob([JSON.stringify({settings:data.settings,images:data.images},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="image-archive-manifest.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <section className="manager"><div className="manager-heading"><div><p className="eyebrow">YOUR ARCHIVE / YOUR CONTROLS</p><h1>Make room for more.</h1></div><a className="text-button" href="#collections">View archive <ArrowRight size={15}/></a></div>
    <div className="manager-tabs" role="tablist" aria-label="Archive management">{[["upload","Add images"],["library",`Library (${data.images.length})`],["settings","Archive settings"]].map(([id,label])=><button role="tab" aria-selected={tab===id} aria-controls={`panel-${id}`} id={`tab-${id}`} key={id} disabled={busy} onClick={()=>{setTab(id);setError("");}}>{label}</button>)}</div>
    {error&&<div className="form-error" role="alert">{error}</div>}
    {tab==="upload" && <form id="panel-upload" role="tabpanel" aria-labelledby="tab-upload" onSubmit={upload}>
      <div className="upload-settings"><label>Collection<select value={collection} onChange={e=>setCollection(e.target.value)} disabled={busy}><option value="A">A — {data.settings.collectionA}</option><option value="B">B — {data.settings.collectionB}</option></select></label><label>Chapter<input value={chapter} maxLength={80} required onChange={e=>setChapter(e.target.value)} disabled={busy} placeholder="e.g. T1.1" list="chapters"/><datalist id="chapters">{Array.from(new Set(data.images.filter(i=>i.collection===collection).map(i=>i.chapter))).map(name=><option key={name} value={name}/>)}</datalist></label><label>Image date<input type="date" required value={date} onChange={e=>setDate(e.target.value)} disabled={busy}/></label></div>
      <button type="button" disabled={busy} className={`dropzone ${dragging?"dragging":""}`} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);if(!busy)accept(e.dataTransfer.files);}}><Upload size={30} strokeWidth={1}/><h2>Drop your images here.</h2><p>Or click to choose files. Add a whole batch at once.</p><span className="small muted">JPG, PNG, WEBP, AVIF · UP TO 25 MB EACH</span></button>
      <input className="sr-only" ref={input} tabIndex={-1} aria-label="Choose images to upload" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>{if(e.target.files)accept(e.target.files);e.target.value="";}}/>
      <div className="upload-note"><Check size={14}/><p>Originals are preserved. Smaller viewing copies are prepared automatically.</p></div>
      {queue.length>0 && <><div className="queue-heading"><span>{queue.length} files selected</span><button type="button" className="text-button small" disabled={busy} onClick={()=>{queue.forEach(i=>URL.revokeObjectURL(i.url));setQueue([]);}}>Clear selection <X size={12}/></button></div><div className="upload-queue">{queue.map(item=><div className={`queue-row ${item.status}`} key={item.id}><img src={item.url} alt=""/><label><span className="sr-only">Title for {item.file.name}</span><input value={item.title} required maxLength={180} disabled={busy||item.status==="done"} onChange={e=>setQueue(current=>current.map(q=>q.id===item.id?{...q,title:e.target.value}:q))}/><span className="small muted">{item.file.name} · {(item.file.size/1024/1024).toFixed(1)} MB</span>{item.error&&<span className="queue-error">{item.error}</span>}</label><span className="queue-status">{item.status==="done"?<><Check size={13}/> Added</>:item.status==="uploading"?"Uploading…":item.status==="error"?"Try again":"Ready"}</span><button type="button" className="icon-button" aria-label={`Remove ${item.file.name} from upload queue`} disabled={busy} onClick={()=>{URL.revokeObjectURL(item.url);setQueue(current=>current.filter(i=>i.id!==item.id));}}><X size={15}/></button></div>)}</div><div className="upload-actions"><p className="small muted">{queue.filter(i=>i.status==="done").length} of {queue.length} added</p><button className="button light" disabled={busy||!queue.some(i=>i.status==="ready"||i.status==="error")}>{busy?"Uploading images…":"Upload images"}<ArrowRight size={16}/></button></div></>}
    </form>}
    {tab==="library" && <div id="panel-library" role="tabpanel" aria-labelledby="tab-library">{data.images.length?<><div className="library-top"><p className="small muted">Edit details or move images within the same date and chapter.</p><button className="text-button small" onClick={exportManifest}><Download size={13}/> Export image list</button></div><div className="library">{data.images.map(image=>{
      const siblings=data.images.filter(i=>i.collection===image.collection&&i.chapter===image.chapter&&i.date===image.date).sort((a,b)=>a.position-b.position);const index=siblings.findIndex(i=>i.id===image.id);
      return <div className="library-row" key={image.id}><a href={`#image/${image.id}`}><img src={image.thumbnail} alt={image.title}/></a><div className="library-info"><h2>{image.title}</h2><p className="small muted">{image.collection} / {image.chapter} / {formatDate(image.date)}</p></div><div className="library-actions"><button className="icon-button" aria-label={`Move ${image.title} earlier`} onClick={()=>reorder(image.id,-1)} disabled={busy||index===0}><ArrowUp size={15}/></button><button className="icon-button" aria-label={`Move ${image.title} later`} onClick={()=>reorder(image.id,1)} disabled={busy||index===siblings.length-1}><ArrowDown size={15}/></button><button className="button small" onClick={()=>{setEdit(image);setError("");}} disabled={busy}>Edit</button><a className="icon-button" href={image.original} aria-label={`Download original ${image.title}`}><Download size={15}/></a><button className="icon-button danger" onClick={()=>{setRemove(image);setError("");}} aria-label={`Delete ${image.title}`} disabled={busy}><Trash2 size={15}/></button></div></div>;
    })}</div></>:<Empty owner filtered={false} reset={()=>{}} add={()=>setTab("upload")}/>}</div>}
    {tab==="settings" && <form className="settings-form" id="panel-settings" role="tabpanel" aria-labelledby="tab-settings" onSubmit={saveSettings}>
      <div className="settings-section"><h2>The entrance</h2><label>Archive name<input value={settings.title} required maxLength={120} onChange={e=>setSettings({...settings,title:e.target.value})}/></label><label>Introduction<input value={settings.subtitle} maxLength={1000} onChange={e=>setSettings({...settings,subtitle:e.target.value})}/></label></div>
      <div className="settings-section"><h2>The collections</h2>{["A","B"].map(letter=><div key={letter} className="settings-collection"><label>Collection {letter} name<input value={settings[`collection${letter}` as keyof Settings]} required maxLength={120} onChange={e=>setSettings({...settings,[`collection${letter}`]:e.target.value})}/></label><label>Description<textarea value={settings[`description${letter}` as keyof Settings]} maxLength={1000} onChange={e=>setSettings({...settings,[`description${letter}`]:e.target.value})} rows={3}/></label></div>)}</div>
      <div className="settings-section"><h2>Entrance password</h2><p className="small muted">{data.passwordEnabled?"An archive password is enabled.":"No additional archive password is set."} Owner management always requires your ChatGPT sign-in. Site sharing is managed separately.</p><label className="checkbox-label"><input type="checkbox" checked={changePassword} onChange={e=>setChangePassword(e.target.checked)}/> Change the archive password</label>{changePassword&&<label>New password<input aria-label="New password" type="password" value={newPassword} autoComplete="new-password" maxLength={200} onChange={e=>setNewPassword(e.target.value)} placeholder="8 or more characters"/><span className="small muted">Leave blank to remove the additional password. Your owner account can always enter.</span></label>}</div>
      <button className="button light" disabled={busy}>{busy?"Saving…":"Save settings"}<Check size={16}/></button>
    </form>}
    <dialog ref={dialog} onCancel={e=>{if(busy)e.preventDefault();else{setEdit(null);setRemove(null);}}} onClose={()=>{if(!busy){setEdit(null);setRemove(null);}}}>
      {edit && <form onSubmit={saveEdit}><div className="dialog-heading"><h2>Edit image</h2><button type="button" className="icon-button" onClick={()=>setEdit(null)} disabled={busy} aria-label="Close editor"><X size={18}/></button></div><label>Title<input value={edit.title} required maxLength={180} onChange={e=>setEdit({...edit,title:e.target.value})}/></label><label>Caption<textarea value={edit.caption} maxLength={3000} rows={3} onChange={e=>setEdit({...edit,caption:e.target.value})}/></label><div className="dialog-fields"><label>Collection<select value={edit.collection} onChange={e=>setEdit({...edit,collection:e.target.value})}><option>A</option><option>B</option></select></label><label>Chapter<input value={edit.chapter} required maxLength={80} onChange={e=>setEdit({...edit,chapter:e.target.value})}/></label></div><label>Date<input type="date" value={edit.date} required onChange={e=>setEdit({...edit,date:e.target.value})}/></label>{error&&<p role="alert" className="form-error">{error}</p>}<button className="button light" disabled={busy}>{busy?"Saving…":"Save image"}<Check size={16}/></button></form>}
      {remove && <div><div className="dialog-heading"><h2>Remove this image?</h2><button className="icon-button" onClick={()=>setRemove(null)} disabled={busy} aria-label="Cancel deletion"><X size={18}/></button></div><p>“{remove.title}” and its stored files will be deleted. Download the original first if you need a copy.</p>{error&&<p role="alert" className="form-error">{error}</p>}<div className="dialog-actions"><button className="button" onClick={()=>setRemove(null)} disabled={busy}>Keep image</button><button className="button destructive" onClick={deleteImage} disabled={busy}>{busy?"Removing…":"Delete image"}<Trash2 size={15}/></button></div></div>}
    </dialog>
  </section>;
}



