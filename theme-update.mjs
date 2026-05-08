import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.module.css') || file.endsWith('.js') || file.endsWith('.css')) results.push(file);
        }
    });
    return results;
}

const files = [...walk('C:/Users/Ronalbis/travi-journals/app/trading'), ...walk('C:/Users/Ronalbis/travi-journals/components'), 'C:/Users/Ronalbis/travi-journals/app/globals.css'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    if (file.replace(/\\\\/g, '/').endsWith('globals.css')) {
        const newRoot = :root {
  --bg-primary: #0a1a0f;
  --bg-secondary: #0d1f14;
  --bg-tertiary: #0f2a1a;
  --accent: #1D9E75;
  --accent-light: #9FE1CB;
  --accent-dark: #0F6E56;
  --text-primary: #ffffff;
  --text-secondary: #9FE1CB;
  --text-muted: rgba(159, 225, 203, 0.5);
  --border-color: #1a3a24;
  --success: #1D9E75;
  --danger: #E24B4A;
  --warning: #F59E0B;
  --white: #ffffff;
  --accent-primary: #1D9E75;
  --accent-hover: #0F6E56;
  --accent-subtle: rgba(29, 158, 117, 0.1);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
};
        content = content.replace(/:root\s*\{[\s\S]*?\}/, newRoot);
        modified = true;
    }

    if (file.endsWith('.module.css')) {
        const pre = content;
        content = content.replace(/#f59e0b/gi, '#1D9E75')
                         .replace(/#d97706/gi, '#1D9E75')
                         .replace(/#fbbf24/gi, '#1D9E75')
                         .replace(/#eab308/gi, '#1D9E75')
                         .replace(/#0f172a/gi, '#0a1a0f')
                         .replace(/#1e293b/gi, '#0d1f14')
                         .replace(/#0d1117/gi, '#0a1a0f')
                         .replace(/#334155/gi, '#1a3a24')
                         .replace(/#2d3142/gi, '#1a3a24')
                         .replace(/#3b82f6/gi, '#1D9E75')
                         .replace(/var\(--accent-primary\)/g, 'var(--accent)')
                         .replace(/var\(--accent-hover\)/g, 'var(--accent-dark)');
        
        // Sidebar active left border fix
        if (file.replace(/\\\\/g, '/').endsWith('components/Sidebar.module.css')) {
            content = content.replace(/border-left:.*?;/g, 'border-left: 2px solid #1D9E75;');
        }
        
        if(pre !== content) modified = true;
    }

    if (file.replace(/\\\\/g, '/').endsWith('components/Sidebar.js')) {
        const pre = content;
        content = content.replace(
            /<span>\{pathname\.startsWith\(\'\\/trading\'\) \? \'TRADING\' : \'ANTICIPOS CACAO\'\}<\\/span>/g,
            <div>\n                    <span style={{fontWeight: 'bold', fontSize: '1.2rem'}}>travi<span style={{color: '#1D9E75'}}>trade</span></span>\n                    <div style={{fontSize: '0.65rem', color: '#9FE1CB', letterSpacing: '0.1em', marginTop: '-4px'}}>JOURNALS · V1.0</div>\n                </div>
        );
        if(pre !== content) modified = true;
    }

    if (file.replace(/\\\\/g, '/').endsWith('app/trading/dashboard/page.js')) {
        const pre = content;
        if (!content.includes('Mercado abierto')) {
            content = content.replace(
                /<p className=\{styles\.subtitle\}>Resumen de tu rendimiento y consistencia\.<\\/p>/,
                <p className={styles.subtitle}>Resumen de tu rendimiento y consistencia.</p>\n                    <div style={{display:'flex', gap:'8px', marginTop: '12px'}}>\n                        <span style={{padding:'4px 10px', borderRadius:'20px', fontSize:'11px', background:'#0f2e1a', color:'#1D9E75', border:'0.5px solid #1D9E75'}}>? Mercado abierto</span>\n                        <span style={{padding:'4px 10px', borderRadius:'20px', fontSize:'11px', background:'#0d1f14', color:'#9FE1CB', border:'0.5px solid #1a3a24'}}>NQ 21,430</span>\n                        <span style={{padding:'4px 10px', borderRadius:'20px', fontSize:'11px', background:'#0d1f14', color:'#9FE1CB', border:'0.5px solid #1a3a24'}}>MNQ 2,143</span>\n                    </div>
            );
        }
        if(pre !== content) modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', file);
    }
});
