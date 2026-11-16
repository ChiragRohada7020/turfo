export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#070d12] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-[#111a22] border-white/10 rounded-2xl p-6 sm:p-12">
          <h1 className="text-2xl font-bold text-center mb-6">Privacy Policy</h1>
          <div className="text-slate-400 text-sm leading-relaxed space-y-4">
            <p>We respect your privacy and are committed to protecting your personal data.</p>
            <p>Last updated: November 2026</p>
            <p>This privacy policy explains how we collect, use, and safeguard your information.</p>
          </div>
          <div className="mt-8 text-center">
            <a href="/" className="text-lime-400 hover:underline">Back to Home</a>
          </div>
        </div>
      </div>
    </div>
  )
}