import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function FileUpload({ onUpload, uploading, uploadProgress }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    setError(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV (.csv) files are permitted.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the 50MB maximum upload limit.');
      return;
    }

    setSelectedFile(file);
    if (!datasetName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setDatasetName(cleanName);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drag a CSV file.');
      return;
    }
    if (onUpload) {
      onUpload(selectedFile, datasetName);
    }
  };

  return (
    <div className="wine-card">
      <h3 className="wine-card-title" style={{ marginBottom: '0.4rem' }}>
        <UploadCloud size={20} style={{ color: 'var(--primary-wine)' }} />
        <span>Upload Retail Dataset</span>
      </h3>
      <p className="wine-card-subtitle" style={{ marginBottom: '1.25rem' }}>
        Provide historical sales data in CSV format. Required fields: Date, Product ID, and Sales volume.
      </p>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? 'var(--gold-accent)' : 'var(--border-wine)'}`,
          backgroundColor: isDragOver ? 'var(--pale-wine-bg)' : '#FAF7F7',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'var(--transition)',
          position: 'relative',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'var(--light-wine)',
            color: 'var(--primary-wine)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <UploadCloud size={26} />
        </div>

        <p style={{ fontWeight: 600, color: 'var(--dark-wine)', fontSize: '0.98rem' }}>
          {selectedFile ? selectedFile.name : 'Click to browse or drag and drop your retail CSV file'}
        </p>

        <p style={{ fontSize: '0.8rem', color: 'var(--secondary-text)', marginTop: '0.35rem' }}>
          {selectedFile
            ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to validate and upload`
            : 'Supports comma-separated files up to 50MB with daily store/product records'}
        </p>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem',
            color: 'var(--error)',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Dataset Name & Upload Button */}
      {selectedFile && (
        <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="input-label">Dataset Display Name</label>
            <input
              type="text"
              className="input-field"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="e.g. Q4 National Store Sales"
              required
            />
          </div>

          {uploading && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--dark-wine)', fontWeight: 600 }}>Uploading & Validating...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--pale-wine-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${uploadProgress}%`,
                    backgroundColor: 'var(--primary-wine)',
                    transition: 'width 0.2s',
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSelectedFile(null);
                setDatasetName('');
              }}
              disabled={uploading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? (
                <>
                  <RefreshCw size={15} className="spinner" />
                  <span>Validating Dataset...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} style={{ color: 'var(--gold-accent)' }} />
                  <span>Upload & Validate Dataset</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
      {/* Schema Requirement Helper */}
      {!selectedFile && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--pale-wine-bg)',
            border: '1px solid var(--border-wine)',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--dark-wine)', marginBottom: '0.5rem' }}>
            <FileText size={15} style={{ color: 'var(--primary-wine)' }} />
            <span>CSV Schema Requirements</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', color: 'var(--secondary-text)' }}>
            <div>
              <strong style={{ color: 'var(--primary-wine)' }}>Required Columns:</strong>
              <ul style={{ paddingLeft: '1.2rem', margin: '0.25rem 0 0' }}>
                <li><code style={{ color: 'var(--dark-wine)', fontWeight: 600 }}>date</code> (e.g. YYYY-MM-DD)</li>
                <li><code style={{ color: 'var(--dark-wine)', fontWeight: 600 }}>product_id</code> (SKU / product ID)</li>
                <li><code style={{ color: 'var(--dark-wine)', fontWeight: 600 }}>sales</code> (numerical demand volume)</li>
              </ul>
            </div>
            <div>
              <strong style={{ color: 'var(--dark-wine)' }}>Optional Features:</strong>
              <ul style={{ paddingLeft: '1.2rem', margin: '0.25rem 0 0' }}>
                <li><code style={{ color: 'var(--dark-wine)', fontWeight: 600 }}>store_id</code> (multi-store entity)</li>
                <li><code style={{ color: 'var(--dark-wine)', fontWeight: 600 }}>category</code>, <code style={{ color: 'var(--dark-wine)', fontWeight: 600 }}>price</code>, <code style={{ color: 'var(--dark-wine)', fontWeight: 600 }}>discount</code></li>
                <li><code style={{ color: 'var(--dark-wine)', fontWeight: 600 }}>promotion</code>, <code style={{ color: 'var(--dark-wine)', fontWeight: 600 }}>holiday</code> (0 or 1 flags)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
