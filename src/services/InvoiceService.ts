import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { Platform } from 'react-native';
// @ts-ignore – library has no types
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNPrint from 'react-native-print';
import uuid from 'react-native-uuid';
import { Invoice } from '../models/Invoice';
import { Loan } from '../models/Loan';

class InvoiceService {
  private buildLoanInvoiceHtml(loan: Loan, locale?: string, currency?: string) {
    const loc = (locale || 'en').toLowerCase();
    const isPt = loc.startsWith('pt');
    const L = (key: string) => {
      const en: Record<string, string> = {
        title: 'Loan Statement', counterpart: 'Counterpart', principal: 'Principal', balance: 'Balance', date: 'Date', type: 'Type', amount: 'Amount', notes: 'Notes', loan: 'Loan', payment: 'Payment', noRecords: 'No records yet',
      };
      const pt: Record<string, string> = {
        title: 'Extrato de Empréstimo', counterpart: 'Contraparte', principal: 'Principal', balance: 'Saldo', date: 'Data', type: 'Tipo', amount: 'Valor', notes: 'Observações', loan: 'Empréstimo', payment: 'Pagamento', noRecords: 'Ainda não há registros',
      };
      return (isPt ? pt : en)[key] || key;
    };
    const fmt = (n: number) => {
      try {
        if (currency) {
          const f = new Intl.NumberFormat(loc, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' });
          const parts = f.formatToParts(n || 0);
          return parts.map(p => p.type === 'currency' ? p.value.replace(/[A-Za-z]/g, '') || p.value : p.value).join('');
        }
        return new Intl.NumberFormat(loc).format(n || 0);
      } catch {
        return (n || 0).toFixed(2);
      }
    };
    // Unified records table: combine issuances and payments
    const issuances = (loan.issuances && loan.issuances.length)
      ? (loan.issuances as any[])
      : [{ id: 'initial', amount: loan.principal || 0, date: (loan as any).loanDate || loan.createdAt, notes: (loan as any).notes }];

    const records: Array<{ date: number; type: string; amount: number; notes?: string }> = [
      ...issuances.map((i: any) => ({ date: i.date, type: L('loan'), amount: i.amount || 0, notes: i.notes })),
      ...((loan.payments || []).map((p: any) => ({ date: p.date, type: L('payment'), amount: p.amount || 0, notes: p.notes })) as any[]),
    ].sort((a, b) => a.date - b.date);

    const allRows = records.map(r => `
        <tr>
          <td>${new Date(r.date).toLocaleDateString(loc)}</td>
          <td>${r.type}</td>
          <td style="text-align:right;">${fmt(r.amount || 0)}</td>
          <td>${r.notes || ''}</td>
        </tr>`).join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #ccc; padding: 8px; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>${L('title')}</h1>
          <p><strong>${L('counterpart')}:</strong> ${loan.counterpartName}</p>
          <p><strong>${L('principal')}:</strong> ${fmt(loan.principal)}</p>
          <p><strong>${L('balance')}:</strong> ${fmt(loan.balance)}</p>
          <table>
            <thead>
              <tr>
                <th>${L('date')}</th>
                <th>${L('type')}</th>
                <th>${L('amount')}</th>
                <th>${L('notes')}</th>
              </tr>
            </thead>
            <tbody>
              ${allRows || `<tr><td colspan="4" style="text-align:center;">${L('noRecords')}</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }

  async printLoanInvoice(loan: Loan, locale?: string, currency?: string) {
    const html = this.buildLoanInvoiceHtml(loan, locale, currency);
    await RNPrint.print({ html });
  }

  async saveAndUploadLoanInvoice(loan: Loan, locale?: string, currency?: string) {
    const html = this.buildLoanInvoiceHtml(loan, locale, currency);
    const { filePath } = await (RNPrint as any).printToFile({ html });

    // upload to Firebase Storage
    const filename = `invoices/${uuid.v4()}.pdf`;
    const ref = storage().ref(filename);
    await ref.putFile(filePath);
    const downloadUrl = await ref.getDownloadURL();

    // save metadata to Firestore
    const invoice: Invoice = {
      id: uuid.v4().toString(),
      loanId: loan.id,
      fileUrl: downloadUrl,
      createdAt: Date.now(),
    };
    await firestore().collection('invoices').doc(invoice.id).set(invoice);

    return invoice;
  }

  async printAndUploadLoanInvoice(loan: Loan, locale?: string, currency?: string) {
    const html = this.buildLoanInvoiceHtml(loan, locale, currency);

    // 1. Show print dialog
    if (Platform.OS === 'ios') {
      // iOS can print HTML directly
      await RNPrint.print({ html });
    } else {
      // Android: create PDF then print
      try {
        const pdf = await RNHTMLtoPDF.convert({ html, fileName: `invoice_${loan.id}` });
        await RNPrint.print({ filePath: pdf.filePath });
      } catch (e) {
        console.warn('Print failed', e);
      }
    }

    // 2. Generate PDF file (cross-platform) for upload
    let pdfPath: string | undefined;
    if (Platform.OS === 'ios') {
      try {
        const { filePath } = await (RNPrint as any).printToFile({ html });
        pdfPath = filePath;
      } catch (e) {
        console.warn('printToFile failed, fallback to HTMLtoPDF', e);
      }
    }
    if (!pdfPath) {
      const pdf = await RNHTMLtoPDF.convert({ html, fileName: `invoice_${loan.id}` });
      pdfPath = pdf.filePath;
    }

    // 3. Upload
    try {
      const filename = `invoices/${uuid.v4()}.pdf`;
      const ref = storage().ref(filename);
      await ref.putFile(pdfPath!);
      const downloadUrl = await ref.getDownloadURL();
      const invoice: Invoice = {
        id: uuid.v4().toString(),
        loanId: loan.id,
        fileUrl: downloadUrl,
        createdAt: Date.now(),
      };
      await firestore().collection('invoices').doc(invoice.id).set(invoice);
    } catch (e) {
      console.warn('Upload invoice failed', e);
    }
  }
}

export const invoiceService = new InvoiceService();