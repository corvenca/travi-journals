const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.js') || dirFile.endsWith('.ts')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync('C:\\\\Users\\\\Ronalbis\\\\travi-journals\\\\app\\\\api');
let changedAny = false;

const replacements = [
  { search: /o\.accountId/g, replace: 'o."accountId"' },
  { search: /o\.setupId/g, replace: 'o."setupId"' },
  { search: /a\.initialCapital/g, replace: 'a."initialCapital"' },
  { search: /a\.riskPercent/g, replace: 'a."riskPercent"' },
  { search: /o\.riesgoAmount/g, replace: 'o."riesgoAmount"' },
  { search: /o\.resultType/g, replace: 'o."resultType"' },
  { search: /o\.resultR/g, replace: 'o."resultR"' },
  { search: /o\.imageUrl/g, replace: 'o."imageUrl"' },
  { search: /o\.createdAt/g, replace: 'o."createdAt"' },
  { search: /c\.accountId/g, replace: 'c."accountId"' },
  { search: /c\.operationId/g, replace: 'c."operationId"' },
  { search: /a\.accountNumber/g, replace: 'a."accountNumber"' },
  { search: /a\.traderName/g, replace: 'a."traderName"' },
  { search: /a\.traderEmail/g, replace: 'a."traderEmail"' },
  { search: /a\.traderAddress/g, replace: 'a."traderAddress"' },
  // And let's catch plain WHERE accountId = ... which might have been missed in some files
  { search: /WHERE accountId =/g, replace: 'WHERE "accountId" =' },
  { search: /AND accountId =/g, replace: 'AND "accountId" =' }
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  replacements.forEach(r => {
    content = content.replace(r.search, r.replace);
  });

  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated', f);
    changedAny = true;
  }
});

if (!changedAny) {
  console.log('No matches found for explicit replacements.');
}
