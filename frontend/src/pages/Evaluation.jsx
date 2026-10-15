import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  TrendingUp,
  Layers,
  CheckCircle2,
  AlertTriangle,
  BarChart2,
  Activity,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import ChartCard from '../components/common/ChartCard';
import KpiCard from '../components/common/KpiCard';
import DataTable from '../components/tables/DataTable';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { apiService } from '../services/api';

export default function Evaluation() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const list = await apiService.getModels();
      const completed = list.filter((m) => m.status === 'completed');
      setModels(completed);

      if (completed.length > 0) {
        setSelectedModelId(completed[0].id);
        fetchMetrics(completed[0].id);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async (id) => {
    try {
      const data = await apiService.getModelMetrics(id);
      setMetricsData(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  const handleModelChange = (id) => {
    setSelectedModelId(id);
    fetchMetrics(id);
  };

  if (loading) {
    return <LoadingState message="Loading model evaluation metrics..." />;
  }

  if (models.length === 0) {
    return (
      <div>
        <PageHeader title="Model Evaluation & Residual Analysis" subtitle="Audit genuine out-of-sample test accuracy and baseline performance" />
        <EmptyState
          title="No Trained Models to Evaluate"
          description="Complete training a Temporal Fusion Transformer model to view chronological test set metrics, baseline comparisons, and residual distributions."
          actionLabel="Train TFT Model"
          onAction={() => navigate('/training')}
        />
      </div>
    );
  }

  const comparison = metricsData?.comparison || {};
  const tftSuperior = comparison.tft_beats_baseline;
  const samplePreds = metricsData?.sample_predictions || [];
  const residualBins = metricsData?.residual_bins || [];
  const productMetrics = metricsData?.product_metrics || [];

  const productColumns = [
    { key: 'product_id', header: 'PRODUCT SKU', sortable: true },
    { key: 'records', header: 'TEST SAMPLES', sortable: true },
    {
      key: 'mae',
      header: 'TFT MAE',
      sortable: true,
      render: (val) => <strong style={{ color: 'var(--primary-wine)' }}>{val}</strong>,
    },
    { key: 'rmse', header: 'TFT RMSE', sortable: true },
    {
      key: 'wape',
      header: 'TFT WAPE (%)',
      sortable: true,
      render: (val) => (
        <span className="badge badge-success" style={{ fontWeight: 700 }}>
          {val}%
        </span>
      ),
    },
    { key: 'baseline_mae', header: 'SEASONAL NAIVE MAE', sortable: true },
    {
      key: 'baseline_wape',
      header: 'NAIVE WAPE (%)',
      sortable: true,
      render: (val) => <span style={{ color: 'var(--secondary-text)' }}>{val}%</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Model Evaluation & Residual Analysis"
        subtitle="Rigorous chronological test evaluation comparing Temporal Fusion Transformer vs. Seasonal Naive baseline"
        actions={
          <button className="btn-primary" onClick={() => navigate('/forecasting')}>
            <TrendingUp size={16} style={{ color: 'var(--gold-accent)' }} />
            <span>Generate Forecasts</span>
          </button>
        }
      />

      {/* Model Selector Bar */}
      <div className="wine-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label className="input-label">Select Model for Evaluation Audit</label>
            <select
              className="select-field"
              value={selectedModelId}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.horizon}d horizon • {m.epochs} epochs)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {metricsData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Baseline Comparison Alert */}
          <div
            className="wine-card"
            style={{
              backgroundColor: tftSuperior ? '#FAFDFB' : '#FFFDF9',
              borderLeft: `5px solid ${tftSuperior ? 'var(--success)' : 'var(--warning)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: tftSuperior ? 'var(--success-bg)' : 'var(--warning-bg)',
                  color: tftSuperior ? 'var(--success)' : 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {tftSuperior ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              </div>

              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--dark-wine)' }}>
                  {tftSuperior
                    ? `Temporal Fusion Transformer Outperformed Seasonal Naive Baseline by ${comparison.wape_improvement_pct}% WAPE`
                    : 'Seasonal Naive Baseline Performed Comparably on This Period'}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--secondary-text)', marginTop: '0.3rem', lineHeight: 1.5 }}>
                  Evaluated strictly on the held-out chronological test period ({comparison.eval_samples || 0} observations). 
                  TFT WAPE is <strong>{metricsData.wape}%</strong> vs. Seasonal Naive baseline WAPE of <strong>{metricsData.baseline_wape}%</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Metrics KPI Cards */}
          <div className="kpi-grid">
            <KpiCard
              title="TFT WAPE"
              value={`${metricsData.wape ?? 0}%`}
              subtext="Weighted Absolute Percentage Error"
              icon={Award}
              badge={{ text: 'TFT Model', type: 'wine' }}
            />
            <KpiCard
              title="Seasonal Naive WAPE"
              value={`${metricsData.baseline_wape ?? 0}%`}
              subtext="Lag-7 retail benchmark"
              icon={Activity}
              badge={{ text: 'Baseline', type: 'gold' }}
            />
            <KpiCard
              title="Mean Absolute Error (MAE)"
              value={`${metricsData.mae ?? 0} units`}
              subtext={`Baseline MAE: ${metricsData.baseline_mae ?? 0}`}
              icon={BarChart2}
              badge={{ text: 'Avg Unit Error', type: 'wine' }}
            />
            <KpiCard
              title="Root Mean Squared Error"
              value={`${metricsData.rmse ?? 0} units`}
              subtext={`Baseline RMSE: ${metricsData.baseline_rmse ?? 0}`}
              icon={TrendingUp}
              badge={{ text: 'Outlier Sensitive', type: 'wine' }}
            />
          </div>

          {/* Actual vs Predicted on Test Set */}
          <ChartCard
            title="Out-of-Sample Test: Actual vs. Predicted Demand"
            subtitle="Comparing held-out true sales against TFT predictions and Seasonal Naive benchmark"
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={samplePreds} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E9" />
                <XAxis dataKey="date" stroke="var(--secondary-text)" fontSize={12} />
                <YAxis stroke="var(--secondary-text)" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#292524"
                  strokeWidth={2.5}
                  name="Actual Ground Truth"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="var(--primary-wine)"
                  strokeWidth={2.5}
                  name="TFT Prediction"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="var(--gold-accent)"
                  strokeDasharray="4 4"
                  strokeWidth={1.8}
                  name="Seasonal Naive Baseline"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Residual Distribution Histogram */}
          {residualBins.length > 0 && (
            <ChartCard
              title="Residual Error Distribution (e = y - ŷ)"
              subtitle="Normal dispersion of prediction residuals centered around zero indicates unbiased forecasting"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={residualBins} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E9" />
                  <XAxis dataKey="range" stroke="var(--secondary-text)" fontSize={11} />
                  <YAxis stroke="var(--secondary-text)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--secondary-wine)" radius={[4, 4, 0, 0]} name="Residual Count" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Product-Level Error Breakdown */}
          {productMetrics.length > 0 && (
            <div className="wine-card">
              <div className="wine-card-header">
                <h3 className="wine-card-title">Product-Level Error Breakdown</h3>
                <p className="wine-card-subtitle">Granular accuracy across individual product SKUs</p>
              </div>

              <DataTable
                columns={productColumns}
                data={productMetrics}
                searchable={true}
                searchPlaceholder="Search product SKU..."
                initialPageSize={10}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
