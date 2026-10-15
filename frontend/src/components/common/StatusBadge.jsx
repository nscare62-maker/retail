import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';

export default function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();

  if (s === 'completed' || s === 'preprocessed' || s === 'ok' || s === 'healthy') {
    return (
      <span className="badge badge-success">
        <CheckCircle2 size={12} />
        <span style={{ textTransform: 'capitalize' }}>{status}</span>
      </span>
    );
  }

  if (s === 'training' || s === 'preprocessing' || s === 'pending') {
    return (
      <span className="badge badge-gold">
        <Clock size={12} className="spinner" />
        <span style={{ textTransform: 'capitalize' }}>{status}</span>
      </span>
    );
  }

  if (s === 'reorder_now' || s === 'reorder') {
    return (
      <span className="badge badge-warning">
        <AlertTriangle size={12} />
        <span>Reorder Now</span>
      </span>
    );
  }

  if (s === 'critical_stockout') {
    return (
      <span className="badge badge-error">
        <AlertCircle size={12} />
        <span>Critical Stockout</span>
      </span>
    );
  }

  if (s === 'excess_stock') {
    return (
      <span className="badge badge-wine">
        <Sparkles size={12} />
        <span>Excess Stock</span>
      </span>
    );
  }

  if (s === 'failed' || s === 'error' || s === 'validation_warning') {
    return (
      <span className="badge badge-error">
        <AlertCircle size={12} />
        <span style={{ textTransform: 'capitalize' }}>{status}</span>
      </span>
    );
  }

  return (
    <span className="badge badge-wine">
      <span style={{ textTransform: 'capitalize' }}>{status || 'Unknown'}</span>
    </span>
  );
}
