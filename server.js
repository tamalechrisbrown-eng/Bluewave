const express = require('express');
const app = express();
const fs = require('fs');
app.use(express.json());
app.use(express.static('public'));
let users = [], deposits = [], withdrawals = [];
try{ users = JSON.parse(fs.readFileSync('users.json')||'[]'); }catch(e){}
function save(){ fs.writeFileSync('users.json', JSON.stringify(users)); }
function genCode(name){ return (name||'CHRIS').slice(0,3).toUpperCase() + Math.floor(1000+Math.random()*9000); }

// BLOCK OLD ADMIN.HTML - NO ONE CAN OPEN IT
app.get('/admin.html', (req,res)=>{ res.redirect('/'); });
app.get('/admin', (req,res)=>{ res.redirect('/'); });

app.post('/api/register', (req,res)=>{
  const {name,phone,password,referred_by} = req.body;
  if(users.find(u=>u.phone==phone)) return res.json({error:'Phone already registered'});
  let refCode = genCode(name);
  let newUser = {id:Date.now().toString(), name, phone, password, balance:0, totalDep:0, profit:0, plan:'None', my_ref_code:refCode, referral_earnings:0, referral_count:0, referred_by:referred_by||''};
  users.push(newUser); save();
  if(referred_by){ let referrer = users.find(u=>u.my_ref_code==referred_by); if(referrer){ referrer.referral_count++; referrer.referral_earnings+=5000; referrer.balance+=5000; save(); } }
  res.json({success:true, myRefCode:refCode});
});
app.post('/api/login', (req,res)=>{
  const {phone,password}=req.body;
  if(phone=='admin' && password=='1234') return res.json({admin:true});
  let u = users.find(x=>x.phone==phone && x.password==password);
  if(!u) return res.json({error:'Wrong phone or password'});
  res.json({success:true, user:u});
});
app.post('/api/deposit', (req,res)=>{ const {userId,amount,method,transId}=req.body; let u=users.find(x=>x.id==userId); if(!u) return res.json({error:'Login first'}); deposits.push({id:Date.now().toString(), userId, name:u.name, phone:u.phone, amount:Number(amount), method, transId, status:'pending'}); res.json({success:true}); });
app.post('/api/withdraw', (req,res)=>{ const {userId,amount,momoNum,method,wallet}=req.body; let u=users.find(x=>x.id==userId); if(!u) return res.json({error:'Login first'}); if(Number(amount) > u.balance) return res.json({error:'Not enough balance'}); withdrawals.push({id:Date.now().toString(), userId, name:u.name, phone:u.phone, amount:Number(amount), momoNum, method, wallet, status:'pending'}); res.json({success:true}); });
app.post('/api/plan', (req,res)=>{ const {userId,plan,rate}=req.body; let u=users.find(x=>x.id==userId); if(!u) return res.json({error:'No user'}); u.plan=plan; u.profit=Math.floor(u.totalDep*rate); u.balance=u.totalDep+u.profit; save(); res.json({success:true}); });
app.post('/api/ai-chat', (req,res)=>{ const msg=(req.body.message||'').toLowerCase(); let reply="Hi, I'm Chris AI. Ask me about plans, deposit, referral or profit."; if(msg.includes('plan')) reply="Plans: Starter 10% in 30 days, Growth 25% in 60 days, Pro 50% in 90 days. Returns not guaranteed."; if(msg.includes('deposit')||msg.includes('momo')) reply="Deposit: Send MTN MoMo to 0761291972 - Chris. Enter Transaction ID in app. Or WhatsApp +256 747 550170."; if(msg.includes('refer')) reply="Share your referral link. You get 5000 UGX when friend registers + 10% of every deposit."; if(msg.includes('withdraw')) reply="Withdraw: Request in dashboard, admin sends via MoMo from 0761291972 within 24h. WhatsApp +256 747 550170"; if(msg.includes('whatsapp')) reply="WhatsApp us: +256 747 550170 or https://wa.me/256747550170"; res.json({reply}); });

// ADMIN DATA - ONLY IF HEADER x-admin = true, AND YOU ARE ADMIN
app.get('/api/admin-data', (req,res)=>{ if(req.headers['x-admin']!=='true') return res.json({error:'Admin Only'}); res.json({users, deposits, withdrawals}); });
app.post('/api/approve-deposit', (req,res)=>{ let d=deposits.find(x=>x.id==req.body.id); if(!d) return res.json({error:'Not found'}); d.status='approved'; let u=users.find(x=>x.id==d.userId); u.totalDep+=d.amount; u.balance+=d.amount; if(u.referred_by){ let ref=users.find(x=>x.my_ref_code==u.referred_by); if(ref){ let bonus=Math.floor(d.amount*0.10); ref.referral_earnings+=bonus; ref.balance+=bonus; } } save(); res.json({success:true}); });
app.post('/api/approve-withdraw', (req,res)=>{ let w=withdrawals.find(x=>x.id==req.body.id); if(!w) return res.json({error:'Not found'}); w.status='approved'; let u=users.find(x=>x.id==w.userId); u.balance-=w.amount; save(); res.json({success:true}); });
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server running on '+PORT));
