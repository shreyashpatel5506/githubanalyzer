export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">
          Simple pricing
        </h1>
        <p className="text-gray-400 mb-12">
          Upgrade when you’re serious about GitHub insights.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* FREE */}
          <div className="border border-white/10 rounded-2xl p-6 text-left">
            <h2 className="text-xl font-semibold mb-2">Free</h2>
            <p className="text-gray-400 mb-4">
              For quick exploration
            </p>

            <ul className="text-sm text-gray-300 space-y-2 mb-6">
              <li>• Public repositories only</li>
              <li>• Limited daily analyses</li>
              <li>• Basic insights</li>
            </ul>

            <p className="text-2xl font-bold">₹0</p>
          </div>

          {/* PRO */}
          <div className="border border-white rounded-2xl p-6 text-left bg-white text-black">
            <h2 className="text-xl font-semibold mb-2">Pro</h2>
            <p className="text-gray-600 mb-4">
              For builders & recruiters
            </p>

            <ul className="text-sm space-y-2 mb-6">
              <li>• Public + private repos</li>
              <li>• Unlimited analysis</li>
              <li>• Deeper AI insights</li>
              <li>• Priority processing</li>
            </ul>

            <p className="text-2xl font-bold mb-4">
              ₹299 / month
            </p>

            <button className="w-full bg-black text-white py-2 rounded-lg">
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
