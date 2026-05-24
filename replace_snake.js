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

const replacements = [
  { search: /\"accountId\"/g, replace: 'account_id' },
  { search: /o\.accountId/g, replace: 'o.account_id' },
  { search: /c\.accountId/g, replace: 'c.account_id' },
  { search: /a\.accountId/g, replace: 'a.account_id' },
  { search: /WHERE accountId =/g, replace: 'WHERE account_id =' },
  { search: /AND accountId =/g, replace: 'AND account_id =' },
  { search: /OR accountId =/g, replace: 'OR account_id =' },

  { search: /\"setupId\"/g, replace: 'setup_id' },
  { search: /o\.setupId/g, replace: 'o.setup_id' },
  { search: /c\.setupId/g, replace: 'c.setup_id' },
  { search: /a\.setupId/g, replace: 'a.setup_id' },
  
  { search: /\"initialCapital\"/g, replace: 'initial_capital' },
  { search: /a\.initialCapital/g, replace: 'a.initial_capital' },
  
  { search: /\"riskPercent\"/g, replace: 'risk_percent' },
  { search: /a\.riskPercent/g, replace: 'a.risk_percent' },
  
  { search: /\"traderName\"/g, replace: 'trader_name' },
  { search: /a\.traderName/g, replace: 'a.trader_name' },

  { search: /\"traderEmail\"/g, replace: 'trader_email' },
  { search: /a\.traderEmail/g, replace: 'a.trader_email' },

  { search: /\"traderAddress\"/g, replace: 'trader_address' },
  { search: /a\.traderAddress/g, replace: 'a.trader_address' },

  { search: /\"accountNumber\"/g, replace: 'account_number' },
  { search: /a\.accountNumber/g, replace: 'a.account_number' },

  { search: /\"riesgoAmount\"/g, replace: 'riesgo_amount' },
  { search: /o\.riesgoAmount/g, replace: 'o.riesgo_amount' },

  { search: /\"resultType\"/g, replace: 'result_type' },
  { search: /o\.resultType/g, replace: 'o.result_type' },

  { search: /\"resultR\"/g, replace: 'result_r' },
  { search: /o\.resultR/g, replace: 'o.result_r' },

  { search: /\"imageUrl\"/g, replace: 'image_url' },
  { search: /o\.imageUrl/g, replace: 'o.image_url' },

  { search: /\"createdAt\"/g, replace: 'created_at' },
  { search: /o\.createdAt/g, replace: 'o.created_at' },

  { search: /\"operationId\"/g, replace: 'operation_id' },
  { search: /o\.operationId/g, replace: 'o.operation_id' },
  { search: /c\.operationId/g, replace: 'c.operation_id' },

  { search: /\"userId\"/g, replace: 'user_id' }
];

let changedAny = false;

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
