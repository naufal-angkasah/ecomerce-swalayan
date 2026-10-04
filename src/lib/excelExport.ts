import writeXlsxFile from 'write-excel-file/browser';
import { Order } from '@/types';
import { formatDateIndo } from './utils';

export interface ExportReportMetrics {
  totalOrders: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  totalGrossRevenue: number;
  totalPaidRevenue: number;
  totalPendingRevenue: number;
  totalSubtotal: number;
  totalShipping: number;
  totalDiscount: number;
  totalItemsCount: number;
}

export async function exportSalesReportToExcel(
  orders: Order[],
  metrics: ExportReportMetrics,
  periodLabel: string
): Promise<void> {
  const headerBg = '#C62818'; // Brand Red Alvin Swalayan
  const headerText = '#FFFFFF';
  const borderLight = '#E2E8F0';

  // 1. Title & Metadata Rows
  const titleRow: any[] = [
    {
      value: 'ALVIN SWALAYAN BANDA ACEH - LAPORAN REKAPITULASI PENJUALAN',
      fontWeight: 'bold',
      fontSize: 14,
      textColor: '#C62818',
    },
  ];

  const subTitleRow: any[] = [
    {
      value: `Periode: ${periodLabel} | Waktu Export: ${new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })} pk ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      fontSize: 10,
      textColor: '#475569',
    },
  ];

  const summaryRow1: any[] = [
    {
      value: `Total Pesanan: ${metrics.totalOrders} Transaksi (${metrics.paidOrdersCount} Lunas, ${metrics.pendingOrdersCount} Pending, ${metrics.cancelledOrdersCount} Batal) | Produk Terjual: ${metrics.totalItemsCount} Unit`,
      fontSize: 10,
      fontWeight: 'bold',
      textColor: '#1E293B',
    },
  ];

  const summaryRow2: any[] = [
    {
      value: `Total Omset Penjualan: Rp ${metrics.totalGrossRevenue.toLocaleString('id-ID')} | Omset Lunas (PAID): Rp ${metrics.totalPaidRevenue.toLocaleString('id-ID')} | Menunggu / COD: Rp ${metrics.totalPendingRevenue.toLocaleString('id-ID')}`,
      fontSize: 10,
      fontWeight: 'bold',
      textColor: '#15803D',
    },
  ];

  const blankRow: any[] = [{ value: '' }];

  // 2. Table Column Headers
  const tableHeaderRow: any[] = [
    { value: 'No', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'center', fontSize: 10 },
    { value: 'Nomor Pesanan', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'center', fontSize: 10 },
    { value: 'Tanggal Transaksi', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'center', fontSize: 10 },
    { value: 'Nama Pelanggan', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'left', fontSize: 10 },
    { value: 'No. WhatsApp', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'center', fontSize: 10 },
    { value: 'Alamat Pengiriman', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'left', fontSize: 10 },
    { value: 'Daftar Produk Dibeli', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'left', fontSize: 10 },
    { value: 'Subtotal Produk (Rp)', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'right', fontSize: 10 },
    { value: 'Ongkir (Rp)', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'right', fontSize: 10 },
    { value: 'Diskon (Rp)', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'right', fontSize: 10 },
    { value: 'Total Akhir (Rp)', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'right', fontSize: 10 },
    { value: 'Metode Pembayaran', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'center', fontSize: 10 },
    { value: 'Status Bayar', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'center', fontSize: 10 },
    { value: 'Status Pesanan', fontWeight: 'bold', backgroundColor: headerBg, textColor: headerText, align: 'center', fontSize: 10 },
  ];

  // 3. Table Data Rows
  const dataRows: any[][] = orders.map((ord, idx) => {
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? '#FFFFFF' : '#F8FAFC';

    const itemsSummary = (ord.items || [])
      .map((item) => `${item.product_name} (${item.quantity}x)`)
      .join(', ');

    const dateFormatted = new Date(ord.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ` ${new Date(ord.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

    return [
      { value: idx + 1, type: Number, align: 'center', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.order_number, type: String, fontWeight: 'bold', align: 'center', backgroundColor: rowBg, borderColor: borderLight },
      { value: dateFormatted, type: String, align: 'center', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.customer_name || '-', type: String, align: 'left', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.customer_phone ? String(ord.customer_phone) : '-', type: String, align: 'center', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.delivery_address || '-', type: String, align: 'left', backgroundColor: rowBg, borderColor: borderLight },
      { value: itemsSummary || '-', type: String, align: 'left', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.subtotal || 0, type: Number, format: '#,##0', align: 'right', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.delivery_fee || ord.shipping_cost || 0, type: Number, format: '#,##0', align: 'right', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.discount_amount || 0, type: Number, format: '#,##0', align: 'right', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.total_amount || 0, type: Number, format: '#,##0', fontWeight: 'bold', align: 'right', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.payment_method || '-', type: String, align: 'center', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.payment_status || '-', type: String, fontWeight: 'bold', align: 'center', backgroundColor: rowBg, borderColor: borderLight },
      { value: ord.order_status || '-', type: String, fontWeight: 'bold', align: 'center', backgroundColor: rowBg, borderColor: borderLight },
    ];
  });

  // 4. Totals Footer Row
  const footerBg = '#F1F5F9';
  const totalsRow: any[] = [
    { value: '', backgroundColor: footerBg },
    { value: '', backgroundColor: footerBg },
    { value: '', backgroundColor: footerBg },
    { value: '', backgroundColor: footerBg },
    { value: '', backgroundColor: footerBg },
    { value: '', backgroundColor: footerBg },
    { value: 'TOTAL KESELURUHAN:', fontWeight: 'bold', align: 'right', fontSize: 11, backgroundColor: footerBg },
    { value: metrics.totalSubtotal, type: Number, format: '#,##0', fontWeight: 'bold', align: 'right', fontSize: 11, backgroundColor: footerBg },
    { value: metrics.totalShipping, type: Number, format: '#,##0', fontWeight: 'bold', align: 'right', fontSize: 11, backgroundColor: footerBg },
    { value: metrics.totalDiscount, type: Number, format: '#,##0', fontWeight: 'bold', align: 'right', fontSize: 11, backgroundColor: footerBg },
    { value: metrics.totalGrossRevenue, type: Number, format: '#,##0', fontWeight: 'bold', align: 'right', textColor: '#C62818', fontSize: 11, backgroundColor: footerBg },
    { value: '', backgroundColor: footerBg },
    { value: '', backgroundColor: footerBg },
    { value: '', backgroundColor: footerBg },
  ];

  // Assemble Complete Sheet
  const sheetData = [
    titleRow,
    subTitleRow,
    summaryRow1,
    summaryRow2,
    blankRow,
    tableHeaderRow,
    ...dataRows,
    totalsRow,
  ];

  // Column Widths in Characters
  const columns = [
    { width: 6 },  // No
    { width: 18 }, // Nomor Pesanan
    { width: 22 }, // Tanggal Transaksi
    { width: 22 }, // Nama Pelanggan
    { width: 17 }, // No. WhatsApp
    { width: 35 }, // Alamat Pengiriman
    { width: 42 }, // Daftar Produk
    { width: 18 }, // Subtotal
    { width: 14 }, // Ongkir
    { width: 14 }, // Diskon
    { width: 18 }, // Total Akhir
    { width: 18 }, // Metode Pembayaran
    { width: 16 }, // Status Bayar
    { width: 16 }, // Status Pesanan
  ];

  const cleanDate = new Date().toISOString().split('T')[0];
  const fileName = `Laporan_Penjualan_Alvin_Swalayan_${cleanDate}.xlsx`;

  await writeXlsxFile(sheetData, { columns }).toFile(fileName);
}
