import { AlertTriangle, FileText, Users, Network, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Investigation Overview</h2>
          <p className="text-slate-400 text-sm mt-1">Real-time intelligence summary across all active cases.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Generate Intelligence Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-start space-x-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Active Cases</p>
            <h3 className="text-2xl font-bold mt-1">124</h3>
            <p className="text-green-400 text-xs mt-2 flex items-center"><TrendingUp size={12} className="mr-1"/> +12% this week</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-start space-x-4">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
            <Users size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Extracted Entities</p>
            <h3 className="text-2xl font-bold mt-1">8,402</h3>
            <p className="text-slate-500 text-xs mt-2">Persons, Phones, Vehicles</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-start space-x-4">
          <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-500">
            <Network size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Mapped Relationships</p>
            <h3 className="text-2xl font-bold mt-1">14,209</h3>
            <p className="text-slate-500 text-xs mt-2">Across 83 networks</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-red-500 rounded-xl p-6 flex items-start space-x-4">
          <div className="p-3 rounded-lg bg-red-500/10 text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">High Priority Alerts</p>
            <h3 className="text-2xl font-bold mt-1">17</h3>
            <p className="text-red-400 text-xs mt-2">Requires immediate review</p>
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50">
            <h3 className="font-semibold text-lg">Recent AI Alerts</h3>
          </div>
          <div className="divide-y divide-slate-800">
            
            <div className="p-5 hover:bg-slate-800/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <h4 className="font-medium text-slate-200">Potential Case Linkage Detected</h4>
                </div>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">2 hrs ago</span>
              </div>
              <p className="text-sm text-slate-400 mt-2 ml-5">INVESTRA AI found 3 shared entities (1 Vehicle, 2 Phones) between <span className="text-blue-400 font-medium">FIR-2026-104</span> and <span className="text-blue-400 font-medium">FIR-2025-892</span>.</p>
              <div className="mt-3 ml-5 flex space-x-3">
                <button className="text-xs text-blue-400 hover:text-blue-300 font-medium border border-blue-900/50 bg-blue-900/20 px-3 py-1.5 rounded">Review Linkage</button>
                <button className="text-xs text-slate-400 hover:text-white">Dismiss</button>
              </div>
            </div>

            <div className="p-5 hover:bg-slate-800/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <h4 className="font-medium text-slate-200">Missing Evidence Alert</h4>
                </div>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">5 hrs ago</span>
              </div>
              <p className="text-sm text-slate-400 mt-2 ml-5">Vehicle <span className="font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">WB12AB1234</span> mentioned in FIR-2026-119 lacks registration confirmation document.</p>
            </div>

            <div className="p-5 hover:bg-slate-800/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <h4 className="font-medium text-slate-200">Temporal Contradiction</h4>
                </div>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Yesterday</span>
              </div>
              <p className="text-sm text-slate-400 mt-2 ml-5">Witness statement claims entity was at Location X at 20:00, but CCTV metadata places entity at Location Y at 20:05.</p>
            </div>

          </div>
        </div>

        {/* Recently Extracted Entities */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50">
            <h3 className="font-semibold text-lg">Recently Extracted Entities (Pending Verification)</h3>
          </div>
          <div className="p-2">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-slate-800/50 uppercase">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Type</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Source Case</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-4"><span className="bg-indigo-900/50 text-indigo-300 border border-indigo-800 px-2 py-1 rounded text-xs">PERSON</span></td>
                  <td className="px-4 py-4 font-medium">Rajesh Kumar</td>
                  <td className="px-4 py-4 text-blue-400 cursor-pointer hover:underline">FIR-104</td>
                  <td className="px-4 py-4 text-right">
                    <button className="text-blue-500 hover:text-blue-400">Verify</button>
                  </td>
                </tr>
                <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-4"><span className="bg-emerald-900/50 text-emerald-300 border border-emerald-800 px-2 py-1 rounded text-xs">PHONE</span></td>
                  <td className="px-4 py-4 font-mono text-sm">9876543210</td>
                  <td className="px-4 py-4 text-blue-400 cursor-pointer hover:underline">FIR-104</td>
                  <td className="px-4 py-4 text-right">
                    <button className="text-blue-500 hover:text-blue-400">Verify</button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-4 py-4"><span className="bg-amber-900/50 text-amber-300 border border-amber-800 px-2 py-1 rounded text-xs">VEHICLE</span></td>
                  <td className="px-4 py-4 font-mono text-sm">MH-02-AB-9876</td>
                  <td className="px-4 py-4 text-blue-400 cursor-pointer hover:underline">FIR-219</td>
                  <td className="px-4 py-4 text-right">
                    <button className="text-blue-500 hover:text-blue-400">Verify</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
