// src/pages/FarmerRegistration/Step7Completion.tsx — Step 7: success screen showing new farmer ID and navigation options
import { useNavigate } from "react-router-dom";

type Props = {
  farmerId: string;
  farmerName: string;
};

export default function Step7Completion({ farmerId, farmerName }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8 px-4">
      {/* Success Icon */}
      <div className="text-8xl animate-bounce">&#x2705;</div>

      {/* Title */}
      <div>
        <h2 className="text-3xl font-bold text-green-600 dark:text-green-400">Registration Complete!</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{farmerName} has been successfully registered.</p>
      </div>

      {/* Farmer ID Card */}
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 border-2 border-indigo-300 dark:border-indigo-600 rounded-2xl p-6 shadow-md">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Farmer ID</p>
        <p className="text-3xl font-bold font-mono tracking-widest text-gray-900 dark:text-white">{farmerId}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Save this ID for future reference</p>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={() => navigate(`/farmers/${farmerId}`)}
          className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
        >
          View Farmer Details
        </button>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
        >
          Register Another Farmer
        </button>
        <button
          onClick={() => navigate("/farmers")}
          className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Go to Farmers List
        </button>
      </div>
    </div>
  );
}
