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
const pattern = /(?<![\"\'\`])(accountId|setupId|initialCapital|riskPercent|riesgoAmount|resultType|resultR|imageUrl|createdAt)(?![\"\'\`])/g;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const lines = content.substring(0, match.index).split('\n');
    const lineNum = lines.length;
    const lineContent = content.split('\n')[lineNum - 1].trim();
    if (lineContent.includes('SELECT ') || lineContent.includes('WHERE ') || lineContent.includes('INSERT ') || lineContent.includes('UPDATE ') || lineContent.includes('JOIN ') || lineContent.includes('ON ')) {
       console.log(f + ':' + lineNum + ' -> ' + lineContent);
    }
  }
});
