import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  TrendingUp,
  Award,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCode,
  HardDrive,
  Cpu
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/tables/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import { apiService } from '../services/api';

export default function Models() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const list = await apiService.getModels();
      setModels(list);
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!modelToDelete) return;
    try {
      await apiService.deleteModel(modelToDelete.id);
      setDeleteConfirmOpen(false);
      setModelToDelete(null);
      await fetchModels();
    } catch (err) {
      alert(`Failed to delete model: ${err.message}`);
    }
  };

  if (loading) {
    return <LoadingState message="Loading trained TFT checkpoints..." />;
  }

  if (models.length === 0) {
    return (
      <div>
        <PageHeader title="Trained Model Checkpoints" subtitle="Manage persistent PyTorch Forecasting model weights and training configurations" />
        <EmptyState
          title="No Trained Models Yet"
          description="You haven't trained any Temporal Fusion Transformer models yet. Set up hyperparameters and launch training to save your first checkpoint."
          actionLabel="Train New Model"
          onAction={() => navigate('/training')}
        />
      </div>
    );
  }

  const columns = [
    {
      key: 'name',
      header: 'MODEL NAME',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--dark-wine)' }}>{val}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--secondary-text)' }}>ID: {row.id.slice(0, 8)}</div>
        </div>
      ),
    },
    {
      key: 'horizon',
      header: 'HORIZON',
      sortable: true,
      render: (val) => `${val} Days`,
    },
    {
      key: 'lookback',
      header: 'LOOKBACK',
      sortable: true,
      render: (val) => `${val} Days`,
    },
    {
      key: 'epochs',
      header: 'EPOCHS',
      sortable: true,
      render: (val, row) => `${row.current_epoch || 0} / ${val}`,
    },
    {
      key: 'status',
      header: 'STATUS',
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'progress',
      header: 'PROGRESS',
      sortable: true,
      render: (val) => `${val}%`,
    },
    {
      key: 'checkpoint_path',
      header: 'CHECKPOINT FILE',
      sortable: false,
      render: (val) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--secondary-text)', fontWeight: 500 }}>
          {val ? val.split(/[\\/]/).pop() : 'None'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      sortable: false,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {row.status === 'completed' && (
            <>
              <button
                className="btn-primary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                onClick={() => navigate('/forecasting')}
                title="Use model for demand inference"
              >
                <TrendingUp size={12} style={{ color: 'var(--gold-accent)' }} />
                <span>Forecast</span>
              </button>
              <button
                className="btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                onClick={() => navigate('/evaluation')}
                title="View model accuracy metrics"
              >
                <Award size={12} />
                <span>Metrics</span>
              </button>
            </>
          )}
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--secondary-text)',
              cursor: 'pointer',
              padding: '4px',
            }}
            onClick={() => {
              setModelToDelete(row);
              setDeleteConfirmOpen(true);
            }}
            title="Delete model and weights"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Trained Model Checkpoints"
        subtitle="Manage saved PyTorch Lightning checkpoints, model architectures, and inference readiness"
        actions={
          <button className="btn-primary" onClick={() => navigate('/training')}>
            <Cpu size={16} style={{ color: 'var(--gold-accent)' }} />
            <span>Train Another Model</span>
          </button>
        }
      />

      <div className="wine-card">
        <DataTable
          columns={columns}
          data={models}
          searchable={true}
          searchPlaceholder="Search models by name or status..."
          initialPageSize={10}
        />
      </div>

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        title="Delete Model Checkpoint"
        message={`Are you sure you want to permanently delete model "${modelToDelete?.name}"? Saved weights and evaluation records will be removed.`}
        confirmLabel="Delete Model"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setModelToDelete(null);
        }}
      />
    </div>
  );
}
