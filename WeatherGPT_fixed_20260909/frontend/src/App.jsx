import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/api\/?$/, "");
const DEFAULT_LOCATION = { name: "Mumbai", admin1: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata" };

const WEATHER_LABELS = { 0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Moderate drizzle",55:"Dense drizzle",56:"Freezing drizzle",57:"Freezing drizzle",61:"Slight rain",63:"Moderate rain",65:"Heavy rain",66:"Freezing rain",67:"Heavy freezing rain",71:"Slight snow",73:"Moderate snow",75:"Heavy snow",77:"Snow grains",80:"Slight rain showers",81:"Moderate rain showers",82:"Heavy rain showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Thunderstorm with heavy hail" };
const RAIN_CODES = new Set([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99]);

function MapUpdater({ center }) { const map=useMap(); useEffect(()=>{ map.flyTo(center, Math.max(map.getZoom(),11), {duration:.45}); },[map,center]); return null; }
function MapClick({ onSelect }) { useMapEvents({ click:e=>onSelect(e.latlng.lat,e.latlng.lng) }); return null; }
function finite(value, digits=1, fallback="—") { if(value===null||value===undefined||value==="") return fallback; const x=Number(value); return Number.isFinite(x) ? Number(x.toFixed(digits)).toString() : fallback; }
function text(value, fallback="Unavailable") { return value===null||value===undefined||value==="" ? fallback : String(value); }
function weatherLabel(code, fallback="Unavailable") { return WEATHER_LABELS[Number(code)] || fallback; }
function iconFor(condition="") { const v=String(condition).toLowerCase(); if(v.includes("thunder")) return "⛈️"; if(v.includes("rain")||v.includes("drizzle")) return "🌧️"; if(v.includes("cloud")) return "⛅"; if(v.includes("fog")) return "🌫️"; if(v.includes("snow")) return "🌨️"; return "☀️"; }
function displayName(location) { return [location?.name,location?.admin1,location?.country].filter(Boolean).join(", ") || "Selected location"; }
function friendlyError(error) { const m=String(error?.message||""); if(m.includes("Failed to fetch")||m.includes("Backend unreachable")) return "Weather service is unavailable right now. Please make sure the backend is running."; if(m.includes("404")||m.toLowerCase().includes("not found")) return "That location could not be found. Try a nearby city name."; return m || "Something went wrong. Please try again."; }
function sourceLabel(source) { return source?.label || "Weather source unavailable"; }
function updatedLabel(value) { if(!value) return "Not updated yet"; try { return new Date(value).toLocaleString(undefined,{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}); } catch { return "Not updated yet"; } }
function dateLabel(date, index=0) { if(index===0) return "Today"; if(index===1) return "Tomorrow"; try { return new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:"short"}); } catch { return date; } }

async function jsonFetch(path, options={}) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try {
    const response=await fetch(`${API_ROOT}${path}`,{...options,signal:controller.signal});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const detail=data?.detail;
      if(typeof detail==="string") throw new Error(detail);
      if(detail?.message){
        const sarvam=typeof detail.sarvam_error==="string"
          ? detail.sarvam_error
          : detail.sarvam_error?.error?.message || detail.sarvam_error?.message || "";
        throw new Error(sarvam ? `${detail.message}: ${sarvam}` : detail.message);
      }
      throw new Error(data?.message || "Request failed");
    }
    return data;
  } catch(error) {
    if(error.name==="AbortError") throw new Error("The request took too long. Please try again.");
    throw error;
  } finally { clearTimeout(timer); }
}

