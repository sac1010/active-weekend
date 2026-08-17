import Link from 'next/link';
import { getBlogPosts, getBlogPostBySlug } from '@/lib/blogParser';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, User } from 'lucide-react';

export async function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const post = getBlogPostBySlug(resolvedParams.slug);
  if (!post) return {};

  return {
    title: `${post.metadata.title} | ActiveWeekend Blog`,
    description: post.metadata.description,
    openGraph: {
      title: post.metadata.title,
      description: post.metadata.description,
      images: [{ url: post.metadata.coverImage }],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const resolvedParams = await params;
  const post = getBlogPostBySlug(resolvedParams.slug);
  if (!post) {
    notFound();
  }

  // Inject JSON-LD Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.metadata.title,
    "description": post.metadata.description,
    "image": post.metadata.coverImage,
    "datePublished": post.metadata.date,
    "author": {
      "@type": "Person",
      "name": post.metadata.author || 'Sachin Girish'
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-6 px-4">
      {/* JSON-LD structured data injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back button */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog
      </Link>

      <article className="space-y-6">
        {/* Cover image banner */}
        {post.metadata.coverImage && (
          <div className="relative h-56 sm:h-72 w-full overflow-hidden rounded-2xl bg-slate-950 border border-slate-800">
            <img
              src={post.metadata.coverImage}
              alt={post.metadata.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-3">
          {/* Category */}
          <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
            Guide
          </span>

          {/* Heading */}
          <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">
            {post.metadata.title}
          </h1>

          {/* Metadata Row */}
          <div className="flex items-center gap-4 text-[10.5px] text-slate-500 border-b border-slate-900 pb-4">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> By {post.metadata.author}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {new Date(post.metadata.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Content body compiled HTML */}
        <div 
          className="prose prose-invert max-w-none text-xs md:text-sm text-slate-300 space-y-4"
          dangerouslySetInnerHTML={{ __html: post.htmlContent }}
        />
      </article>

      {/* Floating CTA Banner */}
      <div className="bg-gradient-to-br from-slate-950 to-[#0a101d] border border-slate-800 p-6 rounded-2xl text-center space-y-4 shadow-xl mt-12 relative overflow-hidden">
        <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl" />
        <div className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-indigo-500/5 blur-2xl" />
        
        <div className="space-y-1.5 z-10 relative">
          <h4 className="font-extrabold text-sm text-white">Join Open Squads This Weekend</h4>
          <p className="text-slate-400 text-[11px] leading-relaxed max-w-md mx-auto">
            Ready to hit the court or explore Bangalore? Browse active matches, check-in, and start playing with zero platform fees.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all z-10 relative active:scale-95"
        >
          Explore Bangalore Roster
        </Link>
      </div>
    </div>
  );
}
