import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="text-center">
        <div className="font-serif text-[52px] text-ink2 leading-none">404</div>
        <p className="text-[14.5px] text-muted mt-3 mb-6">This page doesn't exist.</p>
        <Link to="/" className="text-teal-700 underline underline-offset-2 text-[14px]">Back to home</Link>
      </div>
    </div>
  );
}
