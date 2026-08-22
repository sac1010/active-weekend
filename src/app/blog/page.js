import Link from 'next/link';
import { getBlogPosts } from '@/lib/blogParser';
import { ArrowLeft, BookOpen, Calendar, User } from 'lucide-react';

export const metadata = {
  title: 'ActiveWeekend Blog — Bangalore Outdoor Guides, Court Tips & Weekend Ideas',
  description: 'Read local guides on badminton courts, cycling routes, trekking trails, craft breweries, and weekend activities in Bangalore. Curated by the ActiveWeekend community.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || 'https://activeweekend.fun'}/blog`
  }
};

export default function BlogLandingPage() {
  const posts = getBlogPosts();

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6 px-4">
      {/* Blog Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white">ActiveWeekend Blog</h1>
            <p className="text-[10px] text-slate-500 leading-none mt-1">Bangalore outdoor guides, court recommendations, and weekend ideas</p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to App
        </Link>
      </div>

      {/* Blog Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-10 md:col-span-2">No articles published yet.</p>
        ) : (
          posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 hover:border-slate-700/80 bg-slate-950/20 overflow-hidden hover:scale-[1.01] hover:shadow-xl transition-all"
            >
              <div>
                {/* Article Cover Image */}
                {post.metadata.coverImage && (
                  <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                    <img
                      src={post.metadata.coverImage}
                      alt={post.metadata.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  </div>
                )}

                {/* Article Info */}
                <div className="p-5 space-y-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Guide
                  </span>
                  <h2 className="font-extrabold text-base text-white group-hover:text-emerald-400 transition-colors leading-snug line-clamp-2">
                    {post.metadata.title}
                  </h2>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {post.metadata.description}
                  </p>
                </div>
              </div>

              {/* Footer row */}
              <div className="px-5 pb-5 pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900/50">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {post.metadata.author || 'Staff'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {new Date(post.metadata.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