const inflight=new Map();
function deduped(key, fn) { if(inflight.has(key)) return inflight.get(key); const p=fn().finally(()=>inflight.delete(key)); inflight.set(key,p); return p; }
function cityWeather(city) { const key=`city:${city.trim().toLowerCase()}`; return deduped(key,()=>jsonFetch(`/api/weather/city/${encodeURIComponent(city)}`)); }
function coordinateWeather(latitude,longitude,timezone="auto") { const key=`coord:${latitude.toFixed(4)}:${longitude.toFixed(4)}`; return deduped(key,()=>jsonFetch("/api/weather/coordinates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({latitude,longitude,timezone})})); }
function chatWeather(message,language,city) { return jsonFetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,language,city:city||null})}); }
function climateWeather(city) { return deduped(`climate:${city.toLowerCase()}`,()=>jsonFetch(`/api/climate/${encodeURIComponent(city)}`)); }
async function reverseLookup(latitude,longitude) { const qs=new URLSearchParams({lat:String(latitude),lon:String(longitude),format:"jsonv2",zoom:"10",addressdetails:"1"}); const r=await fetch(`https://nominatim.openstreetmap.org/reverse?${qs}`,{headers:{Accept:"application/json","Accept-Language":"en"}}); if(!r.ok) throw new Error("Unable to identify that map location."); const a=(await r.json())?.address||{}; return {name:a.city||a.town||a.municipality||a.village||a.suburb||a.county||"Selected location",admin1:a.state||a.region||"",country:a.country||"",latitude,longitude,timezone:"auto"}; }

function rowsFrom(weather) {
  const d=weather?.forecast?.daily; if(!d?.time) return [];
  return d.time.map((date,i)=>({date,min:d.temperature_2m_min?.[i],max:d.temperature_2m_max?.[i],rain:d.precipitation_probability_max?.[i],precipitation:d.precipitation_sum?.[i],condition:d.condition_text?.[i]||weatherLabel(d.weather_code?.[i])||"Unavailable"}));
}
function rainTimeline(weather) {
  const h=weather?.forecast?.hourly;
  if(h?.time?.length) return h.time.map((time,i)=>({time,prob:h.precipitation_probability?.[i],mm:h.precipitation?.[i],code:h.weather_code?.[i]})).slice(0,12);
  return rowsFrom(weather).map(r=>({time:r.date,prob:r.rain,mm:r.precipitation,code:null}));
}
function recommendations(weather) {
  const c=weather?.forecast?.current||{}; const code=Number(c.weather_code); const rain=Number(c.rain||0); const prob=Number(c.precipitation_probability||0); const wind=Number(c.wind_speed_10m||0); const temp=Number(c.temperature_2m||0); const rainy=RAIN_CODES.has(code)||rain>0||prob>=40;
  return { umbrella: rainy ? "Carry an umbrella." : "An umbrella is probably not needed right now.", running: temp<=34&&wind<40&&!rainy ? "Conditions look reasonable for a run." : "Consider a shorter run or a better weather window.", travel: [95,96,99].includes(code)||wind>=60 ? "Travel needs extra caution because of severe-weather indicators." : "No major weather barrier is detected from the current data.", outside: rainy ? "Choose a drier forecast period before heading out." : "Current conditions are a reasonable window to go outside." };
}

