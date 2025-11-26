import React from 'react';

interface Step {
  number: number;
  label: string;
  status: 'completed' | 'active' | 'pending';
}

interface WizardStepsProps {
  steps: Step[];
}

export const WizardSteps: React.FC<WizardStepsProps> = ({ steps }) => {
  return (
    <div className="flex justify-between items-center mb-8 px-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm transition-colors ${
                step.status === 'completed'
                  ? 'bg-green-900 text-white border-green-900'
                  : step.status === 'active'
                  ? 'bg-green-700 text-white border-green-700'
                  : 'text-gray-400 border-gray-300'
              }`}
            >
              {step.status === 'completed' ? (
                <i className="fa-solid fa-check"></i>
              ) : (
                step.number
              )}
            </div>
            <span
              className={`text-xs mt-2 font-bold ${
                step.status === 'active'
                  ? 'text-green-800'
                  : step.status === 'completed'
                  ? 'text-green-900'
                  : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`h-1 flex-1 mx-2 mt-[-20px] ${
                step.status === 'completed' ? 'bg-green-900' : 'bg-gray-300'
              }`}
            ></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default WizardSteps;
