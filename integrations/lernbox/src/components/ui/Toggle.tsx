import React from 'react';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => {
    return (
        <div
            className={`w-12 h-7 rounded-full transition-colors duration-200 ease-in-out cursor-pointer relative ${checked ? 'bg-purple-600' : 'bg-gray-200'
                }`}
            onClick={() => onChange(!checked)}
        >
            <div
                className={`w-5 h-5 bg-white rounded-full shadow absolute top-1 left-1 transition-transform duration-200 ${checked ? 'translate-x-5' : ''
                    }`}
            />
        </div>
    );
};
