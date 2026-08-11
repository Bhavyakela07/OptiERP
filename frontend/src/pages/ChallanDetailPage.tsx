import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/Skeleton';
import { getChallan, confirmChallan, cancelChallan, getProducts } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  CrossIcon,
  CheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  EyeIcon
} from '../components/Icons';
import type { Challan, Product } from '../types';

interface StockCheckResult {
  sku: string;
  name: string;
  requested: number;
  available: number;
  isSufficient: boolean;
}

function numberToWords(num: number): string {
  const n = Math.round(num);
  if (n === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numStr = ('000000000' + n).slice(-9);
  const match = numStr.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!match) return `Rupees ${n} Only`;
  
  let str = '';
  str += Number(match[1]) !== 0 ? (a[Number(match[1])] || b[Number(match[1][0])] + ' ' + a[Number(match[1][1])]) + 'Crore ' : '';
  str += Number(match[2]) !== 0 ? (a[Number(match[2])] || b[Number(match[2][0])] + ' ' + a[Number(match[2][1])]) + 'Lakh ' : '';
  str += Number(match[3]) !== 0 ? (a[Number(match[3])] || b[Number(match[3][0])] + ' ' + a[Number(match[3][1])]) + 'Thousand ' : '';
  str += Number(match[4]) !== 0 ? (a[Number(match[4])] || b[Number(match[4][0])] + ' ' + a[Number(match[4][1])]) + 'Hundred ' : '';
  str += Number(match[5]) !== 0 ? ((str !== '') ? 'and ' : '') + (a[Number(match[5])] || b[Number(match[5][0])] + ' ' + a[Number(match[5][1])]) : '';
  
  return `Rupees ${str.trim()} Only`;
}

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const canWrite = user?.role === 'Admin' || user?.role === 'Sales';

  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);

  // Single-Transaction Dispatch Modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [stockCheckResults, setStockCheckResults] = useState<StockCheckResult[]>([]);
  const [checkingStock, setCheckingStock] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Tax Invoice Preview Modal State
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);

  const loadChallan = async () => {
    if (!id) return;
    try {
      const res = await getChallan(id);
      setChallan(res.data);
    } catch {
      show('Failed to load challan details', 'error');
      navigate('/challans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadChallan(); }, [id]);

  // Open Dispatch Modal & Run Real-Time Available-vs-Requested Stock Audit
  const handleOpenDispatchModal = async () => {
    if (!challan || !challan.items) return;
    setShowDispatchModal(true);
    setCheckingStock(true);

    try {
      const prodRes = await getProducts({ limit: 200 });
      const productMap = Object.fromEntries(prodRes.data.data.map(p => [p.id, p]));

      const results: StockCheckResult[] = challan.items.map(item => {
        const prod = productMap[item.product_id] as Product | undefined;
        const available = prod ? prod.current_stock : 0;
        const requested = item.quantity;
        return {
          sku: item.sku_snapshot,
          name: item.product_name_snapshot,
          requested,
          available,
          isSufficient: available >= requested
        };
      });

      setStockCheckResults(results);
    } catch (e) {
      show('Failed to run pre-dispatch stock audit', 'error');
    } finally {
      setCheckingStock(false);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!id) return;
    setConfirming(true);
    try {
      await confirmChallan(id);
      show('Challan confirmed & dispatched! Stock decremented.', 'success');
      setShowDispatchModal(false);
      loadChallan();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.details) {
        const msg = data.details.map((d: any) => `${d.sku}: need ${d.requested}, available ${d.available}`).join('; ');
        show(`Stock shortfall — ${msg}`, 'warning');
      } else {
        show(data?.error || 'Dispatch confirmation failed', 'error');
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !window.confirm('Are you sure you want to cancel this challan?')) return;
    setCancelling(true);
    try {
      await cancelChallan(id);
      show('Challan status set to Cancelled.', 'info');
      loadChallan();
    } catch (err: any) {
      show(err.response?.data?.error || 'Cancellation failed', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <>
        <Header title="Challan Detail" />
        <div className="page-content">
          <Skeleton height="120px" style={{ marginBottom: '20px' }} />
          <Skeleton height="300px" />
        </div>
      </>
    );
  }

  if (!challan) return null;

  const hasShortfall = stockCheckResults.some(r => !r.isSufficient);

  // Financial Calculations for Tax Invoice
  const subtotal = challan.items ? challan.items.reduce((sum, i) => sum + (Number(i.price_snapshot) * i.quantity), 0) : Number(challan.total_amount || 0);
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const grandTotal = subtotal + cgst + sgst;

  // Horizontal Stepper Timeline Nodes (Draft → Confirmed → Delivered)
  const steps = [
    { label: 'Draft', done: true },
    { label: 'Confirmed / Dispatched', done: challan.status === 'Confirmed' },
    { label: 'Completed', done: challan.status === 'Confirmed' },
  ];

  return (
    <>
      <Header title="Challan Detail" subtitle={challan.challan_number} />
      <div className="page-content">

        {/* ─── SCREEN-ONLY WEB INTERFACE ─────────────────────────────── */}
        <div className="screen-only">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/challans')}>
              ← Back to Challans
            </button>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Standalone View / Preview Invoice SVG Icon Button */}
              <button
                type="button"
                className="table-action-icon-btn"
                title="Preview Tax Invoice Layout"
                onClick={() => setShowInvoicePreviewModal(true)}
                style={{ width: '36px', height: '36px', background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)' }}
              >
                <EyeIcon size={16} color="var(--text-primary)" />
              </button>

              {/* 📄 Print / Export PDF Invoice Button */}
              <button className="btn btn-primary btn-sm" onClick={handleExportPdf}>
                📄 Export Invoice as PDF
              </button>
            </div>
          </div>

          {/* Page Action Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {challan.challan_number}
                </h1>
                <StatusBadge status={challan.status} label={challan.status} />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Customer: <strong>{challan.customer_name || '—'}</strong>
                {challan.confirmed_at && ` · Dispatched On: ${new Date(challan.confirmed_at).toLocaleString('en-IN')}`}
              </p>
            </div>

            {canWrite && challan.status === 'Draft' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                  <CrossIcon size={14} />
                  <span>{cancelling ? 'Cancelling...' : 'Cancel Challan'}</span>
                </button>
                <button className="btn btn-success btn-lg" onClick={handleOpenDispatchModal}>
                  <CheckIcon size={16} />
                  <span>Confirm & Dispatch</span>
                </button>
              </div>
            )}

            {canWrite && challan.status === 'Confirmed' && (
              <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                <CrossIcon size={14} />
                <span>{cancelling ? 'Cancelling...' : 'Cancel Challan'}</span>
              </button>
            )}
          </div>

          {/* Horizontal Status Timeline Stepper */}
          <GlassCard style={{ marginBottom: '24px', padding: '24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              {/* Connecting Horizontal Line */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '40px',
                right: '40px',
                height: '3px',
                background: 'var(--border-glass)',
                zIndex: 1
              }}>
                <div style={{
                  height: '100%',
                  width: challan.status === 'Confirmed' ? '100%' : '20%',
                  background: 'linear-gradient(90deg, var(--accent-start), var(--status-success))',
                  transition: 'var(--transition-normal)'
                }} />
              </div>

              {steps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2, position: 'relative' }}>
                  <div style={{
                    width: '32px', height: '32px',
                    borderRadius: '50%',
                    background: step.done ? 'var(--status-success)' : 'var(--bg-elevated)',
                    border: step.done ? '2px solid var(--status-success)' : '2px solid var(--border-glass)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: step.done ? 'white' : 'var(--text-secondary)',
                    boxShadow: step.done ? '0 0 12px var(--status-success)' : 'none',
                    transition: 'var(--transition-normal)'
                  }}>
                    {step.done ? <CheckIcon size={14} /> : idx + 1}
                  </div>
                  <span style={{ fontSize: '12.5px', fontWeight: step.done ? 700 : 500, color: step.done ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Line Items Table with Price Snapshots */}
          <GlassCard style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Captured Line Items & Price Snapshots
            </h3>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product (Snapshot)</th>
                    <th>SKU Code</th>
                    <th>Snapshot Unit Price</th>
                    <th>Quantity</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {!challan.items || challan.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No items attached to this challan
                      </td>
                    </tr>
                  ) : (
                    challan.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.product_name_snapshot}</td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-end)', background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                            {item.sku_snapshot}
                          </span>
                        </td>
                        <td className="tabular-nums">₹{Number(item.price_snapshot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="tabular-nums" style={{ fontWeight: 800 }}>{item.quantity} units</td>
                        <td className="tabular-nums" style={{ fontWeight: 700, color: 'var(--accent-end)' }}>
                          ₹{Number(item.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {challan.items && challan.items.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, padding: '16px', color: 'var(--text-secondary)' }}>Grand Total:</td>
                      <td className="tabular-nums" style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)', padding: '16px' }}>
                        ₹{Number(challan.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </GlassCard>
        </div>

        {/* 🖨️ PRINTABLE FORMAL TAX INVOICE DOCUMENT (PDF OUTPUT) */}
        <div className="printable-invoice-container">
          <div className="invoice-box">
            
            {/* Top Invoice Header with icon.png Logo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img src="/icon.png" alt="Company Logo" style={{ height: '46px', objectFit: 'contain', borderRadius: '6px' }} />
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', color: '#111827', margin: 0, letterSpacing: '0.5px' }}>
                    MINI ERP & CRM OPERATIONS
                  </h1>
                  <p style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px', lineHeight: '1.4' }}>
                    Plot 42, GIDC Industrial Estate, Vadodara, Gujarat - 390010<br />
                    <strong>GSTIN:</strong> 24AAAAA0000A1Z5 | <strong>Email:</strong> sales@minierpcrm.com | <strong>Phone:</strong> +91 98765 43210
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ background: '#111827', color: '#ffffff', padding: '6px 14px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', borderRadius: '4px', display: 'inline-block' }}>
                  TAX INVOICE
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', marginTop: '8px', fontFamily: 'monospace' }}>
                  #{challan.challan_number}
                </div>
                <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                  Date: {new Date(challan.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Billed To & Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', border: '1px solid #d1d5db', padding: '16px', borderRadius: '6px', marginBottom: '20px', background: '#f9fafb' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  BILLED TO (CUSTOMER DETAILS)
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                  {challan.customer?.business_name || challan.customer_name || 'Valued Customer'}
                </div>
                {challan.customer?.name && (
                  <div style={{ fontSize: '12px', color: '#374151', marginTop: '2px' }}>
                    Attn: {challan.customer.name}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px', lineHeight: '1.4' }}>
                  {challan.customer?.address || 'Vadodara, Gujarat'}<br />
                  <strong>Mobile:</strong> {challan.customer?.mobile || '—'} | <strong>Email:</strong> {challan.customer?.email || '—'}<br />
                  <strong>GSTIN:</strong> {challan.customer?.gst_number || 'Unregistered'}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  INVOICE & DISPATCH DETAILS
                </div>
                <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 0', color: '#6b7280', fontWeight: 600 }}>Challan No:</td>
                      <td style={{ padding: '3px 0', fontWeight: 700, color: '#111827', textAlign: 'right' }}>{challan.challan_number}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', color: '#6b7280', fontWeight: 600 }}>Status:</td>
                      <td style={{ padding: '3px 0', fontWeight: 700, color: '#111827', textAlign: 'right' }}>{challan.status}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', color: '#6b7280', fontWeight: 600 }}>Dispatch Date:</td>
                      <td style={{ padding: '3px 0', fontWeight: 700, color: '#111827', textAlign: 'right' }}>
                        {challan.confirmed_at ? new Date(challan.confirmed_at).toLocaleDateString('en-IN') : 'Pending Dispatch'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', color: '#6b7280', fontWeight: 600 }}>Payment Terms:</td>
                      <td style={{ padding: '3px 0', fontWeight: 700, color: '#111827', textAlign: 'right' }}>Net 30 Days</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', color: '#6b7280', fontWeight: 600 }}>Place of Supply:</td>
                      <td style={{ padding: '3px 0', fontWeight: 700, color: '#111827', textAlign: 'right' }}>Gujarat (24)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#111827', color: '#ffffff' }}>
                  <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, textAlign: 'center', border: '1px solid #111827', width: '40px' }}>#</th>
                  <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, textAlign: 'left', border: '1px solid #111827' }}>Product Description</th>
                  <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, textAlign: 'left', border: '1px solid #111827', width: '120px' }}>SKU Code</th>
                  <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, textAlign: 'right', border: '1px solid #111827', width: '110px' }}>Unit Price (₹)</th>
                  <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, textAlign: 'center', border: '1px solid #111827', width: '70px' }}>Qty</th>
                  <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, textAlign: 'right', border: '1px solid #111827', width: '120px' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {challan.items?.map((item, idx) => {
                  const lineTotal = Number(item.price_snapshot) * item.quantity;
                  return (
                    <tr key={item.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td style={{ padding: '8px 10px', fontSize: '11.5px', textAlign: 'center', border: '1px solid #e5e7eb' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px', fontSize: '11.5px', fontWeight: 600, border: '1px solid #e5e7eb' }}>{item.product_name_snapshot}</td>
                      <td style={{ padding: '8px 10px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid #e5e7eb' }}>{item.sku_snapshot}</td>
                      <td style={{ padding: '8px 10px', fontSize: '11.5px', textAlign: 'right', border: '1px solid #e5e7eb' }}>
                        ₹{Number(item.price_snapshot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '11.5px', textAlign: 'center', fontWeight: 700, border: '1px solid #e5e7eb' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 10px', fontSize: '11.5px', textAlign: 'right', fontWeight: 700, border: '1px solid #e5e7eb' }}>
                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Financial Summary & Breakdown Table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', marginTop: '10px' }}>
              
              {/* Terms & Amount in Words */}
              <div style={{ border: '1px solid #e5e7eb', padding: '14px', borderRadius: '6px', background: '#f9fafb' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>
                  AMOUNT IN WORDS
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827', fontStyle: 'italic', marginBottom: '12px' }}>
                  {numberToWords(grandTotal)}
                </div>

                <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>
                  BANK DETAILS & PAYMENT TERMS
                </div>
                <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: '1.4' }}>
                  <strong>Bank Name:</strong> HDFC Bank Ltd<br />
                  <strong>Account No:</strong> 50200012345678 | <strong>IFSC:</strong> HDFC0000123<br />
                  <strong>Branch:</strong> Alkapuri, Vadodara
                </div>
              </div>

              {/* Financial Calculations Table */}
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 8px', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Subtotal:</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid #e5e7eb' }}>
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>CGST (9%):</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>
                      ₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>SGST (9%):</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>
                      ₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr style={{ background: '#111827', color: '#ffffff' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: '13px' }}>Grand Total:</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '14px' }}>
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>

            {/* Signatory Footer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '20px', marginTop: '36px', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: '1.4' }}>
                <strong>Terms & Conditions:</strong><br />
                1. Goods once dispatched will not be taken back.<br />
                2. All disputes are subject to Vadodara jurisdiction.<br />
                3. This is a computer-generated tax invoice document.
              </div>

              <div style={{ textAlign: 'center', borderTop: '1px solid #111827', paddingTop: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#111827' }}>For MINI ERP & CRM</div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '24px' }}>Authorized Signatory</div>
              </div>
            </div>

          </div>
        </div>

        {/* 👁️ Tax Invoice Full Document Preview Modal */}
        {showInvoicePreviewModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInvoicePreviewModal(false)}>
            <div className="modal" style={{ maxWidth: '820px', width: '95vw', background: '#ffffff', color: '#111827', padding: '0' }}>
              <div className="modal-header" style={{ background: '#111827', color: '#ffffff', borderBottom: 'none' }}>
                <h2 className="modal-title" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                  <EyeIcon size={16} color="#ffffff" />
                  <span>Tax Invoice Document Preview — #{challan.challan_number}</span>
                </h2>
                <button className="modal-close" onClick={() => setShowInvoicePreviewModal(false)} style={{ color: '#ffffff' }}>
                  <CrossIcon size={16} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: '24px', background: '#ffffff' }}>
                {/* Render the clean white Tax Invoice box directly inside modal body for live screen preview */}
                <div className="invoice-box" style={{ border: '1px solid #d1d5db', padding: '24px', background: '#ffffff' }}>
                  {/* Header with icon.png Logo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img src="/icon.png" alt="Company Logo" style={{ height: '44px', objectFit: 'contain', borderRadius: '6px' }} />
                      <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', color: '#111827', margin: 0, letterSpacing: '0.5px' }}>
                          MINI ERP & CRM OPERATIONS
                        </h1>
                        <p style={{ fontSize: '11px', color: '#4b5563', marginTop: '3px', lineHeight: '1.4' }}>
                          Plot 42, GIDC Industrial Estate, Vadodara, Gujarat - 390010<br />
                          <strong>GSTIN:</strong> 24AAAAA0000A1Z5 | <strong>Email:</strong> sales@minierpcrm.com | <strong>Phone:</strong> +91 98765 43210
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ background: '#111827', color: '#ffffff', padding: '5px 12px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', borderRadius: '4px', display: 'inline-block' }}>
                        TAX INVOICE
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginTop: '6px', fontFamily: 'monospace' }}>
                        #{challan.challan_number}
                      </div>
                      <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                        Date: {new Date(challan.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* Billed To */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', border: '1px solid #d1d5db', padding: '14px', borderRadius: '6px', marginBottom: '18px', background: '#f9fafb' }}>
                    <div>
                      <div style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        BILLED TO (CUSTOMER DETAILS)
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#111827' }}>
                        {challan.customer?.business_name || challan.customer_name || 'Valued Customer'}
                      </div>
                      {challan.customer?.name && (
                        <div style={{ fontSize: '11.5px', color: '#374151', marginTop: '2px' }}>
                          Attn: {challan.customer.name}
                        </div>
                      )}
                      <div style={{ fontSize: '11.5px', color: '#4b5563', marginTop: '4px', lineHeight: '1.4' }}>
                        {challan.customer?.address || 'Vadodara, Gujarat'}<br />
                        <strong>Mobile:</strong> {challan.customer?.mobile || '—'} | <strong>Email:</strong> {challan.customer?.email || '—'}<br />
                        <strong>GSTIN:</strong> {challan.customer?.gst_number || 'Unregistered'}
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '16px' }}>
                      <div style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        INVOICE & DISPATCH DETAILS
                      </div>
                      <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '2px 0', color: '#6b7280', fontWeight: 600 }}>Challan No:</td>
                            <td style={{ padding: '2px 0', fontWeight: 700, color: '#111827', textAlign: 'right' }}>{challan.challan_number}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '2px 0', color: '#6b7280', fontWeight: 600 }}>Status:</td>
                            <td style={{ padding: '2px 0', fontWeight: 700, color: '#111827', textAlign: 'right' }}>{challan.status}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '2px 0', color: '#6b7280', fontWeight: 600 }}>Dispatch Date:</td>
                            <td style={{ padding: '2px 0', fontWeight: 700, color: '#111827', textAlign: 'right' }}>
                              {challan.confirmed_at ? new Date(challan.confirmed_at).toLocaleDateString('en-IN') : 'Pending Dispatch'}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '2px 0', color: '#6b7280', fontWeight: 600 }}>Payment Terms:</td>
                            <td style={{ padding: '2px 0', fontWeight: 700, color: '#111827', textAlign: 'right' }}>Net 30 Days</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                    <thead>
                      <tr style={{ background: '#111827', color: '#ffffff' }}>
                        <th style={{ padding: '7px 8px', fontSize: '10.5px', fontWeight: 700, textAlign: 'center', border: '1px solid #111827', width: '35px' }}>#</th>
                        <th style={{ padding: '7px 8px', fontSize: '10.5px', fontWeight: 700, textAlign: 'left', border: '1px solid #111827' }}>Product Description</th>
                        <th style={{ padding: '7px 8px', fontSize: '10.5px', fontWeight: 700, textAlign: 'left', border: '1px solid #111827', width: '110px' }}>SKU Code</th>
                        <th style={{ padding: '7px 8px', fontSize: '10.5px', fontWeight: 700, textAlign: 'right', border: '1px solid #111827', width: '100px' }}>Unit Price (₹)</th>
                        <th style={{ padding: '7px 8px', fontSize: '10.5px', fontWeight: 700, textAlign: 'center', border: '1px solid #111827', width: '60px' }}>Qty</th>
                        <th style={{ padding: '7px 8px', fontSize: '10.5px', fontWeight: 700, textAlign: 'right', border: '1px solid #111827', width: '110px' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {challan.items?.map((item, idx) => {
                        const lineTotal = Number(item.price_snapshot) * item.quantity;
                        return (
                          <tr key={item.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                            <td style={{ padding: '7px 8px', fontSize: '11px', textAlign: 'center', border: '1px solid #e5e7eb' }}>{idx + 1}</td>
                            <td style={{ padding: '7px 8px', fontSize: '11px', fontWeight: 600, border: '1px solid #e5e7eb' }}>{item.product_name_snapshot}</td>
                            <td style={{ padding: '7px 8px', fontSize: '10.5px', fontFamily: 'monospace', border: '1px solid #e5e7eb' }}>{item.sku_snapshot}</td>
                            <td style={{ padding: '7px 8px', fontSize: '11px', textAlign: 'right', border: '1px solid #e5e7eb' }}>
                              ₹{Number(item.price_snapshot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '7px 8px', fontSize: '11px', textAlign: 'center', fontWeight: 700, border: '1px solid #e5e7eb' }}>{item.quantity}</td>
                            <td style={{ padding: '7px 8px', fontSize: '11px', textAlign: 'right', fontWeight: 700, border: '1px solid #e5e7eb' }}>
                              ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px' }}>
                    <div style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '6px', background: '#f9fafb' }}>
                      <div style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '3px' }}>
                        AMOUNT IN WORDS
                      </div>
                      <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#111827', fontStyle: 'italic' }}>
                        {numberToWords(grandTotal)}
                      </div>
                    </div>

                    <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '4px 6px', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Subtotal:</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid #e5e7eb' }}>
                            ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 6px', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>CGST (9%):</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>
                            ₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 6px', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>SGST (9%):</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>
                            ₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr style={{ background: '#111827', color: '#ffffff' }}>
                          <td style={{ padding: '8px 6px', fontWeight: 800, fontSize: '12px' }}>Grand Total:</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, fontSize: '13px' }}>
                            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ background: '#f3f4f6', borderTop: '1px solid #e5e7eb' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvoicePreviewModal(false)}>Close Preview</button>
                <button type="button" className="btn btn-primary" onClick={() => { setShowInvoicePreviewModal(false); window.print(); }}>
                  📄 Print / Export PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single-Transaction Stock Check & Dispatch Modal */}
        {showDispatchModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDispatchModal(false)}>
            <div className="modal" style={{ maxWidth: '620px' }}>
              <div className="modal-header">
                <h2 className="modal-title">Pre-Dispatch Stock Verification</h2>
                <button className="modal-close" onClick={() => setShowDispatchModal(false)}>
                  <CrossIcon size={16} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Real-time transactional audit checking inventory availability for challan <strong>{challan.challan_number}</strong>:
                </p>

                {checkingStock ? (
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Auditing warehouse inventory availability...</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stockCheckResults.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--bg-surface)',
                          border: r.isSufficient ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.4)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {r.isSufficient ? (
                            <CheckCircleIcon size={20} color="var(--status-success)" />
                          ) : (
                            <AlertTriangleIcon size={20} color="var(--status-danger)" />
                          )}
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
                            <div style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{r.sku}</div>
                          </div>
                        </div>

                        <div className="tabular-nums" style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: r.isSufficient ? 'var(--status-success)' : 'var(--status-danger)' }}>
                            Requested: {r.requested} | Available: {r.available}
                          </div>
                          {!r.isSufficient && (
                            <div style={{ fontSize: '11.5px', color: 'var(--status-danger)', fontWeight: 600 }}>
                              Shortfall: {r.requested - r.available} units
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {hasShortfall && (
                  <div style={{ marginTop: '16px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--status-danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangleIcon size={18} color="var(--status-danger)" />
                    <span>Insufficient stock detected! Dispatch will be blocked by backend row locks.</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDispatchModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={confirming || hasShortfall || checkingStock}
                  onClick={handleConfirmDispatch}
                >
                  {confirming ? 'Executing Transaction...' : 'Confirm Dispatch & Decrement Stock'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
