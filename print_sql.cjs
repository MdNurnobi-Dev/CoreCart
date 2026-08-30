const fs = require('fs');
const code = fs.readFileSync('src/server/db.ts', 'utf8');
const match = code.match(/const schemaStatements = \[([\s\S]*?)\];/);
if (match) {
  let inner = match[1];
  let m, re = /\`([^\`]*)\`/gs;
  let arr = [];
  while ((m = re.exec(inner)) !== null) {
    arr.push(m[1].trim());
  }
  for(let i=0; i<arr.length; i++) {
    if(arr[i] === '') {
      console.log("Empty found at index", i);
      console.log("Prev:", arr[i-1]);
      console.log("Next:", arr[i+1]);
    }
  }
}
