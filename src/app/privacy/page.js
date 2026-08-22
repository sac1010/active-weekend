import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Database, Lock, Globe } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | ActiveWeekend Bangalore',
  description: 'Privacy Policy for the ActiveWeekend community platform. Learn how we handle your login details, user profiles, and activity logs. 100% free and private.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || 'https://activeweekend.fun'}/privacy`
  }
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-400 relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Explore
        </Link>

        {/* Hero Header */}
        <div className="text-center sm:text-left mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-4 animate-pulse">
            <Shield className="h-3 w-3" /> Privacy Safeguards
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Last Updated: August 22, 2026. This Privacy Policy details how ActiveWeekend ("we", "our") manages your data. We design our platform to be as simple, clean, and private as possible.
          </p>
        </div>

        {/* Content Card */}
        <div className="border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-sm text-slate-300 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">1.</span> Information We Collect
            </h2>
            <p>
              ActiveWeekend is designed with data minimization in mind. We collect only what is strictly necessary to run a secure community meetup roster:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 space-y-1">
                <p className="font-semibold text-white text-xs flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-emerald-400" /> Account Data (OAuth)
                </p>
                <p className="text-slate-400 text-[11.5px]">
                  When you sign in using Google, we collect your verified email, display name, and avatar image. This is stored securely in Supabase Auth.
                </p>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 space-y-1">
                <p className="font-semibold text-white text-xs flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-emerald-400" /> Activity Data
                </p>
                <p className="text-slate-400 text-[11.5px]">
                  We store details of events you host, join, or leave, alongside your public coordination messages and event completion checks (e.g. photos, TrustPoints).
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">2.</span> How We Use Your Data
            </h2>
            <p>
              Your data is used solely to provide and improve the community features:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>To build and update your public user profile showing your activity statistics and TrustPoints.</li>
              <li>To send you transaction-based email notifications (e.g. when someone joins your roster or you join a match).</li>
              <li>To coordinate squads through our integrated real-time chat rooms for each individual event.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">3.</span> Data Sharing & Security
            </h2>
            <p>
              We are built on trust. We **do not sell, trade, or rent** your personal identifier data to third-party brokers or advertisers. 
            </p>
            <p>
              Your account details are hosted on **Supabase** (powered by AWS infrastructure) with strict Row-Level Security (RLS) policies implemented on databases. This ensures that coordination chat logs and host private contacts are only readable by authorized members checked in on that event's roster.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">4.</span> Cookies and Local Storage
            </h2>
            <p>
              We do not use tracking cookies for behavioral targeting. We use local browser storage strictly to preserve your active authentication session and filter preferences (like selected localities or activities in Bangalore).
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">5.</span> Your Rights & Data Deletion
            </h2>
            <p>
              You retain full ownership of your data. If you wish to delete your account and wipe all your profile details, hosted events, and messages from our active database, you can contact us at **sachingirish101@gmail.com**. Your account deletion request will be processed within 48 hours.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">6.</span> Third-Party Links & API Integrations
            </h2>
            <p>
              Our application links to other sites (like Vercel CDN, Supabase, Google Sign-In, and Resend.dev). We are not responsible for the privacy practices of those external services and encourage you to review their policies.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500 flex justify-between items-center px-4">
          <p>© {new Date().getFullYear()} ActiveWeekend. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
            <span>·</span>
            <Link href="/" className="hover:text-emerald-400 transition-colors">Explore</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
