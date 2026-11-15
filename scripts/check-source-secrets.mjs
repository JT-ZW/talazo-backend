// Inspect tracked source without printing any credential values.
import fs from 'node:fs';import path from 'node:path';
import {execFileSync} from 'node:child_process';import {parseEnv} from 'node:util';
const root=process.cwd().replaceAll('\\','/');
const files=execFileSync('git',['-c','safe.directory='+root,'ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const local=fs.existsSync('.env')?parseEnv(fs.readFileSync('.env','utf8')):{};
const secrets=Object.entries(local).filter(([name,value])=>/(KEY|SECRET|PASSWORD|DB_URL)/.test(name)&&value.length>=12).map(([,value])=>value);
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bAIza[0-9A-Za-z_-]{30,}/,/\bsb_secret_[0-9A-Za-z_-]{15,}/,/\b(?:ghp|github_pat)_[0-9A-Za-z_]{20,}/,/\bfn_(?:live|test)_[0-9A-Za-z_-]{16,}/,/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/];
const findings=[];
for(const file of files){
 if(/(^|\/)(\.env(?:\..*)?|.*access-link.*|.*invitation.*\.txt)$/.test(file)&&file!=='.env.example')findings.push({file,reason:'private file name'});
 if(['.png','.jpg','.jpeg','.webp','.ico'].includes(path.extname(file)))continue;
 const content=fs.readFileSync(file,'utf8');
 if(secrets.some(value=>content.includes(value)))findings.push({file,reason:'matches local credential'});
 if(patterns.some(pattern=>pattern.test(content)))findings.push({file,reason:'credential pattern'});
}
if(findings.length){console.error(JSON.stringify({safe:false,findings}));process.exitCode=1;}
else console.log(JSON.stringify({safe:true,trackedFiles:files.length,localCredentialComparison:secrets.length>0}));
