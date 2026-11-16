export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#070d12] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-[#111a22] border-white/10 rounded-2xl p-6 sm:p-12">
          <h1 className="text-2xl font-bold text-center mb-6">Terms of Service</h1>
          <div className="text-slate-400 text-sm leading-relaxed space-y-4">
            <p>Welcome to Turf Booking Platform. By using our services, you agree to these terms.</p>
            <p>Last updated: November 2026</p>
            <p>These terms govern your use of our website and mobile application.</p>
          </div>
          <div className="mt-8 text-center">
            <a href="/" className="text-lime-400 hover:underline">Back to Home</a>
          </div>
        </div>
      </div>
    </div>
  )
}