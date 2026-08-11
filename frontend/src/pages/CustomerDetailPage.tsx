import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/Skeleton';
import { getCustomer, updateCustomer, addFollowUp, deleteCustomerApi, suspendCustomerApi, unsuspendCustomerApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EditIcon, CalendarIcon, PlusIcon, TrashIcon, PauseIcon, PlayIcon, CrossIcon, ClockIcon, LightningIcon } from '../components/Icons';
import type { CustomerDetail } from '../types';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const canWrite = user?.role === 'Admin' || user?.role === 'Sales';
  const isAdmin = user?.role === 'Admin';

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerDetail>>({});
  const [saving, setSaving] = useState(false);
  const [followNote, setFollowNote] = useState('');
  const [followDate, setFollowDate] = useState('');
  const [addingFollow, setAddingFollow] = useState(false);

  // Admin Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Admin Suspend Modal State
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendOption, setSuspendOption] = useState<'7' | '15' | '30' | '60' | 'indefinite' | 'custom'>('7');
  const [customSuspendDate, setCustomSuspendDate] = useState('');
  const [suspending, setSuspending] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const res = await getCustomer(id);
      setCustomer(res.data);
      setEditForm(res.data);
    } catch {
      show('Failed to load customer details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await updateCustomer(id, editForm);
      show('Customer updated successfully!', 'success');
      setEditMode(false);
      load();
    } catch (err: any) {
      show(err.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !followNote) return;
    setAddingFollow(true);
    try {
      await addFollowUp(id, { note: followNote, follow_up_date: followDate || undefined });
      show('Follow-up entry added!', 'success');
      setFollowNote('');
      setFollowDate('');
      load();
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to add follow-up', 'error');
    } finally {
      setAddingFollow(false);
    }
  };

  // Admin Delete Customer
  const handleDeleteConfirm = async () => {
    if (!customer) return;
    setDeleting(true);
    try {
      await deleteCustomerApi(customer.id);
      show(`Customer account "${customer.name}" permanently deleted!`, 'success');
      navigate('/customers');
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to delete customer', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Admin Suspend Customer
  const handleSuspendConfirm = async () => {
    if (!customer) return;
    setSuspending(true);
    try {
      let payload: { duration_days?: number; suspended_until?: string } = {};
      if (['7', '15', '30', '60'].includes(suspendOption)) {
        payload.duration_days = Number(suspendOption);
      } else if (suspendOption === 'custom' && customSuspendDate) {
        payload.suspended_until = new Date(customSuspendDate).toISOString();
      }

      await suspendCustomerApi(customer.id, payload);
      show(`Customer "${customer.name}" suspended successfully!`, 'warning');
      setShowSuspendModal(false);
      load();
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to suspend customer', 'error');
    } finally {
      setSuspending(false);
    }
  };

  // Admin Unsuspend Customer
  const handleUnsuspend = async () => {
    if (!customer) return;
    try {
      await unsuspendCustomerApi(customer.id);
      show(`Customer "${customer.name}" account reactivated to Active!`, 'success');
      load();
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to reactivate customer', 'error');
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Customer Account" />
        <div className="page-content">
          <Skeleton height="120px" style={{ marginBottom: '20px' }} />
          <Skeleton height="300px" />
        </div>
      </>
    );
  }

  if (!customer) {
    return (
      <>
        <Header title="Customer Account" />
        <div className="page-content">
          <p style={{ color: 'var(--status-danger)' }}>Customer record not found.</p>
        </div>
      </>
    );
  }

  const getSuspendedLabel = (c: typeof customer) => {
    if (c.status !== 'Suspended') return c.status;
    if (!c.suspended_until) return 'Suspended (Indefinite)';

    const until = new Date(c.suspended_until);
    const now = new Date();
    const diffDays = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `Suspended (${diffDays} days left)`;
    return `Suspended until ${until.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <>
      <Header title="Customer Detail" subtitle={customer.name} />
      <div className="page-content">
        
        {/* Back Link */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/customers')}
          style={{ marginBottom: '20px' }}
        >
          ← Back to Customers
        </button>

        {/* Page Title, Status & Admin Action Standalone SVG Buttons (No Outer Box) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{customer.name}</h1>
              <StatusBadge status={customer.status} label={getSuspendedLabel(customer)} />
              <StatusBadge status="info" label={customer.customer_type} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {customer.business_name || 'Individual Account'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {canWrite && (
              <button className="btn btn-secondary" onClick={() => setEditMode(!editMode)}>
                <EditIcon size={15} />
                <span>{editMode ? 'Cancel Edit' : 'Edit Customer'}</span>
              </button>
            )}

            {/* Standalone SVG Buttons (No Outer Container Box) */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                
                {/* 🟠/🟢 Suspend / Unsuspend SVG Button Only */}
                {customer.status === 'Suspended' ? (
                  <button
                    type="button"
                    className="table-action-icon-btn"
                    onClick={handleUnsuspend}
                    title="Reactivate / Unsuspend Customer Account"
                    style={{ width: '38px', height: '38px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                  >
                    <PlayIcon size={16} color="var(--status-success)" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="table-action-icon-btn"
                    onClick={() => setShowSuspendModal(true)}
                    title="Suspend Customer Account (7d, 15d, 30d, 60d...)"
                    style={{ width: '38px', height: '38px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                  >
                    <PauseIcon size={16} color="var(--status-warning)" />
                  </button>
                )}

                {/* 🔴 Delete SVG Button Only */}
                <button
                  type="button"
                  className="table-action-icon-btn"
                  onClick={() => setShowDeleteModal(true)}
                  title="Permanently Delete Customer Account"
                  style={{ width: '38px', height: '38px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)' }}
                >
                  <TrashIcon size={16} color="var(--status-danger)" />
                </button>

              </div>
            )}
          </div>
        </div>

        {/* Edit Form Glass Card */}
        {editMode ? (
          <GlassCard style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Edit Customer Information</h2>
            <form onSubmit={handleUpdate}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="input" required value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input className="input" required value={editForm.mobile || ''} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input" type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input className="input" value={editForm.business_name || ''} onChange={e => setEditForm(f => ({ ...f, business_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Status</label>
                  <select className="select" value={editForm.status || 'Lead'} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))}>
                    <option value="Lead">Lead</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Follow-up Date</label>
                  <input className="input" type="date" value={editForm.follow_up_date?.slice(0, 10) || ''} onChange={e => setEditForm(f => ({ ...f, follow_up_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="textarea" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
              </div>
            </form>
          </GlassCard>
        ) : (
          /* Key Contact Info Summary Card Grid */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <GlassCard>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                Contact & Tax Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div><div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Mobile</div><div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{customer.mobile}</div></div>
                <div><div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Email</div><div style={{ fontSize: '14px', fontWeight: 500 }}>{customer.email || '—'}</div></div>
                <div><div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>GST Number</div><div style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--accent-end)' }}>{customer.gst_number || '—'}</div></div>
                <div><div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Address</div><div style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{customer.address || '—'}</div></div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                Account Summary
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div><div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Account Status</div><div><StatusBadge status={customer.status} label={getSuspendedLabel(customer)} /></div></div>
                <div><div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Next Scheduled Follow-up</div><div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--status-warning)' }}>{customer.follow_up_date ? new Date(customer.follow_up_date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '—'}</div></div>
                <div><div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Account Notes</div><div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{customer.notes || '—'}</div></div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Interactive Follow-up Timeline & Add Form Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
          
          {/* Interactive Timeline Card */}
          <GlassCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={18} color="var(--accent-start)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Follow-up Timeline ({customer.followups.length})
                </h3>
              </div>
            </div>

            {customer.followups.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', padding: '20px 0' }}>
                No follow-up entries recorded yet. Use the form to record initial interaction notes.
              </p>
            ) : (
              <div className="timeline">
                {[...customer.followups].reverse().map((f, i) => (
                  <div key={f.id} className="timeline-item">
                    <div
                      className="timeline-dot"
                      style={{
                        background: i === 0 ? 'var(--status-success)' : 'var(--accent-start)',
                        boxShadow: i === 0 ? '0 0 10px var(--status-success)' : '0 0 10px var(--accent-start)'
                      }}
                    />
                    <div className="timeline-date">
                      {new Date(f.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    <div className="timeline-note">
                      {f.note}
                    </div>
                    {f.follow_up_date && (
                      <div className="timeline-author" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <CalendarIcon size={12} color="var(--status-warning)" />
                        <span>Next follow-up set for: <strong>{new Date(f.follow_up_date).toLocaleDateString('en-IN')}</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Pinned Add Follow-up Form Card */}
          {canWrite && (
            <GlassCard style={{ alignSelf: 'start' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Record New Follow-up
              </h3>
              <form onSubmit={handleAddFollowUp}>
                <div className="form-group">
                  <label className="form-label">Interaction Note *</label>
                  <textarea
                    className="textarea"
                    required
                    value={followNote}
                    onChange={e => setFollowNote(e.target.value)}
                    placeholder="Log client call details, inquiry, or meeting outcome..."
                    style={{ minHeight: '110px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Next Scheduled Follow-up Date</label>
                  <input
                    className="input"
                    type="date"
                    value={followDate}
                    onChange={e => setFollowDate(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={addingFollow}
                >
                  <PlusIcon size={16} />
                  <span>{addingFollow ? 'Recording...' : 'Add Follow-up'}</span>
                </button>
              </form>
            </GlassCard>
          )}

        </div>

        {/* Admin Suspend Customer Options Modal with SVG Preset Icons */}
        {showSuspendModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSuspendModal(false)}>
            <div className="modal" style={{ maxWidth: '480px' }}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PauseIcon size={18} color="var(--status-warning)" />
                  <span>Suspend Account — {customer.name}</span>
                </h2>
                <button className="modal-close" onClick={() => setShowSuspendModal(false)}>
                  <CrossIcon size={16} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                  Select suspension duration for <strong>{customer.name}</strong> ({customer.business_name || 'Individual'}).
                </p>

                <div className="form-group">
                  <label className="form-label">Suspension Duration *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    {[
                      { id: '7', label: '7 Days', icon: <ClockIcon size={14} color="var(--status-warning)" /> },
                      { id: '15', label: '15 Days', icon: <ClockIcon size={14} color="var(--status-warning)" /> },
                      { id: '30', label: '30 Days', icon: <ClockIcon size={14} color="var(--status-warning)" /> },
                      { id: '60', label: '60 Days', icon: <ClockIcon size={14} color="var(--status-warning)" /> },
                      { id: 'indefinite', label: 'Indefinite', icon: <LightningIcon size={14} color="var(--status-warning)" /> },
                      { id: 'custom', label: 'Custom Date', icon: <CalendarIcon size={14} color="var(--status-warning)" /> },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSuspendOption(opt.id as any)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: suspendOption === opt.id ? '1px solid var(--status-warning)' : '1px solid var(--border-glass)',
                          background: suspendOption === opt.id ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
                          color: suspendOption === opt.id ? 'var(--status-warning)' : 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {suspendOption === 'custom' && (
                  <div className="form-group">
                    <label className="form-label">Suspend Until Date *</label>
                    <input
                      type="date"
                      className="input"
                      required
                      value={customSuspendDate}
                      onChange={e => setCustomSuspendDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSuspendModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={handleSuspendConfirm}
                  disabled={suspending || (suspendOption === 'custom' && !customSuspendDate)}
                >
                  {suspending ? 'Suspending...' : 'Confirm Suspension'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
            <div className="modal" style={{ maxWidth: '440px' }}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrashIcon size={18} color="var(--status-danger)" />
                  <span>Permanently Delete Customer</span>
                </h2>
                <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                  <CrossIcon size={16} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  Are you sure you want to permanently delete customer <strong>{customer.name}</strong> ({customer.mobile})?
                </p>
                <p style={{ fontSize: '12.5px', color: 'var(--status-danger)', marginTop: '8px', background: 'rgba(244, 63, 94, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                  ⚠️ This action cannot be undone. All linked follow-up records will also be removed.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
