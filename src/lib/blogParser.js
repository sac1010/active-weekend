const fs = require('fs');
const path = require('path');

const blogDirectory = path.join(process.cwd(), 'src/content/blog');

export function getBlogPosts() {
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(blogDirectory);
  const posts = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(blogDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');

      // Simple Frontmatter Parser
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
      const match = fileContents.match(frontmatterRegex);
      const metadata = {};
      let body = fileContents;

      if (match) {
        body = fileContents.replace(frontmatterRegex, '').trim();
        const frontmatterLines = match[1].split('\n');
        frontmatterLines.forEach(line => {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
            metadata[key] = value;
          }
        });
      }

      return {
        slug,
        metadata,
        content: body
      };
    });

  // Sort posts by date descending
  return posts.sort((a, b) => {
    return new Date(b.metadata.date || 0) - new Date(a.metadata.date || 0);
  });
}

export function getBlogPostBySlug(slug) {
  const fullPath = path.join(blogDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');

  // Simple Frontmatter Parser
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = fileContents.match(frontmatterRegex);
  const metadata = {};
  let body = fileContents;

  if (match) {
    body = fileContents.replace(frontmatterRegex, '').trim();
    const frontmatterLines = match[1].split('\n');
    frontmatterLines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
        metadata[key] = value;
      }
    });
  }

  // Simple regex-based markdown to HTML compiler
  let htmlContent = body
    // Headings
    .replace(/^### (.*$)/gim, '<h3 class="text-xs md:text-sm font-bold text-white mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-sm md:text-base font-black text-white mt-6 mb-3 border-b border-slate-800 pb-1.5">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-base md:text-lg font-black text-white mt-8 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-white">$1</strong>')
    // Italics
    .replace(/\*(.*?)\*/g, '<em class="text-slate-300 italic">$1</em>')
    // Bullet points
    .replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-400 leading-relaxed">$1</li>')
    // Paragraphs (we wrap lines that don't start with tags or lists in <p>)
    .split('\n\n')
    .map(para => {
      para = para.trim();
      if (!para) return '';
      if (para.startsWith('<h') || para.startsWith('<li') || para.startsWith('<ul') || para.startsWith('<ol')) {
        return para;
      }
      return `<p class="text-slate-400 text-xs md:text-sm leading-relaxed mb-4">${para}</p>`;
    })
    .join('\n');

  // Wrap lists
  htmlContent = htmlContent.replace(/(<li.*<\/li>)/gs, '<ul class="space-y-2 mb-4">$1</ul>');

  return {
    slug,
    metadata,
    htmlContent
  };
}
