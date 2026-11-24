import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaDownload, FaCheckCircle, FaClock, FaShareAlt } from 'react-icons/fa';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

const InvoicePage = () => {
    const { invoiceNumber } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetchInvoice();
    }, [invoiceNumber]);

    const fetchInvoice = async () => {
        try {
            const res = await api.get(`/purchase/invoice/${invoiceNumber}`);
            setInvoice(res.data);
        } catch (error) {
            showError('Invoice not found');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const res = await api.get(`/purchase/invoice/${invoiceNumber}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showError('Failed to download invoice');
        } finally {
            setDownloading(false);
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        showSuccess('Invoice link copied to clipboard');
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const currencySymbol = invoice?.currency === 'USD' ? '$' : '₹';

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-zinc-200 dark:border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">Invoice not found</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-6">The invoice you're looking for doesn't exist.</p>
                    <Link to="/marketplace" className="text-blue-500 hover:text-blue-600 font-medium">
                        Go to marketplace
                    </Link>
                </div>
            </div>
        );
    }

    const isPaid = invoice.invoiceStatus === 'paid';

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Action Bar */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                        Invoice {invoice.invoiceNumber}
                    </h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <FaShareAlt className="text-xs" /> Copy link
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <FaDownload className="text-xs" />
                            {downloading ? 'Downloading...' : 'Download PDF'}
                        </button>
                    </div>
                </div>

                {/* Invoice Card */}
                <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    {/* Header */}
                    <div className="px-8 pt-8 pb-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">Skill Path</h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Course marketplace</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-3xl font-semibold text-zinc-900 dark:text-white">INVOICE</h3>
                                <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold uppercase ${isPaid
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                    }`}>
                                    {isPaid ? <FaCheckCircle /> : <FaClock />}
                                    {isPaid ? 'Paid' : 'Created'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="px-8 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-700">
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Invoice number</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{invoice.invoiceNumber}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Date</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{formatDate(invoice.date)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Payment ID</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{invoice.paymentId || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Bill To / Instructor */}
                    <div className="px-8 py-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">Bill to</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{invoice.student?.name}</p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{invoice.student?.email}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">Instructor</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{invoice.instructor?.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="px-8">
                        <table className="w-full">
                            <thead>
                                <tr className="border-y border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
                                    <th className="py-3 px-4 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Item</th>
                                    <th className="py-3 px-4 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Category</th>
                                    <th className="py-3 px-4 text-right text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                                    <td className="py-4 px-4">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{invoice.course?.title}</p>
                                        {invoice.course?.level && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{invoice.course.level}</p>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                                        {invoice.course?.category || '-'}
                                    </td>
                                    <td className="py-4 px-4 text-sm text-zinc-900 dark:text-white text-right font-medium">
                                        {currencySymbol}{invoice.originalPrice || invoice.amount}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="px-8 py-6">
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                                {invoice.discountAmount > 0 && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                                            <span className="text-zinc-900 dark:text-white">{currencySymbol}{invoice.originalPrice}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-green-600 dark:text-green-400">Discount</span>
                                            <span className="text-green-600 dark:text-green-400">-{currencySymbol}{invoice.discountAmount}</span>
                                        </div>
                                    </>
                                )}
                                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex justify-between">
                                    <span className="text-base font-semibold text-zinc-900 dark:text-white">Total</span>
                                    <span className="text-base font-semibold text-zinc-900 dark:text-white">{currencySymbol}{invoice.amount}</span>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-medium ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {isPaid ? 'Payment Received' : 'Payment Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-700 text-center">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            Thank you for your purchase! This is a computer-generated invoice.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePage;