export default function App() {
  const [selected,setSelected]=useState(DEFAULT_LOCATION), [weather,setWeather]=useState(null), [search,setSearch]=useState("Mumbai"), [language,setLanguage]=useState("auto"), [chatInput,setChatInput]=useState(""), [messages,setMessages]=useState([]), [busy,setBusy]=useState(false), [mapBusy,setMapBusy]=useState(false), [voiceState,setVoiceState]=useState("idle"), [error,setError]=useState(""), [climate,setClimate]=useState(null), [riskWhy,setRiskWhy]=useState(false), [history,setHistory]=useState([]), [recording,setRecording]=useState(false);
  const mediaRecorderRef=useRef(null), chunksRef=useRef([]), audioRef=useRef(null), audioUrlRef=useRef(null), ttsAbortRef=useRef(null), voiceRequestRef=useRef(0);
  const center=useMemo(()=>[Number(selected.latitude),Number(selected.longitude)],[selected.latitude,selected.longitude]);
  const rows=useMemo(()=>rowsFrom(weather),[weather]); const rain=useMemo(()=>rainTimeline(weather),[weather]); const current=weather?.forecast?.current; const recs=useMemo(()=>recommendations(weather),[weather]);

  const applyWeather=useCallback((result, fallbackLocation=selected)=>{
    if(!result) return;
    const location=result.location||fallbackLocation||DEFAULT_LOCATION;
    const normalized={...location,timezone:location.timezone||result?.forecast?.timezone||"Asia/Kolkata"};
    setWeather(result); setSelected(normalized); setSearch(location.name||fallbackLocation?.name||"");
    const key=displayName(normalized); setHistory(prev=>[key,...prev.filter(x=>x!==key)].slice(0,6));
  },[selected]);

  const loadCity=useCallback(async(city)=>{ const value=String(city||"").trim(); if(!value)return; setBusy(true);setError(""); try { const result=await cityWeather(value); applyWeather(result); setClimate({data:(result?.forecast?.daily?.time||[]).map((date,i)=>({date,temperature_min:result.forecast.daily.temperature_2m_min?.[i],temperature_max:result.forecast.daily.temperature_2m_max?.[i],rainfall:result.forecast.daily.precipitation_sum?.[i],rain_probability:result.forecast.daily.precipitation_probability_max?.[i]}))}); } catch(e){setError(friendlyError(e));} finally{setBusy(false);} },[applyWeather]);
  useEffect(()=>{loadCity("Mumbai");},[]); // eslint-disable-line react-hooks/exhaustive-deps

  async function selectMapLocation(latitude,longitude){ setMapBusy(true);setError(""); try { const loc=await reverseLookup(latitude,longitude); const result=await coordinateWeather(latitude,longitude,"auto"); applyWeather({...result,location:result.location||loc},loc); } catch(e){setError(friendlyError(e));} finally{setMapBusy(false);} }

  async function submitChat(e, messageOverride=null, shouldSpeak=false, fromVoice=false){ e.preventDefault(); const message=String(messageOverride??chatInput).trim(); if(!message||busy)return; setMessages(m=>[...m,{role:"user",text:message}]); if(fromVoice)setChatInput(message); else setChatInput(""); setBusy(true);setError("");setVoiceState("thinking"); try { const result=await chatWeather(message,language,selected?.name); const reply=result?.reply||"I couldn't get a weather answer right now."; setMessages(m=>[...m,{role:"assistant",text:reply}]); if(result?.weather) applyWeather(result.weather,result.location||selected); else if(result?.location?.name) await loadCity(result.location.name); if(shouldSpeak) await speakText(reply); } catch(e){const msg=friendlyError(e);setError(msg);setMessages(m=>[...m,{role:"assistant",text:"Sorry, I couldn't complete that weather request."}]);} finally{setBusy(false);if(!shouldSpeak)setVoiceState("idle");} }

  function startBrowserSpeechFallback(){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition) return false;
    try{
      const recognition=new Recognition();
      recognition.continuous=false;
      recognition.interimResults=true;
      recognition.lang=language==="hi"?"hi-IN":language==="mr"?"mr-IN":"en-IN";
      setRecording(true);
      setVoiceState("listening");
      recognition.onresult=e=>{
        const textValue=Array.from(e.results).map(r=>r[0]?.transcript||"").join(" ").trim();
        if(textValue) setChatInput(textValue);
      };
      recognition.onerror=e=>{
        setRecording(false);
        setVoiceState("idle");
        setError(`Browser speech recognition failed: ${e?.error||"unknown error"}`);
      };
      recognition.onend=()=>setRecording(false);
      recognition.start();
      window.__weatherGPTRecognition=recognition;
      return true;
    }catch{ return false; }
  }

  async function startVoice() {
  if (recording || busy) return;

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    setError("Browser microphone recording is not supported.");
    return;
  }

  try {
    stopSpeaking();
    setError("");
    setVoiceState("listening");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const mimeCandidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];

    const mime =
      mimeCandidates.find((item) =>
        MediaRecorder.isTypeSupported(item)
      ) || "";

    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);

    const actualMime = recorder.mimeType || mime || "audio/webm";
    const chunks = [];

    mediaRecorderRef.current = recorder;
    chunksRef.current = chunks;

    setRecording(true);
    setError("🎤 Recording started — speak now");

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
        console.log(
          "WeatherGPT mic chunk:",
          event.data.size,
          "bytes"
        );
      }
    };

    recorder.onerror = (event) => {
      console.error("WeatherGPT MediaRecorder error:", event);

      stream.getTracks().forEach((track) => track.stop());

      if (mediaRecorderRef.current === recorder) {
        mediaRecorderRef.current = null;
      }

      setRecording(false);
      setVoiceState("idle");
      setError("❌ Microphone recording failed.");
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());

      if (mediaRecorderRef.current === recorder) {
        mediaRecorderRef.current = null;
      }

      setRecording(false);

      console.log(
        "WeatherGPT recording stopped. Chunks:",
        chunks.length
      );

      if (!chunks.length) {
        setVoiceState("idle");
        setError(
          "❌ No audio was captured. Mic opened but no audio data was recorded."
        );
        return;
      }

      const blob = new Blob(chunks, {
        type: actualMime,
      });

      console.log(
        "WeatherGPT audio blob:",
        blob.size,
        "bytes",
        actualMime
      );

      if (blob.size < 1000) {
        setVoiceState("idle");
        setError(
          `❌ Audio captured but file is too small (${blob.size} bytes). Check your Windows microphone input.`
        );
        return;
      }

      setVoiceState("thinking");
      setError(`📤 Sending ${Math.round(blob.size / 1024)} KB audio to Sarvam...`);

      const form = new FormData();

      const extension = actualMime.includes("ogg")
        ? "ogg"
        : actualMime.includes("mp4")
          ? "m4a"
          : "webm";

      form.append(
        "audio",
        blob,
        `weather-gpt.${extension}`
      );

      form.append(
        "language",
        language || "auto"
      );

      try {
        console.log(
          "WeatherGPT → POST /api/voice/transcribe",
          {
            size: blob.size,
            type: actualMime,
            language: language || "auto",
          }
        );

        const result = await jsonFetch(
          "/api/voice/transcribe",
          {
            method: "POST",
            body: form,
          }
        );

        console.log(
          "WeatherGPT Sarvam response:",
          result
        );

        const transcript = String(
          result?.transcript || ""
        ).trim();

        if (!transcript) {
          throw new Error(
            "Sarvam returned an empty transcript."
          );
        }

        setChatInput(transcript);
        setError(`✅ Heard: ${transcript}`);

        await submitChat(
          { preventDefault() {} },
          transcript,
          true,
          true
        );
      } catch (error) {
        console.error(
          "WeatherGPT voice transcription error:",
          error
        );

        setVoiceState("idle");
        setError(
          `❌ Voice/Sarvam error: ${
            error?.message || "Unknown error"
          }`
        );
      }
    };

    // Emit chunks continuously.
    recorder.start(250);

  } catch (error) {
    console.error(
      "WeatherGPT microphone start error:",
      error
    );

    setRecording(false);
    setVoiceState("idle");

    setError(
      error?.name === "NotAllowedError"
        ? "❌ Microphone permission denied."
        : error?.name === "NotFoundError"
          ? "❌ No microphone found."
          : `❌ Microphone error: ${
              error?.message || "Unknown error"
            }`
    );
  }
}

  function stopVoice(){
    const recorder=mediaRecorderRef.current;
    if(!recorder) return;
    try{
      if(recorder.state === "recording" || recorder.state === "paused"){
        try{ recorder.requestData(); }catch{}
        recorder.stop();
      }
    }catch(e){
      setRecording(false);
      setVoiceState("idle");
      setError(`Unable to stop microphone: ${e?.message || "unknown error"}`);
    }
  }

  function stopSpeaking(){
    voiceRequestRef.current+=1;
    if(ttsAbortRef.current){ttsAbortRef.current.abort();ttsAbortRef.current=null;}
    if(audioRef.current){
      try{audioRef.current.pause();audioRef.current.currentTime=0;}catch{}
      audioRef.current=null;
    }
    if(audioUrlRef.current){URL.revokeObjectURL(audioUrlRef.current);audioUrlRef.current=null;}
    setVoiceState(recording?"listening":"idle");
  }

  async function speakText(value){
    // Clicking the speaker while it is speaking acts as Stop.
    stopSpeaking();
    const id=++voiceRequestRef.current;
    try {
      setVoiceState("speaking");
      const controller=new AbortController(); ttsAbortRef.current=controller;
      const response=await fetch(`${API_ROOT}/api/voice/speak`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:value,language}),signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(typeof data.detail==="string"?data.detail:"Voice playback unavailable");
      if(id!==voiceRequestRef.current)return;
      const bytes=Uint8Array.from(atob(data.audio_base64),c=>c.charCodeAt(0));
      const blob=new Blob([bytes],{type:data.mime_type||"audio/wav"});
      const url=URL.createObjectURL(blob);
      audioUrlRef.current=url;
      const audio=new Audio(url);
      audioRef.current=audio;
      audio.onended=()=>{if(id===voiceRequestRef.current){URL.revokeObjectURL(url);audioUrlRef.current=null;audioRef.current=null;setVoiceState("idle");}};
      audio.onerror=()=>{if(id===voiceRequestRef.current){URL.revokeObjectURL(url);audioUrlRef.current=null;audioRef.current=null;setVoiceState("idle");setError("Voice playback could not be completed.");}};
      await audio.play();
      await new Promise(resolve=>{audio.onended=()=>{resolve();};audio.onerror=()=>{resolve();};});
    } catch(e){ if(e.name!=="AbortError")setError(friendlyError(e)); if(id===voiceRequestRef.current)setVoiceState("idle"); }
  }

  function quickAsk(q){setChatInput(q);}
  const risk=weather?.risk; const riskSeverity=risk?.severity||"low";

  return <div className="app"><div className="bg-orb orb-one"/><div className="bg-orb orb-two"/>
    <header className="topbar"><div className="brand"><div className="brand-mark">W</div><div><h1>WeatherGPT <span>Beta</span></h1><p>Conversational weather intelligence</p></div></div><div className="header-actions"><div className="source-chip">{sourceLabel(weather?.source)} · {updatedLabel(weather?.source?.last_updated)}</div><select value={language} onChange={e=>setLanguage(e.target.value)}><option value="auto">Auto language</option><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option></select></div></header>
    <main className="dashboard">
      <section className="hero"><div><span className="eyebrow">LIVE WEATHER DASHBOARD</span><h2>Know the weather. Ask naturally.</h2><p>Search a city, use the map, or ask WeatherGPT about rain, running and travel.</p></div><form className="searchbar" onSubmit={e=>{e.preventDefault();loadCity(search)}}><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search city or location"/><button disabled={busy}>{busy?"Loading…":"Get Weather"}</button></form></section>
      {error&&<div className="error-banner"><strong>WeatherGPT</strong><span>{error}</span><button onClick={()=>setError("")}>Dismiss</button></div>}
      <section className="overview">
        <div className="card current-card"><div className="title-row"><div><span className="kicker">Current Weather</span><h3>{selected.name}</h3></div><span className="live-pill">{weather?.source?.provider?"LIVE":"READY"}</span></div>{current?<><div className="current-main"><div className="current-temp">{finite(current.temperature_2m)}<span>°C</span></div><div><div className="condition-text">{text(current.condition_text,weatherLabel(current.weather_code))}</div><small>Feels like {finite(current.apparent_temperature)}°C</small></div></div><div className="metrics"><div><span>Humidity</span><strong>{finite(current.relative_humidity_2m,0)}%</strong></div><div><span>Wind</span><strong>{finite(current.wind_speed_10m)} km/h</strong></div><div><span>Rain now</span><strong>{finite(current.precipitation)} mm</strong></div><div><span>Pressure</span><strong>{finite(current.pressure_msl,0)} hPa</strong></div></div><div className="source-line">Source: <b>{sourceLabel(weather?.source)}</b><span>Updated {updatedLabel(weather?.source?.last_updated)}</span></div></>:<div className="empty">Search a location to load live weather.</div>}</div>
        <div className={`card risk-card risk-${riskSeverity}`}><div className="title-row"><div><span className="kicker">Smart Risk</span><h3>Weather risk</h3></div><span className={`risk-dot risk-${riskSeverity}`}/></div><div className="risk-score">{finite(risk?.score,0,"0")}<small>/100</small></div><div className="risk-caption">Overall severity: <strong>{riskSeverity}</strong></div><div className="risk-list">{risk?.risks?.length?risk.risks.map((r,i)=><div key={i}><span>{text(r.type)}</span><small>{text(r.severity)}</small></div>):<div className="no-risk">No significant risk detected.</div>}</div><button className="why-btn" onClick={()=>setRiskWhy(v=>!v)}>{riskWhy?"Hide why":"Why?"}</button>{riskWhy&&<div className="why-box">{risk?.risks?.length?risk.risks.map((r,i)=><p key={i}><b>{text(r.type)}:</b> {text(r.severity)} risk based on the current temperature, wind, rain and forecast signals.</p>):<p>The current provider data does not cross the prototype's major risk thresholds.</p>}<strong>Recommendation:</strong> {riskSeverity==="high"?"Take extra caution and check the forecast again before travel or outdoor activity.":riskSeverity==="moderate"?"Stay weather-aware and choose a safer time for strenuous outdoor activity.":"Normal outdoor plans are reasonable, with routine weather awareness."}</div>}</div>
        <div className="card next-card"><span className="kicker">Next Forecast</span><h3>{rows[1]?.date||"Tomorrow"}</h3>{rows[1]?<div className="next-content"><div className="next-icon">{iconFor(rows[1].condition)}</div><div><strong>{finite(rows[1].max)}°C</strong><small>Low {finite(rows[1].min)}°C · Rain {finite(rows[1].rain,0)}%</small></div></div>:<div className="empty">Forecast unavailable.</div>}</div>
      </section>
      <section className="main-grid"><div className="left-stack">
        <div className="card forecast-card"><div className="title-row"><div><span className="kicker">Forecast</span><h3>7-Day Forecast</h3></div><span className="muted">{selected.name}</span></div><div className="forecast-list">{rows.length?rows.map((r,i)=><div className={`forecast-row ${i===0?"today":""}`} key={r.date}><div><strong>{dateLabel(r.date,i)}</strong><small>{r.date}</small></div><div className="fc-condition"><span>{iconFor(r.condition)}</span>{text(r.condition)}</div><div className="fc-temp"><strong>{finite(r.max)}°</strong><small>{finite(r.min)}°</small></div><div className="fc-rain"><small>Rain</small><strong>{finite(r.rain,0)}%</strong></div><div className="fc-mm">{r.precipitation==null?"—":`${finite(r.precipitation)} mm`}</div></div>):<div className="empty">Search a location to load the 7-day forecast.</div>}</div></div>
        <div className="card rain-card"><div className="title-row"><div><span className="kicker">Rain Timeline</span><h3>When is rain most likely?</h3></div><span className="muted">{weather?.forecast?.hourly?.time?.length?"Next 12 hours":"7-day view"}</span></div><div className="rain-timeline">{rain.length?rain.map((r,i)=><div className="rain-slot" key={`${r.time}-${i}`}><span>{i===0?"Now":String(r.time).slice(11,16)||r.time}</span><div className="rain-bar"><i style={{height:`${Math.min(100,Math.max(6,Number(r.prob)||0))}%`}}/></div><b>{finite(r.prob,0)}%</b><small>{finite(r.mm)} mm</small></div>):<div className="empty">Rain timeline unavailable.</div>}</div></div>
        <div className="card chat-card"><div className="title-row"><div><span className="kicker">AI Assistant</span><h3>WeatherGPT Chat</h3></div><span className={`voice-status ${voiceState}`}>{voiceState==="listening"?"Listening":voiceState==="thinking"?"Thinking":voiceState==="speaking"?"Speaking":"Ready"}</span></div><div className="quick-row">{["Should I carry an umbrella?","Can I go running?","Is it safe to travel?","Best time to go outside?"] .map(q=><button key={q} onClick={()=>quickAsk(q)}>{q}</button>)}</div><div className="chat-log">{messages.length===0&&<div className="chat-empty">Ask a practical question. Answers are grounded in the current weather data.</div>}{messages.map((m,i)=><div className={`chat-message ${m.role}`} key={i}><div className="chat-bubble">{m.text}{m.role==="assistant"&&<button className="speak-btn" onClick={()=>voiceState==="speaking"?stopSpeaking():speakText(m.text)} title={voiceState==="speaking"?"Stop speaking":"Speak answer"}>{voiceState==="speaking"?"⏹️":"🔊"}</button>}</div></div>)}{busy&&<div className="chat-message assistant"><div className="chat-bubble typing">Checking the latest weather data…</div></div>}</div><div className="voice-hint">{recording?"Tap the mic again to stop recording.":"Speak in English, Hindi, Marathi or Hinglish."}</div><form className="chat-form" onSubmit={submitChat}><button type="button" className={`mic-btn ${recording?"recording":""}`} onClick={recording?stopVoice:startVoice} disabled={busy}>{recording?"■":"🎙️"}</button><input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder={`Ask about ${selected.name||"this location"}…`} disabled={busy}/><button type="submit" disabled={busy||!chatInput.trim()}>Send</button></form></div>
        <div className="card climate-card"><div className="title-row"><div><span className="kicker">Analytics</span><h3>Forecast climate view</h3></div><span className="muted">Preserved feature</span></div>{climate?.data?.length?<div className="climate-grid">{climate.data.slice(0,7).map(r=><div key={r.date}><b>{r.date}</b><span>{finite(r.temperature_min)}° – {finite(r.temperature_max)}°</span><small>Rain {finite(r.rain_probability,0)}% · {finite(r.rainfall)} mm</small></div>)}</div>:<p className="muted">Analytics will appear after weather loads.</p>}</div>
      </div>
      <aside className="card map-card"><div className="title-row"><div><span className="kicker">Location</span><h3>Interactive Map</h3></div><span className="muted">Click to select</span></div><div className="map-wrap"><MapContainer center={center} zoom={11} scrollWheelZoom className="map"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><MapUpdater center={center}/><MapClick onSelect={selectMapLocation}/><CircleMarker center={center} radius={10} pathOptions={{color:"#176bd0",fillColor:"#4a9df8",fillOpacity:.9,weight:3}}/></MapContainer><div className="map-card-overlay"><span>📍 Selected location</span><strong>{displayName(selected)}</strong><small>{finite(selected.latitude,4)}, {finite(selected.longitude,4)}</small></div>{mapBusy&&<div className="map-loading">Finding weather…</div>}</div><div className="map-footer"><div><span>Recent locations</span><strong>{history.length?history.join(" · "):"None yet"}</strong></div><div><span>Provider</span><strong>{sourceLabel(weather?.source)}</strong></div></div></aside></section>
    </main>
  </div>;
}