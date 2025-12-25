const Spinner = ({ size = "md", className = "", color = "slate" }) => {
    const sizes = {
        xs: "h-3 w-3",
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
    };

    const colors = {
        blue: "text-blue-600",
        slate: "text-slate-600",
        white: "text-white",
        green: "text-green-600",
        red: "text-red-600",
    };

    return (
        <svg
            className={`animate-spin ${sizes[size]} ${colors[color]} ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
};

export const LoadingOverlay = ({ message = "Cargando..." }) => (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 shadow-xl flex flex-col items-center">
            <Spinner size="lg" />
            <p className="mt-4 text-slate-700 font-medium">{message}</p>
        </div>
    </div>
);

export const LoadingState = ({ message = "Cargando datos..." }) => (
    <div className="flex flex-col items-center justify-center py-12">
        <Spinner size="lg" />
        <p className="mt-4 text-slate-600">{message}</p>
    </div>
);

export default Spinner;
