const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const members = [
  { folder:'prashanth', name:'Prashanth B N', email:'prashanth@example.com' },
  { folder:'lochan', name:'Lochan M', email:'lochan@example.com' },
  { folder:'koushik', name:'Koushik R', email:'koushik@example.com' },
  { folder:'group', name:'Prashanth, Lochan & Koushik', email:'team@rupeeflow.demo' },
];

const raw = [
  ['2026-02-01','income',65000,'Salary','Monthly salary'], ['2026-02-04','expense',18000,'Rent','House rent'],
  ['2026-02-09','expense',5400,'Food','Groceries'], ['2026-02-12','expense',8500,'EMI','Laptop EMI'],
  ['2026-03-01','income',68000,'Salary','Salary with bonus'], ['2026-03-03','expense',18000,'Rent','House rent'],
  ['2026-03-07','expense',4800,'Utilities','Electricity and internet'], ['2026-03-14','expense',7500,'Shopping','Festival shopping'],
  ['2026-04-01','income',65000,'Salary','Monthly salary'], ['2026-04-05','expense',18000,'Rent','House rent'],
  ['2026-04-11','expense',7200,'Education','Professional course'], ['2026-04-18','expense',4100,'Healthcare','Health check-up'],
  ['2026-05-01','income',65000,'Salary','Monthly salary'], ['2026-05-03','expense',18000,'Rent','House rent'],
  ['2026-05-10','expense',5900,'Food','Groceries'], ['2026-05-16','expense',3600,'Transportation','Fuel and metro'],
  ['2026-06-01','income',65000,'Salary','Monthly salary'], ['2026-06-03','expense',18000,'Rent','House rent'],
  ['2026-06-08','expense',6400,'Food','Groceries and dining'], ['2026-06-15','expense',8500,'EMI','Laptop EMI'],
  ['2026-06-20','expense',2800,'Entertainment','Movies and outing'],
  ['2026-07-01','income',65000,'Salary','Monthly salary'], ['2026-07-01','expense',6200,'Food','Groceries and dining'],
  ['2026-07-01','expense',2600,'Transportation','Fuel and metro'], ['2026-07-01','expense',1800,'Entertainment','Weekend outing']
];

async function seed(page, member, index) {
  const userId = `report-${member.folder}`;
  const transactions = raw.map((x,i)=>({id:`${member.folder}-tx-${i+1}`,date:x[0],type:x[1],amount:x[2],category:x[3],note:x[4]}));
  await page.evaluate(async ({ userId, member, transactions, index }) => {
    localStorage.clear();
    localStorage.setItem('pft:users', JSON.stringify([{id:userId,name:member.name,email:member.email,passwordHash:'demo',currency:'INR',createdAt:new Date().toISOString()}]));
    localStorage.setItem('pft:session', userId);
    localStorage.setItem('pft:settings', JSON.stringify({theme:'light'}));
    const db = await new Promise((resolve, reject) => {
      const req=indexedDB.open('rupeeflow',1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('collections'))db.createObjectStore('collections',{keyPath:'id'}).createIndex('userId','userId',{unique:false});};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    const write=(collection,value)=>new Promise((resolve,reject)=>{const req=db.transaction('collections','readwrite').objectStore('collections').put({id:`pft:${userId}:${collection}`,userId,collection,value,updatedAt:new Date().toISOString()});req.onsuccess=resolve;req.onerror=()=>reject(req.error);});
    await write('transactions',transactions);
    await write('budgets',[
      {id:`b${index}1`,month:'2026-07',category:'Food',limit:8000}, {id:`b${index}2`,month:'2026-07',category:'Transportation',limit:5000},
      {id:`b${index}3`,month:'2026-07',category:'Entertainment',limit:4000}, {id:`b${index}4`,month:'2026-07',category:'EMI',limit:9000}
    ]);
    await write('goals',[
      {id:`g${index}1`,name:'Emergency Fund',target:150000,saved:92500,targetDate:'2026-12-31'},
      {id:`g${index}2`,name:'New Laptop',target:90000,saved:54000,targetDate:'2026-10-15'}
    ]);
    await write('recurring',[
      {id:`r${index}1`,type:'income',amount:65000,category:'Salary',frequency:'monthly',startDate:'2026-01-01',note:'Monthly salary',paused:false,lastRun:'2026-07-01'},
      {id:`r${index}2`,type:'expense',amount:18000,category:'Rent',frequency:'monthly',startDate:'2026-01-03',note:'House rent',paused:false,lastRun:'2026-06-03'},
      {id:`r${index}3`,type:'expense',amount:8500,category:'EMI',frequency:'monthly',startDate:'2026-02-12',note:'Laptop EMI',paused:false,lastRun:'2026-06-12'}
    ]);
    await write('meta:customCategories',{income:['Consulting'],expense:['Family Support']});
    await write('meta:indexedDbMigrated',true);
  }, { userId, member, transactions, index });
}

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
  for (let i=0;i<members.length;i++) {
    const member=members[i];
    const out=path.join(__dirname,'report_screenshots',member.folder);fs.mkdirSync(out,{recursive:true});
    const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light'});
    const page=await context.newPage();
    await page.goto('http://localhost:5173',{waitUntil:'networkidle'});
    await seed(page,member,i+1);
    const shots=[['/','dashboard.png'],['/transactions','transactions.png'],['/budgets','budgets.png'],['/goals','goals.png'],['/reports','reports.png'],['/profile','profile.png']];
    for(const [route,name] of shots){await page.goto(`http://localhost:5173${route}`,{waitUntil:'networkidle'});await page.waitForTimeout(600);await page.screenshot({path:path.join(out,name),fullPage:false});}
    await context.close();
  }
  await browser.close();console.log('captured 24 screenshots');
})();
