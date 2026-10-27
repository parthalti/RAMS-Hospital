import React from 'react';

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return <div className="py-10 text-center text-sm text-slate-400">{label}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="py-10 text-center text-sm text-red-500">{message}</div>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="py-10 text-center text-sm text-slate-400">{message}</div>;
}
