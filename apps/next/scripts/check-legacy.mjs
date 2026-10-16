import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const files={'index.html':'6fff9724d5a6830319efb08de9ebd036d34a87ae','rs2-app-v2.html':'93fe70d00b219d2fdf4b61710cc661c8d3ff4d8a','rs2-app.html':'97d49d2040365e7f026b89070057cf038631836c'};
for(const [path,expected] of Object.entries(files)){
 const bytes=readFileSync(new URL('../../../'+path,import.meta.url));
 const actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(actual!==expected)throw new Error('Legacy file changed: '+path+'. Review the production baseline before proceeding.');
}
console.log('All three legacy HTML files are byte-identical to baseline 0846b6e.');
