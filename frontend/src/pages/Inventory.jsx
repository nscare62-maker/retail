import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Download,
  Sliders,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Info
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import KpiCard from '../components/common/KpiCard';
import DataTable from '../components/tables/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { apiService } from '../services/api';

export default function Inventory() {
  const navigate = useNavigate();
  const [forecasts, setForecasts] = useState([]);
  const [selectedForecastId, setSelectedForecastId] = useState('');
  const [leadTime, setLeadTime] = useState(7);
  const [serviceLevel, setServiceLevel] = useState(0.95);
  const [calculating, setCalculating] = useState(false);
  const [inventoryResult, setInventoryResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForecasts();
  }, []);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      const list = await apiService.getForecasts();
      setForecasts(list);
      if (list.length > 0) {
        setSelectedForecastId(list[0].id);
        runInventoryCalc(list[0].id, 7, 0.95);
      }
    } catch (err) {
      console.error('Failed to load forecasts:', err);
    } finally {
      setLoading(false);
    }
  };

  const runInventoryCalc = async (fId, lt, sl) => {
    if (!fId) return;
    try {
      setCalculating(true);
      const res = await apiService.generateInventory({
        forecast_id: fId,
        lead_time_days: parseInt(lt, 10),
        service_level: parseFloat(sl),
      });
      setInventoryResult(res);
    } catch (err) {
      alert(`Inventory calculation failed: ${err.message}`);
    } finally {
      setCalculating(false);
    }
  };

  const handleRecalculate = (e) => {
    e.preventDefault();
    runInventoryCalc(selectedForecastId, leadTime, serviceLevel);
  };

  if (loading) {
    return <LoadingState message="Loading inventory planning models..." />;
  }

  if (forecasts.length === 0) {
    return (
      <div>
        <PageHeader title="Inventory Planning & Recommendations" subtitle="Translate TFT demand predictions into safety stocks, reorder points, and replenishment quantities" />
        <EmptyState
          title="Demand Forecast Required"
          description="Generate a demand forecast first to compute continuous safety stock and replenishment recommendations."
          actionLabel="Generate Forecast"
          onAction={() => navigate('/forecasting')}
        />
      </div>
    );
  }

  const items = inventoryResult?.items || [];
  const summary = inventoryResult?.summary || {};

  const tableColumns = [
    { key: 'product_id', header: 'PRODUCT SKU', sortable: true },
    { key: 'store_id', header: 'STORE ID', sortable: true },
    { key: 'category', header: 'CATEGORY', sortable: true },
    {
      key: 'current_stock',
      header: 'ON-HAND STOCK',
      sortable: true,
      render: (val) => <strong>{val}</strong>,
    },
    {
      key: 'expected_lead_time_demand',
      header: `DEMAND IN LEAD TIME (${leadTime}d)`,
      sortable: true,
      render: (val) => `${val} units`,
    },
    {
      key: 'safety_stock',
      header: 'SAFETY STOCK (SS)',
      sortable: true,
      render: (val) => <span style={{ color: 'var(--gold-accent)', fontWeight: 600 }}>{val}</span>,
    },
    {
      key: 'reorder_point',
      header: 'REORDER POINT (ROP)',
      sortable: true,
      render: (val) => <strong style={{ color: 'var(--primary-wine)' }}>{val}</strong>,
    },
    {
      key: 'stock_coverage_days',
      header: 'STOCK COVERAGE',
      sortable: true,
      render: (val) => `${val} days`,
    },
    {
      key: 'suggested_order_qty',
      header: 'SUGGESTED REORDER',
      sortable: true,
      render: (val, row) =>
        val > 0 ? (
          <strong style={{ color: 'var(--primary-wine)', backgroundColor: 'var(--light-wine)', padding: '2px 8px', borderRadius: '4px' }}>
            + {val} units
          </strong>
        ) : (
          <span style={{ color: 'var(--secondary-text)' }}>0</span>
        ),
    },
    {
      key: 'status_flag',
      header: 'INVENTORY STATUS',
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory Planning & Recommendations"
        subtitle="Dynamic safety stock sizing, reorder point calculation, and replenishment order suggestions based on demand forecasts"
        actions={
          inventoryResult && (
            <a
              href={apiService.getInventoryExportUrl(inventoryResult.id)}
              download
              className="btn-primary"
            >
              <Download size={14} style={{ color: 'var(--gold-accent)' }} />
              <span>Export Purchase Order (CSV)</span>
            </a>
          )
        }
      />

      {/* Control Sliders Card */}
      <div className="wine-card" style={{ marginBottom: '1.75rem' }}>
        <div className="wine-card-header">
          <h3 className="wine-card-title">
            <Sliders size={18} style={{ color: 'var(--primary-wine)' }} />
            <span>Replenishment Parameters</span>
          </h3>
        </div>

        <form onSubmit={handleRecalculate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="input-label">Source Demand Forecast</label>
              <select
                className="select-field"
                value={selectedForecastId}
                onChange={(e) => setSelectedForecastId(e.target.value)}
              >
                {forecasts.map((f) => (
                  <option key={f.id} value={f.id}>
                    Forecast: {f.start_date} ({f.horizon} Days • {f.summary?.total_predicted_units || 0} Units)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">
                Supplier Lead Time ({leadTime} Days)
              </label>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--primary-wine)' }}
              />
              <p style={{ fontSize: '0.78rem', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>
                Days required from purchase order issuance to warehouse receipt
              </p>
            </div>

            <div>
              <label className="input-label">
                Target Service Level ({(serviceLevel * 100).toFixed(1)}%)
              </label>
              <input
                type="range"
                min="0.90"
                max="0.999"
                step="0.005"
                value={serviceLevel}
                onChange={(e) => setServiceLevel(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--gold-accent)' }}
              />
              <p style={{ fontSize: '0.78rem', color: 'var(--secondary-text)', marginTop: '0.2rem' }}>
                Z-score: {serviceLevel >= 0.99 ? '2.33 (99%)' : serviceLevel >= 0.95 ? '1.65 (95%)' : '1.28 (90%)'} probability of no stockout
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={calculating}
            >
              {calculating ? (
                <>
                  <RefreshCw size={15} className="spinner" />
                  <span>Recalculating ROP...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} style={{ color: 'var(--gold-accent)' }} />
                  <span>Apply Parameters</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {inventoryResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* KPI Summary Cards */}
          <div className="kpi-grid">
            <KpiCard
              title="SKUs Analyzed"
              value={summary.total_products_analyzed || 0}
              subtext="Product-store combinations"
              icon={Package}
              badge={{ text: 'Stock Review', type: 'wine' }}
            />
            <KpiCard
              title="Critical Stockouts"
              value={summary.critical_stockouts || 0}
              subtext="Inventory < Lead time demand"
              icon={AlertCircle}
              badge={{ text: 'Immediate PO', type: summary.critical_stockouts > 0 ? 'error' : 'success' }}
            />
            <KpiCard
              title="Reorder Needed"
              value={summary.reorder_needed_count || 0}
              subtext="Stock <= Reorder point (ROP)"
              icon={AlertTriangle}
              badge={{ text: 'Action Required', type: summary.reorder_needed_count > 0 ? 'warning' : 'success' }}
            />
            <KpiCard
              title="Total Suggested Orders"
              value={`${summary.total_suggested_order_units?.toLocaleString() || 0} Units`}
              subtext="Replenishment requirement"
              icon={TrendingUp}
              badge={{ text: 'Optimal Lot', type: 'gold' }}
            />
          </div>

          {/* Detailed Inventory Recommendations Table */}
          <div className="wine-card">
            <div className="wine-card-header">
              <div>
                <h3 className="wine-card-title">Replenishment Recommendations & Order Sizing</h3>
                <p className="wine-card-subtitle">
                  Inventory requirements dynamically sized according to forecast variance and target fill rate
                </p>
              </div>
            </div>

            <DataTable
              columns={tableColumns}
              data={items}
              searchable={true}
              searchPlaceholder="Filter product SKU, store, or status..."
              initialPageSize={10}
            />
          </div>
        </div>
      )}
    </div>
  );
}
