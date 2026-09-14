require('dotenv').config();
const express=require('express'), cors=require('cors'), multer=require('multer');
const fs=require('fs'), path=require('path');
const {processDub}=require('./services/dub');
const app=express(), PORT=process.env.PORT||3000;
const uploadDir=path.join(__dirname,'uploads'), outputDir=path.join(__dirname,'outputs');
fs.mkdirSync(uploadDir,{recursive:true}); fs.mkdirSync(outputDir,{recursive:true});
const storage=multer.diskStorage({destination:uploadDir,filename:(req,file,cb)=>cb(null,Date.now()+'-'+file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))});
const upload=multer({storage,limits:{fileSize:2*1024*1024*1024}});
app.use(cors()); app.use(express.json()); app.use(express.static(path.join(__dirname,'public'))); app.use('/outputs',express.static(outputDir));
app.get('/api/health',(req,res)=>res.json({ok:true,service:'Trex Story AI Khmer Dub',ai:!!process.env.GEMINI_API_KEY,tts:!!process.env.ELEVENLABS_API_KEY}));
app.post('/api/dub',upload.single('video'),async(req,res)=>{
 try{ if(!req.file)return res.status(400).json({error:'No video uploaded'}); const job=await processDub(req.file.path,outputDir,{sourceLanguage:req.body.sourceLanguage||'auto',voice:req.body.voice||'default',style:req.body.style||'natural'}); res.json({ok:true,...job}); }
 catch(e){console.error(e);res.status(500).json({error:e.message});}
});
app.listen(PORT,()=>console.log(`Trex Story AI Khmer Dub running on port ${PORT}`));
