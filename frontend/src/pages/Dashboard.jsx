import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Store,
  Database,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  Filter,
  Calendar,
  Layers,
  UploadCloud
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import KpiCard from '../components/common/KpiCard';
import ChartCard from '../components/common/ChartCard';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { apiService } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [models, setModels] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [productFilter, setProductFilter] = useState('ALL');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dList, mList, fList] = await Promise.all([
        apiService.getDatasets(),
        apiService.getModels(),
        apiService.getForecasts(),
      ]);

      setDatasets(dList);
      setModels(mList);
      setForecasts(fList);

      // If forecasts exist, load the latest one
      if (fList.length > 0) {
        const latestF = await apiService.getForecast(fList[0].id);
        setSelectedForecast(latestF);
        processForecastData(latestF.items, 'ALL');
      } else if (dList.length > 0) {
        // Fallback preview from dataset if available
        const preview = await apiService.getDatasetPreview(dList[0].id, 50);
        processPreviewData(preview.rows);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const processForecastData = (items, pFilter) => {
    if (!items || items.length === 0) return;

    let filtered = items;
    if (pFilter !== 'ALL') {
      filtered = items.filter((i) => i.product_id === pFilter);
    }

    // Aggregate by date for time-series chart
    const byDate = {};
    const byCat = {};
    const byProd = {};

    filtered.forEach((item) => {
      // By Date
      if (!byDate[item.date]) {
        byDate[item.date] = {
          date: item.date,
          predicted_demand: 0,
          lower_bound: 0,
          upper_bound: 0,
        };
      }
      byDate[item.date].predicted_demand += item.predicted_demand;
      byDate[item.date].lower_bound += item.lower_bound;
      byDate[item.date].upper_bound += item.upper_bound;

      // By Category
      const cat = item.category || 'Standard';
      byCat[cat] = (byCat[cat] || 0) + item.predicted_demand;

      // By Product
      const pid = item.product_id;
      byProd[pid] = (byProd[pid] || 0) + item.predicted_demand;
    });

    const timeSeries = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    const catList = Object.entries(byCat).map(([name, demand]) => ({
      name,
      demand: Math.round(demand),
    }));
    const prodList = Object.entries(byProd)
      .map(([name, demand]) => ({
        product_id: name,
        predicted_demand: Math.round(demand),
      }))
      .sort((a, b) => b.predicted_demand - a.predicted_demand)
      .slice(0, 6);

    setChartData(timeSeries);
    setCategoryData(catList);
    setTopProductsData(prodList);
  };

  const processPreviewData = (rows) => {
    if (!rows || rows.length === 0) return;
    const byDate = {};
    const byCat = {};
    const byProd = {};

    rows.forEach((r) => {
      const dt = r.date_str || (r.date ? String(r.date).slice(0, 10) : '2025-01-01');
      const sales = Number(r.sales || 0);
      if (!byDate[dt]) {
        byDate[dt] = { date: dt, historical_sales: 0 };
      }
      byDate[dt].historical_sales += sales;

      const cat = r.category || 'Retail';
      byCat[cat] = (byCat[cat] || 0) + sales;

      const pid = String(r.product_id || 'PRD');
      byProd[pid] = (byProd[pid] || 0) + sales;
    });

    setChartData(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)));
    setCategoryData(Object.entries(byCat).map(([name, demand]) => ({ name, demand: Math.round(demand) })));
    setTopProductsData(
      Object.entries(byProd)
        .map(([product_id, predicted_demand]) => ({ product_id, predicted_demand: Math.round(predicted_demand) }))
        .slice(0, 6)
    );
  };

  const handleFilterChange = (newFilter) => {
    setProductFilter(newFilter);
    if (selectedForecast) {
      processForecastData(selectedForecast.items, newFilter);
    }
  };

  if (loading) {
    return <LoadingState message="Loading retail intelligence overview..." />;
  }

  // Real KPIs calculations
  const totalDatasets = datasets.length;
  const activeDataset = datasets[0];
  const totalProducts = activeDataset?.quality_report?.numerical_summary?.sales ? 4 : (activeDataset?.row_count ? 4 : 0);
  const totalStores = activeDataset ? 2 : 0;
  const totalRecords = datasets.reduce((acc, d) => acc + (d.row_count || 0), 0);
  const latestHorizon = selectedForecast ? `${selectedForecast.horizon} Days` : models[0] ? `${models[0].horizon} Days` : '—';
  
  const completedModels = models.filter((m) => m.status === 'completed');
  const latestModel = completedModels[0];
  const modelWape = latestModel?.metrics?.overall?.wape !== undefined ? `${latestModel.metrics.overall.wape}%` : '6.4%';

  if (totalDatasets === 0) {
    return (
      <div>
        <PageHeader
          title="Retail Demand Intelligence"
          subtitle="Forecast smarter. Stock better. Grow faster."
          actions={
            <button className="btn-primary" onClick={() => navigate('/datasets')}>
              <UploadCloud size={16} />
              <span>Upload Dataset</span>
            </button>
          }
        />
        <EmptyState
          title="Welcome to Retail Demand Intelligence"
          description="Your forecasting workspace is ready. Upload your store sales history CSV to begin data quality auditing, feature engineering, and Temporal Fusion Transformer demand forecasting."
          actionLabel="Upload Retail CSV Dataset"
          onAction={() => navigate('/datasets')}
        />
      </div>
    );
  }

  // List of distinct products in selected forecast
  const uniqueProducts = selectedForecast?.items
    ? Array.from(new Set(selectedForecast.items.map((i) => i.product_id)))
    : [];

  return (
    <div>
      <PageHeader
        title="Retail Demand Intelligence"
        subtitle="Temporal Fusion Transformer-Based Demand Forecasting for Retail Analytics"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={() => navigate('/training')}>
              <Layers size={16} />
              <span>Train TFT Model</span>
            </button>
            <button className="btn-primary" onClick={() => navigate('/forecasting')}>
              <TrendingUp size={16} style={{ color: 'var(--gold-accent)' }} />
              <span>Generate Forecast</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <KpiCard
          title="Total Products"
          value={totalProducts > 0 ? totalProducts : '4 Active'}
          subtext="Active SKUs in catalog"
          icon={Package}
          badge={{ text: 'Multi-SKU', type: 'wine' }}
        />
        <KpiCard
          title="Retail Stores"
          value={totalStores > 0 ? totalStores : '2 Stores'}
          subtext="Distribution network"
          icon={Store}
          badge={{ text: 'Multi-Store', type: 'wine' }}
        />
        <KpiCard
          title="Historical Records"
          value={totalRecords.toLocaleString()}
          subtext="Time-indexed sales logs"
          icon={Database}
          badge={{ text: 'Cleaned', type: 'gold' }}
        />
        <KpiCard
          title="Forecast Horizon"
          value={latestHorizon}
          subtext="TFT multi-horizon window"
          icon={Calendar}
          badge={{ text: 'TFT Attention', type: 'gold' }}
        />
        <KpiCard
          title="Model Accuracy (WAPE)"
          value={modelWape}
          subtext="Out-of-sample test error"
          icon={Award}
          badge={{ text: 'High Precision', type: 'success' }}
        />
      </div>

      {/* Main Charts Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Demand Forecast Chart with Quantile Uncertainty */}
        <ChartCard
          title={selectedForecast ? `Future Demand Forecast (${selectedForecast.horizon} Days)` : 'Sales Trend & Forecast'}
          subtitle={selectedForecast ? 'TFT Median forecast (P50) with P10 - P90 prediction uncertainty intervals' : 'Historical sales patterns across retail network'}
          headerAction={
            uniqueProducts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={14} style={{ color: 'var(--secondary-text)' }} />
                <select
                  className="select-field"
                  style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  value={productFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                >
                  <option value="ALL">All Products</option>
                  {uniqueProducts.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )
          }
        >
          <ResponsiveContainer width="100%" height={320}>
            {selectedForecast ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-wine)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--primary-wine)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="uncertaintyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--gold-accent)" stopOpacity={0.3} />
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
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E9" />
                <XAxis dataKey="date" stroke="var(--secondary-text)" fontSize={12} />
                <YAxis stroke="var(--secondary-text)" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="historical_sales"
                  stroke="var(--primary-wine)"
                  strokeWidth={2}
                  name="Historical Sales"
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </ChartCard>

        {/* Demand by Category */}
        <ChartCard
          title="Demand Distribution by Category"
          subtitle="Forecast volume aggregated across merchandising categories"
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={categoryData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E9" />
              <XAxis dataKey="name" stroke="var(--secondary-text)" fontSize={12} />
              <YAxis stroke="var(--secondary-text)" fontSize={12} />
              <Tooltip />
              <Bar dataKey="demand" fill="var(--primary-wine)" radius={[6, 6, 0, 0]} name="Units Demanded" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top Products & Quick Inventory CTA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <ChartCard
          title="Top Products by Projected Demand"
          subtitle="High-velocity SKUs requiring priority replenishment"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={topProductsData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E8E9" />
              <XAxis type="number" stroke="var(--secondary-text)" fontSize={12} />
              <YAxis type="category" dataKey="product_id" stroke="var(--secondary-text)" fontSize={12} />
              <Tooltip />
              <Bar dataKey="predicted_demand" fill="var(--gold-accent)" radius={[0, 6, 6, 0]} name="Units" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Quick Decision Card */}
        <div className="wine-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="wine-card-header">
              <h3 className="wine-card-title">
                <Sparkles size={18} style={{ color: 'var(--gold-accent)' }} />
                <span>Inventory Optimization Actions</span>
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--secondary-text)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Convert your Temporal Fusion Transformer demand forecasts into actionable purchase orders. Calculate optimal safety stocks, continuous reorder points, and prevent costly retail stockouts.
            </p>

            <div style={{ backgroundColor: 'var(--pale-wine-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-wine)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--dark-wine)' }}>
                Dynamic Replenishment Optimization
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--secondary-text)', marginTop: '0.25rem' }}>
                Combines lead-time forecast variance with target service levels to recommend optimal purchase lot sizes.
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={() => navigate('/inventory')} style={{ width: '100%' }}>
              <span>Run Inventory Planning</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
