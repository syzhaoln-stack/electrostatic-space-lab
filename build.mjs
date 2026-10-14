import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync('dist',{recursive:true});
for(const name of fs.readdirSync('.'))if(/\.(html|css|js)$/.test(name)&&!name.endsWith('.test.js'))fs.copyFileSync(name,path.join('dist',name));
function copyDirectory(from,to){fs.mkdirSync(to,{recursive:true});for(const item of fs.readdirSync(from,{withFileTypes:true})){const src=path.join(from,item.name),dst=path.join(to,item.name);if(item.isDirectory())copyDirectory(src,dst);else fs.copyFileSync(src,dst);}}
copyDirectory('vendor','dist/vendor');
if(fs.existsSync('assets'))copyDirectory('assets','dist/assets');
fs.mkdirSync('dist/media',{recursive:true});
for(const name of ['electric-field-dialogue.mp3','electric-field-dialogue.timeline.json','electric-field-dialogue.vtt','podcast-status.json'])if(fs.existsSync('media/'+name))fs.copyFileSync('media/'+name,'dist/media/'+name);
console.log('Static pages and local assets built in dist');
