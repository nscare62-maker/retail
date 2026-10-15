import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Play,
  Calendar,
  Layers,
  Download,
  Filter,
  Package,
  ArrowRight,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import ChartCard from '../components/common/ChartCard';
import DataTable from '../components/tables/DataTable';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { apiService } from '../services/api';

export default function Forecasting() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [horizon, setHorizon] = useState(14);
  const [promoRate, setPromoRate] = useState(0.15);
  const [discountRate, setDiscountRate] = useState(0.10);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('ALL');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setPageLoading(true);
      const list = await apiService.getModels();
      const completed = list.filter((m) => m.status === 'completed');
      setModels(completed);

      if (completed.length > 0) {
        setSelectedModelId(completed[0].id);
        setHorizon(completed[0].horizon || 14);
      }

      // Check for any previous forecast
      const fList = await apiService.getForecasts();
      if (fList.length > 0) {
        const latestF = await apiService.getForecast(fList[0].id);
        setForecastResult(latestF);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setPageLoading(false);
    }
  };

  const handleGenerateForecast = async (e) => {
    e.preventDefault();
    if (!selectedModelId) return;

    try {
      setForecastLoading(true);
      const res = await apiService.generateForecast({
        model_id: selectedModelId,
        horizon: parseInt(horizon, 10),
        promo_rate: parseFloat(promoRate),
        discount_rate: parseFloat(discountRate),
      });
      setForecastResult(res);
      setProductFilter('ALL');
    } catch (err) {
      alert(`Forecast generation failed: ${err.message}`);
    } finally {
      setForecastLoading(false);
    }
  };

  if (pageLoading) {
    return <LoadingState message="Loading demand forecasting engine..." />;
  }

  if (models.length === 0) {
    return (
      <div>
        <PageHeader title="Demand Forecasting Studio" subtitle="Generate multi-horizon quantile predictions with trained TFT models" />
        <EmptyState
          title="Trained Model Required"
          description="You need at least one completed Temporal Fusion Transformer model before generating forecasts."
          actionLabel="Train TFT Model"
          onAction={() => navigate('/training')}
        />
      </div>
    );
  }

  // Filter items for chart and table
  const allItems = forecastResult?.items || [];
  const uniqueProducts = Array.from(new Set(allItems.map((i) => i.product_id)));

  const filteredItems = productFilter === 'ALL'
    ? allItems
    : allItems.filter((i) => i.product_id === productFilter);

  // Group by date for chart
  const chartDataMap = {};
  filteredItems.forEach((item) => {
    if (!chartDataMap[item.date]) {
      chartDataMap[item.date] = {
        date: item.date,
        predicted_demand: 0,
        lower_bound: 0,
        upper_bound: 0,
      };
    }
    chartDataMap[item.date].predicted_demand += item.predicted_demand;
    chartDataMap[item.date].lower_bound += item.lower_bound;
    chartDataMap[item.date].upper_bound += item.upper_bound;
  });
  const chartData = Object.values(chartDataMap).sort((a, b) => a.date.localeCompare(b.date));

  const tableColumns = [
    { key: 'date', header: 'FORECAST DATE', sortable: true },
    { key: 'product_id', header: 'PRODUCT SKU', sortable: true },
    { key: 'store_id', header: 'STORE ID', sortable: true },
    { key: 'category', header: 'CATEGORY', sortable: true },
    {
      key: 'lower_bound',
      header: 'LOWER BOUND (P10)',
      sortable: true,
      render: (val) => <span style={{ color: 'var(--secondary-text)' }}>{val}</span>,
    },
    {
      key: 'predicted_demand',
      header: 'PREDICTED DEMAND (P50)',
      sortable: true,
      render: (val) => <strong style={{ color: 'var(--dark-wine)' }}>{val} units</strong>,
    },
    {
      key: 'upper_bound',
      header: 'UPPER BOUND (P90)',
      sortable: true,
      render: (val) => <span style={{ color: 'var(--gold-accent)', fontWeight: 600 }}>{val}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Demand Forecasting Studio"
        subtitle="Generate actual TFT probabilistic multi-step demand predictions with quantile uncertainty intervals"
        actions={
          forecastResult && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href={apiService.getForecastExportUrl(forecastResult.id)}
                download
                className="btn-secondary"
              >
                <Download size={14} />
                <span>Export Predictions (CSV)</span>
              </a>
              <button
                className="btn-primary"
                onClick={() => navigate('/inventory')}
              >
                <Package size={14} style={{ color: 'var(--gold-accent)' }} />
                <span>Optimize Inventory</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )
        }
      />

      {/* Forecast Controls Form */}
      <div className="wine-card" style={{ marginBottom: '1.75rem' }}>
        <div className="wine-card-header">
          <h3 className="wine-card-title">
            <TrendingUp size={18} style={{ color: 'var(--primary-wine)' }} />
            <span>Forecast Scenario Parameters</span>
          </h3>
        </div>

        <form onSubmit={handleGenerateForecast}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="input-label">Trained TFT Model</label>
              <select
                className="select-field"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Trained: {m.epochs} epochs, {m.horizon}d horizon)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Forecast Horizon</label>
              <select
                className="select-field"
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
              >
                <option value={7}>7 Days (1 Week Ahead)</option>
                <option value={14}>14 Days (2 Weeks Ahead)</option>
                <option value={30}>30 Days (1 Month Ahead)</option>
              </select>
            </div>

            <div>
              <label className="input-label">
                Simulated Promotion Lift ({Math.round(promoRate * 100)}%)
              </label>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.05"
                value={promoRate}
                onChange={(e) => setPromoRate(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--primary-wine)' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>
                Probability of promotional campaign
              </p>
            </div>

            <div>
              <label className="input-label">
                Average Promo Discount ({Math.round(discountRate * 100)}%)
              </label>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.05"
                value={discountRate}
                onChange={(e) => setDiscountRate(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--gold-accent)' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>
                Future price elasticity reduction
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={forecastLoading}
              style={{ padding: '0.75rem 1.75rem' }}
            >
              {forecastLoading ? (
                <>
                  <RefreshCw size={16} className="spinner" />
                  <span>Loading Checkpoint & Predicting...</span>
                </>
              ) : (
                <>
                  <Play size={16} style={{ color: 'var(--gold-accent)' }} />
                  <span>Generate Demand Forecast</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Forecast Visualizations & Predictions Table */}
      {forecastResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Summary Banner */}
          <div
            className="wine-card"
            style={{
              background: 'linear-gradient(135deg, #FAF5F5 0%, #FFFFFF 100%)',
              borderLeft: '5px solid var(--primary-wine)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Forecast Start Date</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--dark-wine)', marginTop: '2px' }}>
                  {forecastResult.start_date}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Total Projected Demand</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary-wine)', marginTop: '2px' }}>
                  {forecastResult.summary?.total_predicted_units?.toLocaleString()} Units
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Forecast Horizon</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gold-accent)', marginTop: '2px' }}>
                  {forecastResult.horizon} Days
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary-text)', textTransform: 'uppercase' }}>Nonnegative Unit Post-Processing</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--success)', marginTop: '2px' }}>
                  Verified Active
                </div>
              </div>
            </div>
          </div>

          {/* Quantile Uncertainty Chart */}
          <ChartCard
            title={`Projected Multi-Step Demand (${forecastResult.horizon} Days Horizon)`}
            subtitle="Probabilistic TFT Quantile output: P50 (expected demand), P10 (conservative estimate), P90 (high demand bound)"
            headerAction={
              uniqueProducts.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Filter size={14} style={{ color: 'var(--secondary-text)' }} />
                  <select
                    className="select-field"
                    style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                  >
                    <option value="ALL">All Products Aggregated</option>
                    {uniqueProducts.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )
            }
          >
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-wine)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary-wine)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="uncertaintyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--gold-accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--gold-accent)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E9" />
                <XAxis dataKey="date" stroke="var(--secondary-text)" fontSize={12} />
                <YAxis stroke="var(--secondary-text)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: 'var(--border-wine)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upper_bound"
                  stroke="var(--gold-accent)"
                  fill="url(#uncertaintyFill)"
                  name="Upper Bound (P90)"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="predicted_demand"
                  stroke="var(--primary-wine)"
                  strokeWidth={2.5}
                  fill="url(#forecastFill)"
                  name="Predicted Demand (P50)"
                />
                <Line
                  type="monotone"
                  dataKey="lower_bound"
                  stroke="#8B3A46"
                  strokeDasharray="4 4"
                  dot={false}
                  name="Lower Bound (P10)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Granular Prediction Records Table */}
          <div className="wine-card">
            <div className="wine-card-header">
              <div>
                <h3 className="wine-card-title">Granular Prediction Log</h3>
                <p className="wine-card-subtitle">
                  Daily unit forecasts per SKU and store location
                </p>
              </div>
            </div>

            <DataTable
              columns={tableColumns}
              data={filteredItems}
              searchable={true}
              searchPlaceholder="Filter SKU, date, or store..."
              initialPageSize={10}
            />
          </div>
        </div>
      )}
    </div>
  );
}
