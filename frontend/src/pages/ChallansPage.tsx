import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { TableSkeleton } from '../components/Skeleton';
import { getChallans } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PlusIcon, ChallansIcon, EyeIcon } from '../components/Icons';
import type { Challan } from '../types';

export default function ChallansPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const canWrite = user?.role === 'Admin' || user?.role === 'Sales';

  const [challans, setChallans] = useState<Challan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getChallans({ page, limit, status: statusFilter || undefined });
      setChallans(res.data.data);
      setTotal(res.data.total);
    } catch {
      show('Failed to load sales challans', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Header title="Sales Challans" subtitle="Track order dispatches, drafts & delivery status" />
      <div className="page-content">

        {/* Action Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Sales Challans</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{total} total challan records</p>
          </div>

          {canWrite && (
            <button id="create-challan-btn" className="btn btn-primary" onClick={() => navigate('/challans/create')}>
              <PlusIcon size={16} />
              <span>Create Challan</span>
            </button>
          )}
        </div>

        {/* Search & Status Pill Filters */}
        <div className="filters-bar">
          <input
            className="input input-search"
            style={{ width: '280px' }}
            placeholder="Search by challan #, customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)' }}>
            {[
              { id: '', label: 'All Status' },
              { id: 'Draft', label: 'Draft' },
              { id: 'Confirmed', label: 'Confirmed' },
              { id: 'Cancelled', label: 'Cancelled' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: 'none',
                  background: statusFilter === f.id ? 'var(--accent-btn-bg)' : 'transparent',
                  color: statusFilter === f.id ? 'var(--accent-btn-text)' : 'var(--text-secondary)',
                  transition: 'var(--transition-fast)'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Challan Number</th>
                <th>Customer Account</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Issued By</th>
                <th>Date Issued</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={7} />
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <ChallansIcon size={32} color="var(--text-disabled)" />
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>No matching challans found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                challans
                  .filter(c => !search || c.challan_number.toLowerCase().includes(search.toLowerCase()) || (c.customer_name && c.customer_name.toLowerCase().includes(search.toLowerCase())))
                  .map(c => (
                    <tr key={c.id} className="clickable" onClick={() => navigate(`/challans/${c.id}`)}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {c.challan_number}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.customer_name || '—'}</td>
                      <td className="tabular-nums" style={{ fontWeight: 700 }}>
                        ₹{Number(c.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <StatusBadge status={c.status} label={c.status} />
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>{c.created_by || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                        {new Date(c.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>

                      {/* Standalone View / Preview SVG Action Button Only */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="table-action-icon-btn"
                          title="View / Preview Challan & Tax Invoice"
                          onClick={(e) => { e.stopPropagation(); navigate(`/challans/${c.id}`); }}
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)' }}
                        >
                          <EyeIcon size={15} color="var(--text-primary)" />
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderTop: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Showing page {page} of {totalPages} ({total} challans total)
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
