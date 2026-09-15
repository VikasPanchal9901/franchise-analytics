import React from 'react';

export function LoadingState({ label = 'Loading data…' }) {
  return (
    <div className="flex items-center gap-3 text-muted text-sm py-16 justify-center">
      <span className="h-3.5 w-3.5 rounded-full border-2 border-line border-t-teal-600 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message = "Couldn't load this data.", onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 text-sm py-16 justify-center text-center">
      <p className="text-critical-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-teal-700 underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}
