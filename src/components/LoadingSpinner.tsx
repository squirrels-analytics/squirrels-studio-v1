import './LoadingSpinner.css'

interface LoadingSpinnerProps {
    isLoading: boolean;
}

export default function LoadingSpinner({ isLoading }: LoadingSpinnerProps) {
    if (!isLoading) return null;
    
    return (
        <div id="loading-indicator">
            <div className="spinner"></div>
            <div className="loading-text">Loading...</div>
        </div>
    );
}