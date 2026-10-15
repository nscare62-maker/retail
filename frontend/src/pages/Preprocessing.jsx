import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Binary,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sliders,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { apiService } from '../services/api';

export default function Preprocessing() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusData, setStatusData] = useState(null);

  // Configuration options
  const [handleMissing, setHandleMissing] = useState('zero');
  const [outlierTreatment, setOutlierTreatment] = useState('cap_iqr');
  const [generateCalendar, setGenerateCalendar] = useState(true);
  const [valSplit, setValSplit] = useState(0.15);
  const [testSplit, setTestSplit] = useState(0.15);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const list = await apiService.getDatasets();
      setDatasets(list);
      if (list.length > 0) {
        setSelectedDatasetId(list[0].id);
        checkStatus(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (id) => {
    try {
      const res = await apiService.getPreprocessingStatus(id);
      setStatusData(res);
    } catch (err) {
      console.error('Error fetching preprocessing status:', err);
    }
  };

  const handleDatasetChange = (id) => {
    setSelectedDatasetId(id);
    checkStatus(id);
  };

  const handleRunPreprocessing = async () => {
    if (!selectedDatasetId) return;
    try {
      setProcessing(true);
      const res = await apiService.preprocessDataset(selectedDatasetId, {
        handle_missing: handleMissing,
        outlier_treatment: outlierTreatment,
        generate_calendar_features: generateCalendar,
        val_split_size: parseFloat(valSplit),
        test_split_size: parseFloat(testSplit),
      });
      setStatusData(res);
      // Refresh datasets list
      const updated = await apiService.getDatasets();
      setDatasets(updated);
    } catch (err) {
      alert(`Preprocessing failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading dataset preprocessing configurations..." />;
  }

  if (datasets.length === 0) {
    return (
      <div>
        <PageHeader title="Data Preprocessing & Splitting" subtitle="Cleanse, index, and prepare time-series for TFT deep learning" />
        <EmptyState
          title="No Datasets to Preprocess"
          description="Upload or load a dataset first before running time-series index generation and chronological splits."
          actionLabel="Go to Datasets"
          onAction={() => navigate('/datasets')}
        />
      </div>
    );
  }

  const isPreprocessed = statusData?.is_preprocessed;
  const meta = statusData?.metadata || {};
  const beforeAfter = statusData?.before_after_summary || {};

  return (
    <div>
      <PageHeader
        title="Data Preprocessing & Splitting"
        subtitle="Chronological sorting, continuous time indexing (time_idx), feature engineering, and leakage-free splits"
        actions={
          isPreprocessed && (
            <button className="btn-primary" onClick={() => navigate('/training')}>
              <Layers size={16} style={{ color: 'var(--gold-accent)' }} />
              <span>Configure TFT Training</span>
              <ArrowRight size={16} />
            </button>
          )
        }
      />

      {/* Target Dataset Selection */}
      <div className="wine-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label className="input-label">Select Dataset for Preprocessing</label>
            <select
              className="select-field"
              value={selectedDatasetId}
              onChange={(e) => handleDatasetChange(e.target.value)}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.row_count?.toLocaleString()} rows) — {d.is_preprocessed ? 'Preprocessed' : 'Raw'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              className="btn-primary"
              onClick={handleRunPreprocessing}
              disabled={processing}
            >
              <Binary size={16} style={{ color: 'var(--gold-accent)' }} />
              <span>{processing ? 'Preprocessing...' : 'Run Preprocessing Pipeline'}</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Preprocessing Settings Configuration */}
        <div className="wine-card">
          <div className="wine-card-header">
            <h3 className="wine-card-title">
              <Sliders size={18} style={{ color: 'var(--primary-wine)' }} />
              <span>Pipeline Configuration</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Missing Values */}
            <div>
              <label className="input-label">Missing Sales Imputation Strategy</label>
              <select
                className="select-field"
                value={handleMissing}
                onChange={(e) => setHandleMissing(e.target.value)}
              >
                <option value="zero">Fill Missing Sales with Zero (True Zero Retail Demand)</option>
                <option value="forward_fill">Forward Fill (Persist Previous Day Demand)</option>
                <option value="interpolate">Linear Interpolation</option>
              </select>
              <p style={{ fontSize: '0.78rem', color: 'var(--secondary-text)', marginTop: '0.25rem' }}>
                Distinguishes between missing data and true zero sales days.
              </p>
            </div>

            {/* Outliers */}
            <div>
              <label className="input-label">Outlier Capping (Sales Demand)</label>
              <select
                className="select-field"
                value={outlierTreatment}
                onChange={(e) => setOutlierTreatment(e.target.value)}
              >
                <option value="cap_iqr">IQR Soft Capping (Preserves Promotional Peaks)</option>
                <option value="none">No Capping (Keep Raw Extremes)</option>
              </select>
              <p style={{ fontSize: '0.78rem', color: 'var(--secondary-text)', marginTop: '0.25rem' }}>
                Protects the transformer attention weights from aberrant data spikes without dampening genuine promotions.
              </p>
            </div>

            {/* Calendar Features */}
            <div>
              <label className="input-label">Calendar Feature Generation</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="calCheck"
                  checked={generateCalendar}
                  onChange={(e) => setGenerateCalendar(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary-wine)', cursor: 'pointer' }}
                />
                <label htmlFor="calCheck" style={{ fontSize: '0.9rem', color: 'var(--primary-text)', cursor: 'pointer' }}>
                  Generate calendar features (day of week, month, day of month, and weekend indicator)
                </label>
              </div>
            </div>

            {/* Splits */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="input-label">Validation Split ({Math.round(valSplit * 100)}%)</label>
                <input
                  type="range"
                  min="0.10"
                  max="0.25"
                  step="0.05"
                  value={valSplit}
                  onChange={(e) => setValSplit(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--primary-wine)' }}
                />
              </div>
              <div>
                <label className="input-label">Test Split ({Math.round(testSplit * 100)}%)</label>
                <input
                  type="range"
                  min="0.10"
                  max="0.25"
                  step="0.05"
                  value={testSplit}
                  onChange={(e) => setTestSplit(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--primary-wine)' }}
                />
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--secondary-text)' }}>
              Strict chronological splitting ensures zero data leakage between training, validation, and out-of-sample testing.
            </p>
          </div>
        </div>

        {/* Preprocessing Summary / Audit Card */}
        <div className="wine-card">
          <div className="wine-card-header">
            <h3 className="wine-card-title">
              <ShieldCheck size={18} style={{ color: 'var(--primary-wine)' }} />
              <span>Transformation Summary</span>
            </h3>
            {isPreprocessed ? (
              <span className="badge badge-success">Ready for TFT</span>
            ) : (
              <span className="badge badge-warning">Awaiting Execution</span>
            )}
          </div>

          {isPreprocessed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: 'var(--pale-wine-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-wine)' }}>
                <div style={{ fontWeight: 600, color: 'var(--dark-wine)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Before vs. After Transformation
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>Initial Rows: <strong>{beforeAfter.initial_rows?.toLocaleString()}</strong></div>
                  <div>Final Rows: <strong>{beforeAfter.final_rows?.toLocaleString()}</strong></div>
                  <div>Missing Values: <strong>{beforeAfter.initial_missing_values} → {beforeAfter.final_missing_values}</strong></div>
                  <div>Duplicates Resolved: <strong>{beforeAfter.duplicates_resolved}</strong></div>
                  <div>Outliers Adjusted: <strong>{beforeAfter.outliers_adjusted}</strong></div>
                  <div>Added Covariates: <strong>{beforeAfter.added_features?.length || 5}</strong></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#FBF8F8', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Train Split</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-wine)', marginTop: '2px' }}>
                    {meta.train_records?.toLocaleString() || '70%'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--secondary-text)' }}>records</div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#FBF8F8', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Val Split</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gold-accent)', marginTop: '2px' }}>
                    {meta.val_records?.toLocaleString() || '15%'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--secondary-text)' }}>records</div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#FBF8F8', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Test Split</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--success)', marginTop: '2px' }}>
                    {meta.test_records?.toLocaleString() || '15%'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--secondary-text)' }}>records</div>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--secondary-text)', marginTop: '0.5rem' }}>
                Continuous chronological time sequence constructed from 0 to {meta.max_time_idx || 399}. Aligned temporal grid ready for model dataset preparation.
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '0.88rem' }}>
              Select a dataset and click "Run Preprocessing Pipeline" to generate the continuous time indices, calendar features, and leakage-free splits.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
