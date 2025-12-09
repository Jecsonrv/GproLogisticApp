import React from 'react';

/**
 * EmptyState - Estado vacío profesional
 */
const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-gray-100 p-3">
            <Icon className="h-6 w-6 text-gray-400" />
          </div>
        </div>
      )}
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
