import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Binary,
  Download,
  Calendar,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import FileUpload from '../components/forms/FileUpload';
import DataTable from '../components/tables/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import { apiService } from '../services/api';

export default function Datasets() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(null);
  const [datasetDetail, setDatasetDetail] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState(null);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const list = await apiService.getDatasets();
      setDatasets(list);
      if (list.length > 0) {
        selectDataset(list[0].id);
      } else {
        setDatasetDetail(null);
        setPreview(null);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectDataset = async (id) => {
    try {
      setSelectedDatasetId(id);
      const [detail, prev] = await Promise.all([
        apiService.getDataset(id),
        apiService.getDatasetPreview(id, 20),
      ]);
      setDatasetDetail(detail);
      setPreview(prev);
    } catch (err) {
      console.error('Failed to load dataset details:', err);
    }
  };

  const handleUpload = async (file, name) => {
    try {
      setUploading(true);
      setUploadProgress(10);
      const res = await apiService.uploadDataset(file, name, (pct) => setUploadProgress(pct));
      setUploadProgress(100);
      await fetchDatasets();
      selectDataset(res.id);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSample = async () => {
    try {
      setUploading(true);
      const res = await apiService.loadSampleDataset();
      await fetchDatasets();
      selectDataset(res.id);
    } catch (err) {
      alert(`Failed to load sample dataset: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!datasetToDelete) return;
    try {
      await apiService.deleteDataset(datasetToDelete.id);
      setDeleteConfirmOpen(false);
      setDatasetToDelete(null);
      await fetchDatasets();
    } catch (err) {
      alert(`Failed to delete dataset: ${err.message}`);
    }
  };

  const downloadValidationReport = () => {
    if (!datasetDetail?.quality_report) return;
    const blob = new Blob([JSON.stringify(datasetDetail.quality_report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation_report_${datasetDetail.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <LoadingState message="Loading retail datasets..." />;
  }

  const quality = datasetDetail?.quality_report;
  const numSummary = quality?.numerical_summary || {};

  return (
    <div>
      <PageHeader
        title="Dataset Management & Validation"
        subtitle="Upload, audit data quality, and inspect schema structure for TFT demand modeling"
        actions={
          <button className="btn-gold" onClick={handleLoadSample} disabled={uploading}>
            <Sparkles size={16} />
            <span>Load Sample Dataset</span>
          </button>
        }
      />

      {/* Top: Upload & Dataset Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        <FileUpload onUpload={handleUpload} uploading={uploading} uploadProgress={uploadProgress} />

        {/* Existing Datasets List */}
        <div className="wine-card">
          <div className="wine-card-header">
            <h3 className="wine-card-title">
              <Database size={18} style={{ color: 'var(--primary-wine)' }} />
              <span>Dataset Repository</span>
            </h3>
            {datasets.length > 0 && (
              <span className="badge badge-wine">{datasets.length} Available</span>
            )}
          </div>

          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {datasets.length === 0 ? (
              <p style={{ color: 'var(--secondary-text)', fontSize: '0.88rem', padding: '1rem 0' }}>
                No datasets available. Drag & drop a CSV or click "Load Sample Dataset".
              </p>
            ) : (
              datasets.map((d) => (
                <div
                  key={d.id}
                  onClick={() => selectDataset(d.id)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${selectedDatasetId === d.id ? 'var(--primary-wine)' : 'var(--border-subtle)'}`,
                    backgroundColor: selectedDatasetId === d.id ? 'var(--pale-wine-bg)' : '#FFFFFF',
                    marginBottom: '0.6rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'var(--transition)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--dark-wine)', fontSize: '0.92rem' }}>{d.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>
                      {d.row_count?.toLocaleString()} rows • {d.col_count} columns • {d.filename}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <StatusBadge status={d.status} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDatasetToDelete(d);
                        setDeleteConfirmOpen(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--secondary-text)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Delete dataset"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected Dataset Details & Audit Report */}
      {datasetDetail && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Validation Banner */}
          <div
            className="wine-card"
            style={{
              backgroundColor: quality?.validation_passed ? '#FAFDFB' : '#FFFDF9',
              borderLeft: `5px solid ${quality?.validation_passed ? 'var(--success)' : 'var(--warning)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {quality?.validation_passed ? (
                    <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
                  ) : (
                    <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
                  )}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark-wine)' }}>
                    {quality?.validation_passed ? 'CSV Schema Validation Passed' : 'Validation Warnings Identified'}
                  </h3>
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--secondary-text)', marginTop: '0.35rem' }}>
                  {datasetDetail.name} • {datasetDetail.filename} • {quality?.total_rows?.toLocaleString()} rows analyzed
                </p>
                {quality?.issues && quality.issues.length > 0 && (
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--error)' }}>
                    {quality.issues.map((iss, i) => (
                      <li key={i}>{iss}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-secondary" onClick={downloadValidationReport}>
                  <Download size={14} />
                  <span>Download Quality Report (JSON)</span>
                </button>
                <button
                  className="btn-primary"
                  onClick={() => navigate('/preprocessing')}
                >
                  <Binary size={14} style={{ color: 'var(--gold-accent)' }} />
                  <span>Proceed to Preprocessing</span>
                </button>
              </div>
            </div>

            {/* Quality Summary Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid #ECE3E4',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-text)' }}>Date Range</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--dark-wine)', marginTop: '2px' }}>
                  {quality?.date_min || '—'} to {quality?.date_max || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-text)' }}>Total Days Span</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--dark-wine)', marginTop: '2px' }}>
                  {quality?.total_days ? `${quality.total_days} Consecutive Days` : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-text)' }}>Duplicate Records</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: quality?.duplicate_count > 0 ? 'var(--warning)' : 'var(--success)', marginTop: '2px' }}>
                  {quality?.duplicate_count ?? 0} Duplicates
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-text)' }}>Invalid Date Values</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: quality?.invalid_date_count > 0 ? 'var(--error)' : 'var(--success)', marginTop: '2px' }}>
                  {quality?.invalid_date_count ?? 0} Invalid
                </div>
              </div>
            </div>
          </div>

          {/* Numerical Feature Summaries */}
          {Object.keys(numSummary).length > 0 && (
            <div className="wine-card">
              <div className="wine-card-header">
                <h3 className="wine-card-title">
                  <span>Statistical Summaries (Numerical Features)</span>
                </h3>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Count</th>
                      <th>Mean</th>
                      <th>Std Dev</th>
                      <th>Min</th>
                      <th>25%</th>
                      <th>Median</th>
                      <th>75%</th>
                      <th>Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(numSummary).map(([colName, stat]) => (
                      <tr key={colName}>
                        <td style={{ fontWeight: 600, color: 'var(--primary-wine)' }}>{colName}</td>
                        <td>{stat.count?.toLocaleString()}</td>
                        <td>{stat.mean}</td>
                        <td>{stat.std}</td>
                        <td>{stat.min}</td>
                        <td>{stat.p25}</td>
                        <td style={{ fontWeight: 600 }}>{stat.median}</td>
                        <td>{stat.p75}</td>
                        <td>{stat.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview: First 20 Rows */}
          {preview && preview.rows && (
            <div className="wine-card">
              <div className="wine-card-header">
                <div>
                  <h3 className="wine-card-title">Dataset Preview (First 20 Records)</h3>
                  <p className="wine-card-subtitle">Inspecting raw tabular observations prior to continuous time indexing</p>
                </div>
              </div>

              <DataTable
                columns={preview.columns.map((col) => ({
                  key: col,
                  header: col.toUpperCase(),
                  accessor: col,
                }))}
                data={preview.rows}
                searchable={true}
                initialPageSize={10}
              />
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        title="Delete Dataset Record"
        message={`Are you sure you want to permanently delete "${datasetToDelete?.name}"? Associated preprocessed files will also be removed.`}
        confirmLabel="Delete Dataset"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDatasetToDelete(null);
        }}
      />
    </div>
  );
}
