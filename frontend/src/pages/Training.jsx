import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Sliders
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import ChartCard from '../components/common/ChartCard';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { apiService } from '../services/api';

export default function Training() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);

  // Form parameters
  const [modelName, setModelName] = useState('TFT-Retail-Base-v1');
  const [datasetId, setDatasetId] = useState('');
  const [horizon, setHorizon] = useState(14);
  const [lookback, setLookback] = useState(30);
  const [epochs, setEpochs] = useState(5);
  const [batchSize, setBatchSize] = useState(64);
  const [learningRate, setLearningRate] = useState(0.005);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Poll status if there is an active job running
  useEffect(() => {
    let timer = null;
    if (activeJobId) {
      timer = setInterval(async () => {
        try {
          const st = await apiService.getModelStatus(activeJobId);
          setJobStatus(st);
          if (st.status === 'completed' || st.status === 'failed') {
            setActiveJobId(null);
            // Refresh models list
            const updatedModels = await apiService.getModels();
            setModels(updatedModels);
          }
        } catch (err) {
          console.error('Error polling model status:', err);
        }
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [activeJobId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dList, mList] = await Promise.all([
        apiService.getDatasets(),
        apiService.getModels(),
      ]);
      setDatasets(dList);
      setModels(mList);
      if (dList.length > 0) {
        setDatasetId(dList[0].id);
      }
      // If any model is currently training, track it
      const running = mList.find((m) => m.status === 'training' || m.status === 'pending');
      if (running) {
        setActiveJobId(running.id);
      }
    } catch (err) {
      console.error('Failed to load training data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = async (e) => {
    e.preventDefault();
    if (!datasetId) return;

    try {
      setSubmitting(true);
      const res = await apiService.trainModel({
        name: modelName,
        dataset_id: datasetId,
        target_col: 'sales',
        group_ids: ['product_id', 'store_id'],
        horizon: parseInt(horizon, 10),
        lookback: parseInt(lookback, 10),
        epochs: parseInt(epochs, 10),
        batch_size: parseInt(batchSize, 10),
        learning_rate: parseFloat(learningRate),
      });

      setActiveJobId(res.id);
      setJobStatus({
        model_id: res.id,
        status: 'training',
        progress: 0,
        current_epoch: 0,
        total_epochs: epochs,
        loss_history: [],
      });
      // Refresh models
      const updatedModels = await apiService.getModels();
      setModels(updatedModels);
    } catch (err) {
      alert(`Failed to initiate TFT training: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading TFT architecture & model parameters..." />;
  }

  if (datasets.length === 0) {
    return (
      <div>
        <PageHeader title="Temporal Fusion Transformer Training" subtitle="Train deep neural networks with multi-horizon quantile attention" />
        <EmptyState
          title="Dataset Required for Training"
          description="Please upload or load a sample dataset before launching Temporal Fusion Transformer training."
          actionLabel="Go to Datasets"
          onAction={() => navigate('/datasets')}
        />
      </div>
    );
  }

  const lossHistory = jobStatus?.loss_history || [];

  return (
    <div>
      <PageHeader
        title="Temporal Fusion Transformer Training"
        subtitle="End-to-end PyTorch Forecasting training with self-attention, Gated Residual Networks, and Quantile Loss"
      />

      {/* Real-time Training Progress Bar if active */}
      {jobStatus && (jobStatus.status === 'training' || jobStatus.status === 'pending') && (
        <div
          className="wine-card pulsing"
          style={{
            marginBottom: '1.5rem',
            borderLeft: '5px solid var(--gold-accent)',
            backgroundColor: '#FFFEFA',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Clock size={18} className="spinner" style={{ color: 'var(--gold-accent)' }} />
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--dark-wine)' }}>
                  Training Temporal Fusion Transformer in Progress...
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--secondary-text)' }}>
                  Epoch {jobStatus.current_epoch} of {jobStatus.total_epochs} • Optimizing QuantileLoss (P10, P50, P90)
                </div>
              </div>
            </div>
            <span className="badge badge-gold">{jobStatus.progress}% Completed</span>
          </div>

          <div style={{ height: '10px', backgroundColor: '#F3EDE8', borderRadius: '5px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${jobStatus.progress}%`,
                background: 'linear-gradient(90deg, var(--primary-wine), var(--gold-accent))',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Main Grid: Form on left, live loss / architecture on right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Model Training Configuration */}
        <div className="wine-card">
          <div className="wine-card-header">
            <h3 className="wine-card-title">
              <Sliders size={18} style={{ color: 'var(--primary-wine)' }} />
              <span>Model Hyperparameters & Architecture</span>
            </h3>
          </div>

          <form onSubmit={handleStartTraining} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="input-label">Model Identifier Name</label>
              <input
                type="text"
                className="input-field"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="input-label">Source Dataset</label>
              <select
                className="select-field"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count?.toLocaleString()} rows)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="input-label">Forecast Horizon</label>
                <select
                  className="select-field"
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                >
                  <option value={7}>7 Days (Weekly)</option>
                  <option value={14}>14 Days (Fortnightly)</option>
                  <option value={30}>30 Days (Monthly)</option>
                </select>
              </div>

              <div>
                <label className="input-label">Lookback Window (Encoder)</label>
                <select
                  className="select-field"
                  value={lookback}
                  onChange={(e) => setLookback(e.target.value)}
                >
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="input-label">Epochs</label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  max={50}
                  value={epochs}
                  onChange={(e) => setEpochs(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="input-label">Batch Size</label>
                <select
                  className="select-field"
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                >
                  <option value={32}>32</option>
                  <option value={64}>64</option>
                  <option value={128}>128</option>
                </select>
              </div>

              <div>
                <label className="input-label">Learning Rate</label>
                <select
                  className="select-field"
                  value={learningRate}
                  onChange={(e) => setLearningRate(e.target.value)}
                >
                  <option value={0.01}>0.01 (Fast)</option>
                  <option value={0.005}>0.005 (Balanced)</option>
                  <option value={0.001}>0.001 (Refined)</option>
                </select>
              </div>
            </div>

            {/* Covariates Info Pill */}
            <div style={{ backgroundColor: 'var(--pale-wine-bg)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-wine)', fontSize: '0.8rem', color: 'var(--secondary-text)' }}>
              <div style={{ fontWeight: 600, color: 'var(--dark-wine)', marginBottom: '0.35rem' }}>
                Included Model Features & Covariates:
              </div>
              <div style={{ marginBottom: '0.2rem' }}>• <strong style={{ color: 'var(--primary-text)' }}>Entity Identifiers:</strong> Product SKU, Store Location, Department Category</div>
              <div style={{ marginBottom: '0.2rem' }}>• <strong style={{ color: 'var(--primary-text)' }}>Known Calendar & Business Signals:</strong> Day of Week, Month, Weekend Indicator, Product Price, Promotional Flag</div>
              <div>• <strong style={{ color: 'var(--primary-text)' }}>Target Variable:</strong> Unit Demand Sales</div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || Boolean(activeJobId)}
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}
            >
              {activeJobId ? (
                <>
                  <RefreshCw size={16} className="spinner" />
                  <span>Training in Progress...</span>
                </>
              ) : (
                <>
                  <Play size={16} style={{ color: 'var(--gold-accent)' }} />
                  <span>Start TFT Model Training</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Loss History / Training Loss Curve */}
        <ChartCard
          title="Training & Validation Loss Curve"
          subtitle={lossHistory.length > 0 ? "Actual epoch loss metrics monitored via PyTorch Lightning" : "Real-time loss metrics stream here during model training"}
        >
          {lossHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={lossHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E9" />
                <XAxis dataKey="epoch" stroke="var(--secondary-text)" label={{ value: 'Epoch', position: 'insideBottomRight', offset: -5 }} />
                <YAxis stroke="var(--secondary-text)" label={{ value: 'Loss', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="train_loss" stroke="var(--primary-wine)" strokeWidth={2.5} name="Train Loss" />
                <Line type="monotone" dataKey="val_loss" stroke="var(--gold-accent)" strokeWidth={2} strokeDasharray="5 5" name="Val Loss" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', padding: '2rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--pale-wine-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  border: '1px solid var(--border-wine)',
                }}
              >
                <Cpu size={26} style={{ color: 'var(--primary-wine)' }} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark-wine)', marginBottom: '0.4rem' }}>
                Awaiting Training Session
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--secondary-text)', maxWidth: '380px', lineHeight: 1.5, margin: 0 }}>
                Configure your training hyperparameters on the left and click <strong>Start TFT Model Training</strong>. Epoch loss metrics and validation progress will visualize here in real time.
              </p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Trained Models History */}
      <div className="wine-card">
        <div className="wine-card-header">
          <h3 className="wine-card-title">
            <Layers size={18} style={{ color: 'var(--primary-wine)' }} />
            <span>Trained Model Repository</span>
          </h3>
        </div>

        {models.length === 0 ? (
          <p style={{ color: 'var(--secondary-text)', fontSize: '0.88rem', padding: '1rem 0' }}>
            No models have been trained yet. Click "Start TFT Model Training" above to train your first deep learning checkpoint.
          </p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model Name</th>
                  <th>Horizon</th>
                  <th>Lookback</th>
                  <th>Epochs</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600, color: 'var(--dark-wine)' }}>{m.name}</td>
                    <td>{m.horizon} Days</td>
                    <td>{m.lookback} Days</td>
                    <td>{m.epochs}</td>
                    <td><StatusBadge status={m.status} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{m.progress}%</span>
                      </div>
                    </td>
                    <td>
                      {m.status === 'completed' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                            onClick={() => navigate('/forecasting')}
                          >
                            <TrendingUp size={12} style={{ color: 'var(--gold-accent)' }} />
                            <span>Forecast</span>
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                            onClick={() => navigate('/evaluation')}
                          >
                            <Award size={12} />
                            <span>Evaluate</span>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--secondary-text)' }}>
                          {m.status === 'training' ? 'Training...' : m.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
