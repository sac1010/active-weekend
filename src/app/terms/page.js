import Link from 'next/link';
import { ArrowLeft, Scale, ShieldAlert, FileText, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | ActiveWeekend Bangalore',
  description: 'Terms and rules for using the ActiveWeekend community platform in Bangalore. Learn about hosting, joining events, TrustPoints rules, and community guidelines.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || 'https://activeweekend.fun'}/terms`
  }
};

export default function TermsOfService() {
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
            <Scale className="h-3 w-3" /> Legal Agreements
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Terms of Service
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Last Updated: August 22, 2026. Please read these terms carefully before participating in any ActiveWeekend gatherings, sports events, or outdoor meetups in Bangalore.
          </p>
        </div>

        {/* Content Card */}
        <div className="border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-sm text-slate-300 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">1.</span> Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, or using the ActiveWeekend platform ("the Website", "the App", "the Service"), you agree to be bound by these Terms of Service, all applicable laws and regulations in India, and agree that you are responsible for compliance with any local laws in Karnataka. If you do not agree with any of these terms, you are prohibited from using this Service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">2.</span> Community Nature & Pricing
            </h2>
            <p>
              ActiveWeekend is a **100% free community-driven** marketplace designed to facilitate peer-to-peer hobby hosting, casual sports squads, trekking coordination, and social meetups in Bangalore. 
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>ActiveWeekend does **not** charge any listing, hosting, or joining fees.</li>
              <li>Any expenses associated with activities (e.g., booking badminton courts, food/drink splits at breweries, vehicle fuel, or trek permissions) are strictly managed and split offline or peer-to-peer directly by participants. We do not process payments or collect commissions.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">3.</span> TrustPoints and Moderation system
            </h2>
            <p>
              To maintain high reliability and curb spam, ActiveWeekend uses a reputation system called **TrustPoints**:
            </p>
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 space-y-2">
              <p className="font-semibold text-emerald-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Code of Honor:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
                <li>New users start with **100 TrustPoints**.</li>
                <li>Hosts receive **+30 points** upon successful event completion (validated by group verification).</li>
                <li>No-shows or cancellations within 6 hours of the event start time incur a penalty of **-30 points** to protect organizer efforts.</li>
                <li>If a user's balance drops below **50 points**, they are restricted from joining highly-coveted squads until their reputation is rebuilt.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">4.</span> User Conduct & Safety
            </h2>
            <p>
              You represent that you will conduct yourself respectfully during offline coordinate sessions. Harassment, verbal abuse, stalking, or any behavior that compromises safety will result in immediate account deletion and blacklisting of the Google OAuth account.
            </p>
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex gap-3 text-slate-400 text-xs">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-400 block mb-1">Safety & Liability Warning:</strong>
                ActiveWeekend is purely a connection directory. We do not perform background checks on hosts or participants. You are solely responsible for verifying the details of the meetups. We highly recommend meeting in public spaces (e.g. well-lit commercial sports courts, registered cafes/breweries, popular hiking hubs) and exercising general safety precautions.
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">5.</span> Disclaimer of Liability
            </h2>
            <p>
              Under no circumstances shall ActiveWeekend, its creators, or contributors be held liable for any physical injury, theft, accident, loss, or interpersonal dispute that arises before, during, or after any event hosted on this platform. Users participate at their own risk and cost.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">6.</span> Platform Modifications
            </h2>
            <p>
              We reserve the right to modify these Terms of Service or discontinue features at any time. Continued use of the platform following updates signifies your acceptance of the updated terms.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500 flex justify-between items-center px-4">
          <p>© {new Date().getFullYear()} ActiveWeekend. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
            <span>·</span>
            <Link href="/" className="hover:text-emerald-400 transition-colors">Explore</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
