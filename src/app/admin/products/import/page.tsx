'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { productService } from '@/services/productService';
import { CSVImportResult, CSVRowPreview } from '@/types';
import { formatRupiah } from '@/lib/utils';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  ArrowLeft,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';

const SAMPLE_CSV = `sku,name,brand,category,unit,price,discount_price,stock,description,image_url
SBK-MGO-001,Minyak Goreng Tropical Botol 2 Liter,Tropical,sembako,Botol 2 Liter,39000,36000,30,Minyak goreng 2x penyaringan bermutu tinggi,https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80
MNM-THC-002,Teh Botol Sosro Kotak 250 ml (1 Dus),Sosro,minuman,Dus (24 Kotak),72000,,25,Minuman teh melati asli Indonesia siap minum,https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80
MKN-KCP-002,Kecap Sedap Manis Pouch 550 ml,Sedap,makanan,Pouch 550 ml,19500,18000,40,Kecap kedelai hitam gurih dan kental meresap sempurna,https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80
SBK-BRS-001,Beras Ramos Setra Premium 5 kg (Updated Stock),Ramos Setra,sembako,Karung 5 kg,74000,69000,50,Beras pulen tanpa pemutih langsung dari kilang padi,https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80`;

export default function AdminCSVImportPage() {

  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'UPDATE' | 'SKIP'>('UPDATE');
  const [isCommitted, setIsCommitted] = useState(false);
  const [commitSummary, setCommitSummary] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
    cloudSynced?: boolean;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
        // Automatically validate & preview with current duplicate strategy
        const result = productService.parseCSV(text, duplicateStrategy);
        setImportResult(result);
        setIsCommitted(false);
      };
      reader.readAsText(file);
    }
  };

  const handleValidateText = () => {
    if (!csvText.trim()) return;
    const result = productService.parseCSV(csvText, duplicateStrategy);
    setImportResult(result);
    setIsCommitted(false);
  };

  const applyDuplicateStrategy = (strategy: 'UPDATE' | 'SKIP') => {
    setDuplicateStrategy(strategy);
    if (!importResult) return;

    let updatedCount = 0;
    let skippedCount = 0;

    const newRows: CSVRowPreview[] = importResult.previewRows.map((row) => {
      if (row.existingProductId || row.matchedBy) {
        const nextAction: 'UPDATE' | 'SKIP' = strategy;
        if (nextAction === 'UPDATE') updatedCount++;
        else skippedCount++;
        return { ...row, action: nextAction };
      }
      return row;
    });

    setImportResult({
      ...importResult,
      updatedCount,
      skippedCount,
      previewRows: newRows,
    });
  };

  const toggleRowDuplicateAction = (rowIndex: number) => {
    if (!importResult) return;

    let updatedCount = 0;
    let skippedCount = 0;

    const newRows: CSVRowPreview[] = importResult.previewRows.map((row) => {
      if (row.rowIndex === rowIndex && (row.existingProductId || row.matchedBy)) {
        const toggledAction: 'UPDATE' | 'SKIP' = row.action === 'UPDATE' ? 'SKIP' : 'UPDATE';
        if (toggledAction === 'UPDATE') updatedCount++;
        else skippedCount++;
        return { ...row, action: toggledAction };
      }
      if (row.action === 'UPDATE') updatedCount++;
      if (row.action === 'SKIP') skippedCount++;
      return row;
    });

    setImportResult({
      ...importResult,
      updatedCount,
      skippedCount,
      previewRows: newRows,
    });
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_produk_alvin.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadSample = () => {
    setFileName('contoh_produk_alvin_swalayan.csv');
    setCsvText(SAMPLE_CSV);
    const result = productService.parseCSV(SAMPLE_CSV, duplicateStrategy);
    setImportResult(result);
    setIsCommitted(false);
  };

  const handleConfirmCommit = async () => {
    if (!importResult) return;
    const summary = await productService.commitCSVImport(importResult.previewRows);
    setCommitSummary(summary);
    setIsCommitted(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E5391B] mb-2 hover:underline"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Katalog Produk</span>
          </Link>
          <h1 className="text-xl font-black text-[#222222]">
            Import Produk Massal via CSV
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Unggah atau tempel data spreadsheet untuk menambah dan memperbarui stok produk sekaligus
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="bg-[#16A34A] hover:bg-[#15803D] text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Download file template .csv kosong untuk diisi di Excel, Google Sheets, atau diisi via AI"
          >
            <Download size={14} />
            <span>Download File Template (.csv)</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Muat teks contoh demo langsung ke textarea untuk uji coba"
          >
            <FileSpreadsheet size={14} className="text-gray-600" />
            <span>Coba Data Contoh (Demo)</span>
          </button>
        </div>
      </div>

      {/* Guide Banner for AI & Excel */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <Sparkles size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-blue-950">
            Cara Mengisi Data dengan Microsoft Excel, Google Sheets, atau AI (ChatGPT/Claude):
          </p>
          <ol className="list-decimal list-inside text-blue-800 space-y-0.5 text-[11px] leading-relaxed">
            <li>
              Klik tombol hijau <b>Download File Template (.csv)</b> di atas untuk mendapatkan berkas template resmi.
            </li>
            <li>
              <b>Buka di Excel / Google Sheets:</b> Isi baris data sesuai kolom yang tersedia (<code>sku</code>, <code>name</code>, <code>brand</code>, <code>category</code>, <code>unit</code>, <code>price</code>, <code>discount_price</code>, <code>stock</code>, <code>description</code>, <code>image_url</code>).
            </li>
            <li>
              <b>Atau minta AI:</b> Anda bisa mengunggah file template ini ke ChatGPT / Claude dan mengetik prompt: <i>&quot;Tolong buatkan data produk kelontong supermarket Alvin Swalayan mengikuti kolom header template CSV ini&quot;</i>.
            </li>
            <li>
              Unggah file hasil simpanan Anda di kotak <b>Pilih Dokumen CSV</b> di bawah ini.
            </li>
          </ol>
        </div>
      </div>

      {/* Commit Success Banner */}
      {isCommitted && commitSummary && (
        <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-xl text-emerald-900 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span>Import CSV Berhasil Disimpan ke Database Toko!</span>
          </div>
          <div className="text-xs space-y-1">
            <p>• <b>{commitSummary.inserted}</b> produk baru berhasil ditambahkan ke rak toko online.</p>
            <p>• <b>{commitSummary.updated}</b> produk lama berhasil ditimpa/diperbarui dengan data terbaru.</p>
            {commitSummary.skipped > 0 && (
              <p>• <b>{commitSummary.skipped}</b> produk lama dipertahankan (data duplikat di file dilewati).</p>
            )}
            <p className={commitSummary.cloudSynced ? 'text-emerald-700 font-bold' : 'text-orange-700 font-bold'}>
              {commitSummary.cloudSynced
                ? '☁️ Semua data berhasil disinkronkan ke Supabase Cloud Database!'
                : '⚠️ Tersimpan lokal, belum tersync ke Cloud. Buka halaman Produk untuk retry otomatis.'}
            </p>
          </div>
          <div className="pt-2 flex gap-3">
            <Link
              href="/admin/products"
              className="bg-[#16A34A] hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold inline-block"
            >
              Lihat Daftar Produk Sekarang →
            </Link>
          </div>
        </div>
      )}

      {/* Step 1: Upload / Input CSV Box */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#222222] flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#E5391B] text-white text-[11px] font-bold flex items-center justify-center">
            1
          </span>
          <span>Upload File CSV atau Salin Teks CSV</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* File Picker */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center space-y-2 hover:border-[#E5391B] transition-colors">
            <FileSpreadsheet size={32} className="mx-auto text-gray-400" />
            <p className="text-xs font-bold text-gray-700">
              {fileName ? fileName : 'Pilih file .CSV dari komputer Anda'}
            </p>
            <label className="inline-block bg-[#E5391B] hover:bg-[#C62818] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors">
              <span>Pilih Dokumen CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-gray-400">
              Mendukung delimiter koma standar (.csv)
            </p>
          </div>

          {/* Paste Raw CSV Area */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              Atau Tempel (Paste) Konten CSV di Sini:
            </label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="sku,name,brand,category,unit,price,discount_price,stock,description,image_url..."
              className="w-full font-mono text-[11px] p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E5391B]"
            />
            <button
              onClick={handleValidateText}
              disabled={!csvText.trim()}
              className="bg-[#222222] hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
            >
              Periksa &amp; Validasi Data CSV
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Validation Summary & Preview */}
      {importResult && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#222222] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#E5391B] text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <span>Hasil Validasi &amp; Pratinjau (Preview)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Total baris dibaca: <b>{importResult.totalRows}</b> baris produk
              </p>
            </div>

            {/* Confirmation CTA button */}
            {!isCommitted && (
              <button
                onClick={handleConfirmCommit}
                disabled={importResult.newCount === 0 && importResult.updatedCount === 0}
                className="bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white px-5 py-2.5 rounded-lg text-xs font-black flex items-center gap-2 shadow-sm transition-all disabled:opacity-40"
              >
                <span>Konfirmasi Simpan ke Database Toko</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* Interactive Decision Alert for Duplicates */}
          {importResult.duplicateCount > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-amber-950 text-sm">
                      Terdeteksi {importResult.duplicateCount} Produk yang Sudah Ada di Toko (Duplikat SKU atau Nama)
                    </h3>
                    <p className="text-xs text-amber-800">
                      Silakan tentukan aksi otomatis untuk menangani data duplikat ini:
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-2.5 py-1 rounded-full self-start sm:self-auto uppercase tracking-wider border border-amber-300">
                  Perlu Keputusan Anda
                </span>
              </div>

              {/* Radio Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: Timpa / Replace */}
                <button
                  type="button"
                  onClick={() => applyDuplicateStrategy('UPDATE')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    duplicateStrategy === 'UPDATE'
                      ? 'bg-white border-[#E5391B] shadow-md ring-2 ring-red-100'
                      : 'bg-white/80 border-amber-200 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="dup-strategy"
                      checked={duplicateStrategy === 'UPDATE'}
                      onChange={() => applyDuplicateStrategy('UPDATE')}
                      className="text-[#E5391B] focus:ring-[#E5391B] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-black text-xs text-gray-900">
                      1. Timpa / Update yang Lama (Replace)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1.5 pl-6 leading-relaxed">
                    Data produk lama diperbarui dengan harga, diskon, stok, dan foto terbaru dari file CSV Anda.
                  </p>
                </button>

                {/* Option 2: Pertahankan yang lama / Skip */}
                <button
                  type="button"
                  onClick={() => applyDuplicateStrategy('SKIP')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    duplicateStrategy === 'SKIP'
                      ? 'bg-white border-[#E5391B] shadow-md ring-2 ring-red-100'
                      : 'bg-white/80 border-amber-200 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="dup-strategy"
                      checked={duplicateStrategy === 'SKIP'}
                      onChange={() => applyDuplicateStrategy('SKIP')}
                      className="text-[#E5391B] focus:ring-[#E5391B] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-black text-xs text-gray-900">
                      2. Pertahankan yang Lama (Keep / Skip)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1.5 pl-6 leading-relaxed">
                    Data produk lama di toko dipertahankan utuh. Baris data duplikat pada file CSV akan dilewati.
                  </p>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-amber-900/80 pt-1">
                <span>💡 <b>Tips:</b> Anda juga dapat mengatur tombol <code>[ 🔄 TIMPA ]</code> atau <code>[ ⏭️ LEWATI ]</code> secara individual per baris pada tabel pratinjau di bawah.</span>
              </div>
            </div>
          )}

          {/* Metric Status Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <span className="text-[10px] text-blue-700 font-bold uppercase block">
                Produk Baru (New)
              </span>
              <span className="text-lg font-black text-blue-900">
                {importResult.newCount}
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <span className="text-[10px] text-amber-700 font-bold uppercase block">
                Diperbarui (Ditimpa)
              </span>
              <span className="text-lg font-black text-amber-900">
                {importResult.updatedCount}
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
              <span className="text-[10px] text-gray-600 font-bold uppercase block">
                Dilewati (Dipertahankan)
              </span>
              <span className="text-lg font-black text-gray-900">
                {importResult.skippedCount}
              </span>
            </div>

            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <span className="text-[10px] text-red-700 font-bold uppercase block">
                Error / Ditolak
              </span>
              <span className="text-lg font-black text-red-900">
                {importResult.errorCount}
              </span>
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                <tr>
                  <th className="py-2.5 px-3">Baris</th>
                  <th className="py-2.5 px-3">Status Aksi</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Nama Produk</th>
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3">Harga</th>
                  <th className="py-2.5 px-3">Stok</th>
                  <th className="py-2.5 px-3">Catatan / Validasi Duplikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {importResult.previewRows.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={`hover:bg-gray-50 ${
                      row.action === 'ERROR'
                        ? 'bg-red-50/50'
                        : row.action === 'UPDATE'
                        ? 'bg-amber-50/40'
                        : row.action === 'SKIP'
                        ? 'bg-gray-50/70 text-gray-500'
                        : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-gray-500">#{row.rowIndex}</td>

                    <td className="py-2 px-3">
                      {row.action === 'NEW' && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          + BARU
                        </span>
                      )}
                      {row.action === 'UPDATE' && (
                        <button
                          type="button"
                          onClick={() => toggleRowDuplicateAction(row.rowIndex)}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Klik untuk mengubah aksi menjadi LEWATI"
                        >
                          <RefreshCw size={10} />
                          <span>TIMPA</span>
                        </button>
                      )}
                      {row.action === 'SKIP' && (
                        <button
                          type="button"
                          onClick={() => toggleRowDuplicateAction(row.rowIndex)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Klik untuk mengubah aksi menjadi TIMPA"
                        >
                          <span>⏭️ LEWATI</span>
                        </button>
                      )}
                      {row.action === 'ERROR' && (
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          ERROR
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-3 font-mono font-bold text-gray-800">
                      {row.sku || '-'}
                    </td>

                    <td className="py-2 px-3 font-semibold text-gray-900 max-w-xs truncate">
                      {row.name || '-'}
                    </td>

                    <td className="py-2 px-3 text-gray-600">{row.brand}</td>

                    <td className="py-2 px-3 font-bold text-gray-800">
                      {formatRupiah(row.price)}
                    </td>

                    <td className="py-2 px-3 font-bold">{row.stock}</td>

                    <td className="py-2 px-3">
                      {row.errors.length > 0 ? (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <AlertTriangle size={12} />
                          <span>{row.errors.join(', ')}</span>
                        </span>
                      ) : row.matchedBy ? (
                        <div className="space-y-0.5">
                          <span className="text-amber-800 font-bold text-[11px] block">
                            Duplikat {row.matchedBy === 'both' ? 'SKU & Nama' : row.matchedBy === 'sku' ? 'SKU Toko' : 'Nama Produk'}
                          </span>
                          {row.existingProduct && (
                            <span className="text-[10px] text-gray-500 block">
                              Lama: {formatRupiah(row.existingProduct.price)} (Stok: {row.existingProduct.stock}) → Baru: {formatRupiah(row.price)} (Stok: {row.stock})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-700 text-[11px] font-medium">
                          Siap ditambahkan sebagai produk baru
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
