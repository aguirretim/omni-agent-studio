import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { projectPath } = await req.json();

    if (!projectPath || !fs.existsSync(projectPath)) {
      return NextResponse.json({ error: 'Valid project path is required' }, { status: 400 });
    }

    const techStack = {
      framework: 'Unknown',
      styling: 'Unknown',
      language: 'Unknown',
      database: 'Unknown / None detected',
      packageManager: 'npm'
    };

    // Check project files
    const files = fs.readdirSync(projectPath);
    
    // Language
    if (files.includes('tsconfig.json')) {
      techStack.language = 'TypeScript';
    } else if (files.some(f => f.endsWith('.js') || f.endsWith('.jsx'))) {
      techStack.language = 'JavaScript';
    } else if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.some(f => f.endsWith('.py'))) {
      techStack.language = 'Python';
    } else if (files.includes('Cargo.toml')) {
      techStack.language = 'Rust';
    } else if (files.includes('go.mod')) {
      techStack.language = 'Go';
    }

    // Styling & Frameworks (JS/TS specific)
    if (files.includes('next.config.js') || files.includes('next.config.mjs') || files.includes('next.config.ts')) {
      techStack.framework = 'Next.js (React)';
    } else if (files.includes('vite.config.js') || files.includes('vite.config.ts')) {
      techStack.framework = 'Vite (React/Vue/Svelte)';
    } else if (files.includes('nuxt.config.js') || files.includes('nuxt.config.ts')) {
      techStack.framework = 'Nuxt (Vue)';
    }

    if (files.includes('tailwind.config.js') || files.includes('tailwind.config.ts') || files.includes('tailwind.config.mjs') || files.includes('tailwind.config.cjs')) {
      techStack.styling = 'Tailwind CSS';
    }

    // Package Managers
    if (files.includes('pnpm-lock.yaml')) {
      techStack.packageManager = 'pnpm';
    } else if (files.includes('yarn.lock')) {
      techStack.packageManager = 'yarn';
    } else if (files.includes('bun.lockb')) {
      techStack.packageManager = 'bun';
    }

    // Dig into package.json for more specifics
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        
        // Refine framework
        if (!techStack.framework || techStack.framework === 'Unknown') {
           if (deps['react']) techStack.framework = 'React';
           if (deps['vue']) techStack.framework = 'Vue';
           if (deps['@angular/core']) techStack.framework = 'Angular';
           if (deps['svelte']) techStack.framework = 'Svelte';
        }

        // Refine styling
        if (!techStack.styling || techStack.styling === 'Unknown') {
          if (deps['styled-components']) techStack.styling = 'Styled Components';
          if (deps['sass']) techStack.styling = 'SASS / SCSS';
          if (deps['less']) techStack.styling = 'LESS';
          if (deps['tailwindcss']) techStack.styling = 'Tailwind CSS';
        }

        // Detect Database / ORM
        if (deps['prisma']) {
          techStack.database = 'Prisma ORM';
        } else if (deps['drizzle-orm']) {
          techStack.database = 'Drizzle ORM';
        } else if (deps['mongoose']) {
          techStack.database = 'MongoDB (Mongoose)';
        } else if (deps['pg'] || deps['pg-promise']) {
          techStack.database = 'PostgreSQL';
        } else if (deps['mysql'] || deps['mysql2']) {
          techStack.database = 'MySQL';
        } else if (deps['sequelize']) {
          techStack.database = 'Sequelize ORM';
        } else if (deps['sqlite3']) {
          techStack.database = 'SQLite3';
        } else if (deps['@supabase/supabase-js']) {
           techStack.database = 'Supabase';
        } else if (deps['firebase']) {
           techStack.database = 'Firebase';
        }
      } catch (e) {
        // ignore package json parse error
      }
    }

    // Python fallback checks
    if (techStack.language === 'Python') {
       const reqPath = path.join(projectPath, 'requirements.txt');
       if (fs.existsSync(reqPath)) {
          const req = fs.readFileSync(reqPath, 'utf8').toLowerCase();
          if (req.includes('django')) techStack.framework = 'Django';
          else if (req.includes('flask')) techStack.framework = 'Flask';
          else if (req.includes('fastapi')) techStack.framework = 'FastAPI';

          if (req.includes('psycopg2') || req.includes('asyncpg')) techStack.database = 'PostgreSQL';
          else if (req.includes('mysqlclient') || req.includes('pymysql')) techStack.database = 'MySQL';
          else if (req.includes('pymongo')) techStack.database = 'MongoDB';
          else if (req.includes('sqlalchemy')) techStack.database = 'SQLAlchemy (ORM)';
       }
    }

    // Build directory tree visualization (top level only for brevity)
    let folderStructure = '';
    try {
      folderStructure = files
        .filter(f => !['node_modules', '.git', '.next', 'dist', 'build', '.DS_Store'].includes(f))
        .slice(0, 15) // Limit to top 15 items
        .map(f => {
          try {
            const isDir = fs.statSync(path.join(projectPath, f)).isDirectory();
            return isDir ? `📁 ${f}/` : `📄 ${f}`;
          } catch {
             return `📄 ${f}`;
          }
        })
        .join('\n');
      
      if (files.length > 20) {
        folderStructure += '\n... (more files truncated)';
      }
    } catch (e) {}

    return NextResponse.json({ 
      success: true, 
      techStack,
      folderStructure
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
