const $=x=>document.getElementById(x);let selected=null;
$("choose").onclick=()=>$("video").click();
$("video").onchange=e=>pick(e.target.files[0]);
$("drop").ondragover=e=>{e.preventDefault();$("drop").style.borderColor="#7188ff"};
$("drop").ondrop=e=>{e.preventDefault();pick(e.dataTransfer.files[0])};
function pick(f){if(!f||!f.type.startsWith("video/"))return alert("សូមជ្រើសរើស video");selected=f;$("fileName").textContent="🎞️ "+f.name+" ("+(f.size/1048576).toFixed(1)+" MB)";$("generate").disabled=false}
$("generate").onclick=async()=>{
 const btn=$("generate");btn.disabled=true;$("status").classList.remove("hidden");$("status").textContent="⏳ Uploading video...";
 const fd=new FormData();fd.append("video",selected);fd.append("sourceLanguage",$("source").value);fd.append("voice",$("voice").value);fd.append("style",$("style").value);
 try{
  $("status").textContent="🤖 AI កំពុងបកប្រែ និងបង្កើត Khmer Voice...";
  const r=await fetch("/api/dub",{method:"POST",body:fd});const data=await r.json();
  if(!r.ok)throw Error(data.error||"Processing failed");
  if(data.output){
   $("preview").src=data.output;$("download").href=data.output;$("result").classList.remove("hidden");$("status").textContent="✅ Khmer Dub រួចរាល់!";
  }else $("status").textContent="⚙️ "+data.message;
 }catch(e){$("status").textContent="❌ "+e.message}finally{btn.disabled=false}
};