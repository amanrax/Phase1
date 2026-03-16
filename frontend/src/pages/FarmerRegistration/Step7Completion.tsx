// src/pages/FarmerRegistration/Step7Completion.tsx — Step 7: success screen showing new farmer ID and navigation options
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeedback } from "@/utils/feedback";

type Props = {
  farmerId: string;
  farmerName: string;
  queued?: boolean;
};

export default function Step7Completion({ farmerId, farmerName, queued = false }: Props) {
  const navigate = useNavigate();
  const { triggerVibration, triggerSound } = useFeedback();

  // Play registration complete feedback once on mount
  useEffect(() => {
    triggerVibration("registration_complete");
    triggerSound("registration_complete");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8 px-4">
      {/* Success Icon */}
      <div className="text-8xl animate-bounce">&#x2705;</div>

      {/* Title */}
      <div>
        <h2 className="text-3xl font-bold text-green-600 dark:text-green-400">
          {queued ? "Registration Queued" : "Registration Complete!"}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          {queued
            ? "No internet connection detected. This registration will auto-submit when connectivity returns."
            : `${farmerName} has been successfully registered.`}
        </p>
      </div>

      {/* Farmer ID Card */}
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 border-2 border-indigo-300 dark:border-indigo-600 rounded-2xl p-6 shadow-md">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          {queued ? "Queue Reference" : "Farmer ID"}
        </p>
        <p className="text-3xl font-bold font-mono tracking-widest text-gray-900 dark:text-white">{farmerId}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {queued ? "Keep this reference in case you need support." : "Save this ID for future reference"}
        </p>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        {!queued && (
          <button
            onClick={() => navigate(`/farmers/${farmerId}`)}
            className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            View Farmer Details
          </button>
        )}
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
